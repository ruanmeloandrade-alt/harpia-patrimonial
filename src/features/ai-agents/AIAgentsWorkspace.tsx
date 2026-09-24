import { useEffect, useMemo, useRef, useState } from 'react';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import {
  addAIBrainTextSource,
  deleteAIBrainSource,
  loadAIBrain,
  saveAIBrainContext,
  uploadAIBrainFile,
  type AIBrainSource,
  type UploadStage,
} from './brainRepository';
import { createAIAgent, deleteAIAgent, listAIAgents, setAIAgentStatus, updateAIAgent } from './repository';
import type { AIAgentDefinition } from './types';

const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const formatBytes = (value: number | null) => {
  if (!value) return '';
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / (1024 * 1024)).toFixed(1) + ' MB';
};

type ActionState = 'idle' | 'loading' | 'success';

const uploadStageLabel: Record<UploadStage, string> = {
  uploading: 'Enviando arquivo...',
  registering: 'Registrando fonte...',
  processing: 'Processando conteúdo...',
  ready: 'Concluído ✓',
};

export function AIAgentsWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [tab, setTab] = useState<'brain' | 'agents'>('brain');
  const [agents, setAgents] = useState(() => listAIAgents());
  const [selectedId, setSelectedId] = useState<string | null>(() => agents[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const [brainLoading, setBrainLoading] = useState(true);
  const [brainError, setBrainError] = useState('');
  const [companyContext, setCompanyContext] = useState('');
  const [sources, setSources] = useState<AIBrainSource[]>([]);
  const [contextSaveState, setContextSaveState] = useState<ActionState>('idle');
  const [textSourceTitle, setTextSourceTitle] = useState('');
  const [textSourceBody, setTextSourceBody] = useState('');
  const [textSourceState, setTextSourceState] = useState<ActionState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<ActionState>('idle');
  const [uploadLabel, setUploadLabel] = useState('Enviar arquivo');
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const providers = listAIProviderProfiles();
  const readyProvider = providers.find((profile) => profile.status === 'ready' && profile.apiKeyConfigured && profile.secretRef);
  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId) ?? null, [agents, selectedId]);

  const refreshAgents = (focusId?: string) => {
    const next = listAIAgents();
    setAgents(next);
    if (focusId) setSelectedId(focusId);
    else setSelectedId((current) => current && next.some((agent) => agent.id === current) ? current : next[0]?.id ?? null);
  };

  const refreshBrain = async () => {
    setBrainLoading(true);
    try {
      const snapshot = await loadAIBrain();
      setCompanyContext(snapshot.companyContext);
      setSources(snapshot.sources);
      setBrainError('');
    } catch (nextError) {
      setBrainError(errorMessage(nextError, 'Não foi possível carregar o Cérebro da empresa.'));
    } finally {
      setBrainLoading(false);
    }
  };

  useEffect(() => {
    void refreshBrain();
  }, []);

  useF05StorageListener(() => refreshAgents());

  const patch = (value: Partial<Omit<AIAgentDefinition, 'id' | 'createdAt'>>) => {
    if (!selected || !canManage) return;
    try {
      updateAIAgent(selected.id, value);
      setError('');
      refreshAgents(selected.id);
    } catch (nextError) {
      setError(errorMessage(nextError, 'Não foi possível alterar o agente IA.'));
    }
  };

  const saveContext = async () => {
    if (!canManage || contextSaveState === 'loading') return;
    setContextSaveState('loading');
    try {
      await saveAIBrainContext(companyContext);
      setBrainError('');
      setContextSaveState('success');
      window.setTimeout(() => setContextSaveState('idle'), 1200);
    } catch (nextError) {
      setContextSaveState('idle');
      setBrainError(errorMessage(nextError, 'Não foi possível salvar o contexto da empresa.'));
    }
  };

  const addTextSource = async () => {
    if (!canManage || textSourceState === 'loading') return;
    setTextSourceState('loading');
    try {
      await addAIBrainTextSource(textSourceTitle, textSourceBody);
      setTextSourceTitle('');
      setTextSourceBody('');
      setBrainError('');
      await refreshBrain();
      setTextSourceState('success');
      window.setTimeout(() => setTextSourceState('idle'), 1200);
    } catch (nextError) {
      setTextSourceState('idle');
      setBrainError(errorMessage(nextError, 'Não foi possível adicionar a fonte.'));
    }
  };

  const uploadFile = async () => {
    if (!canManage || !selectedFile || uploadState === 'loading') return;
    setUploadState('loading');
    setUploadLabel('Preparando...');
    try {
      await uploadAIBrainFile(selectedFile, (stage) => setUploadLabel(uploadStageLabel[stage]));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBrainError('');
      await refreshBrain();
      setUploadState('success');
      setUploadLabel('Concluído ✓');
      window.setTimeout(() => {
        setUploadState('idle');
        setUploadLabel('Enviar arquivo');
      }, 1400);
    } catch (nextError) {
      setUploadState('idle');
      setUploadLabel('Tentar novamente');
      setBrainError(errorMessage(nextError, 'Não foi possível enviar ou processar o arquivo.'));
    }
  };

  const removeSource = async (source: AIBrainSource) => {
    if (!canManage || deletingSourceId) return;
    if (!window.confirm('Excluir a fonte “' + source.title + '” do Cérebro?')) return;
    setDeletingSourceId(source.id);
    try {
      await deleteAIBrainSource(source);
      setBrainError('');
      await refreshBrain();
    } catch (nextError) {
      setBrainError(errorMessage(nextError, 'Não foi possível excluir a fonte.'));
    } finally {
      setDeletingSourceId(null);
    }
  };

  return <section className="f05-module">
    <header className="f05-module__header">
      <div>
        <span className="f05-kicker">Agentes de IA</span>
        <h2>Cérebro e agentes da empresa</h2>
        <p>O Cérebro concentra o conhecimento compartilhado. Os agentes usam esse contexto automaticamente nas execuções.</p>
      </div>
      <span className="f05-count">{agents.length}</span>
    </header>

    <div className="f05-tabs ai-workspace-tabs">
      <button type="button" className={tab === 'brain' ? 'is-active' : ''} onClick={() => setTab('brain')}>Cérebro</button>
      <button type="button" className={tab === 'agents' ? 'is-active' : ''} onClick={() => setTab('agents')}>Agentes</button>
    </div>

    {tab === 'brain' ? <>
      {!canManage ? <div className="f05-readonly-note">Modo leitura: você pode consultar o Cérebro, mas não alterar as fontes.</div> : null}
      {brainError ? <div className="f05-alert">{brainError}</div> : null}

      <div className="ai-brain-grid">
        <article className="f05-card ai-brain-context-card">
          <div className="f05-subheader">
            <div>
              <h3>Contexto geral da empresa</h3>
              <p>Informações permanentes que todos os agentes precisam conhecer.</p>
            </div>
            <span className="f05-status f05-status--connected">Compartilhado</span>
          </div>
          {brainLoading
            ? <div className="f05-empty">Carregando contexto...</div>
            : <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
                <label className="f05-field">
                  Contexto
                  <textarea rows={10} value={companyContext} onChange={(event) => setCompanyContext(event.target.value)} placeholder="Descreva empresa, serviços, regras, posicionamento e informações que devem acompanhar todas as execuções." />
                </label>
                <div className="f05-actions">
                  <button
                    type="button"
                    aria-busy={contextSaveState === 'loading'}
                    className={contextSaveState === 'success' ? 'is-success' : ''}
                    onClick={() => void saveContext()}
                  >
                    {contextSaveState === 'loading' ? 'Salvando...' : contextSaveState === 'success' ? 'Salvo ✓' : 'Salvar contexto'}
                  </button>
                </div>
              </fieldset>}
        </article>

        <article className="f05-card">
          <div className="f05-subheader">
            <div>
              <h3>Enviar arquivo</h3>
              <p>PDF, TXT, JPG, PNG ou WEBP. Limite de 10 MB por arquivo.</p>
            </div>
          </div>
          <fieldset className="f05-readonly-fieldset" disabled={!canManage || uploadState === 'loading'}>
            <label className="ai-upload-picker">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,application/pdf,text/plain,image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setUploadLabel('Enviar arquivo');
                }}
              />
              <span>{selectedFile ? selectedFile.name : 'Selecionar PDF, TXT ou imagem'}</span>
              <small>{selectedFile ? formatBytes(selectedFile.size) : 'O arquivo fica em armazenamento privado.'}</small>
            </label>
            <div className="f05-actions">
              <button
                type="button"
                disabled={!selectedFile || uploadState === 'loading'}
                aria-busy={uploadState === 'loading'}
                className={uploadState === 'success' ? 'is-success' : ''}
                onClick={() => void uploadFile()}
              >
                {uploadLabel}
              </button>
            </div>
          </fieldset>
        </article>
      </div>

      <article className="f05-card ai-brain-source-card">
        <div className="f05-subheader">
          <div>
            <h3>Fontes adicionais</h3>
            <p>Adicione conhecimento em texto ou acompanhe os documentos já processados.</p>
          </div>
          <span className="f05-count">{sources.length}</span>
        </div>

        <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
          <div className="ai-text-source-form">
            <label className="f05-field">Título<input value={textSourceTitle} onChange={(event) => setTextSourceTitle(event.target.value)} placeholder="Ex.: Regras comerciais" /></label>
            <label className="f05-field">Conteúdo<textarea rows={4} value={textSourceBody} onChange={(event) => setTextSourceBody(event.target.value)} placeholder="Cole aqui uma fonte adicional para o Cérebro." /></label>
            <div className="f05-actions">
              <button
                type="button"
                disabled={!textSourceTitle.trim() || !textSourceBody.trim() || textSourceState === 'loading'}
                aria-busy={textSourceState === 'loading'}
                className={textSourceState === 'success' ? 'is-success' : ''}
                onClick={() => void addTextSource()}
              >
                {textSourceState === 'loading' ? 'Adicionando...' : textSourceState === 'success' ? 'Adicionado ✓' : 'Adicionar texto'}
              </button>
            </div>
          </div>
        </fieldset>

        <div className="ai-source-list">
          {brainLoading
            ? <div className="f05-empty">Carregando fontes...</div>
            : sources.length === 0
              ? <div className="f05-empty">Nenhuma fonte adicional cadastrada.</div>
              : sources.map((source) => <div key={source.id} className="ai-source-row">
                  <div>
                    <strong>{source.title}</strong>
                    <span>
                      {source.source_type.toUpperCase()} · {source.status === 'ready' ? 'Pronto' : source.status === 'processing' ? 'Processando' : 'Erro'}
                      {source.size_bytes ? ' · ' + formatBytes(source.size_bytes) : ''}
                    </span>
                    {source.error_message ? <small>{source.error_message}</small> : null}
                  </div>
                  {canManage ? <button type="button" className="danger" disabled={deletingSourceId === source.id} onClick={() => void removeSource(source)}>
                    {deletingSourceId === source.id ? 'Excluindo...' : 'Excluir'}
                  </button> : null}
                </div>)}
        </div>
      </article>
    </> : <>
      {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar agentes, mas não alterá-los.</div> : null}
      <div className={'f05-inline-message' + (readyProvider ? ' f05-validation--ok' : '')}>
        {readyProvider
          ? 'IA pronta em Integrações: ' + readyProvider.name + '. Os agentes usam essa configuração automaticamente.'
          : 'Nenhuma IA pronta em Integrações. Você pode criar, configurar e ativar agentes normalmente; sem chave, apenas a execução ficará indisponível.'}
      </div>

      <fieldset className="f05-readonly-fieldset" disabled={!canManage}>
        <div className="f05-create-row">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome interno do agente" />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => {
              try {
                const agent = createAIAgent(newName);
                setNewName('');
                setError('');
                refreshAgents(agent.id);
              } catch (nextError) {
                setError(errorMessage(nextError, 'Não foi possível criar o agente IA.'));
              }
            }}
          >
            Criar agente
          </button>
        </div>
      </fieldset>

      {error ? <div className="f05-alert">{error}</div> : null}

      <div className="f05-split">
        <aside className="f05-list">
          {agents.length === 0
            ? <div className="f05-empty">Nenhum agente criado.</div>
            : agents.map((agent) => <button key={agent.id} type="button" className={'f05-list-item ' + (agent.id === selectedId ? 'is-active' : '')} onClick={() => { setSelectedId(agent.id); setError(''); }}>
                <strong>{agent.name}</strong>
                <span>{agent.status}{agent.role ? ' · ' + agent.role : ''}</span>
              </button>)}
        </aside>

        <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>
          {!selected
            ? <div className="f05-empty f05-empty--large">Crie ou selecione um agente.</div>
            : <>
                <div className="f05-form-grid">
                  <label>Nome<input value={selected.name} onChange={(event) => patch({ name: event.target.value })} /></label>
                  <label>Função<input value={selected.role} onChange={(event) => patch({ role: event.target.value })} placeholder="Ex.: qualificação, apoio comercial" /></label>
                </div>
                <label className="f05-field">Prompt do agente<textarea rows={5} value={selected.instructions} onChange={(event) => patch({ instructions: event.target.value })} placeholder="Instruções operacionais do agente" /></label>
                <label className="f05-field">Regras<textarea rows={4} value={selected.rules} onChange={(event) => patch({ rules: event.target.value })} placeholder="Limites e regras obrigatórias" /></label>
                <label className="f05-field">Contexto específico<textarea rows={3} value={selected.context} onChange={(event) => patch({ context: event.target.value })} placeholder="Contexto exclusivo deste agente. O Cérebro geral entra automaticamente." /></label>
                <div className="f05-form-grid">
                  <label>Acessos<input value={selected.accessScopes.join(', ')} onChange={(event) => patch({ accessScopes: splitCsv(event.target.value) })} placeholder="crm.lead.read, catalog.read" /></label>
                  <label>Pontos de acionamento<input value={selected.activationPoints.join(', ')} onChange={(event) => patch({ activationPoints: splitCsv(event.target.value) })} placeholder="salesbot, inbox, automatize" /></label>
                </div>
                <div className="ai-access-summary">
                  <div><strong>Cérebro</strong><span>Contexto e fontes da empresa</span></div>
                  <div><strong>Sistema</strong><span>Dados permitidos pelo runtime</span></div>
                  <div><strong>Acionamento</strong><span>SalesBot, Inbox e Automatize</span></div>
                </div>
                <div className="f05-actions">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setAIAgentStatus(selected.id, selected.status === 'active' ? 'paused' : 'active');
                        setError('');
                        refreshAgents(selected.id);
                      } catch (nextError) {
                        setError(errorMessage(nextError, 'Não foi possível alterar o status do agente IA.'));
                      }
                    }}
                  >
                    {selected.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      if (!window.confirm('Excluir este agente?')) return;
                      try {
                        deleteAIAgent(selected.id);
                        setError('');
                        refreshAgents();
                      } catch (nextError) {
                        setError(errorMessage(nextError, 'Não foi possível excluir o agente IA.'));
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </>}
        </fieldset>
      </div>
    </>}
  </section>;
}
