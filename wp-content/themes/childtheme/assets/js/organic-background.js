/*
 * Organic background disabled for now.
 *
(() => {
  const BG_CLASS = 'site-organic-bg';
  const FALLBACK_CLASS = 'site-organic-bg--fallback';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  const TAU = Math.PI * 2;

  const PALETTES = {
    light: {
      haloCore: 'rgba(72, 154, 165, 0.13)',
      haloMid: 'rgba(52, 112, 160, 0.06)',
      blobCore: 'rgba(55, 132, 125, 0.28)',
      blobMid: 'rgba(61, 166, 178, 0.18)',
      blobEdge: 'rgba(54, 78, 156, 0.04)',
      lobeCore: 'rgba(93, 197, 175, 0.25)',
      lobeMid: 'rgba(81, 170, 206, 0.12)',
      column: 'rgba(68, 92, 168, 0.08)',
    },
    dark: {
      haloCore: 'rgba(40, 92, 185, 0.2)',
      haloMid: 'rgba(20, 39, 111, 0.08)',
      blobCore: 'rgba(146, 255, 213, 0.58)',
      blobMid: 'rgba(45, 205, 190, 0.33)',
      blobEdge: 'rgba(32, 72, 210, 0.14)',
      lobeCore: 'rgba(202, 255, 215, 0.52)',
      lobeMid: 'rgba(80, 215, 225, 0.22)',
      column: 'rgba(48, 86, 230, 0.15)',
    },
  };

  const getTheme = () => (
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  const supportsCanvas2D = () => {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext && canvas.getContext('2d'));
  };

  class OrganicBackground {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.fallback = null;
      this.width = 1;
      this.height = 1;
      this.mobile = false;
      this.targetFps = 24;
      this.lastDraw = 0;
      this.raf = 0;
      this.resizeRaf = 0;
      this.points = [];
      this.theme = getTheme();
      this.isPaused = false;
      this.themeObserver = null;

      this.draw = this.draw.bind(this);
      this.queueResize = this.queueResize.bind(this);
      this.handleVisibility = this.handleVisibility.bind(this);
    }

    init() {
      if (this.canvas || this.fallback || !document.body) return;

      if (!supportsCanvas2D()) {
        this.mountFallback();
        return;
      }

      this.canvas = document.createElement('canvas');
      this.canvas.className = BG_CLASS;
      this.canvas.setAttribute('aria-hidden', 'true');
      this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });

      if (!this.ctx) {
        this.canvas.remove();
        this.canvas = null;
        this.mountFallback();
        return;
      }

      document.body.prepend(this.canvas);
      this.bind();
      this.resize();
      this.start();
    }

    mountFallback() {
      this.fallback = document.createElement('div');
      this.fallback.className = `${BG_CLASS} ${FALLBACK_CLASS}`;
      this.fallback.setAttribute('aria-hidden', 'true');
      document.body.prepend(this.fallback);
    }

    bind() {
      window.addEventListener('resize', this.queueResize, { passive: true });
      document.addEventListener('visibilitychange', this.handleVisibility);

      this.themeObserver = new MutationObserver(() => {
        this.theme = getTheme();
      });
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    destroy() {
      this.stop();
      window.cancelAnimationFrame(this.resizeRaf);
      window.removeEventListener('resize', this.queueResize);
      document.removeEventListener('visibilitychange', this.handleVisibility);
      this.themeObserver?.disconnect();
      this.canvas?.remove();
      this.fallback?.remove();

      this.canvas = null;
      this.ctx = null;
      this.fallback = null;
      this.themeObserver = null;
      this.points = [];
    }

    handleVisibility() {
      this.isPaused = document.hidden;
      if (this.isPaused) {
        this.stop();
      } else {
        this.lastDraw = 0;
        this.start();
      }
    }

    queueResize() {
      window.cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = window.requestAnimationFrame(() => this.resize());
    }

    resize() {
      if (!this.canvas) return;

      const cssWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
      const cssHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
      const isMobile = cssWidth < 760;
      const isTablet = cssWidth < 1200;
      const renderScale = isMobile ? 0.32 : (isTablet ? 0.4 : 0.48);
      const maxWidth = isMobile ? 360 : (isTablet ? 620 : 860);
      const maxHeight = isMobile ? 520 : 640;

      this.mobile = isMobile;
      this.targetFps = isMobile ? 10 : 24;
      // Render low-res and let the browser scale it: soft result, low GPU/CPU cost.
      this.width = Math.max(220, Math.min(maxWidth, Math.round(cssWidth * renderScale)));
      this.height = Math.max(220, Math.min(maxHeight, Math.round(cssHeight * renderScale)));
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.points = this.createPointMap(isMobile ? 10 : 16);
      this.lastDraw = 0;
      this.render(performance.now());
    }

    createPointMap(count) {
      return Array.from({ length: count }, (_, index) => ({
        phaseA: index * 0.91,
        phaseB: index * 1.67,
        speedA: 0.34 + ((index % 5) * 0.025),
        speedB: 0.19 + ((index % 7) * 0.018),
      }));
    }

    start() {
      if (!this.raf && !this.isPaused) {
        this.raf = window.requestAnimationFrame(this.draw);
      }
    }

    stop() {
      if (!this.raf) return;
      window.cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    draw(now) {
      this.raf = 0;

      if (!this.isPaused) {
        const interval = 1000 / this.targetFps;

        // The background does not need 60fps; throttling keeps the portfolio interactions smooth.
        if (!this.lastDraw || now - this.lastDraw >= interval) {
          this.lastDraw = now - ((now - this.lastDraw) % interval);
          this.render(now);
        }

        this.start();
      }
    }

    render(now) {
      const ctx = this.ctx;
      if (!ctx) return;

      const t = now * 0.001;
      const width = this.width;
      const height = this.height;
      const palette = PALETTES[this.theme] || PALETTES.light;
      const base = Math.min(width, height) * (this.mobile ? 0.3 : 0.34);
      const cx = width * (0.5 + (Math.sin(t * 0.09) * 0.035) + (Math.sin(t * 0.047) * 0.018));
      const cy = height * (0.52 + (Math.cos(t * 0.073) * 0.055));
      const rx = base * (this.mobile ? 1.18 : 1.72);
      const ry = base * (this.mobile ? 0.78 : 0.9);

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = this.mobile ? 0.74 : 1;
      ctx.globalCompositeOperation = this.theme === 'dark' ? 'screen' : 'source-over';

      // No layout reads here: every frame only paints a few gradients and one organic path.
      this.drawHalo(ctx, cx, cy, rx, ry, palette);
      this.drawColumn(ctx, cx, cy, base, palette);
      this.drawBlob(ctx, cx, cy, rx, ry, t, palette);
      this.drawLobes(ctx, cx, cy, rx, ry, t, palette);

      ctx.restore();
    }

    drawHalo(ctx, cx, cy, rx, ry, palette) {
      const radius = Math.max(rx, ry) * 1.16;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, palette.haloCore);
      gradient.addColorStop(0.58, palette.haloMid);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.18, ry * 1.12, 0, 0, TAU);
      ctx.fill();
    }

    drawColumn(ctx, cx, cy, base, palette) {
      const gradient = ctx.createLinearGradient(cx, cy, cx, this.height);
      gradient.addColorStop(0, palette.column);
      gradient.addColorStop(0.52, palette.column);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cx, cy + (base * 0.7), base * 0.34, base * 1.28, 0, 0, TAU);
      ctx.fill();
    }

    drawBlob(ctx, cx, cy, rx, ry, t, palette) {
      const points = this.points.map((point, index) => {
        const angle = (index / this.points.length) * TAU;
        const breathe = 1 +
          (Math.sin((t * point.speedA) + point.phaseA) * 0.1) +
          (Math.cos((t * point.speedB) + point.phaseB) * 0.055);
        const verticalEase = 1 + (Math.sin((t * 0.22) + (angle * 2.1)) * 0.055);

        return {
          x: cx + (Math.cos(angle) * rx * breathe),
          y: cy + (Math.sin(angle) * ry * breathe * verticalEase),
        };
      });

      const fill = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.08, cx, cy, Math.max(rx, ry) * 1.08);
      fill.addColorStop(0, palette.blobCore);
      fill.addColorStop(0.46, palette.blobMid);
      fill.addColorStop(0.74, palette.blobEdge);
      fill.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = fill;
      ctx.beginPath();
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        const midX = (point.x + next.x) * 0.5;
        const midY = (point.y + next.y) * 0.5;

        if (index === 0) {
          ctx.moveTo(midX, midY);
        } else {
          ctx.quadraticCurveTo(point.x, point.y, midX, midY);
        }
      });
      ctx.closePath();
      ctx.fill();
    }

    drawLobes(ctx, cx, cy, rx, ry, t, palette) {
      const lobes = this.mobile
        ? [
          { x: -0.34, y: -0.12, size: 0.46, phase: 0.4 },
          { x: 0.34, y: -0.1, size: 0.46, phase: 1.8 },
          { x: 0, y: 0.2, size: 0.5, phase: 2.9 },
        ]
        : [
          { x: -0.62, y: -0.18, size: 0.32, phase: 0.3 },
          { x: -0.36, y: 0.18, size: 0.38, phase: 1.1 },
          { x: 0, y: -0.18, size: 0.44, phase: 2.2 },
          { x: 0.36, y: 0.18, size: 0.38, phase: 3.1 },
          { x: 0.62, y: -0.18, size: 0.32, phase: 4.4 },
        ];

      lobes.forEach((lobe, index) => {
        const driftX = Math.sin((t * 0.3) + lobe.phase) * rx * 0.035;
        const driftY = Math.cos((t * 0.24) + lobe.phase) * ry * 0.06;
        const size = Math.min(rx, ry) * lobe.size * (1 + (Math.sin((t * 0.38) + index) * 0.075));
        const x = cx + (lobe.x * rx) + driftX;
        const y = cy + (lobe.y * ry) + driftY;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);

        gradient.addColorStop(0, palette.lobeCore);
        gradient.addColorStop(0.42, palette.lobeMid);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      });
    }
  }

  const reducedMotion = window.matchMedia?.(REDUCED_MOTION_QUERY);
  let instance = null;

  const syncBackground = () => {
    if (reducedMotion?.matches) {
      instance?.destroy();
      instance = null;
      return;
    }

    if (!instance) {
      instance = new OrganicBackground();
      instance.init();
    }
  };

  const boot = () => {
    syncBackground();

    if (!reducedMotion) return;
    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', syncBackground);
    } else {
      reducedMotion.addListener(syncBackground);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
*/
