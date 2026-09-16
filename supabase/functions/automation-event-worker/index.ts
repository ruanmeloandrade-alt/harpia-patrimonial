import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type ActionResult = { status: 'accepted' | 'rejected' | 'not_configured'; reason?: string; data?: Json };
type AutomationAction = { id: string; type: string; config?: Json };
type AutomationDefinition = {
  id: string;
  name?: string;
  status: string;
  trigger?: { event?: string; conditions?: Array<{ field?: string; operator?: string; value?: unknown }> };
  actions?: AutomationAction[];
};
type OutboxEvent = {
  id: string;
  event_type: string;
  lead_id?: string | null;
  conversation_id?: string | null;
  payload?: Json | null;
  attempts?: number;
  created_at?: string;
};

const headers = { 'Content-Type': 'application/json' };
const AUTOMATIONS_KEY = 'harpia:f05:automations';
const CRM_ACTIONS = new Set(['create_task', 'move_stage', 'update_field', 'add_tag', 'remove_tag', 'assign_owner']);
const respond = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers });

function namedKey(envName: string): string | undefined {
  const raw = Deno.env.get(envName);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0];
  } catch {
    return undefined;
  }
}

function getPath(source: Json, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Json)[key];
  }, source);
}

function matches(definition: AutomationDefinition, event: OutboxEvent): boolean {
  if (definition.status !== 'active' || definition.trigger?.event !== event.event_type) return false;
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
  const source: Json = {
    id: event.id,
    type: event.event_type,
    occurredAt: event.created_at,
    leadId: event.lead_id,
    conversationId: event.conversation_id,
    payload,
    ...payload,
  };
  return (definition.trigger?.conditions ?? []).every((condition) => {
    const actual = getPath(source, String(condition.field ?? ''));
    const operator = String(condition.operator ?? '');
    if (operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
    const expected = String(condition.value ?? '');
    if (operator === 'equals') return String(actual ?? '') === expected;
    if (operator === 'not_equals') return String(actual ?? '') !== expected;
    if (operator === 'contains') {
      if (Array.isArray(actual)) return actual.map(String).includes(expected);
      return String(actual ?? '').includes(expected);
    }
    return false;
  });
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function safeWebhookUrl(raw: string) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') throw new Error('Webhook precisa usar HTTPS.');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Host de webhook não permitido.');
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:') || isPrivateIpv4(host)) {
    throw new Error('Webhook privado/interno não é permitido.');
  }
  return url.toString();
}

