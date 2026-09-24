import type { CrmAutomationEventType } from './contracts';

export type AutomationStatus = 'draft' | 'active' | 'paused';

export type PipelineTriggerEvent =
  | 'enter'
  | 'created_or_moved'
  | 'leave'
  | 'created'
  | 'time'
  | 'salesbot_done'
  | 'salesbot_failed'
  | 'ai_done'
  | 'tag_added'
  | 'field_changed'
  | 'inbound_webhook';

export type PipelineTriggerAction =
  | 'move_stage'
  | 'salesbot'
  | 'ai'
  | 'pause_ai'
  | 'meta_ads'
  | 'webhook_won'
  | 'webhook_lost'
  | 'webhook_remarketing'
  | 'webhook_meeting'
  | 'webhook_charge'
  | 'webhook_qualified'
  | 'internal_message'
  | 'webhook'
  | 'duplicate_lead'
  | 'create_task'
  | 'complete_tasks'
  | 'delete_tasks'
  | 'tags'
  | 'assign_owner'
  | 'update_field'
  | 'delete_lead'
  | 'generate_form'
  | 'delete_files'
  | 'link_product';

export interface PipelineAutomationMeta {
  pipelineId: string;
  event: PipelineTriggerEvent;
  stageId?: string;
  value?: string;
  action: PipelineTriggerAction;
  targetStageId?: string;
  resourceId?: string;
  actionConfig?: Record<string, string | number | boolean | null>;
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
  | 'webhook'
  | 'pause_ai'
  | 'duplicate_lead'
  | 'complete_tasks'
  | 'delete_tasks'
  | 'replace_tags'
  | 'delete_lead'
  | 'internal_message'
  | 'generate_form'
  | 'delete_files'
  | 'link_product';

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
