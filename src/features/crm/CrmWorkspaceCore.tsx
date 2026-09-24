import {
  DragEvent as ReactDragEvent,
  FormEvent,
  useMemo,
  useState,
} from 'react';
import {
  CrmId,
  CrmState,
  CustomFieldDefinition,
  CustomFieldType,
  InterestType,
  Lead,
  PipelineStage,
} from './domain';
import { BrowserCrmRepository } from './repository';
import { CrmIntegrityError, CrmService } from './service';
import type { CatalogRepository } from '../catalog/catalogRepository';
import type { InboxService } from '../inbox/service';
import { useAppRouter } from '../../core/router/router';
import { LeadProductsPanel } from './LeadProductsPanel';
import { listSalesBots } from '../salesbot/repository';
import { listAIAgents } from '../ai-agents/repository';
import {
  createPipelineAutomation,
  deletePipelineAutomation,
  deletePipelineAutomationsForPipeline,
  deletePipelineAutomationsForStage,
  listPipelineAutomations,
  updatePipelineAutomation,
} from '../automations/repository';
import type { PipelineTriggerAction, PipelineTriggerEvent } from '../automations/types';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { formatRuntimeDateTime } from '../settings/runtime-preferences';
import styles from './crm.module.css';

export interface AssigneeOption {
  id: string;
  name: string;
}

export interface CrmWorkspaceProps {
  service?: CrmService;
  assignees?: AssigneeOption[];
  canManage?: boolean;
  catalogRepository?: CatalogRepository;
  inboxService?: InboxService;
}

const emptyMessage = 'Nenhum dado real cadastrado ainda.';
const interestTypes: Array<{ value: InterestType; label: string }> = [
  { value: 'property', label: 'Imóvel' },
  { value: 'product', label: 'Produto' },
  { value: 'service', label: 'Serviço' },
  { value: 'other', label: 'Outro' },
];
const customFieldTypes: Array<{ value: CustomFieldType; label: string }> = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'select', label: 'Seleção única' },
  { value: 'multiselect', label: 'Seleção múltipla' },
];

const pipelineTriggerEventLabels: Record<PipelineTriggerEvent, string> = {
  enter: 'Lead entrou na etapa',
  created_or_moved: 'Lead criado ou movido para etapa',
  leave: 'Lead saiu da etapa',
  created: 'Lead criado no funil',
  time: 'Lead está há X tempo na etapa',
  salesbot_done: 'SalesBot concluiu',
  salesbot_failed: 'SalesBot falhou',
  ai_done: 'Agente IA concluiu o serviço',
  tag_added: 'Tag adicionada',
  field_changed: 'Campo personalizado alterado',
};

const pipelineTriggerActionLabels: Record<PipelineTriggerAction, string> = {
  move_stage: 'Mover lead para etapa',
  salesbot: 'Iniciar SalesBot',
  ai: 'Iniciar Agente IA',
};

