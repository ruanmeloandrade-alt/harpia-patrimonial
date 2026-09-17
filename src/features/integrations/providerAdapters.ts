import { validateSafeOutboundUrl } from '../automations/outboundUrlValidation';
import type { AIProviderKind, AIProviderProfile } from './aiProviderTypes';

export interface ProviderInvocationRequest {
  profile: AIProviderProfile;
  apiKey: string;
  instructions: string;
  input: string;
}

export interface ProviderInvocationResponse {
  output: string;
  raw: unknown;
}

interface ProviderHttpRequest {
  url: string;
  init: RequestInit;
}

const normalizeBase = (value: string) => value.trim().replace(/\/$/, '');

function safeProviderUrl(value: string): string {
  const issue = validateSafeOutboundUrl(value);
  if (issue) throw new Error(`Endpoint IA inválido: ${issue}`);
  return new URL(value).toString();
}

function openAIEndpoint(value: string): string {
  const base = normalizeBase(value || 'https://api.openai.com');
  if (base.endsWith('/responses')) return safeProviderUrl(base);
  if (base.endsWith('/v1')) return safeProviderUrl(`${base}/responses`);
  return safeProviderUrl(`${base}/v1/responses`);
}

function anthropicEndpoint(value: string): string {
  const base = normalizeBase(value || 'https://api.anthropic.com');
  if (base.endsWith('/v1/messages')) return safeProviderUrl(base);
  if (base.endsWith('/v1')) return safeProviderUrl(`${base}/messages`);
  return safeProviderUrl(`${base}/v1/messages`);
}

function geminiEndpoint(value: string): string {
  const base = normalizeBase(value || 'https://generativelanguage.googleapis.com');
  if (base.endsWith('/interactions')) return safeProviderUrl(base);
  if (base.endsWith('/v1beta')) return safeProviderUrl(`${base}/interactions`);
  return safeProviderUrl(`${base}/v1beta/interactions`);
}

const baseRequestInit = (): Pick<RequestInit, 'redirect' | 'signal'> => ({
  redirect: 'manual',
  signal: AbortSignal.timeout(30000),
});

function buildOpenAIRequest(input: ProviderInvocationRequest): ProviderHttpRequest {
  return {
    url: openAIEndpoint(input.profile.baseUrl),
    init: {
      ...baseRequestInit(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.profile.model,
        instructions: input.instructions || undefined,
        input: input.input,
      }),
    },
  };
}

function buildAnthropicRequest(input: ProviderInvocationRequest): ProviderHttpRequest {
  return {
    url: anthropicEndpoint(input.profile.baseUrl),
    init: {
      ...baseRequestInit(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.profile.model,
        max_tokens: 2048,
        system: input.instructions || undefined,
        messages: [{ role: 'user', content: input.input }],
      }),
    },
  };
}

function buildGeminiRequest(input: ProviderInvocationRequest): ProviderHttpRequest {
  const composedInput = input.instructions.trim()
    ? `${input.instructions.trim()}\n\n${input.input}`
    : input.input;
  return {
    url: geminiEndpoint(input.profile.baseUrl),
    init: {
      ...baseRequestInit(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': input.apiKey,
      },
      body: JSON.stringify({
        model: input.profile.model,
        input: composedInput,
      }),
    },
  };
}

function buildCustomRequest(input: ProviderInvocationRequest): ProviderHttpRequest {
  if (!input.profile.baseUrl.trim()) throw new Error('Endpoint do provedor customizado não configurado.');
  return {
    url: safeProviderUrl(input.profile.baseUrl.trim()),
    init: {
      ...baseRequestInit(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.profile.model,
        instructions: input.instructions,
        input: input.input,
      }),
    },
  };
}

/**
 * Constrói requests para execução server-side. Nunca envie a apiKey bruta para
 * o navegador; use createProviderAIModelRuntime com resolvedor de segredo no backend.
 */
export function buildProviderHttpRequest(input: ProviderInvocationRequest): ProviderHttpRequest {
  const builders: Record<AIProviderKind, (value: ProviderInvocationRequest) => ProviderHttpRequest> = {
    openai: buildOpenAIRequest,
    openai_codex: buildOpenAIRequest,
    anthropic: buildAnthropicRequest,
    google_gemini: buildGeminiRequest,
    custom: buildCustomRequest,
  };
  return builders[input.profile.provider](input);
}

function extractOpenAIText(raw: any): string {
  if (typeof raw?.output_text === 'string') return raw.output_text;
  const parts = Array.isArray(raw?.output) ? raw.output.flatMap((item: any) => item?.content ?? []) : [];
  return parts.map((part: any) => part?.text).filter((value: unknown) => typeof value === 'string').join('\n');
}

function extractAnthropicText(raw: any): string {
  return Array.isArray(raw?.content)
    ? raw.content.map((item: any) => item?.text).filter((value: unknown) => typeof value === 'string').join('\n')
    : '';
}

function extractGeminiText(raw: any): string {
  if (typeof raw?.output_text === 'string') return raw.output_text;
  if (Array.isArray(raw?.outputs)) {
    return raw.outputs.map((item: any) => item?.text ?? item?.content?.text).filter((value: unknown) => typeof value === 'string').join('\n');
  }
  if (Array.isArray(raw?.steps)) {
    return raw.steps
      .flatMap((step: any) => step?.content ?? [])
      .map((item: any) => item?.text)
      .filter((value: unknown) => typeof value === 'string')
      .join('\n');
  }
  return '';
}

function extractCustomText(raw: any): string {
  return raw?.output_text ?? raw?.text ?? raw?.output ?? raw?.message?.content ?? '';
}

export async function invokeConfiguredProvider(input: ProviderInvocationRequest): Promise<ProviderInvocationResponse> {
  if (!input.apiKey.trim()) throw new Error('Chave API não informada.');
  if (!input.profile.model.trim()) throw new Error('Modelo não configurado.');

  const request = buildProviderHttpRequest(input);
  const response = await fetch(request.url, request.init);
  if (response.status >= 300 && response.status < 400) {
    throw new Error('Redirecionamentos do provedor IA não são permitidos.');
  }
  const raw = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = typeof (raw as any)?.error?.message === 'string' ? (raw as any).error.message : `HTTP ${response.status}`;
    throw new Error(`Falha no provedor IA: ${detail}`);
  }

  const extractors: Record<AIProviderKind, (value: any) => string> = {
    openai: extractOpenAIText,
    openai_codex: extractOpenAIText,
    anthropic: extractAnthropicText,
    google_gemini: extractGeminiText,
    custom: extractCustomText,
  };
  const output = extractors[input.profile.provider](raw).trim();
  if (!output) throw new Error('O provedor respondeu sem texto utilizável.');
  return { output, raw };
}
