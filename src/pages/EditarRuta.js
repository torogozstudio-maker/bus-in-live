import { routeService } from '../services/routes.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { escapeAttr, escapeHtml } from '../utils/sanitize.js';
import { setFieldError, clearFieldError, clearAllErrors, focusFirstInvalid } from '../utils/formValidation.js';

let cleanupCallbacks = [];

export async function renderPage(container, route) {
  const routeId = route?.params?.id;
  if (!routeId) {
    router.navigate('/rutas');
    return;
  }
  if (!authService.isAuthenticated()) {
    toastService.info('Inicia sesión para editar rutas');
    router.navigate('/login');
    return;
  }

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Editar ruta</h1>
        <p class="page-subtitle">Cargando información...</p>
      </header>
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando ruta...</p>
      </div>
    </div>
  `;

  const { data: routeData, error } = await routeService.getRouteById(routeId);
  if (error || !routeData) {
    container.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 class="empty-state-title">Ruta no encontrada</h2>
          <p class="empty-state-text">La ruta que intentas editar no existe o fue eliminada.</p>
          <a href="/rutas" class="btn btn-primary" style="margin-top:16px;" data-link>Volver a rutas</a>
        </div>
      </div>
    `;
    return;
  }

  const user = authService.getUser();
  const isAdmin = authService.isAdmin();
  const isOwner = routeData.created_by === user?.id;
  const canDirectEdit = isAdmin || (isOwner && routeData.validation_status === 'pending');

  renderEditForm(container, routeData, { isAdmin, isOwner, canDirectEdit });
}

function renderEditForm(container, routeData, permissions) {
  const { canDirectEdit } = permissions;
  const mode = canDirectEdit ? 'direct' : 'request';
  const validationLabel = {
    pending: 'Pendiente de aprobación',
    approved: 'Aprobada',
    rejected: 'Rechazada'
  }[routeData.validation_status] || routeData.validation_status;

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Editar ruta ${escapeHtml(routeData.code)}</h1>
        <p class="page-subtitle">${escapeHtml(routeData.name)}</p>
      </header>

      <div class="card" style="margin-bottom: var(--spacing-4);">
        <div class="card-body">
          <div class="badge badge-${routeData.validation_status === 'approved' ? 'success' : routeData.validation_status === 'rejected' ? 'error' : 'warning'}">${escapeHtml(validationLabel)}</div>
          ${mode === 'request' ? `
            <div class="info-banner" style="margin-top: var(--spacing-3); padding: var(--spacing-3); background: var(--bg-secondary); border-left: 3px solid var(--primary-action); border-radius: 4px;">
              <p><strong>Solicitud de cambio:</strong> esta ruta ya no está pendiente de aprobación, por lo que tu modificación se enviará a un administrador para su revisión.</p>
            </div>
          ` : `
            <div class="info-banner" style="margin-top: var(--spacing-3); padding: var(--spacing-3); background: var(--bg-secondary); border-left: 3px solid var(--primary-action); border-radius: 4px;">
              <p>Los cambios se guardan directamente${routeData.validation_status === 'pending' ? ' mientras la ruta siga pendiente de aprobación' : ''}.</p>
            </div>
          `}
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <form id="edit-route-form" novalidate>
            <div class="form-row">
              <div class="form-group">
                <label for="route-code" class="form-label">Código *</label>
                <input type="text" id="route-code" name="code" class="form-input" required maxlength="20" value="${escapeAttr(routeData.code)}" autocomplete="off" aria-describedby="route-code-error">
                <p class="field-error" id="route-code-error" role="alert"></p>
              </div>
              <div class="form-group">
                <label for="route-type" class="form-label">Tipo</label>
                <select id="route-type" name="type" class="form-input form-select">
                  <option value="regular" ${routeData.type === 'regular' ? 'selected' : ''}>Regular</option>
                  <option value="especial" ${routeData.type === 'especial' ? 'selected' : ''}>Especial</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="route-name" class="form-label">Nombre *</label>
              <input type="text" id="route-name" name="name" class="form-input" required maxlength="120" value="${escapeAttr(routeData.name)}" autocomplete="off" aria-describedby="route-name-error">
              <p class="field-error" id="route-name-error" role="alert"></p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="route-origin" class="form-label">Origen *</label>
                <input type="text" id="route-origin" name="origin" class="form-input" required maxlength="120" value="${escapeAttr(routeData.origin)}" autocomplete="off" aria-describedby="route-origin-error">
                <p class="field-error" id="route-origin-error" role="alert"></p>
              </div>
              <div class="form-group">
                <label for="route-destination" class="form-label">Destino *</label>
                <input type="text" id="route-destination" name="destination" class="form-input" required maxlength="120" value="${escapeAttr(routeData.destination)}" autocomplete="off" aria-describedby="route-destination-error">
                <p class="field-error" id="route-destination-error" role="alert"></p>
              </div>
            </div>

            <div class="form-group">
              <label for="route-status" class="form-label">Estado de la ruta</label>
              <select id="route-status" name="status" class="form-input form-select" ${permissions.isAdmin ? '' : 'disabled'} aria-describedby="route-status-hint">
                <option value="normal" ${routeData.status === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="delay" ${routeData.status === 'delay' ? 'selected' : ''}>Retraso</option>
                <option value="detour" ${routeData.status === 'detour' ? 'selected' : ''}>Desvío</option>
                <option value="temporary_detour" ${routeData.status === 'temporary_detour' ? 'selected' : ''}>Desvío temporal</option>
                <option value="suspended" ${routeData.status === 'suspended' ? 'selected' : ''}>Suspendido</option>
                <option value="out_of_service" ${routeData.status === 'out_of_service' ? 'selected' : ''}>Fuera de servicio</option>
                <option value="insufficient_info" ${routeData.status === 'insufficient_info' ? 'selected' : ''}>Información insuficiente</option>
              </select>
              ${permissions.isAdmin ? '' : '<p class="form-hint" id="route-status-hint">Solo los administradores pueden cambiar el estado de una ruta aprobada.</p>'}
            </div>

            ${mode === 'request' ? `
              <div class="form-group">
                <label for="change-reason" class="form-label">Motivo del cambio *</label>
                <textarea id="change-reason" class="form-input" rows="3" required placeholder="Explica por qué se debe cambiar esta ruta..." aria-describedby="change-reason-error"></textarea>
                <p class="field-error" id="change-reason-error" role="alert"></p>
              </div>
            ` : ''}

            <div class="form-actions" style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-4);">
              <button type="submit" class="btn btn-primary" id="save-route-btn">
                <span class="btn-text">${mode === 'request' ? 'Enviar solicitud' : 'Guardar cambios'}</span>
                <span class="btn-loading" style="display:none;"><div class="loading-spinner"></div></span>
              </button>
              <a href="/rutas/${routeData.id}" class="btn btn-ghost" data-link>Cancelar</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  attachListeners(routeData, mode);
}

