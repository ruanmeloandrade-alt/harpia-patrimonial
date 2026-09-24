export type RuntimeRegionalPreferences = {
  locale: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '24h' | '12h';
};

const FALLBACK: RuntimeRegionalPreferences = {
  locale: 'pt-BR',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '24h',
};

const EN: Record<string, string> = {
  'Visão geral': 'Overview',
  'Produtos': 'Products',
  'CRM': 'CRM',
  'Inbox': 'Inbox',
  'SalesBot': 'SalesBot',
  'Automatize': 'Automate',
  'Agentes IA': 'AI Agents',
  'Marketing': 'Marketing',
  'Execuções': 'Executions',
  'Configurações': 'Settings',
  'Sair': 'Sign out',
  'Administração da plataforma': 'Platform administration',
  'Preferências': 'Preferences',
  'Geral': 'General',
  'Usuários e acessos': 'Users and access',
  'Integrações': 'Integrations',
  'IA': 'AI',
  'CRM e atendimento': 'CRM and service',
  'Notificações': 'Notifications',
  'Segurança': 'Security',
  'Dados e privacidade': 'Data and privacy',
  'Sistema': 'System',
  'Preferências da sua conta': 'Your account preferences',
  'Tema desta conta': 'Account theme',
  'Claro': 'Light',
  'Escuro': 'Dark',
  'Seguir sistema do dispositivo': 'Follow device system',
  'Modo compacto': 'Compact mode',
  'Idioma': 'Language',
  'Moeda': 'Currency',
  'Fuso horário': 'Time zone',
  'Formato de data': 'Date format',
  'Formato de hora': 'Time format',
  'Cor institucional': 'Institutional color',
  'Salvar configurações': 'Save settings',
  'Salvar minhas preferências': 'Save my preferences',
  'Dados da empresa': 'Company data',
  'Nome da empresa': 'Company name',
  'Razão social': 'Legal name',
  'CNPJ / documento': 'Tax ID / document',
  'E-mail principal': 'Primary email',
  'Site': 'Website',
  'Endereço': 'Address',
  'Cidade': 'City',
  'Estado': 'State',
  'País': 'Country',
  'CEP': 'Postal code',
  'Novo produto': 'New product',
  'Novo catálogo': 'New catalog',
  'Produto avulso': 'Standalone product',
  'Produtos avulsos': 'Standalone products',
  'Catálogos': 'Catalogs',
  'Abrir catálogo': 'Open catalog',
  'Excluir': 'Delete',
  'Editar': 'Edit',
  'Ativar': 'Activate',
  'Pausar': 'Pause',
  'Cancelar': 'Cancel',
  'Salvar': 'Save',
  'Novo lead': 'New lead',
  'Nova mensagem': 'New message',
  'Falha em automação': 'Automation failure',
  'Falha em integração': 'Integration failure',
  'Notificações desta conta': 'Notifications for this account',
  'Nenhuma notificação pendente.': 'No pending notifications.',
  'Equipe interna': 'Internal team',
  'Cliente': 'Client',
  'Usuário': 'User',
  'Permissões efetivas': 'Effective permissions',
  'Base da plataforma': 'Platform base',
  'Usuários internos': 'Internal users',
  'Grupos personalizados': 'Custom groups',
  'Integrações ativas': 'Active integrations',
  'Sessão atual': 'Current session',
  'Carregando': 'Loading',
  'Carregando...': 'Loading...',
  'Não visível': 'Not visible',
  'Visível no site': 'Visible on website',
  'Sob consulta': 'Contact for price',
};

const PT_PT: Record<string, string> = {
  'Visão geral': 'Visão geral',
  'Usuários e acessos': 'Utilizadores e acessos',
  'Usuários internos': 'Utilizadores internos',
  'Usuário': 'Utilizador',
  'Configurações': 'Definições',
  'Salvar configurações': 'Guardar definições',
  'Salvar minhas preferências': 'Guardar as minhas preferências',
  'Salvar': 'Guardar',
  'Excluir': 'Eliminar',
  'CEP': 'Código postal',
  'Celular': 'Telemóvel',
};

