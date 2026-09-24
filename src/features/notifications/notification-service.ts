import { requireSupabase } from '../../core/supabase/client';

export type UserNotificationKind =
  | 'new_lead'
  | 'new_message'
  | 'task_due'
  | 'automation_failure'
  | 'integration_failure'
  | 'system';

export type UserNotification = {
  id: string;
  user_id: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

export async function listUnreadNotifications(userId: string): Promise<UserNotification[]> {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id,user_id,kind,title,body,href,created_at,read_at')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as UserNotification[];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = requireSupabase() as any;
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

export function subscribeUserNotifications(userId: string, listener: (notification: UserNotification) => void) {
  const supabase = requireSupabase() as any;
  const channel = supabase
    .channel(`harpia-user-notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` },
      (payload: { new: UserNotification }) => listener(payload.new),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
