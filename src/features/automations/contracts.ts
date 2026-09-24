export type CrmAutomationEventType =
  | 'lead.created'
  | 'lead.stage_changed'
  | 'lead.field_changed'
  | 'lead.tag_added'
  | 'lead.tag_removed'
  | 'lead.inactivity'
  | 'lead.stage_elapsed'
  | 'salesbot.completed'
  | 'salesbot.failed'
  | 'task.due'
  | 'custom.event';

export interface CrmAutomationEvent {
  id: string;
  type: CrmAutomationEventType;
  occurredAt: string;
  leadId?: string;
  conversationId?: string;
  payload: Record<string, unknown>;
}

export type AutomationCommandStatus = 'accepted' | 'rejected' | 'not_configured';

export interface AutomationCommandResult {
  status: AutomationCommandStatus;
  executionId?: string;
  reason?: string;
  data?: Record<string, unknown>;
}

export interface SalesBotCommandPort {
  start(input: { botId: string; leadId?: string; conversationId?: string; context?: Record<string, unknown> }): Promise<AutomationCommandResult>;
  pause(input: { executionId: string; reason?: string }): Promise<AutomationCommandResult>;
  resume(input: { executionId: string; context?: Record<string, unknown> }): Promise<AutomationCommandResult>;
  getStatus(executionId: string): Promise<'running' | 'paused' | 'completed' | 'failed' | 'not_found'>;
}

export interface AIAgentCommandPort {
  invoke(input: { agentId: string; leadId?: string; conversationId?: string; input?: string; context?: Record<string, unknown> }): Promise<AutomationCommandResult>;
  pause(input: { executionId: string; reason?: string }): Promise<AutomationCommandResult>;
  getStatus(executionId: string): Promise<'running' | 'paused' | 'completed' | 'failed' | 'not_found'>;
}

export interface CrmActionPort {
  moveStage(input: { leadId: string; stageId: string }): Promise<AutomationCommandResult>;
  assignOwner(input: { leadId: string; userId: string }): Promise<AutomationCommandResult>;
  createTask(input: { leadId: string; title: string; dueAt?: string }): Promise<AutomationCommandResult>;
  updateField(input: { leadId: string; fieldId: string; value: unknown }): Promise<AutomationCommandResult>;
  addTag(input: { leadId: string; tagId: string }): Promise<AutomationCommandResult>;
  removeTag(input: { leadId: string; tagId: string }): Promise<AutomationCommandResult>;
}

export const notConfiguredResult = (reason: string): AutomationCommandResult => ({
  status: 'not_configured',
  reason,
});
