import { isSupabaseConfigured, requireSupabase } from '../../core/supabase/client';
import { PERMISSIONS } from '../../core/auth/permissions';

export type Permission = { id: string; key: string; label: string; module: string; description: string | null };
export type PermissionGroup = { id: string; name: string; slug: string; description: string | null; is_active: boolean; is_system: boolean };
export type PermissionEffect = 'allow' | 'deny';

const LOCAL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).map((key) => {
  const [module, action] = key.split('.');
  return {
    id: key,
    key,
    label: `${module} ${action}`,
    module,
    description: null,
  };
});

const LOCAL_GROUPS_KEY = 'harpia.local.permission-groups';
const LOCAL_GROUP_PERMISSIONS_KEY = 'harpia.local.group-permissions';

function defaultGroups(): PermissionGroup[] {
  return [
    {
      id: 'local-admin',
      name: 'Administrador',
      slug: 'administrador',
      description: 'Acesso completo local até o Supabase dedicado ser conectado.',
      is_active: true,
      is_system: true,
    },
  ];
}

function readGroups(): PermissionGroup[] {
  if (typeof window === 'undefined') return defaultGroups();
  try {
    const raw = window.localStorage.getItem(LOCAL_GROUPS_KEY);
    return raw ? JSON.parse(raw) as PermissionGroup[] : defaultGroups();
  } catch {
    return defaultGroups();
  }
}

function writeGroups(groups: PermissionGroup[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups));
}

function readGroupPermissions(): Record<string, string[]> {
  if (typeof window === 'undefined') return { 'local-admin': LOCAL_PERMISSIONS.map((permission) => permission.id) };
  try {
    const raw = window.localStorage.getItem(LOCAL_GROUP_PERMISSIONS_KEY);
    return raw ? JSON.parse(raw) as Record<string, string[]> : { 'local-admin': LOCAL_PERMISSIONS.map((permission) => permission.id) };
  } catch {
    return { 'local-admin': LOCAL_PERMISSIONS.map((permission) => permission.id) };
  }
}

function writeGroupPermissions(value: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_GROUP_PERMISSIONS_KEY, JSON.stringify(value));
}

export async function listPermissions() {
  if (!isSupabaseConfigured) return LOCAL_PERMISSIONS;
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('permissions').select('id,key,label,module,description').order('module').order('label');
  if (error) throw error;
  return (data ?? []) as Permission[];
}

export async function listGroups() {
  if (!isSupabaseConfigured) return readGroups();
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('permission_groups').select('id,name,slug,description,is_active,is_system').order('name');
  if (error) throw error;
  return (data ?? []) as PermissionGroup[];
}

export async function createGroup(input: { name: string; slug: string; description?: string }) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !slug) throw new Error('Nome e identificador do grupo são obrigatórios.');
  if (!isSupabaseConfigured) {
    const groups = readGroups();
    groups.push({
      id: `local-group-${Date.now()}`,
      name,
      slug,
      description: input.description?.trim() || null,
      is_active: true,
      is_system: false,
    });
    writeGroups(groups);
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase.from('permission_groups').insert({ name, slug, description: input.description?.trim() || null, is_active: true, is_system: false });
  if (error) throw error;
}

export async function updateGroup(groupId: string, input: { name: string; description?: string }) {
  const name = input.name.trim();
  if (!name) throw new Error('O nome do grupo é obrigatório.');
  if (!isSupabaseConfigured) {
    writeGroups(readGroups().map((group) => group.id === groupId && !group.is_system ? { ...group, name, description: input.description?.trim() || null } : group));
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('permission_groups')
    .update({ name, description: input.description?.trim() || null })
    .eq('id', groupId)
    .eq('is_system', false);
  if (error) throw error;
}

export async function setGroupActive(groupId: string, isActive: boolean) {
  if (!isSupabaseConfigured) {
    writeGroups(readGroups().map((group) => group.id === groupId && !group.is_system ? { ...group, is_active: isActive } : group));
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase.from('permission_groups').update({ is_active: isActive }).eq('id', groupId).eq('is_system', false);
  if (error) throw error;
}

export async function getGroupPermissionIds(groupId: string) {
  if (!isSupabaseConfigured) return new Set(readGroupPermissions()[groupId] ?? []);
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('group_permissions').select('permission_id,effect').eq('group_id', groupId);
  if (error) throw error;
  return new Set((data ?? []).filter((row: { effect: PermissionEffect }) => row.effect === 'allow').map((row: { permission_id: string }) => row.permission_id));
}

export async function replaceGroupPermissions(groupId: string, permissionIds: string[]) {
  if (!isSupabaseConfigured) {
    const current = readGroupPermissions();
    current[groupId] = permissionIds;
    writeGroupPermissions(current);
    return;
  }
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from('group_permissions').delete().eq('group_id', groupId);
  if (deleteError) throw deleteError;
  if (permissionIds.length === 0) return;
  const { error: insertError } = await supabase.from('group_permissions').insert(permissionIds.map((permissionId) => ({ group_id: groupId, permission_id: permissionId, effect: 'allow' as const })));
  if (insertError) throw insertError;
}
