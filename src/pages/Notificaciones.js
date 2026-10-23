import { authService } from '../services/auth.js';
import { toastService } from '../services/toast.js';
import { notificationService, hasVapidPublicKey } from '../services/notifications.js';

export async function renderPage(container) {
  const user = authService.getUser();
  const isAuth = !!user;

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Notificaciones</h1>
        <p class="page-subtitle">Avisos push de bus-in-live en tu navegador</p>
      </header>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-header">
          <h2>Estado actual</h2>
        </div>
        <div class="card-body" style="display: grid; gap: var(--spacing-4); color: var(--text-secondary);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-4); flex-wrap: wrap;">
            <span>Notificaciones push</span>
            <span class="badge" id="push-status-badge" role="status" aria-live="polite">Cargando...</span>
          </div>
          <p id="push-detail" style="font-size: var(--text-sm);">Verificando el soporte de tu navegador...</p>
        </div>
      </div>

      <div class="card" id="push-actions-card">
        <div class="card-header">
          <h2>Activar o desactivar</h2>
        </div>
        <div class="card-body" style="display: grid; gap: var(--spacing-4);">
          <div id="push-warning" style="display: none;"></div>
          <p style="color: var(--text-secondary); font-size: var(--text-sm);">
            Al activarlas, tu navegador pedirá permiso. Las notificaciones se envían desde el servidor
            de bus-in-live y pueden abrir la app al tocarlas. Puedes desactivarlas cuando quieras.
          </p>
          <div style="display: flex; gap: var(--spacing-3); flex-wrap: wrap;">
            <button class="btn btn-primary" id="push-enable-btn" disabled>Activar notificaciones</button>
            <button class="btn btn-secondary" id="push-disable-btn" style="display: none;">Desactivar</button>
          </div>
          <p id="push-auth-hint" style="display: none; font-size: var(--text-sm); color: var(--text-secondary);">
            <a href="/login" data-link>Inicia sesión</a> para guardar tus notificaciones en tu cuenta.
          </p>
        </div>
      </div>
    </div>
  `;

  const statusBadge = document.getElementById('push-status-badge');
  const detailEl = document.getElementById('push-detail');
  const warningEl = document.getElementById('push-warning');
  const enableBtn = document.getElementById('push-enable-btn');
  const disableBtn = document.getElementById('push-disable-btn');
  const authHint = document.getElementById('push-auth-hint');

  function renderWarning(message) {
    warningEl.innerHTML = `<div class="alert alert-warning">${message}</div>`;
    warningEl.style.display = 'block';
  }

  async function updateState() {
    const supported = notificationService.isSupported();
    const vapidConfigured = hasVapidPublicKey();
    const permission = notificationService.getPermissionState();
    const subscribed = await notificationService.isEnabled();

    enableBtn.disabled = true;
    disableBtn.style.display = 'none';
    enableBtn.style.display = 'inline-flex';
    warningEl.style.display = 'none';

    if (!supported) {
      statusBadge.textContent = 'No soportado';
      statusBadge.className = 'badge badge-muted';
      detailEl.textContent = 'Tu navegador no soporta notificaciones push. Prueba con otro navegador o versión más reciente.';
      return;
    }

    if (!vapidConfigured) {
      statusBadge.textContent = 'No habilitado';
      statusBadge.className = 'badge badge-warning';
      detailEl.textContent = 'Este despliegue no tiene configurada la clave pública VAPID (VITE_VAPID_PUBLIC_KEY), por lo que no es posible activar notificaciones push.';
      renderWarning('Las push no están habilitadas en este despliegue.');
      return;
    }

    if (permission === 'denied') {
      statusBadge.textContent = 'Permiso denegado';
      statusBadge.className = 'badge badge-error';
      detailEl.textContent = 'Bloqueaste las notificaciones para este sitio. Para activarlas, habilita el permiso de notificaciones en la configuración de tu navegador y vuelve aquí.';
      return;
    }

    if (subscribed) {
      statusBadge.textContent = 'Suscrito';
      statusBadge.className = 'badge badge-success';
      detailEl.textContent = permission === 'granted'
        ? 'Tu navegador está suscrito a las notificaciones push de bus-in-live.'
        : 'Hay una suscripción en este navegador, pero el permiso actual es "' + permission + '".';
      enableBtn.style.display = 'none';
      disableBtn.style.display = 'inline-flex';
      if (!isAuth) authHint.style.display = 'block';
      return;
    }

    // Sin suscripción activa.
    if (permission === 'granted') {
      statusBadge.textContent = 'Permiso concedido';
      statusBadge.className = 'badge badge-info';
      detailEl.textContent = 'Tu navegador permite notificaciones, pero aún no estás suscrito.';
    } else {
      statusBadge.textContent = 'Desactivado';
      statusBadge.className = 'badge badge-muted';
      detailEl.textContent = 'Las notificaciones están desactivadas. Al activarlas, el navegador te pedirá permiso.';
    }

    if (!isAuth) {
      authHint.style.display = 'block';
    }
    enableBtn.disabled = false;
  }

  enableBtn.onclick = async () => {
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    try {
      const result = await notificationService.subscribe();
      if (result?.saved === false) {
        toastService.warning('Notificaciones activadas en este navegador, pero no se guardaron en tu cuenta. Inténtalo más tarde.');
      } else {
        toastService.success('Notificaciones activadas');
      }
    } catch (error) {
      toastService.error(error.message || 'No se pudieron activar las notificaciones.');
    } finally {
      enableBtn.disabled = false;
      disableBtn.disabled = false;
      await updateState();
    }
  };

  disableBtn.onclick = async () => {
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    try {
      const result = await notificationService.unsubscribe();
      if (result?.removed === false) {
        toastService.info('Notificaciones desactivadas en este navegador. La suscripción no se pudo eliminar de tu cuenta.');
      } else {
        toastService.success('Notificaciones desactivadas');
      }
    } catch (error) {
      toastService.error(error.message || 'No se pudieron desactivar las notificaciones.');
    } finally {
      enableBtn.disabled = false;
      disableBtn.disabled = false;
      await updateState();
    }
  };

  await updateState();
}
