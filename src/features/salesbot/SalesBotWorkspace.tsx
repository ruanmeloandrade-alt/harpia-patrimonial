import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { CatalogRepository } from '../catalog/catalogRepository';
import { listProductCatalogs } from '../catalog/productCatalogRepository';
import type { CatalogItem, ProductCatalog } from '../catalog/types';
import type { AssigneeOption } from '../crm/CrmWorkspace';
import type { CrmState } from '../crm/domain';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { SALESBOT_BLOCK_CATALOG } from './blockCatalog';
import {
  createSalesBotConfirmed,
  deleteSalesBot,
  duplicateSalesBot,
  importSalesBot,
  insertSalesBotBlockFromOutput,
  listSalesBots,
  setSalesBotStatus,
  updateSalesBot,
  updateSalesBotBlock,
  validateSalesBotForActivation,
} from './repository';
import type {
  SalesBotBlock,
  SalesBotBlockConfigValue,
  SalesBotBlockType,
  SalesBotDefinition,
} from './types';

type OutputBranch = 'next' | 'false' | `route:${string}`;

interface OutputDescriptor {
  branch: OutputBranch;
  label: string;
  tone?: 'yes' | 'no' | 'route';
}

interface SalesBotWorkspaceProps {
  canManage?: boolean;
  crmState?: CrmState | null;
  assignees?: AssigneeOption[];
  catalogRepository?: CatalogRepository;
}

const CANVAS_WIDTH = 2600;
const CANVAS_HEIGHT = 1800;
const NODE_WIDTH = 430;
const DEFAULT_NODE_HEIGHT = 180;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const fieldOptions = [
  ['message', 'Mensagem do cliente'],
  ['comment', 'Comentário do cliente'],
  ['leadSource', 'Fonte do lead'],
  ['leadTag', 'Tag do lead'],
  ['currentStage', 'Etapa atual'],
  ['customField', 'Campo personalizado'],
] as const;

const operatorOptions = [
  ['=', 'É igual a'],
  ['!=', 'É diferente de'],
  ['contains', 'Contém'],
  ['not_contains', 'Não contém'],
  ['exists', 'Existe'],
] as const;

const validationTypes = [
  ['number', 'É um número'],
  ['exact_number', 'Número exato'],
  ['range', 'Número entre X e Y'],
  ['email', 'E-mail'],
  ['phone', 'Telefone'],
  ['exact_text', 'Palavra específica'],
  ['letter', 'Letra específica'],
  ['regex', 'Expressão regular'],
  ['length', 'Quantidade de caracteres'],
  ['not_equals', 'Diferente de'],
  ['contains', 'Contém'],
  ['not_contains', 'Não contém'],
] as const;

const actionTypes = [
  ['add_note', 'Adicionar nota'],
  ['create_task', 'Criar tarefa'],
  ['move_stage', 'Mudar etapa ou status'],
  ['send_email', 'Enviar e-mail (segunda fase)'],
  ['update_field', 'Definir campo'],
  ['set_tag', 'Definir tag'],
  ['complete_task', 'Completar tarefa'],
  ['link_product', 'Vincular produto'],
  ['assign_owner', 'Mudar usuário responsável'],
  ['conversation_status', 'Alterar status da conversa'],
  ['webhook', 'Webhook/API'],
  ['form', 'Enviar formulário'],
  ['private_message', 'Envio privado'],
  ['notify_admins', 'Notificar administradores'],
] as const;

