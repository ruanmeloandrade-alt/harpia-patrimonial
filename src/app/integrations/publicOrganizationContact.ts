import { requireSupabase } from '../../core/supabase/client';

export interface PublicOrganizationContact {
  phone: string | null;
}

export async function loadPublicOrganizationContact(): Promise<PublicOrganizationContact> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('public-organization-contact', {
    body: {},
  });

  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.message || 'Não foi possível carregar o contato público da organização.');
  }

  const phone = typeof data.phone === 'string' && data.phone.trim()
    ? data.phone.trim()
    : null;

  return { phone };
}
