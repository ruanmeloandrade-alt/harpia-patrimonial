import { useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import type { AICredentialVaultPort } from './aiCredentialPort';
import { listIntegrations, updateIntegration } from './repository';
import { AIProvidersWorkspace } from './AIProvidersWorkspace';

const STATUS_LABELS = {
  not_connected: 'Não conectado',
  pending: 'Configuração pendente',
  connected: 'Conectado',
} as const;

interface IntegrationsWorkspaceProps {
  credentialVault?: AICredentialVaultPort;
  canManage?: boolean;
}

export function IntegrationsWorkspace({ credentialVault, canManage = false }: IntegrationsWorkspaceProps) {
  const [items, setItems] = useState(() => listIntegrations());
  const refresh = () => setItems(listIntegrations());
  useF05StorageListener(refresh);
  const externalItems = items.filter((item) => item.id !== 'ai');

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">Integrações</span><h2>Conexões externas e provedores</h2><p>IA é configurável por cliente. WhatsApp e Meta permanecem sem conexão real até a fase final.</p></div></header>

    <AIProvidersWorkspace credentialVault={credentialVault} canManage={canManage} />

    <div className="f05-divider" />
    <div className="f05-subheader"><div><span className="f05-kicker">Demais integrações</span><h3>Estrutura preparatória</h3><p>Sem credencial real nesta fase para WhatsApp e Meta.</p></div></div>
    <div className="f05-card-grid">
      {externalItems.map((item) => <article className="f05-card" key={item.id}>
        <div className="f05-card__top"><h3>{item.label}</h3><span className={`f05-status f05-status--${item.status}`}>{STATUS_LABELS[item.status]}</span></div>
        <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
          <textarea rows={3} value={item.notes} onChange={(e) => { updateIntegration(item.id, { notes: e.target.value }); refresh(); }}/>
          <div className="f05-actions">
            <button className="secondary" disabled={item.status === 'not_connected'} onClick={() => { updateIntegration(item.id, { status: 'not_connected' }); refresh(); }}>Marcar não conectado</button>
            <button disabled={item.status === 'pending'} onClick={() => { updateIntegration(item.id, { status: 'pending' }); refresh(); }}>Configuração pendente</button>
          </div>
        </fieldset>
        <small>O estado “Conectado” não pode ser forçado por esta tela; só deve vir da integração real.</small>
      </article>)}
    </div>
  </section>;
}
