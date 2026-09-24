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
import { AppLink } from '../../core/router/router';
import styles from './crm.module.css';

export interface AssigneeOption {
  id: string;
  name: string;
}

export interface CrmWorkspaceProps {
  service?: CrmService;
  assignees?: AssigneeOption[];
  canManage?: boolean;
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

export function CrmWorkspace({
  service: injectedService,
  assignees = [],
  canManage = true
}: CrmWorkspaceProps) {
  const service = useMemo(
    () => injectedService ?? new CrmService(new BrowserCrmRepository()),
    [injectedService],
  );
  const [state, setState] = useState<CrmState>(() => service.snapshot());
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(
    () => service.snapshot().pipelines.find((pipeline) => pipeline.active)?.id,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState('');

  const refresh = (message?: string) => {
    const snapshot = service.snapshot();
    setState(snapshot);
    if (message) setFeedback(message);

    if (selectedPipelineId && !snapshot.pipelines.some((pipeline) => pipeline.id === selectedPipelineId)) {
      setSelectedPipelineId(snapshot.pipelines[0]?.id);
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
  const selectedPipelineLeads = selectedPipeline
    ? state.leads.filter((lead) => lead.pipelineId === selectedPipeline.id)
    : [];

  const handleCreatePipeline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('pipelineName') ?? '');
    try {
      const pipeline = service.createPipeline(name);
      setSelectedPipelineId(pipeline.id);
      event.currentTarget.reset();
      refresh('Funil criado. Agora adicione as etapas conforme a operação real.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar o funil.');
    }
  };

  const handleCreateStage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPipeline) return;
    const form = new FormData(event.currentTarget);
    run(() => service.createStage(selectedPipeline.id, String(form.get('stageName') ?? '')), 'Etapa criada.');
    event.currentTarget.reset();
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
    run(() => service.removeStage(stage.id), 'Etapa removida.');
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>, stageId: CrmId) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData('text/harpia-lead');
    if (!leadId) return;
    run(() => service.moveLead(leadId, stageId), 'Lead movido de etapa.');
  };

  return (
    <section className={styles.workspace} aria-label="CRM Hárpia">
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>CRM</span>
          <h1>Relacionamento comercial</h1>
          <p>Funis configuráveis, contexto completo do lead e histórico preservado.</p>
        </div>
        <div className={styles.headerBadge}>
          <strong>{state.leads.length}</strong>
          <span>leads reais</span>
        </div>
      </header>

      {feedback && (
        <div className={styles.feedback} role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <div className={styles.pipelineBar}>
        <div className={styles.pipelineTabs}>
          {state.pipelines.length === 0 ? (
            <span className={styles.muted}>Nenhum funil configurado.</span>
          ) : (
            state.pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                type="button"
                className={pipeline.id === selectedPipelineId ? styles.activeTab : styles.tab}
                onClick={() => {
                  setSelectedPipelineId(pipeline.id);
                  setSelectedLeadId(undefined);
                }}
              >
                {pipeline.name}
                {!pipeline.active && <small>pausado</small>}
              </button>
            ))
          )}
        </div>

        <form className={styles.inlineForm} onSubmit={handleCreatePipeline}>
          <input name="pipelineName" required placeholder="Novo funil" aria-label="Nome do novo funil" />
          <button type="submit">Criar funil</button>
        </form>
      </div>

      {selectedPipeline ? (
        <>
          <div className={styles.toolbar}>
            <div className={styles.toolbarTitle}>
              <div>
                <strong>{selectedPipeline.name}</strong>
                <span className={selectedPipeline.active ? styles.statusActive : styles.statusPaused}>
                  {selectedPipeline.active ? 'Ativo' : 'Desativado'}
                </span>
              </div>
              <div className={styles.pipelineSummary} aria-label="Resumo do funil">
                <span><strong>{stages.length}</strong> etapas</span>
                <span><strong>{selectedPipelineLeads.length}</strong> leads</span>
              </div>
            </div>
            <div className={styles.toolbarActions}>
              <AppLink className={styles.automateLink} href="/interno/automatize">Automatize</AppLink>
              <button type="button" onClick={duplicatePipeline}>Duplicar funil</button>
              <button type="button" onClick={renamePipeline}>Renomear</button>
              <button
                type="button"
                onClick={() => run(
                  () => service.setPipelineActive(selectedPipeline.id, !selectedPipeline.active),
                  selectedPipeline.active ? 'Funil desativado.' : 'Funil ativado.',
                )}
              >
                {selectedPipeline.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>

          <div className={styles.creationGrid}>
            <form className={styles.cardForm} onSubmit={handleCreateStage}>
              <div>
                <strong>Adicionar etapa</strong>
                <span>Você define a operação; nada vem pré-configurado.</span>
              </div>
              <input name="stageName" required placeholder="Ex.: Qualificação" aria-label="Nome da etapa" />
              <button type="submit">Adicionar</button>
            </form>

            <form className={styles.cardForm} onSubmit={handleCreateLead}>
              <div>
                <strong>Novo lead</strong>
                <span>Criar o lead não envia mensagem automaticamente.</span>
              </div>
              <div className={styles.formFields}>
                <input name="name" required placeholder="Nome" />
                <input name="email" type="email" placeholder="E-mail" />
                <input name="whatsapp" placeholder="WhatsApp" />
                <input name="source" placeholder="Origem" />
                <select name="stageId" defaultValue="">
                  <option value="">Sem etapa</option>
                  {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                </select>
                <select name="interestType" defaultValue="">
                  <option value="">Tipo de interesse</option>
                  {interestTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <input name="interestLabel" placeholder="Imóvel/produto/serviço" />
                <input name="interestReferenceId" placeholder="ID/referência (opcional)" />
              </div>
              <button type="submit">Criar lead</button>
            </form>
          </div>

          {stages.length === 0 ? (
            <EmptyState
              title="Crie a primeira etapa do funil"
              description="O CRM começa vazio de propósito. Adicione somente etapas que façam sentido para a operação real."
            />
          ) : (
            <div className={styles.kanban}>
              {stages.map((stage) => {
                const leads = state.leads.filter((lead) => lead.stageId === stage.id);
                return (
                  <div
                    className={styles.column}
                    key={stage.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, stage.id)}
                  >
                    <div className={styles.columnHeader}>
                      <div>
                        <strong>{stage.name}</strong>
                        <span>{leads.length}</span>
                      </div>
                      <div className={styles.stageActions}>
                        <button type="button" onClick={() => moveStage(stage, -1)} aria-label="Mover etapa para esquerda">←</button>
                        <button type="button" onClick={() => moveStage(stage, 1)} aria-label="Mover etapa para direita">→</button>
                        <button type="button" onClick={() => renameStage(stage)} aria-label="Renomear etapa">✎</button>
                        <button type="button" onClick={() => removeStage(stage)} aria-label="Remover etapa">×</button>
                      </div>
                    </div>
                    <div className={styles.leadList}>
                      {leads.length === 0 ? (
                        <div className={styles.columnEmpty}>Sem leads nesta etapa.</div>
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
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="CRM pronto para configuração"
          description="Crie um funil para começar. Nenhum funil ou lead fictício foi inserido."
        />
      )}

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
      <strong>{lead.name}</strong>
      <span>{lead.interest?.label || lead.source || 'Sem contexto informado'}</span>
      {assignee && <small>Responsável: {assignee.name}</small>}
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
  canManage
}: {
  lead: Lead;
  state: CrmState;
  service: CrmService;
  assignees: AssigneeOption[];
  onClose: () => void;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
  canManage: boolean;
}) {
  const history = service.getLeadHistory(lead.id);
  const tasks = service.getLeadTasks(lead.id);
  const availableTags = state.tags.filter((tag) => !lead.tagIds.includes(tag.id));

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
                  <span>{task.dueAt ? new Date(task.dueAt).toLocaleString('pt-BR') : 'Sem prazo'}</span>
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
                <span>{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
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
