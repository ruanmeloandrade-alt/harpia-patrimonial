export type RegionalRuntimePreferences = {
  locale: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '24h' | '12h';
};

const DEFAULT_REGIONAL: RegionalRuntimePreferences = {
  locale: 'pt-BR',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '24h',
};

let currentRegional: RegionalRuntimePreferences = { ...DEFAULT_REGIONAL };
let observer: MutationObserver | null = null;
let translating = false;

const originals = new WeakMap<Node, string>();
const lastApplied = new WeakMap<Node, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();
const attributeLastApplied = new WeakMap<Element, Map<string, string>>();

const EN: Record<string, string> = {
  'Visão geral': 'Overview',
  'Produtos': 'Products',
  'CRM': 'CRM',
  'Inbox': 'Inbox',
  'SalesBot': 'SalesBot',
  'Automatize': 'Automate',
  'Agentes IA': 'AI Agents',
  'Execuções': 'Executions',
  'Configurações': 'Settings',
  'Geral': 'General',
  'Preferências': 'Preferences',
  'Usuários e acessos': 'Users & access',
  'Integrações': 'Integrations',
  'IA': 'AI',
  'CRM e atendimento': 'CRM & service',
  'Notificações': 'Notifications',
  'Segurança': 'Security',
  'Dados e privacidade': 'Data & privacy',
  'Marketing': 'Marketing',
  'Sistema': 'System',
  'Sair': 'Sign out',
  'Claro': 'Light',
  'Escuro': 'Dark',
  'Seguir sistema do dispositivo': 'Follow device setting',
  'Modo compacto': 'Compact mode',
  'Salvar minhas preferências': 'Save my preferences',
  'Idioma': 'Language',
  'Moeda': 'Currency',
  'Fuso horário': 'Time zone',
  'Formato de data': 'Date format',
  'Formato de hora': 'Time format',
  'Português Brasil': 'Portuguese Brazil',
  'Português Portugal': 'Portuguese Portugal',
  'Real brasileiro (BRL)': 'Brazilian real (BRL)',
  'Euro (EUR)': 'Euro (EUR)',
  'Dólar americano (USD)': 'US dollar (USD)',
  'Brasília / São Paulo': 'Brasília / São Paulo',
  'Manaus': 'Manaus',
  'Rio Branco': 'Rio Branco',
  'Lisboa': 'Lisbon',
  '24 horas': '24-hour',
  '12 horas': '12-hour',
  'Salvar configurações': 'Save settings',
  'Salvar configurações gerais': 'Save general settings',
  'Salvar CRM e horários': 'Save CRM & hours',
  'Salvar minhas notificações': 'Save my notifications',
  'Dados da empresa': 'Company data',
  'Nome da empresa': 'Company name',
  'Razão social': 'Legal name',
  'CNPJ / documento': 'Tax ID / document',
  'WhatsApp público / telefone': 'Public WhatsApp / phone',
  'E-mail principal': 'Main email',
  'Site': 'Website',
  'Endereço': 'Address',
  'Cidade': 'City',
  'Estado': 'State',
  'CEP': 'Postal code',
  'País': 'Country',
  'URL da logo': 'Logo URL',
  'Endereço e identificação visual': 'Address & visual identity',
  'Carregando configurações...': 'Loading settings...',
  'Configuração não disponível.': 'Settings unavailable.',
  'Administração da plataforma': 'Platform administration',
  'Sua conta': 'Your account',
  'Tema do sistema': 'System theme',
  'Modo escuro': 'Dark mode',
  'Modo claro': 'Light mode',
  'Preferências da sua conta': 'Your account preferences',
  'Padrões globais da empresa': 'Company-wide defaults',
  'Horário de atendimento': 'Business hours',
  'Segunda': 'Monday',
  'Terça': 'Tuesday',
  'Quarta': 'Wednesday',
  'Quinta': 'Thursday',
  'Sexta': 'Friday',
  'Sábado': 'Saturday',
  'Domingo': 'Sunday',
  'Abre': 'Opens',
  'Fecha': 'Closes',
  'Distribuição de novos leads': 'New lead distribution',
  'Manual': 'Manual',
  'Rodízio': 'Round robin',
  'Menor carga': 'Lowest load',
  'Funil padrão': 'Default pipeline',
  'Preservar origem e contexto': 'Preserve source and context',
  'Primeiro funil ativo': 'First active pipeline',
  'Fora do horário': 'Outside business hours',
  'Manter na fila': 'Keep in queue',
  'Manter sem responsável': 'Keep unassigned',
  'Exigir telefone': 'Require phone',
  'Novo lead': 'New lead',
  'Nova mensagem': 'New message',
  'Falha em automação': 'Automation failure',
  'Falha em integração': 'Integration failure',
  'Popup dentro da Hárpia': 'In-app popup',
  'Som': 'Sound',
  'Notificação do navegador': 'Browser notification',
  'Como avisar': 'How to notify',
  'Eventos conectados': 'Connected events',
  'Nenhuma notificação pendente.': 'No pending notifications.',
  'Inteligência artificial': 'Artificial intelligence',
  'Chave API': 'API key',
  'Provedor identificado': 'Detected provider',
  'Modelo': 'Model',
  'Status': 'Status',
  'Conectada': 'Connected',
  'Não conectada': 'Not connected',
  'Remover chave': 'Remove key',
  'Ativar perfil': 'Enable profile',
  'Desativar perfil': 'Disable profile',
  'Excluir perfil': 'Delete profile',
  'Criar perfil': 'Create profile',
  'Segurança': 'Security',
  'Tempo máximo de sessão em minutos': 'Maximum session time in minutes',
  'Bloqueio por inatividade em minutos': 'Lock after inactivity in minutes',
  'Permitir múltiplas sessões': 'Allow multiple sessions',
  'Exigir senhas fortes': 'Require strong passwords',
  'Auditar ações sensíveis': 'Audit sensitive actions',
  'Retenção padrão em dias': 'Default retention in days',
  'Permitir exportação de dados': 'Allow data export',
  'Permitir solicitações de exclusão': 'Allow deletion requests',
  'Consentimento de marketing por padrão': 'Marketing consent by default',
  'Mascarar dados sensíveis em logs': 'Mask sensitive data in logs',
  'Versão': 'Version',
  'Ambiente': 'Environment',
  'Banco': 'Database',
  'Fonte de verdade': 'Source of truth',
  'Produtos ativos': 'Active products',
  'Valor do estoque': 'Inventory value',
  'Rascunhos': 'Drafts',
  'Pausados': 'Paused',
  'Vendidos': 'Sold',
  'Leads': 'Leads',
  'Visitas': 'Visits',
  'Propostas': 'Proposals',
  'Negociações': 'Negotiations',
  'Vendas': 'Sales',
  'Valor do pipeline': 'Pipeline value',
  'Ticket médio': 'Average ticket',
  'Taxa de conversão': 'Conversion rate',
  'Personalizar Dashboard': 'Customize Dashboard',
  'Salvar': 'Save',
  'Cancelar': 'Cancel',
  'Editar': 'Edit',
  'Excluir': 'Delete',
  'Ativar': 'Activate',
  'Pausar': 'Pause',
  'Encerrar': 'Close',
  'Novo produto': 'New product',
  'Novo catálogo': 'New catalog',
  'Produto avulso': 'Standalone product',
  'Produtos avulsos': 'Standalone products',
  'Catálogos': 'Catalogs',
  'Descrição': 'Description',
  'Tags': 'Tags',
  'Preço': 'Price',
  'Preço negociado, opcional': 'Negotiated price, optional',
  'Visível no site': 'Visible on website',
  'Descrição completa': 'Full description',
  'Fotos e vídeos do produto': 'Product photos and videos',
  'Adicionar fotos': 'Add photos',
  'Adicionar vídeos': 'Add videos',
  'Adicionar documentos': 'Add documents',
  'Remover foto': 'Remove photo',
  'Remover vídeo': 'Remove video',
  'Salvar produto': 'Save product',
  'Salvar alterações': 'Save changes',
  'Buscar por produto, código ou tag': 'Search by product, code or tag',
  'Todos os status': 'All statuses',
  'Rascunho': 'Draft',
  'Ativo': 'Active',
  'Pausado': 'Paused',
  'Encerrado': 'Closed',
  'Carregando produtos...': 'Loading products...',
  'Nenhum produto encontrado': 'No products found',
  'Carregando catálogos...': 'Loading catalogs...',
  'Nenhum catálogo criado': 'No catalogs created',
  'Abrir catálogo': 'Open catalog',
  'Sem descrição': 'No description',
  'Sem descrição.': 'No description.',
  'Sem prazo': 'No due date',
  'Não informada': 'Not provided',
  'Sem data': 'No date',
  'Último health': 'Last health check',
  'Último evento': 'Last event',
  'Último erro': 'Last error',
  'Sem erro registrado': 'No error recorded',
  'Execução': 'Execution',
  'Agente': 'Agent',
  'Perfil': 'Profile',
  'Lead/conversa': 'Lead/conversation',
  'Início': 'Start',
  'Fim': 'End',
  'Bloco': 'Block',
  'Agente IA': 'AI Agent',
  'Última ação': 'Last action',
  'Erro': 'Error',
  'Nenhuma execução de SalesBot registrada.': 'No SalesBot executions recorded.',
  'Nenhuma execução de agente IA registrada.': 'No AI agent executions recorded.',
  'Entrada': 'Received',
};

