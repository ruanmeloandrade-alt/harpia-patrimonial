import { requireSupabase } from '../../core/supabase/client';
import type {
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
} from '../../features/crm/domain';
import { createEmptyCrmState } from '../../features/crm/domain';
import type { CrmRepository } from '../../features/crm/repository';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function same(valueA: unknown, valueB: unknown) {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

function persistenceError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Falha de persistência normalizada do CRM.';
  console.error('[crm] normalized persistence failed', error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:persistence-error', {
      detail: { module: 'crm', message },
    }));
  }
}

function notifyCrmUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:crm-updated'));
  }
}

type PipelineRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type StageRow = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  source: string | null;
  source_action: string | null;
  source_page: string | null;
  source_occurred_at: string | null;
  source_metadata: Record<string, unknown> | null;
  interest_type: LeadInterest['type'] | null;
  interest_reference_id: string | null;
  interest_label: string | null;
  assignee_id: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
};

type TagRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type LeadTagRow = {
  lead_id: string;
  tag_id: string;
  position: number;
};

type CustomFieldRow = {
  id: string;
  name: string;
  type: CustomFieldDefinition['type'];
  options: unknown;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomFieldValueRow = {
  lead_id: string;
  field_id: string;
  value: unknown;
};

type TaskRow = {
  id: string;
  lead_id: string;
  title: string;
  assignee_id: string | null;
  due_at: string | null;
  status: LeadTask['status'];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type HistoryRow = {
  id: string;
  lead_id: string;
  type: LeadHistoryEntry['type'];
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function normalizeOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = value.filter((item): item is string => typeof item === 'string');
  return options.length > 0 ? options : undefined;
}

function normalizeCustomFieldValue(value: unknown): CustomFieldValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }
  return null;
}

