import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type Result = { status: 'accepted' | 'rejected' | 'not_configured'; executionId?: string; reason?: string; data?: Json };
type Block = { id: string; type: string; label?: string; config?: Json };
type Bot = { id: string; name?: string; status: string; blocks?: Block[] };
type Agent = { id: string; name?: string; role?: string; instructions?: string; rules?: string; context?: string; status: string; providerProfileId?: string };
type Provider = { id: string; provider: 'openai' | 'openai_codex' | 'anthropic' | 'google_gemini' | 'custom'; model: string; baseUrl?: string; status: string; apiKeyConfigured?: boolean; secretRef?: string };
type Execution = { id: string; botId: string; leadId?: string; conversationId?: string; runtimeContext?: Json; startedAt: string; finishedAt?: string; status: 'running' | 'paused' | 'completed' | 'failed'; currentBlockId?: string; resumeMode?: 'retry_current' | 'next_block'; resumeAt?: string; error?: string; action?: string; aiAgentId?: string };

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const BOT_KEY = 'harpia:f05:salesbots';
const EXEC_KEY = 'harpia:f05:salesbot-executions';
const AGENT_KEY = 'harpia:f05:ai-agents';
const PROVIDER_KEY = 'harpia:f05:ai-provider-profiles';
const respond = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers });
const text = (value: unknown) => String(value ?? '').trim();
const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function namedKey(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0];
  } catch { return undefined; }
}

function getPath(source: Json, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Json)[key];
  }, source);
}

function evaluateCondition(expression: string, context: Json): boolean | null {
  const value = expression.trim();
  let match = value.match(/^exists\s+([\p{L}\p{N}_.-]+)$/iu) || value.match(/^([\p{L}\p{N}_.-]+)\s+exists$/iu);
  if (match) {
    const actual = getPath(context, match[1]);
    return actual !== undefined && actual !== null && actual !== '';
  }
  match = value.match(/^([\p{L}\p{N}_.-]+)\s*(contains|==|!=|>=|<=|=|>|<)\s*(.+)$/iu);
  if (!match) return null;
  const actual = getPath(context, match[1]);
  const operator = match[2].toLowerCase();
  const expected = match[3].trim();
  if (operator === 'contains') return Array.isArray(actual) ? actual.map(String).includes(expected) : String(actual ?? '').includes(expected);
  if (operator === '=' || operator === '==') return String(actual ?? '') === expected;
  if (operator === '!=') return String(actual ?? '') !== expected;
  const a = Number(actual); const b = Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (operator === '>') return a > b;
  if (operator === '>=') return a >= b;
  if (operator === '<') return a < b;
  if (operator === '<=') return a <= b;
  return false;
}

function delayMs(duration: string): number | null {
  const match = duration.trim().match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const factor: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  const total = amount * factor[match[2].toLowerCase()];
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

function normalizeHostname(hostname: string) { return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, ''); }
function isIpv4(value: string) { const parts = value.split('.').map(Number); return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255); }
function isPrivateIpv4(value: string) {
  if (!isIpv4(value)) return false;
  const [a, b, c] = value.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || a >= 224;
}
function isPrivateIpv6(value: string) {
  const address = normalizeHostname(value);
  if (!address.includes(':')) return false;
  if (address === '::' || address === '::1' || address.startsWith('fc') || address.startsWith('fd') || /^fe[89ab]/.test(address) || address.startsWith('ff') || address.startsWith('2001:db8:')) return true;
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return Boolean(mapped && isPrivateIpv4(mapped[1]));
}
async function safeUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Endpoint precisa usar HTTPS.');
  if (url.username || url.password) throw new Error('Credenciais embutidas na URL não são permitidas.');
  const host = normalizeHostname(url.hostname);
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isPrivateIpv4(host) || isPrivateIpv6(host)) throw new Error('Endpoint privado/interno não é permitido.');
  if (!isIpv4(host) && !host.includes(':')) {
    const [a, aaaa] = await Promise.allSettled([Deno.resolveDns(host, 'A'), Deno.resolveDns(host, 'AAAA')]);
    const addresses = [...(a.status === 'fulfilled' ? a.value : []), ...(aaaa.status === 'fulfilled' ? aaaa.value : [])];
    if (!addresses.length || addresses.some((address) => isPrivateIpv4(address) || isPrivateIpv6(address))) throw new Error('Endpoint resolve para endereço não permitido.');
  }
  return url.toString();
}

