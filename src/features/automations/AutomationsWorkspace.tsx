import { useMemo, useState } from 'react';
import { addAutomationAction, createAutomation, deleteAutomation, listAutomations, removeAutomationAction, setAutomationStatus, updateAutomation } from './repository';
import type { CrmAutomationEventType } from './contracts';
import type { AutomationActionType, AutomationDefinition } from './types';

const EVENTS: Array<{ value: CrmAutomationEventType; label: string }> = [
  { value: 'lead.created', label: 'Lead criado' },
  { value: 'lead.stage_changed', label: 'Etapa alterada' },
  { value: 'lead.field_changed', label: 'Campo alterado' },
  { value: 'lead.tag_added', label: 'Tag adicionada' },
  { value: 'lead.tag_removed', label: 'Tag removida' },
  { value: 'lead.inactivity', label: 'Ausência de interação' },
  { value: 'task.due', label: 'Tarefa/data atingida' },
  { value: 'custom.event', label: 'Evento customizado' },
];

const ACTIONS: Array<{ value: AutomationActionType; label: string }> = [
  { value: 'start_salesbot', label: 'Iniciar SalesBot' },
  { value: 'invoke_ai', label: 'Chamar agente IA' },
  { value: 'create_task', label: 'Criar tarefa' },
  { value: 'move_stage', label: 'Mover etapa' },
  { value: 'update_field', label: 'Alterar campo' },
  { value: 'add_tag', label: 'Adicionar tag' },
  { value: 'remove_tag', label: 'Remover tag' },
  { value: 'assign_owner', label: 'Atribuir responsável' },
  { value: 'webhook', label: 'Webhook/API' },
];

export function AutomationsWorkspace() {
  const [items, setItems] = useState(() => listAutomations());
  const [selectedId, setSelectedId] = useState<string | null>(() => items[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [actionType, setActionType] = useState<AutomationActionType>('start_salesbot');
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const refresh = (focusId?: string) => {
    const next = listAutomations();
    setItems(next);
    if (focusId) setSelectedId(focusId);
    else if (selectedId && !next.some((item) => item.id === selectedId)) setSelectedId(next[0]?.id ?? null);
  };

  const patch = (value: Partial<Omit<AutomationDefinition, 'id' | 'createdAt'>>) => {
    if (!selected) return;
    updateAutomation(selected.id, value);
    refresh(selected.id);
  };

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">Automatize</span><h2>Gatilhos e ações do CRM</h2><p>Automatizações configuráveis sem acoplar regras ao CRM.</p></div><span className="f05-count">{items.length}</span></header>
    <div className="f05-create-row"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da automação"/><button disabled={!newName.trim()} onClick={() => { const item = createAutomation(newName); setNewName(''); refresh(item.id); }}>Criar automação</button></div>
    <div className="f05-split">
      <aside className="f05-list">{items.length === 0 ? <div className="f05-empty">Nenhuma automação criada.</div> : items.map((item) => <button key={item.id} className={`f05-list-item ${item.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.name}</strong><span>{item.status} · {item.actions.length} ações</span></button>)}</aside>
      <div className="f05-editor">{!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione uma automação.</div> : <>
        <div className="f05-form-grid"><label>Nome<input value={selected.name} onChange={(e) => patch({ name: e.target.value })}/></label><label>Descrição<input value={selected.description} onChange={(e) => patch({ description: e.target.value })}/></label></div>
        <label className="f05-field">Gatilho<select value={selected.trigger.event} onChange={(e) => patch({ trigger: { ...selected.trigger, event: e.target.value as CrmAutomationEventType } })}>{EVENTS.map((event) => <option key={event.value} value={event.value}>{event.label}</option>)}</select></label>
        <div className="f05-actions"><button onClick={() => { setAutomationStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); refresh(selected.id); }}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button><button className="danger" onClick={() => { if (window.confirm('Excluir esta automação?')) { deleteAutomation(selected.id); refresh(); } }}>Excluir</button></div>
        <div className="f05-palette"><h3>Ações</h3><div className="f05-create-row"><select value={actionType} onChange={(e) => setActionType(e.target.value as AutomationActionType)}>{ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</select><button onClick={() => { addAutomationAction(selected.id, { type: actionType, config: {} }); refresh(selected.id); }}>Adicionar ação</button></div></div>
        <div className="f05-flow">{selected.actions.length === 0 ? <div className="f05-empty">Nenhuma ação configurada.</div> : selected.actions.map((action, index) => <div key={action.id} className="f05-block"><div className="f05-block__index">{index + 1}</div><div className="f05-block__body"><strong>{ACTIONS.find((item) => item.value === action.type)?.label ?? action.type}</strong><span>Configuração será resolvida pelo contrato do módulo correspondente.</span></div><button className="icon danger" onClick={() => { removeAutomationAction(selected.id, action.id); refresh(selected.id); }}>×</button></div>)}</div>
      </>}</div>
    </div>
  </section>;
}