async function executeWebhook(action: AutomationAction, event: OutboxEvent): Promise<ActionResult> {
  const config = action.config ?? {};
  const rawUrl = String(config.url ?? '').trim();
  const method = String(config.method ?? 'POST').trim().toUpperCase();
  if (!rawUrl) return { status: 'rejected', reason: 'Endpoint do webhook não informado.' };
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { status: 'rejected', reason: 'Método de webhook não permitido.' };
  try {
    const url = safeWebhookUrl(rawUrl);
    const external = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Harpia-Automation-Worker/1.0' },
      body: JSON.stringify({
        eventId: event.id,
        eventType: event.event_type,
        leadId: event.lead_id,
        conversationId: event.conversation_id,
        ...(event.payload ?? {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!external.ok) return { status: 'rejected', reason: `Webhook respondeu HTTP ${external.status}.` };
    return { status: 'accepted', data: { httpStatus: external.status } };
  } catch (error) {
    return { status: 'rejected', reason: error instanceof Error ? error.message : 'Falha ao executar webhook.' };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respond({ ok: false, message: 'Método não permitido.' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serverKey) return respond({ ok: false, message: 'Configuração interna incompleta.' }, 503);
  if (req.headers.get('Authorization') !== `Bearer ${serverKey}`) return respond({ ok: false, message: 'Não autorizado.' }, 401);

  const db = createClient(supabaseUrl, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: storageRow, error: storageError } = await db.from('f05_shared_storage').select('value').eq('storage_key', AUTOMATIONS_KEY).maybeSingle();
  if (storageError) return respond({ ok: false, message: storageError.message }, 500);
  const automations = Array.isArray(storageRow?.value) ? storageRow.value as AutomationDefinition[] : [];

  let processed = 0;
  let failed = 0;
  let matched = 0;
  let truncated = false;
  const failures: Array<{ eventId: string; reason: string }> = [];

  for (let round = 0; round < 5; round += 1) {
    const { data: claimed, error: claimError } = await db.rpc('admin_claim_automation_events', { p_limit: 20 });
    if (claimError) return respond({ ok: false, message: claimError.message, processed, failed }, 500);
    const events = (claimed ?? []) as OutboxEvent[];
    if (!events.length) break;
    if (round === 4 && events.length === 20) truncated = true;

    for (const event of events) {
      let eventFailure = '';
      try {
        const { data: priorRuns, error: runReadError } = await db.from('automation_action_runs').select('automation_id,action_id,status').eq('event_id', event.id);
        if (runReadError) throw runReadError;
        const accepted = new Set((priorRuns ?? []).filter((row) => row.status === 'accepted').map((row) => `${row.automation_id}::${row.action_id}`));

        for (const definition of automations) {
          if (!matches(definition, event)) continue;
          matched += 1;
          for (const action of definition.actions ?? []) {
            const actionKey = `${definition.id}::${action.id}`;
            if (accepted.has(actionKey)) continue;
            let result: ActionResult;

            if (CRM_ACTIONS.has(action.type)) {
              if (!event.lead_id) result = { status: 'rejected', reason: 'Evento não possui lead para ação de CRM.' };
              else {
                const { data, error } = await db.rpc('admin_apply_crm_automation_action', {
                  p_lead_id: event.lead_id,
                  p_action_type: action.type,
                  p_config: action.config ?? {},
                });
                result = error ? { status: 'rejected', reason: error.message } : { status: 'accepted', data: data && typeof data === 'object' ? data as Json : {} };
              }
            } else if (action.type === 'webhook') {
              result = await executeWebhook(action, event);
            } else if (action.type === 'start_salesbot') {
              result = { status: 'not_configured', reason: 'Execução server-side de SalesBot aguarda conexão do canal operacional.' };
            } else if (action.type === 'invoke_ai') {
              result = { status: 'not_configured', reason: 'Execução server-side de agente IA ainda não está habilitada no worker.' };
            } else {
              result = { status: 'rejected', reason: `Ação ${action.type} não suportada pelo worker.` };
            }

            const { error: runWriteError } = await db.from('automation_action_runs').upsert({
              event_id: event.id,
              automation_id: definition.id,
              action_id: action.id,
              action_type: action.type,
              status: result.status,
              result,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'event_id,automation_id,action_id' });
            if (runWriteError) throw runWriteError;

            if (result.status !== 'accepted') {
              eventFailure = result.reason || `Ação ${action.type} não aceita.`;
              break;
            }
            accepted.add(actionKey);
          }
          if (eventFailure) break;
        }
      } catch (error) {
        eventFailure = error instanceof Error ? error.message : 'Falha inesperada no worker.';
      }

      const { error: finishError } = await db.rpc('admin_finish_automation_event', {
        p_id: event.id,
        p_success: !eventFailure,
        p_error: eventFailure || null,
        p_retry_after_seconds: eventFailure ? 300 : 60,
      });
      if (finishError) eventFailure = eventFailure ? `${eventFailure}; ${finishError.message}` : finishError.message;

      if (eventFailure) {
        failed += 1;
        failures.push({ eventId: event.id, reason: eventFailure });
      } else {
        processed += 1;
      }
    }
  }

  return respond({ ok: failed === 0, processed, failed, matched, truncated, failures: failures.slice(0, 10) }, failed ? 207 : 200);
});
