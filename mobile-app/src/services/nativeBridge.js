import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

let initialized = false;

export function initNativeLifecycle() {
  if (initialized) return;
  initialized = true;
  App.addListener('appStateChange', ({ isActive }) => {
    window.dispatchEvent(new CustomEvent('treino:appstate', { detail: { isActive } }));
  });
}

export const nativeBridge = {
  async requestNotifications() {
    try { await LocalNotifications.requestPermissions(); } catch {}
  },
  async scheduleRestNotification({ id, at, title, body }) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({ notifications: [{ id, title, body, schedule: { at } }] });
    } catch (error) { console.warn('Notificação local indisponível', error); }
  },
  async cancelNotification(id) {
    try { await LocalNotifications.cancel({ notifications: [{ id }] }); } catch {}
  },
  async haptic(level = 'medium') {
    try { await Haptics.impact({ style: level === 'heavy' ? ImpactStyle.Heavy : level === 'light' ? ImpactStyle.Light : ImpactStyle.Medium }); } catch {}
  }
};
