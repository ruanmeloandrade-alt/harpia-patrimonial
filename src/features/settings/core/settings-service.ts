import { requireSupabase } from '../../../core/supabase/client';

export type OrganizationPreferences = Record<string, unknown>;

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

export async function getOrganizationSettings() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('id,company_name,legal_name,document,phone,email,website,city,state,preferences')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as OrganizationSettings;
}

export async function updateOrganizationSettings(input: Omit<OrganizationSettings, 'id' | 'preferences'>) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('organization_settings').update(input).eq('id', 1);
  if (error) throw error;
}

export async function updateOrganizationPreferences(preferences: OrganizationPreferences) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('organization_settings').update({ preferences }).eq('id', 1);
  if (error) throw error;
}
