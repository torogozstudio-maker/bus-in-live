import { routeService } from '../services/routes.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { getCurrentCity } from '../config/city.js';
import { escapeAttr } from '../utils/sanitize.js';
import { setFieldError, clearFieldError, clearAllErrors, focusFirstInvalid } from '../utils/formValidation.js';

export async function renderPage(container) {
  if (!authService.isAuthenticated()) {
    toastService.info('Inicia sesión para crear una ruta');
    router.navigate('/login');
    return;
  }

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Crear ruta</h1>
        <p class="page-subtitle">Propón una nueva ruta de transporte público</p>
      </header>

      <div class="card">
        <div class="card-body">
          <div class="info-banner" style="margin-bottom: var(--spacing-4); padding: var(--spacing-3); background: var(--bg-secondary); border-left: 3px solid var(--primary-action); border-radius: 4px;">
            <p><strong>Importante:</strong> la ruta se enviará a revisión. Será visible para todos una vez que un administrador la apruebe.</p>
          </div>

          <form id="create-route-form" novalidate>
            <div class="form-row">
              <div class="form-group">
                <label for="route-code" class="form-label">Código *</label>
                <input type="text" id="route-code" name="code" class="form-input" required maxlength="20" placeholder="Ej: 101, 401-A" autocomplete="off" aria-describedby="route-code-error">
                <p class="field-error" id="route-code-error" role="alert"></p>
              </div>
              <div class="form-group">
                <label for="route-type" class="form-label">Tipo</label>
                <select id="route-type" name="type" class="form-input form-select">
                  <option value="regular">Regular</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="route-name" class="form-label">Nombre *</label>
              <input type="text" id="route-name" name="name" class="form-input" required maxlength="120" placeholder="Ej: Ruta 101 - Centro / Mercado Central" autocomplete="off" aria-describedby="route-name-error">
              <p class="field-error" id="route-name-error" role="alert"></p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="route-origin" class="form-label">Origen *</label>
                <input type="text" id="route-origin" name="origin" class="form-input" required maxlength="120" placeholder="Ej: Terminal de Occidente" autocomplete="off" aria-describedby="route-origin-error">
                <p class="field-error" id="route-origin-error" role="alert"></p>
              </div>
              <div class="form-group">
                <label for="route-destination" class="form-label">Destino *</label>
                <input type="text" id="route-destination" name="destination" class="form-input" required maxlength="120" placeholder="Ej: Hospital Nacional" autocomplete="off" aria-describedby="route-destination-error">
                <p class="field-error" id="route-destination-error" role="alert"></p>
              </div>
            </div>

            <div class="form-group">
              <label for="route-city" class="form-label">Ciudad</label>
              <input type="text" id="route-city" name="city" class="form-input" value="${escapeAttr(getCurrentCity())}" maxlength="80" readonly aria-describedby="route-city-hint">
              <p class="form-hint" id="route-city-hint">La ciudad se toma de tu configuración actual.</p>
            </div>

            <div class="form-actions" style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-4);">
              <button type="submit" class="btn btn-primary" id="create-route-btn">
                <span class="btn-text">Enviar a revisión</span>
                <span class="btn-loading" style="display:none;"><div class="loading-spinner"></div></span>
              </button>
              <a href="/rutas" class="btn btn-ghost" data-link>Cancelar</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  attachListeners();
}

function attachListeners() {
  const form = document.getElementById('create-route-form');
  const submitBtn = document.getElementById('create-route-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  ['route-code', 'route-name', 'route-origin', 'route-destination'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const code = document.getElementById('route-code').value.trim();
    const name = document.getElementById('route-name').value.trim();
    const origin = document.getElementById('route-origin').value.trim();
    const destination = document.getElementById('route-destination').value.trim();
    const type = document.getElementById('route-type').value;
    const city = document.getElementById('route-city').value.trim() || getCurrentCity();

    let valid = true;
    if (!code) {
      setFieldError('route-code', 'Ingresa el código de la ruta');
      valid = false;
    } else if (code.length > 20) {
      setFieldError('route-code', 'El código no puede exceder 20 caracteres');
      valid = false;
    }
    if (!name) {
      setFieldError('route-name', 'Ingresa un nombre para la ruta');
      valid = false;
    }
    if (!origin) {
      setFieldError('route-origin', 'Ingresa el origen de la ruta');
      valid = false;
    }
    if (!destination) {
      setFieldError('route-destination', 'Ingresa el destino de la ruta');
      valid = false;
    }
    if (valid && origin && destination && origin.toLowerCase() === destination.toLowerCase()) {
      setFieldError('route-destination', 'El destino no puede ser igual al origen');
      valid = false;
    }
    if (!valid) {
      focusFirstInvalid(form);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await routeService.createRoute({
        code,
        name,
        origin,
        destination,
        type,
        city
      });

      if (error) throw new Error(error.message || error);

      toastService.success('Ruta enviada a revisión. Te avisaremos cuando sea aprobada.');
      router.navigate(data?.id ? `/rutas/${data.id}` : '/rutas');
    } catch (err) {
      console.error('Create route error:', err);
      const message = String(err.message || '');
      if (message.includes('duplicate key') || message.includes('unique')) {
        setFieldError('route-code', 'Ya existe una ruta con ese código');
        focusFirstInvalid(form);
      } else if (message.includes('row-level security')) {
        toastService.error('No tienes permiso para crear rutas. Inicia sesión e inténtalo de nuevo.');
      } else {
        toastService.error('No se pudo crear la ruta. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : '';
    btnLoading.style.display = loading ? '' : 'none';
  }
}
