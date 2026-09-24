import { requireSupabase } from '../../core/supabase/client';

export type UserThemePreference = 'light' | 'dark' | 'system';

export type UserPreferences = {
  theme: UserThemePreference;
  compact_mode: boolean;
  popup_notifications: boolean;
  sound_notifications: boolean;
  browser_notifications: boolean;
  notify_new_lead: boolean;
  notify_new_message: boolean;
  notify_task_due: boolean;
  notify_automation_failure: boolean;
  notify_integration_failure: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  compact_mode: false,
  popup_notifications: true,
  sound_notifications: true,
  browser_notifications: false,
  notify_new_lead: true,
  notify_new_message: true,
  notify_task_due: true,
  notify_automation_failure: true,
  notify_integration_failure: true,
};

export function applyUserAppearance(preferences: Pick<UserPreferences, 'theme' | 'compact_mode'>) {
  if (typeof document === 'undefined') return;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = preferences.theme === 'system' ? (prefersDark ? 'dark' : 'light') : preferences.theme;
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preferences.theme;
  root.dataset.compact = preferences.compact_mode ? 'true' : 'false';
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('theme,compact_mode,popup_notifications,sound_notifications,browser_notifications,notify_new_lead,notify_new_message,notify_task_due,notify_automation_failure,notify_integration_failure')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    const row = { user_id: userId, ...DEFAULT_USER_PREFERENCES };
    const { error: insertError } = await supabase.from('user_preferences').insert(row);
    if (insertError) throw insertError;
    return { ...DEFAULT_USER_PREFERENCES };
  }

  return { ...DEFAULT_USER_PREFERENCES, ...(data as Partial<UserPreferences>) };
}

export async function updateUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const supabase = requireSupabase() as any;
  const current = await getUserPreferences(userId);
  const next = { ...current, ...patch };
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  applyUserAppearance(next);
  return next;
}
