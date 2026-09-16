import { useMemo, useState } from 'react';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { AI_PROVIDER_CATALOG, getAIProviderCatalogItem, type AIProviderKind } from './aiProviderTypes';
import {
  createAIProviderProfile,
  deleteAIProviderProfileConfirmed,
  listAIProviderProfiles,
  restoreAIProviderProfileConfirmed,
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
  const dependentAgents = selected ? listAIAgents().filter((agent) => agent.providerProfileId === selected.id) : [];
  const activeDependentAgents = dependentAgents.filter((agent) => agent.status === 'active');
  const executionConfigLocked = activeDependentAgents.length > 0;

  const refresh = (focusId?: string) => {
    const next = listAIProviderProfiles();
    setProfiles(next);
    if (focusId) setSelectedId(focusId);
    else setSelectedId((current) => current && next.some((profile) => profile.id === current) ? current : next[0]?.id ?? null);
  };
  useF05StorageListener(() => refresh());

  const patchProfile = (patch: Parameters<typeof updateAIProviderProfile>[1]) => {
    if (!selected || !canManage) return;
    try {
      updateAIProviderProfile(selected.id, patch);
      setCredentialMessage('');
      refresh(selected.id);
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível alterar o perfil de IA.'));
    }
  };

  const create = () => {
    if (!newName.trim() || !canManage) return;
    try {
      const profile = createAIProviderProfile({ name: newName, provider: newProvider });
      setNewName('');
      setCredentialMessage('');
      refresh(profile.id);
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível criar o perfil de IA.'));
    }
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
    if (activeDependentAgents.length > 0) {
      setCredentialMessage(`Pause os agentes ativos que usam este perfil antes de remover a chave: ${activeDependentAgents.map((agent) => agent.name).join(', ')}.`);
      return;
    }

    const profileBefore = selected;
    setCredentialMessage('');

    try {
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

  const toggleStatus = () => {
    if (!selected || !canManage) return;
    if (selected.status === 'ready' && activeDependentAgents.length > 0) {
      setCredentialMessage(`Pause os agentes ativos antes de desativar este perfil: ${activeDependentAgents.map((agent) => agent.name).join(', ')}.`);
      return;
    }
    try {
      setAIProviderProfileStatus(selected.id, selected.status === 'ready' ? 'disabled' : 'ready');
      setCredentialMessage('');
      refresh(selected.id);
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível alterar o status do perfil.'));
    }
  };

  const deleteProfile = async () => {
    if (!selected || !canManage) return;
    if (dependentAgents.length > 0) {
      setCredentialMessage(`Reatribua ou exclua os agentes que usam este perfil antes de excluí-lo: ${dependentAgents.map((agent) => agent.name).join(', ')}.`);
      return;
    }
    if (!window.confirm('Excluir este perfil de IA?')) return;

    const profileBefore = selected;
    try {
      await deleteAIProviderProfileConfirmed(selected.id);
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível persistir a exclusão do perfil.'));
      refresh(selected.id);
      return;
    }

    if (!profileBefore.apiKeyConfigured || !profileBefore.secretRef) {
      setCredentialMessage('Perfil excluído.');
      refresh();
      return;
    }

    const cleanup = await credentialVault.removeApiKey({ profileId: profileBefore.id, secretRef: profileBefore.secretRef });
    if (cleanup.status === 'stored') {
      setCredentialMessage('Perfil e credencial excluídos com segurança.');
      refresh();
      return;
    }

    try {
      await restoreAIProviderProfileConfirmed(profileBefore);
      setCredentialMessage(`${cleanup.reason} A exclusão do perfil foi revertida para preservar a referência da credencial.`);
      refresh(profileBefore.id);
    } catch (restoreError) {
      setCredentialMessage(`${cleanup.reason} Também não foi possível restaurar o perfil: ${errorMessage(restoreError, 'falha de restauração')}`);
      refresh();
    }
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
            <label>Nome do perfil<input value={selected.name} onChange={(event) => patchProfile({ name: event.target.value })} /></label>
            <label>Provedor<select disabled={executionConfigLocked} value={selected.provider} onChange={(event) => patchProfile({ provider: event.target.value as AIProviderKind, status: 'draft' })}>
              {AI_PROVIDER_CATALOG.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
            </select></label>
          </div>

          <div className="f05-form-grid">
            <label>Modelo<input disabled={executionConfigLocked} value={selected.model} onChange={(event) => patchProfile({ model: event.target.value, status: 'draft' })} placeholder={selectedMeta?.modelPlaceholder ?? 'Informe o modelo'} /></label>
            <label>Endpoint/base URL<input disabled={executionConfigLocked} value={selected.baseUrl} onChange={(event) => patchProfile({ baseUrl: event.target.value, status: 'draft' })} placeholder="Opcional, exceto provedor customizado" /></label>
          </div>

          <label className="f05-field">Observações<textarea rows={2} value={selected.notes} onChange={(event) => patchProfile({ notes: event.target.value })} placeholder="Uso deste perfil, limites ou observações internas" /></label>

          {dependentAgents.length > 0 ? <div className="f05-inline-message">Usado por {dependentAgents.length} agente(s): {dependentAgents.map((agent) => `${agent.name} (${agent.status})`).join(', ')}.</div> : null}
          {executionConfigLocked ? <div className="f05-inline-message">Provedor, modelo e endpoint ficam bloqueados enquanto houver agente ativo usando este perfil. Pause os agentes antes de alterar a configuração de execução.</div> : null}

          <div className="f05-secret-box">
            <div className="f05-secret-box__head"><strong>Chave API</strong><span className={`f05-status f05-status--${selected.apiKeyConfigured ? 'connected' : 'not_connected'}`}>{selected.apiKeyConfigured ? 'Configurada' : 'Não configurada'}</span></div>
            <div className="f05-create-row"><input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Cole a chave API" /><button disabled={!apiKey.trim()} onClick={saveKey}>{selected.apiKeyConfigured ? 'Atualizar chave' : 'Salvar chave'}</button></div>
            <small>A chave só pode ser persistida por um cofre/backend seguro. Ela nunca é salva em localStorage nem no repositório.</small>
            {credentialMessage ? <div className="f05-inline-message">{credentialMessage}</div> : null}
            {selected.apiKeyConfigured ? <button className="secondary" disabled={activeDependentAgents.length > 0} onClick={removeKey}>Remover chave</button> : null}
          </div>

          {issues.length > 0 ? <div className="f05-validation"><strong>Falta configurar:</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : <div className="f05-validation f05-validation--ok">Perfil pronto para ativação.</div>}

          <div className="f05-actions">
            <button disabled={issues.length > 0 || (selected.status === 'ready' && activeDependentAgents.length > 0)} onClick={toggleStatus}>{selected.status === 'ready' ? 'Desativar perfil' : 'Ativar perfil'}</button>
            <button className="danger" disabled={dependentAgents.length > 0} onClick={deleteProfile}>Excluir perfil</button>
          </div>
        </>}
      </fieldset>
    </div>
  </div>;
}