function providerRequest(profile: Provider, apiKey: string, instructions: string, input: string) {
  const base = text(profile.baseUrl).replace(/\/$/, '');
  if (profile.provider === 'openai' || profile.provider === 'openai_codex') {
    const root = base || 'https://api.openai.com'; const url = root.endsWith('/responses') ? root : root.endsWith('/v1') ? `${root}/responses` : `${root}/v1/responses`;
    return { url, init: { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: profile.model, instructions: instructions || undefined, input }), redirect: 'manual' as const, signal: AbortSignal.timeout(30000) } };
  }
  if (profile.provider === 'anthropic') {
    const root = base || 'https://api.anthropic.com'; const url = root.endsWith('/v1/messages') ? root : root.endsWith('/v1') ? `${root}/messages` : `${root}/v1/messages`;
    return { url, init: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: profile.model, max_tokens: 2048, system: instructions || undefined, messages: [{ role: 'user', content: input }] }), redirect: 'manual' as const, signal: AbortSignal.timeout(30000) } };
  }
  if (profile.provider === 'google_gemini') {
    const root = base || 'https://generativelanguage.googleapis.com'; const url = root.endsWith('/interactions') ? root : root.endsWith('/v1beta') ? `${root}/interactions` : `${root}/v1beta/interactions`;
    return { url, init: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ model: profile.model, input: instructions.trim() ? `${instructions.trim()}\n\n${input}` : input }), redirect: 'manual' as const, signal: AbortSignal.timeout(30000) } };
  }
  if (!base) throw new Error('Endpoint customizado não configurado.');
  return { url: base, init: { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: profile.model, instructions, input }), redirect: 'manual' as const, signal: AbortSignal.timeout(30000) } };
}

