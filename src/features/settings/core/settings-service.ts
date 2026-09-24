import { requireSupabase } from '../../../core/supabase/client';
import type { Json } from '../../../core/supabase/database.types';
import { applyRuntimeRegionalPreferences } from '../runtime-preferences';

export type TimeFormatPreference = '24h' | '12h';
export type BusinessWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type BusinessDaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

export type BusinessHoursSchedule = Record<BusinessWeekday, BusinessDaySchedule>;

export type OrganizationPreferences = {
  organization?: {
    addressLine?: string;
    postalCode?: string;
    country?: string;
  };
  appearance?: {
    logoUrl?: string;
    primaryColor?: string;
    theme?: 'light' | 'dark' | 'system';
    compactMode?: boolean;
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
    businessHours?: Partial<BusinessHoursSchedule>;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    outsideBusinessHours?: 'queue' | 'keep_unassigned';
    requirePhoneForLead?: boolean;
  };
  automations?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
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
    businessHours: BusinessHoursSchedule;
    outsideBusinessHours: 'queue' | 'keep_unassigned';
    requirePhoneForLead: boolean;
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

export const DEFAULT_BUSINESS_HOURS: BusinessHoursSchedule = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: false, start: '09:00', end: '13:00' },
  sunday: { enabled: false, start: '09:00', end: '13:00' },
};

export const DEFAULT_ORGANIZATION_PREFERENCES: NormalizedOrganizationPreferences = {
  organization: {
    addressLine: '',
    postalCode: '',
    country: 'Brasil',
  },
  appearance: {
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
    businessHours: DEFAULT_BUSINESS_HOURS,
    outsideBusinessHours: 'queue',
    requirePhoneForLead: false,
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

function normalizeBusinessHours(crm: OrganizationPreferences['crm']): BusinessHoursSchedule {
  const legacyStart = crm?.businessHoursStart || '09:00';
  const legacyEnd = crm?.businessHoursEnd || '18:00';
  const stored = crm?.businessHours ?? {};
  const result = {} as BusinessHoursSchedule;

  (Object.keys(DEFAULT_BUSINESS_HOURS) as BusinessWeekday[]).forEach((day) => {
    const fallback = DEFAULT_BUSINESS_HOURS[day];
    const legacyFallback = day === 'saturday' || day === 'sunday'
      ? fallback
      : { enabled: true, start: legacyStart, end: legacyEnd };
    result[day] = { ...legacyFallback, ...(stored[day] ?? {}) };
  });

  return result;
}

export function normalizeOrganizationPreferences(preferences: OrganizationPreferences = {}): NormalizedOrganizationPreferences {
  return {
    organization: { ...DEFAULT_ORGANIZATION_PREFERENCES.organization, ...(preferences.organization ?? {}) },
    appearance: {
      ...DEFAULT_ORGANIZATION_PREFERENCES.appearance,
      logoUrl: preferences.appearance?.logoUrl ?? DEFAULT_ORGANIZATION_PREFERENCES.appearance.logoUrl,
      primaryColor: preferences.appearance?.primaryColor ?? DEFAULT_ORGANIZATION_PREFERENCES.appearance.primaryColor,
    },
    regional: { ...DEFAULT_ORGANIZATION_PREFERENCES.regional, ...(preferences.regional ?? {}) },
    crm: {
      ...DEFAULT_ORGANIZATION_PREFERENCES.crm,
      ...(preferences.crm ?? {}),
      businessHours: normalizeBusinessHours(preferences.crm),
    },
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
    ...current,
    organization: { ...base.organization, ...(patch.organization ?? {}) },
    appearance: { ...base.appearance, ...(patch.appearance ?? {}) },
    regional: { ...base.regional, ...(patch.regional ?? {}) },
    crm: {
      ...base.crm,
      ...(patch.crm ?? {}),
      businessHours: patch.crm?.businessHours
        ? { ...base.crm.businessHours, ...patch.crm.businessHours }
        : base.crm.businessHours,
    },
    security: { ...base.security, ...(patch.security ?? {}) },
    privacy: { ...base.privacy, ...(patch.privacy ?? {}) },
    marketing: { ...base.marketing, ...(patch.marketing ?? {}) },
  };
}

export function applyOrganizationRegionalPreferences(preferences: OrganizationPreferences) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeOrganizationPreferences(preferences);
  const root = document.documentElement;
  applyRuntimeRegionalPreferences(normalized.regional);
  root.style.setProperty('--brand-accent', normalized.appearance.primaryColor);
  root.style.setProperty('--gold', normalized.appearance.primaryColor);
}

export const applyOrganizationPreferences = applyOrganizationRegionalPreferences;

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
  applyOrganizationRegionalPreferences(preferences);
}
