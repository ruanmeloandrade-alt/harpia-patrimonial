import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type LeadField = { name?: string; values?: unknown[] };

const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

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

function graphVersion() {
  const configured = String(Deno.env.get('META_GRAPH_VERSION') || '').trim();
  return /^v\d+\.\d+$/.test(configured) ? configured : 'v26.0';
}

function respond(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function verifySignature(rawBody: Uint8Array, headerValue: string, appSecret: string) {
  if (!headerValue.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, rawBody));
  const expected = 'sha256=' + Array.from(signed).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(expected, headerValue.toLowerCase());
}

function getField(fieldData: LeadField[], ...names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const field of fieldData) {
    const key = String(field.name || '').toLowerCase();
    if (!wanted.has(key) || !Array.isArray(field.values)) continue;
    const value = field.values.find((item) => typeof item === 'string' && item.trim());
    if (typeof value === 'string') return value.trim();
  }
  return '';
}

function normalizeContact(fieldData: LeadField[]) {
  const fullName = getField(fieldData, 'full_name', 'name');
  const firstName = getField(fieldData, 'first_name', 'firstname');
  const lastName = getField(fieldData, 'last_name', 'lastname');
  const composedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    name: fullName || composedName,
    email: getField(fieldData, 'email', 'email_address'),
    whatsapp: getField(fieldData, 'phone_number', 'phone', 'mobile_number', 'mobile'),
  };
}

async function graphGetObject(objectId: string, fields: string, token: string) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(objectId)}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', token);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null) as Json | null;

  if (!response.ok || !payload) {
    const metaError = payload?.error as Json | undefined;
    const error = new Error(
      typeof metaError?.message === 'string'
        ? metaError.message
        : `Meta Graph respondeu HTTP ${response.status}.`,
    ) as Error & { code?: string };
    if (metaError?.code !== undefined) error.code = String(metaError.code);
    throw error;
  }

  return payload;
}

async function graphLead(leadgenId: string, token: string) {
  return graphGetObject(leadgenId, 'id,created_time,form_id,ad_id,field_data', token);
}

async function graphAttribution(adId: string, token: string) {
  if (!adId) return {} as Json;
  try {
    return await graphGetObject(adId, 'id,adset_id,campaign_id', token);
  } catch {
    return {} as Json;
  }
}

async function triggerAutomationWorker(supabaseUrl: string, serverKey: string) {
  const call = fetch(`${supabaseUrl}/functions/v1/automation-event-worker`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serverKey}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(30_000),
  }).catch((error) => console.error('automation-event-worker failed', error));

  const runtime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(call);
  else await call;
}

