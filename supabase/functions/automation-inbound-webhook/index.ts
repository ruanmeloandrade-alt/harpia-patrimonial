import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type PipelineAutomation = {
  id: string;
  status: string;
  origin?: 'manual' | 'pipeline';
  pipeline?: {
    pipelineId?: string;
    stageId?: string;
    event?: string;
    value?: string;
  };
};

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const respond = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers });
const text = (value: unknown) => String(value ?? '').trim();

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
  if (req.method !== 'POST') return respond({ status: 'rejected', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serviceKey) return respond({ status: 'rejected', reason: 'Configuração interna incompleta.' }, 503);

  const body = await req.json().catch(() => ({})) as Json;
  const token = text(body.token);
  if (!token) return respond({ status: 'rejected', reason: 'Token obrigatório.' }, 401);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: storage, error: storageError } = await db
    .from('f05_shared_storage')
    .select('value')
    .eq('storage_key', 'harpia:f05:automations')
    .maybeSingle();

  if (storageError) return respond({ status: 'rejected', reason: storageError.message }, 500);

  const automations = Array.isArray(storage?.value) ? storage.value as PipelineAutomation[] : [];
  const matches = automations.filter((definition) => (
    definition.status === 'active'
    && definition.origin === 'pipeline'
    && definition.pipeline?.event === 'inbound_webhook'
    && definition.pipeline?.value === token
    && definition.pipeline?.pipelineId
    && definition.pipeline?.stageId
  ));

  if (!matches.length) return respond({ status: 'rejected', reason: 'Webhook não encontrado ou inativo.' }, 404);

  let leadId = text(body.leadId);
  if (leadId) {
    const { data: lead, error: leadError } = await db.from('crm_leads').select('id').eq('id', leadId).maybeSingle();
    if (leadError) return respond({ status: 'rejected', reason: leadError.message }, 500);
    if (!lead) return respond({ status: 'rejected', reason: 'Lead informado não encontrado.' }, 404);
  } else {
    const name = text(body.name) || text((body.lead as Json | undefined)?.name) || 'Lead via webhook';
    const email = text(body.email) || text((body.lead as Json | undefined)?.email) || null;
    const whatsapp = text(body.whatsapp) || text((body.lead as Json | undefined)?.whatsapp) || null;
    const rawPayload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
      ? body.payload as Json
      : {};

    const { data: createdLeadId, error: ingestError } = await db.rpc('admin_ingest_public_lead', {
      p_name: name,
      p_email: email,
      p_whatsapp: whatsapp,
      p_origin: 'webhook',
      p_action: 'automation_inbound_webhook',
      p_page: null,
      p_interest: null,
      p_occurred_at: new Date().toISOString(),
      p_metadata: {
        ...rawPayload,
        inboundWebhook: true,
      },
    });
    if (ingestError || !createdLeadId) {
      return respond({ status: 'rejected', reason: ingestError?.message || 'Não foi possível criar o lead.' }, 500);
    }
    leadId = String(createdLeadId);
  }

  const suppliedPayload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
    ? body.payload as Json
    : {};
  const conversationId = text(body.conversationId) || null;

  let enqueued = 0;
  for (const definition of matches) {
    const meta = definition.pipeline!;
    const { error } = await db.from('automation_event_outbox').insert({
      event_type: 'custom.event',
      lead_id: leadId,
      conversation_id: conversationId,
      payload: {
        ...suppliedPayload,
        kind: 'inbound_webhook',
        token,
        automationId: definition.id,
        pipelineId: meta.pipelineId,
        stageId: meta.stageId,
      },
    });
    if (error) return respond({ status: 'rejected', reason: error.message, leadId, enqueued }, 500);
    enqueued += 1;
  }

  return respond({ status: 'accepted', leadId, enqueued });
});
