import { useCallback, useEffect, useState } from 'react';
import { formatDateTime } from '../settings/regional-runtime';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import type { AICredentialVaultPort } from './aiCredentialPort';
import {
  listIntegrations,
  loadIntegrations,
  subscribeIntegrationConnections,
  updateIntegrationNotes,
} from './repository';
import { AIProvidersWorkspace } from './AIProvidersWorkspace';

const STATUS_LABELS = {
  not_connected: 'Não conectado',
  connecting: 'Conectando',
  connected: 'Conectado',
  degraded: 'Conexão degradada',
  reauth_required: 'Reconexão necessária',
  error: 'Erro',
  pending: 'Configuração pendente',
  future: 'Planejado para depois',
} as const;

interface IntegrationsWorkspaceProps {
  credentialVault?: AICredentialVaultPort;
  canManage?: boolean;
  showAIProviders?: boolean;
}

function formatDate(value?: string) {
  return value ? formatDateTime(value) : '—';
}

export function IntegrationsWorkspace({ credentialVault, canManage = false, showAIProviders = true }: IntegrationsWorkspaceProps) {
  const [items, setItems] = useState(() => listIntegrations());
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setItems(await loadIntegrations());
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível consultar o estado das integrações.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeIntegrationConnections(() => { void refresh(); });
  }, [refresh]);

  useF05StorageListener(() => { void refresh(); });

  const externalItems = items.filter((item) => item.id !== 'ai');

  return <section className="f05-module">
    <header className="f05-module__header">
      <div>
        <span className="f05-kicker">Integrações</span>
        <h2>Conexões externas e provedores</h2>
        <p>WhatsApp permanece na operação atual. Meta e canais de marketing ficam visíveis, mas reservados para a segunda fase.</p>
      </div>
    </header>

    {showAIProviders ? <AIProvidersWorkspace credentialVault={credentialVault} canManage={canManage} /> : null}

    {showAIProviders ? <div className="f05-divider" /> : null}
    <div className="f05-subheader">
      <div>
        <span className="f05-kicker">Demais integrações</span>
        <h3>Saúde das conexões</h3>
        <p>Conexões operacionais mostram health, último evento e último erro quando essas informações existem.</p>
      </div>
    </div>

    {loadError && <div className="f05-empty" role="alert">{loadError}</div>}

    <div className="f05-card-grid">
      {externalItems.map((item) => {
        const phaseTwo = ['meta', 'email', 'sms', 'analytics', 'tag_manager'].includes(item.id);
        const displayStatus = phaseTwo ? 'future' : item.status;
        return <article className="f05-card" key={item.id}>
        <div className="f05-card__top">
          <div>
            <h3>{item.label}</h3>
            {phaseTwo ? <span className="f05-phase-badge">Segunda fase</span> : null}
          </div>
          <span className={`f05-status f05-status--${displayStatus}`}>{STATUS_LABELS[displayStatus]}</span>
        </div>

        <fieldset className="f05-readonly-fieldset" disabled={!canManage || phaseTwo}>
          <textarea
            rows={3}
            value={item.notes}
            onChange={(event) => {
              updateIntegrationNotes(item.id, event.target.value);
              setItems(listIntegrations());
              void refresh();
            }}
          />
        </fieldset>

        {item.id === 'whatsapp' && (
          <dl className="f05-meta-list">
            <div><dt>Conta</dt><dd>{item.accountLabel ?? item.externalAccountId ?? 'Nenhuma conta conectada'}</dd></div>
            <div><dt>Último health</dt><dd>{formatDate(item.lastHealthAt)}</dd></div>
            <div><dt>Último evento</dt><dd>{formatDate(item.lastEventAt)}</dd></div>
            <div><dt>Último erro</dt><dd>{item.lastErrorCode ? `${item.lastErrorCode} em ${formatDate(item.lastErrorAt)}` : 'Sem erro registrado'}</dd></div>
          </dl>
        )}

        <small>
          {item.id === 'whatsapp'
            ? 'O pareamento por QR e a reconexão serão ativados pelo conector do WhatsApp Web.'
            : item.id === 'meta'
              ? 'Meta Ads, Lead Ads, Facebook e Instagram ficam preparados visualmente e serão ativados somente na segunda fase.'
              : item.id === 'email'
                ? 'Gmail e Google Workspace ficam preparados para campanhas e jornadas da segunda fase.'
                : item.id === 'sms'
                  ? 'O gateway de SMS será definido e conectado somente na segunda fase.'
                  : item.id === 'analytics'
                    ? 'Google Analytics fica visível agora e será conectado na segunda fase.'
                    : item.id === 'tag_manager'
                      ? 'Google Tag Manager fica visível agora e será conectado na segunda fase.'
                      : 'Integração ainda planejada para uma etapa posterior.'}
        </small>
      </article>;
      })}
    </div>
  </section>;
}