async function processWebhook(payload: Json, supabaseUrl: string, serverKey: string) {
  const admin = createClient(supabaseUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (payload.object !== 'page' || !Array.isArray(payload.entry)) return;

  for (const entry of payload.entry as Json[]) {
    const pageId = String(entry.id || '').trim();
    if (!pageId || !Array.isArray(entry.changes)) continue;

    const { data: connection } = await admin
      .from('integration_connections')
      .select('id,status,metadata')
      .eq('provider', 'meta')
      .eq('external_account_id', pageId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    for (const change of entry.changes as Json[]) {
      if (change.field !== 'leadgen' || !change.value || typeof change.value !== 'object') continue;
      const value = change.value as Json;
      const leadgenId = String(value.leadgen_id || '').trim();
      const formId = String(value.form_id || '').trim();
      if (!leadgenId) continue;

      const { data: existingReceipt } = await admin
        .from('meta_lead_receipts')
        .select('crm_lead_id,status')
        .eq('leadgen_id', leadgenId)
        .maybeSingle();

      if (existingReceipt?.crm_lead_id || existingReceipt?.status === 'ingested') {
        await admin.from('integration_events').insert({
          connection_id: connection?.id ?? null,
          provider: 'meta',
          event_type: 'lead.duplicate',
          external_id: leadgenId,
          success: true,
          metadata: { pageId, formId, crmLeadId: existingReceipt.crm_lead_id ?? null },
        });
        continue;
      }

      const selectedForms = Array.isArray((connection?.metadata as Json | null)?.form_ids)
        ? ((connection?.metadata as Json).form_ids as unknown[]).map(String)
        : [];

      if (selectedForms.length && formId && !selectedForms.includes(formId)) {
        await admin.from('meta_lead_receipts').upsert({
          connection_id: connection?.id ?? null,
          leadgen_id: leadgenId,
          page_id: pageId,
          form_id: formId || null,
          status: 'ignored',
          raw_lead: value,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'leadgen_id' });

        await admin.from('integration_events').insert({
          connection_id: connection?.id ?? null,
          provider: 'meta',
          event_type: 'lead.ignored_form',
          external_id: leadgenId,
          success: true,
          metadata: { pageId, formId },
        });
        continue;
      }

      if (!connection) {
        await admin.from('integration_events').insert({
          provider: 'meta',
          event_type: 'lead.unconfigured_page',
          external_id: leadgenId,
          success: false,
          error_code: 'META_PAGE_NOT_CONFIGURED',
          metadata: { pageId, formId },
        });
        continue;
      }

      const { data: token, error: tokenError } = await admin.rpc('admin_resolve_meta_page_token', {
        p_page_id: pageId,
      });

      if (tokenError || !token) {
        await admin.from('integration_connections').update({
          status: 'reauth_required',
          last_error_at: new Date().toISOString(),
          last_error_code: 'META_TOKEN_MISSING',
          updated_at: new Date().toISOString(),
        }).eq('id', connection.id);

        await admin.from('integration_events').insert({
          connection_id: connection.id,
          provider: 'meta',
          event_type: 'lead.token_missing',
          external_id: leadgenId,
          success: false,
          error_code: 'META_TOKEN_MISSING',
          metadata: { pageId, formId },
        });
        continue;
      }

      try {
        const lead = await graphLead(leadgenId, String(token));
        const fieldData = Array.isArray(lead.field_data) ? lead.field_data as LeadField[] : [];
        const contact = normalizeContact(fieldData);
        const createdTime = typeof lead.created_time === 'string' ? lead.created_time : null;
        const adId = lead.ad_id ? String(lead.ad_id) : String(value.ad_id || '').trim();
        const attribution = await graphAttribution(adId, String(token));

        const { data: crmLeadId, error: ingestError } = await admin.rpc('admin_ingest_meta_lead', {
          p_leadgen_id: leadgenId,
          p_page_id: pageId,
          p_form_id: String(lead.form_id || formId || '').trim() || null,
          p_name: contact.name || null,
          p_email: contact.email || null,
          p_whatsapp: contact.whatsapp || null,
          p_created_time: createdTime,
          p_ad_id: adId || null,
          p_adset_id: attribution.adset_id ? String(attribution.adset_id) : null,
          p_campaign_id: attribution.campaign_id ? String(attribution.campaign_id) : null,
          p_field_data: fieldData,
          p_raw_lead: { ...lead, attribution },
        });

        if (ingestError) throw ingestError;

        if (!crmLeadId) {
          await admin.from('integration_events').insert({
            connection_id: connection.id,
            provider: 'meta',
            event_type: 'lead.invalid',
            external_id: leadgenId,
            success: false,
            error_code: 'META_LEAD_NAME_MISSING',
            metadata: { pageId, formId },
          });
          continue;
        }

        await triggerAutomationWorker(supabaseUrl, serverKey);
      } catch (error) {
        const errorCode = (error as Error & { code?: string }).code;
        const status = errorCode === '190' ? 'reauth_required' : 'degraded';
        const code = errorCode ? `META_GRAPH_${errorCode}` : 'META_LEAD_FETCH_FAILED';
        const message = error instanceof Error ? error.message : 'Falha ao processar lead da Meta.';

        await admin.from('meta_lead_receipts').upsert({
          connection_id: connection.id,
          leadgen_id: leadgenId,
          page_id: pageId,
          form_id: formId || null,
          status: 'error',
          last_error: message.slice(0, 2000),
          raw_lead: value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'leadgen_id' });

        await admin.from('integration_connections').update({
          status,
          last_error_at: new Date().toISOString(),
          last_error_code: code,
          updated_at: new Date().toISOString(),
        }).eq('id', connection.id);

        await admin.from('integration_events').insert({
          connection_id: connection.id,
          provider: 'meta',
          event_type: 'lead.error',
          external_id: leadgenId,
          success: false,
          error_code: code,
          error_message: message.slice(0, 2000),
          metadata: { pageId, formId },
        });
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  const verifyToken = String(Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || '').trim();

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode') || '';
    const token = url.searchParams.get('hub.verify_token') || '';
    const challenge = url.searchParams.get('hub.challenge') || '';

    if (!verifyToken) return new Response('Webhook Meta não configurado.', { status: 503 });
    if (mode === 'subscribe' && challenge && constantTimeEqual(token, verifyToken)) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Verificação inválida.', { status: 403 });
  }

  if (req.method !== 'POST') return respond(405, { received: false, message: 'Método não permitido.' });

  const appSecret = String(Deno.env.get('META_APP_SECRET') || '').trim();
  if (!appSecret) return respond(503, { received: false, message: 'Webhook Meta ainda não configurado.' });

  const rawBuffer = new Uint8Array(await req.arrayBuffer());
  const signature = String(req.headers.get('x-hub-signature-256') || '').trim();

  if (!signature || !await verifySignature(rawBuffer, signature, appSecret)) {
    return respond(401, { received: false, message: 'Assinatura Meta inválida.' });
  }

  let payload: Json;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBuffer)) as Json;
  } catch {
    return respond(400, { received: false, message: 'Payload inválido.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serverKey) {
    return respond(503, { received: false, message: 'Configuração interna incompleta.' });
  }

  const processing = processWebhook(payload, supabaseUrl, serverKey).catch((error) =>
    console.error('meta-lead-webhook processing failed', error)
  );

  const runtime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  }).EdgeRuntime;

  if (runtime?.waitUntil) runtime.waitUntil(processing);
  else await processing;

  return respond(200, { received: true });
});
