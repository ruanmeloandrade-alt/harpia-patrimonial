import type { SalesBotBlockType } from './types';

export interface SalesBotBlockCatalogItem {
  type: SalesBotBlockType;
  label: string;
  description: string;
  group: 'entrada' | 'logica' | 'mensagem' | 'crm' | 'integracao' | 'fluxo';
}

export const SALESBOT_BLOCK_CATALOG: SalesBotBlockCatalogItem[] = [
  { type: 'trigger', label: 'Gatilho', description: 'Define como o fluxo começa.', group: 'entrada' },
  { type: 'condition', label: 'Condição', description: 'Avalia uma regra antes de continuar.', group: 'logica' },
  { type: 'delay', label: 'Espera', description: 'Aguarda um período configurado.', group: 'logica' },
  { type: 'message', label: 'Mensagem', description: 'Prepara uma mensagem para o canal conectado.', group: 'mensagem' },
  { type: 'ai_agent', label: 'Agente IA', description: 'Aciona um agente configurado.', group: 'mensagem' },
  { type: 'move_stage', label: 'Mover etapa', description: 'Solicita mudança de etapa no CRM.', group: 'crm' },
  { type: 'assign_owner', label: 'Responsável', description: 'Solicita atribuição de responsável.', group: 'crm' },
  { type: 'create_task', label: 'Criar tarefa', description: 'Cria próxima ação para o lead.', group: 'crm' },
  { type: 'update_field', label: 'Atualizar campo', description: 'Atualiza campo personalizado via contrato CRM.', group: 'crm' },
  { type: 'tag', label: 'Tags', description: 'Adiciona ou remove tags do lead.', group: 'crm' },
  { type: 'webhook', label: 'Webhook/API', description: 'Reserva chamada a integração externa configurada.', group: 'integracao' },
  { type: 'finish', label: 'Finalização', description: 'Encerra a execução do fluxo.', group: 'fluxo' },
  { type: 'chain_flow', label: 'Encadear fluxo', description: 'Inicia outro SalesBot configurado.', group: 'fluxo' },
];

export const getBlockCatalogItem = (type: SalesBotBlockType) =>
  SALESBOT_BLOCK_CATALOG.find((item) => item.type === type);
