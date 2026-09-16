import { requireSupabase } from '../../../core/supabase/client';

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
};

export async function getOrganizationSettings() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('organization_settings').select('id,company_name,legal_name,document,phone,email,website,city,state').eq('id', 1).single();
  if (error) throw error;
  return data as OrganizationSettings;
}

export async function updateOrganizationSettings(input: Omit<OrganizationSettings, 'id'>) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('organization_settings').update(input).eq('id', 1);
  if (error) throw error;
}
