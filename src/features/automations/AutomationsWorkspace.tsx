import { useMemo, useState } from 'react';
import { listAIAgents } from '../ai-agents/repository';
import { listSalesBots } from '../salesbot/repository';
import { useF05StorageListener } from './useF05StorageListener';
import {
  addAutomationAction,
  createAutomation,
  deleteAutomation,
  duplicateAutomation,
  listAutomations,
  moveAutomationAction,
  removeAutomationAction,
  setAutomationStatus,
  updateAutomation,
  updateAutomationAction,
  validateAutomationForActivation,
} from './repository';
import type { CrmAutomationEventType } from './contracts';
import type { AutomationAction, AutomationActionType, AutomationDefinition } from './types';

const EVENTS: Array<{ value: CrmAutomationEventType; label: string }> = [
  { value: 'lead.created', label: 'Lead criado' }, { value: 'lead.stage_changed', label: 'Etapa alterada' },
  { value: 'lead.field_changed', label: 'Campo alterado' }, { value: 'lead.tag_added', label: 'Tag adicionada' },
  { value: 'lead.tag_removed', label: 'Tag removida' }, { value: 'lead.inactivity', label: 'Ausência de interação' },
  { value: 'lead.stage_elapsed', label: 'Tempo na etapa' }, { value: 'salesbot.completed', label: 'SalesBot concluído' },
  { value: 'salesbot.failed', label: 'SalesBot falhou' }, { value: 'task.due', label: 'Tarefa/data atingida' },
  { value: 'custom.event', label: 'Evento customizado' },
];
const ACTIONS: Array<{ value: AutomationActionType; label: string }> = [
  { value: 'start_salesbot', label: 'Iniciar SalesBot' }, { value: 'invoke_ai', label: 'Chamar agente IA' },
  { value: 'create_task', label: 'Criar tarefa' }, { value: 'move_stage', label: 'Mover etapa' },
  { value: 'update_field', label: 'Alterar campo' }, { value: 'add_tag', label: 'Adicionar tag' },
  { value: 'remove_tag', label: 'Remover tag' }, { value: 'assign_owner', label: 'Atribuir responsável' },
  { value: 'webhook', label: 'Webhook/API' },
];

