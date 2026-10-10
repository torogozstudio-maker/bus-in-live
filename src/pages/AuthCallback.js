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
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.search);
      if (error) throw error;
    }
    toastService.success('Sesión iniciada correctamente');
    router.navigate('/');
  } catch (error) {
    console.error('Auth callback error:', error);
    toastService.error('Error al completar el inicio de sesión');
    router.navigate('/login');
  }
}