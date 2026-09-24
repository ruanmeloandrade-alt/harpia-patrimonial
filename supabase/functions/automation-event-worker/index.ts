import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type ActionResult = { status: 'accepted' | 'rejected' | 'not_configured'; reason?: string; data?: Json; executionId?: string };
type AutomationAction = { id: string; type: string; config?: Json };
type AutomationDefinition = {
  id: string;
  name?: string;
  status: string;
  origin?: 'manual' | 'pipeline';
  pipeline?: {
    pipelineId?: string;
    event?: 'enter' | 'created_or_moved' | 'leave' | 'created' | 'time' | 'salesbot_done' | 'salesbot_failed' | 'ai_done' | 'tag_added' | 'field_changed' | 'assignee_changed' | 'hours_before_datetime' | 'daily_time' | 'specific_datetime' | 'inbound_webhook';
    stageId?: string;
    value?: string;
    action?: string;
    targetStageId?: string;
    resourceId?: string;
    actionConfig?: Json;
  };
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
const EXTENDED_CRM_ACTIONS = new Set(['duplicate_lead', 'complete_tasks', 'delete_tasks', 'replace_tags', 'update_lead_field', 'delete_lead', 'internal_message', 'generate_form', 'delete_files', 'link_product']);
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

function matchesPipeline(definition: AutomationDefinition, event: OutboxEvent, source: Json): boolean {
  const meta = definition.pipeline;
  if (!meta || definition.status !== 'active') return false;
  const pipelineId = String(getPath(source, 'pipelineId') ?? '');
  const stageId = String(getPath(source, 'stageId') ?? '');
  const previousStageId = String(getPath(source, 'previousStageId') ?? '');
  const kind = String(getPath(source, 'kind') ?? getPath(source, 'sourceEventType') ?? '');
  const automationId = String(getPath(source, 'automationId') ?? '');
  const duration = String(getPath(source, 'duration') ?? getPath(source, 'threshold') ?? '');

  if (meta.pipelineId && pipelineId !== meta.pipelineId) return false;

  const config = meta.actionConfig ?? {};
  const sourceId = String(config.sourceId ?? '').trim();
  if (sourceId) {
    const eventSource = String(getPath(source, 'lead.source') ?? getPath(source, 'source') ?? '').trim();
    if (eventSource !== sourceId) return false;
  }

  const conditionField = String(config.conditionField ?? '').trim();
  if (conditionField) {
    const actual = getPath(source, conditionField);
    const operator = String(config.conditionOperator ?? 'equals');
    const expected = String(config.conditionValue ?? '');
    if (operator === 'equals' && String(actual ?? '') !== expected) return false;
    if (operator === 'not_equals' && String(actual ?? '') === expected) return false;
    if (operator === 'contains' && !String(actual ?? '').includes(expected)) return false;
  }

  if (meta.event === 'enter') return event.event_type === 'lead.stage_changed' && stageId === meta.stageId;
  if (meta.event === 'created_or_moved') {
    return (event.event_type === 'lead.created' || event.event_type === 'lead.stage_changed') && stageId === meta.stageId;
  }
  if (meta.event === 'leave') return event.event_type === 'lead.stage_changed' && previousStageId === meta.stageId;
  if (meta.event === 'created') return event.event_type === 'lead.created' && (!meta.stageId || stageId === meta.stageId);
  if (meta.event === 'time') {
    if (event.event_type !== 'lead.inactivity' || stageId !== meta.stageId) return false;
    if (automationId) return automationId === definition.id;
    if (duration) return duration === String(meta.value ?? '');
    return false;
  }
  if (meta.event === 'salesbot_done' || meta.event === 'salesbot_failed' || meta.event === 'ai_done') {
    if (event.event_type !== 'custom.event' || kind !== meta.event) return false;
    if (meta.stageId && stageId !== meta.stageId) return false;
    if (!meta.value) return true;
    const resourceId = meta.event.startsWith('salesbot_')
      ? String(getPath(source, 'botId') ?? '')
      : String(getPath(source, 'agentId') ?? '');
    return resourceId === meta.value;
  }
  if (meta.event === 'tag_added') {
    return event.event_type === 'lead.tag_added'
      && stageId === meta.stageId
      && (!meta.value || String(getPath(source, 'tagId') ?? '') === meta.value);
  }
  if (meta.event === 'field_changed') {
    return event.event_type === 'lead.field_changed'
      && stageId === meta.stageId
      && (!meta.value || String(getPath(source, 'fieldId') ?? '') === meta.value);
  }
  if (meta.event === 'assignee_changed') {
    return event.event_type === 'lead.assignee_changed' && stageId === meta.stageId;
  }
  if (meta.event === 'hours_before_datetime' || meta.event === 'daily_time' || meta.event === 'specific_datetime') {
    return event.event_type === 'custom.event'
      && kind === meta.event
      && stageId === meta.stageId
      && automationId === definition.id;
  }
  if (meta.event === 'inbound_webhook') {
    return event.event_type === 'custom.event'
      && kind === 'inbound_webhook'
      && (!meta.stageId || stageId === meta.stageId)
      && (!meta.value || String(getPath(source, 'token') ?? '') === meta.value);
  }
  return false;
}

function matches(definition: AutomationDefinition, event: OutboxEvent): boolean {
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
  const source: Json = {
    ...payload,
    id: event.id,
    type: event.event_type,
    occurredAt: event.created_at,
    leadId: event.lead_id,
    conversationId: event.conversation_id,
    payload,
  };
  if (definition.origin === 'pipeline' && definition.pipeline) return matchesPipeline(definition, event, source);
  if (definition.status !== 'active' || definition.trigger?.event !== event.event_type) return false;

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

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isIpv4(value: string) {
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

function isPrivateOrReservedIpv4(value: string) {
  if (!isIpv4(value)) return false;
  const [a, b, c] = value.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrReservedIpv6(value: string) {
  const address = normalizeHostname(value);
  if (!address.includes(':')) return false;
  if (address === '::' || address === '::1') return true;
  if (address.startsWith('fc') || address.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(address)) return true;
  if (address.startsWith('ff')) return true;
  if (address.startsWith('2001:db8:') || address === '2001:db8::') return true;
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateOrReservedIpv4(mapped[1]);
  return false;
}

function assertPublicAddress(address: string) {
  const normalized = normalizeHostname(address);
  if (isPrivateOrReservedIpv4(normalized) || isPrivateOrReservedIpv6(normalized)) {
    throw new Error('Webhook privado/interno não é permitido.');
  }
}

async function resolveAndValidateHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) throw new Error('Hostname inválido.');
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
    throw new Error('Host de webhook não permitido.');
  }
  if (isIpv4(normalized) || normalized.includes(':')) {
    assertPublicAddress(normalized);
    return;
  }

  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    Deno.resolveDns(normalized, 'A'),
    Deno.resolveDns(normalized, 'AAAA'),
  ]);
  const addresses = [
    ...(ipv4Result.status === 'fulfilled' ? ipv4Result.value : []),
    ...(ipv6Result.status === 'fulfilled' ? ipv6Result.value : []),
  ];
  if (!addresses.length) throw new Error('Não foi possível resolver o endpoint do webhook.');
  addresses.forEach(assertPublicAddress);
}

