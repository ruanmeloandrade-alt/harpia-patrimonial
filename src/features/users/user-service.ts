import { isSupabaseConfigured, requireSupabase } from '../../core/supabase/client';
import type { PermissionEffect } from '../permissions/permission-service';

export type InternalUserRow = {
  id: string;
  full_name: string;
  whatsapp: string | null;
  account_type: 'client' | 'internal';
  is_active: boolean;
  created_at: string;
};

export type UserPermissionOverride = { permission_id: string; effect: PermissionEffect };

const LOCAL_USERS_KEY = 'harpia.local.internal-users';
const LOCAL_USER_GROUPS_KEY = 'harpia.local.user-groups';
const LOCAL_USER_OVERRIDES_KEY = 'harpia.local.user-overrides';

function defaultUsers(): InternalUserRow[] {
  return [{
    id: 'local-internal-user',
    full_name: 'Equipe Hárpia',
    whatsapp: null,
    account_type: 'internal',
    is_active: true,
    created_at: new Date(0).toISOString(),
  }];
}

function readUsers(): InternalUserRow[] {
  if (typeof window === 'undefined') return defaultUsers();
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) as InternalUserRow[] : defaultUsers();
  } catch {
    return defaultUsers();
  }
}

function writeUsers(users: InternalUserRow[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function readUserGroups(): Record<string, string[]> {
  if (typeof window === 'undefined') return { 'local-internal-user': ['local-admin'] };
  try {
    const raw = window.localStorage.getItem(LOCAL_USER_GROUPS_KEY);
    return raw ? JSON.parse(raw) as Record<string, string[]> : { 'local-internal-user': ['local-admin'] };
  } catch {
    return { 'local-internal-user': ['local-admin'] };
  }
}

function writeUserGroups(value: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_USER_GROUPS_KEY, JSON.stringify(value));
}

function readUserOverrides(): Record<string, UserPermissionOverride[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_USER_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) as Record<string, UserPermissionOverride[]> : {};
  } catch {
    return {};
  }
}

function writeUserOverrides(value: Record<string, UserPermissionOverride[]>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_USER_OVERRIDES_KEY, JSON.stringify(value));
}

export async function listInternalUsers() {
  if (!isSupabaseConfigured) return readUsers();
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('user_profiles').select('id,full_name,whatsapp,account_type,is_active,created_at').eq('account_type', 'internal').order('full_name');
  if (error) throw error;
  return (data ?? []) as InternalUserRow[];
}

export async function updateInternalUser(userId: string, input: { fullName: string; whatsapp?: string }) {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('O nome do usuário é obrigatório.');
  if (!isSupabaseConfigured) {
    writeUsers(readUsers().map((user) => user.id === userId ? { ...user, full_name: fullName, whatsapp: input.whatsapp?.trim() || null } : user));
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, whatsapp: input.whatsapp?.trim() || null })
    .eq('id', userId)
    .eq('account_type', 'internal');
  if (error) throw error;
}

export async function setInternalUserActive(userId: string, isActive: boolean) {
  if (!isSupabaseConfigured) {
    writeUsers(readUsers().map((user) => user.id === userId ? { ...user, is_active: isActive } : user));
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase.from('user_profiles').update({ is_active: isActive }).eq('id', userId).eq('account_type', 'internal');
  if (error) throw error;
}

export async function createInternalUser(input: { fullName: string; email: string; whatsapp?: string; password: string; groupId?: string; groupIds?: string[]; permissionOverrides?: Array<{ permissionId: string; effect: PermissionEffect }> }) {
  if (!isSupabaseConfigured) {
    const fullName = input.fullName.trim();
    if (!fullName) throw new Error('O nome do usuário é obrigatório.');
    const userId = `local-user-${Date.now()}`;
    writeUsers([...readUsers(), {
      id: userId,
      full_name: fullName,
      whatsapp: input.whatsapp?.trim() || null,
      account_type: 'internal',
      is_active: true,
      created_at: new Date().toISOString(),
    }]);
    const groups = readUserGroups();
    groups[userId] = input.groupIds?.length ? input.groupIds : input.groupId ? [input.groupId] : [];
    writeUserGroups(groups);
    const overrides = readUserOverrides();
    overrides[userId] = (input.permissionOverrides ?? []).map((item) => ({ permission_id: item.permissionId, effect: item.effect }));
    writeUserOverrides(overrides);
    return { ok: true as const, userId, warning: 'Usuário salvo localmente até o Supabase dedicado ser conectado.', accessApplied: true };
  }
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sessão interna inválida.');
  const { data, error } = await supabase.functions.invoke('admin-user', { body: input, headers: { Authorization: `Bearer ${token}` } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Não foi possível criar o usuário.');
  return data as { ok: true; userId: string; warning?: string; accessApplied?: boolean };
}

export async function getUserGroupIds(userId: string) {
  if (!isSupabaseConfigured) return new Set(readUserGroups()[userId] ?? []);
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('user_group_memberships').select('group_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row: { group_id: string }) => row.group_id));
}

export async function replaceUserGroups(userId: string, groupIds: string[]) {
  if (!isSupabaseConfigured) {
    const current = readUserGroups();
    current[userId] = groupIds;
    writeUserGroups(current);
    return;
  }
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from('user_group_memberships').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (groupIds.length === 0) return;
  const { error: insertError } = await supabase.from('user_group_memberships').insert(groupIds.map((groupId) => ({ user_id: userId, group_id: groupId })));
  if (insertError) throw insertError;
}

export async function getUserPermissionOverrides(userId: string) {
  if (!isSupabaseConfigured) return readUserOverrides()[userId] ?? [];
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('user_permission_overrides').select('permission_id,effect').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as UserPermissionOverride[];
}

export async function setUserPermissionOverride(userId: string, permissionId: string, effect: PermissionEffect | null) {
  if (!isSupabaseConfigured) {
    const current = readUserOverrides();
    const rows = (current[userId] ?? []).filter((row) => row.permission_id !== permissionId);
    if (effect) rows.push({ permission_id: permissionId, effect });
    current[userId] = rows;
    writeUserOverrides(current);
    return;
  }
  const supabase = requireSupabase();
  if (!effect) {
    const { error } = await supabase.from('user_permission_overrides').delete().eq('user_id', userId).eq('permission_id', permissionId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('user_permission_overrides').upsert({ user_id: userId, permission_id: permissionId, effect }, { onConflict: 'user_id,permission_id' });
  if (error) throw error;
}
