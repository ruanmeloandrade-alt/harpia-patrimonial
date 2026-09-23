import { useCallback, useEffect, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import type { AICredentialVaultPort } from './aiCredentialPort';
import {
  listIntegrations,
  loadIntegrations,
  subscribeIntegrationConnections,
  updateIntegrationNotes,
} from './repository';
import {
  connectAndLoadWhatsAppQr,
  controlWhatsApp,
} from './whatsappControl';
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

export function IntegrationsWorkspace({ credentialVault, canManage = false }: IntegrationsWorkspaceProps) {
  const [items, setItems] = useState(() => listIntegrations());
  const [loadError, setLoadError] = useState('');
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappFeedback, setWhatsappFeedback] = useState('');
  const [whatsappQrSvg, setWhatsappQrSvg] = useState('');

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

  const runWhatsAppAction = useCallback(async (
    action: 'connect' | 'qr' | 'reconnect' | 'disconnect',
  ) => {
    if (!canManage) return;

    if (action === 'disconnect' && !window.confirm('Desconectar o WhatsApp Web desta operação?')) {
      return;
    }

    setWhatsappBusy(true);
    setWhatsappError('');
    setWhatsappFeedback('');

    try {
      if (action === 'connect') {
        const svg = await connectAndLoadWhatsAppQr();
        setWhatsappQrSvg(svg);
        setWhatsappFeedback('Conexão iniciada. Escaneie o QR com o WhatsApp do número que será usado na Inbox.');
      } else if (action === 'qr') {
        const result = await controlWhatsApp('qr');
        if (!result.svg) throw new Error('QR ainda não está disponível.');
        setWhatsappQrSvg(result.svg);
        setWhatsappFeedback('QR atualizado.');
      } else {
        await controlWhatsApp(action);
        if (action === 'disconnect') {
          setWhatsappQrSvg('');
          setWhatsappFeedback('WhatsApp desconectado.');
        } else {
          setWhatsappFeedback('Reconexão solicitada.');
        }
      }

      await refresh();
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : 'Não foi possível concluir a ação do WhatsApp.');
    } finally {
      setWhatsappBusy(false);
    }
  }, [canManage, refresh]);

  const externalItems = items.filter((item) => item.id !== 'ai');

  return <section className="f05-module">
    <header className="f05-module__header">
      <div>
        <span className="f05-kicker">Integrações</span>
        <h2>Conexões externas e provedores</h2>
        <p>WhatsApp e Meta exibem o estado registrado pelo backend. A interface não pode forçar uma conexão como ativa.</p>
      </div>
    </header>

    <AIProvidersWorkspace credentialVault={credentialVault} canManage={canManage} />

    <div className="f05-divider" />
    <div className="f05-subheader">
      <div>
        <span className="f05-kicker">Demais integrações</span>
        <h3>Saúde das conexões</h3>
        <p>Conexões operacionais mostram health, último evento e último erro quando essas informações existem.</p>
      </div>
    </div>

    {loadError && <div className="f05-empty" role="alert">{loadError}</div>}
    {whatsappError && <div className="f05-empty" role="alert">{whatsappError}</div>}
    {whatsappFeedback && <div className="f05-empty" role="status">{whatsappFeedback}</div>}

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

        {(item.id === 'whatsapp' || item.id === 'meta') && (
          <dl className="f05-meta-list">
            <div><dt>Conta</dt><dd>{item.accountLabel ?? item.externalAccountId ?? 'Nenhuma conta conectada'}</dd></div>
            <div><dt>Último health</dt><dd>{formatDate(item.lastHealthAt)}</dd></div>
            <div><dt>Último evento</dt><dd>{formatDate(item.lastEventAt)}</dd></div>
            <div><dt>Último erro</dt><dd>{item.lastErrorCode ? `${item.lastErrorCode} em ${formatDate(item.lastErrorAt)}` : 'Sem erro registrado'}</dd></div>
          </dl>
        )}

        {item.id === 'whatsapp' && canManage && (
          <div className="f05-actions">
            {(item.status === 'not_connected' || item.status === 'reauth_required' || item.status === 'error') && (
              <button
                type="button"
                disabled={whatsappBusy}
                onClick={() => { void runWhatsAppAction('connect'); }}
              >
                {item.status === 'reauth_required' ? 'Gerar novo QR' : 'Conectar WhatsApp'}
              </button>
            )}

            {item.status === 'connecting' && (
              <button
                type="button"
                disabled={whatsappBusy}
                onClick={() => { void runWhatsAppAction('qr'); }}
              >
                Exibir QR
              </button>
            )}

            {(item.status === 'connected' || item.status === 'degraded') && (
              <>
                <button
                  type="button"
                  disabled={whatsappBusy}
                  onClick={() => { void runWhatsAppAction('reconnect'); }}
                >
                  Reconectar
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={whatsappBusy}
                  onClick={() => { void runWhatsAppAction('disconnect'); }}
                >
                  Desconectar
                </button>
              </>
            )}
          </div>
        )}

        <small>
          {item.id === 'whatsapp'
            ? 'O status conectado só aparece depois da confirmação real do conector.'
            : item.id === 'meta'
              ? 'A autorização, webhook e seleção de ativos serão ativados pela integração Meta.'
              : 'Integração ainda planejada para uma etapa posterior.'}
        </small>
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
              <h3>Conectar WhatsApp Web</h3>
              <p>Abra o WhatsApp no celular, acesse aparelhos conectados e escaneie o código.</p>
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
              disabled={whatsappBusy}
              onClick={() => { void runWhatsAppAction('qr'); }}
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
