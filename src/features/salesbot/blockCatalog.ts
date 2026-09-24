import type { SalesBotBlockType } from './types';

export interface SalesBotBlockCatalogItem {
  type: SalesBotBlockType;
  label: string;
  description: string;
  group: 'logica' | 'mensagem' | 'acao' | 'fluxo';
}

export const SALESBOT_BLOCK_CATALOG: SalesBotBlockCatalogItem[] = [
  { type: 'message', label: 'Mensagem', description: 'Envia mensagem e permite uma rota geral e uma rota própria para cada botão.', group: 'mensagem' },
  { type: 'delay', label: 'Pausa', description: 'Espera tempo, resposta, mídia ou regra de expediente antes de continuar.', group: 'logica' },
  { type: 'reaction', label: 'Reagir à mensagem', description: 'Aplica uma reação à última mensagem recebida do cliente.', group: 'mensagem' },
  { type: 'internal_comment', label: 'Comentário interno', description: 'Cria uma nota interna na conversa sem enviar ao cliente.', group: 'mensagem' },
  { type: 'action', label: 'Ação', description: 'Executa uma ação operacional no CRM, Inbox, Calendário ou integração.', group: 'acao' },
  { type: 'condition', label: 'Condição', description: 'Avalia regras E ou OU e direciona o fluxo por Sim ou Não.', group: 'logica' },
  { type: 'validation', label: 'Validação', description: 'Valida a resposta e direciona para Válido ou Inválido.', group: 'logica' },
  { type: 'ai_agent', label: 'Iniciar Agente IA', description: 'Aciona um agente ativo configurado na Hárpia.', group: 'fluxo' },
  { type: 'distribution', label: 'Distribuição', description: 'Distribui em round robin com uma saída própria para cada opção.', group: 'logica' },
  { type: 'chain_flow', label: 'Iniciar SalesBot', description: 'Inicia outro SalesBot ativo dentro do fluxo.', group: 'fluxo' },
  { type: 'finish', label: 'Encerrar bot', description: 'Finaliza explicitamente a execução do SalesBot.', group: 'fluxo' },
];

export const getBlockCatalogItem = (type: SalesBotBlockType) =>
  SALESBOT_BLOCK_CATALOG.find((item) => item.type === type);
