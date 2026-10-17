const ENDPOINT = 'https://desxomqvtjaymwwxivwq.supabase.co/functions/v1/public-lead-ingest';
const PUBLISHABLE_KEY = 'sb_publishable_wWUVxjkMDMXLOrzE0y3Y_w_k9jXf88B';
const PROPERTY_TYPES = new Set(['Casa', 'Apartamento', 'Flat', 'Terreno', 'Comercial', 'Galpão', 'Studio', 'Loft', 'Cobertura', 'Ilha']);

function textField(value, max, label, required = true) {
  const result = String(value ?? '').trim();
  if ((required && !result) || result.length > max) throw new Error(`Confira o campo ${label} antes de enviar.`);
  return result;
}

function normalizePhone(value, required = true) {
  const raw = textField(value, 40, 'celular', required);
  if (!raw && !required) return '';
  if (!/^[+\d\s().-]+$/.test(raw)) throw new Error('Confira o celular, incluindo o DDD.');
  let digits = raw.replace(/\D/g, '');
  if (!raw.startsWith('+') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (digits.length < 8 || digits.length > 15) throw new Error('Confira o celular, incluindo o DDD.');
  return digits;
}

export function buildRegistrationPayload(data, occurredAt = new Date().toISOString()) {
  if (!PROPERTY_TYPES.has(data.propertyType) || !['venda', 'locacao'].includes(data.intent)) throw new Error('Confira o tipo e a finalidade do imóvel.');
  if (data.consent !== true) throw new Error('Autorize a utilização dos dados e o contato antes de enviar.');
  if (typeof data.expectedValue !== 'number' || !Number.isFinite(data.expectedValue) || data.expectedValue <= 0 || data.expectedValue > 999999999999.99) throw new Error('Confira a previsão de valor do imóvel.');
  const email = textField(data.email, 320, 'e-mail', false);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Confira o e-mail ou deixe o campo vazio.');
  return {
    contact: {
      name: textField(data.ownerName, 180, 'nome do proprietário'),
      ...(email ? { email } : {}),
      whatsapp: normalizePhone(data.phone),
    },
    origin: 'captacao-proprietario',
    action: 'owner-property-registration',
    page: '/vender/',
    interest: { type: 'property', label: `Cadastro para ${data.intent === 'venda' ? 'venda' : 'locação'}: ${data.propertyType}` },
    occurredAt,
    metadata: {
      propertyType: data.propertyType,
      intent: data.intent,
      description: textField(data.description, 12000, 'descrição'),
      propertyAddress: textField(data.address, 1500, 'endereço'),
      expectedValue: Math.round(data.expectedValue * 100) / 100,
      currency: 'BRL',
      commissionIncluded: true,
      secondaryPhone: normalizePhone(data.secondaryPhone, false),
      consent: true,
      consentAt: occurredAt,
      formVersion: 'harpia-pdf-20261017',
    },
  };
}

export async function submitPropertyRegistration(data) {
  const payload = buildRegistrationPayload(data);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true || typeof result.leadId !== 'string' || !result.leadId) {
      const message = response.status === 400 && typeof result?.message === 'string' ? result.message : 'Não foi possível confirmar o recebimento do cadastro. Seus dados continuam preenchidos. Tente novamente.';
      throw new Error(message);
    }
    return { ok: true, leadId: result.leadId };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('O envio demorou mais que o esperado e não foi possível confirmar o recebimento. Seus dados continuam preenchidos.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar para enviar o cadastro. Confira sua conexão. Seus dados continuam preenchidos.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