function attachListeners(routeData, mode) {
  const form = document.getElementById('edit-route-form');
  const submitBtn = document.getElementById('save-route-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  ['route-code', 'route-name', 'route-origin', 'route-destination', 'change-reason'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const code = document.getElementById('route-code').value.trim();
    const name = document.getElementById('route-name').value.trim();
    const origin = document.getElementById('route-origin').value.trim();
    const destination = document.getElementById('route-destination').value.trim();
    const type = document.getElementById('route-type').value;
    const statusSelect = document.getElementById('route-status');
    const status = statusSelect && !statusSelect.disabled ? statusSelect.value : routeData.status;

    let valid = true;
    if (!code) { setFieldError('route-code', 'Ingresa el código de la ruta'); valid = false; }
    if (!name) { setFieldError('route-name', 'Ingresa un nombre para la ruta'); valid = false; }
    if (!origin) { setFieldError('route-origin', 'Ingresa el origen'); valid = false; }
    if (!destination) { setFieldError('route-destination', 'Ingresa el destino'); valid = false; }

    let reason = null;
    if (mode === 'request') {
      reason = document.getElementById('change-reason').value.trim();
      if (!reason) { setFieldError('change-reason', 'Explica el motivo del cambio'); valid = false; }
      else if (reason.length < 10) { setFieldError('change-reason', 'El motivo debe tener al menos 10 caracteres'); valid = false; }
    }

    if (!valid) { focusFirstInvalid(form); return; }

    const proposedData = { code, name, origin, destination, type, status };

    setLoading(true);
    try {
      let error;
      if (mode === 'direct') {
        const result = await routeService.updateRoute(routeData.id, proposedData);
        error = result.error;
      } else {
        const oldData = {
          code: routeData.code,
          name: routeData.name,
          origin: routeData.origin,
          destination: routeData.destination,
          type: routeData.type,
          status: routeData.status
        };
        const result = await routeService.requestChange(routeData.id, 'edit', oldData, proposedData, reason);
        error = result.error;
      }

      if (error) throw new Error(error.message || error);

      if (mode === 'request') {
        toastService.success('Solicitud de cambio enviada a revisión.');
      } else {
        toastService.success('Ruta actualizada.');
      }
      router.navigate(`/rutas/${routeData.id}`);
    } catch (err) {
      console.error('Edit route error:', err);
      const message = String(err.message || '');
      if (mode === 'direct' && message.includes('row-level security')) {
        toastService.error('No tienes permiso para editar esta ruta directamente.');
      } else {
        toastService.error('No se pudo guardar el cambio. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  form.addEventListener('submit', onSubmit);

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : '';
    btnLoading.style.display = loading ? '' : 'none';
  }
}

export function cleanup() {
  cleanupCallbacks.forEach((fn) => { try { fn(); } catch (e) { /* ya removido */ } });
  cleanupCallbacks = [];
}
