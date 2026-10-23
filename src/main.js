import '@fontsource-variable/inter/wght.css';
import './styles/main.css';
import './styles/layout.css';
import './styles/pages.css';
import { createApp } from './app.js';
import { initSupabase } from './services/supabase.js';
import { authService } from './services/auth.js';
import { router } from './utils/router.js';
import { toastService } from './services/toast.js';
import { notificationService } from './services/notifications.js';

// Registra el Service Worker (solo si el navegador lo soporta), diferido para no
// competir con la carga inicial. NO crea suscripción push: eso es opt-in del usuario.
function setupServiceWorker() {
  if (!notificationService.isSupported()) return;
  const register = () => {
    notificationService.registerServiceWorker().catch((error) => {
      console.warn('No se pudo registrar el Service Worker:', error);
    });
  };
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

async function bootstrap() {
  try {
    initSupabase();
    await authService.initialize();
    createApp();
    router.start();
    setupServiceWorker();
  } catch (error) {
    console.error('Failed to bootstrap app:', error);
    toastService.error('Error al iniciar la aplicación');
  }
}

bootstrap();