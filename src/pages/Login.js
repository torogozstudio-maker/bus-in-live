import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <a href="/" class="auth-brand" data-link>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
            <span>bus-in-live</span>
          </a>
          <h1>Iniciar sesión</h1>
          <p>Accede a tu cuenta para usar todas las funciones</p>
        </div>

        <form id="login-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input type="email" id="email" name="email" class="form-input" required autocomplete="email" placeholder="tu@email.com">
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <input type="password" id="password" name="password" class="form-input" required autocomplete="current-password" placeholder="••••••••">
          </div>

          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" name="remember" value="1">
              <span class="checkbox-custom"></span>
              Recordarme
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="login-btn">
            <span class="btn-text">Iniciar sesión</span>
            <span class="btn-loading" style="display:none;"><div class="loading-spinner"></div></span>
          </button>
        </form>

        <div class="auth-divider">
          <span>o continúa con</span>
        </div>

        <button type="button" id="google-login" class="btn btn-secondary btn-full btn-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>
          Google
        </button>

        <p class="auth-footer">
          ¿No tienes cuenta? <a href="/register" data-link>Regístrate</a>
        </p>

        <p class="auth-footer">
          <a href="/reset-password" data-link>¿Olvidaste tu contraseña?</a>
        </p>
      </div>
    </div>
  `;

  attachListeners();
}

function attachListeners() {
  const form = document.getElementById('login-form');
  const googleBtn = document.getElementById('google-login');
  const submitBtn = document.getElementById('login-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const email = formData.get('email').trim();
    const password = formData.get('password');

    if (!email || !password) {
      toastService.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      await authService.signIn(email, password);
      toastService.success('Bienvenido de vuelta');
      router.navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      // Mostrar error real de Supabase para debugging
      const supabaseMessage = error.message || error.error_description || '';
      let message = 'Error al iniciar sesión. Inténtalo de nuevo.';
      
      if (supabaseMessage.includes('Invalid login credentials') || supabaseMessage.includes('invalid_credentials')) {
        message = 'Correo o contraseña incorrectos';
      } else if (supabaseMessage.includes('Email not confirmed') || supabaseMessage.includes('email_not_confirmed')) {
        message = 'Debes confirmar tu email. Revisa tu bandeja de entrada (y spam)';
      } else if (supabaseMessage.includes('Too many requests')) {
        message = 'Demasiados intentos. Espera un momento';
      } else if (supabaseMessage) {
        message = `Error: ${supabaseMessage}`;
      }
      
      toastService.error(message);
    } finally {
      setLoading(false);
    }
  });

  googleBtn.addEventListener('click', async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      toastService.error('Error al iniciar sesión con Google');
      setLoading(false);
    }
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    googleBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoading.style.display = loading ? 'inline-flex' : 'none';
  }
}