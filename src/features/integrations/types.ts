export type IntegrationKind = 'whatsapp' | 'meta' | 'email' | 'api';
export type IntegrationConnectionStatus = 'not_connected' | 'pending' | 'connected';

export interface IntegrationConfig {
  id: IntegrationKind;
  label: string;
  status: IntegrationConnectionStatus;
  notes: string;
  updatedAt?: string;
}

export const INTEGRATION_DEFAULTS: IntegrationConfig[] = [
  { id: 'whatsapp', label: 'WhatsApp', status: 'not_connected', notes: 'Conexão real será feita na fase final.' },
  { id: 'meta', label: 'Meta', status: 'not_connected', notes: 'Conexão real será feita na fase final.' },
  { id: 'email', label: 'E-mail', status: 'not_connected', notes: 'Estrutura preparada para configuração posterior.' },
  { id: 'api', label: 'APIs externas', status: 'not_connected', notes: 'Endpoints e credenciais serão configurados depois.' },
];
