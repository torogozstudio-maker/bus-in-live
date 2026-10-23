import { getSupabase } from '../services/supabase.js';
import { authService } from '../services/auth.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container) {
  const user = authService.getUser();
  const isAuth = !!user;

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Privacidad y datos</h1>
        <p class="page-subtitle">Cómo usamos tu información</p>
      </header>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-header">
          <h2>¿Qué datos guardamos?</h2>
        </div>
        <div class="card-body" style="display: grid; gap: var(--spacing-4); color: var(--text-secondary);">
          <p><strong style="color: var(--text);">Cuenta:</strong> tu correo electrónico y nombre. Se usan para identificarte y no se muestran públicamente.</p>
          <p><strong style="color: var(--text);">Reportes:</strong> si reportas un problema, se guarda la descripción, el tipo y la ruta o parada afectada. Los reportes son anónimos: tu nombre no se muestra.</p>
          <p><strong style="color: var(--text);">Viajes:</strong> si usas la función "Estoy viajando", se comparte tu posición estimada para mejorar el ETA de la comunidad.</p>
          <p><strong style="color: var(--text);">Ubicación:</strong> solo se recopila con tu consentimiento explícito (permiso del navegador). Puedes dejar de compartirla en cualquier momento.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-header">
          <h2>¿Quién puede ver tus datos?</h2>
        </div>
        <div class="card-body" style="display: grid; gap: var(--spacing-4); color: var(--text-secondary);">
          <p>Tu correo y nombre <strong style="color: var(--text);">no</strong> se muestran públicamente. Los reportes que creas son anónimos para otros usuarios.</p>
          <p>Los administradores de la plataforma pueden ver reportes para moderarlos, pero no tu ubicación en tiempo real.</p>
          <p>Tu ubicación GPS solo se comparte cuando tú lo decides (botón "Estoy viajando" o reportes con ubicación). No se rastrea en segundo plano.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--spacing-6);">
        <div class="card-header">
          <h2>Solicitar eliminación de datos</h2>
        </div>
        <div class="card-body" style="color: var(--text-secondary);">
          <p>Puedes solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento. Escribe un mensaje en el siguiente enlace:</p>
          <p style="margin-top: var(--spacing-3);">
            <a href="https://github.com/torogozstudio-maker/bus-in-live/issues" target="_blank" rel="noopener noreferrer" aria-label="Abrir una nueva issue en GitHub en una pestaña nueva">Pedir eliminación en GitHub Issues</a>
          </p>
        </div>
      </div>

      ${isAuth ? `
        <div class="card" id="gps-consent-card">
          <div class="card-header">
            <h2>Consentimiento de ubicación GPS</h2>
          </div>
          <div class="card-body">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-4); flex-wrap: wrap;">
              <div style="min-width: 200px; flex: 1;">
                <p style="font-weight: 600; margin-bottom: var(--spacing-1);">Compartir mi ubicación GPS</p>
                <p style="color: var(--text-secondary); font-size: var(--text-sm);">Permite mejorar el ETA y los reportes de la comunidad. Puedes desactivarlo cuando quieras.</p>
              </div>
              <label class="form-checkbox" style="flex-shrink: 0;">
                <input type="checkbox" id="gps-consent-toggle" aria-label="Activar o desactivar el consentimiento de ubicación GPS">
                <span class="checkbox-custom"></span>
                <span id="gps-consent-label">Cargando...</span>
              </label>
            </div>
          </div>
        </div>
      ` : `
        <div class="card">
          <div class="card-body" style="color: var(--text-secondary);">
            <p>Inicia sesión para gestionar tu consentimiento de ubicación GPS.</p>
            <a href="/login" class="btn btn-primary" style="margin-top: var(--spacing-4);" data-link>Iniciar sesión</a>
          </div>
        </div>
      `}
    </div>
  `;

  if (isAuth) {
    await initGpsConsent();
  }
}

async function initGpsConsent() {
  const supabase = getSupabase();
  const user = authService.getUser();
  const toggle = document.getElementById('gps-consent-toggle');
  const label = document.getElementById('gps-consent-label');
  if (!supabase || !user || !toggle || !label) return;

  // Leer estado actual (la tabla NO tiene unique(user_id): no usar upsert con onConflict)
  let gpsEnabled = false;
  try {
    const { data } = await supabase
      .from('user_consents')
      .select('gps_enabled')
      .eq('user_id', user.id)
      .maybeSingle();
    gpsEnabled = !!data?.gps_enabled;
  } catch (err) {
    console.warn('No se pudo leer el consentimiento GPS:', err);
  }

  toggle.checked = gpsEnabled;
  label.textContent = gpsEnabled ? 'Activado' : 'Desactivado';

  toggle.addEventListener('change', async () => {
    const newValue = toggle.checked;
    toggle.disabled = true;
    label.textContent = newValue ? 'Activado' : 'Desactivado';

    try {
      // Buscar fila existente; si no, insertar; si sí, actualizar (sin upsert/onConflict)
      const { data: existing } = await supabase
        .from('user_consents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_consents')
          .update({ gps_enabled: newValue })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_consents')
          .insert({ user_id: user.id, gps_enabled: newValue });
        if (error) throw error;
      }

      toastService.success(newValue
        ? 'Consentimiento de ubicación activado'
        : 'Consentimiento de ubicación desactivado');
    } catch (error) {
      console.error('Error updating GPS consent:', error);
      // Revertir
      toggle.checked = !newValue;
      label.textContent = toggle.checked ? 'Activado' : 'Desactivado';
      toastService.error('No se pudo guardar el consentimiento. Inténtalo de nuevo.');
    } finally {
      toggle.disabled = false;
    }
  });
}
