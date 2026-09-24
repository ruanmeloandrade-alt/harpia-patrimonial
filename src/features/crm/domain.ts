export type CrmId = string;
export type IsoDateTime = string;

export type InterestType = 'property' | 'product' | 'service' | 'other';
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect';

export type CustomFieldValue = string | number | boolean | string[] | null;
export type TaskStatus = 'pending' | 'done' | 'cancelled';

export interface Pipeline {
  id: CrmId;
  name: string;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PipelineStage {
  id: CrmId;
  pipelineId: CrmId;
  name: string;
  position: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LeadInterest {
  type: InterestType;
  referenceId?: string;
  label?: string;
}

export interface Lead {
  id: CrmId;
  name: string;
  email?: string;
  whatsapp?: string;
  source?: string;
  sourceAction?: string;
  sourcePage?: string;
  sourceOccurredAt?: IsoDateTime;
  sourceMetadata?: Record<string, unknown>;
  interest?: LeadInterest;
  assigneeId?: string;
  pipelineId?: CrmId;
  stageId?: CrmId;
  tagIds: CrmId[];
  customFields: Record<CrmId, CustomFieldValue>;
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  lastInteractionAt?: IsoDateTime;
}

export interface Tag {
  id: CrmId;
  name: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CustomFieldDefinition {
  id: CrmId;
  name: string;
  type: CustomFieldType;
  options?: string[];
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LeadTask {
  id: CrmId;
  leadId: CrmId;
  title: string;
  assigneeId?: string;
  dueAt?: IsoDateTime;
  status: TaskStatus;
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type LeadHistoryType =
  | 'lead_created'
  | 'lead_updated'
  | 'stage_changed'
  | 'assignee_changed'
  | 'tag_added'
  | 'tag_removed'
  | 'custom_field_changed'
  | 'task_created'
  | 'task_updated';

export interface LeadHistoryEntry {
  id: CrmId;
  leadId: CrmId;
  type: LeadHistoryType;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
}

export interface CrmState {
  version: 1;
  pipelines: Pipeline[];
  stages: PipelineStage[];
  leads: Lead[];
  tags: Tag[];
  customFieldDefinitions: CustomFieldDefinition[];
  tasks: LeadTask[];
  history: LeadHistoryEntry[];
}

export type CrmEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.stage_changed'
  | 'lead.assignee_changed'
  | 'lead.tag_added'
  | 'lead.tag_removed'
  | 'lead.custom_field_changed'
  | 'lead.field_changed'
  | 'lead.task_created'
  | 'lead.task_updated'
  | 'lead.inactivity_detected';

export interface CrmEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: CrmId;
  type: CrmEventType;
  leadId: CrmId;
  occurredAt: IsoDateTime;
  payload: TPayload;
}

export interface CrmEventSink {
  publish(event: CrmEvent): void | Promise<void>;
}

export const createEmptyCrmState = (): CrmState => ({
  version: 1,
  pipelines: [],
  stages: [],
  leads: [],
  tags: [],
  customFieldDefinitions: [],
  tasks: [],
  history: [],
});

export const nowIso = (): IsoDateTime => new Date().toISOString();

export const createCrmId = (prefix: string): CrmId => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `${prefix}_${cryptoApi.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};
