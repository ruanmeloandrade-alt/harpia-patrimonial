import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { useAppRouter } from '../../core/router/router';
import { getUserPreferences, type UserPreferences } from '../settings/user-preferences-service';
import {
  listUnreadNotifications,
  markNotificationRead,
  subscribeUserNotifications,
  type UserNotification,
} from './notification-service';

function playNotificationSound() {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 760;
    gain.gain.value = 0.045;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.13);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Som é complementar; falha de áudio não interrompe a notificação.
  }
}

export function NotificationCenter() {
  const auth = useAuth();
  const { navigate } = useAppRouter();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [toasts, setToasts] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);
  const preferencesRef = useRef<UserPreferences | null>(null);
  const userId = auth.user?.id;

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    void Promise.all([getUserPreferences(userId), listUnreadNotifications(userId)])
      .then(([preferences, notifications]) => {
        if (!mounted) return;
        preferencesRef.current = preferences;
        setItems(notifications);
      })
      .catch(() => undefined);

    const unsubscribe = subscribeUserNotifications(userId, (notification) => {
      const preferences = preferencesRef.current;
      setItems((current) => [notification, ...current].slice(0, 20));

      if (preferences?.popup_notifications !== false) {
        setToasts((current) => [notification, ...current].slice(0, 4));
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== notification.id));
        }, 7000);
      }

      if (preferences?.sound_notifications !== false) playNotificationSound();

      if (
        preferences?.browser_notifications
        && typeof Notification !== 'undefined'
        && Notification.permission === 'granted'
      ) {
        new Notification(notification.title, { body: notification.body });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId]);

  async function openNotification(notification: UserNotification) {
    try {
      await markNotificationRead(notification.id);
    } catch {
      // A navegação não deve ser bloqueada por falha ao marcar como lida.
    }
    setItems((current) => current.filter((item) => item.id !== notification.id));
    setToasts((current) => current.filter((item) => item.id !== notification.id));
    if (notification.href) navigate(notification.href);
  }

  if (!userId) return null;

  return (
    <>
      <div className="notification-center">
        <button
          type="button"
          className={items.length ? 'notification-center__bell has-unread' : 'notification-center__bell'}
          onClick={() => setOpen((value) => !value)}
          aria-label="Notificações"
        >
          <span aria-hidden="true">🔔</span>
          {items.length ? <b>{items.length > 99 ? '99+' : items.length}</b> : null}
        </button>
        {open ? (
          <div className="notification-center__panel">
            <div className="notification-center__head"><strong>Notificações</strong><span>{items.length} não lida(s)</span></div>
            {items.length === 0 ? (
              <div className="notification-center__empty">Nenhuma notificação pendente.</div>
            ) : items.map((item) => (
              <button type="button" className="notification-center__item" key={item.id} onClick={() => void openNotification(item)}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <small>{new Date(item.created_at).toLocaleString('pt-BR')}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="notification-toasts" aria-live="polite">
        {toasts.map((item) => (
          <button type="button" className="notification-toast" key={item.id} onClick={() => void openNotification(item)}>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </button>
        ))}
      </div>
    </>
  );
}
