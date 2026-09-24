import type { CrmAutomationEventType } from './contracts';

export type AutomationStatus = 'draft' | 'active' | 'paused';

export type PipelineTriggerEvent =
  | 'enter'
  | 'leave'
  | 'created'
  | 'time'
  | 'salesbot_done'
  | 'salesbot_failed'
  | 'ai_done'
  | 'tag_added'
  | 'field_changed';

export type PipelineTriggerAction = 'move_stage' | 'salesbot' | 'ai';

export interface PipelineAutomationMeta {
  pipelineId: string;
  event: PipelineTriggerEvent;
  stageId?: string;
  value?: string;
  action: PipelineTriggerAction;
  targetStageId?: string;
  resourceId?: string;
}

export type AutomationActionType =
  | 'start_salesbot'
  | 'invoke_ai'
  | 'create_task'
  | 'move_stage'
  | 'update_field'
  | 'add_tag'
  | 'remove_tag'
  | 'assign_owner'
  | 'webhook';

export interface AutomationTrigger {
  event: CrmAutomationEventType;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'exists';
    value?: string;
  }>;
}

export interface AutomationAction {
  id: string;
  type: AutomationActionType;
  config: Record<string, string | number | boolean | null>;
}

export interface AutomationDefinition {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  origin?: 'manual' | 'pipeline';
  pipeline?: PipelineAutomationMeta;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
}
