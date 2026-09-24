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
  'Funis, leads, produtos, tarefas e automações em uma visão operacional.': 'Pipelines, leads, products, tasks and automations in one operational view.',
  'Nenhum funil configurado.': 'No pipeline configured.',
  '+ Novo funil': '+ New pipeline',
  'Criar': 'Create',
  'etapas': 'stages',
  'leads': 'leads',
  'Duplicar funil': 'Duplicate pipeline',
  'Renomear': 'Rename',
  '+ Nova etapa': '+ New stage',
  'Adicionar etapa': 'Add stage',
  '+ Novo lead': '+ New lead',
  'Cadastre o contato e já posicione no funil correto.': 'Create the contact and place it in the correct pipeline.',
  'Sem etapa': 'No stage',
  'Tipo de interesse': 'Interest type',
  'Criar lead': 'Create lead',
  'Sem leads nesta etapa.': 'No leads in this stage.',
  'Lead 360º': 'Lead 360º',
  'Contato, contexto e observações': 'Contact, context and notes',
  'Salvar ficha do lead': 'Save lead profile',
  'Responsável': 'Owner',
  'Sem responsável': 'Unassigned',
  'Tags': 'Tags',
  'Adicionar': 'Add',
  'Campos personalizados': 'Custom fields',
  'Criar campo': 'Create field',
  'Próximas ações': 'Next actions',
  'Nenhuma próxima ação cadastrada.': 'No next action registered.',
  'Pendente': 'Pending',
  'Concluída': 'Completed',
  'Cancelada': 'Canceled',
  'Histórico': 'History',
  'Não informado': 'Not informed',
  'Perfil do cliente': 'Customer profile',
  'Funil e responsável': 'Pipeline and owner',
  'Etapa do lead': 'Lead stage',
  'Nenhuma tag aplicada.': 'No tag applied.',
  '+ Criar campo personalizado': '+ Create custom field',
  'Texto': 'Text',
  'Número': 'Number',
  'Data': 'Date',
  'Sim/Não': 'Yes/No',
  'Lista': 'List',
  'Múltipla escolha': 'Multiple choice',
  'Dados do lead': 'Lead data',
  'Origem': 'Source',
  'Interesse': 'Interest',
  'Página': 'Page',
  'Entrada': 'Entry',
  'Próxima ação': 'Next action',
  'Adicionar tarefa': 'Add task',
  'Automação do atendimento': 'Service automation',
  'Nenhum lead aberto': 'No lead open',
  'Selecione uma conversa para operar o CRM.': 'Select a conversation to operate the CRM.',
  'Chat aberto': 'Chat open',
  'Enviar': 'Send',
  'Chat da Inbox': 'Inbox chat',
  'Selecione uma conversa': 'Select a conversation',
  'Conversas': 'Conversations',
  'Nova conversa': 'New conversation',
  'Selecione um lead': 'Select a lead',
  'Abrir conversa': 'Open conversation',
  'Iniciar': 'Start',
  'Pausar': 'Pause',
  'Acesso restrito': 'Restricted access',
  'Sem desconto': 'No discount',
  'Percentual': 'Percentage',
  'Valor fixo': 'Fixed amount',
  'Fotos e vídeos do produto': 'Product photos and videos',
  'Todos os status': 'All statuses',
  'Rascunho': 'Draft',
  'Ativo': 'Active',
  'Pausado': 'Paused',
  'Encerrado': 'Closed',
  'Carregando produtos...': 'Loading products...',
  'Nenhum produto encontrado': 'No product found',
  'Catálogo': 'Catalog',
  'Produtos do catálogo': 'Catalog products',
  'Produtos que não pertencem a nenhum catálogo.': 'Products that do not belong to any catalog.',
  'Sem catálogo': 'No catalog',
  'Operação comercial': 'Commercial operation',
  'Catálogos de produtos': 'Product catalogs',
  'Carregando catálogos...': 'Loading catalogs...',
  'Nenhum catálogo criado': 'No catalog created',
  'Dado real do banco': 'Real database data',
  'Sem funções fictícias': 'No fictional roles',
  'Conexões entram na fase final': 'Connections enter in the final phase',
  'Informações reais da conta autenticada.': 'Real information from the authenticated account.',
  'Sua conta': 'Your account',
  'Preferência individual, não altera os outros usuários.': 'Individual preference, does not affect other users.',
  'Configurações globais da empresa': 'Global company settings',
  'Data e hora': 'Date and time',
  'Exemplo monetário': 'Currency example',
  'Inteligência artificial': 'Artificial intelligence',
  'Configure distribuição, dias e horários reais de atendimento.': 'Configure distribution, days and actual service hours.',
  'Distribuição de novos leads': 'New lead distribution',
  'Manual': 'Manual',
  'Rodízio': 'Round robin',
  'Menor carga': 'Lowest load',
  'Funil padrão': 'Default pipeline',
  'Fora do horário': 'Outside business hours',
  'Manter na fila': 'Keep in queue',
  'Manter sem responsável': 'Keep unassigned',
  'Exigir telefone': 'Require phone',
  'Horário de atendimento': 'Business hours',
  'Abre': 'Opens',
  'Fecha': 'Closes',
  'Como avisar': 'How to notify',
  'Popup dentro da Hárpia': 'Popup inside Hárpia',
  'Som': 'Sound',
  'Notificação do navegador': 'Browser notification',
  'Eventos conectados': 'Connected events',
  'Políticas administrativas para sessão, senha e auditoria.': 'Administrative policies for session, password and auditing.',
  'Permitir múltiplas sessões': 'Allow multiple sessions',
  'Exigir senhas fortes': 'Require strong passwords',
  'Auditar ações sensíveis': 'Audit sensitive actions',
  'Retenção, exportação e proteção de dados.': 'Data retention, export and protection.',
  'Permitir exportação de dados': 'Allow data export',
  'Permitir solicitações de exclusão': 'Allow deletion requests',
  'Mascarar dados sensíveis em logs': 'Mask sensitive data in logs',
  'Informações técnicas para manutenção e diagnóstico.': 'Technical information for maintenance and diagnostics.',
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

function formattedDateParts(date: Date, preferences: RuntimeRegionalPreferences) {
  const parts = new Intl.DateTimeFormat(preferences.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: preferences.timezone,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

function assembleDate(date: Date, preferences: RuntimeRegionalPreferences) {
  const { year, month, day } = formattedDateParts(date, preferences);
  if (preferences.dateFormat === 'MM/dd/yyyy') return `${month}/${day}/${year}`;
  if (preferences.dateFormat === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function formatRuntimeCurrency(value: number) {
  const p = readRuntimeRegionalPreferences();
  return new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency }).format(value);
}

export function formatRuntimeDateTime(value: string | number | Date) {
  const p = readRuntimeRegionalPreferences();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${assembleDate(date, p)} ${formatRuntimeTime(date)}`;
}

export function formatRuntimeDate(value: string | number | Date) {
  const p = readRuntimeRegionalPreferences();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return assembleDate(date, p);
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