async function safeWebhookUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Webhook precisa usar HTTPS.');
  if (url.username || url.password) throw new Error('Credenciais na URL do webhook não são permitidas.');
  await resolveAndValidateHostname(url.hostname);
  return url.toString();
}

async function executeWebhook(action: AutomationAction, event: OutboxEvent): Promise<ActionResult> {
  const config = action.config ?? {};
  const rawUrl = String(config.url ?? '').trim();
  const method = String(config.method ?? 'POST').trim().toUpperCase();
  if (!rawUrl) return { status: 'rejected', reason: 'Endpoint do webhook não informado.' };
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { status: 'rejected', reason: 'Método de webhook não permitido.' };
  try {
    const url = await safeWebhookUrl(rawUrl);
    const external = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Harpia-Automation-Worker/1.0' },
      body: JSON.stringify({
        ...(event.payload ?? {}),
        eventId: event.id,
        eventType: event.event_type,
        leadId: event.lead_id,
        conversationId: event.conversation_id,
      }),
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
    });
    if (external.status >= 300 && external.status < 400) {
      return { status: 'rejected', reason: 'Redirecionamentos de webhook não são permitidos.' };
    }
    if (!external.ok) return { status: 'rejected', reason: `Webhook respondeu HTTP ${external.status}.` };
    return { status: 'accepted', data: { httpStatus: external.status } };
  } catch (error) {
    return { status: 'rejected', reason: error instanceof Error ? error.message : 'Falha ao executar webhook.' };
  }
}