const PT_PT: Record<string, string> = {
  'Configurações': 'Definições',
  'Usuários e acessos': 'Utilizadores e acessos',
  'Sua conta': 'A sua conta',
  'Preferências da sua conta': 'Preferências da sua conta',
  'Salvar': 'Guardar',
  'Salvar configurações': 'Guardar definições',
  'Salvar configurações gerais': 'Guardar definições gerais',
  'Salvar minhas preferências': 'Guardar as minhas preferências',
  'Salvar minhas notificações': 'Guardar as minhas notificações',
  'Salvar CRM e horários': 'Guardar CRM e horários',
  'Novo lead': 'Novo lead',
  'Nova mensagem': 'Nova mensagem',
  'Exigir telefone': 'Exigir telefone',
  'Horário de atendimento': 'Horário de atendimento',
  'Endereço': 'Morada',
  'CEP': 'Código postal',
  'Celular': 'Telemóvel',
  'Excluir': 'Eliminar',
  'Remover chave': 'Remover chave',
  'Dados e privacidade': 'Dados e privacidade',
};

function dictionary() {
  if (currentRegional.locale === 'en-US') return EN;
  if (currentRegional.locale === 'pt-PT') return PT_PT;
  return null;
}

function translateExact(value: string) {
  const map = dictionary();
  if (!map) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const translated = map[trimmed];
  if (!translated) return value;
  const lead = value.match(/^\s*/)?.[0] ?? '';
  const tail = value.match(/\s*$/)?.[0] ?? '';
  return lead + translated + tail;
}

