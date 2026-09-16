import { useMemo, useState } from 'react';
import { createAIAgent, deleteAIAgent, listAIAgents, setAIAgentStatus, updateAIAgent } from './repository';
import type { AIAgentDefinition } from './types';

const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function AIAgentsWorkspace() {
  const [agents, setAgents] = useState(() => listAIAgents());
  const [selectedId, setSelectedId] = useState<string | null>(() => agents[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId) ?? null, [agents, selectedId]);

  const refresh = (focusId?: string) => {
    const next = listAIAgents();
    setAgents(next);
    if (focusId) setSelectedId(focusId);
    else if (selectedId && !next.some((agent) => agent.id === selectedId)) setSelectedId(next[0]?.id ?? null);
  };

  const patch = (value: Partial<Omit<AIAgentDefinition, 'id' | 'createdAt'>>) => {
    if (!selected) return;
    updateAIAgent(selected.id, value);
    refresh(selected.id);
  };

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">Agentes de IA</span><h2>Configuração interna de agentes</h2><p>Agentes ficam nos bastidores e só atuam quando chamados por fluxo ou operação autorizada.</p></div><span className="f05-count">{agents.length}</span></header>
    <div className="f05-create-row"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome interno do agente"/><button disabled={!newName.trim()} onClick={() => { const agent = createAIAgent(newName); setNewName(''); refresh(agent.id); }}>Criar agente</button></div>
    <div className="f05-split">
      <aside className="f05-list">{agents.length === 0 ? <div className="f05-empty">Nenhum agente criado.</div> : agents.map((agent) => <button key={agent.id} className={`f05-list-item ${agent.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(agent.id)}><strong>{agent.name}</strong><span>{agent.status}{agent.role ? ` · ${agent.role}` : ''}</span></button>)}</aside>
      <div className="f05-editor">{!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um agente.</div> : <>
        <div className="f05-form-grid"><label>Nome<input value={selected.name} onChange={(e) => patch({ name: e.target.value })}/></label><label>Função<input value={selected.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Ex.: qualificação, apoio comercial"/></label></div>
        <label className="f05-field">Instruções<textarea rows={4} value={selected.instructions} onChange={(e) => patch({ instructions: e.target.value })} placeholder="Instruções operacionais do agente"/></label>
        <label className="f05-field">Regras<textarea rows={3} value={selected.rules} onChange={(e) => patch({ rules: e.target.value })} placeholder="Limites e regras obrigatórias"/></label>
        <label className="f05-field">Contexto<textarea rows={3} value={selected.context} onChange={(e) => patch({ context: e.target.value })} placeholder="Contexto que o agente poderá receber"/></label>
        <div className="f05-form-grid"><label>Acessos<input value={selected.accessScopes.join(', ')} onChange={(e) => patch({ accessScopes: splitCsv(e.target.value) })} placeholder="crm.lead.read, catalog.read"/></label><label>Pontos de acionamento<input value={selected.activationPoints.join(', ')} onChange={(e) => patch({ activationPoints: splitCsv(e.target.value) })} placeholder="salesbot, inbox, automatize"/></label></div>
        <div className="f05-actions"><button onClick={() => { setAIAgentStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); refresh(selected.id); }}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button><button className="danger" onClick={() => { if (window.confirm('Excluir este agente?')) { deleteAIAgent(selected.id); refresh(); } }}>Excluir</button></div>
      </>}</div>
    </div>
  </section>;
}
