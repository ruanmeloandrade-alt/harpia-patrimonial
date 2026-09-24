import { useCallback, useEffect, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { listInternalUsers, type InternalUserRow } from '../users/user-service';
import {
  listIntegrations,
  loadIntegrations,
  subscribeIntegrationConnections,
  updateIntegrationNotes,
} from './repository';
import {
  connectAndLoadWhatsAppQr,
  controlWhatsApp,
  createWhatsAppSession,
  listWhatsAppSessions,
  type WhatsAppSession,
} from './whatsappControl';
import {
  assignWhatsAppResponsible,
  listWhatsAppChannelAccounts,
  type WhatsAppChannelAccount,
} from './whatsappAccounts';
import { AIKeySetup } from './AIKeySetup';

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
  canManage?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatPhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : 'Aguardando pareamento';
}

export function IntegrationsWorkspace({ canManage = false }: IntegrationsWorkspaceProps) {
  const [items, setItems] = useState(() => listIntegrations());
  const [loadError, setLoadError] = useState('');
  const [whatsappBusy, setWhatsappBusy] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappFeedback, setWhatsappFeedback] = useState('');
  const [whatsappQrSvg, setWhatsappQrSvg] = useState('');
  const [qrSessionId, setQrSessionId] = useState('');
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [accounts, setAccounts] = useState<WhatsAppChannelAccount[]>([]);
  const [users, setUsers] = useState<InternalUserRow[]>([]);

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
      const [nextSessions, nextAccounts, nextUsers] = await Promise.all([
        listWhatsAppSessions(),
        listWhatsAppChannelAccounts(),
        listInternalUsers().catch(() => []),
      ]);
      setSessions(nextSessions);
      setAccounts(nextAccounts);
      setUsers(nextUsers);
      setWhatsappError('');
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : 'Não foi possível carregar as contas WhatsApp.');
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

  useF05StorageListener(() => { void refresh(); });

  const showQr = useCallback(async (sessionId: string, ensureConnected = false) => {
    setWhatsappBusy(sessionId);
    setWhatsappError('');
    setWhatsappFeedback('');

    try {
      const svg = ensureConnected
        ? await connectAndLoadWhatsAppQr(sessionId)
        : (await controlWhatsApp('qr', sessionId)).svg;

      if (!svg) throw new Error('QR ainda não está disponível.');
      setQrSessionId(sessionId);
      setWhatsappQrSvg(svg);
      setWhatsappFeedback('Escaneie o QR no WhatsApp em Aparelhos conectados.');
      await refreshWhatsApp();
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : 'Não foi possível gerar o QR do WhatsApp.');
    } finally {
      setWhatsappBusy('');
    }
  }, [refreshWhatsApp]);

  const addWhatsApp = useCallback(async () => {
    if (!canManage) return;
    setWhatsappBusy('new');
    setWhatsappError('');
    setWhatsappFeedback('');

    try {
      const session = await createWhatsAppSession();
      await refreshWhatsApp();
      const svg = await connectAndLoadWhatsAppQr(session.sessionId);
      setQrSessionId(session.sessionId);
      setWhatsappQrSvg(svg);
      setWhatsappFeedback('Nova sessão criada. Escaneie o QR para conectar o próximo WhatsApp.');
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : 'Não foi possível adicionar outro WhatsApp.');
    } finally {
      setWhatsappBusy('');
    }
  }, [canManage, refreshWhatsApp]);

  const runSessionAction = useCallback(async (
    action: 'reconnect' | 'disconnect',
    sessionId: string,
  ) => {
    if (!canManage) return;
    if (action === 'disconnect' && !window.confirm('Desconectar somente este WhatsApp?')) return;

    setWhatsappBusy(sessionId);
    setWhatsappError('');
    setWhatsappFeedback('');

    try {
      await controlWhatsApp(action, sessionId);
      setWhatsappFeedback(action === 'disconnect'
        ? 'WhatsApp desconectado. As outras contas permanecem ativas.'
        : 'Reconexão solicitada para esta conta.');
      if (action === 'disconnect' && qrSessionId === sessionId) {
        setWhatsappQrSvg('');
        setQrSessionId('');
      }
      await refreshWhatsApp();
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : 'Não foi possível concluir a ação do WhatsApp.');
    } finally {
      setWhatsappBusy('');
    }
  }, [canManage, qrSessionId, refreshWhatsApp]);

  const changeResponsible = useCallback(async (accountId: string, userId: string) => {
    if (!canManage) return;
    try {
      await assignWhatsAppResponsible(accountId, userId || undefined);
      setWhatsappFeedback('Responsável da conta atualizado.');
      await refreshWhatsApp();
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : 'Não foi possível atribuir o responsável.');
    }
  }, [canManage, refreshWhatsApp]);

  const externalItems = items.filter((item) => item.id !== 'ai' && item.id !== 'whatsapp');

  return <section className="f05-module">
    <header className="f05-module__header">
      <div>
        <span className="f05-kicker">Integrações</span>
        <h2>Conexões da operação</h2>
        <p>Gerencie IA, quantos números de WhatsApp forem necessários e as demais integrações da plataforma.</p>
      </div>
    </header>

    <AIKeySetup canManage={canManage} />

    <div className="f05-divider" />

    <div className="f05-subheader">
      <div>
        <span className="f05-kicker">WhatsApp</span>
        <h3>Contas conectadas</h3>
        <p>Cada número possui sessão independente e pode ter um funcionário responsável.</p>
      </div>
      {canManage && (
        <button type="button" disabled={whatsappBusy === 'new'} onClick={() => { void addWhatsApp(); }}>
          {whatsappBusy === 'new' ? 'Criando...' : '+ Adicionar WhatsApp'}
        </button>
      )}
    </div>

    {whatsappError && <div className="f05-empty" role="alert">{whatsappError}</div>}
    {whatsappFeedback && <div className="f05-inline-message" role="status">{whatsappFeedback}</div>}

    <div className="f05-card-grid">
      {sessions.length === 0 ? (
        <article className="f05-card">
          <div className="f05-empty">Nenhuma conta WhatsApp configurada.</div>
          {canManage && <button type="button" onClick={() => { void addWhatsApp(); }}>Adicionar primeiro WhatsApp</button>}
        </article>
      ) : sessions.map((session) => {
        const account = accounts.find((item) => item.sessionId === session.sessionId);
        const status = session.status as keyof typeof STATUS_LABELS;
        const busy = whatsappBusy === session.sessionId;

        return <article className="f05-card" key={session.sessionId}>
          <div className="f05-card__top">
            <div>
              <h3>{account?.displayName || session.accountLabel || 'WhatsApp'}</h3>
              <small>{formatPhone(account?.phoneNumber || session.phoneNumber || session.accountLabel)}</small>
            </div>
            <span className={`f05-status f05-status--${status}`}>
              {STATUS_LABELS[status] || session.status}
            </span>
          </div>

          <dl className="f05-meta-list">
            <div><dt>Sessão</dt><dd>{session.sessionId}</dd></div>
            <div><dt>Último health</dt><dd>{formatDate(session.lastHealthAt || account?.lastHeartbeatAt)}</dd></div>
            <div><dt>Último erro</dt><dd>{session.lastErrorCode ? `${session.lastErrorCode} em ${formatDate(session.lastErrorAt)}` : 'Sem erro registrado'}</dd></div>
          </dl>

          <label className="f05-field">
            Responsável
            <select
              value={account?.responsibleUserId || ''}
              disabled={!canManage || !account}
              onChange={(event) => {
                if (account) void changeResponsible(account.id, event.target.value);
              }}
            >
              <option value="">Sem responsável definido</option>
              {users.filter((user) => user.is_active).map((user) => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </label>

          {canManage && (
            <div className="f05-actions">
              {(session.status === 'not_connected' || session.status === 'reauth_required' || session.status === 'error') && (
                <button type="button" disabled={busy} onClick={() => { void showQr(session.sessionId, true); }}>
                  Conectar
                </button>
              )}
              {session.status === 'connecting' && (
                <button type="button" disabled={busy} onClick={() => { void showQr(session.sessionId); }}>
                  Exibir QR
                </button>
              )}
              {(session.status === 'connected' || session.status === 'degraded') && (
                <>
                  <button type="button" disabled={busy} onClick={() => { void runSessionAction('reconnect', session.sessionId); }}>
                    Reconectar
                  </button>
                  <button type="button" className="secondary" disabled={busy} onClick={() => { void runSessionAction('disconnect', session.sessionId); }}>
                    Desconectar
                  </button>
                </>
              )}
            </div>
          )}
        </article>;
      })}
    </div>

    <div className="f05-divider" />
    <div className="f05-subheader">
      <div>
        <span className="f05-kicker">Outras integrações</span>
        <h3>Conexões adicionais</h3>
      </div>
    </div>

    {loadError && <div className="f05-empty" role="alert">{loadError}</div>}

    <div className="f05-card-grid">
      {externalItems.map((item) => <article className="f05-card" key={item.id}>
        <div className="f05-card__top">
          <h3>{item.label}</h3>
          <span className={`f05-status f05-status--${item.status}`}>{STATUS_LABELS[item.status]}</span>
        </div>

        <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
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

        {(item.id === 'meta') && (
          <dl className="f05-meta-list">
            <div><dt>Conta</dt><dd>{item.accountLabel ?? item.externalAccountId ?? 'Nenhuma conta conectada'}</dd></div>
            <div><dt>Último health</dt><dd>{formatDate(item.lastHealthAt)}</dd></div>
            <div><dt>Último evento</dt><dd>{formatDate(item.lastEventAt)}</dd></div>
            <div><dt>Último erro</dt><dd>{item.lastErrorCode ? `${item.lastErrorCode} em ${formatDate(item.lastErrorAt)}` : 'Sem erro registrado'}</dd></div>
          </dl>
        )}
      </article>)}
    </div>

    {whatsappQrSvg && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Conectar WhatsApp Web"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'rgba(10, 18, 16, 0.72)',
        }}
        onClick={() => setWhatsappQrSvg('')}
      >
        <div
          style={{
            width: 'min(420px, 100%)',
            borderRadius: 18,
            padding: 24,
            background: '#fff',
            color: '#13201c',
            boxShadow: '0 24px 70px rgba(0,0,0,.28)',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="f05-card__top">
            <div>
              <h3>Conectar WhatsApp</h3>
              <p>Escaneie o código em WhatsApp → Aparelhos conectados.</p>
            </div>
            <button type="button" className="secondary" onClick={() => setWhatsappQrSvg('')}>Fechar</button>
          </div>

          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(whatsappQrSvg)}`}
            alt="QR para conectar o WhatsApp Web"
            style={{
              display: 'block',
              width: 'min(320px, 100%)',
              aspectRatio: '1',
              margin: '18px auto',
            }}
          />

          <div className="f05-actions">
            <button
              type="button"
              disabled={whatsappBusy === qrSessionId}
              onClick={() => { void showQr(qrSessionId); }}
            >
              Atualizar QR
            </button>
            <button type="button" className="secondary" onClick={() => setWhatsappQrSvg('')}>Concluir</button>
          </div>
        </div>
      </div>
    )}
  </section>;
}
