export type SalesBotStatus = 'draft' | 'active' | 'paused';

export type SalesBotBlockType =
  | 'trigger'
  | 'condition'
  | 'delay'
  | 'message'
  | 'reaction'
  | 'internal_comment'
  | 'action'
  | 'validation'
  | 'ai_agent'
  | 'distribution'
  | 'finish'
  | 'chain_flow'
  | 'move_stage'
  | 'assign_owner'
  | 'create_task'
  | 'update_field'
  | 'tag'
  | 'webhook';

export type SalesBotBlockConfigValue =
  | string
  | number
  | boolean
  | null
  | SalesBotBlockConfigValue[]
  | { [key: string]: SalesBotBlockConfigValue };

export interface SalesBotBlock {
  id: string;
  type: SalesBotBlockType;
  label: string;
  config: Record<string, SalesBotBlockConfigValue>;
  x?: number;
  y?: number;
  nextBlockId?: string | null;
  falseNextBlockId?: string | null;
  routes?: Record<string, string | null>;
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
  runtimeContext?: Record<string, unknown>;
  startedAt: string;
  finishedAt?: string;
  status: SalesBotExecutionStatus;
  currentBlockId?: string;
  resumeMode?: SalesBotResumeMode;
  resumeAt?: string;
  resumeClaimToken?: string;
  resumeClaimedUntil?: string;
  error?: string;
  action?: string;
  aiAgentId?: string;
}
