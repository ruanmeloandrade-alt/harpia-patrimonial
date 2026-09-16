export type SalesBotStatus = 'draft' | 'active' | 'paused';

export type SalesBotBlockType =
  | 'trigger'
  | 'condition'
  | 'delay'
  | 'message'
  | 'ai_agent'
  | 'move_stage'
  | 'assign_owner'
  | 'create_task'
  | 'update_field'
  | 'tag'
  | 'webhook'
  | 'finish'
  | 'chain_flow';

export type SalesBotBlockConfigValue = string | number | boolean | string[] | null;

export interface SalesBotBlock {
  id: string;
  type: SalesBotBlockType;
  label: string;
  config: Record<string, SalesBotBlockConfigValue>;
}

export interface SalesBotDefinition {
  id: string;
  name: string;
  description: string;
  status: SalesBotStatus;
  blocks: SalesBotBlock[];
  createdAt: string;
  updatedAt: string;
}

export type SalesBotExecutionStatus = 'running' | 'paused' | 'completed' | 'failed';
export type SalesBotResumeMode = 'retry_current' | 'next_block';

export interface SalesBotExecutionLog {
  id: string;
  botId: string;
  leadId?: string;
  conversationId?: string;
  startedAt: string;
  finishedAt?: string;
  status: SalesBotExecutionStatus;
  currentBlockId?: string;
  resumeMode?: SalesBotResumeMode;
  error?: string;
  action?: string;
  aiAgentId?: string;
}
