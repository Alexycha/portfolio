(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const miniOpenClass = 'is-open';
  const palettes = [
    { id: 'cream-blue', bg: '#f1f1d9', text: '#011391', title: '#011391', darkBg: '#011391', darkText: '#f1f1d9', darkTitle: '#f1f1d9' },
    { id: 'grey-olive', bg: '#ededed', text: '#605c04', title: '#605c04', darkBg: '#605c04', darkText: '#ededed', darkTitle: '#ededed' },
    { id: 'red-linen', bg: '#e7e0d2', text: '#000000', title: '#980001', darkBg: '#980001', darkText: '#ffffff', darkTitle: '#e7e0d2' }
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

  const injectMiniModalStyles = () => {
    if (document.getElementById('mini-modal-runtime-styles')) return;

    const style = document.createElement('style');
    style.id = 'mini-modal-runtime-styles';
    style.textContent = `
      .mini-modal.is-open .mini-modal__overlay { --blur: 0px; }
      .mini-modal__overlay {
        background: var(--bg);
        transition: background-color 0.3s ease, backdrop-filter 0.3s ease-in-out;
      }
      [data-theme="light"] .mini-modal__overlay { background: var(--bg); }
      .mini-modal__box { padding: clamp(24px, 5vw, 72px); }
      .mini-modal__close {
        position: fixed;
        top: calc(30px + var(--safe-top));
        right: calc(42px + var(--safe-right));
        z-index: 2;
        min-width: 44px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1;
        text-transform: uppercase;
        color: var(--text);
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 0.24s ease, transform 0.24s ease;
      }
      .mini-modal.is-open .mini-modal__close {
        opacity: 1;
        transform: translateY(0);
      }
      .mini-modal__content {
        width: min(72ch, calc(100vw - 48px));
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: clamp(18px, 2.4vw, 30px);
        text-align: center;
        color: var(--text);
        pointer-events: none;
      }
      .mini-modal.is-open .mini-modal__content { pointer-events: auto; }
      .mini-modal__title,
      .mini-modal__title * {
        margin: 0;
        font-family: var(--font-title);
        font-size: clamp(78px, 15vw, 190px);
        font-weight: 400;
        letter-spacing: 0;
        line-height: 0.82;
        text-transform: none;
        color: var(--title-text);
      }
      .mini-modal__content,
      .mini-modal__text,
      .mini-modal__text * {
        font-family: var(--font-main);
        font-weight: var(--fw-light);
        letter-spacing: 0.02em;
        line-height: 1.35;
        text-transform: none;
        color: var(--text);
      }
      .mini-modal__text {
        margin: 0;
        font-size: clamp(17px, 1.75vw, 24px);
        max-width: min(58ch, calc(100vw - 48px));
      }
      .pmodal__label { font-weight: 700 !important; }
      @media (hover: none), (pointer: coarse) {
        .site-header__link:hover,
        .header-snake-btn:hover,
        .header-item:hover { opacity: 1; transform: none; }
        .project-row:hover .project-row__header,
        .project-row:hover .tag-home-wrap,
        .artist_item:hover .tag-home-wrap,
        body.is-snake-view .project-row:hover .project-row__header,
        body.is-snake-view .project-row:hover .tag-home-wrap,
        body.is-snake-view .artist_item:hover .tag-home-wrap {
          opacity: 0;
          transform: translateY(8px);
        }
        .artist_item[data-video-on-hover="active"]:hover .media-link video.media-slider-home {
          opacity: 0;
        }
        .pmodal__thumb:hover {
          opacity: 0.5;
          transform: none;
        }
        .pmodal__thumb.is-active {
          opacity: 1;
          transform: translateY(-2px);
        }
      }
      @media (max-width: 640px) {
        .mini-modal__box { padding: 18px; }
        .mini-modal__close {
          top: calc(18px + var(--safe-top));
          right: calc(16px + var(--safe-right));
          min-width: 40px;
          min-height: 40px;
          font-size: 11px;
        }
        .mini-modal__content {
          width: min(42ch, calc(100vw - 36px));
          gap: 18px;
        }
        .mini-modal__title,
        .mini-modal__title * {
          font-size: clamp(68px, 26vw, 112px);
        }
        .mini-modal__text {
          max-width: min(42ch, calc(100vw - 36px));
          font-size: clamp(16px, 4.8vw, 22px);
          line-height: 1.38;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const closeMiniModals = () => {
    qsa('.mini-modal').forEach(modal => {
      modal.classList.remove(miniOpenClass);
      modal.setAttribute('aria-hidden', 'true');
    });
  };

  const enhanceMiniModal = (id, title) => {
    const modal = document.getElementById(id);
    if (!modal) return;

    const box = qs('.mini-modal__box', modal);
    const existingText = qs('.mini-modal__text', modal);
    if (!box || !existingText || qs('.mini-modal__content', modal)) return;

    const close = document.createElement('button');
    close.className = 'mini-modal__close unified-text';
    close.type = 'button';
    close.setAttribute('data-mini-close', '');
    close.setAttribute('aria-label', `Close ${title} popup`);
    close.textContent = 'CLOSE';
    modal.insertBefore(close, box);

    const content = document.createElement('div');
    content.className = 'mini-modal__content';
    content.setAttribute('data-mini-stop', '');

    const heading = document.createElement('h2');
    heading.className = 'mini-modal__title';
    heading.textContent = title;

    existingText.removeAttribute('data-mini-stop');
    existingText.innerHTML = existingText.innerHTML.replace(new RegExp(`^\\s*${title}\\s*[—-]\\s*`, 'i'), '');

    content.append(heading, existingText);
    box.replaceChildren(content);
  };

  const enhanceMiniModals = () => {
    enhanceMiniModal('miniModalAbout', 'About');
    enhanceMiniModal('miniModalContact', 'Contact');
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

      if (event.target.closest('[data-mini-close]')) {
        closeMiniModals();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMiniModals();
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    injectMiniModalStyles();
    enhanceMiniModals();
    initMiniModals();
  });
})();
