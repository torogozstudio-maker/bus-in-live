import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="loading-state" style="margin: 0 auto;">
            <div class="loading-spinner" style="width: 40px; height: 40px; border-width: 3px;"></div>
          </div>
          <h1 style="margin-top: 24px;">Completando inicio de sesión...</h1>
          <p>Por favor espera mientras procesamos tu autenticación</p>
        </div>
      </div>
    </div>
  `;

  try {
    const supabase = (await import('../services/supabase.js')).getSupabase();
    if (supabase) {
      // detectSessionInUrl ya intercambió el código al iniciar la app; solo confirmamos la sesión
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) throw new Error('No se obtuvo la sesión');
    }
    toastService.success('Sesión iniciada correctamente');
    router.navigate('/');
  } catch (error) {
    console.error('Auth callback error:', error);
    toastService.error('Error al completar el inicio de sesión');
    router.navigate('/login');
  }
}