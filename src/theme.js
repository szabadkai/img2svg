const STORAGE_KEY = 'img2svg-theme';

export function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved === 'light' || saved === 'dark') {
    apply(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(prefersDark ? 'dark' : 'light');
  }

  toggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      apply(e.matches ? 'dark' : 'light');
    }
  });
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}