function pipelineFromRow(row: PipelineRow): Pipeline {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function stageFromRow(row: StageRow): PipelineStage {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function leadFromRow(
  row: LeadRow,
  tagIds: string[],
  customFields: Record<string, CustomFieldValue>,
): Lead {
  const interest = row.interest_type
    ? {
      type: row.interest_type,
      ...(row.interest_reference_id ? { referenceId: row.interest_reference_id } : {}),
      ...(row.interest_label ? { label: row.interest_label } : {}),
    }
    : undefined;

  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    source: row.source ?? undefined,
    sourceAction: row.source_action ?? undefined,
    sourcePage: row.source_page ?? undefined,
    sourceOccurredAt: row.source_occurred_at ?? undefined,
    sourceMetadata: row.source_metadata ?? undefined,
    interest,
    assigneeId: row.assignee_id ?? undefined,
    pipelineId: row.pipeline_id ?? undefined,
    stageId: row.stage_id ?? undefined,
    tagIds,
    customFields,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastInteractionAt: row.last_interaction_at ?? undefined,
  };
}

function tagFromRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function customFieldFromRow(row: CustomFieldRow): CustomFieldDefinition {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    options: normalizeOptions(row.options),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskFromRow(row: TaskRow): LeadTask {
  return {
    id: row.id,
    leadId: row.lead_id,
    title: row.title,
    assigneeId: row.assignee_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function historyFromRow(row: HistoryRow): LeadHistoryEntry {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    description: row.description,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

function pipelineToRow(item: Pipeline) {
  return {
    id: item.id,
    name: item.name,
    active: item.active,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function stageToRow(item: PipelineStage) {
  return {
    id: item.id,
    pipeline_id: item.pipelineId,
    name: item.name,
    position: item.position,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function leadToRow(item: Lead) {
  return {
    id: item.id,
    name: item.name,
    email: item.email ?? null,
    whatsapp: item.whatsapp ?? null,
    source: item.source ?? null,
    source_action: item.sourceAction ?? null,
    source_page: item.sourcePage ?? null,
    source_occurred_at: item.sourceOccurredAt ?? null,
    source_metadata: item.sourceMetadata ?? {},
    interest_type: item.interest?.type ?? null,
    interest_reference_id: item.interest?.referenceId ?? null,
    interest_label: item.interest?.label ?? null,
    assignee_id: item.assigneeId ?? null,
    pipeline_id: item.pipelineId ?? null,
    stage_id: item.stageId ?? null,
    notes: item.notes ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    last_interaction_at: item.lastInteractionAt ?? null,
  };
}

function tagToRow(item: Tag) {
  return {
    id: item.id,
    name: item.name,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function customFieldToRow(item: CustomFieldDefinition) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    options: item.options ?? [],
    active: item.active,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function taskToRow(item: LeadTask) {
  return {
    id: item.id,
    lead_id: item.leadId,
    title: item.title,
    assignee_id: item.assigneeId ?? null,
    due_at: item.dueAt ?? null,
    status: item.status,
    notes: item.notes ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function historyToRow(item: LeadHistoryEntry) {
  return {
    id: item.id,
    lead_id: item.leadId,
    type: item.type,
    description: item.description,
    metadata: item.metadata ?? null,
    created_at: item.createdAt,
  };
}

function changedIds<T extends { id: string }>(base: T[], pending: T[]) {
  const baseById = new Map(base.map((item) => [item.id, item]));
  return pending
    .filter((item) => !same(baseById.get(item.id), item))
    .map((item) => item.id);
}

function removedIds<T extends { id: string }>(base: T[], pending: T[]) {
  const pendingIds = new Set(pending.map((item) => item.id));
  return base.filter((item) => !pendingIds.has(item.id)).map((item) => item.id);
}

async function deleteByIds(table: string, ids: string[]) {
  if (ids.length === 0) return;
  const supabase = requireSupabase() as any;
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) throw error;
}

async function upsertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const supabase = requireSupabase() as any;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export class SupabaseNormalizedCrmRepository implements CrmRepository {
  private memory: CrmState;
  private base: CrmState;
  private queue: Promise<void> = Promise.resolve();
  private lastSave: Promise<void> = Promise.resolve();

  constructor(initialState: CrmState) {
    this.memory = clone(initialState);
    this.base = clone(initialState);
  }

  load(): CrmState {
    return clone(this.memory);
  }

  save(state: CrmState): void {
    const pending = clone(state);
    this.memory = clone(pending);

    const operation = this.queue.then(() => this.persist(pending));
    this.lastSave = operation;
    this.queue = operation.catch((error) => persistenceError(error));
  }

  clear(): void {
    this.save(createEmptyCrmState());
  }

  async whenIdle() {
    await this.queue;
  }

  async waitForLastSave(): Promise<void> {
    await this.lastSave;
  }

  private async persist(pending: CrmState) {
    const supabase = requireSupabase() as any;

    await deleteByIds('crm_history', removedIds(this.base.history, pending.history));
    await deleteByIds('crm_tasks', removedIds(this.base.tasks, pending.tasks));
    await deleteByIds('crm_leads', removedIds(this.base.leads, pending.leads));
    await deleteByIds('crm_pipeline_stages', removedIds(this.base.stages, pending.stages));
    await deleteByIds('crm_pipelines', removedIds(this.base.pipelines, pending.pipelines));
    await deleteByIds('crm_custom_fields', removedIds(this.base.customFieldDefinitions, pending.customFieldDefinitions));
    await deleteByIds('crm_tags', removedIds(this.base.tags, pending.tags));

    const changedPipelineIds = new Set(changedIds(this.base.pipelines, pending.pipelines));
    const changedStageIds = new Set(changedIds(this.base.stages, pending.stages));
    const changedLeadIds = new Set(changedIds(this.base.leads, pending.leads));
    const changedTagIds = new Set(changedIds(this.base.tags, pending.tags));
    const changedCustomFieldIds = new Set(changedIds(this.base.customFieldDefinitions, pending.customFieldDefinitions));
    const changedTaskIds = new Set(changedIds(this.base.tasks, pending.tasks));
    const changedHistoryIds = new Set(changedIds(this.base.history, pending.history));

    await upsertRows(
      'crm_pipelines',
      pending.pipelines.filter((item) => changedPipelineIds.has(item.id)).map(pipelineToRow),
    );
    await upsertRows(
      'crm_pipeline_stages',
      pending.stages.filter((item) => changedStageIds.has(item.id)).map(stageToRow),
    );
    await upsertRows(
      'crm_tags',
      pending.tags.filter((item) => changedTagIds.has(item.id)).map(tagToRow),
    );
    await upsertRows(
      'crm_custom_fields',
      pending.customFieldDefinitions
        .filter((item) => changedCustomFieldIds.has(item.id))
        .map(customFieldToRow),
    );
    await upsertRows(
      'crm_leads',
      pending.leads.filter((item) => changedLeadIds.has(item.id)).map(leadToRow),
    );
    await upsertRows(
      'crm_tasks',
      pending.tasks.filter((item) => changedTaskIds.has(item.id)).map(taskToRow),
    );
    await upsertRows(
      'crm_history',
      pending.history.filter((item) => changedHistoryIds.has(item.id)).map(historyToRow),
    );

    const baseLeads = new Map(this.base.leads.map((lead) => [lead.id, lead]));
    const relationLeadIds = pending.leads
      .filter((lead) => {
        const previous = baseLeads.get(lead.id);
        return !same(previous?.tagIds ?? [], lead.tagIds)
          || !same(previous?.customFields ?? {}, lead.customFields);
      })
      .map((lead) => lead.id);

    if (relationLeadIds.length > 0) {
      const { error: tagDeleteError } = await supabase
        .from('crm_lead_tags')
        .delete()
        .in('lead_id', relationLeadIds);
      if (tagDeleteError) throw tagDeleteError;

      const { error: fieldDeleteError } = await supabase
        .from('crm_lead_custom_field_values')
        .delete()
        .in('lead_id', relationLeadIds);
      if (fieldDeleteError) throw fieldDeleteError;

      const leadTags = pending.leads
        .filter((lead) => relationLeadIds.includes(lead.id))
        .flatMap((lead) => lead.tagIds.map((tagId, position) => ({
          lead_id: lead.id,
          tag_id: tagId,
          position,
        })));

      if (leadTags.length > 0) {
        const { error } = await supabase.from('crm_lead_tags').insert(leadTags);
        if (error) throw error;
      }

      const customFieldValues = pending.leads
        .filter((lead) => relationLeadIds.includes(lead.id))
        .flatMap((lead) => Object.entries(lead.customFields).map(([fieldId, value]) => ({
          lead_id: lead.id,
          field_id: fieldId,
          value,
          updated_at: lead.updatedAt,
        })));

      if (customFieldValues.length > 0) {
        const { error } = await supabase.from('crm_lead_custom_field_values').insert(customFieldValues);
        if (error) throw error;
      }
    }

    this.base = clone(pending);
    notifyCrmUpdated();
  }
}

export async function hydrateNormalizedCrmRepository() {
  const supabase = requireSupabase() as any;

  const [
    pipelinesResult,
    stagesResult,
    leadsResult,
    tagsResult,
    leadTagsResult,
    customFieldsResult,
    customFieldValuesResult,
    tasksResult,
    historyResult,
  ] = await Promise.all([
    supabase.from('crm_pipelines').select('id,name,active,created_at,updated_at').order('created_at', { ascending: true }),
    supabase.from('crm_pipeline_stages').select('id,pipeline_id,name,position,created_at,updated_at').order('pipeline_id', { ascending: true }).order('position', { ascending: true }),
    supabase.from('crm_leads').select('id,name,email,whatsapp,source,source_action,source_page,source_occurred_at,source_metadata,interest_type,interest_reference_id,interest_label,assignee_id,pipeline_id,stage_id,notes,created_at,updated_at,last_interaction_at').order('created_at', { ascending: true }),
    supabase.from('crm_tags').select('id,name,created_at,updated_at').order('created_at', { ascending: true }),
    supabase.from('crm_lead_tags').select('lead_id,tag_id,position').order('lead_id', { ascending: true }).order('position', { ascending: true }),
    supabase.from('crm_custom_fields').select('id,name,type,options,active,created_at,updated_at').order('created_at', { ascending: true }),
    supabase.from('crm_lead_custom_field_values').select('lead_id,field_id,value'),
    supabase.from('crm_tasks').select('id,lead_id,title,assignee_id,due_at,status,notes,created_at,updated_at').order('created_at', { ascending: true }),
    supabase.from('crm_history').select('id,lead_id,type,description,metadata,created_at').order('created_at', { ascending: true }),
  ]);

  for (const result of [
    pipelinesResult,
    stagesResult,
    leadsResult,
    tagsResult,
    leadTagsResult,
    customFieldsResult,
    customFieldValuesResult,
    tasksResult,
    historyResult,
  ]) {
    if (result.error) throw result.error;
  }

  const tagIdsByLead = new Map<string, string[]>();
  for (const row of (leadTagsResult.data ?? []) as LeadTagRow[]) {
    const values = tagIdsByLead.get(row.lead_id) ?? [];
    values.push(row.tag_id);
    tagIdsByLead.set(row.lead_id, values);
  }

  const customFieldsByLead = new Map<string, Record<string, CustomFieldValue>>();
  for (const row of (customFieldValuesResult.data ?? []) as CustomFieldValueRow[]) {
    const values = customFieldsByLead.get(row.lead_id) ?? {};
    values[row.field_id] = normalizeCustomFieldValue(row.value);
    customFieldsByLead.set(row.lead_id, values);
  }

  const state: CrmState = {
    version: 1,
    pipelines: ((pipelinesResult.data ?? []) as PipelineRow[]).map(pipelineFromRow),
    stages: ((stagesResult.data ?? []) as StageRow[]).map(stageFromRow),
    leads: ((leadsResult.data ?? []) as LeadRow[]).map((row) => leadFromRow(
      row,
      tagIdsByLead.get(row.id) ?? [],
      customFieldsByLead.get(row.id) ?? {},
    )),
    tags: ((tagsResult.data ?? []) as TagRow[]).map(tagFromRow),
    customFieldDefinitions: ((customFieldsResult.data ?? []) as CustomFieldRow[]).map(customFieldFromRow),
    tasks: ((tasksResult.data ?? []) as TaskRow[]).map(taskFromRow),
    history: ((historyResult.data ?? []) as HistoryRow[]).map(historyFromRow),
  };

  return new SupabaseNormalizedCrmRepository(state);
}
