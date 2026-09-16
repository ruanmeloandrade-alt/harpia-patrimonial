import { useState } from 'react';
import { clearExecutionLogs, listSalesBotExecutions } from './executionRepository';

export function ExecutionLogsPanel() {
  const [logs, setLogs] = useState(() => listSalesBotExecutions());

  return <section className="f05-module">
    <header className="f05-module__header">
      <div><span className="f05-kicker">Execuções</span><h2>Logs de SalesBot</h2><p>Histórico vazio até existirem execuções reais iniciadas pelo motor.</p></div>
      <button className="secondary" disabled={logs.length === 0} onClick={() => { if (window.confirm('Limpar os logs locais desta frente?')) { clearExecutionLogs(); setLogs([]); } }}>Limpar logs</button>
    </header>
    {logs.length === 0 ? <div className="f05-empty f05-empty--large">Nenhuma execução registrada.</div> : <div className="f05-table-wrap"><table className="f05-table"><thead><tr><th>Execução</th><th>Bot</th><th>Status</th><th>Início</th><th>Bloco atual</th><th>Erro</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{log.id}</td><td>{log.botId}</td><td>{log.status}</td><td>{new Date(log.startedAt).toLocaleString('pt-BR')}</td><td>{log.currentBlockId ?? '—'}</td><td>{log.error ?? '—'}</td></tr>)}</tbody></table></div>}
  </section>;
}
