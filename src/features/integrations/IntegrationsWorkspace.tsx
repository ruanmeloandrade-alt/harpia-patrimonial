import { useState } from 'react';
import { listIntegrations, updateIntegration } from './repository';

const STATUS_LABELS = {
  not_connected: 'Não conectado',
  pending: 'Configuração pendente',
  connected: 'Conectado',
} as const;

export function IntegrationsWorkspace() {
  const [items, setItems] = useState(() => listIntegrations());
  const refresh = () => setItems(listIntegrations());

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">Integrações</span><h2>Conexões externas preparatórias</h2><p>WhatsApp e Meta permanecem sem conexão real até a fase final.</p></div></header>
    <div className="f05-card-grid">
      {items.map((item) => <article className="f05-card" key={item.id}>
        <div className="f05-card__top"><h3>{item.label}</h3><span className={`f05-status f05-status--${item.status}`}>{STATUS_LABELS[item.status]}</span></div>
        <textarea rows={3} value={item.notes} onChange={(e) => { updateIntegration(item.id, { notes: e.target.value }); refresh(); }}/>
        <div className="f05-actions">
          <button className="secondary" disabled={item.status === 'not_connected'} onClick={() => { updateIntegration(item.id, { status: 'not_connected' }); refresh(); }}>Marcar não conectado</button>
          <button disabled={item.status === 'pending'} onClick={() => { updateIntegration(item.id, { status: 'pending' }); refresh(); }}>Configuração pendente</button>
        </div>
        <small>O estado “Conectado” não pode ser forçado por esta tela; só deve vir da integração real.</small>
      </article>)}
    </div>
  </section>;
}
