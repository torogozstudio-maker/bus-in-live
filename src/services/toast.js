import { eventBus } from '../utils/eventBus.js';

let container = null;
const TOAST_EVENTS = {
  SHOW: 'toast:show'
};

function createContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-label', 'Notificaciones');
  document.body.appendChild(container);
  return container;
}

function createToast(message, type = 'info', options = {}) {
  const { duration = 5000, action } = options;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const iconMap = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };

  toast.innerHTML = `
    <div class="toast-icon" style="flex-shrink: 0;">${iconMap[type] || iconMap.info}</div>
    <div class="toast-content" style="flex: 1; min-width: 0;">
      <p style="margin: 0; line-height: 1.4;">${message}</p>
    </div>
    <button class="toast-close" style="flex-shrink: 0; padding: 0; color: inherit; opacity: 0.6;" aria-label="Cerrar">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  if (action) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-action';
    actionBtn.textContent = action.label;
    actionBtn.style.cssText = 'margin-left: auto; padding: 2px 8px; font-size: 0.75rem; font-weight: 500; border-radius: 4px; background: currentColor; color: inherit; opacity: 0.8;';
    actionBtn.addEventListener('click', () => {
      action.handler();
      removeToast(toast);
    });
    toast.querySelector('.toast-content').appendChild(actionBtn);
  }

  return toast;
}

function removeToast(toast) {
  toast.style.animation = 'slideIn 0.2s reverse';
  setTimeout(() => toast.remove(), 200);
}

export const toastService = {
  init() {
    createContainer();
    eventBus.on(TOAST_EVENTS.SHOW, ({ message, type, options }) => {
      this.show(message, type, options);
    });
  },

  show(message, type = 'info', options = {}) {
    const toast = createToast(message, type, options);
    const containerEl = createContainer();
    containerEl.appendChild(toast);

    if (options.duration !== 0) {
      const duration = options.duration || 5000;
      setTimeout(() => removeToast(toast), duration);
    }

    return toast;
  },

  success(message, options) {
    return this.show(message, 'success', options);
  },

  error(message, options) {
    return this.show(message, 'error', { duration: 8000, ...options });
  },

  warning(message, options) {
    return this.show(message, 'warning', options);
  },

  info(message, options) {
    return this.show(message, 'info', options);
  },

  dismissAll() {
    if (container) {
      container.querySelectorAll('.toast').forEach(removeToast);
    }
  }
};

export { TOAST_EVENTS };