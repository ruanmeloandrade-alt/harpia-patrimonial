import { useMemo, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { AI_PROVIDER_CATALOG, getAIProviderCatalogItem, type AIProviderKind } from './aiProviderTypes';
import {
  createAIProviderProfile,
  deleteAIProviderProfile,
  listAIProviderProfiles,
  setAIProviderProfileStatus,
  updateAIProviderProfile,
  updateAIProviderProfileConfirmed,
  validateAIProviderProfile,
} from './aiProviderRepository';
import { unconfiguredAICredentialVault, type AICredentialVaultPort } from './aiCredentialPort';

interface AIProvidersWorkspaceProps {
  credentialVault?: AICredentialVaultPort;
  canManage?: boolean;
}

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function AIProvidersWorkspace({ credentialVault = unconfiguredAICredentialVault, canManage = false }: AIProvidersWorkspaceProps) {
  const [profiles, setProfiles] = useState(() => listAIProviderProfiles());
  const [selectedId, setSelectedId] = useState<string | null>(() => profiles[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<AIProviderKind>('openai');
  const [apiKey, setApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');

  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? null, [profiles, selectedId]);
  const selectedMeta = selected ? getAIProviderCatalogItem(selected.provider) : undefined;
  const issues = selected ? validateAIProviderProfile(selected) : [];

  const refresh = (focusId?: string) => {
    const next = listAIProviderProfiles();
    setProfiles(next);
    if (focusId) setSelectedId(focusId);
    else setSelectedId((current) => current && next.some((profile) => profile.id === current) ? current : next[0]?.id ?? null);
  };
  useF05StorageListener(() => refresh());

  const create = () => {
    if (!newName.trim() || !canManage) return;
    const profile = createAIProviderProfile({ name: newName, provider: newProvider });
    setNewName('');
    refresh(profile.id);
  };

  const saveKey = async () => {
    if (!selected || !apiKey.trim() || !canManage) return;
    setCredentialMessage('');
    const profileBefore = selected;
    const result = await credentialVault.saveApiKey({ profileId: selected.id, apiKey: apiKey.trim() });
    setApiKey('');
    if (result.status !== 'stored') {
      setCredentialMessage(result.reason);
      return;
    }

    // Substituição de uma chave já configurada preserva o mesmo secretRef no Vault.
    // Nesse caso o perfil já aponta para a referência correta e não precisa de segunda escrita.
    if (profileBefore.apiKeyConfigured && profileBefore.secretRef === result.secretRef) {
      setCredentialMessage('Chave atualizada com segurança.');
      refresh(selected.id);
      return;
    }

    try {
      await updateAIProviderProfileConfirmed(selected.id, { apiKeyConfigured: true, secretRef: result.secretRef });
      setCredentialMessage('Chave armazenada com segurança e perfil sincronizado.');
      refresh(selected.id);
    } catch (error) {
      // Primeira configuração: se o perfil não persistiu, removemos o segredo recém-criado
      // para não deixar credencial órfã sem referência canônica no estado compartilhado.
      const cleanup = await credentialVault.removeApiKey({ profileId: selected.id, secretRef: result.secretRef });
      const base = errorMessage(error, 'O perfil não confirmou a persistência da credencial.');
      setCredentialMessage(cleanup.status === 'stored'
        ? `${base} A credencial recém-criada foi revertida do cofre.`
        : `${base} A limpeza automática do cofre também falhou; revise o perfil antes de tentar novamente.`);
      refresh(selected.id);
    }
  };

  const removeKey = async () => {
    if (!selected || !canManage) return;
    const profileBefore = selected;
    setCredentialMessage('');

    try {
      // Primeiro removemos a referência canônica do perfil e aguardamos o backend.
      // Só depois apagamos o segredo. Assim o produto nunca fica apontando para uma
      // credencial já removida por causa de falha de persistência do perfil.
      await updateAIProviderProfileConfirmed(selected.id, {
        apiKeyConfigured: false,
        secretRef: undefined,
        status: 'draft',
      });
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível atualizar o perfil antes de remover a chave.'));
      refresh(selected.id);
      return;
    }

    const result = await credentialVault.removeApiKey({ profileId: selected.id, secretRef: profileBefore.secretRef });
    if (result.status === 'stored') {
      setCredentialMessage('Chave removida e perfil sincronizado.');
      refresh(selected.id);
      return;
    }

    // Se o Vault não conseguiu remover, restauramos o perfil anterior para manter
    // a referência utilizável e permitir nova tentativa sem estado quebrado.
    try {
      await updateAIProviderProfileConfirmed(selected.id, {
        apiKeyConfigured: profileBefore.apiKeyConfigured,
        secretRef: profileBefore.secretRef,
        status: profileBefore.status,
      });
      setCredentialMessage(`${result.reason} O perfil anterior foi restaurado.`);
    } catch (restoreError) {
      setCredentialMessage(`${result.reason} Também não foi possível restaurar o perfil: ${errorMessage(restoreError, 'falha de restauração')}`);
    }
    refresh(selected.id);
  };

  return <div className="f05-ai-provider">
    <div className="f05-subheader">
      <div><span className="f05-kicker">Provedores de IA</span><h3>Modelo e credencial por cliente</h3><p>Escolha o provedor, informe o modelo e conecte a chave API. Nenhuma chave fica gravada no navegador.</p></div>
      <span className="f05-count">{profiles.length}</span>
    </div>
    {!canManage ? <div className="f05-readonly-note">Modo leitura: somente usuários com integrations.manage podem alterar provedor ou credencial.</div> : null}

    <fieldset className="f05-readonly-fieldset" disabled={!canManage}><div className="f05-create-row">
      <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome do perfil, ex.: IA Comercial" />
      <select value={newProvider} onChange={(event) => setNewProvider(event.target.value as AIProviderKind)}>
        {AI_PROVIDER_CATALOG.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
      </select>
      <button disabled={!newName.trim()} onClick={create}>Criar perfil</button>
    </div></fieldset>

    <div className="f05-split">
      <aside className="f05-list">
        {profiles.length === 0 ? <div className="f05-empty">Nenhum provedor de IA configurado.</div> : profiles.map((profile) => {
          const meta = getAIProviderCatalogItem(profile.provider);
          return <button key={profile.id} className={`f05-list-item ${profile.id === selectedId ? 'is-active' : ''}`} onClick={() => { setSelectedId(profile.id); setCredentialMessage(''); }}>
            <strong>{profile.name}</strong><span>{meta?.label ?? profile.provider} · {profile.status}</span>
          </button>;
        })}
      </aside>

      <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>
        {!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um perfil de IA.</div> : <>
          <div className="f05-form-grid">
            <label>Nome do perfil<input value={selected.name} onChange={(event) => { updateAIProviderProfile(selected.id, { name: event.target.value }); refresh(selected.id); }} /></label>
            <label>Provedor<select value={selected.provider} onChange={(event) => { updateAIProviderProfile(selected.id, { provider: event.target.value as AIProviderKind, status: 'draft' }); refresh(selected.id); }}>
              {AI_PROVIDER_CATALOG.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
            </select></label>
          </div>

          <div className="f05-form-grid">
            <label>Modelo<input value={selected.model} onChange={(event) => { updateAIProviderProfile(selected.id, { model: event.target.value, status: 'draft' }); refresh(selected.id); }} placeholder={selectedMeta?.modelPlaceholder ?? 'Informe o modelo'} /></label>
            <label>Endpoint/base URL<input value={selected.baseUrl} onChange={(event) => { updateAIProviderProfile(selected.id, { baseUrl: event.target.value, status: 'draft' }); refresh(selected.id); }} placeholder="Opcional, exceto provedor customizado" /></label>
          </div>

          <label className="f05-field">Observações<textarea rows={2} value={selected.notes} onChange={(event) => { updateAIProviderProfile(selected.id, { notes: event.target.value }); refresh(selected.id); }} placeholder="Uso deste perfil, limites ou observações internas" /></label>

          <div className="f05-secret-box">
            <div className="f05-secret-box__head"><strong>Chave API</strong><span className={`f05-status f05-status--${selected.apiKeyConfigured ? 'connected' : 'not_connected'}`}>{selected.apiKeyConfigured ? 'Configurada' : 'Não configurada'}</span></div>
            <div className="f05-create-row"><input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Cole a chave API" /><button disabled={!apiKey.trim()} onClick={saveKey}>{selected.apiKeyConfigured ? 'Atualizar chave' : 'Salvar chave'}</button></div>
            <small>A chave só pode ser persistida por um cofre/backend seguro. Ela nunca é salva em localStorage nem no repositório.</small>
            {credentialMessage ? <div className="f05-inline-message">{credentialMessage}</div> : null}
            {selected.apiKeyConfigured ? <button className="secondary" onClick={removeKey}>Remover chave</button> : null}
          </div>

          {issues.length > 0 ? <div className="f05-validation"><strong>Falta configurar:</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : <div className="f05-validation f05-validation--ok">Perfil pronto para ativação.</div>}

          <div className="f05-actions">
            <button disabled={issues.length > 0} onClick={() => { setAIProviderProfileStatus(selected.id, selected.status === 'ready' ? 'disabled' : 'ready'); refresh(selected.id); }}>{selected.status === 'ready' ? 'Desativar perfil' : 'Ativar perfil'}</button>
            <button className="danger" onClick={() => { if (window.confirm('Excluir este perfil de IA?')) { deleteAIProviderProfile(selected.id); refresh(); } }}>Excluir perfil</button>
          </div>
        </>}
      </fieldset>
    </div>
  </div>;
}
