import { FormEvent, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { listAIProviderProfiles } from './aiProviderRepository';
import { getAIProviderCatalogItem } from './aiProviderTypes';
import { configureAIKey } from './aiAutoConfigure';

export function AIKeySetup({ canManage = false }: { canManage?: boolean }) {
  const [profiles, setProfiles] = useState(() => listAIProviderProfiles());
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  useF05StorageListener(() => setProfiles(listAIProviderProfiles()));

  const profile = profiles.find((item) => item.id === 'ai-provider-default')
    ?? profiles.find((item) => item.status === 'ready')
    ?? profiles[0];
  const meta = profile ? getAIProviderCatalogItem(profile.provider) : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !apiKey.trim()) return;

    setBusy(true);
    setFeedback('');
    try {
      const result = await configureAIKey(apiKey);
      setApiKey('');
      setProfiles(listAIProviderProfiles());
      setFeedback(`IA conectada: ${result.providerLabel || 'provedor identificado'} · ${result.model || 'modelo disponível'}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível configurar a IA.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="f05-card" style={{ marginBottom: 18 }}>
      <div className="f05-card__top">
        <div>
          <span className="f05-kicker">Agente IA</span>
          <h3>Chave de IA</h3>
        </div>
        <span className={`f05-status f05-status--${profile?.status === 'ready' ? 'connected' : 'not_connected'}`}>
          {profile?.status === 'ready' ? 'Conectada' : 'Não configurada'}
        </span>
      </div>

      <p>
        Cole a chave. A Hárpia identifica automaticamente OpenAI, Claude/Anthropic ou Gemini,
        valida a credencial e escolhe um modelo disponível.
      </p>

      {profile?.status === 'ready' && (
        <dl className="f05-meta-list">
          <div><dt>Provedor</dt><dd>{meta?.label ?? profile.provider}</dd></div>
          <div><dt>Modelo</dt><dd>{profile.model || 'Selecionado automaticamente'}</dd></div>
          <div><dt>Credencial</dt><dd>Protegida no cofre seguro</dd></div>
        </dl>
      )}

      <form className="f05-create-row" onSubmit={submit}>
        <input
          type="password"
          autoComplete="new-password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={profile?.status === 'ready' ? 'Cole uma nova chave para substituir' : 'Cole a chave de IA'}
          disabled={!canManage || busy}
        />
        <button type="submit" disabled={!canManage || busy || !apiKey.trim()}>
          {busy ? 'Validando...' : profile?.status === 'ready' ? 'Atualizar chave' : 'Conectar IA'}
        </button>
      </form>

      {!canManage && <small>Você precisa da permissão de gerenciar integrações para alterar esta chave.</small>}
      {feedback && <div className="f05-inline-message" role="status">{feedback}</div>}
    </section>
  );
}
