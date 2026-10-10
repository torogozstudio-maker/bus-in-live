import './styles/main.css';
import { createApp } from './app.js';
import { initSupabase } from './services/supabase.js';
import { authService } from './services/auth.js';
import { router } from './utils/router.js';
import { toastService } from './services/toast.js';

async function bootstrap() {
  try {
    initSupabase();
    await authService.initialize();
    createApp();
    router.start();
  } catch (error) {
    console.error('Failed to bootstrap app:', error);
    toastService.error('Error al iniciar la aplicación');
  }
}

bootstrap();