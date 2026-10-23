import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

const SW_URL = `${import.meta.env.BASE_URL}sw.js`;

// Convierte la clave pública VAPID (base64url) a Uint8Array para PushManager.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function hasVapidPublicKey() {
  return !!import.meta.env.VITE_VAPID_PUBLIC_KEY;
}

async function getRegistration() {
  return navigator.serviceWorker.getRegistration() || navigator.serviceWorker.ready;
}

async function getActiveSubscription() {
  if (!notificationService.isSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('No se pudo leer la suscripción push:', err);
    return null;
  }
}

// Guarda la suscripción en Supabase (tabla push_subscriptions).
// Devuelve true si se guardó, false si Supabase no está configurado o falló la escritura.
async function persistSubscription(subscription, userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return false;
  const { endpoint, keys } = subscription.toJSON();
  try {
    const { data: existing, error: selectError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .maybeSingle();
    if (selectError) throw selectError;
    // Mismo endpoint = misma suscripción del navegador: no hace falta reinsertar.
    if (existing) return true;
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth });
    if (insertError) throw insertError;
    return true;
  } catch (err) {
    console.warn('No se pudo guardar la suscripción push en Supabase:', err);
    return false;
  }
}

async function removePersistedSubscription(subscription, userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return false;
  const { endpoint } = subscription.toJSON();
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('No se pudo eliminar la suscripción push de Supabase:', err);
    return false;
  }
}

export const notificationService = {
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  getPermissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  async isEnabled() {
    return !!(await getActiveSubscription());
  },

  // Registra el Service Worker (si el navegador lo soporta). No hace nada automático
  // con la suscripción: solo registra el SW para poder suscribirse después.
  async registerServiceWorker() {
    if (!this.isSupported()) return null;
    return navigator.serviceWorker.register(SW_URL);
  },

  // publicKey: clave VAPID opcional; por defecto lee VITE_VAPID_PUBLIC_KEY.
  // Lanza error claro si falta la clave o el permiso. Si Supabase falla al guardar,
  // la suscripción local SÍ queda creada y el resultado indica saved=false.
  async subscribe(publicKey) {
    if (!this.isSupported()) {
      throw new Error('Tu navegador no soporta notificaciones push.');
    }
    const key = publicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!key) {
      throw new Error('Push no habilitado en este despliegue (falta VITE_VAPID_PUBLIC_KEY)');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        permission === 'denied'
          ? 'Permiso de notificaciones denegado. Habilítalo en la configuración del navegador.'
          : 'No se concedió el permiso de notificaciones.'
      );
    }

    await this.registerServiceWorker();
    const registration = await getRegistration();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });

    const userId = authService.getUser()?.id || null;
    const saved = await persistSubscription(subscription, userId);
    return { data: subscription, saved };
  },

  async unsubscribe() {
    const subscription = await getActiveSubscription();
    if (!subscription) return { data: false, removed: true };

    const userId = authService.getUser()?.id || null;
    const removed = await removePersistedSubscription(subscription, userId);
    const unsubscribed = await subscription.unsubscribe();
    return { data: unsubscribed, removed };
  }
};
