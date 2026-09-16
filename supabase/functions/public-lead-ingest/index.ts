import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

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

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = namedKey('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serverKey) return response({ ok: false, message: 'Servidor indisponível.' }, 503);

  const body = await req.json().catch(() => ({}));
  const contact = body.contact && typeof body.contact === 'object' ? body.contact as Record<string, unknown> : {};
  const name = clean(contact.name, 180);
  const email = clean(contact.email, 320);
  const whatsapp = clean(contact.whatsapp, 40);
  const origin = clean(body.origin || 'site', 120) || 'site';
  const action = clean(body.action, 120);
  const page = clean(body.page, 500);
  const occurredAt = clean(body.occurredAt, 80);
  const interest = body.interest && typeof body.interest === 'object' ? body.interest : null;
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

  if (!name || !whatsapp) {
    return response({ ok: false, message: 'Nome e WhatsApp são obrigatórios.' }, 400);
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return response({ ok: false, message: 'E-mail inválido.' }, 400);
  }

  const admin = createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc('admin_ingest_public_lead', {
    p_name: name,
    p_email: email || null,
    p_whatsapp: whatsapp,
    p_origin: origin,
    p_action: action || null,
    p_page: page || null,
    p_interest: interest,
    p_occurred_at: occurredAt || new Date().toISOString(),
    p_metadata: metadata,
  });

  if (error || !data) {
    return response({ ok: false, message: error?.message || 'Não foi possível registrar o atendimento.' }, 500);
  }

  return response({
    ok: true,
    leadId: String(data),
    created: true,
    automaticMessageSent: false,
  }, 201);
});
