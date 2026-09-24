import {
  CrmEvent,
  CrmEventSink,
  CrmId,
  CrmState,
  CustomFieldDefinition,
  CustomFieldValue,
  Lead,
  LeadHistoryEntry,
  LeadInterest,
  LeadTask,
  Pipeline,
  PipelineStage,
  Tag,
  createCrmId,
  nowIso,
} from './domain';
import { CrmRepository } from './repository';

export class CrmIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmIntegrityError';
  }
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  whatsapp?: string;
  source?: string;
  sourceAction?: string;
  sourcePage?: string;
  sourceOccurredAt?: string;
  sourceMetadata?: Record<string, unknown>;
  interest?: LeadInterest;
  assigneeId?: string;
  pipelineId?: CrmId;
  stageId?: CrmId;
  notes?: string;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  whatsapp?: string;
  source?: string;
  sourceAction?: string;
  sourcePage?: string;
  interest?: LeadInterest;
  notes?: string;
  lastInteractionAt?: string;
}

export class CrmService {
  private state: CrmState;
  private readonly eventSinks = new Set<CrmEventSink>();

  constructor(private readonly repository: CrmRepository, sinks: CrmEventSink[] = []) {
    this.state = repository.load();
    sinks.forEach((sink) => this.eventSinks.add(sink));
  }

  snapshot(): CrmState {
    return JSON.parse(JSON.stringify(this.state)) as CrmState;
  }

  async waitForPersistence(): Promise<void> {
    await this.repository.waitForLastSave?.();
  }

  subscribeEvents(sink: CrmEventSink): () => void {
    this.eventSinks.add(sink);
    return () => this.eventSinks.delete(sink);
  }

