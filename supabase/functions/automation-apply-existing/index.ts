import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type AutomationDefinition = {
  id: string;
  status: string;
  origin?: 'manual' | 'pipeline';
  pipeline?: {
    pipelineId?: string;
    stageId?: string;
  };
};

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const respond = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers });

function namedKey(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0];
  } catch {
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respond({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serviceKey) return respond({ ok: false, message: 'Configuração interna incompleta.' }, 503);

  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return respond({ ok: false, message: 'Sessão obrigatória.' }, 401);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return respond({ ok: false, message: 'Sessão inválida.' }, 401);

  const { data: profile, error: profileError } = await db
    .from('user_profiles')
    .select('account_type,is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return respond({ ok: false, message: profileError.message }, 500);
  if (!profile || profile.account_type !== 'internal' || profile.is_active !== true) {
    return respond({ ok: false, message: 'Usuário sem permissão para executar automações.' }, 403);
  }

  const body = await req.json().catch(() => ({})) as Json;
  const automationId = String(body.automationId ?? '').trim();
  if (!automationId) return respond({ ok: false, message: 'automationId obrigatório.' }, 400);

  const { data: storage, error: storageError } = await db
    .from('f05_shared_storage')
    .select('value')
    .eq('storage_key', 'harpia:f05:automations')
    .maybeSingle();
  if (storageError) return respond({ ok: false, message: storageError.message }, 500);

  const automations = Array.isArray(storage?.value) ? storage.value as AutomationDefinition[] : [];
  const definition = automations.find((item) => (
    item.id === automationId
    && item.status === 'active'
    && item.origin === 'pipeline'
    && item.pipeline?.pipelineId
    && item.pipeline?.stageId
  ));
  if (!definition?.pipeline?.pipelineId || !definition.pipeline.stageId) {
    return respond({ ok: false, message: 'Gatilho não encontrado ou inativo.' }, 404);
  }

  const { data: crmRow, error: crmError } = await db
    .from('platform_module_state')
    .select('state')
    .eq('module', 'crm')
    .maybeSingle();
  if (crmError) return respond({ ok: false, message: crmError.message }, 500);

  const state = crmRow?.state && typeof crmRow.state === 'object' ? crmRow.state as Json : {};
  const leads = Array.isArray(state.leads) ? state.leads as Json[] : [];
  const matchingLeads = leads.filter((lead) => (
    String(lead.pipelineId ?? '') === definition.pipeline!.pipelineId
    && String(lead.stageId ?? '') === definition.pipeline!.stageId
  ));

  if (!matchingLeads.length) return respond({ ok: true, enqueued: 0, processed: 0 });

  const leadIds = matchingLeads.map((lead) => String(lead.id ?? '')).filter(Boolean);
  const { data: conversations } = await db
    .from('inbox_conversations')
    .select('id,lead_id,last_message_at,updated_at')
    .in('lead_id', leadIds)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  const conversationByLead = new Map<string, string>();
  for (const conversation of conversations ?? []) {
    const leadId = String(conversation.lead_id ?? '');
    if (leadId && !conversationByLead.has(leadId)) conversationByLead.set(leadId, String(conversation.id));
  }

  let enqueued = 0;
  for (const lead of matchingLeads) {
    const leadId = String(lead.id ?? '').trim();
    if (!leadId) continue;

    const payload = {
      kind: 'apply_existing',
      automationId,
      pipelineId: definition.pipeline.pipelineId,
      stageId: definition.pipeline.stageId,
      source: lead.source ?? null,
      assigneeId: lead.assigneeId ?? null,
      lead: {
        id: lead.id ?? null,
        name: lead.name ?? null,
        email: lead.email ?? null,
        whatsapp: lead.whatsapp ?? null,
        source: lead.source ?? null,
        assigneeId: lead.assigneeId ?? null,
        pipelineId: lead.pipelineId ?? null,
        stageId: lead.stageId ?? null,
      },
    };

    const { error } = await db.from('automation_event_outbox').insert({
      event_type: 'custom.event',
      lead_id: leadId,
      conversation_id: conversationByLead.get(leadId) ?? null,
      payload,
    });
    if (error) return respond({ ok: false, message: error.message, enqueued }, 500);
    enqueued += 1;
  }

  const worker = await fetch(`${supabaseUrl}/functions/v1/automation-event-worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: '{}',
    redirect: 'manual',
    signal: AbortSignal.timeout(45000),
  });
  const workerResult = await worker.json().catch(() => ({})) as Json;

  return respond({
    ok: worker.ok,
    enqueued,
    processed: Number(workerResult.processed ?? 0),
    failed: Number(workerResult.failed ?? 0),
    worker: workerResult,
  }, worker.ok ? 200 : 207);
});
