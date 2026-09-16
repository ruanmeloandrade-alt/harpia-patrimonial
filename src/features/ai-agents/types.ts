export type AIAgentStatus = 'draft' | 'active' | 'paused';

export interface AIAgentDefinition {
  id: string;
  name: string;
  role: string;
  instructions: string;
  rules: string;
  context: string;
  accessScopes: string[];
  activationPoints: string[];
  status: AIAgentStatus;
  createdAt: string;
  updatedAt: string;
}
