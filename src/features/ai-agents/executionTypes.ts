export type AIAgentExecutionStatus = 'running' | 'paused' | 'completed' | 'failed';

export interface AIAgentExecutionLog {
  id: string;
  agentId: string;
  providerProfileId: string;
  leadId?: string;
  conversationId?: string;
  startedAt: string;
  finishedAt?: string;
  status: AIAgentExecutionStatus;
  error?: string;
}
