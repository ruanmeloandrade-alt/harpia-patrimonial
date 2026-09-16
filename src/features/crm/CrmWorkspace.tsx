import {
  DragEvent as ReactDragEvent,
  FormEvent,
  useMemo,
  useState,
} from 'react';
import { CrmId, CrmState, CustomFieldDefinition, Lead, PipelineStage } from './domain';
import { BrowserCrmRepository } from './repository';
import { CrmIntegrityError, CrmService } from './service';
import styles from './crm.module.css';

export interface AssigneeOption {
  id: string;
  name: string;
}

export interface CrmWorkspaceProps {
  service?: CrmService;
  assignees?: AssigneeOption[];
}

const emptyMessage = 'Nenhum dado real cadastrado ainda.';

export function CrmWorkspace({ service: injectedService, assignees = [] }: CrmWorkspaceProps) {
  const service = useMemo(
    () => injectedService ?? new CrmService(new BrowserCrmRepository()),
    [injectedService],
  );
  const [state, setState] = useState<CrmState>(() => service.snapshot());
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(
    () => service.snapshot().pipelines.find((pipeline) => pipeline.active)?.id,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string>('');

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
    const name = String(form.get('stageName') ?? '');
    run(() => service.createStage(selectedPipeline.id, name), 'Etapa criada.');
    event.currentTarget.reset();
  };

  const handleCreateLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const stageId = String(form.get('stageId') ?? '') || undefined;
    try {
      const lead = service.createLead({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        whatsapp: String(form.get('whatsapp') ?? ''),
        source: String(form.get('source') ?? ''),
        pipelineId: selectedPipeline?.id,
        stageId,
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
          <input name="pipelineName" placeholder="Novo funil" aria-label="Nome do novo funil" />
          <button type="submit">Criar funil</button>
        </form>
      </div>

      {selectedPipeline ? (
        <>
          <div className={styles.toolbar}>
            <div>
              <strong>{selectedPipeline.name}</strong>
              <span>{selectedPipeline.active ? 'Ativo' : 'Desativado'}</span>
            </div>
            <div className={styles.toolbarActions}>
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
              <input name="stageName" placeholder="Ex.: Qualificação" aria-label="Nome da etapa" />
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
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
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
        />
      )}
    </section>
  );
}

function LeadCard({
  lead,
  state,
  assignees,
  selected,
  onSelect,
}: {
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
      {tags.length > 0 && (
        <div className={styles.tagRow}>
          {tags.map((tag) => <em key={tag.id}>{tag.name}</em>)}
        </div>
      )}
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
}: {
  lead: Lead;
  state: CrmState;
  service: CrmService;
  assignees: AssigneeOption[];
  onClose: () => void;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
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

  const submitTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('tagName') ?? '');
    try {
      const tag = service.createTag(name);
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
      });
      event.currentTarget.reset();
      onChanged('Próxima ação criada.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível criar a tarefa.');
    }
  };

  const createField = () => {
    const name = window.prompt('Nome do campo personalizado');
    if (!name) return;
    safeRun(() => service.createCustomField({ name, type: 'text' }), 'Campo personalizado criado.');
  };

  return (
    <aside className={styles.drawer} aria-label={`Detalhes de ${lead.name}`}>
      <div className={styles.drawerHeader}>
        <div>
          <span>Lead</span>
          <h2>{lead.name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes">×</button>
      </div>

      <div className={styles.detailSection}>
        <h3>Contato e contexto</h3>
        <dl className={styles.detailsList}>
          <dt>E-mail</dt><dd>{lead.email || 'Não informado'}</dd>
          <dt>WhatsApp</dt><dd>{lead.whatsapp || 'Não informado'}</dd>
          <dt>Origem</dt><dd>{lead.source || 'Não informada'}</dd>
          <dt>Página/ação</dt><dd>{lead.sourcePage || lead.sourceAction || 'Não informada'}</dd>
          <dt>Interesse</dt><dd>{lead.interest?.label || 'Não informado'}</dd>
        </dl>
      </div>

      <div className={styles.detailSection}>
        <h3>Responsável</h3>
        <select
          value={lead.assigneeId ?? ''}
          onChange={(event) => safeRun(
            () => service.assignLead(lead.id, event.target.value || undefined),
            'Responsável atualizado.',
          )}
        >
          <option value="">Sem responsável</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
          ))}
        </select>
        {assignees.length === 0 && <small>Aguardando usuários internos da Frente01.</small>}
      </div>

      <div className={styles.detailSection}>
        <h3>Tags</h3>
        <div className={styles.tagManager}>
          {lead.tagIds.map((tagId) => {
            const tag = state.tags.find((item) => item.id === tagId);
            if (!tag) return null;
            return (
              <button
                key={tag.id}
                type="button"
                title="Remover tag"
                onClick={() => safeRun(() => service.removeTagFromLead(lead.id, tag.id), 'Tag removida.')}
              >
                {tag.name} ×
              </button>
            );
          })}
          {availableTags.length > 0 && (
            <select
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                safeRun(() => service.addTagToLead(lead.id, event.target.value), 'Tag adicionada.');
              }}
            >
              <option value="">Adicionar existente…</option>
              {availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          )}
        </div>
        <form className={styles.compactForm} onSubmit={submitTag}>
          <input name="tagName" placeholder="Nova tag" />
          <button type="submit">Adicionar</button>
        </form>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionTitleRow}>
          <h3>Campos personalizados</h3>
          <button type="button" onClick={createField}>Criar campo</button>
        </div>
        {state.customFieldDefinitions.length === 0 ? (
          <small>Nenhum campo personalizado configurado.</small>
        ) : (
          state.customFieldDefinitions.filter((field) => field.active).map((field) => (
            <CustomFieldEditor
              key={field.id}
              field={field}
              value={lead.customFields[field.id]}
              onChange={(value) => safeRun(
                () => service.setCustomFieldValue(lead.id, field.id, value),
                'Campo personalizado atualizado.',
              )}
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
                </div>
                <select
                  value={task.status}
                  onChange={(event) => safeRun(
                    () => service.updateTaskStatus(task.id, event.target.value as typeof task.status),
                    'Tarefa atualizada.',
                  )}
                >
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

function CustomFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDefinition;
  value: Lead['customFields'][string];
  onChange: (value: Lead['customFields'][string]) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className={styles.fieldEditor}>
        <span>{field.name}</span>
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
      </label>
    );
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

  return (
    <label className={styles.fieldEditor}>
      <span>{field.name}</span>
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(event) => onChange(field.type === 'number' ? Number(event.target.value) : event.target.value || null)}
      />
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.emptyState}>
      <span>◌</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function isCrmIntegrityError(error: unknown): error is CrmIntegrityError {
  return error instanceof CrmIntegrityError;
}