let observer: MutationObserver | null = null;
const originalText = new WeakMap<Text, string>();

function dictionary(locale: string) {
  if (locale === 'en-US') return EN;
  if (locale === 'pt-PT') return PT_PT;
  return null;
}

function translateTextNode(node: Text, locale: string) {
  const raw = originalText.get(node) ?? node.nodeValue ?? '';
  if (!originalText.has(node)) originalText.set(node, raw);
  const trimmed = raw.trim();
  if (!trimmed) return;

  const dict = dictionary(locale);
  if (!dict) {
    if (node.nodeValue !== raw) node.nodeValue = raw;
    return;
  }

  const translated = dict[trimmed];
  if (!translated) {
    if (locale === 'pt-BR' && node.nodeValue !== raw) node.nodeValue = raw;
    return;
  }

  const leading = raw.match(/^\s*/)?.[0] ?? '';
  const trailing = raw.match(/\s*$/)?.[0] ?? '';
  const next = leading + translated + trailing;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateTree(root: Node, locale: string) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, locale);
    return;
  }
  root.childNodes.forEach((child) => translateTree(child, locale));
}

export function readRuntimeRegionalPreferences(): RuntimeRegionalPreferences {
  if (typeof document === 'undefined') return FALLBACK;
  const root = document.documentElement;
  return {
    locale: root.dataset.locale || FALLBACK.locale,
    currency: root.dataset.currency || FALLBACK.currency,
    timezone: root.dataset.timezone || FALLBACK.timezone,
    dateFormat: root.dataset.dateFormat || FALLBACK.dateFormat,
    timeFormat: (root.dataset.timeFormat === '12h' ? '12h' : '24h'),
  };
}

export function applyRuntimeRegionalPreferences(preferences: RuntimeRegionalPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.locale = preferences.locale;
  root.dataset.currency = preferences.currency;
  root.dataset.timezone = preferences.timezone;
  root.dataset.dateFormat = preferences.dateFormat;
  root.dataset.timeFormat = preferences.timeFormat;
  root.lang = preferences.locale;

  translateTree(document.body, preferences.locale);
  window.dispatchEvent(new CustomEvent('harpia:regional-preferences-updated', { detail: preferences }));
}

export function installRuntimeLocaleObserver() {
  if (typeof document === 'undefined' || observer) return () => undefined;
  observer = new MutationObserver((mutations) => {
    const locale = readRuntimeRegionalPreferences().locale;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => translateTree(node, locale));
    }
  });
  observer.observe(document.body, { subtree: true, childList: true });
  translateTree(document.body, readRuntimeRegionalPreferences().locale);
  return () => {
    observer?.disconnect();
    observer = null;
  };
}

function dateParts(dateFormat: string) {
  if (dateFormat === 'MM/dd/yyyy') {
    return { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  }
  if (dateFormat === 'yyyy-MM-dd') {
    return { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  }
  return { day: '2-digit', month: '2-digit', year: 'numeric' } as const;
}

export function formatRuntimeCurrency(value: number) {
  const p = readRuntimeRegionalPreferences();
  return new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency }).format(value);
}

export function formatRuntimeDateTime(value: string | number | Date) {
  const p = readRuntimeRegionalPreferences();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const formatted = new Intl.DateTimeFormat(p.locale, {
    ...dateParts(p.dateFormat),
    hour: '2-digit',
    minute: '2-digit',
    hour12: p.timeFormat === '12h',
    timeZone: p.timezone,
  }).format(date);

  if (p.dateFormat !== 'yyyy-MM-dd') return formatted;
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: p.timeFormat === '12h',
    timeZone: p.timezone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

export function formatRuntimeDate(value: string | number | Date) {
  const p = readRuntimeRegionalPreferences();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  if (p.dateFormat === 'yyyy-MM-dd') {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: p.timezone,
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  return new Intl.DateTimeFormat(p.locale, { ...dateParts(p.dateFormat), timeZone: p.timezone }).format(date);
}


export function formatRuntimeTime(value: string | number | Date) {
  const p = readRuntimeRegionalPreferences();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(p.locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: p.timeFormat === '12h',
    timeZone: p.timezone,
  }).format(date);
}
