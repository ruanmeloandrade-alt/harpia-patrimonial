import { requireSupabase } from '../../core/supabase/client';
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

export async function listInternalUsers() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('user_profiles').select('id,full_name,whatsapp,account_type,is_active,created_at').eq('account_type', 'internal').order('full_name');
  if (error) throw error;
  return (data ?? []) as InternalUserRow[];
}

export async function updateInternalUser(userId: string, input: { fullName: string; whatsapp?: string }) {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('O nome do usuário é obrigatório.');
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, whatsapp: input.whatsapp?.trim() || null })
    .eq('id', userId)
    .eq('account_type', 'internal');
  if (error) throw error;
}

export async function setInternalUserActive(userId: string, isActive: boolean) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('user_profiles').update({ is_active: isActive }).eq('id', userId).eq('account_type', 'internal');
  if (error) throw error;
}

export async function createInternalUser(input: { fullName: string; email: string; whatsapp?: string; password: string; groupId?: string }) {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sessão interna inválida.');
  const { data, error } = await supabase.functions.invoke('admin-user', { body: input, headers: { Authorization: `Bearer ${token}` } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Não foi possível criar o usuário.');
  return data as { ok: true; userId: string; warning?: string };
}

export async function getUserGroupIds(userId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('user_group_memberships').select('group_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row: { group_id: string }) => row.group_id));
}

export async function replaceUserGroups(userId: string, groupIds: string[]) {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from('user_group_memberships').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (groupIds.length === 0) return;
  const { error: insertError } = await supabase.from('user_group_memberships').insert(groupIds.map((groupId) => ({ user_id: userId, group_id: groupId })));
  if (insertError) throw insertError;
}

export async function getUserPermissionOverrides(userId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('user_permission_overrides').select('permission_id,effect').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as UserPermissionOverride[];
}

export async function setUserPermissionOverride(userId: string, permissionId: string, effect: PermissionEffect | null) {
  const supabase = requireSupabase();
  if (!effect) {
    const { error } = await supabase.from('user_permission_overrides').delete().eq('user_id', userId).eq('permission_id', permissionId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('user_permission_overrides').upsert({ user_id: userId, permission_id: permissionId, effect }, { onConflict: 'user_id,permission_id' });
  if (error) throw error;
}
