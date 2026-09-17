import { requireSupabase } from '../core/supabase/client';

export type CoreMetrics = { internalUsers: number; customGroups: number };

export async function getCoreMetrics(): Promise<CoreMetrics> {
  const supabase = requireSupabase();
  const [{ count: internalUsers, error: usersError }, { count: customGroups, error: groupsError }] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'internal'),
    supabase.from('permission_groups').select('id', { count: 'exact', head: true }).eq('is_system', false),
  ]);
  if (usersError) throw usersError;
  if (groupsError) throw groupsError;
  return { internalUsers: internalUsers ?? 0, customGroups: customGroups ?? 0 };
}