function translateDynamic(value: string) {
  if (currentRegional.locale === 'en-US') {
    return value
      .replace(/^(\d+) não lida\(s\)$/i, '$1 unread')
      .replace(/^(\d+) produtos neste catálogo$/i, '$1 products in this catalog')
      .replace(/^(\d+) produtos avulsos$/i, '$1 standalone products')
      .replace(/^(\d+) catálogos ativos$/i, '$1 active catalogs')
      .replace(/^(\d+) blocos configurados$/i, '$1 configured blocks');
  }
  return value;
}

function translateTextNode(node: Node) {
  const current = node.textContent ?? '';
  const previousApplied = lastApplied.get(node);
  if (!originals.has(node) || (!translating && previousApplied !== undefined && current !== previousApplied)) {
    originals.set(node, current);
  }
  const original = originals.get(node) ?? current;
  const next = translateDynamic(translateExact(original));
  if (current !== next) {
    translating = true;
    node.textContent = next;
    translating = false;
  }
  lastApplied.set(node, next);
}

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'];

function translateElementAttributes(element: Element) {
  let originalsByAttr = attributeOriginals.get(element);
  if (!originalsByAttr) {
    originalsByAttr = new Map<string, string>();
    attributeOriginals.set(element, originalsByAttr);
  }
  let appliedByAttr = attributeLastApplied.get(element);
  if (!appliedByAttr) {
    appliedByAttr = new Map<string, string>();
    attributeLastApplied.set(element, appliedByAttr);
  }

  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attr);
    if (current === null) continue;
    const previousApplied = appliedByAttr.get(attr);
    if (!originalsByAttr.has(attr) || (!translating && previousApplied !== undefined && current !== previousApplied)) {
      originalsByAttr.set(attr, current);
    }
    const original = originalsByAttr.get(attr) ?? current;
    const next = translateDynamic(translateExact(original));
    if (current !== next) {
      translating = true;
      element.setAttribute(attr, next);
      translating = false;
    }
    appliedByAttr.set(attr, next);
  }
}

function translateTree(root: Node) {
  if (typeof document === 'undefined') return;
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (!parent || ['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) return;
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) translateElementAttributes(root as Element);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) translateTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(node as Element);
    }
    node = walker.nextNode();
  }
}

function installTranslationObserver() {
  if (typeof document === 'undefined' || observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    if (translating) return;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTextNode(mutation.target);
      for (const node of mutation.addedNodes) translateTree(node);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
}

export function applyRegionalRuntime(input: Partial<RegionalRuntimePreferences>) {
  currentRegional = { ...currentRegional, ...input };
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.currency = currentRegional.currency;
  root.dataset.timezone = currentRegional.timezone;
  root.dataset.dateFormat = currentRegional.dateFormat;
  root.dataset.timeFormat = currentRegional.timeFormat;
  root.lang = currentRegional.locale;
  translateTree(document.body);
  installTranslationObserver();
  window.dispatchEvent(new CustomEvent('harpia:regional-preferences-updated', { detail: currentRegional }));
}

export function getRegionalRuntimePreferences(): RegionalRuntimePreferences {
  return { ...currentRegional };
}

export function formatCurrency(value: number | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(currentRegional.locale, {
    style: 'currency',
    currency: currentRegional.currency,
    maximumFractionDigits,
  }).format(value);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(currentRegional.locale, options).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat(currentRegional.locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value > 1 ? value / 100 : value);
}

function dateParts(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: currentRegional.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date, year: map.year, month: map.month, day: map.day };
}

export function formatDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const parts = dateParts(value);
  if (!parts) return '—';
  if (currentRegional.dateFormat === 'MM/dd/yyyy') return `${parts.month}/${parts.day}/${parts.year}`;
  if (currentRegional.dateFormat === 'yyyy-MM-dd') return `${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatTime(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(currentRegional.locale, {
    timeZone: currentRegional.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: currentRegional.timeFormat === '12h',
  }).format(date);
}

export function formatDateTime(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatDate(value)} ${formatTime(value)}`;
}