function extractText(provider: Provider['provider'], raw: any): string {
  if (provider === 'openai' || provider === 'openai_codex') {
    if (typeof raw?.output_text === 'string') return raw.output_text;
    return (Array.isArray(raw?.output) ? raw.output.flatMap((item: any) => item?.content ?? []) : []).map((part: any) => part?.text).filter((v: unknown) => typeof v === 'string').join('\n');
  }
  if (provider === 'anthropic') return Array.isArray(raw?.content) ? raw.content.map((item: any) => item?.text).filter((v: unknown) => typeof v === 'string').join('\n') : '';
  if (provider === 'google_gemini') {
    if (typeof raw?.output_text === 'string') return raw.output_text;
    if (Array.isArray(raw?.outputs)) return raw.outputs.map((item: any) => item?.text ?? item?.content?.text).filter((v: unknown) => typeof v === 'string').join('\n');
    if (Array.isArray(raw?.steps)) return raw.steps.flatMap((step: any) => step?.content ?? []).map((item: any) => item?.text).filter((v: unknown) => typeof v === 'string').join('\n');
  }
  const custom = raw?.output_text ?? raw?.text ?? raw?.output ?? raw?.message?.content ?? '';
  return typeof custom === 'string' ? custom : '';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respond({ status: 'rejected', reason: 'Método não permitido.' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serviceKey) return respond({ status: 'rejected', reason: 'Configuração interna incompleta.' }, 503);
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) return respond({ status: 'rejected', reason: 'Não autorizado.' }, 401);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const body = await req.json().catch(() => ({}));
  const action = text(body.action);
  const leadId = text(body.leadId) || undefined;
  const conversationId = text(body.conversationId) || undefined;
  const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context) ? body.context as Json : {};

  async function loadList<T>(key: string): Promise<T[]> {
    const { data, error } = await db.from('f05_shared_storage').select('value').eq('storage_key', key).maybeSingle();
    if (error) throw error;
    return Array.isArray(data?.value) ? data.value as T[] : [];
  }
  async function saveList<T>(key: string, value: T[]) {
    const { data: row, error: readError } = await db.from('f05_shared_storage').select('revision').eq('storage_key', key).single();
    if (readError) throw readError;
    const { data, error } = await db.from('f05_shared_storage').update({ value, revision: Number(row.revision) + 1, updated_at: nowIso(), updated_by: null }).eq('storage_key', key).eq('revision', row.revision).select('revision').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Conflito de concorrência ao persistir runtime F05.');
  }

  async function invokeAgent(agentId: string, inputContext: Json): Promise<Result> {
    const [agents, providers] = await Promise.all([loadList<Agent>(AGENT_KEY), loadList<Provider>(PROVIDER_KEY)]);
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return { status: 'rejected', reason: 'Agente IA não encontrado.' };
    if (agent.status !== 'active' || !agent.providerProfileId) return { status: 'not_configured', reason: 'Agente IA não está pronto para execução.' };
    const profile = providers.find((item) => item.id === agent.providerProfileId);
    if (!profile || profile.status !== 'ready' || !profile.apiKeyConfigured || !profile.secretRef || !text(profile.model)) return { status: 'not_configured', reason: 'Perfil IA não está pronto.' };
    const { data: apiKey, error } = await db.rpc('admin_resolve_ai_credential', { p_profile_id: profile.id, p_secret_ref: profile.secretRef });
    if (error || !apiKey) return { status: 'not_configured', reason: 'Credencial segura do provedor IA não encontrada.' };
    const instructions = [agent.role ? `Função: ${agent.role}` : '', agent.instructions ?? '', agent.rules ? `Regras:\n${agent.rules}` : '', agent.context ? `Contexto-base:\n${agent.context}` : ''].filter(Boolean).join('\n\n');
    const request = providerRequest(profile, String(apiKey), instructions, JSON.stringify(inputContext));
    try {
      const url = await safeUrl(request.url);
      const response = await fetch(url, request.init);
      if (response.status >= 300 && response.status < 400) return { status: 'rejected', reason: 'Redirecionamento do provedor IA não permitido.' };
      const raw = await response.json().catch(() => null);
      if (!response.ok) return { status: 'rejected', reason: `Provedor IA respondeu HTTP ${response.status}.` };
      const output = extractText(profile.provider, raw).trim();
      if (!output) return { status: 'rejected', reason: 'Provedor IA respondeu sem texto utilizável.' };
      return { status: 'accepted', data: { output, provider: profile.provider, model: profile.model } };
    } catch (error) { return { status: 'rejected', reason: error instanceof Error ? error.message : 'Falha no provedor IA.' }; }
  }

  async function runBot(botId: string, inputContext: Json, depth = 0): Promise<Result> {
    if (depth > 8) return { status: 'rejected', reason: 'Limite de encadeamento de SalesBots excedido.' };
    const bots = await loadList<Bot>(BOT_KEY);
    const bot = bots.find((item) => item.id === botId);
    if (!bot) return { status: 'rejected', reason: 'SalesBot não encontrado.' };
    if (bot.status !== 'active') return { status: 'rejected', reason: 'SalesBot precisa estar ativo.' };
    let executions = await loadList<Execution>(EXEC_KEY);
    const execution: Execution = { id: id('execution'), botId, leadId, conversationId, runtimeContext: inputContext, startedAt: nowIso(), status: 'running' };
    executions = [execution, ...executions];
    await saveList(EXEC_KEY, executions);

    const persist = async (patch: Partial<Execution>) => {
      executions = await loadList<Execution>(EXEC_KEY);
      const current = executions.find((item) => item.id === execution.id);
      if (!current) throw new Error('Execução desapareceu durante o processamento.');
      Object.assign(execution, current, patch);
      await saveList(EXEC_KEY, executions.map((item) => item.id === execution.id ? { ...current, ...patch } : item));
    };

    try {
      for (const block of bot.blocks ?? []) {
        await persist({ currentBlockId: block.id, action: `Executando: ${block.label ?? block.type}` });
        const config = block.config ?? {};
        if (block.type === 'trigger') continue;
        if (block.type === 'finish') { await persist({ status: 'completed', finishedAt: nowIso(), runtimeContext: undefined, resumeAt: undefined, resumeMode: undefined, action: 'Execução concluída.' }); return { status: 'accepted', executionId: execution.id, data: { runtimeStatus: 'completed' } }; }
        if (block.type === 'condition') {
          const matched = evaluateCondition(text(config.expression), inputContext);
          if (matched === null) { await persist({ status: 'failed', finishedAt: nowIso(), error: 'Condição inválida.', runtimeContext: undefined }); return { status: 'rejected', executionId: execution.id, reason: 'Condição inválida.' }; }
          if (!matched) { await persist({ status: 'completed', finishedAt: nowIso(), runtimeContext: undefined, action: 'Condição não atendida; fluxo encerrado.' }); return { status: 'accepted', executionId: execution.id, data: { runtimeStatus: 'completed' } }; }
          continue;
        }
        if (block.type === 'delay') {
          const duration = delayMs(text(config.duration));
          if (!duration) { await persist({ status: 'failed', finishedAt: nowIso(), error: 'Duração de espera inválida.', runtimeContext: undefined }); return { status: 'rejected', executionId: execution.id, reason: 'Duração de espera inválida.' }; }
          const resumeAt = new Date(Date.now() + duration).toISOString();
          await persist({ status: 'paused', resumeMode: 'next_block', resumeAt, runtimeContext: inputContext, action: `Aguardando ${text(config.duration)}.` });
          return { status: 'accepted', executionId: execution.id, data: { runtimeStatus: 'paused', resumeAt } };
        }
        let result: Result;
        if (block.type === 'message') result = { status: 'not_configured', reason: 'Canal de mensagem real ainda não conectado.' };
        else if (block.type === 'ai_agent') { await persist({ aiAgentId: text(config.agentId) }); result = await invokeAgent(text(config.agentId), inputContext); }
        else if (block.type === 'chain_flow') result = await runBot(text(config.botId), inputContext, depth + 1);
        else if (block.type === 'webhook') {
          try {
            const method = (text(config.method) || 'POST').toUpperCase();
            if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) result = { status: 'rejected', reason: 'Método de webhook não permitido.' };
            else {
              const url = await safeUrl(text(config.url));
              const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputContext), redirect: 'manual', signal: AbortSignal.timeout(15000) });
              result = response.ok && !(response.status >= 300 && response.status < 400) ? { status: 'accepted', data: { httpStatus: response.status } } : { status: 'rejected', reason: `Webhook respondeu HTTP ${response.status}.` };
            }
          } catch (error) { result = { status: 'rejected', reason: error instanceof Error ? error.message : 'Falha no webhook.' }; }
        } else {
          if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para ação CRM.' };
          else {
            const map: Record<string, string> = { move_stage: 'move_stage', assign_owner: 'assign_owner', create_task: 'create_task', update_field: 'update_field', tag: text(config.operation).toLowerCase() === 'remove' ? 'remove_tag' : 'add_tag' };
            const actionType = map[block.type];
            if (!actionType) result = { status: 'rejected', reason: `Bloco ${block.type} não suportado no runtime server-side.` };
            else {
              const crmConfig: Json = block.type === 'move_stage' ? { stageId: config.stageId } : block.type === 'assign_owner' ? { userId: config.userId } : block.type === 'create_task' ? { title: config.title } : block.type === 'update_field' ? { fieldId: config.fieldId, value: config.fieldValue } : { tagId: config.tagId };
              const { data, error } = await db.rpc('admin_apply_crm_automation_action', { p_lead_id: leadId, p_action_type: actionType, p_config: crmConfig });
              result = error ? { status: 'rejected', reason: error.message } : { status: 'accepted', data: data && typeof data === 'object' ? data as Json : {} };
            }
          }
        }
        if (result.status !== 'accepted') {
          const paused = result.status === 'not_configured';
          await persist({ status: paused ? 'paused' : 'failed', resumeMode: paused ? 'retry_current' : undefined, finishedAt: paused ? undefined : nowIso(), runtimeContext: paused ? inputContext : undefined, error: paused ? undefined : result.reason, action: result.reason });
          return { ...result, executionId: execution.id };
        }
      }
      await persist({ status: 'completed', finishedAt: nowIso(), runtimeContext: undefined, action: 'Execução concluída.' });
      return { status: 'accepted', executionId: execution.id, data: { runtimeStatus: 'completed' } };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha inesperada no runtime server-side.';
      try { await persist({ status: 'failed', finishedAt: nowIso(), runtimeContext: undefined, error: reason, action: reason }); } catch { /* preserve original failure */ }
      return { status: 'rejected', executionId: execution.id, reason };
    }
  }

  try {
    if (action === 'invoke_ai') return respond(await invokeAgent(text(body.agentId), context));
    if (action === 'start_salesbot') return respond(await runBot(text(body.botId), { ...context, ...(leadId ? { leadId } : {}), ...(conversationId ? { conversationId } : {}) }));
    return respond({ status: 'rejected', reason: 'Ação server-side F05 não suportada.' }, 400);
  } catch (error) {
    return respond({ status: 'rejected', reason: error instanceof Error ? error.message : 'Falha inesperada no runtime F05.' }, 500);
  }
});
