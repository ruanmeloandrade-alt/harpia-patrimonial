import type { PipelineTriggerAction } from './types';

export type PipelineActionCatalogGroup = 'IA & BOTS' | 'INTEGRAÇÕES' | 'COMUNICAÇÃO' | 'CRM' | 'DADOS';
export type PipelineActionCatalogItemId = PipelineTriggerAction | 'receive_webhook';

export interface PipelineActionCatalogItem {
  id: PipelineActionCatalogItemId;
  group: PipelineActionCatalogGroup;
  label: string;
  description: string;
  icon: string;
  mode?: 'action' | 'event';
}

export const pipelineActionCatalog: PipelineActionCatalogItem[] = [
  { id: 'salesbot', group: 'IA & BOTS', label: 'SalesBot', description: 'Escolhe qual SalesBot enviar ao lead nesta etapa.', icon: '▣' },
  { id: 'ai', group: 'IA & BOTS', label: 'Executar Agente IA', description: 'Ativa um Agente de IA pra conduzir a conversa com o lead.', icon: '▣' },
  { id: 'pause_ai', group: 'IA & BOTS', label: 'Pausar Agente IA', description: 'Desativa o Agente de IA ativo no lead.', icon: '▣' },

  { id: 'meta_ads', group: 'INTEGRAÇÕES', label: 'Meta Ads', description: 'Captura e envia eventos pra Meta Ads (Conversions API).', icon: '⚑' },
  { id: 'webhook_won', group: 'INTEGRAÇÕES', label: 'Webhook · Venda ganha', description: 'Avisa um sistema externo quando o lead fecha (conversão).', icon: '⌁' },
  { id: 'webhook_lost', group: 'INTEGRAÇÕES', label: 'Webhook · Venda perdida', description: 'Notifica quando o lead é marcado como perdido, bom pra pesquisas de motivo.', icon: '⌁' },
  { id: 'webhook_remarketing', group: 'INTEGRAÇÕES', label: 'Webhook · Remarketing', description: 'Manda dados do lead pra audiência de remarketing (Meta/Google/CRM externo).', icon: '⌁' },
  { id: 'webhook_meeting', group: 'INTEGRAÇÕES', label: 'Webhook · Reunião marcada', description: 'Alerta agenda / Slack / calendário quando uma reunião é agendada.', icon: '⌁' },
  { id: 'webhook_charge', group: 'INTEGRAÇÕES', label: 'Webhook · Solicitar cobrança', description: 'Dispara pedido de cobrança pra Asaas, Pagar.me ou seu gateway.', icon: '⌁' },
  { id: 'webhook_qualified', group: 'INTEGRAÇÕES', label: 'Webhook · Novo lead qualificado', description: 'Empurra o lead qualificado pra outro CRM / planilha / time comercial.', icon: '⌁' },
  { id: 'receive_webhook', group: 'INTEGRAÇÕES', label: 'Receber webhook (URL de entrada)', description: 'Cria leads automaticamente a partir de POSTs de sistemas externos.', icon: '⌁', mode: 'event' },

  { id: 'internal_message', group: 'COMUNICAÇÃO', label: 'Enviar mensagem interna', description: 'Notifica um usuário do time (comentário interno).', icon: '♧' },
  { id: 'webhook', group: 'COMUNICAÇÃO', label: 'Enviar webhook', description: 'Notifica um sistema externo.', icon: '⌁' },

  { id: 'duplicate_lead', group: 'CRM', label: 'Duplicar lead', description: 'Cria uma cópia do lead (mesma etapa ou outra).', icon: '♧' },
  { id: 'create_task', group: 'CRM', label: 'Adicionar tarefa', description: 'Cria tarefa pro vendedor.', icon: '☷' },
  { id: 'complete_tasks', group: 'CRM', label: 'Concluir tarefas', description: 'Marca uma tarefa específica, ou todas, como concluídas.', icon: '☷' },
  { id: 'delete_tasks', group: 'CRM', label: 'Excluir tarefas', description: 'Remove uma tarefa específica, ou todas, do lead.', icon: '☷' },
  { id: 'move_stage', group: 'CRM', label: 'Mudar etapa do lead', description: 'Move o lead pra outra etapa.', icon: '↔' },
  { id: 'tags', group: 'CRM', label: 'Tags', description: 'Adiciona, remove ou substitui as tags do lead.', icon: '◇' },
  { id: 'assign_owner', group: 'CRM', label: 'Alterar usuário do lead', description: 'Reatribui o lead a outro vendedor.', icon: '♧' },
  { id: 'update_field', group: 'CRM', label: 'Alterar campo', description: 'Atualiza um campo padrão ou personalizado.', icon: '╱' },
  { id: 'delete_lead', group: 'CRM', label: 'Excluir lead', description: 'Remove o lead permanentemente ao entrar na etapa.', icon: '♧' },

  { id: 'generate_form', group: 'DADOS', label: 'Gerar formulário', description: 'Envia um formulário da Central de Formulários pro lead preencher.', icon: '▤' },
  { id: 'delete_files', group: 'DADOS', label: 'Deletar arquivos', description: 'Limpa arquivos do lead segundo classificação (Central de Arquivos).', icon: '⊠' },
  { id: 'link_product', group: 'DADOS', label: 'Vincular produto', description: 'Associa um produto do catálogo ao lead no CRM (interesse ou compra).', icon: '╱' },
];

export const pipelineActionCatalogGroups: PipelineActionCatalogGroup[] = [
  'IA & BOTS',
  'INTEGRAÇÕES',
  'COMUNICAÇÃO',
  'CRM',
  'DADOS',
];

export function findPipelineActionCatalogItem(id: string | undefined) {
  return pipelineActionCatalog.find((item) => item.id === id);
}

export function pipelineActionLabel(action: PipelineTriggerAction): string {
  return findPipelineActionCatalogItem(action)?.label ?? action;
}

export function isWebhookPipelineAction(action: PipelineTriggerAction): boolean {
  return [
    'meta_ads',
    'webhook_won',
    'webhook_lost',
    'webhook_remarketing',
    'webhook_meeting',
    'webhook_charge',
    'webhook_qualified',
    'webhook',
  ].includes(action);
}