function createUiId(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${suffix}`;
}

function asRecord(value: SalesBotBlockConfigValue | undefined): Record<string, SalesBotBlockConfigValue> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, SalesBotBlockConfigValue>
    : null;
}

function asRows(value: SalesBotBlockConfigValue | undefined): Record<string, SalesBotBlockConfigValue>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((item): item is Record<string, SalesBotBlockConfigValue> => Boolean(item));
}

function cloneBlocks(blocks: SalesBotBlock[]): SalesBotBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as SalesBotBlock[];
}

function blockPosition(block: SalesBotBlock, index: number) {
  return {
    x: Number.isFinite(block.x) ? Number(block.x) : 120 + (index % 4) * 480,
    y: Number.isFinite(block.y) ? Number(block.y) : 100 + Math.floor(index / 4) * 300,
  };
}

function defaultConfig(type: SalesBotBlockType): Record<string, SalesBotBlockConfigValue> {
  if (type === 'message') return { message: '', buttons: [] };
  if (type === 'delay') return { pauseMode: 'timer', duration: '1m' };
  if (type === 'reaction') return { emoji: '👍' };
  if (type === 'internal_comment') return { text: '' };
  if (type === 'action') return { actionType: 'add_note', text: '' };
  if (type === 'condition') return { logic: 'all', rules: [] };
  if (type === 'validation') return { validationType: 'email' };
  if (type === 'distribution') return { options: [] };
  if (type === 'trigger') return { event: 'manual' };
  return {};
}

function outputDescriptors(block: SalesBotBlock): OutputDescriptor[] {
  if (block.type === 'finish') return [];
  if (block.type === 'condition') {
    return [
      { branch: 'next', label: 'Sim', tone: 'yes' },
      { branch: 'false', label: 'Não', tone: 'no' },
    ];
  }
  if (block.type === 'validation') {
    return [
      { branch: 'next', label: 'Válido', tone: 'yes' },
      { branch: 'false', label: 'Inválido', tone: 'no' },
    ];
  }
  if (block.type === 'message') {
    const buttons = asRows(block.config.buttons);
    return [
      { branch: 'next', label: 'Continuar sem clique' },
      ...buttons.map((button, index) => ({
        branch: `route:${String(button.id ?? '')}` as OutputBranch,
        label: String(button.label ?? '').trim() || `Botão ${index + 1}`,
        tone: 'route' as const,
      })).filter((item) => item.branch !== 'route:'),
    ];
  }
  if (block.type === 'distribution') {
    return asRows(block.config.options).map((option, index) => ({
      branch: `route:${String(option.id ?? '')}` as OutputBranch,
      label: String(option.label ?? '').trim() || `Opção ${index + 1}`,
      tone: 'route' as const,
    })).filter((item) => item.branch !== 'route:');
  }
  return [{ branch: 'next', label: 'Próximo passo' }];
}

function outputTarget(block: SalesBotBlock, branch: OutputBranch) {
  if (branch === 'next') return block.nextBlockId ?? null;
  if (branch === 'false') return block.falseNextBlockId ?? null;
  return block.routes?.[branch.slice(6)] ?? null;
}

function blockSummary(block: SalesBotBlock) {
  if (block.type === 'trigger') return 'O fluxo começa aqui';
  if (block.type === 'message') {
    const buttons = asRows(block.config.buttons);
    return `${String(block.config.message ?? '').trim() || 'Configure a mensagem'}${buttons.length ? ` · ${buttons.length} botão(ões)` : ''}`;
  }
  if (block.type === 'delay') return String(block.config.pauseMode ?? 'Pausa');
  if (block.type === 'reaction') return `Reagir com ${String(block.config.emoji ?? '👍')}`;
  if (block.type === 'internal_comment') return String(block.config.text ?? '').trim() || 'Nota interna no Inbox';
  if (block.type === 'action') return actionTypes.find(([value]) => value === block.config.actionType)?.[1] ?? 'Ação';
  if (block.type === 'condition') return `${block.config.logic === 'any' ? 'OU' : 'E'} · ${asRows(block.config.rules).length} condição(ões)`;
  if (block.type === 'validation') return validationTypes.find(([value]) => value === block.config.validationType)?.[1] ?? 'Validação';
  if (block.type === 'ai_agent') {
    const agent = listAIAgents().find((item) => item.id === String(block.config.agentId ?? ''));
    return agent ? `Agente: ${agent.name}` : 'Selecione o Agente IA';
  }
  if (block.type === 'distribution') return `Round robin · ${asRows(block.config.options).length} opção(ões)`;
  if (block.type === 'chain_flow') {
    const target = listSalesBots().find((item) => item.id === String(block.config.botId ?? ''));
    return target ? `Iniciar ${target.name}` : 'Selecione o SalesBot';
  }
  if (block.type === 'finish') return 'Finaliza a execução';
  return SALESBOT_BLOCK_CATALOG.find((item) => item.type === block.type)?.description ?? block.label;
}

function exportSalesBot(bot: SalesBotDefinition) {
  const blob = new Blob([
    JSON.stringify({ format: 'harpia-salesbot', version: 2, exportedAt: new Date().toISOString(), ...bot }, null, 2),
  ], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = bot.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'salesbot';
  link.href = href;
  link.download = `${safeName}.harpiabot.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function InlineEditor({
  block,
  botId,
  crmState,
  assignees,
  catalogs,
  catalogItems,
  beforeChange,
  afterChange,
  onError,
}: {
  block: SalesBotBlock;
  botId: string;
  crmState: CrmState | null;
  assignees: AssigneeOption[];
  catalogs: ProductCatalog[];
  catalogItems: CatalogItem[];
  beforeChange: () => void;
  afterChange: () => void;
  onError: (message: string) => void;
}) {
  const patchBlock = (patch: Partial<Pick<SalesBotBlock, 'config' | 'routes'>>) => {
    try {
      beforeChange();
      updateSalesBotBlock(botId, block.id, patch);
      onError('');
      afterChange();
    } catch (error) {
      onError(errorMessage(error, 'Não foi possível alterar o bloco.'));
    }
  };

  const patch = (changes: Record<string, SalesBotBlockConfigValue>) => {
    patchBlock({ config: { ...block.config, ...changes } });
  };

  const textValue = (key: string) => String(block.config[key] ?? '');
  const select = (key: string, value: string) => patch({ [key]: value });

  if (block.type === 'trigger') {
    return <div className="sb-inline-note">Bloco inicial fixo. Ele marca o início do fluxo e não pode ser excluído.</div>;
  }

  if (block.type === 'finish') {
    return <div className="sb-inline-note">Encerra o SalesBot neste ponto.</div>;
  }

  if (block.type === 'message') {
    const buttons = asRows(block.config.buttons);
    const saveButtons = (next: Record<string, SalesBotBlockConfigValue>[], routes = block.routes ?? {}) => {
      patchBlock({ config: { ...block.config, buttons: next }, routes });
    };
    return <div className="sb-message-config">
      <label>Mensagem
        <textarea
          key={`${block.id}:message:${textValue('message')}`}
          defaultValue={textValue('message')}
          placeholder="Digite a mensagem enviada ao cliente"
          onBlur={(event) => {
            if (event.currentTarget.value !== textValue('message')) patch({ message: event.currentTarget.value });
          }}
        />
      </label>
      <div className="sb-button-editor">
        <div className="sb-button-editor__head">
          <strong>Botões da mensagem</strong>
          <button
            type="button"
            className="secondary"
            onClick={() => saveButtons([...buttons, { id: createUiId('button'), label: `Botão ${buttons.length + 1}` }])}
          >+ Botão</button>
        </div>
        {buttons.map((button, index) => {
          const id = String(button.id ?? '');
          const label = String(button.label ?? '');
          return <div className="sb-button-row" key={id || index}>
            <input
              defaultValue={label}
              placeholder={`Botão ${index + 1}`}
              onBlur={(event) => {
                const nextLabel = event.currentTarget.value;
                if (nextLabel === label) return;
                saveButtons(buttons.map((item, itemIndex) => itemIndex === index ? { ...item, label: nextLabel } : item));
              }}
            />
            <span className="sb-output-dot route" title="Este botão possui uma saída própria"/>
            <button
              type="button"
              className="icon danger"
              onClick={() => {
                const routes = { ...(block.routes ?? {}) };
                delete routes[id];
                saveButtons(buttons.filter((_, itemIndex) => itemIndex !== index), routes);
              }}
            >×</button>
          </div>;
        })}
      </div>
    </div>;
  }

  if (block.type === 'delay') {
    const mode = textValue('pauseMode') || 'timer';
    return <div className="sb-inline-grid sb-inline-grid--2">
      <label>Tipo de pausa
        <select value={mode} onChange={(event) => select('pauseMode', event.target.value)}>
          <option value="timer">Cronômetro</option>
          <option value="customer_reply">Até o cliente responder</option>
          <option value="audio_open">Até o áudio ser aberto</option>
          <option value="audio_close">Até o áudio ser fechado/concluído</option>
          <option value="video_open">Até o vídeo ser aberto</option>
          <option value="video_close">Até o vídeo ser fechado/concluído</option>
          <option value="during_business">Pausar durante o expediente</option>
          <option value="outside_business">Pausar fora do expediente</option>
        </select>
      </label>
      {mode === 'timer' ? <label>Duração
        <select value={textValue('duration') || '1m'} onChange={(event) => patch({ duration: event.target.value })}>
          <option value="10s">10 segundos</option>
          <option value="30s">30 segundos</option>
          <option value="1m">1 minuto</option>
          <option value="2m">2 minutos</option>
          <option value="5m">5 minutos</option>
          <option value="10m">10 minutos</option>
          <option value="30m">30 minutos</option>
          <option value="1h">1 hora</option>
          <option value="2h">2 horas</option>
          <option value="6h">6 horas</option>
          <option value="12h">12 horas</option>
          <option value="1d">1 dia</option>
          <option value="2d">2 dias</option>
        </select>
      </label> : <div className="sb-inline-note">A execução retoma automaticamente quando este evento for atendido.</div>}
    </div>;
  }

  if (block.type === 'reaction') {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '✅', '👀'];
    return <div className="sb-inline-grid"><label>Reação</label><div className="sb-emoji-grid">{emojis.map((emoji) => <button key={emoji} type="button" className={textValue('emoji') === emoji ? 'active' : 'secondary'} onClick={() => patch({ emoji })}>{emoji}</button>)}</div></div>;
  }

  if (block.type === 'internal_comment') {
    return <div className="sb-message-config"><label>Comentário interno
      <textarea
        key={`${block.id}:comment:${textValue('text')}`}
        defaultValue={textValue('text')}
        placeholder="Nota interna, não enviada ao cliente"
        onBlur={(event) => {
          if (event.currentTarget.value !== textValue('text')) patch({ text: event.currentTarget.value });
        }}
      />
    </label></div>;
  }

  if (block.type === 'action') {
    const actionType = textValue('actionType') || 'add_note';
    const field = (label: string, key: string, placeholder: string) => <label>{label}<input defaultValue={textValue(key)} placeholder={placeholder} onBlur={(event) => { if (event.currentTarget.value !== textValue(key)) patch({ [key]: event.currentTarget.value }); }}/></label>;
    const productsMode = textValue('productMode') || 'catalog';
    const selectedCatalog = textValue('catalogId');
    const availableProducts = catalogItems.filter((item) => item.itemType === 'product' && !item.deletedAt && (productsMode === 'standalone' ? item.catalogId === null : item.catalogId === selectedCatalog));
    return <div className="sb-action-editor">
      <label>Ação
        <select value={actionType} onChange={(event) => patch({ actionType: event.target.value })}>
          {actionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {actionType === 'add_note' ? field('Nota', 'text', 'Texto da nota') : null}
      {actionType === 'create_task' ? <div className="sb-inline-grid sb-inline-grid--2">{field('Tarefa', 'title', 'Título da tarefa')}{field('Prazo', 'dueAt', 'Data/hora opcional')}</div> : null}
      {actionType === 'move_stage' ? <label>Etapa
        <select value={textValue('stageId')} onChange={(event) => patch({ stageId: event.target.value })}>
          <option value="">Selecione a etapa</option>
          {(crmState?.stages ?? []).sort((a,b) => a.position-b.position).map((stage) => {
            const pipeline = crmState?.pipelines.find((item) => item.id === stage.pipelineId);
            return <option key={stage.id} value={stage.id}>{pipeline ? `${pipeline.name} · ` : ''}{stage.name}</option>;
          })}
        </select>
      </label> : null}
      {actionType === 'send_email' ? <div className="sb-inline-note"><b>Segunda fase.</b> A configuração de e-mail fica preservada, mas o envio só será ativado na fase de Marketing.</div> : null}
      {actionType === 'update_field' ? <div className="sb-inline-grid sb-inline-grid--2"><label>Campo
        <select value={textValue('fieldId')} onChange={(event) => patch({ fieldId: event.target.value })}>
          <option value="">Selecione o campo</option>
          {(crmState?.customFieldDefinitions ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>{field('Valor', 'fieldValue', 'Novo valor')}</div> : null}
      {actionType === 'set_tag' ? <label>Tag
        <select value={textValue('tagId')} onChange={(event) => patch({ tagId: event.target.value })}>
          <option value="">Selecione a tag</option>
          {(crmState?.tags ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label> : null}
      {actionType === 'complete_task' ? <label>Tarefa
        <select value={textValue('taskId')} onChange={(event) => patch({ taskId: event.target.value })}>
          <option value="">Selecione a tarefa</option>
          {(crmState?.tasks ?? []).filter((item) => item.status === 'pending').map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label> : null}
      {actionType === 'link_product' ? <div className="sb-inline-grid">
        <label>Origem do produto<select value={productsMode} onChange={(event) => patch({ productMode: event.target.value, catalogId: '', productId: '' })}><option value="catalog">Catálogo</option><option value="standalone">Produto avulso</option></select></label>
        {productsMode === 'catalog' ? <label>Catálogo<select value={selectedCatalog} onChange={(event) => patch({ catalogId: event.target.value, productId: '' })}><option value="">Selecione o catálogo</option>{catalogs.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
        <label>Produto<select value={textValue('productId')} onChange={(event) => patch({ productId: event.target.value })}><option value="">Selecione o produto</option>{availableProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div> : null}
      {actionType === 'assign_owner' ? <label>Responsável<select value={textValue('userId')} onChange={(event) => patch({ userId: event.target.value })}><option value="">Selecione o responsável</option>{assignees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {actionType === 'conversation_status' ? <label>Status da conversa<select value={textValue('conversationStatus')} onChange={(event) => patch({ conversationStatus: event.target.value })}><option value="">Selecione</option><option value="open">Aberta</option><option value="closed">Encerrada</option></select></label> : null}
      {actionType === 'webhook' ? <div className="sb-inline-grid sb-inline-grid--2"><label>Método<select value={textValue('method') || 'POST'} onChange={(event) => patch({ method: event.target.value })}><option>POST</option><option>PUT</option><option>PATCH</option></select></label>{field('Endpoint', 'url', 'https://...')}</div> : null}
      {actionType === 'form' ? field('Formulário', 'formId', 'Selecione ou informe o formulário') : null}
      {actionType === 'private_message' ? field('Mensagem privada', 'text', 'Mensagem interna/privada') : null}
      {actionType === 'notify_admins' ? field('Notificação', 'text', 'Mensagem para administradores') : null}
    </div>;
  }

  if (block.type === 'condition') {
    const rules = asRows(block.config.rules);
    const logic = textValue('logic') || 'all';
    const saveRules = (next: Record<string, SalesBotBlockConfigValue>[]) => patch({ rules: next });
    return <div className="sb-condition-editor">
      <label>Como avaliar<select value={logic} onChange={(event) => patch({ logic: event.target.value })}><option value="all">E, todas precisam bater</option><option value="any">OU, qualquer uma pode bater</option></select></label>
      {rules.map((rule, index) => {
        const id = String(rule.id ?? '');
        const field = String(rule.field ?? 'message');
        const operator = String(rule.operator ?? 'contains');
        const updateRule = (changes: Record<string, SalesBotBlockConfigValue>) => saveRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
        return <div className="sb-rule-row" key={id || index}>
          <select value={field} onChange={(event) => updateRule({ field: event.target.value })}>{fieldOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={operator} onChange={(event) => updateRule({ operator: event.target.value })}>{operatorOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
          {field === 'customField' ? <select value={String(rule.customFieldId ?? '')} onChange={(event) => updateRule({ customFieldId: event.target.value })}><option value="">Campo personalizado</option>{(crmState?.customFieldDefinitions ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
          {operator !== 'exists' ? <input defaultValue={String(rule.value ?? '')} placeholder="Valor" onBlur={(event) => { if (event.currentTarget.value !== String(rule.value ?? '')) updateRule({ value: event.currentTarget.value }); }}/> : null}
          <button type="button" className="icon danger" onClick={() => saveRules(rules.filter((_, itemIndex) => itemIndex !== index))}>×</button>
        </div>;
      })}
      <button type="button" className="secondary" onClick={() => saveRules([...rules, { id: createUiId('rule'), field: 'message', operator: 'contains', value: '' }])}>+ Condição</button>
    </div>;
  }

  if (block.type === 'validation') {
    const validationType = textValue('validationType') || 'email';
    return <div className="sb-inline-grid sb-inline-grid--2">
      <label>Validar<select value={validationType} onChange={(event) => patch({ validationType: event.target.value })}>{validationTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {['exact_number','exact_text','letter','regex','length','not_equals','contains','not_contains'].includes(validationType) ? <label>Valor esperado<input defaultValue={textValue('value')} onBlur={(event) => { if (event.currentTarget.value !== textValue('value')) patch({ value: event.currentTarget.value }); }}/></label> : null}
      {validationType === 'range' ? <><label>Mínimo<input type="number" defaultValue={textValue('min')} onBlur={(event) => patch({ min: event.currentTarget.value })}/></label><label>Máximo<input type="number" defaultValue={textValue('max')} onBlur={(event) => patch({ max: event.currentTarget.value })}/></label></> : null}
    </div>;
  }

  if (block.type === 'ai_agent') {
    const agents = listAIAgents().filter((agent) => agent.status === 'active');
    return <div className="sb-inline-grid"><label>Agente IA<select value={textValue('agentId')} onChange={(event) => patch({ agentId: event.target.value })}><option value="">Selecione o agente</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></div>;
  }

  if (block.type === 'distribution') {
    const options = asRows(block.config.options);
    const saveOptions = (next: Record<string, SalesBotBlockConfigValue>[], routes = block.routes ?? {}) => patchBlock({ config: { ...block.config, options: next }, routes });
    return <div className="sb-button-editor">
      <div className="sb-button-editor__head"><strong>Opções do round robin</strong><button type="button" className="secondary" onClick={() => saveOptions([...options, { id: createUiId('round'), label: `Opção ${options.length + 1}` }])}>+ Opção</button></div>
      {options.map((option,index) => {
        const id = String(option.id ?? '');
        const label = String(option.label ?? '');
        return <div className="sb-button-row" key={id || index}><input defaultValue={label} onBlur={(event) => { if (event.currentTarget.value !== label) saveOptions(options.map((item,itemIndex) => itemIndex === index ? { ...item, label: event.currentTarget.value } : item)); }}/><span className="sb-output-dot route"/><button type="button" className="icon danger" onClick={() => { const routes = { ...(block.routes ?? {}) }; delete routes[id]; saveOptions(options.filter((_,itemIndex) => itemIndex !== index), routes); }}>×</button></div>;
      })}
    </div>;
  }

  if (block.type === 'chain_flow') {
    return <div className="sb-inline-grid"><label>SalesBot<select value={textValue('botId')} onChange={(event) => patch({ botId: event.target.value })}><option value="">Selecione o SalesBot</option>{listSalesBots().filter((item) => item.id !== botId && item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>;
  }

  const legacyFields: Partial<Record<SalesBotBlockType, Array<[string,string,string]>>> = {
    move_stage: [['stageId','Etapa','Etapa de destino']],
    assign_owner: [['userId','Responsável','Responsável']],
    create_task: [['title','Tarefa','Título da tarefa']],
    update_field: [['fieldId','Campo','Campo'],['fieldValue','Valor','Novo valor']],
    tag: [['tagId','Tag','Tag']],
    webhook: [['url','Endpoint','https://...']],
  };
  return <div className="sb-inline-grid">{(legacyFields[block.type] ?? []).map(([key,label,placeholder]) => <label key={key}>{label}<input defaultValue={textValue(key)} placeholder={placeholder} onBlur={(event) => { if (event.currentTarget.value !== textValue(key)) patch({ [key]: event.currentTarget.value }); }}/></label>)}</div>;
}

function CanvasConnections({
  blocks,
  positions,
}: {
  blocks: SalesBotBlock[];
  positions: Map<string, { x: number; y: number }>;
}) {
  const lines: Array<{ key: string; from: SalesBotBlock; toId: string; index: number; tone: 'normal'|'yes'|'no'|'route' }> = [];
  blocks.forEach((block) => {
    const outputs = outputDescriptors(block);
    outputs.forEach((output,index) => {
      const target = outputTarget(block, output.branch);
      if (!target) return;
      lines.push({
        key: `${block.id}:${output.branch}`,
        from: block,
        toId: target,
        index,
        tone: output.tone ?? 'normal',
      });
    });
  });

  return <svg className="sb-connections" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-hidden="true">
    <defs>
      {['normal','yes','no','route'].map((tone) => <marker key={tone} id={`sbArrow-${tone}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker>)}
    </defs>
    {lines.map((line) => {
      const from = positions.get(line.from.id);
      const to = positions.get(line.toId);
      if (!from || !to) return null;
      const x1 = from.x + NODE_WIDTH;
      const y1 = from.y + 95 + line.index * 18;
      const x2 = to.x;
      const y2 = to.y + 48;
      const mid = x1 + Math.max(70, (x2 - x1) / 2);
      return <path
        key={line.key}
        className={`sb-line ${line.tone}`}
        d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
        markerEnd={`url(#sbArrow-${line.tone})`}
      />;
    })}
  </svg>;
}

export function SalesBotWorkspace({
  canManage = false,
  crmState = null,
  assignees = [],
  catalogRepository,
}: SalesBotWorkspaceProps) {
  const [bots, setBots] = useState(() => listSalesBots());
  const [mode, setMode] = useState<'library'|'builder'>('library');
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<{ blockId: string; branch: OutputBranch }|null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftPositions, setDraftPositions] = useState<Record<string,{x:number;y:number}>>({});
  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const historyRef = useRef<SalesBotBlock[][]>([]);
  const redoRef = useRef<SalesBotBlock[][]>([]);
  const dragRef = useRef<{ startX:number; startY:number; initial:Record<string,{x:number;y:number}>; latest:Record<string,{x:number;y:number}> }|null>(null);
  const canvasRef = useRef<HTMLDivElement|null>(null);
  const stageRef = useRef<HTMLDivElement|null>(null);
  const suppressCanvasClickRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement|null>(null);
  const [, setHistoryRevision] = useState(0);

  const selected = useMemo(() => bots.find((bot) => bot.id === selectedId) ?? null, [bots,selectedId]);
  const selectedBlockId = selectedBlockIds.size === 1 ? [...selectedBlockIds][0] : null;
  const positions = useMemo(() => {
    const map = new Map<string,{x:number;y:number}>();
    selected?.blocks.forEach((block,index) => map.set(block.id, draftPositions[block.id] ?? blockPosition(block,index)));
    return map;
  }, [selected,draftPositions]);
  const validationIssues = useMemo(() => selected ? validateSalesBotForActivation(selected) : [], [selected,bots]);

  const refresh = (focusId?: string) => {
    const next = listSalesBots();
    setBots(next);
    if (focusId) setSelectedId(focusId);
  };

  useF05StorageListener(() => refresh(selectedId ?? undefined));

  useEffect(() => {
    let active = true;
    if (!catalogRepository) return () => { active = false; };
    void Promise.all([listProductCatalogs(), catalogRepository.list({ includeDeleted: false })])
      .then(([nextCatalogs,nextItems]) => {
        if (!active) return;
        setCatalogs(nextCatalogs);
        setCatalogItems(nextItems);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [catalogRepository]);

  useEffect(() => {
    if (mode !== 'builder' || !selected) return;
    const start = selected.blocks.find((block) => block.type === 'trigger');
    if (!start) return;
    const timer = window.setTimeout(() => {
      const pos = positions.get(start.id) ?? { x: 80, y: 90 };
      canvasRef.current?.scrollTo({ left: Math.max(0,pos.x - 50), top: Math.max(0,pos.y - 50) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode, selectedId]);

  const pushHistory = () => {
    if (!selected) return;
    historyRef.current.push(cloneBlocks(selected.blocks));
    if (historyRef.current.length > 80) historyRef.current.shift();
    redoRef.current = [];
    setHistoryRevision((value) => value + 1);
  };

  const undo = () => {
    if (!selected || !canManage) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    redoRef.current.push(cloneBlocks(selected.blocks));
    updateSalesBot(selected.id, { blocks: previous });
    setPicker(null);
    setDraftPositions({});
    refresh(selected.id);
    setHistoryRevision((value) => value + 1);
  };

  const redo = () => {
    if (!selected || !canManage) return;
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push(cloneBlocks(selected.blocks));
    updateSalesBot(selected.id, { blocks: next });
    setPicker(null);
    setDraftPositions({});
    refresh(selected.id);
    setHistoryRevision((value) => value + 1);
  };

  const openBuilder = (id: string) => {
    const bot = listSalesBots().find((item) => item.id === id);
    setSelectedId(id);
    setSelectedBlockIds(new Set(bot?.blocks[0]?.id ? [bot.blocks[0].id] : []));
    setPicker(null);
    setDraftPositions({});
    historyRef.current = [];
    redoRef.current = [];
    setError('');
    setNotice('');
    setMode('builder');
  };

  const create = async () => {
    if (!canManage || creating) return;
    setCreating(true);
    try {
      const bot = await createSalesBotConfirmed({ name: 'Novo SalesBot' });
      refresh(bot.id);
      openBuilder(bot.id);
    } catch (createError) {
      setError(errorMessage(createError,'Não foi possível criar o SalesBot.'));
    } finally {
      setCreating(false);
    }
  };

  const importFile = async (file: File) => {
    if (!canManage) return;
    try {
      const parsed = JSON.parse(await file.text());
      const fallbackName = file.name.replace(/\.(harpiabot\.)?json$/i,'').trim() || 'SalesBot importado';
      const bot = await importSalesBot(parsed,fallbackName);
      refresh(bot.id);
      openBuilder(bot.id);
    } catch (importError) {
      setError(errorMessage(importError,'Não foi possível importar este SalesBot.'));
    }
  };

  const patchBot = (patch: Partial<Pick<SalesBotDefinition,'name'|'description'>>) => {
    if (!selected || !canManage) return;
    try {
      updateSalesBot(selected.id,patch);
      refresh(selected.id);
    } catch (patchError) {
      setError(errorMessage(patchError,'Não foi possível alterar o SalesBot.'));
    }
  };

  const addFromOutput = (blockId: string, branch: OutputBranch, type: SalesBotBlockType, label: string) => {
    if (!selected || !canManage) return;
    pushHistory();
    try {
      const updated = insertSalesBotBlockFromOutput(selected.id,blockId,branch,{ type,label,config:defaultConfig(type),nextBlockId:null,falseNextBlockId:null,routes:{} });
      const source = updated.blocks.find((block) => block.id === blockId);
      const createdId = source ? outputTarget(source,branch) : null;
      setSelectedBlockIds(new Set(createdId ? [createdId] : []));
      setPicker(null);
      refresh(selected.id);
    } catch (addError) {
      historyRef.current.pop();
      setError(errorMessage(addError,'Não foi possível adicionar o próximo bloco.'));
    }
  };

  const disconnect = (block: SalesBotBlock, branch: OutputBranch) => {
    if (!selected || !canManage) return;
    pushHistory();
    try {
      if (branch === 'next') updateSalesBotBlock(selected.id,block.id,{ nextBlockId:null });
      else if (branch === 'false') updateSalesBotBlock(selected.id,block.id,{ falseNextBlockId:null });
      else {
        const routes = { ...(block.routes ?? {}) };
        delete routes[branch.slice(6)];
        updateSalesBotBlock(selected.id,block.id,{ routes });
      }
      refresh(selected.id);
    } catch (disconnectError) {
      historyRef.current.pop();
      setError(errorMessage(disconnectError,'Não foi possível remover a conexão.'));
    }
  };

  const deleteBlocks = (ids: Set<string>) => {
    if (!selected || !canManage) return;
    const kill = new Set([...ids].filter((id) => selected.blocks.find((block) => block.id === id)?.type !== 'trigger'));
    if (!kill.size) return;
    pushHistory();
    const blocks = selected.blocks
      .filter((block) => !kill.has(block.id))
      .map((block) => ({
        ...block,
        nextBlockId:block.nextBlockId && kill.has(block.nextBlockId) ? null : block.nextBlockId,
        falseNextBlockId:block.falseNextBlockId && kill.has(block.falseNextBlockId) ? null : block.falseNextBlockId,
        routes:Object.fromEntries(Object.entries(block.routes ?? {}).map(([key,target]) => [key,target && kill.has(target) ? null : target])),
      }));
    updateSalesBot(selected.id,{ blocks });
    const start = blocks.find((block) => block.type === 'trigger');
    setSelectedBlockIds(new Set(start ? [start.id] : []));
    setPicker(null);
    refresh(selected.id);
  };

  const deleteSelected = () => deleteBlocks(selectedBlockIds);

  const duplicateSelected = () => {
    if (!selected || !canManage) return;
    const chosen = selected.blocks.filter((block) => selectedBlockIds.has(block.id) && block.type !== 'trigger');
    if (!chosen.length) return;
    pushHistory();
    const idMap = new Map(chosen.map((block) => [block.id,createUiId('block')]));
    const copies = chosen.map((block) => ({
      ...cloneBlocks([block])[0],
      id:idMap.get(block.id)!,
      x:(block.x ?? 80)+55,
      y:(block.y ?? 90)+55,
      nextBlockId:block.nextBlockId && idMap.has(block.nextBlockId) ? idMap.get(block.nextBlockId)! : null,
      falseNextBlockId:block.falseNextBlockId && idMap.has(block.falseNextBlockId) ? idMap.get(block.falseNextBlockId)! : null,
      routes:Object.fromEntries(Object.entries(block.routes ?? {}).map(([key,target]) => [key,target && idMap.has(target) ? idMap.get(target)! : null])),
    }));
    updateSalesBot(selected.id,{ blocks:[...selected.blocks,...copies] });
    setSelectedBlockIds(new Set(copies.map((block) => block.id)));
    refresh(selected.id);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (!selected || !canManage || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button,input,textarea,select')) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = selectedBlockIds.has(id) ? [...selectedBlockIds] : [id];
    if (!selectedBlockIds.has(id)) setSelectedBlockIds(new Set([id]));
    pushHistory();
    const initial:Record<string,{x:number;y:number}> = {};
    ids.forEach((blockId) => {
      const block = selected.blocks.find((item) => item.id === blockId);
      if (!block) return;
      initial[blockId] = blockPosition(block,selected.blocks.findIndex((item) => item.id === blockId));
    });
    dragRef.current = { startX:event.clientX,startY:event.clientY,initial,latest:initial };

    const move = (moveEvent:PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = moveEvent.clientX-drag.startX;
      const dy = moveEvent.clientY-drag.startY;
      const latest:Record<string,{x:number;y:number}> = {};
      Object.entries(drag.initial).forEach(([blockId,pos]) => {
        latest[blockId] = {
          x:Math.max(20,Math.min(CANVAS_WIDTH-NODE_WIDTH-20,pos.x+dx)),
          y:Math.max(20,Math.min(CANVAS_HEIGHT-260,pos.y+dy)),
        };
      });
      drag.latest = latest;
      setDraftPositions(latest);
    };
    const up = () => {
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      const blocks = selected.blocks.map((block) => drag.latest[block.id] ? { ...block,...drag.latest[block.id] } : block);
      updateSalesBot(selected.id,{ blocks });
      setDraftPositions({});
      refresh(selected.id);
    };
    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',up);
  };

  const canvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selected || event.button !== 0) return;
    if (event.target !== stageRef.current && !(event.target as HTMLElement).classList.contains('sb-canvas-stage')) return;

    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      if (!canManage) return;
      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX-rect.left+canvas.scrollLeft;
      const startY = event.clientY-rect.top+canvas.scrollTop;
      const box = document.createElement('div');
      box.className = 'sb-selection-box';
      stage.appendChild(box);

      const move = (moveEvent:PointerEvent) => {
        const currentX = moveEvent.clientX-rect.left+canvas.scrollLeft;
        const currentY = moveEvent.clientY-rect.top+canvas.scrollTop;
        const left=Math.min(startX,currentX), top=Math.min(startY,currentY);
        const width=Math.abs(currentX-startX), height=Math.abs(currentY-startY);
        Object.assign(box.style,{ left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px` });
      };
      const cleanup = () => {
        document.removeEventListener('pointermove',move);
        document.removeEventListener('pointerup',up);
        document.removeEventListener('pointercancel',cancel);
      };
      const up = (upEvent:PointerEvent) => {
        cleanup();
        const endX=upEvent.clientX-rect.left+canvas.scrollLeft;
        const endY=upEvent.clientY-rect.top+canvas.scrollTop;
        const left=Math.min(startX,endX), right=Math.max(startX,endX), top=Math.min(startY,endY), bottom=Math.max(startY,endY);
        const ids=selected.blocks.filter((block,index) => {
          if (block.type === 'trigger') return false;
          const pos=positions.get(block.id) ?? blockPosition(block,index);
          return pos.x<right && pos.x+NODE_WIDTH>left && pos.y<bottom && pos.y+DEFAULT_NODE_HEIGHT>top;
        }).map((block) => block.id);
        setSelectedBlockIds(new Set(ids));
        box.remove();
      };
      const cancel = () => {
        cleanup();
        box.remove();
      };
      document.addEventListener('pointermove',move);
      document.addEventListener('pointerup',up);
      document.addEventListener('pointercancel',cancel);
      return;
    }

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startScrollLeft = canvas.scrollLeft;
    const startScrollTop = canvas.scrollTop;
    let moved = false;
    setIsCanvasPanning(true);

    const move = (moveEvent:PointerEvent) => {
      const dx = moveEvent.clientX-startClientX;
      const dy = moveEvent.clientY-startClientY;
      if (!moved && Math.hypot(dx,dy) > 3) moved = true;
      if (moved) suppressCanvasClickRef.current = true;
      canvas.scrollLeft = startScrollLeft-dx;
      canvas.scrollTop = startScrollTop-dy;
    };
    const cleanup = () => {
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      document.removeEventListener('pointercancel',up);
      setIsCanvasPanning(false);
      if (moved) {
        window.setTimeout(() => {
          suppressCanvasClickRef.current = false;
        },0);
      }
    };
    const up = () => cleanup();

    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',up);
    document.addEventListener('pointercancel',up);
  };

  const autoArrange = () => {
    if (!selected || !canManage) return;
    pushHistory();
    const byId=new Map(selected.blocks.map((block) => [block.id,block]));
    const start=selected.blocks.find((block) => block.type === 'trigger') ?? selected.blocks[0];
    if (!start) return;
    const seen=new Set<string>();
    const queue:Array<{id:string;depth:number}>=[{id:start.id,depth:0}];
    const levels=new Map<number,number>();
    const positionsById=new Map<string,{x:number;y:number}>();
    while(queue.length){
      const item=queue.shift()!;
      if(seen.has(item.id)) continue;
      seen.add(item.id);
      const row=levels.get(item.depth) ?? 0;
      levels.set(item.depth,row+1);
      positionsById.set(item.id,{ x:100+item.depth*520,y:90+row*300 });
      const block=byId.get(item.id);
      if(!block) continue;
      [block.nextBlockId,block.falseNextBlockId,...Object.values(block.routes ?? {})].filter(Boolean).forEach((target) => queue.push({id:String(target),depth:item.depth+1}));
    }
    let extra=0;
    selected.blocks.filter((block) => !seen.has(block.id)).forEach((block) => {
      positionsById.set(block.id,{x:100,y:500+extra*280});
      extra+=1;
    });
    updateSalesBot(selected.id,{ blocks:selected.blocks.map((block) => ({...block,...positionsById.get(block.id)})) });
    refresh(selected.id);
  };

  const centerBlock = (id:string) => {
    const canvas=canvasRef.current;
    const pos=positions.get(id);
    if(!canvas || !pos) return;
    canvas.scrollTo({left:Math.max(0,pos.x-canvas.clientWidth/2+NODE_WIDTH/2),top:Math.max(0,pos.y-canvas.clientHeight/2+80),behavior:'smooth'});
  };

  useEffect(() => {
    const handler=(event:KeyboardEvent) => {
      if(mode!=='builder' || !canManage) return;
      const target=event.target as HTMLElement|null;
      const editing=target?.matches('input,textarea,select,[contenteditable="true"]');
      if(editing) return;
      const command=event.ctrlKey || event.metaKey;
      if(command && event.key.toLowerCase()==='z'){
        event.preventDefault();
        if(event.shiftKey) redo(); else undo();
      } else if(command && event.key.toLowerCase()==='y'){
        event.preventDefault(); redo();
      } else if(command && event.key.toLowerCase()==='d'){
        event.preventDefault(); duplicateSelected();
      } else if((event.key==='Delete'||event.key==='Backspace') && selectedBlockIds.size){
        event.preventDefault(); deleteSelected();
      }
    };
    window.addEventListener('keydown',handler);
    return () => window.removeEventListener('keydown',handler);
  });

  const toggleFullscreen=async()=>{
    const builder=document.getElementById('salesbotBuilder');
    if(!builder) return;
    if(!document.fullscreenElement) await builder.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  if(mode==='library'){
    return <section className="f05-module sb-library-view">
      <header className="f05-module__header">
        <div><span className="f05-kicker">SalesBot</span><h2>SalesBots</h2><p>Abra um bot existente ou crie um novo para entrar no construtor.</p></div>
        <div className="sb-library-head-actions">
          <span className="f05-count">{bots.length} bot{bots.length===1?'':'s'}</span>
          {canManage ? <button type="button" className="secondary" onClick={() => importInputRef.current?.click()}>Importar</button> : null}
          {canManage ? <button type="button" onClick={() => void create()} disabled={creating} aria-busy={creating}>{creating?'Criando...':'+ Novo SalesBot'}</button> : null}
          <input ref={importInputRef} type="file" accept=".json,.harpiabot.json,application/json" hidden onChange={(event)=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)void importFile(file);}}/>
        </div>
      </header>
      {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar SalesBots, mas não alterá-los.</div> : null}
      {error ? <div className="f05-alert">{error}</div> : null}
      <div className="sb-library-list">{bots.length===0 ? <div className="f05-empty f05-empty--large">Nenhum SalesBot criado.</div> : bots.map((bot)=><article className="sb-library-card" key={bot.id}><div><strong>{bot.name}</strong><span>{bot.blocks.length} blocos · {bot.status}</span></div><div className="sb-library-actions"><button type="button" onClick={()=>openBuilder(bot.id)}>Editar</button><button type="button" className="secondary" onClick={()=>exportSalesBot(bot)}>Exportar</button>{canManage?<button type="button" className="secondary" onClick={()=>{try{const copy=duplicateSalesBot(bot.id);refresh(copy.id);}catch(err){setError(errorMessage(err,'Não foi possível duplicar o SalesBot.'));}}}>Duplicar</button>:null}{canManage?<button type="button" className="danger" onClick={()=>{try{deleteSalesBot(bot.id);refresh();}catch(err){setError(errorMessage(err,'Não foi possível excluir o SalesBot.'));}}}>Excluir</button>:null}</div></article>)}</div>
    </section>;
  }

  return <section id="salesbotBuilder" className="f05-module sb-builder-view">
    <header className="sb-builder-top">
      <div className="sb-builder-title"><button type="button" className="secondary" onClick={()=>{setMode('library');setPicker(null);}}>← SalesBots</button><div><span className="f05-kicker">Construtor</span><input className="sb-builder-name" disabled={!canManage||!selected} value={selected?.name??''} onChange={(event)=>patchBot({name:event.target.value})}/></div></div>
      <div className="sb-builder-tools">
        {selected?<button type="button" className="secondary" onClick={()=>exportSalesBot(selected)}>Exportar</button>:null}
        <button type="button" className="secondary" onClick={undo} disabled={!historyRef.current.length}>Desfazer</button>
        <button type="button" className="secondary" onClick={redo} disabled={!redoRef.current.length}>Refazer</button>
        <button type="button" className="secondary" onClick={autoArrange}>Organizar blocos</button>
        <button type="button" className="secondary" onClick={toggleFullscreen}>Expandir tela</button>
        {selected&&canManage?<button type="button" onClick={()=>{try{setSalesBotStatus(selected.id,selected.status==='active'?'paused':'active');refresh(selected.id);}catch(err){setError(errorMessage(err,'Não foi possível alterar o status.'));}}}>{selected.status==='active'?'Pausar':'Ativar'}</button>:null}
      </div>
    </header>
    {error?<div className="f05-alert">{error}</div>:null}
    {notice?<div className="sb-notice">{notice}</div>:null}
    {!selected?<div className="f05-empty f05-empty--large">SalesBot não encontrado.</div>:<>
      <div className={`f05-validation ${validationIssues.length===0?'f05-validation--ok':''}`}><strong>{validationIssues.length===0?'Fluxo válido':`${validationIssues.length} pendência(s)`}</strong><span>{validationIssues[0]??'O SalesBot pode ser ativado.'}</span></div>
      <div className="sb-canvas-frame">
        <div className={`sb-canvas-area ${isCanvasPanning?'is-panning':''}`} ref={canvasRef}>
          <div className="sb-canvas-stage" ref={stageRef} style={{width:CANVAS_WIDTH,height:CANVAS_HEIGHT}} onPointerDown={canvasPointerDown} onClick={(event)=>{if(suppressCanvasClickRef.current)return;if(event.target===stageRef.current){setSelectedBlockIds(new Set());setPicker(null);}}}>
            <CanvasConnections blocks={selected.blocks} positions={positions}/>
            {selected.blocks.map((block,index)=>{
              const pos=positions.get(block.id)??blockPosition(block,index);
              const selectedOne=selectedBlockIds.has(block.id);
              const expanded=selectedBlockIds.size===1&&selectedOne;
              const isStart=block.type==='trigger';
              const outputs=outputDescriptors(block);
              return <article key={block.id} className={`sb-free-node ${isStart?'is-start':''} ${selectedOne?'is-selected':''} ${expanded?'is-expanded':''}`} style={{left:pos.x,top:pos.y,width:NODE_WIDTH}} onClick={(event:ReactMouseEvent)=>{event.stopPropagation();if(event.ctrlKey||event.metaKey){setSelectedBlockIds((current)=>{const next=new Set(current);if(next.has(block.id))next.delete(block.id);else next.add(block.id);return next;});}else setSelectedBlockIds(new Set([block.id]));}}>
                <div className="sb-free-node__head" onPointerDown={(event)=>startDrag(event,block.id)}>
                  <div><span className="sb-node-index">{isStart?'▶':index}</span><div><strong>{isStart?'Iniciar SalesBot':block.label}</strong><small>{blockSummary(block)}</small></div></div>
                  {isStart?<span className="sb-start-lock">PADRÃO</span>:canManage?<button type="button" className="icon danger" onClick={(event)=>{event.stopPropagation();deleteBlocks(new Set([block.id]));}}>×</button>:null}
                </div>
                {expanded?<div className="sb-free-node__config"><InlineEditor block={block} botId={selected.id} crmState={crmState} assignees={assignees} catalogs={catalogs} catalogItems={catalogItems} beforeChange={pushHistory} afterChange={()=>refresh(selected.id)} onError={setError}/></div>:null}
                {outputs.length?<div className="sb-free-node__outputs">{outputs.map((output)=>{
                  const targetId=outputTarget(block,output.branch);
                  const target=selected.blocks.find((item)=>item.id===targetId);
                  const pickerOpen=picker?.blockId===block.id&&picker.branch===output.branch;
                  return <div className="sb-output-row" key={output.branch}>
                    <span><i className={`sb-output-dot ${output.tone??''}`}/><b>{output.label}</b></span>
                    {target?<span className="sb-output-target">{target.label}<button type="button" onClick={(event)=>{event.stopPropagation();disconnect(block,output.branch);}}>Desconectar</button></span>:canManage?<button type="button" className="sb-next-button" onClick={(event)=>{event.stopPropagation();setPicker(pickerOpen?null:{blockId:block.id,branch:output.branch});}}>+ Próximo passo</button>:null}
                    {pickerOpen?<div className="sb-next-picker" onClick={(event)=>event.stopPropagation()}><strong>Escolha o próximo bloco</strong><div>{SALESBOT_BLOCK_CATALOG.map((item)=><button type="button" key={item.type} className="secondary" onClick={()=>addFromOutput(block.id,output.branch,item.type,item.label)}><b>{item.label}</b><small>{item.description}</small></button>)}</div></div>:null}
                  </div>;
                })}</div>:null}
              </article>;
            })}
            {selectedBlockIds.size>1?<div className="sb-selection-toolbar"><b>{selectedBlockIds.size} blocos selecionados</b><button type="button" className="secondary" onClick={duplicateSelected}>Duplicar</button><button type="button" className="danger" onClick={deleteSelected}>Excluir</button></div>:null}
          </div>
        </div>
        <div className="sb-minimap-panel">
          <strong>Mapa</strong>
          <div className="sb-minimap-stage">
            {selected.blocks.map((block,index)=>{
              const pos=positions.get(block.id)??blockPosition(block,index);
              const left=pos.x/CANVAS_WIDTH*176;
              const top=pos.y/CANVAS_HEIGHT*104;
              return <button key={block.id} type="button" className={`sb-mini-node ${block.type==='trigger'?'start':''} ${selectedBlockIds.has(block.id)?'active':''}`} style={{left,top}} title={block.type==='trigger'?'Iniciar SalesBot':block.label} onClick={()=>{setSelectedBlockIds(new Set([block.id]));centerBlock(block.id);}}>{block.type==='trigger'?'▶':''}</button>;
            })}
          </div>
        </div>
      </div>
      <div className="sb-builder-hint">Arraste o plano de fundo para mover a tela. Arraste o cabeçalho do bloco para mover o bloco. Ctrl + arrastar no fundo seleciona vários. Ctrl + D duplica. Ctrl + Z desfaz. Ctrl + Shift + Z ou Ctrl + Y refaz.</div>
    </>}
  </section>;
}
