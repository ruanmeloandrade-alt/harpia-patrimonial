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
  /**
   * Contexto operacional necessário para retomar uma execução pausada.
   * É removido ao concluir/falhar e nunca deve conter chave de provedor,
   * prompt persistido ou resposta de IA.
   */
  runtimeContext?: Record<string, unknown>;
  startedAt: string;
  finishedAt?: string;
  status: SalesBotExecutionStatus;
  currentBlockId?: string;
  resumeMode?: SalesBotResumeMode;
  /** Horário absoluto em que uma pausa por delay fica elegível para retomada durável. */
  resumeAt?: string;
  /**
   * Lease curto usado para impedir que duas sessões retomem a mesma execução
   * simultaneamente. Se a sessão que obteve o lease morrer antes de executar,
   * o lease expira e a execução volta a ficar elegível.
   */
  resumeClaimToken?: string;
  resumeClaimedUntil?: string;
  error?: string;
  action?: string;
  aiAgentId?: string;
}
