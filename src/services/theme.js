const THEME_KEY = 'bus-in-live-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const themeService = {
  init() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia(MEDIA_QUERY).matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.apply(theme);

    window.matchMedia(MEDIA_QUERY).addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        this.apply(e.matches ? 'dark' : 'light');
      }
    });

    this.updateIcons();
  },

  get() {
    return document.documentElement.dataset.theme || 'light';
  },

  set(theme) {
    localStorage.setItem(THEME_KEY, theme);
    this.apply(theme);
    this.updateIcons();
  },

  toggle() {
    const current = this.get();
    this.set(current === 'dark' ? 'light' : 'dark');
  },

  apply(theme) {
    document.documentElement.dataset.theme = theme;
  },

  updateIcons() {
    const isDark = this.get() === 'dark';
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    const moonIcons = document.querySelectorAll('.theme-icon-moon');

    sunIcons.forEach(icon => {
      icon.style.display = isDark ? 'block' : 'none';
    });
    moonIcons.forEach(icon => {
      icon.style.display = isDark ? 'none' : 'block';
    });
  }
};