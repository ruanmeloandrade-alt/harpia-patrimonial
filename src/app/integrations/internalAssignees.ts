import { requireSupabase } from '../../core/supabase/client';
import type { AssigneeOption } from '../../features/crm/CrmWorkspace';

export async function loadInternalAssignees(): Promise<AssigneeOption[]> {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase.rpc('list_internal_assignees');
  if (error) throw error;
  return (data ?? []).map((row: { id: string; full_name: string }) => ({
    id: row.id,
    name: row.full_name,
  }));
}
