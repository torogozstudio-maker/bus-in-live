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
          <h1>Crear cuenta</h1>
          <p>Únete a la comunidad de transporte público de Santa Ana</p>
        </div>

        <form id="register-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="name" class="form-label">Nombre</label>
            <input type="text" id="name" name="name" class="form-input" required autocomplete="name" placeholder="Tu nombre">
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input type="email" id="email" name="email" class="form-input" required autocomplete="email" placeholder="tu@email.com">
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <input type="password" id="password" name="password" class="form-input" required autocomplete="new-password" placeholder="Mínimo 8 caracteres" minlength="8">
            <p class="form-hint">Mínimo 8 caracteres</p>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirmar contraseña</label>
            <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" required autocomplete="new-password" placeholder="Repite tu contraseña">
          </div>

          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" name="terms" value="1" required>
              <span class="checkbox-custom"></span>
              Acepto los <a href="/terminos" data-link>términos y condiciones</a> y la <a href="/privacidad" data-link>política de privacidad</a>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="register-btn">
            <span class="btn-text">Crear cuenta</span>
            <span class="btn-loading" style="display:none;"><div class="loading-spinner"></div></span>
          </button>
        </form>

        <div class="auth-divider">
          <span>o regístrate con</span>
        </div>

        <button type="button" id="google-register" class="btn btn-secondary btn-full btn-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>
          Google
        </button>

        <p class="auth-footer">
          ¿Ya tienes cuenta? <a href="/login" data-link>Inicia sesión</a>
        </p>
      </div>
    </div>
  `;

  attachListeners();
}

function attachListeners() {
  const form = document.getElementById('register-form');
  const googleBtn = document.getElementById('google-register');
  const submitBtn = document.getElementById('register-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!name || !email || !password) {
      toastService.error('Por favor completa todos los campos');
      return;
    }

    if (password.length < 8) {
      toastService.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toastService.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await authService.signUp(email, password, name);
      toastService.success('Cuenta creada. Revisa tu correo para confirmar.');
      router.navigate('/login');
    } catch (error) {
      console.error('Register error:', error);
      const message = error.message?.includes('User already registered')
        ? 'Este correo ya está registrado'
        : 'Error al crear la cuenta. Inténtalo de nuevo.';
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
      console.error('Google register error:', error);
      toastService.error('Error al registrar con Google');
      setLoading(false);
    }
  });

  confirmInput.addEventListener('input', () => {
    if (confirmInput.value && passwordInput.value !== confirmInput.value) {
      confirmInput.setCustomValidity('Las contraseñas no coinciden');
    } else {
      confirmInput.setCustomValidity('');
    }
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    googleBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoading.style.display = loading ? 'inline-flex' : 'none';
  }
}