function ActionConfig({ automationId, action, onChange }: { automationId: string; action: AutomationAction; onChange: () => void }) {
  const set = (key: string, value: string) => { updateAutomationAction(automationId, action.id, { ...action.config, [key]: value }); onChange(); };
  const get = (key: string) => String(action.config[key] ?? '');
  if (action.type === 'start_salesbot') return <label className="f05-inline-field">SalesBot<select value={get('botId')} onChange={(e) => set('botId', e.target.value)}><option value="">Selecione</option>{listSalesBots().map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label>;
  if (action.type === 'invoke_ai') return <label className="f05-inline-field">Agente IA<select value={get('agentId')} onChange={(e) => set('agentId', e.target.value)}><option value="">Selecione</option>{listAIAgents().map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>;
  const fields: Partial<Record<AutomationActionType, Array<[string, string, string]>>> = {
    create_task: [['title', 'Tarefa', 'Título da tarefa']], move_stage: [['stageId', 'Etapa', 'ID da etapa']],
    update_field: [['fieldId', 'Campo', 'ID do campo'], ['value', 'Valor', 'Novo valor']],
    add_tag: [['tagId', 'Tag', 'ID da tag']], remove_tag: [['tagId', 'Tag', 'ID da tag']],
    assign_owner: [['userId', 'Responsável', 'ID do usuário']], webhook: [['url', 'Endpoint', 'https://...'], ['method', 'Método', 'POST']],
  };
  return <div className="f05-block-config">{(fields[action.type] ?? []).map(([key, label, placeholder]) => <label className="f05-inline-field" key={key}>{label}<input value={get(key)} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}/></label>)}</div>;
}

export function AutomationsWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [items, setItems] = useState(() => listAutomations());
  const [selectedId, setSelectedId] = useState<string | null>(() => items[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [actionType, setActionType] = useState<AutomationActionType>('start_salesbot');
  const [error, setError] = useState('');
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const validationIssues = useMemo(() => selected ? validateAutomationForActivation(selected) : [], [selected, items]);
  const refresh = (focusId?: string) => {
    const next = listAutomations();
    setItems(next);
    if (focusId) setSelectedId(focusId);
    else setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
  };
  useF05StorageListener(() => refresh());

  const patch = (value: Partial<Omit<AutomationDefinition, 'id' | 'createdAt'>>) => { if (!selected || !canManage) return; updateAutomation(selected.id, value); refresh(selected.id); };

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">Automatize</span><h2>Gatilhos e ações do CRM</h2><p>Configure eventos, condições e ações sem acoplar regra de negócio ao CRM.</p></div><span className="f05-count">{items.length}</span></header>
    {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar automações, mas não alterá-las.</div> : null}
    <fieldset className="f05-readonly-fieldset" disabled={!canManage}><div className="f05-create-row"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da automação"/><button disabled={!newName.trim()} onClick={() => { const item = createAutomation(newName); setNewName(''); refresh(item.id); }}>Criar automação</button></div></fieldset>
    {error && <div className="f05-alert">{error}</div>}
    <div className="f05-split">
      <aside className="f05-list">{items.length === 0 ? <div className="f05-empty">Nenhuma automação criada.</div> : items.map((item) => <button key={item.id} className={`f05-list-item ${item.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.name}</strong><span>{item.status} · {item.actions.length} ações</span></button>)}</aside>
      <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>{!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione uma automação.</div> : <>
        <div className="f05-form-grid"><label>Nome<input value={selected.name} onChange={(e) => patch({ name: e.target.value })}/></label><label>Descrição<input value={selected.description} onChange={(e) => patch({ description: e.target.value })}/></label></div>
        <div className={`f05-validation ${validationIssues.length === 0 ? 'f05-validation--ok' : ''}`}><strong>{validationIssues.length === 0 ? 'Configuração válida para ativação' : `${validationIssues.length} pendência(s) de configuração`}</strong>{validationIssues.length > 0 && <span>{validationIssues[0]}</span>}</div>
        <label className="f05-field">Gatilho<select value={selected.trigger.event} onChange={(e) => patch({ trigger: { ...selected.trigger, event: e.target.value as CrmAutomationEventType } })}>{EVENTS.map((event) => <option key={event.value} value={event.value}>{event.label}</option>)}</select></label>
        {selected.trigger.event === 'lead.stage_elapsed' && (
          <div className="f05-readonly-note">
            Para tempo na etapa, adicione uma condição <strong>afterMinutes</strong> com o número de minutos.
            Opcionalmente use <strong>stageId</strong> para limitar a uma etapa específica.
          </div>
        )}
        {(selected.trigger.event === 'salesbot.completed' || selected.trigger.event === 'salesbot.failed') && (
          <div className="f05-readonly-note">
            O evento recebe botId, executionId e runtimeStatus. Use botId nas condições se quiser limitar a um SalesBot.
          </div>
        )}
        <div className="f05-palette"><h3>Condições opcionais</h3>{selected.trigger.conditions.map((condition, index) => <div className="f05-condition-row" key={`${index}-${condition.field}`}><input value={condition.field} placeholder="Campo/evento" onChange={(e) => { const conditions = [...selected.trigger.conditions]; conditions[index] = { ...condition, field: e.target.value }; patch({ trigger: { ...selected.trigger, conditions } }); }}/><select value={condition.operator} onChange={(e) => { const conditions = [...selected.trigger.conditions]; conditions[index] = { ...condition, operator: e.target.value as typeof condition.operator }; patch({ trigger: { ...selected.trigger, conditions } }); }}><option value="equals">igual</option><option value="not_equals">diferente</option><option value="contains">contém</option><option value="exists">existe</option></select><input value={condition.value ?? ''} disabled={condition.operator === 'exists'} placeholder="Valor" onChange={(e) => { const conditions = [...selected.trigger.conditions]; conditions[index] = { ...condition, value: e.target.value }; patch({ trigger: { ...selected.trigger, conditions } }); }}/><button className="icon danger" onClick={() => patch({ trigger: { ...selected.trigger, conditions: selected.trigger.conditions.filter((_, i) => i !== index) } })}>×</button></div>)}<button className="secondary" onClick={() => patch({ trigger: { ...selected.trigger, conditions: [...selected.trigger.conditions, { field: '', operator: 'equals', value: '' }] } })}>Adicionar condição</button></div>
        <div className="f05-actions"><button onClick={() => { try { setAutomationStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); setError(''); refresh(selected.id); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível alterar o status.'); } }}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button><button className="secondary" onClick={() => { const copy = duplicateAutomation(selected.id); setError(''); refresh(copy.id); }}>Duplicar</button><button className="danger" onClick={() => { if (window.confirm('Excluir esta automação?')) { deleteAutomation(selected.id); refresh(); } }}>Excluir</button></div>
        <div className="f05-palette"><h3>Ações</h3><div className="f05-create-row"><select value={actionType} onChange={(e) => setActionType(e.target.value as AutomationActionType)}>{ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</select><button onClick={() => { addAutomationAction(selected.id, { type: actionType, config: {} }); refresh(selected.id); }}>Adicionar ação</button></div></div>
        <div className="f05-flow">{selected.actions.length === 0 ? <div className="f05-empty">Nenhuma ação configurada.</div> : selected.actions.map((action, index) => <div key={action.id} className="f05-block f05-block--stacked"><div className="f05-block__row"><div className="f05-block__index">{index + 1}</div><div className="f05-block__body"><strong>{ACTIONS.find((item) => item.value === action.type)?.label ?? action.type}</strong><span>Ação executada pelo contrato do módulo correspondente.</span></div><div className="f05-block__actions"><button className="icon" disabled={index === 0} onClick={() => { moveAutomationAction(selected.id, action.id, -1); refresh(selected.id); }}>↑</button><button className="icon" disabled={index === selected.actions.length - 1} onClick={() => { moveAutomationAction(selected.id, action.id, 1); refresh(selected.id); }}>↓</button><button className="icon danger" onClick={() => { removeAutomationAction(selected.id, action.id); refresh(selected.id); }}>×</button></div></div><ActionConfig automationId={selected.id} action={action} onChange={() => refresh(selected.id)}/></div>)}</div>
      </>}</fieldset>
    </div>
  </section>;
}
