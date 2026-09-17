import { useMemo, useState } from 'react';
import { clearAIAgentExecutionLogs, listAIAgentExecutions } from '../ai-agents/executionRepository';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { clearExecutionLogs, listSalesBotExecutions } from './executionRepository';
import { listSalesBots } from './repository';

const relatedContext = (leadId?: string, conversationId?: string) => {
  const parts = [leadId ? `Lead: ${leadId}` : '', conversationId ? `Conversa: ${conversationId}` : ''].filter(Boolean);
  return parts.join(' · ') || '—';
};

export function ExecutionLogsPanel({ canManage = false }: { canManage?: boolean }) {
  const [salesbotLogs, setSalesbotLogs] = useState(() => listSalesBotExecutions());
  const [aiLogs, setAiLogs] = useState(() => listAIAgentExecutions());
  const botsById = useMemo(() => new Map(listSalesBots().map((item) => [item.id, item.name])), [salesbotLogs]);
  const agentsById = useMemo(() => new Map(listAIAgents().map((item) => [item.id, item.name])), [aiLogs, salesbotLogs]);
  const total = salesbotLogs.length + aiLogs.length;

  const refresh = () => {
    setSalesbotLogs(listSalesBotExecutions());
    setAiLogs(listAIAgentExecutions());
  };
  useF05StorageListener(refresh);

  const clearAll = () => {
    if (!canManage) return;
    clearExecutionLogs();
    clearAIAgentExecutionLogs();
    setSalesbotLogs([]);
    setAiLogs([]);
  };

  return <section className="f05-module">
    <header className="f05-module__header">
      <div><span className="f05-kicker">Execuções</span><h2>Logs de automação e IA</h2><p>Somente execuções realmente iniciadas pelos motores aparecem aqui. Prompts e respostas de IA não são persistidos nesta tela.</p></div>
      <button className="secondary" disabled={total === 0 || !canManage} onClick={() => { if (window.confirm('Limpar os logs compartilhados da Frente 5?')) clearAll(); }}>Limpar logs</button>
    </header>

    <div className="f05-subheader"><div><span className="f05-kicker">SalesBot</span><h3>Execuções de fluxos</h3></div><span className="f05-count">{salesbotLogs.length}</span></div>
    {salesbotLogs.length === 0 ? <div className="f05-empty">Nenhuma execução de SalesBot registrada.</div> : <div className="f05-table-wrap"><table className="f05-table"><thead><tr><th>Execução</th><th>Bot</th><th>Status</th><th>Lead/conversa</th><th>Início</th><th>Fim</th><th>Bloco</th><th>Agente IA</th><th>Última ação</th><th>Erro</th></tr></thead><tbody>{salesbotLogs.map((log) => <tr key={log.id}><td>{log.id}</td><td>{botsById.get(log.botId) ?? log.botId}</td><td>{log.status}</td><td>{relatedContext(log.leadId, log.conversationId)}</td><td>{new Date(log.startedAt).toLocaleString('pt-BR')}</td><td>{log.finishedAt ? new Date(log.finishedAt).toLocaleString('pt-BR') : '—'}</td><td>{log.currentBlockId ?? '—'}</td><td>{log.aiAgentId ? (agentsById.get(log.aiAgentId) ?? log.aiAgentId) : '—'}</td><td>{log.action ?? '—'}</td><td>{log.error ?? '—'}</td></tr>)}</tbody></table></div>}

    <div className="f05-divider" />
    <div className="f05-subheader"><div><span className="f05-kicker">Agentes IA</span><h3>Execuções de agentes</h3></div><span className="f05-count">{aiLogs.length}</span></div>
    {aiLogs.length === 0 ? <div className="f05-empty">Nenhuma execução de agente IA registrada.</div> : <div className="f05-table-wrap"><table className="f05-table"><thead><tr><th>Execução</th><th>Agente</th><th>Perfil</th><th>Status</th><th>Lead/conversa</th><th>Início</th><th>Fim</th><th>Erro</th></tr></thead><tbody>{aiLogs.map((log) => <tr key={log.id}><td>{log.id}</td><td>{agentsById.get(log.agentId) ?? log.agentId}</td><td>{log.providerProfileId}</td><td>{log.status}</td><td>{relatedContext(log.leadId, log.conversationId)}</td><td>{new Date(log.startedAt).toLocaleString('pt-BR')}</td><td>{log.finishedAt ? new Date(log.finishedAt).toLocaleString('pt-BR') : '—'}</td><td>{log.error ?? '—'}</td></tr>)}</tbody></table></div>}
  </section>;
}
