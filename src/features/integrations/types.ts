export type IntegrationKind = 'ai' | 'whatsapp' | 'meta' | 'email' | 'api';

export type OperationalIntegrationStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'reauth_required'
  | 'error';

export type IntegrationConnectionStatus =
  | OperationalIntegrationStatus
  | 'pending'
  | 'future';

export interface IntegrationConfig {
  id: IntegrationKind;
  label: string;
  status: IntegrationConnectionStatus;
  notes: string;
  updatedAt?: string;
  externalAccountId?: string;
  accountLabel?: string;
  connectedAt?: string;
  lastHealthAt?: string;
  lastEventAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string;
}

export const INTEGRATION_DEFAULTS: IntegrationConfig[] = [
  {
    id: 'ai',
    label: 'Provedor de IA',
    status: 'pending',
    notes: 'Configure um ou mais perfis de provedor/modelo e conecte a chave API por cofre seguro.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Web',
    status: 'not_connected',
    notes: 'O WhatsApp público dos CTAs continua separado. Esta conexão será usada pela Inbox e pelas automações quando o conector real estiver ativo.',
  },
  {
    id: 'meta',
    label: 'Meta Lead Ads',
    status: 'not_connected',
    notes: 'O status será derivado da conexão real e do health do backend.',
  },
  {
    id: 'email',
    label: 'E-mail',
    status: 'future',
    notes: 'Estrutura preparada; conexão planejada para fase posterior.',
  },
  {
    id: 'api',
    label: 'APIs externas',
    status: 'future',
    notes: 'Estrutura preparada; endpoints e credenciais serão configurados posteriormente.',
  },
];