function pipelineDurationMs(raw: string): number | null {
  const match = raw.trim().match(/^(\d+)\s*(m|min|h|d|dia|dias|hora|horas)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = unit === 'm' || unit === 'min'
    ? 60_000
    : unit === 'h' || unit === 'hora' || unit === 'horas'
      ? 3_600_000
      : 86_400_000;
  const total = amount * factor;
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

async function enqueueDuePipelineTimeEvents(
  db: ReturnType<typeof createClient>,
  automations: AutomationDefinition[],
): Promise<number> {
  const definitions = automations.filter((definition) => (
    definition.status === 'active'
    && definition.origin === 'pipeline'
    && definition.pipeline?.event === 'time'
    && definition.pipeline.pipelineId
    && definition.pipeline.stageId
    && pipelineDurationMs(String(definition.pipeline.value ?? ''))
  ));
  if (!definitions.length) return 0;

  const { data: crmRow, error: crmError } = await db
    .from('platform_module_state')
    .select('state')
    .eq('module', 'crm')
    .maybeSingle();
  if (crmError) throw crmError;

  const state = crmRow?.state && typeof crmRow.state === 'object' ? crmRow.state as Json : {};
  const leads = Array.isArray(state.leads) ? state.leads as Json[] : [];
  const history = Array.isArray(state.history) ? state.history as Json[] : [];
  let enqueued = 0;
  const now = Date.now();

  for (const definition of definitions) {
    const meta = definition.pipeline!;
    const duration = pipelineDurationMs(String(meta.value ?? ''));
    if (!duration) continue;

    for (const lead of leads) {
      if (String(lead.pipelineId ?? '') !== meta.pipelineId || String(lead.stageId ?? '') !== meta.stageId) continue;
      const leadId = String(lead.id ?? '').trim();
      if (!leadId) continue;

      const stageHistory = history
        .filter((entry) => (
          String(entry.leadId ?? '') === leadId
          && String(entry.type ?? '') === 'stage_changed'
          && String((entry.metadata as Json | undefined)?.stageId ?? '') === meta.stageId
        ))
        .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      const stageSince = String(stageHistory[0]?.createdAt ?? lead.createdAt ?? lead.updatedAt ?? '').trim();
      const stageSinceMs = Date.parse(stageSince);
      if (!stageSince || !Number.isFinite(stageSinceMs) || now < stageSinceMs + duration) continue;

      const payload = {
        automationId: definition.id,
        pipelineId: meta.pipelineId,
        stageId: meta.stageId,
        duration: String(meta.value ?? ''),
        stageSince,
        dueAt: new Date(stageSinceMs + duration).toISOString(),
      };
      const { error } = await db.from('automation_event_outbox').insert({
        event_type: 'lead.inactivity',
        lead_id: leadId,
        payload,
      });
      if (!error) {
        enqueued += 1;
        continue;
      }
      if (error.code !== '23505') throw error;
    }
  }

  return enqueued;
}

async function callF05Runtime(
  supabaseUrl: string,
  serverKey: string,
  action: 'start_salesbot' | 'invoke_ai' | 'pause_ai',
  payload: Json,
): Promise<ActionResult> {
  try {
    const runtimeResponse = await fetch(`${supabaseUrl}/functions/v1/f05-runtime-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serverKey}`,
      },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'manual',
      signal: AbortSignal.timeout(45000),
    });

    if (runtimeResponse.status >= 300 && runtimeResponse.status < 400) {
      return { status: 'rejected', reason: 'Redirecionamento interno do runtime F05 não é permitido.' };
    }

    const result = await runtimeResponse.json().catch(() => null) as ActionResult | null;
    if (!result || !['accepted', 'rejected', 'not_configured'].includes(result.status)) {
      return { status: 'rejected', reason: `Runtime F05 respondeu payload inválido (HTTP ${runtimeResponse.status}).` };
    }
    if (!runtimeResponse.ok && result.status === 'accepted') {
      return { status: 'rejected', reason: `Runtime F05 respondeu HTTP ${runtimeResponse.status}.` };
    }
    return result;
  } catch (error) {
    return { status: 'rejected', reason: error instanceof Error ? error.message : 'Falha ao chamar runtime F05.' };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respond({ ok: false, message: 'Método não permitido.' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serverKey) return respond({ ok: false, message: 'Configuração interna incompleta.' }, 503);

  const db = createClient(supabaseUrl, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const serviceAuthorized = req.headers.get('Authorization') === `Bearer ${serverKey}`;
  let schedulerAuthorized = false;
  const schedulerToken = req.headers.get('x-f05-scheduler-token') ?? '';
  if (!serviceAuthorized && schedulerToken) {
    const { data: validToken, error: tokenError } = await db.rpc('admin_validate_f05_scheduler_token', { p_token: schedulerToken });
    schedulerAuthorized = !tokenError && validToken === true;
  }
  if (!serviceAuthorized && !schedulerAuthorized) return respond({ ok: false, message: 'Não autorizado.' }, 401);

  const { data: storageRow, error: storageError } = await db.from('f05_shared_storage').select('value').eq('storage_key', AUTOMATIONS_KEY).maybeSingle();
  if (storageError) return respond({ ok: false, message: storageError.message }, 500);
  const automations = Array.isArray(storageRow?.value) ? storageRow.value as AutomationDefinition[] : [];

  let timeEventsEnqueued = 0;
  try {
    timeEventsEnqueued = await enqueueDuePipelineTimeEvents(db, automations);
  } catch (error) {
    return respond({
      ok: false,
      message: error instanceof Error ? error.message : 'Falha ao avaliar gatilhos de tempo da pipeline.',
    }, 500);
  }

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
            } else if (EXTENDED_CRM_ACTIONS.has(action.type)) {
              if (!event.lead_id) result = { status: 'rejected', reason: 'Evento não possui lead para ação de CRM.' };
              else {
                const { data, error } = await db.rpc('admin_apply_crm_extended_automation_action', {
                  p_lead_id: event.lead_id,
                  p_action_type: action.type,
                  p_config: action.config ?? {},
                });
                result = error ? { status: 'rejected', reason: error.message } : { status: 'accepted', data: data && typeof data === 'object' ? data as Json : {} };
              }
            } else if (action.type === 'webhook') {
              result = await executeWebhook(action, event);
            } else if (action.type === 'start_salesbot') {
              const botId = String(action.config?.botId ?? '').trim();
              result = !botId
                ? { status: 'rejected', reason: 'SalesBot da automação não informado.' }
                : await callF05Runtime(supabaseUrl, serverKey, 'start_salesbot', {
                    botId,
                    leadId: event.lead_id,
                    conversationId: event.conversation_id,
                    context: event.payload ?? {},
                  });
            } else if (action.type === 'invoke_ai') {
              const agentId = String(action.config?.agentId ?? '').trim();
              result = !agentId
                ? { status: 'rejected', reason: 'Agente IA da automação não informado.' }
                : await callF05Runtime(supabaseUrl, serverKey, 'invoke_ai', {
                    agentId,
                    context: {
                      ...(event.payload ?? {}),
                      eventId: event.id,
                      eventType: event.event_type,
                      leadId: event.lead_id,
                      conversationId: event.conversation_id,
                    },
                  });
            } else if (action.type === 'pause_ai') {
              result = !event.lead_id
                ? { status: 'rejected', reason: 'Evento não possui lead para pausar IA.' }
                : await callF05Runtime(supabaseUrl, serverKey, 'pause_ai', {
                    agentId: String(action.config?.agentId ?? '').trim() || undefined,
                    leadId: event.lead_id,
                    conversationId: event.conversation_id,
                    context: event.payload ?? {},
                  });
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

  return respond({ ok: failed === 0, processed, failed, matched, timeEventsEnqueued, truncated, failures: failures.slice(0, 10) }, failed ? 207 : 200);
});
