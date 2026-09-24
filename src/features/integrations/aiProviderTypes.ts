export type AIProviderKind = 'openai' | 'openai_codex' | 'anthropic' | 'google_gemini' | 'custom';
export type AIProviderProfileStatus = 'draft' | 'ready' | 'disabled';

export interface AIProviderProfile {
  id: string;
  name: string;
  provider: AIProviderKind;
  model: string;
  baseUrl: string;
  status: AIProviderProfileStatus;
  apiKeyConfigured: boolean;
  secretRef?: string;
  notes: string;
  availableModels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AIProviderCatalogItem {
  id: AIProviderKind;
  label: string;
  description: string;
  modelPlaceholder: string;
  supportsCustomBaseUrl: boolean;
}

export const AI_PROVIDER_CATALOG: AIProviderCatalogItem[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Perfil genérico para modelos disponibilizados pela OpenAI.',
    modelPlaceholder: 'Informe o modelo desejado',
    supportsCustomBaseUrl: true,
  },
  {
    id: 'openai_codex',
    label: 'OpenAI / Codex',
    description: 'Perfil separado para fluxos de código quando a operação optar por Codex/OpenAI.',
    modelPlaceholder: 'Informe o modelo ou configuração Codex desejada',
    supportsCustomBaseUrl: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic / Claude',
    description: 'Perfil para modelos Claude e fluxos baseados no provedor Anthropic.',
    modelPlaceholder: 'Informe o modelo Claude desejado',
    supportsCustomBaseUrl: true,
  },
  {
    id: 'google_gemini',
    label: 'Google Gemini',
    description: 'Perfil para modelos Gemini disponibilizados pelo Google.',
    modelPlaceholder: 'Informe o modelo Gemini desejado',
    supportsCustomBaseUrl: true,
  },
  {
    id: 'custom',
    label: 'Provedor customizado',
    description: 'Permite configurar outro provedor compatível por endpoint e modelo.',
    modelPlaceholder: 'Nome/identificador do modelo',
    supportsCustomBaseUrl: true,
  },
];

export const getAIProviderCatalogItem = (provider: AIProviderKind) =>
  AI_PROVIDER_CATALOG.find((item) => item.id === provider);
