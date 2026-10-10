import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container, route) {
  const isReset = route.pathname.includes('reset-password') && route.query.get('token');

  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <a href="/" class="auth-brand" data-link>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
            <span>bus-in-live</span>
          </a>
          <h1>${isReset ? 'Restablecer contraseña' : 'Recuperar contraseña'}</h1>
          <p>${isReset ? 'Ingresa tu nueva contraseña' : 'Te enviaremos un enlace para restablecer tu contraseña'}</p>
        </div>

        <form id="reset-form" class="auth-form" novalidate>
          ${!isReset ? `
            <div class="form-group">
              <label for="email" class="form-label">Correo electrónico</label>
              <input type="email" id="email" name="email" class="form-input" required autocomplete="email" placeholder="tu@email.com">
            </div>
          ` : `
            <div class="form-group">
              <label for="password" class="form-label">Nueva contraseña</label>
              <input type="password" id="password" name="password" class="form-input" required autocomplete="new-password" placeholder="Mínimo 8 caracteres" minlength="8">
              <p class="form-hint">Mínimo 8 caracteres</p>
            </div>
            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirmar contraseña</label>
              <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" required autocomplete="new-password" placeholder="Repite tu contraseña">
            </div>
          `}

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="reset-btn">
            <span class="btn-text">${isReset ? 'Actualizar contraseña' : 'Enviar enlace'}</span>
            <span class="btn-loading" style="display:none;"><div class="loading-spinner"></div></span>
          </button>
        </form>

        <p class="auth-footer">
          <a href="/login" data-link>Volver a iniciar sesión</a>
        </p>
      </div>
    </div>
  `;

  attachListeners(isReset);
}

function attachListeners(isReset) {
  const form = document.getElementById('reset-form');
  const submitBtn = document.getElementById('reset-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    if (!isReset) {
      const email = formData.get('email').trim();
      if (!email) {
        toastService.error('Ingresa tu correo electrónico');
        return;
      }

      setLoading(true);
      try {
        await authService.resetPassword(email);
        toastService.success('Si el correo existe, recibirás un enlace para restablecer tu contraseña');
        router.navigate('/login');
      } catch (error) {
        console.error('Reset password error:', error);
        toastService.error('Error al enviar el enlace. Inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    } else {
      const password = formData.get('password');
      const confirmPassword = formData.get('confirmPassword');

      if (!password || password.length < 8) {
        toastService.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }

      if (password !== confirmPassword) {
        toastService.error('Las contraseñas no coinciden');
        return;
      }

      setLoading(true);
      try {
        await authService.updatePassword(password);
        toastService.success('Contraseña actualizada correctamente');
        router.navigate('/login');
      } catch (error) {
        console.error('Update password error:', error);
        toastService.error('Error al actualizar la contraseña. El enlace puede haber expirado.');
        router.navigate('/reset-password');
      } finally {
        setLoading(false);
      }
    }
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoading.style.display = loading ? 'inline-flex' : 'none';
  }
}