export function CrmWorkspace({
  service: injectedService,
  assignees = [],
  canManage = true,
  catalogRepository,
  inboxService,
}: CrmWorkspaceProps) {
  const { navigate } = useAppRouter();
  const service = useMemo(
    () => injectedService ?? new CrmService(new BrowserCrmRepository()),
    [injectedService],
  );
  const initialSnapshot = useMemo(() => service.snapshot(), [service]);
  const [state, setState] = useState<CrmState>(() => initialSnapshot);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(
    () => initialSnapshot.pipelines.find((pipeline) => pipeline.active)?.id ?? initialSnapshot.pipelines[0]?.id,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState('');
  const [automationOpen, setAutomationOpen] = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [automationRevision, setAutomationRevision] = useState(0);
  const [triggerModalStageId, setTriggerModalStageId] = useState('');
  const [editingTriggerId, setEditingTriggerId] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<PipelineTriggerEvent>('created_or_moved');
  const [triggerValue, setTriggerValue] = useState('');
  const [triggerDurationAmount, setTriggerDurationAmount] = useState('30');
  const [triggerDurationUnit, setTriggerDurationUnit] = useState<'m' | 'h' | 'd'>('m');
  const [triggerAction, setTriggerAction] = useState<PipelineTriggerAction>('move_stage');
  const [triggerResourceId, setTriggerResourceId] = useState('');
  const [triggerTargetStageId, setTriggerTargetStageId] = useState('');

  useF05StorageListener(() => setAutomationRevision((value) => value + 1));

  const refresh = (message?: string) => {
    const snapshot = service.snapshot();
    setState(snapshot);
    if (message) setFeedback(message);

    if (selectedPipelineId && !snapshot.pipelines.some((pipeline) => pipeline.id === selectedPipelineId)) {
      setSelectedPipelineId(snapshot.pipelines.find((pipeline) => pipeline.active)?.id ?? snapshot.pipelines[0]?.id);
    }
    if (selectedLeadId && !snapshot.leads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(undefined);
    }
  };

  const run = (action: () => void, success: string) => {
    try {
      action();
      refresh(success);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível concluir a ação.');
    }
  };

  const selectedPipeline = state.pipelines.find((pipeline) => pipeline.id === selectedPipelineId);
  const stages = selectedPipeline ? service.getStages(selectedPipeline.id) : [];
  const selectedLead = state.leads.find((lead) => lead.id === selectedLeadId);
  const pipelineTriggers = useMemo(
    () => selectedPipeline ? listPipelineAutomations(selectedPipeline.id) : [],
    [selectedPipeline?.id, automationRevision],
  );
  const salesBots = useMemo(() => listSalesBots(), [automationRevision]);
  const aiAgents = useMemo(() => listAIAgents(), [automationRevision]);

  const handleCreatePipeline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('pipelineName') ?? '');
    try {
      const pipeline = service.createPipeline(name);
      setSelectedPipelineId(pipeline.id);
      setSelectedLeadId(undefined);
      setPipelineModalOpen(false);
      event.currentTarget.reset();
      refresh('Funil criado.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar o funil.');
    }
  };

  const handleCreateStage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPipeline) return;
    const form = new FormData(event.currentTarget);
    try {
      service.createStage(selectedPipeline.id, String(form.get('stageName') ?? ''));
      event.currentTarget.reset();
      refresh('Etapa criada.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar a etapa.');
    }
  };

  const openTriggerModal = (stageId: string, triggerId?: string) => {
    const current = triggerId ? pipelineTriggers.find((item) => item.id === triggerId) : undefined;
    const meta = current?.pipeline;

    setTriggerModalStageId(stageId);
    setEditingTriggerId(current?.id ?? '');
    setTriggerEvent(meta?.event ?? 'created_or_moved');
    setTriggerAction(meta?.action ?? 'move_stage');
    setTriggerResourceId(meta?.resourceId ?? '');
    setTriggerTargetStageId(meta?.targetStageId ?? '');
    setTriggerValue(meta?.event === 'time' ? '' : meta?.value ?? '');

    const duration = meta?.event === 'time' ? String(meta.value ?? '30m').match(/^(\d+)\s*([mhd])/i) : null;
    setTriggerDurationAmount(duration?.[1] ?? '30');
    setTriggerDurationUnit((duration?.[2]?.toLowerCase() as 'm' | 'h' | 'd') ?? 'm');
  };

  const closeTriggerModal = () => {
    setTriggerModalStageId('');
    setEditingTriggerId('');
  };

  const handleAddTrigger = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPipeline || !canManage || !triggerModalStageId) return;

    const value = triggerEvent === 'time'
      ? `${Math.max(1, Number(triggerDurationAmount) || 1)}${triggerDurationUnit}`
      : triggerValue;

    const input = {
      pipelineId: selectedPipeline.id,
      event: triggerEvent,
      stageId: triggerModalStageId,
      value,
      action: triggerAction,
      targetStageId: triggerTargetStageId,
      resourceId: triggerResourceId,
    };

    try {
      if (editingTriggerId) updatePipelineAutomation(editingTriggerId, input);
      else createPipelineAutomation(input);
      setAutomationRevision((value) => value + 1);
      setFeedback(editingTriggerId ? 'Gatilho atualizado.' : 'Gatilho adicionado à etapa.');
      closeTriggerModal();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível salvar o gatilho.');
    }
  };

  const removeTrigger = (id: string) => {
    if (!canManage) return;
    if (!window.confirm('Excluir este gatilho do funil?')) return;

    try {
      deletePipelineAutomation(id);
      setAutomationRevision((value) => value + 1);
      setFeedback('Gatilho excluído.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível excluir o gatilho.');
    }
  };

  const handleCreateLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const stageId = String(form.get('stageId') ?? '') || undefined;
    const interestType = String(form.get('interestType') ?? '') as InterestType | '';
    const interestLabel = String(form.get('interestLabel') ?? '').trim();
    const interestReferenceId = String(form.get('interestReferenceId') ?? '').trim();

    try {
      const lead = service.createLead({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        whatsapp: String(form.get('whatsapp') ?? ''),
        source: String(form.get('source') ?? ''),
        pipelineId: selectedPipeline?.id,
        stageId,
        interest: interestType
          ? {
              type: interestType,
              label: interestLabel || undefined,
              referenceId: interestReferenceId || undefined,
            }
          : undefined,
      });
      setSelectedLeadId(lead.id);
      setLeadModalOpen(false);
      event.currentTarget.reset();
      refresh('Lead criado sem disparar mensagem automática.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar o lead.');
    }
  };

  const moveStage = (stage: PipelineStage, direction: -1 | 1) => {
    if (!selectedPipeline) return;
    const current = service.getStages(selectedPipeline.id);
    const index = current.findIndex((item) => item.id === stage.id);
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const ids = current.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => service.reorderStages(selectedPipeline.id, ids), 'Ordem das etapas atualizada.');
  };

  const renamePipeline = () => {
    if (!selectedPipeline) return;
    const name = window.prompt('Novo nome do funil', selectedPipeline.name);
    if (name === null) return;
    run(() => service.renamePipeline(selectedPipeline.id, name), 'Funil renomeado.');
  };

  const duplicatePipeline = () => {
    if (!selectedPipeline) return;
    try {
      const copy = service.duplicatePipeline(selectedPipeline.id);
      setSelectedPipelineId(copy.id);
      setSelectedLeadId(undefined);
      refresh('Funil duplicado com a mesma estrutura de etapas. Leads não foram copiados.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível duplicar o funil.');
    }
  };

  const deletePipeline = () => {
    if (!selectedPipeline) return;
    if (!window.confirm(`Excluir o funil “${selectedPipeline.name}”?`)) return;
    try {
      service.removePipeline(selectedPipeline.id);
      deletePipelineAutomationsForPipeline(selectedPipeline.id);
      setAutomationRevision((value) => value + 1);
      setSelectedLeadId(undefined);
      setAutomationOpen(false);
      refresh('Funil excluído.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível excluir o funil.');
    }
  };

  const renameStage = (stage: PipelineStage) => {
    const name = window.prompt('Novo nome da etapa', stage.name);
    if (name === null) return;
    run(() => service.renameStage(stage.id, name), 'Etapa renomeada.');
  };

  const removeStage = (stage: PipelineStage) => {
    const confirmed = window.confirm(
      `Remover a etapa “${stage.name}”? A exclusão só será permitida se não houver leads nela.`,
    );
    if (!confirmed) return;
    try {
      service.removeStage(stage.id);
      deletePipelineAutomationsForStage(stage.id);
      setAutomationRevision((value) => value + 1);
      refresh('Etapa removida.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível remover a etapa.');
    }
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>, stageId: CrmId) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData('text/harpia-lead');
    if (!leadId) return;
    run(() => service.moveLead(leadId, stageId), 'Lead movido de etapa.');
  };

  return (
    <section className={styles.workspace} aria-label="Funis de vendas Hárpia">
      <div className={styles.crmPro}>
        <header className={styles.crmTopbar}>
          <div className={styles.crmTitlebox}>
            <h1>Funis de vendas</h1>
            <p>Crie, edite, duplique e automatize os funis da operação.</p>
          </div>
          <div className={styles.crmActions}>
            <select
              aria-label="Selecionar funil"
              value={selectedPipelineId ?? ''}
              disabled={state.pipelines.length === 0}
              onChange={(event) => {
                setSelectedPipelineId(event.target.value || undefined);
                setSelectedLeadId(undefined);
              }}
            >
              {state.pipelines.length === 0
                ? <option value="">Nenhum funil</option>
                : state.pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
            </select>
            <button className={styles.primaryAction} type="button" disabled={!canManage || !selectedPipeline} onClick={() => setLeadModalOpen(true)}>+ Novo lead</button>
            <button
              type="button"
              className={automationOpen ? styles.automatizeActive : undefined}
              disabled={!selectedPipeline}
              onClick={() => setAutomationOpen((open) => !open)}
            >
              Automatize
            </button>
          </div>
        </header>

        {feedback && (
          <div className={styles.feedback} role="status">
            {feedback}
            <button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso">×</button>
          </div>
        )}

        <div className={styles.crmPipelineTabs}>
          {state.pipelines.length === 0 ? (
            <span className={styles.muted}>Nenhum funil configurado.</span>
          ) : (
            state.pipelines.map((pipeline) => {
              const count = state.leads.filter((lead) => lead.pipelineId === pipeline.id).length;
              return (
                <button
                  key={pipeline.id}
                  type="button"
                  className={pipeline.id === selectedPipelineId ? styles.crmPipelineTabActive : styles.crmPipelineTab}
                  onClick={() => {
                    setSelectedPipelineId(pipeline.id);
                    setSelectedLeadId(undefined);
                  }}
                >
                  {pipeline.name} · {count}
                </button>
              );
            })
          )}
        </div>

        {selectedPipeline ? (
          <>
            {automationOpen ? (
              <section className={styles.crmAutomationToolbar}>
                <div className={styles.crmAutomationToolbarIntro}>
                  <span>MODO AUTOMATIZE</span>
                  <strong>Gatilhos dentro da própria pipeline</strong>
                  <small>Os cards abaixo pertencem à etapa onde aparecem.</small>
                </div>
                {canManage ? (
                  <div className={styles.crmAutomationTools}>
                    <button type="button" onClick={() => setPipelineModalOpen(true)}>+ Novo funil</button>
                    <button type="button" onClick={duplicatePipeline}>Duplicar funil</button>
                    <button type="button" onClick={renamePipeline}>Editar funil</button>
                    <button type="button" className={styles.dangerAction} onClick={deletePipeline}>Excluir funil</button>
                    <form onSubmit={handleCreateStage}>
                      <input name="stageName" required placeholder="Nome da nova etapa" />
                      <button type="submit">+ Etapa</button>
                    </form>
                  </div>
                ) : null}
                <button className={styles.crmAutomationClose} type="button" onClick={() => setAutomationOpen(false)}>Fechar Automatize</button>
              </section>
            ) : null}

            <div className={automationOpen ? `${styles.kanban} ${styles.kanbanAutomationMode}` : styles.kanban}>
              {stages.length === 0 ? (
                <div className={styles.crmEmptyBoard}>
                  <div>
                    <strong>Este funil ainda não tem etapas</strong>
                    <span>{automationOpen ? 'Use “+ Etapa” acima para montar a pipeline.' : 'Clique em Automatize e adicione a primeira etapa.'}</span>
                  </div>
                </div>
              ) : stages.map((stage) => {
                const leads = state.leads.filter((lead) => lead.pipelineId === selectedPipeline.id && lead.stageId === stage.id);
                const stageTriggers = pipelineTriggers.filter((item) => item.pipeline?.stageId === stage.id);

                return (
                  <div
                    className={automationOpen ? `${styles.column} ${styles.columnAutomation}` : styles.column}
                    key={stage.id}
                    onDragOver={(event) => { if (!automationOpen) event.preventDefault(); }}
                    onDrop={(event) => { if (!automationOpen) handleDrop(event, stage.id); }}
                  >
                    <div className={styles.columnHeader}>
                      <div>
                        <strong>{stage.name}</strong>
                        <span>
                          {automationOpen
                            ? `${stageTriggers.length} gatilho${stageTriggers.length === 1 ? '' : 's'}`
                            : `${leads.length} lead${leads.length === 1 ? '' : 's'}`}
                        </span>
                      </div>
                      {canManage && automationOpen ? (
                        <div className={styles.stageActions}>
                          <button type="button" onClick={() => renameStage(stage)} title="Renomear etapa">✎</button>
                          <button type="button" onClick={() => moveStage(stage, -1)} title="Mover para esquerda">←</button>
                          <button type="button" onClick={() => moveStage(stage, 1)} title="Mover para direita">→</button>
                          <button type="button" onClick={() => removeStage(stage)} title="Excluir etapa">×</button>
                        </div>
                      ) : null}
                    </div>

                    {automationOpen ? (
                      <div className={styles.stageAutomationBody}>
                        <div className={styles.stageTriggerList}>
                          {stageTriggers.length === 0 ? (
                            <div className={styles.stageTriggerEmpty}>
                              <strong>Sem gatilhos nesta etapa</strong>
                              <span>Adicione o primeiro gatilho aqui.</span>
                            </div>
                          ) : stageTriggers.map((item) => {
                            const meta = item.pipeline;
                            if (!meta) return null;

                            const targetStageName = stages.find((target) => target.id === meta.targetStageId)?.name;
                            const actionResourceName = meta.action === 'salesbot'
                              ? salesBots.find((bot) => bot.id === meta.resourceId)?.name
                              : meta.action === 'ai'
                                ? aiAgents.find((agent) => agent.id === meta.resourceId)?.name
                                : undefined;
                            const conditionName = meta.event === 'time'
                              ? meta.value
                              : meta.event === 'salesbot_done' || meta.event === 'salesbot_failed'
                                ? salesBots.find((bot) => bot.id === meta.value)?.name
                                : meta.event === 'ai_done'
                                  ? aiAgents.find((agent) => agent.id === meta.value)?.name
                                  : meta.event === 'tag_added'
                                    ? state.tags.find((tag) => tag.id === meta.value)?.name
                                    : meta.event === 'field_changed'
                                      ? state.customFieldDefinitions.find((field) => field.id === meta.value)?.name
                                      : undefined;
                            const actionDetail = meta.action === 'move_stage'
                              ? targetStageName
                              : actionResourceName;

                            return (
                              <article key={item.id} className={styles.stageTriggerCard}>
                                <div className={styles.stageTriggerIcon}>⚡</div>
                                <div className={styles.stageTriggerCopy}>
                                  <span>QUANDO</span>
                                  <strong>{pipelineTriggerEventLabels[meta.event]}</strong>
                                  {conditionName ? <small>{conditionName}</small> : null}
                                  <i>ENTÃO</i>
                                  <b>{pipelineTriggerActionLabels[meta.action]}</b>
                                  {actionDetail ? <small>{actionDetail}</small> : null}
                                </div>
                                {canManage ? (
                                  <div className={styles.stageTriggerActions}>
                                    <button type="button" onClick={() => openTriggerModal(stage.id, item.id)}>Editar</button>
                                    <button type="button" className={styles.stageTriggerDelete} onClick={() => removeTrigger(item.id)}>Excluir</button>
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>

                        {canManage ? (
                          <button className={styles.addStageTrigger} type="button" onClick={() => openTriggerModal(stage.id)}>
                            + Adicionar gatilho
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className={styles.leadList}>
                        {leads.length === 0 ? (
                          <div className={styles.columnEmpty}>Arraste um lead para esta etapa ou crie um novo.</div>
                        ) : (
                          leads.map((lead) => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              state={state}
                              assignees={assignees}
                              selected={lead.id === selectedLeadId}
                              onSelect={() => setSelectedLeadId(lead.id)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.crmEmptyBoard}>
            <div>
              <strong>Crie um funil para começar</strong>
              <span>Depois adicione etapas e leads reais.</span>
            </div>
          </div>
        )}
      </div>

      {triggerModalStageId ? (
        <div className={styles.crmModalBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeTriggerModal();
        }}>
          <form className={`${styles.crmModalCard} ${styles.triggerModalCard}`} onSubmit={handleAddTrigger}>
            <div className={styles.crmModalHead}>
              <div>
                <small>GATILHO DA PIPELINE</small>
                <h2>{editingTriggerId ? 'Editar gatilho' : 'Adicionar gatilho'}</h2>
                <p>{stages.find((stage) => stage.id === triggerModalStageId)?.name}</p>
              </div>
              <button type="button" onClick={closeTriggerModal}>×</button>
            </div>

            <div className={styles.triggerFormGrid}>
              <label className={styles.triggerWide}>
                Quando isso acontecer
                <select value={triggerEvent} onChange={(event) => {
                  setTriggerEvent(event.target.value as PipelineTriggerEvent);
                  setTriggerValue('');
                }}>
                  <option value="enter">Lead entrou na etapa</option>
                  <option value="created_or_moved">Lead criado ou movido para etapa</option>
                  <option value="leave">Lead saiu da etapa</option>
                  <option value="time">Lead está há X tempo na etapa</option>
                  <option value="salesbot_done">SalesBot concluiu</option>
                  <option value="salesbot_failed">SalesBot falhou</option>
                  <option value="ai_done">Agente IA concluiu o serviço</option>
                  <option value="tag_added">Tag adicionada</option>
                  <option value="field_changed">Campo personalizado alterado</option>
                  <option value="created">Lead criado no funil</option>
                </select>
              </label>

              {triggerEvent === 'time' ? (
                <div className={`${styles.triggerDuration} ${styles.triggerWide}`}>
                  <label>
                    Tempo
                    <input type="number" min="1" value={triggerDurationAmount} onChange={(event) => setTriggerDurationAmount(event.target.value)} />
                  </label>
                  <label>
                    Unidade
                    <select value={triggerDurationUnit} onChange={(event) => setTriggerDurationUnit(event.target.value as 'm' | 'h' | 'd')}>
                      <option value="m">Minutos</option>
                      <option value="h">Horas</option>
                      <option value="d">Dias</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {triggerEvent === 'salesbot_done' || triggerEvent === 'salesbot_failed' ? (
                <label className={styles.triggerWide}>
                  Qual SalesBot
                  <select value={triggerValue} onChange={(event) => setTriggerValue(event.target.value)}>
                    <option value="">Qualquer SalesBot</option>
                    {salesBots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
                  </select>
                </label>
              ) : null}

              {triggerEvent === 'ai_done' ? (
                <label className={styles.triggerWide}>
                  Qual agente IA
                  <select value={triggerValue} onChange={(event) => setTriggerValue(event.target.value)}>
                    <option value="">Qualquer agente IA</option>
                    {aiAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                  </select>
                </label>
              ) : null}

              {triggerEvent === 'tag_added' ? (
                <label className={styles.triggerWide}>
                  Qual tag
                  <select value={triggerValue} onChange={(event) => setTriggerValue(event.target.value)}>
                    <option value="">Qualquer tag</option>
                    {state.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                  </select>
                </label>
              ) : null}

              {triggerEvent === 'field_changed' ? (
                <label className={styles.triggerWide}>
                  Qual campo personalizado
                  <select value={triggerValue} onChange={(event) => setTriggerValue(event.target.value)}>
                    <option value="">Qualquer campo</option>
                    {state.customFieldDefinitions.filter((field) => field.active).map((field) => (
                      <option key={field.id} value={field.id}>{field.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className={styles.triggerWide}>
                Então faça isso
                <select value={triggerAction} onChange={(event) => {
                  setTriggerAction(event.target.value as PipelineTriggerAction);
                  setTriggerResourceId('');
                  setTriggerTargetStageId('');
                }}>
                  <option value="move_stage">Mover lead para etapa</option>
                  <option value="salesbot">Iniciar SalesBot</option>
                  <option value="ai">Iniciar Agente IA</option>
                </select>
              </label>

              {triggerAction === 'move_stage' ? (
                <label className={styles.triggerWide}>
                  Mover para
                  <select value={triggerTargetStageId} onChange={(event) => setTriggerTargetStageId(event.target.value)} required>
                    <option value="">Selecione a etapa destino</option>
                    {stages.filter((stage) => stage.id !== triggerModalStageId).map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {triggerAction === 'salesbot' ? (
                <label className={styles.triggerWide}>
                  SalesBot
                  <select value={triggerResourceId} onChange={(event) => setTriggerResourceId(event.target.value)} required>
                    <option value="">Selecione o SalesBot</option>
                    {salesBots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}{bot.status === 'active' ? '' : ' · inativo'}</option>)}
                  </select>
                </label>
              ) : null}

              {triggerAction === 'ai' ? (
                <label className={styles.triggerWide}>
                  Agente IA
                  <select value={triggerResourceId} onChange={(event) => setTriggerResourceId(event.target.value)} required>
                    <option value="">Selecione o agente</option>
                    {aiAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}{agent.status === 'active' ? '' : ' · inativo'}</option>)}
                  </select>
                </label>
              ) : null}
            </div>

            <div className={styles.crmModalActions}>
              <button type="button" onClick={closeTriggerModal}>Cancelar</button>
              <button type="submit">{editingTriggerId ? 'Salvar gatilho' : 'Adicionar gatilho'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {pipelineModalOpen ? (
        <div className={styles.crmModalBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPipelineModalOpen(false);
        }}>
          <form className={styles.crmModalCard} onSubmit={handleCreatePipeline}>
            <div className={styles.crmModalHead}><div><small>FUNIL</small><h2>Novo funil</h2></div><button type="button" onClick={() => setPipelineModalOpen(false)}>×</button></div>
            <label>Nome<input name="pipelineName" required autoFocus placeholder="Nome do novo funil" /></label>
            <div className={styles.crmModalActions}><button type="button" onClick={() => setPipelineModalOpen(false)}>Cancelar</button><button type="submit">Salvar funil</button></div>
          </form>
        </div>
      ) : null}

      {leadModalOpen ? (
        <div className={styles.crmModalBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLeadModalOpen(false);
        }}>
          <form className={`${styles.crmModalCard} ${styles.crmLeadModal}`} onSubmit={handleCreateLead}>
            <div className={styles.crmModalHead}><div><small>LEAD</small><h2>Novo lead</h2></div><button type="button" onClick={() => setLeadModalOpen(false)}>×</button></div>
            <div className={styles.crmLeadForm}>
              <label>Nome<input name="name" required autoFocus placeholder="Nome do contato" /></label>
              <label>WhatsApp<input name="whatsapp" placeholder="(00) 00000-0000" /></label>
              <label>E-mail<input name="email" type="email" placeholder="email@cliente.com" /></label>
              <label>Origem<input name="source" placeholder="Instagram, indicação, site..." /></label>
              <label>Etapa<select name="stageId" defaultValue={stages[0]?.id ?? ''}><option value="">Sem etapa</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
              <label>Tipo de interesse<select name="interestType" defaultValue=""><option value="">Não informado</option>{interestTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label>Interesse<input name="interestLabel" placeholder="Imóvel, produto ou serviço" /></label>
              <label>Referência<input name="interestReferenceId" placeholder="ID opcional" /></label>
            </div>
            <div className={styles.crmModalActions}><button type="button" onClick={() => setLeadModalOpen(false)}>Cancelar</button><button type="submit">Salvar lead</button></div>
          </form>
        </div>
      ) : null}

      {selectedLead && (
        <LeadDetailsPanel
          lead={selectedLead}
          state={state}
          service={service}
          assignees={assignees}
          onClose={() => setSelectedLeadId(undefined)}
          onChanged={(message) => refresh(message)}
          onError={setFeedback}
          canManage={canManage}
          catalogRepository={catalogRepository}
          inboxService={inboxService}
          onOpenInbox={() => navigate(`/interno/inbox?lead=${encodeURIComponent(selectedLead.id)}`)}
        />
      )}
    </section>
  );
}

function LeadCard({ lead, state, assignees, selected, onSelect }: {
  lead: Lead;
  state: CrmState;
  assignees: AssigneeOption[];
  selected: boolean;
  onSelect: () => void;
}) {
  const tags = state.tags.filter((tag) => lead.tagIds.includes(tag.id));
  const assignee = assignees.find((item) => item.id === lead.assigneeId);
  return (
    <button
      type="button"
      draggable
      className={selected ? `${styles.leadCard} ${styles.leadCardSelected}` : styles.leadCard}
      onDragStart={(event) => event.dataTransfer.setData('text/harpia-lead', lead.id)}
      onClick={onSelect}
    >
      <div className={styles.leadCardTop}>
        <span className={styles.leadAvatar}>{lead.name.trim().charAt(0).toUpperCase() || 'L'}</span>
        <div className={styles.leadIdentity}>
          <strong>{lead.name}</strong>
          <span className={styles.leadContext}>{lead.interest?.label || lead.source || 'Sem contexto informado'}</span>
        </div>
      </div>
      <div className={styles.leadMeta}>
        <span>{lead.source || 'Origem não informada'}</span>
        {assignee && <small>{assignee.name}</small>}
      </div>
      {tags.length > 0 && <div className={styles.tagRow}>{tags.map((tag) => <em key={tag.id}>{tag.name}</em>)}</div>}
    </button>
  );
}

function LeadDetailsPanel({
  lead,
  state,
  service,
  assignees,
  onClose,
  onChanged,
  onError,
  canManage,
  catalogRepository,
  inboxService,
  onOpenInbox,
}: {
  lead: Lead;
  state: CrmState;
  service: CrmService;
  assignees: AssigneeOption[];
  onClose: () => void;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
  canManage: boolean;
  catalogRepository?: CatalogRepository;
  inboxService?: InboxService;
  onOpenInbox: () => void;
}) {
  const history = service.getLeadHistory(lead.id);
  const tasks = service.getLeadTasks(lead.id);
  const availableTags = state.tags.filter((tag) => !lead.tagIds.includes(tag.id));
  const inboxSnapshot = inboxService?.snapshot();
  const inboxConversation = inboxSnapshot?.conversations.find((conversation) => conversation.leadId === lead.id);
  const inboxMessages = inboxConversation && inboxService
    ? inboxService.getMessages(inboxConversation.id).slice(-8)
    : [];

  const safeRun = (action: () => void, message: string) => {
    try {
      action();
      onChanged(message);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível concluir a ação.');
    }
  };

  const submitLeadEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const interestType = String(form.get('interestType') ?? '') as InterestType | '';
    const interestLabel = String(form.get('interestLabel') ?? '').trim();
    const interestReferenceId = String(form.get('interestReferenceId') ?? '').trim();

    safeRun(() => service.updateLead(lead.id, {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      whatsapp: String(form.get('whatsapp') ?? ''),
      source: String(form.get('source') ?? ''),
      sourcePage: String(form.get('sourcePage') ?? ''),
      sourceAction: String(form.get('sourceAction') ?? ''),
      notes: String(form.get('notes') ?? ''),
      interest: interestType
        ? { type: interestType, label: interestLabel || undefined, referenceId: interestReferenceId || undefined }
        : undefined,
    }), 'Dados e observações do lead atualizados.');
  };

  const submitTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const tag = service.createTag(String(form.get('tagName') ?? ''));
      service.addTagToLead(lead.id, tag.id);
      event.currentTarget.reset();
      onChanged('Tag adicionada ao lead.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível adicionar a tag.');
    }
  };

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      service.createTask({
        leadId: lead.id,
        title: String(form.get('taskTitle') ?? ''),
        dueAt: String(form.get('dueAt') ?? '') || undefined,
        assigneeId: String(form.get('taskAssigneeId') ?? '') || undefined,
        notes: String(form.get('taskNotes') ?? '') || undefined,
      });
      event.currentTarget.reset();
      onChanged('Próxima ação criada.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível criar a tarefa.');
    }
  };

  const submitCustomField = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get('fieldType') ?? 'text') as CustomFieldType;
    const options = String(form.get('fieldOptions') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    try {
      service.createCustomField({
        name: String(form.get('fieldName') ?? ''),
        type,
        options: type === 'select' || type === 'multiselect' ? options : undefined,
      });
      event.currentTarget.reset();
      onChanged('Campo personalizado criado.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível criar o campo.');
    }
  };

  return (
    <aside className={styles.drawer} aria-label={`Detalhes de ${lead.name}`}>
      <div className={styles.drawerHeader}>
        <div><span>Lead 360º</span><h2>{lead.name}</h2></div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes">×</button>
      </div>

      <div className={styles.inboxDrawerSection}>
        <div className={styles.inboxDrawerHeading}>
          <div>
            <span>INBOX</span>
            <h3>Conversa do lead</h3>
          </div>
          <button type="button" onClick={onOpenInbox}>Abrir no Inbox</button>
        </div>
        <div className={styles.inboxDrawerMessages}>
          {inboxConversation ? (
            inboxMessages.length > 0 ? (
              inboxMessages.map((message) => (
                <div
                  key={message.id}
                  className={message.direction === 'outbound' ? styles.inboxDrawerMessageOut : styles.inboxDrawerMessageIn}
                >
                  <p>{message.text || (message.attachment?.name ? `Arquivo: ${message.attachment.name}` : message.type)}</p>
                  <small>{formatRuntimeDateTime(message.createdAt)}</small>
                </div>
              ))
            ) : (
              <div className={styles.inboxDrawerEmpty}>Conversa aberta, ainda sem mensagens.</div>
            )
          ) : (
            <div className={styles.inboxDrawerEmpty}>Este lead ainda não tem conversa vinculada na Inbox.</div>
          )}
        </div>
      </div>

      <div className={styles.detailSection}>
        <h3>Contato, contexto e observações</h3>
        <form className={styles.taskForm} onSubmit={submitLeadEdit}>
          <input name="name" required defaultValue={lead.name} placeholder="Nome" />
          <input name="email" type="email" defaultValue={lead.email ?? ''} placeholder="E-mail" />
          <input name="whatsapp" defaultValue={lead.whatsapp ?? ''} placeholder="WhatsApp" />
          <input name="source" defaultValue={lead.source ?? ''} placeholder="Origem" />
          <input name="sourcePage" defaultValue={lead.sourcePage ?? ''} placeholder="Página de origem" />
          <input name="sourceAction" defaultValue={lead.sourceAction ?? ''} placeholder="Ação de origem" />
          <select name="interestType" defaultValue={lead.interest?.type ?? ''}>
            <option value="">Sem tipo de interesse</option>
            {interestTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input name="interestLabel" defaultValue={lead.interest?.label ?? ''} placeholder="Interesse" />
          <input name="interestReferenceId" defaultValue={lead.interest?.referenceId ?? ''} placeholder="ID/referência" />
          <textarea
            name="notes"
            rows={4}
            defaultValue={lead.notes ?? ''}
            placeholder="Observações internas"
            style={{ gridColumn: '1 / -1', resize: 'vertical', border: '1px solid #cbc5ba', borderRadius: 10, padding: '10px 12px' }}
          />
          <button type="submit">Salvar ficha do lead</button>
        </form>
      </div>

      <div className={styles.detailSection}>
        <h3>Responsável</h3>
        <select
          value={lead.assigneeId ?? ''}
          onChange={(event) => safeRun(() => service.assignLead(lead.id, event.target.value || undefined), 'Responsável atualizado.')}
        >
          <option value="">Sem responsável</option>
          {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
        </select>
        {assignees.length === 0 && <small>Aguardando usuários internos da Frente01.</small>}
      </div>

      <div className={styles.detailSection}>
        <h3>Tags</h3>
        <div className={styles.tagManager}>
          {lead.tagIds.map((tagId) => {
            const tag = state.tags.find((item) => item.id === tagId);
            if (!tag) return null;
            return <button key={tag.id} type="button" title="Remover tag" onClick={() => safeRun(() => service.removeTagFromLead(lead.id, tag.id), 'Tag removida.')}>{tag.name} ×</button>;
          })}
          {availableTags.length > 0 && (
            <select value="" onChange={(event) => event.target.value && safeRun(() => service.addTagToLead(lead.id, event.target.value), 'Tag adicionada.')}>
              <option value="">Adicionar existente…</option>
              {availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          )}
        </div>
        <form className={styles.compactForm} onSubmit={submitTag}>
          <input name="tagName" required placeholder="Nova tag" />
          <button type="submit">Adicionar</button>
        </form>
      </div>

      {catalogRepository && (
        <LeadProductsPanel
          leadId={lead.id}
          catalogRepository={catalogRepository}
          canManage={canManage}
          onChanged={onChanged}
          onError={onError}
          waitForCrmPersistence={() => service.waitForPersistence()}
        />
      )}

      <div className={styles.detailSection}>
        <h3>Campos personalizados</h3>
        <form className={styles.taskForm} onSubmit={submitCustomField}>
          <input name="fieldName" required placeholder="Nome do campo" />
          <select name="fieldType" defaultValue="text">
            {customFieldTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input name="fieldOptions" placeholder="Opções separadas por vírgula (se aplicável)" style={{ gridColumn: '1 / -1' }} />
          <button type="submit">Criar campo</button>
        </form>
        {state.customFieldDefinitions.length === 0 ? (
          <small>Nenhum campo personalizado configurado.</small>
        ) : (
          state.customFieldDefinitions.filter((field) => field.active).map((field) => (
            <CustomFieldEditor
              key={field.id}
              field={field}
              value={lead.customFields[field.id]}
              onChange={(value) => safeRun(() => service.setCustomFieldValue(lead.id, field.id, value), 'Campo personalizado atualizado.')}
            />
          ))
        )}
      </div>

      <div className={styles.detailSection}>
        <h3>Próximas ações</h3>
        <form className={styles.taskForm} onSubmit={submitTask}>
          <input name="taskTitle" required placeholder="Nova tarefa" />
          <input name="dueAt" type="datetime-local" />
          <select name="taskAssigneeId" defaultValue="">
            <option value="">Sem responsável</option>
            {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
          </select>
          <input name="taskNotes" placeholder="Observação da tarefa" />
          <button type="submit">Criar</button>
        </form>
        {tasks.length === 0 ? (
          <small>Nenhuma próxima ação cadastrada.</small>
        ) : (
          <ul className={styles.taskList}>
            {tasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.dueAt ? formatRuntimeDateTime(task.dueAt) : 'Sem prazo'}</span>
                  {task.notes && <span>{task.notes}</span>}
                </div>
                <select value={task.status} onChange={(event) => safeRun(() => service.updateTaskStatus(task.id, event.target.value as typeof task.status), 'Tarefa atualizada.')}>
                  <option value="pending">Pendente</option>
                  <option value="done">Concluída</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.detailSection}>
        <h3>Histórico</h3>
        {history.length === 0 ? (
          <small>{emptyMessage}</small>
        ) : (
          <ol className={styles.historyList}>
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.description}</strong>
                <span>{formatRuntimeDateTime(entry.createdAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

function CustomFieldEditor({ field, value, onChange }: {
  field: CustomFieldDefinition;
  value: Lead['customFields'][string];
  onChange: (value: Lead['customFields'][string]) => void;
}) {
  if (field.type === 'boolean') {
    return <label className={styles.fieldEditor}><span>{field.name}</span><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /></label>;
  }
  if (field.type === 'select') {
    return (
      <label className={styles.fieldEditor}>
        <span>{field.name}</span>
        <select value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value || null)}>
          <option value="">Não informado</option>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className={styles.detailSection} style={{ padding: 0, border: 0 }}>
        <legend style={{ fontSize: 12, marginBottom: 6 }}>{field.name}</legend>
        <div className={styles.tagManager}>
          {(field.options ?? []).map((option) => (
            <label key={option} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className={styles.fieldEditor}>
      <span>{field.name}</span>
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(event) => {
          if (field.type === 'number') {
            onChange(event.target.value === '' ? null : Number(event.target.value));
            return;
          }
          onChange(event.target.value || null);
        }}
      />
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className={styles.emptyState}><span>◌</span><h2>{title}</h2><p>{description}</p></div>;
}

export function isCrmIntegrityError(error: unknown): error is CrmIntegrityError {
  return error instanceof CrmIntegrityError;
}
