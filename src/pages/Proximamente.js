export async function renderPage(container, route) {
  const title = route?.params?.title || 'Próximamente';
  const text = route?.params?.text || 'Esta función estará disponible en una próxima actualización.';

  container.innerHTML = `
    <div class="page-container">
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h2 class="empty-state-title">${title}</h2>
        <p class="empty-state-text">${text}</p>
        <a href="/" class="btn btn-primary" style="margin-top: var(--spacing-4);" data-link>Volver al inicio</a>
      </div>
    </div>
  `;
}
