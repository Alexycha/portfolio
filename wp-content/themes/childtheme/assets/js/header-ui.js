(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const miniOpenClass = 'is-open';
  const palettes = [
    { id: 'monochrome', bg: '#ffffff', text: '#000000', title: '#000000', darkBg: '#000000', darkText: '#ffffff', darkTitle: '#ffffff' }
  ];

  const applyPalette = palette => {
    if (!palette) return;

    document.documentElement.style.setProperty('--palette-bg', palette.bg);
    document.documentElement.style.setProperty('--palette-text', palette.text);
    document.documentElement.style.setProperty('--palette-title', palette.title);
    document.documentElement.style.setProperty('--palette-dark-bg', palette.darkBg);
    document.documentElement.style.setProperty('--palette-dark-text', palette.darkText);
    document.documentElement.style.setProperty('--palette-dark-title', palette.darkTitle);
    document.documentElement.setAttribute('data-palette', palette.id);
  };

  const initPalette = () => {
    if (document.documentElement.dataset.palette) return;

    applyPalette(palettes[0]);
  };

  const syncThemeToggle = theme => {
    qs('#theme-toggle')?.setAttribute(
      'aria-label',
      theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
    );
  };

  const applyTheme = theme => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', safeTheme);
    syncThemeToggle(safeTheme);

    try {
      localStorage.setItem('theme', safeTheme);
    } catch (error) {
      // Storage can be unavailable in strict privacy contexts.
    }
  };

  const closeMiniModals = () => {
    qsa('.mini-modal').forEach(modal => {
      modal.classList.remove(miniOpenClass);
      modal.setAttribute('aria-hidden', 'true');
    });
  };

  const openMiniModal = id => {
    const modal = document.getElementById(id);
    if (!modal) return;

    closeMiniModals();
    modal.classList.add(miniOpenClass);
    modal.setAttribute('aria-hidden', 'false');
  };

  const initTheme = () => {
    initPalette();

    const currentTheme = document.documentElement.dataset.theme || 'light';
    syncThemeToggle(currentTheme);

    qs('#theme-toggle')?.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    });
  };

  const initMiniModals = () => {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-mini-stop]')) return;

      const opener = event.target.closest('[data-open]');
      if (opener) {
        openMiniModal(opener.dataset.open === 'about' ? 'miniModalAbout' : 'miniModalContact');
        return;
      }

      if (event.target.hasAttribute('data-mini-close')) {
        closeMiniModals();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMiniModals();
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMiniModals();
  });
})();
