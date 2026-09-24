import { useMemo, useState } from 'react';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { getAIProviderCatalogItem } from './aiProviderTypes';
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
  const [apiKey, setApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const [inspecting, setInspecting] = useState(false);

  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? null, [profiles, selectedId]);
  const selectedMeta = selected ? getAIProviderCatalogItem(selected.provider) : undefined;
  const issues = selected ? validateAIProviderProfile(selected) : [];
  const dependentAgents = selected ? listAIAgents().filter((agent) => agent.providerProfileId === selected.id) : [];
  const activeDependentAgents = dependentAgents.filter((agent) => agent.status === 'active');
  const executionConfigLocked = activeDependentAgents.length > 0;
  const availableModels = selected?.availableModels ?? [];

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
      const profile = createAIProviderProfile({ name: newName, provider: 'openai' });
      setNewName('');
      setCredentialMessage('Cole a chave API. A Hárpia vai identificar o provedor e carregar os modelos disponíveis.');
      refresh(profile.id);
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível criar o perfil de IA.'));
    }
  };

  const identifyAndConnect = async () => {
    if (!selected || !apiKey.trim() || !canManage) return;
    if (executionConfigLocked) {
      setCredentialMessage('Pause os agentes ativos que usam este perfil antes de trocar a credencial ou o modelo.');
      return;
    }

    const rawKey = apiKey.trim();
    setCredentialMessage('');
    setInspecting(true);

    try {
      const inspection = await credentialVault.inspectApiKey({ apiKey: rawKey });
      if (inspection.status !== 'identified') {
        setCredentialMessage(inspection.reason);
        return;
      }

      if (!inspection.models.length) {
        setCredentialMessage(`A chave foi reconhecida como ${inspection.providerLabel}, mas o provedor não retornou modelos utilizáveis.`);
        return;
      }

      const stored = await credentialVault.saveApiKey({ profileId: selected.id, apiKey: rawKey });
      if (stored.status !== 'stored') {
        setCredentialMessage(stored.reason);
        return;
      }

      try {
        await updateAIProviderProfileConfirmed(selected.id, {
          provider: inspection.provider,
          model: inspection.models[0],
          baseUrl: '',
          availableModels: inspection.models,
          apiKeyConfigured: true,
          secretRef: stored.secretRef,
          status: 'draft',
        });
      } catch (error) {
        await credentialVault.removeApiKey({ profileId: selected.id, secretRef: stored.secretRef });
        throw error;
      }

      setApiKey('');
      setCredentialMessage(`${inspection.providerLabel} identificado. ${inspection.models.length} modelo(s) disponível(is). Escolha o modelo abaixo.`);
      refresh(selected.id);
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível identificar e conectar a chave de IA.'));
    } finally {
      setInspecting(false);
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
        model: '',
        availableModels: [],
        status: 'draft',
      });
    } catch (error) {
      setCredentialMessage(errorMessage(error, 'Não foi possível atualizar o perfil antes de remover a chave.'));
      refresh(selected.id);
      return;
    }

    const result = await credentialVault.removeApiKey({ profileId: selected.id, secretRef: profileBefore.secretRef });
    if (result.status === 'stored') {
      setCredentialMessage('Chave removida. Cole uma nova chave para identificar novamente o provedor e os modelos.');
      refresh(selected.id);
      return;
    }

    try {
      await updateAIProviderProfileConfirmed(selected.id, {
        apiKeyConfigured: profileBefore.apiKeyConfigured,
        secretRef: profileBefore.secretRef,
        model: profileBefore.model,
        availableModels: profileBefore.availableModels,
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

  return (
    <div className="f05-ai-provider">
      <div className="f05-subheader">
        <div>
          <span className="f05-kicker">Provedores de IA</span>
          <h3>Chave, provedor e modelo</h3>
          <p>Cole a chave. A Hárpia valida no servidor, identifica o provedor e carrega os modelos disponíveis. A chave não fica no navegador.</p>
        </div>
        <span className="f05-count">{profiles.length}</span>
      </div>

      {!canManage ? <div className="f05-readonly-note">Modo leitura: somente usuários com integrations.manage podem alterar credenciais de IA.</div> : null}

      <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
        <div className="f05-create-row">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome do perfil, ex.: IA Comercial" />
          <button disabled={!newName.trim()} onClick={create}>Criar perfil</button>
        </div>
      </fieldset>

      <div className="f05-split">
        <aside className="f05-list">
          {profiles.length === 0 ? <div className="f05-empty">Nenhum perfil de IA configurado.</div> : profiles.map((profile) => {
            const meta = getAIProviderCatalogItem(profile.provider);
            const providerLabel = profile.apiKeyConfigured ? (meta?.label ?? profile.provider) : 'Aguardando chave';
            return (
              <button
                key={profile.id}
                className={`f05-list-item ${profile.id === selectedId ? 'is-active' : ''}`}
                onClick={() => { setSelectedId(profile.id); setCredentialMessage(''); setApiKey(''); }}
              >
                <strong>{profile.name}</strong>
                <span>{providerLabel} · {profile.status}</span>
              </button>
            );
          })}
        </aside>

        <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>
          {!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um perfil de IA.</div> : (
            <>
              <div className="f05-form-grid">
                <label>Nome do perfil<input value={selected.name} onChange={(event) => patchProfile({ name: event.target.value })} /></label>
                <label>
                  Provedor identificado
                  <input value={selected.apiKeyConfigured ? (selectedMeta?.label ?? selected.provider) : 'Cole a chave para identificar'} disabled />
                </label>
              </div>

              <div className="f05-form-grid">
                <label>
                  Modelo
                  <select
                    disabled={executionConfigLocked || !selected.apiKeyConfigured || availableModels.length === 0}
                    value={selected.model}
                    onChange={(event) => patchProfile({ model: event.target.value, status: 'draft' })}
                  >
                    {availableModels.length === 0 ? <option value="">Conecte a chave para carregar os modelos</option> : null}
                    {availableModels.map((model) => <option value={model} key={model}>{model}</option>)}
                  </select>
                </label>
                <label>
                  Status
                  <input value={selected.status === 'ready' ? 'Ativo' : selected.status === 'disabled' ? 'Desativado' : 'Aguardando ativação'} disabled />
                </label>
              </div>

              {dependentAgents.length > 0 ? <div className="f05-inline-message">Usado por {dependentAgents.length} agente(s): {dependentAgents.map((agent) => `${agent.name} (${agent.status})`).join(', ')}.</div> : null}
              {executionConfigLocked ? <div className="f05-inline-message">O modelo fica bloqueado enquanto houver agente ativo usando este perfil.</div> : null}

              <div className="f05-secret-box">
                <div className="f05-secret-box__head">
                  <strong>Chave API</strong>
                  <span className={`f05-status f05-status--${selected.apiKeyConfigured ? 'connected' : 'not_connected'}`}>
                    {selected.apiKeyConfigured ? 'Conectada' : 'Não conectada'}
                  </span>
                </div>
                <div className="f05-create-row">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    onPaste={() => window.setTimeout(() => setCredentialMessage('Chave recebida. Clique em identificar e conectar.'), 0)}
                    placeholder="Cole a chave API"
                  />
                  <button disabled={!apiKey.trim() || inspecting} onClick={() => void identifyAndConnect()}>
                    {inspecting ? 'Identificando...' : 'Identificar e conectar'}
                  </button>
                </div>
                <small>A validação acontece no servidor. A Hárpia consulta o provedor com a própria chave e retorna somente o provedor identificado e os modelos disponíveis.</small>
                {credentialMessage ? <div className="f05-inline-message">{credentialMessage}</div> : null}
                {selected.apiKeyConfigured ? <button className="secondary" disabled={activeDependentAgents.length > 0} onClick={() => void removeKey()}>Remover chave</button> : null}
              </div>

              {issues.length > 0 ? (
                <div className="f05-validation"><strong>Falta configurar:</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>
              ) : (
                <div className="f05-validation f05-validation--ok">Perfil pronto para ativação.</div>
              )}

              <div className="f05-actions">
                <button disabled={issues.length > 0 || (selected.status === 'ready' && activeDependentAgents.length > 0)} onClick={toggleStatus}>
                  {selected.status === 'ready' ? 'Desativar perfil' : 'Ativar perfil'}
                </button>
                <button className="danger" disabled={dependentAgents.length > 0} onClick={() => void deleteProfile()}>Excluir perfil</button>
              </div>
            </>
          )}
        </fieldset>
      </div>
    </div>
  );
}
