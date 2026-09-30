import { useCallback, useEffect, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import type { AICredentialVaultPort } from './aiCredentialPort';
import { AIProvidersWorkspace } from './AIProvidersWorkspace';
import {
  listIntegrations,
  loadIntegrations,
  subscribeIntegrationConnections,
} from './repository';
import {
  connectAndLoadWhatsAppQr,
  controlWhatsApp,
  createWhatsAppSession,
  listWhatsAppSessions,
  type WhatsAppControlAction,
  type WhatsAppSession,
} from './whatsappControl';

const STATUS_LABELS = {
  not_connected: 'Não conectado',
  connecting: 'Conectando',
  connected: 'Conectado',
  degraded: 'Conexão degradada',
  reauth_required: 'Reconexão necessária',
  error: 'Erro',
  pending: 'Configuração pendente',
  future: 'Segunda fase',
} as const;

const WHATSAPP_PAIRING_VISIBILITY_MS = 10 * 60 * 1000;
const WHATSAPP_ACTIVE_STATUSES = new Set(['connected', 'open']);
const WHATSAPP_PAIRING_STATUSES = new Set(['connecting', 'pending', 'qr', 'qrcode', 'pairing']);

interface IntegrationsWorkspaceProps {
  credentialVault?: AICredentialVaultPort;
  canManage?: boolean;
  showAIProviders?: boolean;
}

function formatDate(value?: string) {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function statusTone(status: string) {
  if (status === 'connected' || status === 'open') return 'connected';
  if (status === 'connecting' || status === 'pending') return 'pending';
  if (status === 'future') return 'future';
  return 'not_connected';
}

function whatsappSessionTimestamp(session: WhatsAppSession) {
  const raw = session.lastHealthAt ?? session.lastEventAt ?? session.connectedAt ?? session.createdAt;
  if (!raw) return undefined;
  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function shouldShowWhatsAppSession(session: WhatsAppSession) {
  const status = session.status.toLowerCase();
  if (WHATSAPP_ACTIVE_STATUSES.has(status)) return true;
  if (!WHATSAPP_PAIRING_STATUSES.has(status)) return false;

  const timestamp = whatsappSessionTimestamp(session);
  return !timestamp || Date.now() - timestamp <= WHATSAPP_PAIRING_VISIBILITY_MS;
}

function visibleWhatsAppSessions(sessions: WhatsAppSession[]) {
  return sessions.filter(shouldShowWhatsAppSession);
}

function phaseTwoIntegration(id: string) {
  return ['meta', 'google_calendar', 'email', 'sms', 'analytics', 'tag_manager', 'api'].includes(id);
}

function integrationDescription(id: string) {
  if (id === 'whatsapp') {
    return 'Cadastre números, gere QR Code e acompanhe a saúde do conector WhatsApp Web.';
  }

  if (id === 'google_calendar') {
    return 'Calendário interno já salva reuniões e tarefas. A criação automática no Google Calendar e Google Meet fica para a segunda fase de OAuth.';
  }

  if (id === 'meta') {
    return 'Meta Ads, Lead Ads, Facebook e Instagram ficam mapeados para a segunda fase.';
  }

  if (id === 'email') {
    return 'Gmail e Google Workspace ficam preparados para campanhas e jornadas futuras.';
  }

  if (id === 'sms') {
    return 'Gateway de SMS pendente de definição e ativação na segunda fase.';
  }

  if (id === 'analytics') {
    return 'Google Analytics será conectado depois para mensuração avançada.';
  }

  if (id === 'tag_manager') {
    return 'Google Tag Manager será conectado depois para pixels e eventos externos.';
  }

  return 'Integração mapeada para uma etapa posterior.';
}

export function IntegrationsWorkspace({ credentialVault, canManage = false, showAIProviders = true }: IntegrationsWorkspaceProps) {
  const [items, setItems] = useState(() => listIntegrations());
  const [loadError, setLoadError] = useState('');
  const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([]);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappQr, setWhatsappQr] = useState('');
  const [whatsappBusy, setWhatsappBusy] = useState('');

  const refresh = useCallback(async () => {
    try {
      setItems(await loadIntegrations());
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível consultar o estado das integrações.');
    }
  }, []);

  const refreshWhatsApp = useCallback(async () => {
    try {
      setWhatsappSessions(visibleWhatsAppSessions(await listWhatsAppSessions()));
      setWhatsappMessage('');
    } catch (error) {
      setWhatsappSessions([]);
      setWhatsappMessage(error instanceof Error ? error.message : 'Não foi possível consultar o conector WhatsApp.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshWhatsApp();
    return subscribeIntegrationConnections(() => {
      void refresh();
      void refreshWhatsApp();
    });
  }, [refresh, refreshWhatsApp]);

  useF05StorageListener(() => {
    void refresh();
    void refreshWhatsApp();
  });

  async function runWhatsAppAction(action: WhatsAppControlAction, sessionId?: string) {
    if (!canManage || whatsappBusy) return;
    setWhatsappBusy(`${action}:${sessionId ?? 'new'}`);
    setWhatsappMessage('');
    setWhatsappQr('');

    try {
      if (action === 'create') {
        const session = await createWhatsAppSession();
        setWhatsappMessage('Número criado. Gere o QR Code para parear o WhatsApp.');
        setWhatsappSessions((current) => visibleWhatsAppSessions([{ ...session, createdAt: new Date().toISOString() }, ...current.filter((item) => item.sessionId !== session.sessionId)]));
      } else if (action === 'connect') {
        const svg = await connectAndLoadWhatsAppQr(sessionId);
        setWhatsappQr(svg);
        setWhatsappMessage('QR Code gerado. Escaneie com o WhatsApp do número que será conectado.');
      } else {
        await controlWhatsApp(action, sessionId);
        setWhatsappMessage(action === 'disconnect' ? 'Número desconectado.' : 'Ação enviada ao conector WhatsApp.');
        if (action === 'disconnect' && sessionId) {
          setWhatsappSessions((current) => current.filter((item) => item.sessionId !== sessionId));
        }
      }

      await refreshWhatsApp();
      await refresh();
    } catch (error) {
      setWhatsappMessage(error instanceof Error ? error.message : 'Não foi possível concluir a ação no WhatsApp.');
    } finally {
      setWhatsappBusy('');
    }
  }

  const externalItems = items.filter((item) => item.id !== 'ai');

  return <section className="f05-module">
    <header className="f05-module__header">
      <div>
        <span className="f05-kicker">Integrações</span>
        <h2>Conexões externas e provedores</h2>
        <p>WhatsApp pode ser operado agora. Google, Meta e canais externos ficam identificados como segunda fase quando dependem de OAuth ou contrato externo.</p>
      </div>
    </header>

    {showAIProviders ? <AIProvidersWorkspace credentialVault={credentialVault} canManage={canManage} /> : null}

    {showAIProviders ? <div className="f05-divider" /> : null}
    <div className="f05-subheader">
      <div>
        <span className="f05-kicker">Demais integrações</span>
        <h3>Operação e status</h3>
        <p>Use os botões quando a integração já estiver funcional. O que depende de OAuth externo aparece marcado para segunda fase.</p>
      </div>
    </div>

    {loadError && <div className="f05-empty" role="alert">{loadError}</div>}

    <div className="f05-card-grid">
      {externalItems.map((item) => {
        const phaseTwo = phaseTwoIntegration(item.id);
        const displayStatus = phaseTwo ? 'future' : item.status;

        return <article className="f05-card f05-integration-card" key={item.id}>
          <div className="f05-card__top">
            <div>
              <h3>{item.label}</h3>
              {phaseTwo ? <span className="f05-phase-badge">2ª fase</span> : null}
            </div>
            <span className={`f05-status f05-status--${displayStatus}`}>{STATUS_LABELS[displayStatus]}</span>
          </div>

          <div className="f05-integration-note">
            <strong>Resumo</strong>
            <p>{item.notes}</p>
            <small>{integrationDescription(item.id)}</small>
          </div>

          {item.id === 'whatsapp' ? (
            <div className="f05-whatsapp-panel">
              <div className="f05-integration-actions">
                <button type="button" onClick={() => void runWhatsAppAction('create')} disabled={!canManage || Boolean(whatsappBusy)}>
                  Adicionar número
                </button>
                <button className="secondary" type="button" onClick={() => void refreshWhatsApp()} disabled={Boolean(whatsappBusy)}>
                  Atualizar status
                </button>
              </div>

              {whatsappMessage ? <div className="f05-inline-message" role="status">{whatsappMessage}</div> : null}
              {whatsappQr ? (
                <div className="f05-qr-box">
                  <img src={`data:image/svg+xml;utf8,${encodeURIComponent(whatsappQr)}`} alt="QR Code para parear WhatsApp" />
                </div>
              ) : null}

              <dl className="f05-meta-list">
                <div><dt>Conta principal</dt><dd>{item.accountLabel ?? item.externalAccountId ?? 'Nenhuma conta conectada'}</dd></div>
                <div><dt>Último health</dt><dd>{formatDate(item.lastHealthAt)}</dd></div>
                <div><dt>Último evento</dt><dd>{formatDate(item.lastEventAt)}</dd></div>
                <div><dt>Último erro</dt><dd>{item.lastErrorCode ? `${item.lastErrorCode} em ${formatDate(item.lastErrorAt)}` : 'Sem erro registrado'}</dd></div>
              </dl>

              <div className="f05-whatsapp-sessions">
                {whatsappSessions.length ? whatsappSessions.map((session) => {
                  const busy = whatsappBusy.endsWith(`:${session.sessionId}`);
                  return <div className="f05-whatsapp-session" key={session.sessionId}>
                    <div>
                      <strong>{session.accountLabel || session.phoneNumber || 'Número aguardando pareamento'}</strong>
                      <span>{session.sessionId}</span>
                    </div>
                    <span className={`f05-status f05-status--${statusTone(session.status)}`}>{session.status}</span>
                    <div className="f05-whatsapp-session__actions">
                      <button className="secondary" type="button" onClick={() => void runWhatsAppAction('connect', session.sessionId)} disabled={!canManage || busy || Boolean(whatsappBusy)}>
                        QR Code
                      </button>
                      <button className="secondary" type="button" onClick={() => void runWhatsAppAction('reconnect', session.sessionId)} disabled={!canManage || busy || Boolean(whatsappBusy)}>
                        Reconectar
                      </button>
                      <button className="danger" type="button" onClick={() => void runWhatsAppAction('disconnect', session.sessionId)} disabled={!canManage || busy || Boolean(whatsappBusy)}>
                        Desconectar
                      </button>
                    </div>
                  </div>;
                }) : <div className="f05-empty">Nenhum número ativo ou aguardando pareamento agora. Clique em “Adicionar número” para iniciar uma nova conexão.</div>}
              </div>
            </div>
          ) : null}

          {item.id === 'google_calendar' ? (
            <div className="f05-integration-actions">
              <a className="f05-action-link" href="/interno/calendario">Abrir calendário interno</a>
              <span className="f05-phase-badge">OAuth Google em 2ª fase</span>
            </div>
          ) : null}
        </article>;
      })}
    </div>
  </section>;
}