  createPipeline(name: string): Pipeline {
    const cleanName = this.requireName(name, 'Nome do funil');
    const timestamp = nowIso();
    const pipeline: Pipeline = {
      id: createCrmId('pipeline'),
      name: cleanName,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.pipelines.push(pipeline);
    this.persist();
    return pipeline;
  }

  duplicatePipeline(pipelineId: CrmId, name?: string): Pipeline {
    const source = this.requirePipeline(pipelineId);
    const sourceStages = this.getStages(source.id);
    const timestamp = nowIso();
    const pipeline: Pipeline = {
      id: createCrmId('pipeline'),
      name: this.requireName(name ?? `Cópia de ${source.name}`, 'Nome do funil'),
      active: source.active,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const copiedStages = sourceStages.map((stage, position): PipelineStage => ({
      id: createCrmId('stage'),
      pipelineId: pipeline.id,
      name: stage.name,
      position,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    this.state.pipelines.push(pipeline);
    this.state.stages.push(...copiedStages);
    this.persist();
    return pipeline;
  }

  renamePipeline(pipelineId: CrmId, name: string): Pipeline {
    const pipeline = this.requirePipeline(pipelineId);
    pipeline.name = this.requireName(name, 'Nome do funil');
    pipeline.updatedAt = nowIso();
    this.persist();
    return pipeline;
  }

  setPipelineActive(pipelineId: CrmId, active: boolean): Pipeline {
    const pipeline = this.requirePipeline(pipelineId);
    pipeline.active = active;
    pipeline.updatedAt = nowIso();
    this.persist();
    return pipeline;
  }

  removePipeline(pipelineId: CrmId): void {
    const pipeline = this.requirePipeline(pipelineId);
    const leadCount = this.state.leads.filter((lead) => lead.pipelineId === pipeline.id).length;
    if (leadCount > 0) {
      throw new CrmIntegrityError(`Este funil possui ${leadCount} lead${leadCount === 1 ? '' : 's'}. Mova ou exclua os leads antes de apagar o funil.`);
    }

    this.state.stages = this.state.stages.filter((stage) => stage.pipelineId !== pipeline.id);
    this.state.pipelines = this.state.pipelines.filter((item) => item.id !== pipeline.id);
    this.persist();
  }

  createStage(pipelineId: CrmId, name: string): PipelineStage {
    this.requirePipeline(pipelineId);
    const siblings = this.getStages(pipelineId);
    const timestamp = nowIso();
    const stage: PipelineStage = {
      id: createCrmId('stage'),
      pipelineId,
      name: this.requireName(name, 'Nome da etapa'),
      position: siblings.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.stages.push(stage);
    this.persist();
    return stage;
  }

  renameStage(stageId: CrmId, name: string): PipelineStage {
    const stage = this.requireStage(stageId);
    stage.name = this.requireName(name, 'Nome da etapa');
    stage.updatedAt = nowIso();
    this.persist();
    return stage;
  }

  reorderStages(pipelineId: CrmId, orderedStageIds: CrmId[]): PipelineStage[] {
    this.requirePipeline(pipelineId);
    const current = this.getStages(pipelineId);
    const currentIds = new Set(current.map((stage) => stage.id));
    const requestedIds = new Set(orderedStageIds);

    if (currentIds.size !== requestedIds.size || [...currentIds].some((id) => !requestedIds.has(id))) {
      throw new CrmIntegrityError('A reordenação precisa conter exatamente as etapas do funil.');
    }

    const timestamp = nowIso();
    orderedStageIds.forEach((id, position) => {
      const stage = this.requireStage(id);
      stage.position = position;
      stage.updatedAt = timestamp;
    });
    this.persist();
    return this.getStages(pipelineId);
  }

  removeStage(stageId: CrmId): void {
    const stage = this.requireStage(stageId);
    const hasLeads = this.state.leads.some((lead) => lead.stageId === stageId);
    if (hasLeads) {
      throw new CrmIntegrityError('Não é possível remover uma etapa que ainda possui leads.');
    }

    this.state.stages = this.state.stages.filter((item) => item.id !== stageId);
    this.compactStagePositions(stage.pipelineId);
    this.persist();
  }

  getStages(pipelineId: CrmId): PipelineStage[] {
    return this.state.stages
      .filter((stage) => stage.pipelineId === pipelineId)
      .sort((a, b) => a.position - b.position);
  }

  createLead(input: CreateLeadInput): Lead {
    const timestamp = nowIso();
    const placement = this.validatePlacement(input.pipelineId, input.stageId);
    const lead: Lead = {
      id: createCrmId('lead'),
      name: this.requireName(input.name, 'Nome do lead'),
      email: this.cleanOptional(input.email),
      whatsapp: this.cleanOptional(input.whatsapp),
      source: this.cleanOptional(input.source),
      sourceAction: this.cleanOptional(input.sourceAction),
      sourcePage: this.cleanOptional(input.sourcePage),
      sourceOccurredAt: this.cleanOptional(input.sourceOccurredAt),
      sourceMetadata: input.sourceMetadata ? { ...input.sourceMetadata } : undefined,
      interest: input.interest,
      assigneeId: this.cleanOptional(input.assigneeId),
      pipelineId: placement.pipelineId,
      stageId: placement.stageId,
      tagIds: [],
      customFields: {},
      notes: this.cleanOptional(input.notes),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.state.leads.push(lead);
    this.addHistory(lead.id, 'lead_created', 'Lead criado no CRM.', {
      source: lead.source,
      sourceAction: lead.sourceAction,
      sourcePage: lead.sourcePage,
      sourceOccurredAt: lead.sourceOccurredAt,
      sourceMetadata: lead.sourceMetadata,
    });
    this.persist();
    this.publish('lead.created', lead.id, {
      source: lead.source ?? null,
      sourceAction: lead.sourceAction ?? null,
      sourcePage: lead.sourcePage ?? null,
      sourceOccurredAt: lead.sourceOccurredAt ?? null,
      sourceMetadata: lead.sourceMetadata ?? null,
      interest: lead.interest ?? null,
      pipelineId: lead.pipelineId ?? null,
      stageId: lead.stageId ?? null,
    });
    return lead;
  }

  updateLead(leadId: CrmId, input: UpdateLeadInput): Lead {
    const lead = this.requireLead(leadId);
    if (input.name !== undefined) lead.name = this.requireName(input.name, 'Nome do lead');
    if (input.email !== undefined) lead.email = this.cleanOptional(input.email);
    if (input.whatsapp !== undefined) lead.whatsapp = this.cleanOptional(input.whatsapp);
    if (input.source !== undefined) lead.source = this.cleanOptional(input.source);
    if (input.sourceAction !== undefined) lead.sourceAction = this.cleanOptional(input.sourceAction);
    if (input.sourcePage !== undefined) lead.sourcePage = this.cleanOptional(input.sourcePage);
    if (input.interest !== undefined) lead.interest = input.interest;
    if (input.notes !== undefined) lead.notes = this.cleanOptional(input.notes);
    if (input.lastInteractionAt !== undefined) lead.lastInteractionAt = input.lastInteractionAt;
    lead.updatedAt = nowIso();

    this.addHistory(lead.id, 'lead_updated', 'Dados do lead atualizados.');
    this.persist();
    this.publish('lead.updated', lead.id, {});
    return lead;
  }

  moveLead(leadId: CrmId, stageId: CrmId): Lead {
    const lead = this.requireLead(leadId);
    const stage = this.requireStage(stageId);
    if (lead.stageId === stage.id && lead.pipelineId === stage.pipelineId) return lead;

    const previousStageId = lead.stageId ?? null;
    lead.pipelineId = stage.pipelineId;
    lead.stageId = stage.id;
    lead.updatedAt = nowIso();

    this.addHistory(lead.id, 'stage_changed', 'Lead movido de etapa.', {
      previousStageId,
      stageId: stage.id,
      pipelineId: stage.pipelineId,
    });
    this.persist();
    this.publish('lead.stage_changed', lead.id, {
      previousStageId,
      stageId: stage.id,
      pipelineId: stage.pipelineId,
    });
    return lead;
  }

  assignLead(leadId: CrmId, assigneeId?: string): Lead {
    const lead = this.requireLead(leadId);
    const normalizedAssigneeId = this.cleanOptional(assigneeId);
    if (lead.assigneeId === normalizedAssigneeId) return lead;

    const previousAssigneeId = lead.assigneeId ?? null;
    lead.assigneeId = normalizedAssigneeId;
    lead.updatedAt = nowIso();
    this.addHistory(lead.id, 'assignee_changed', 'Responsável do lead alterado.', {
      previousAssigneeId,
      assigneeId: lead.assigneeId ?? null,
    });
    this.persist();
    this.publish('lead.assignee_changed', lead.id, {
      previousAssigneeId,
      assigneeId: lead.assigneeId ?? null,
    });
    return lead;
  }

  createTag(name: string): Tag {
    const cleanName = this.requireName(name, 'Nome da tag');
    const duplicate = this.state.tags.find((tag) => tag.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    if (duplicate) return duplicate;

    const timestamp = nowIso();
    const tag: Tag = {
      id: createCrmId('tag'),
      name: cleanName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.tags.push(tag);
    this.persist();
    return tag;
  }

  addTagToLead(leadId: CrmId, tagId: CrmId): Lead {
    const lead = this.requireLead(leadId);
    this.requireTag(tagId);
    if (lead.tagIds.includes(tagId)) return lead;

    lead.tagIds.push(tagId);
    lead.updatedAt = nowIso();
    this.addHistory(lead.id, 'tag_added', 'Tag adicionada ao lead.', { tagId });
    this.persist();
    this.publish('lead.tag_added', lead.id, { tagId });
    return lead;
  }

  removeTagFromLead(leadId: CrmId, tagId: CrmId): Lead {
    const lead = this.requireLead(leadId);
    if (!lead.tagIds.includes(tagId)) return lead;

    lead.tagIds = lead.tagIds.filter((id) => id !== tagId);
    lead.updatedAt = nowIso();
    this.addHistory(lead.id, 'tag_removed', 'Tag removida do lead.', { tagId });
    this.persist();
    this.publish('lead.tag_removed', lead.id, { tagId });
    return lead;
  }

  createCustomField(definition: Pick<CustomFieldDefinition, 'name' | 'type' | 'options'>): CustomFieldDefinition {
    const timestamp = nowIso();
    const field: CustomFieldDefinition = {
      id: createCrmId('field'),
      name: this.requireName(definition.name, 'Nome do campo'),
      type: definition.type,
      options: definition.options?.filter(Boolean),
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.customFieldDefinitions.push(field);
    this.persist();
    return field;
  }

  setCustomFieldValue(leadId: CrmId, fieldId: CrmId, value: CustomFieldValue): Lead {
    const lead = this.requireLead(leadId);
    const field = this.requireCustomField(fieldId);
    const previousValue = lead.customFields[fieldId] ?? null;
    if (this.sameCustomFieldValue(previousValue, value)) return lead;

    lead.customFields[fieldId] = value;
    lead.updatedAt = nowIso();
    this.addHistory(lead.id, 'custom_field_changed', `Campo “${field.name}” alterado.`, {
      fieldId,
      previousValue,
      value,
    });
    this.persist();
    this.publish('lead.custom_field_changed', lead.id, { fieldId, previousValue, value });
    return lead;
  }

  createTask(input: Omit<LeadTask, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: LeadTask['status'] }): LeadTask {
    this.requireLead(input.leadId);
    const timestamp = nowIso();
    const task: LeadTask = {
      id: createCrmId('task'),
      leadId: input.leadId,
      title: this.requireName(input.title, 'Título da tarefa'),
      assigneeId: this.cleanOptional(input.assigneeId),
      dueAt: input.dueAt,
      status: input.status ?? 'pending',
      notes: this.cleanOptional(input.notes),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.tasks.push(task);
    this.addHistory(task.leadId, 'task_created', 'Tarefa criada para o lead.', { taskId: task.id });
    this.persist();
    this.publish('lead.task_created', task.leadId, { taskId: task.id });
    return task;
  }

  updateTaskStatus(taskId: CrmId, status: LeadTask['status']): LeadTask {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) throw new CrmIntegrityError('Tarefa não encontrada.');
    if (task.status === status) return task;

    task.status = status;
    task.updatedAt = nowIso();
    this.addHistory(task.leadId, 'task_updated', 'Status da tarefa alterado.', { taskId, status });
    this.persist();
    this.publish('lead.task_updated', task.leadId, { taskId, status });
    return task;
  }

  getLeadHistory(leadId: CrmId): LeadHistoryEntry[] {
    this.requireLead(leadId);
    return this.state.history
      .filter((entry) => entry.leadId === leadId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getLeadTasks(leadId: CrmId): LeadTask[] {
    this.requireLead(leadId);
    return this.state.tasks
      .filter((task) => task.leadId === leadId)
      .sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt));
  }

  private validatePlacement(pipelineId?: CrmId, stageId?: CrmId): { pipelineId?: CrmId; stageId?: CrmId } {
    if (!pipelineId && !stageId) return {};
    if (!pipelineId && stageId) {
      const stage = this.requireStage(stageId);
      return { pipelineId: stage.pipelineId, stageId };
    }
    if (pipelineId && !stageId) {
      this.requirePipeline(pipelineId);
      return { pipelineId };
    }

    const pipeline = this.requirePipeline(pipelineId as CrmId);
    const stage = this.requireStage(stageId as CrmId);
    if (stage.pipelineId !== pipeline.id) {
      throw new CrmIntegrityError('A etapa informada não pertence ao funil selecionado.');
    }
    return { pipelineId: pipeline.id, stageId: stage.id };
  }

  private addHistory(
    leadId: CrmId,
    type: LeadHistoryEntry['type'],
    description: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.state.history.push({
      id: createCrmId('history'),
      leadId,
      type,
      description,
      metadata,
      createdAt: nowIso(),
    });
  }

  private publish(type: CrmEvent['type'], leadId: CrmId, payload: Record<string, unknown>): void {
    const event: CrmEvent = {
      id: createCrmId('event'),
      type,
      leadId,
      occurredAt: nowIso(),
      payload,
    };
    this.eventSinks.forEach((sink) => {
      void sink.publish(event);
    });
  }

  private persist(): void {
    this.repository.save(this.state);
  }

  private compactStagePositions(pipelineId: CrmId): void {
    this.getStages(pipelineId).forEach((stage, index) => {
      stage.position = index;
      stage.updatedAt = nowIso();
    });
  }

  private requirePipeline(id: CrmId): Pipeline {
    const pipeline = this.state.pipelines.find((item) => item.id === id);
    if (!pipeline) throw new CrmIntegrityError('Funil não encontrado.');
    return pipeline;
  }

  private requireStage(id: CrmId): PipelineStage {
    const stage = this.state.stages.find((item) => item.id === id);
    if (!stage) throw new CrmIntegrityError('Etapa não encontrada.');
    return stage;
  }

  private requireLead(id: CrmId): Lead {
    const lead = this.state.leads.find((item) => item.id === id);
    if (!lead) throw new CrmIntegrityError('Lead não encontrado.');
    return lead;
  }

  private requireTag(id: CrmId): Tag {
    const tag = this.state.tags.find((item) => item.id === id);
    if (!tag) throw new CrmIntegrityError('Tag não encontrada.');
    return tag;
  }

  private requireCustomField(id: CrmId): CustomFieldDefinition {
    const field = this.state.customFieldDefinitions.find((item) => item.id === id);
    if (!field) throw new CrmIntegrityError('Campo personalizado não encontrado.');
    return field;
  }

  private requireName(value: string, label: string): string {
    const clean = value.trim();
    if (!clean) throw new CrmIntegrityError(`${label} é obrigatório.`);
    return clean;
  }

  private cleanOptional(value?: string): string | undefined {
    const clean = value?.trim();
    return clean || undefined;
  }

  private sameCustomFieldValue(left: CustomFieldValue, right: CustomFieldValue): boolean {
    if (Array.isArray(left) || Array.isArray(right)) {
      return Array.isArray(left)
        && Array.isArray(right)
        && left.length === right.length
        && left.every((item, index) => item === right[index]);
    }
    return left === right;
  }
}
