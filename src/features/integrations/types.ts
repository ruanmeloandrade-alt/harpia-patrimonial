export type IntegrationKind = 'ai' | 'whatsapp' | 'meta' | 'email' | 'api';
export type IntegrationConnectionStatus = 'not_connected' | 'pending' | 'future' | 'connected';

export interface IntegrationConfig {
  id: IntegrationKind;
  label: string;
  status: IntegrationConnectionStatus;
  notes: string;
  updatedAt?: string;
}

export const INTEGRATION_DEFAULTS: IntegrationConfig[] = [
  { id: 'ai', label: 'Provedor de IA', status: 'pending', notes: 'Configure um ou mais perfis de provedor/modelo e conecte a chave API por cofre seguro.' },
  { id: 'whatsapp', label: 'WhatsApp API', status: 'not_connected', notes: 'O WhatsApp público dos CTAs usa o telefone das configurações da empresa. A API real para Inbox, envio e automações será conectada na fase final.' },
  { id: 'meta', label: 'Meta', status: 'not_connected', notes: 'Conexão real será feita na fase final.' },
  { id: 'email', label: 'E-mail', status: 'future', notes: 'Estrutura preparada; conexão planejada para fase posterior.' },
  { id: 'api', label: 'APIs externas', status: 'future', notes: 'Estrutura preparada; endpoints e credenciais serão configurados posteriormente.' },
];
