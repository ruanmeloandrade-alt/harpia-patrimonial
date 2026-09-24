import { useMemo, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import { createAIAgent, deleteAIAgent, listAIAgents, setAIAgentStatus, updateAIAgent } from './repository';
import type { AIAgentDefinition } from './types';
import { AIBrainWorkspace } from './AIBrainWorkspace';

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function AIAgentsWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [tab, setTab] = useState<'brain' | 'agents'>('brain');
  const [agents, setAgents] = useState(() => listAIAgents());
  const [selectedId, setSelectedId] = useState<string | null>(() => agents[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const providers = listAIProviderProfiles();
  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId) ?? null, [agents, selectedId]);
  const readyProvider = providers.find((profile) => profile.status === 'ready' && profile.apiKeyConfigured);
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
    try {
      updateAIAgent(selected.id, value);
      setError('');
      refresh(selected.id);
    } catch (error) {
      setError(errorMessage(error, 'Não foi possível alterar o agente IA.'));
    }
  };

  const canActivate = Boolean(selected?.providerProfileId && selectedProvider?.status === 'ready');

  return <section className="f05-module">
    <header className="f05-module__header">
      <div>
        <span className="f05-kicker">Agentes IA</span>
        <h2>Cérebro e agentes da operação</h2>
        <p>O cérebro concentra o contexto da empresa. Os agentes recebem esse conteúdo e os dados vivos da Hárpia automaticamente.</p>
      </div>
      <span className="f05-count">{agents.length}</span>
    </header>

    <div className="f05-actions">
      <button className={tab === 'brain' ? '' : 'secondary'} onClick={() => setTab('brain')}>Cérebro</button>
      <button className={tab === 'agents' ? '' : 'secondary'} onClick={() => setTab('agents')}>Agentes</button>
    </div>

    {error && <div className="f05-alert">{error}</div>}

    {tab === 'brain' ? <AIBrainWorkspace canManage={canManage} /> : <>
      {!readyProvider && <div className="f05-inline-message">Conecte uma Chave de IA em Configurações → Integrações. Depois os agentes usarão essa IA automaticamente.</div>}
      {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar agentes, mas não alterá-los.</div> : null}

      <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
        <div className="f05-create-row">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do agente"/>
          <button disabled={!newName.trim()} onClick={() => {
            try {
              const agent = createAIAgent(newName);
              setNewName('');
              setError('');
              refresh(agent.id);
            } catch (createError) {
              setError(errorMessage(createError, 'Não foi possível criar o agente IA.'));
            }
          }}>+ Criar agente</button>
        </div>
      </fieldset>

      <div className="f05-split">
        <aside className="f05-list">
          {agents.length === 0 ? <div className="f05-empty">Nenhum agente criado.</div> : agents.map((agent) => (
            <button key={agent.id} className={`f05-list-item ${agent.id === selectedId ? 'is-active' : ''}`} onClick={() => { setSelectedId(agent.id); setError(''); }}>
              <strong>{agent.name}</strong>
              <span>{agent.status}{agent.role ? ` · ${agent.role}` : ''}</span>
            </button>
          ))}
        </aside>

        <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>
          {!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um agente.</div> : <>
            <div className="f05-form-grid">
              <label>Nome<input value={selected.name} onChange={(e) => patch({ name: e.target.value })}/></label>
              <label>Função<input value={selected.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Ex.: qualificar leads e conduzir atendimento"/></label>
            </div>

            <label className="f05-field">Prompt do agente<textarea rows={8} value={selected.instructions} onChange={(e) => patch({ instructions: e.target.value })} placeholder="Você é o agente responsável por..."/></label>
            <label className="f05-field">Regras específicas<textarea rows={4} value={selected.rules} onChange={(e) => patch({ rules: e.target.value })} placeholder="Regras específicas deste agente"/></label>

            <div className="f05-validation f05-validation--ok">
              <strong>Contexto automático</strong>
              <span>Cérebro da empresa + Dashboard + catálogos e produtos + CRM e funis + Inbox + SalesBot + automações.</span>
            </div>

            <div className="f05-validation f05-validation--ok">
              <strong>Acionamento</strong>
              <span>Disponível no bloco Agente IA do SalesBot, na Inbox e nas automações do funil de vendas.</span>
            </div>

            <div className="f05-actions">
              <button disabled={selected.status !== 'active' && !readyProvider && !selectedProvider} onClick={() => {
                try {
                  if (!selected.providerProfileId && readyProvider) {
                    updateAIAgent(selected.id, { providerProfileId: readyProvider.id });
                  }
                  setAIAgentStatus(selected.id, selected.status === 'active' ? 'paused' : 'active');
                  setError('');
                  refresh(selected.id);
                } catch (statusError) {
                  setError(errorMessage(statusError, 'Não foi possível alterar o status do agente IA.'));
                }
              }}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button>
              <button className="danger" onClick={() => {
                if (!window.confirm('Excluir este agente?')) return;
                try {
                  deleteAIAgent(selected.id);
                  setError('');
                  refresh();
                } catch (deleteError) {
                  setError(errorMessage(deleteError, 'Não foi possível excluir o agente IA.'));
                }
              }}>Excluir</button>
            </div>
          </>}
        </fieldset>
      </div>
    </>}
  </section>;
}
