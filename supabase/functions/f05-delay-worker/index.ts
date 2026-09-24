import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Json = Record<string, unknown>;
type Result = { status: 'accepted' | 'rejected' | 'not_configured'; executionId?: string; reason?: string; data?: Json };
type Block = { id: string; type: string; label?: string; config?: Json };
type Bot = { id: string; status: string; blocks?: Block[] };
type Execution = {
  id: string;
  botId: string;
  leadId?: string;
  conversationId?: string;
  runtimeContext?: Json;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentBlockId?: string;
  resumeMode?: 'retry_current' | 'next_block';
  resumeAt?: string;
  resumeClaimToken?: string;
  resumeClaimedUntil?: string;
  error?: string;
  action?: string;
  aiAgentId?: string;
};

type StorageRow<T> = { value: T[]; revision: number };

const BOT_KEY = 'harpia:f05:salesbots';
const EXEC_KEY = 'harpia:f05:salesbot-executions';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const respond = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers });
const text = (value: unknown) => String(value ?? '').trim();
const nowIso = () => new Date().toISOString();

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
  const a = Number(actual);
  const b = Number(expected);
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

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isIpv4(value: string) {
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respond({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const schedulerToken = req.headers.get('x-f05-scheduler-token') ?? '';
  if (!supabaseUrl || !serviceKey) return respond({ ok: false, message: 'Configuração interna incompleta.' }, 503);
  if (!schedulerToken) return respond({ ok: false, message: 'Token de scheduler ausente.' }, 401);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: validToken, error: tokenError } = await db.rpc('admin_validate_f05_scheduler_token', { p_token: schedulerToken });
  if (tokenError || validToken !== true) return respond({ ok: false, message: 'Token de scheduler inválido.' }, 401);

  async function currentLeadPlacement(runtimeLeadId?: string, inputContext: Json = {}): Promise<{ pipelineId?: string; stageId?: string }> {
    const fallback = {
      pipelineId: text(inputContext.pipelineId) || undefined,
      stageId: text(inputContext.stageId) || undefined,
    };
    if (!runtimeLeadId) return fallback;
    try {
      const { data, error } = await db.from('platform_module_state').select('state').eq('module', 'crm').maybeSingle();
      if (error) throw error;
      const state = data?.state && typeof data.state === 'object' ? data.state as Json : {};
      const leads = Array.isArray(state.leads) ? state.leads as Json[] : [];
      const lead = leads.find((item) => text(item.id) === runtimeLeadId);
      if (!lead) return fallback;
      return {
        pipelineId: text(lead.pipelineId) || fallback.pipelineId,
        stageId: text(lead.stageId) || fallback.stageId,
      };
    } catch {
      return fallback;
    }
  }

  async function emitSalesBotAutomationEvent(
    kind: 'salesbot_done' | 'salesbot_failed',
    execution: Execution,
  ): Promise<void> {
    if (!execution.leadId) return;
    const context = execution.runtimeContext && typeof execution.runtimeContext === 'object'
      ? execution.runtimeContext
      : {};
    const placement = await currentLeadPlacement(execution.leadId, context);
    const { error } = await db.from('automation_event_outbox').insert({
      event_type: 'custom.event',
      lead_id: execution.leadId,
      conversation_id: execution.conversationId ?? null,
      payload: {
        kind,
        botId: execution.botId,
        executionId: execution.id,
        ...(placement.pipelineId ? { pipelineId: placement.pipelineId } : {}),
        ...(placement.stageId ? { stageId: placement.stageId } : {}),
      },
    });
    if (error) console.error('Falha ao publicar evento de retomada do SalesBot', error.message);
  }

  async function loadRow<T>(key: string): Promise<StorageRow<T>> {
    const { data, error } = await db.from('f05_shared_storage').select('value,revision').eq('storage_key', key).single();
    if (error) throw error;
    return { value: Array.isArray(data.value) ? data.value as T[] : [], revision: Number(data.revision) };
  }

  async function patchExecution(executionId: string, patch: Partial<Execution>): Promise<Execution> {
    const row = await loadRow<Execution>(EXEC_KEY);
    const current = row.value.find((item) => item.id === executionId);
    if (!current) throw new Error('Execução não encontrada.');
    const updated = { ...current, ...patch };
    const nextValue = row.value.map((item) => item.id === executionId ? updated : item);
    const { data, error } = await db.from('f05_shared_storage')
      .update({ value: nextValue, revision: row.revision + 1, updated_at: nowIso(), updated_by: null })
      .eq('storage_key', EXEC_KEY)
      .eq('revision', row.revision)
      .select('revision')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Conflito de concorrência ao persistir execução F05.');
    return updated;
  }

  async function callRuntime(action: 'invoke_ai' | 'start_salesbot', payload: Json): Promise<Result> {
    const response = await fetch(`${supabaseUrl}/functions/v1/f05-runtime-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'manual',
      signal: AbortSignal.timeout(45000),
    });
    const body = await response.json().catch(() => null) as Result | null;
    if (!response.ok || !body) return { status: 'rejected', reason: `Runtime F05 respondeu HTTP ${response.status}.` };
    return body;
  }

  async function resumeExecution(executionId: string): Promise<Result> {
    const execRow = await loadRow<Execution>(EXEC_KEY);
    const original = execRow.value.find((item) => item.id === executionId);
    if (!original) return { status: 'rejected', reason: 'Execução não encontrada.' };
    if (original.status !== 'paused' || original.resumeMode !== 'next_block' || !original.resumeAt) return { status: 'rejected', executionId, reason: 'Execução não está elegível para retomada por delay.' };
    if (Date.parse(original.resumeAt) > Date.now()) return { status: 'rejected', executionId, reason: 'Delay ainda não venceu.' };

    const claimUntil = original.resumeClaimedUntil ? Date.parse(original.resumeClaimedUntil) : 0;
    if (Number.isFinite(claimUntil) && claimUntil > Date.now()) return { status: 'rejected', executionId, reason: 'Execução já reservada por outro worker.' };

    const claimToken = crypto.randomUUID();
    try {
      await patchExecution(executionId, {
        resumeClaimToken: claimToken,
        resumeClaimedUntil: new Date(Date.now() + 60_000).toISOString(),
        action: 'Retomada durável reservada pelo scheduler.',
      });
    } catch {
      return { status: 'rejected', executionId, reason: 'Execução foi reservada por outro worker.' };
    }

    const bots = (await loadRow<Bot>(BOT_KEY)).value;
    const bot = bots.find((item) => item.id === original.botId);
    if (!bot || bot.status !== 'active') {
      await patchExecution(executionId, { status: 'failed', finishedAt: nowIso(), error: 'SalesBot ausente ou inativo durante retomada.', runtimeContext: undefined, resumeMode: undefined, resumeAt: undefined, resumeClaimToken: undefined, resumeClaimedUntil: undefined });
      await emitSalesBotAutomationEvent('salesbot_failed', { ...original, status: 'failed', error: 'SalesBot ausente ou inativo durante retomada.' });
      return { status: 'rejected', executionId, reason: 'SalesBot ausente ou inativo durante retomada.' };
    }

    const blocks = bot.blocks ?? [];
    const currentIndex = blocks.findIndex((block) => block.id === original.currentBlockId);
    if (currentIndex < 0) {
      await patchExecution(executionId, { status: 'failed', finishedAt: nowIso(), error: 'Bloco de retomada não encontrado.', runtimeContext: undefined, resumeMode: undefined, resumeAt: undefined, resumeClaimToken: undefined, resumeClaimedUntil: undefined });
      await emitSalesBotAutomationEvent('salesbot_failed', { ...original, status: 'failed', error: 'Bloco de retomada não encontrado.' });
      return { status: 'rejected', executionId, reason: 'Bloco de retomada não encontrado.' };
    }

    const context = original.runtimeContext ?? {};
    const leadId = original.leadId;
    const conversationId = original.conversationId;
    await patchExecution(executionId, { status: 'running', resumeMode: undefined, resumeAt: undefined, resumeClaimToken: undefined, resumeClaimedUntil: undefined, error: undefined, action: 'Execução retomada pelo scheduler.' });

    try {
      for (let index = currentIndex + 1; index < blocks.length; index += 1) {
        const block = blocks[index];
        const config = block.config ?? {};
        await patchExecution(executionId, { currentBlockId: block.id, action: `Executando: ${block.label ?? block.type}` });

        if (block.type === 'trigger') continue;
        if (block.type === 'finish') {
          await patchExecution(executionId, { status: 'completed', finishedAt: nowIso(), runtimeContext: undefined, resumeMode: undefined, resumeAt: undefined, resumeClaimToken: undefined, resumeClaimedUntil: undefined, action: 'Execução concluída após delay.' });
          await emitSalesBotAutomationEvent('salesbot_done', { ...original, status: 'completed', runtimeContext: context, finishedAt: nowIso() });
          return { status: 'accepted', executionId, data: { runtimeStatus: 'completed' } };
        }
        if (block.type === 'condition') {
          const matched = evaluateCondition(text(config.expression), context);
          if (matched === null) throw new Error('Condição inválida.');
          if (!matched) {
            await patchExecution(executionId, { status: 'completed', finishedAt: nowIso(), runtimeContext: undefined, resumeMode: undefined, resumeAt: undefined, action: 'Condição não atendida; fluxo encerrado.' });
            await emitSalesBotAutomationEvent('salesbot_done', { ...original, status: 'completed', runtimeContext: context, finishedAt: nowIso() });
            return { status: 'accepted', executionId, data: { runtimeStatus: 'completed' } };
          }
          continue;
        }
        if (block.type === 'delay') {
          const duration = delayMs(text(config.duration));
          if (!duration) throw new Error('Duração de espera inválida.');
          const resumeAt = new Date(Date.now() + duration).toISOString();
          await patchExecution(executionId, { status: 'paused', resumeMode: 'next_block', resumeAt, runtimeContext: context, resumeClaimToken: undefined, resumeClaimedUntil: undefined, action: `Aguardando ${text(config.duration)}.` });
          return { status: 'accepted', executionId, data: { runtimeStatus: 'paused', resumeAt } };
        }

        let result: Result;
        if (block.type === 'message') {
          result = { status: 'not_configured', reason: 'Canal de mensagem real ainda não conectado.' };
        } else if (block.type === 'ai_agent') {
          await patchExecution(executionId, { aiAgentId: text(config.agentId) });
          result = await callRuntime('invoke_ai', { agentId: text(config.agentId), context });
        } else if (block.type === 'chain_flow') {
          result = await callRuntime('start_salesbot', { botId: text(config.botId), leadId, conversationId, context });
        } else if (block.type === 'webhook') {
          try {
            const method = (text(config.method) || 'POST').toUpperCase();
            if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) result = { status: 'rejected', reason: 'Método de webhook não permitido.' };
            else {
              const url = await safeUrl(text(config.url));
              const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(context), redirect: 'manual', signal: AbortSignal.timeout(15000) });
              result = response.ok && !(response.status >= 300 && response.status < 400)
                ? { status: 'accepted', data: { httpStatus: response.status } }
                : { status: 'rejected', reason: `Webhook respondeu HTTP ${response.status}.` };
            }
          } catch (error) {
            result = { status: 'rejected', reason: error instanceof Error ? error.message : 'Falha no webhook.' };
          }
        } else {
          if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para ação CRM.' };
          else {
            const actionMap: Record<string, string> = {
              move_stage: 'move_stage',
              assign_owner: 'assign_owner',
              create_task: 'create_task',
              update_field: 'update_field',
              tag: text(config.operation).toLowerCase() === 'remove' ? 'remove_tag' : 'add_tag',
            };
            const actionType = actionMap[block.type];
            if (!actionType) result = { status: 'rejected', reason: `Bloco ${block.type} não suportado na retomada server-side.` };
            else {
              const crmConfig: Json = block.type === 'move_stage'
                ? { stageId: config.stageId }
                : block.type === 'assign_owner'
                  ? { userId: config.userId }
                  : block.type === 'create_task'
                    ? { title: config.title }
                    : block.type === 'update_field'
                      ? { fieldId: config.fieldId, value: config.fieldValue }
                      : { tagId: config.tagId };
              const { data, error } = await db.rpc('admin_apply_crm_automation_action', { p_lead_id: leadId, p_action_type: actionType, p_config: crmConfig });
              result = error ? { status: 'rejected', reason: error.message } : { status: 'accepted', data: data && typeof data === 'object' ? data as Json : {} };
            }
          }
        }

        if (result.status !== 'accepted') {
          const paused = result.status === 'not_configured';
          await patchExecution(executionId, {
            status: paused ? 'paused' : 'failed',
            resumeMode: paused ? 'retry_current' : undefined,
            resumeAt: undefined,
            resumeClaimToken: undefined,
            resumeClaimedUntil: undefined,
            finishedAt: paused ? undefined : nowIso(),
            runtimeContext: paused ? context : undefined,
            error: paused ? undefined : result.reason,
            action: result.reason,
          });
          if (!paused) {
            await emitSalesBotAutomationEvent('salesbot_failed', { ...original, status: 'failed', runtimeContext: context, error: result.reason });
          }
          return { ...result, executionId };
        }
      }

      await patchExecution(executionId, { status: 'completed', finishedAt: nowIso(), runtimeContext: undefined, resumeMode: undefined, resumeAt: undefined, resumeClaimToken: undefined, resumeClaimedUntil: undefined, action: 'Execução concluída após delay.' });
      await emitSalesBotAutomationEvent('salesbot_done', { ...original, status: 'completed', runtimeContext: context, finishedAt: nowIso() });
      return { status: 'accepted', executionId, data: { runtimeStatus: 'completed' } };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha inesperada ao retomar SalesBot.';
      try {
        await patchExecution(executionId, { status: 'failed', finishedAt: nowIso(), runtimeContext: undefined, resumeMode: undefined, resumeAt: undefined, resumeClaimToken: undefined, resumeClaimedUntil: undefined, error: reason, action: reason });
        await emitSalesBotAutomationEvent('salesbot_failed', { ...original, status: 'failed', runtimeContext: context, error: reason, finishedAt: nowIso() });
      } catch {
        // preserva a falha original
      }
      return { status: 'rejected', executionId, reason };
    }
  }

  const executions = (await loadRow<Execution>(EXEC_KEY)).value;
  const now = Date.now();
  const due = executions.filter((item) => {
    if (item.status !== 'paused' || item.resumeMode !== 'next_block' || !item.resumeAt) return false;
    const resumeAt = Date.parse(item.resumeAt);
    if (!Number.isFinite(resumeAt) || resumeAt > now) return false;
    const claimUntil = item.resumeClaimedUntil ? Date.parse(item.resumeClaimedUntil) : 0;
    return !Number.isFinite(claimUntil) || claimUntil <= now;
  }).slice(0, 25);

  const results: Array<{ executionId: string; status: string; reason?: string }> = [];
  for (const execution of due) {
    const result = await resumeExecution(execution.id);
    results.push({ executionId: execution.id, status: result.status, reason: result.reason });
  }

  const failed = results.filter((item) => item.status === 'rejected').length;
  return respond({ ok: failed === 0, due: due.length, processed: results.length - failed, failed, results }, failed ? 207 : 200);
});
