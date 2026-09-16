import { useMemo, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import { getAIProviderCatalogItem } from '../integrations/aiProviderTypes';
import { createAIAgent, deleteAIAgent, listAIAgents, setAIAgentStatus, updateAIAgent } from './repository';
import type { AIAgentDefinition } from './types';

const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function AIAgentsWorkspace({ canManage = true }: { canManage?: boolean }) {
  const [agents, setAgents] = useState(() => listAIAgents());
  const [selectedId, setSelectedId] = useState<string | null>(() => agents[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const providers = listAIProviderProfiles();
  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId) ?? null, [agents, selectedId]);
  const selectedProvider = selected ? providers.find((profile) => profile.id === selected.providerProfileId) : undefined;

  const refresh = (focusId?: string) => {
    const next = listAIAgents();
    setAgents(next);
    if (focusId) setSelectedId(focusId);
    else setSelectedId((current) => current && next.some((agent) => agent.id === current) ? current : next[0]?.id ?? null);
  };
  useF05StorageListener(() => refresh());

  const patch = (value: Partial<Omit<AIAgentDefinition, 'id' | 'createdAt'>>) => {
    if (!selected || !canManage) return;
    updateAIAgent(selected.id, value);
    refresh(selected.id);
  };

  const canActivate = Boolean(selected?.providerProfileId && selectedProvider?.status === 'ready');

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">Agentes de IA</span><h2>Configuração interna de agentes</h2><p>Agentes ficam nos bastidores e usam um perfil de provedor configurável escolhido por cliente.</p></div><span className="f05-count">{agents.length}</span></header>
    {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar agentes, mas não alterá-los.</div> : null}
    <fieldset className="f05-readonly-fieldset" disabled={!canManage}><div className="f05-create-row"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome interno do agente"/><button disabled={!newName.trim()} onClick={() => { const agent = createAIAgent(newName); setNewName(''); refresh(agent.id); }}>Criar agente</button></div></fieldset>
    <div className="f05-split">
      <aside className="f05-list">{agents.length === 0 ? <div className="f05-empty">Nenhum agente criado.</div> : agents.map((agent) => <button key={agent.id} className={`f05-list-item ${agent.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(agent.id)}><strong>{agent.name}</strong><span>{agent.status}{agent.role ? ` · ${agent.role}` : ''}</span></button>)}</aside>
      <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>{!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um agente.</div> : <>
        <div className="f05-form-grid"><label>Nome<input value={selected.name} onChange={(e) => patch({ name: e.target.value })}/></label><label>Função<input value={selected.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Ex.: qualificação, apoio comercial"/></label></div>
        <label className="f05-field">Provedor/modelo<select value={selected.providerProfileId} onChange={(e) => patch({ providerProfileId: e.target.value, status: 'draft' })}>
          <option value="">Selecione um perfil configurado em Integrações</option>
          {providers.map((profile) => {
            const meta = getAIProviderCatalogItem(profile.provider);
            return <option key={profile.id} value={profile.id}>{profile.name} · {meta?.label ?? profile.provider}{profile.model ? ` · ${profile.model}` : ''}{profile.status !== 'ready' ? ' · pendente' : ''}</option>;
          })}
        </select></label>
        {selected.providerProfileId && !selectedProvider ? <div className="f05-inline-message">O perfil de provedor selecionado não existe mais. Escolha outro.</div> : null}
        {selectedProvider && selectedProvider.status !== 'ready' ? <div className="f05-inline-message">O perfil “{selectedProvider.name}” ainda não está pronto. Conclua modelo e chave API em Integrações.</div> : null}
        <label className="f05-field">Instruções<textarea rows={4} value={selected.instructions} onChange={(e) => patch({ instructions: e.target.value })} placeholder="Instruções operacionais do agente"/></label>
        <label className="f05-field">Regras<textarea rows={3} value={selected.rules} onChange={(e) => patch({ rules: e.target.value })} placeholder="Limites e regras obrigatórias"/></label>
        <label className="f05-field">Contexto<textarea rows={3} value={selected.context} onChange={(e) => patch({ context: e.target.value })} placeholder="Contexto que o agente poderá receber"/></label>
        <div className="f05-form-grid"><label>Acessos<input value={selected.accessScopes.join(', ')} onChange={(e) => patch({ accessScopes: splitCsv(e.target.value) })} placeholder="crm.lead.read, catalog.read"/></label><label>Pontos de acionamento<input value={selected.activationPoints.join(', ')} onChange={(e) => patch({ activationPoints: splitCsv(e.target.value) })} placeholder="salesbot, inbox, automatize"/></label></div>
        <div className="f05-actions"><button disabled={selected.status !== 'active' && !canActivate} onClick={() => { setAIAgentStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); refresh(selected.id); }}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button><button className="danger" onClick={() => { if (window.confirm('Excluir este agente?')) { deleteAIAgent(selected.id); refresh(); } }}>Excluir</button></div>
        {!canActivate && selected.status !== 'active' ? <small>Para ativar o agente, selecione um perfil de IA com status pronto.</small> : null}
      </>}</fieldset>
    </div>
  </section>;
}
