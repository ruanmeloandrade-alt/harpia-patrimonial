import { requireSupabase } from '../../../core/supabase/client';
import type { Json } from '../../../core/supabase/database.types';

export type ThemePreference = 'light' | 'dark' | 'system';
export type TimeFormatPreference = '24h' | '12h';

export type OrganizationPreferences = {
  organization?: {
    addressLine?: string;
    postalCode?: string;
    country?: string;
  };
  appearance?: {
    theme?: ThemePreference;
    compactMode?: boolean;
    logoUrl?: string;
    primaryColor?: string;
  };
  regional?: {
    locale?: string;
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: TimeFormatPreference;
  };
  crm?: {
    leadDistribution?: 'manual' | 'round_robin' | 'lowest_load';
    defaultPipelineBehavior?: 'keep_origin' | 'first_active';
    businessHoursStart?: string;
    businessHoursEnd?: string;
    outsideBusinessHours?: 'queue' | 'keep_unassigned';
    requirePhoneForLead?: boolean;
  };
  automations?: {
    maxConcurrentRuns?: number;
    retryAttempts?: number;
    pauseOnRepeatedFailure?: boolean;
    respectBusinessHours?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  notifications?: {
    inApp?: boolean;
    email?: boolean;
    whatsapp?: boolean;
    newLead?: boolean;
    newMessage?: boolean;
    taskDue?: boolean;
    automationFailure?: boolean;
    integrationFailure?: boolean;
  };
  security?: {
    sessionTimeoutMinutes?: number;
    inactivityLockMinutes?: number;
    allowMultipleSessions?: boolean;
    requireStrongPasswords?: boolean;
    auditSensitiveActions?: boolean;
  };
  privacy?: {
    retentionDays?: number;
    allowDataExport?: boolean;
    allowDeletionRequests?: boolean;
    marketingConsentDefault?: boolean;
    maskSensitiveDataInLogs?: boolean;
  };
  marketing?: {
    defaultUtmSource?: string;
    defaultUtmMedium?: string;
    trackingEnabled?: boolean;
  };
};

export type NormalizedOrganizationPreferences = {
  organization: {
    addressLine: string;
    postalCode: string;
    country: string;
  };
  appearance: {
    theme: ThemePreference;
    compactMode: boolean;
    logoUrl: string;
    primaryColor: string;
  };
  regional: {
    locale: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: TimeFormatPreference;
  };
  crm: {
    leadDistribution: 'manual' | 'round_robin' | 'lowest_load';
    defaultPipelineBehavior: 'keep_origin' | 'first_active';
    businessHoursStart: string;
    businessHoursEnd: string;
    outsideBusinessHours: 'queue' | 'keep_unassigned';
    requirePhoneForLead: boolean;
  };
  automations: {
    maxConcurrentRuns: number;
    retryAttempts: number;
    pauseOnRepeatedFailure: boolean;
    respectBusinessHours: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  notifications: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
    newLead: boolean;
    newMessage: boolean;
    taskDue: boolean;
    automationFailure: boolean;
    integrationFailure: boolean;
  };
  security: {
    sessionTimeoutMinutes: number;
    inactivityLockMinutes: number;
    allowMultipleSessions: boolean;
    requireStrongPasswords: boolean;
    auditSensitiveActions: boolean;
  };
  privacy: {
    retentionDays: number;
    allowDataExport: boolean;
    allowDeletionRequests: boolean;
    marketingConsentDefault: boolean;
    maskSensitiveDataInLogs: boolean;
  };
  marketing: {
    defaultUtmSource: string;
    defaultUtmMedium: string;
    trackingEnabled: boolean;
  };
};

export type OrganizationSettings = {
  id: number;
  company_name: string;
  legal_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  website: string;
  city: string | null;
  state: string | null;
  preferences: OrganizationPreferences;
};

export const DEFAULT_ORGANIZATION_PREFERENCES: NormalizedOrganizationPreferences = {
  organization: {
    addressLine: '',
    postalCode: '',
    country: 'Brasil',
  },
  appearance: {
    theme: 'light',
    compactMode: false,
    logoUrl: '',
    primaryColor: '#b49a63',
  },
  regional: {
    locale: 'pt-BR',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
  },
  crm: {
    leadDistribution: 'manual',
    defaultPipelineBehavior: 'keep_origin',
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    outsideBusinessHours: 'queue',
    requirePhoneForLead: false,
  },
  automations: {
    maxConcurrentRuns: 5,
    retryAttempts: 3,
    pauseOnRepeatedFailure: true,
    respectBusinessHours: false,
    quietHoursStart: '20:00',
    quietHoursEnd: '08:00',
  },
  notifications: {
    inApp: true,
    email: false,
    whatsapp: false,
    newLead: true,
    newMessage: true,
    taskDue: true,
    automationFailure: true,
    integrationFailure: true,
  },
  security: {
    sessionTimeoutMinutes: 720,
    inactivityLockMinutes: 60,
    allowMultipleSessions: true,
    requireStrongPasswords: true,
    auditSensitiveActions: true,
  },
  privacy: {
    retentionDays: 3650,
    allowDataExport: true,
    allowDeletionRequests: true,
    marketingConsentDefault: false,
    maskSensitiveDataInLogs: true,
  },
  marketing: {
    defaultUtmSource: '',
    defaultUtmMedium: '',
    trackingEnabled: false,
  },
};

export function normalizeOrganizationPreferences(preferences: OrganizationPreferences = {}): NormalizedOrganizationPreferences {
  return {
    organization: { ...DEFAULT_ORGANIZATION_PREFERENCES.organization, ...(preferences.organization ?? {}) },
    appearance: { ...DEFAULT_ORGANIZATION_PREFERENCES.appearance, ...(preferences.appearance ?? {}) },
    regional: { ...DEFAULT_ORGANIZATION_PREFERENCES.regional, ...(preferences.regional ?? {}) },
    crm: { ...DEFAULT_ORGANIZATION_PREFERENCES.crm, ...(preferences.crm ?? {}) },
    automations: { ...DEFAULT_ORGANIZATION_PREFERENCES.automations, ...(preferences.automations ?? {}) },
    notifications: { ...DEFAULT_ORGANIZATION_PREFERENCES.notifications, ...(preferences.notifications ?? {}) },
    security: { ...DEFAULT_ORGANIZATION_PREFERENCES.security, ...(preferences.security ?? {}) },
    privacy: { ...DEFAULT_ORGANIZATION_PREFERENCES.privacy, ...(preferences.privacy ?? {}) },
    marketing: { ...DEFAULT_ORGANIZATION_PREFERENCES.marketing, ...(preferences.marketing ?? {}) },
  };
}

export function mergeOrganizationPreferences(
  current: OrganizationPreferences,
  patch: OrganizationPreferences,
): OrganizationPreferences {
  const base = normalizeOrganizationPreferences(current);
  return {
    organization: { ...base.organization, ...(patch.organization ?? {}) },
    appearance: { ...base.appearance, ...(patch.appearance ?? {}) },
    regional: { ...base.regional, ...(patch.regional ?? {}) },
    crm: { ...base.crm, ...(patch.crm ?? {}) },
    automations: { ...base.automations, ...(patch.automations ?? {}) },
    notifications: { ...base.notifications, ...(patch.notifications ?? {}) },
    security: { ...base.security, ...(patch.security ?? {}) },
    privacy: { ...base.privacy, ...(patch.privacy ?? {}) },
    marketing: { ...base.marketing, ...(patch.marketing ?? {}) },
  };
}

export function applyOrganizationPreferences(preferences: OrganizationPreferences) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeOrganizationPreferences(preferences);
  const root = document.documentElement;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = normalized.appearance.theme === 'system'
    ? (prefersDark ? 'dark' : 'light')
    : normalized.appearance.theme;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = normalized.appearance.theme;
  root.dataset.compact = normalized.appearance.compactMode ? 'true' : 'false';
  root.dataset.currency = normalized.regional.currency;
  root.dataset.timezone = normalized.regional.timezone;
  root.dataset.dateFormat = normalized.regional.dateFormat;
  root.dataset.timeFormat = normalized.regional.timeFormat;
  root.lang = normalized.regional.locale;
  root.style.setProperty('--brand-accent', normalized.appearance.primaryColor);
}

export async function getOrganizationSettings() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('id,company_name,legal_name,document,phone,email,website,city,state,preferences')
    .eq('id', 1)
    .single();
  if (error) throw error;
  const settings = data as OrganizationSettings;
  settings.preferences = (settings.preferences ?? {}) as OrganizationPreferences;
  return settings;
}

export async function updateOrganizationSettings(input: Omit<OrganizationSettings, 'id' | 'preferences'>) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('organization_settings').update(input).eq('id', 1);
  if (error) throw error;
}

export async function updateOrganizationPreferences(preferences: OrganizationPreferences) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('organization_settings')
    .update({ preferences: preferences as Json })
    .eq('id', 1);
  if (error) throw error;
  applyOrganizationPreferences(preferences);
}
