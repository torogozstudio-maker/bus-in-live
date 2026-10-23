// Utilidades de validación de formularios: avisos por campo (aria-invalid + role="alert").

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let error = document.getElementById(`${inputId}-error`);
  if (!error) {
    error = document.createElement('p');
    error.id = `${inputId}-error`;
    error.className = 'field-error';
    error.setAttribute('role', 'alert');
    input.parentNode.insertBefore(error, input.nextSibling);
  }
  error.textContent = message;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', error.id);
}

export function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const error = document.getElementById(`${inputId}-error`);
  if (error) error.textContent = '';
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}

export function clearAllErrors(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach(el => {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
  });
}

export function focusFirstInvalid(form) {
  const first = form.querySelector('[aria-invalid="true"]');
  if (first) first.focus();
}
