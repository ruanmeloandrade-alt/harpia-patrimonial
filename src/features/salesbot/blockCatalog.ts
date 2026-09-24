import type { SalesBotBlockType } from './types';

export interface SalesBotBlockCatalogItem {
  type: SalesBotBlockType;
  label: string;
  description: string;
  group: 'entrada' | 'logica' | 'mensagem' | 'crm' | 'integracao' | 'fluxo';
}

export const SALESBOT_BLOCK_CATALOG: SalesBotBlockCatalogItem[] = [
  { type: 'condition', label: 'Condição', description: 'Cria caminhos a partir de uma regra do lead ou da conversa.', group: 'logica' },
  { type: 'delay', label: 'Pausa', description: 'Aguarda o tempo configurado antes de continuar.', group: 'logica' },
  { type: 'message', label: 'Mensagem', description: 'Envia uma mensagem e permite configurar botões.', group: 'mensagem' },
  { type: 'ai_agent', label: 'Iniciar Agente IA', description: 'Aciona um agente ativo configurado na Hárpia.', group: 'mensagem' },
  { type: 'move_stage', label: 'Mudar etapa', description: 'Move o lead para outra etapa do CRM.', group: 'crm' },
  { type: 'assign_owner', label: 'Mudar responsável', description: 'Atribui outro responsável ao lead.', group: 'crm' },
  { type: 'create_task', label: 'Criar tarefa', description: 'Cria uma tarefa vinculada ao lead.', group: 'crm' },
  { type: 'update_field', label: 'Definir campo', description: 'Atualiza um campo personalizado do lead.', group: 'crm' },
  { type: 'tag', label: 'Definir tag', description: 'Adiciona ou remove uma tag do lead.', group: 'crm' },
  { type: 'webhook', label: 'Webhook/API', description: 'Executa uma integração externa configurada.', group: 'integracao' },
  { type: 'chain_flow', label: 'Iniciar SalesBot', description: 'Inicia outro SalesBot ativo.', group: 'fluxo' },
  { type: 'finish', label: 'Encerrar bot', description: 'Encerra a execução do fluxo.', group: 'fluxo' },
];

export const getBlockCatalogItem = (type: SalesBotBlockType) =>
  SALESBOT_BLOCK_CATALOG.find((item) => item.type === type);
