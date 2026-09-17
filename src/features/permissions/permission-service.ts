import { requireSupabase } from '../../core/supabase/client';

export type Permission = { id: string; key: string; label: string; module: string; description: string | null };
export type PermissionGroup = { id: string; name: string; slug: string; description: string | null; is_active: boolean; is_system: boolean };
export type PermissionEffect = 'allow' | 'deny';

export async function listPermissions() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('permissions').select('id,key,label,module,description').order('module').order('label');
  if (error) throw error;
  return (data ?? []) as Permission[];
}

export async function listGroups() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('permission_groups').select('id,name,slug,description,is_active,is_system').order('name');
  if (error) throw error;
  return (data ?? []) as PermissionGroup[];
}

export async function createGroup(input: { name: string; slug: string; description?: string }) {
  const supabase = requireSupabase();
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !slug) throw new Error('Nome e identificador do grupo são obrigatórios.');
  const { error } = await supabase.from('permission_groups').insert({ name, slug, description: input.description?.trim() || null, is_active: true, is_system: false });
  if (error) throw error;
}

export async function updateGroup(groupId: string, input: { name: string; description?: string }) {
  const name = input.name.trim();
  if (!name) throw new Error('O nome do grupo é obrigatório.');
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('permission_groups')
    .update({ name, description: input.description?.trim() || null })
    .eq('id', groupId)
    .eq('is_system', false);
  if (error) throw error;
}

export async function setGroupActive(groupId: string, isActive: boolean) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('permission_groups').update({ is_active: isActive }).eq('id', groupId).eq('is_system', false);
  if (error) throw error;
}

export async function getGroupPermissionIds(groupId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('group_permissions').select('permission_id,effect').eq('group_id', groupId);
  if (error) throw error;
  return new Set((data ?? []).filter((row: { effect: PermissionEffect }) => row.effect === 'allow').map((row: { permission_id: string }) => row.permission_id));
}

export async function replaceGroupPermissions(groupId: string, permissionIds: string[]) {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from('group_permissions').delete().eq('group_id', groupId);
  if (deleteError) throw deleteError;
  if (permissionIds.length === 0) return;
  const { error: insertError } = await supabase.from('group_permissions').insert(permissionIds.map((permissionId) => ({ group_id: groupId, permission_id: permissionId, effect: 'allow' as const })));
  if (insertError) throw insertError;
}
