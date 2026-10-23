import { authService } from '../services/auth.js';
import { toastService } from '../services/toast.js';
import { escapeHtml, escapeAttr } from '../utils/sanitize.js';

export async function renderPage(container) {
  const user = authService.getUser();
  if (!user) {
    container.innerHTML = '<div class="empty-state"><p>No hay sesión activa.</p></div>';
    return;
  }

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-SV', { dateStyle: 'long' }) : '—';
  const lastSignIn = user.lastSignIn ? new Date(user.lastSignIn).toLocaleString('es-SV', { dateStyle: 'long', timeStyle: 'short' }) : '—';

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Mi perfil</h1>
        <p class="page-subtitle">Tu cuenta en bus-in-live</p>
      </header>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-body" style="display: flex; align-items: center; gap: var(--spacing-5);">
          <div class="avatar" style="width: 64px; height: 64px; font-size: 1.5rem; background-color: var(--primary-action); flex-shrink: 0;" aria-hidden="true">${escapeHtml(initial)}</div>
          <div style="min-width: 0;">
            <div style="font-size: var(--text-lg); font-weight: 600;">${escapeHtml(user.name || 'Usuario')}</div>
            <div style="color: var(--text-secondary); word-break: break-all;">${escapeHtml(user.email)}</div>
            <div style="margin-top: var(--spacing-2);">
              <span class="badge ${user.role === 'admin' ? 'badge-error' : 'badge-info'}">${user.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-header">
          <h2>Información de la cuenta</h2>
        </div>
        <div class="card-body">
          <dl style="display: grid; gap: var(--spacing-4);">
            <div style="display: flex; justify-content: space-between; gap: var(--spacing-4);">
              <dt style="color: var(--text-secondary);">Correo electrónico</dt>
              <dd style="text-align: right; word-break: break-all;">${escapeHtml(user.email)}</dd>
            </div>
            <div style="display: flex; justify-content: space-between; gap: var(--spacing-4);">
              <dt style="color: var(--text-secondary);">Fecha de registro</dt>
              <dd style="text-align: right;">${createdAt}</dd>
            </div>
            <div style="display: flex; justify-content: space-between; gap: var(--spacing-4);">
              <dt style="color: var(--text-secondary);">Último acceso</dt>
              <dd style="text-align: right;">${lastSignIn}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-header">
          <h2>Cambiar nombre</h2>
        </div>
        <div class="card-body">
          <form id="profile-form" novalidate>
            <div class="form-group">
              <label for="profile-name" class="form-label">Nombre</label>
              <input type="text" id="profile-name" name="name" class="form-input" value="${escapeAttr(user.name || '')}" autocomplete="name" placeholder="Tu nombre">
            </div>
            <button type="submit" class="btn btn-primary" id="save-profile-btn">Guardar cambios</button>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="display: flex; flex-wrap: wrap; gap: var(--spacing-3);">
          <button type="button" class="btn btn-secondary" id="profile-signout">Cerrar sesión</button>
          <a href="/privacidad" class="btn btn-ghost" data-link>Privacidad y datos</a>
        </div>
      </div>
    </div>
  `;

  attachListeners();
}

function attachListeners() {
  const form = document.getElementById('profile-form');
  const saveBtn = document.getElementById('save-profile-btn');
  const signoutBtn = document.getElementById('profile-signout');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = new FormData(form).get('name').trim();

    if (!name) {
      toastService.error('El nombre no puede estar vacío');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    try {
      await authService.updateProfile({ full_name: name });
      toastService.success('Nombre actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toastService.error('No se pudo actualizar el nombre. Inténtalo de nuevo.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
  });

  signoutBtn.addEventListener('click', async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toastService.error('No se pudo cerrar la sesión');
    }
  });
}
