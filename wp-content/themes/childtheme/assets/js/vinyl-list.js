(() => {
  const SELECTORS = {
    container: '.home-projects',
    wrapper: '.home-projects__wrapper',
    row: '.project-row',
    rowMedia: '.project-row__media',
    rowMediaEl: '.project-row__media-el',
    projectModal: '#pmodal',
    pmodalOverlay: '.pmodal__overlay',
    pmodalShell: '.pmodal__shell',
    pmodalLayout: '.pmodal__layout',
    pmodalMediaCol: '.pmodal__media-col',
    pmodalStage: '[data-pmodal-stage]',
    pmodalCaptures: '[data-pmodal-captures]',
    pmodalTitle: '[data-pmodal-title]',
    pmodalMobileTitle: '[data-pmodal-mobile-title]',
    pmodalDescription: '[data-pmodal-desc]',
    pmodalServices: '[data-pmodal-services]',
    pmodalWebsite: '[data-pmodal-website]',
    pmodalWebsiteBlock: '[data-pmodal-website-block]',
    pmodalThumbs: '[data-pmodal-thumbs]',
    pmodalInfo: '.pmodal__info-col',
    pmodalClose: '.pmodal__close',
    pmodalCloseTrigger: '[data-pmodal-close]',
    pmodalBlock: '.pmodal__block',
    pmodalFeatured: '.pmodal__featured',
    headerTop: '.site-header__top',
    headerControl: '.header-controls > button',
    headerBottomItem: '.header-bottom-items .header-item',
  };

  const CONFIG = {
    pitchRatio: 0.105,          // scroll distance per card = viewport height * ratio
    pitchMin: 64,
    pitchMax: 118,
    stepXRatio: 0.095,
    stepYRatio: 0.15,
    mobileStepXRatio: 0.135,
    mobileStepYRatio: 0.11,
    skew: 9.5,                  // panels recede toward the upper-right (top edge falls to the right)
    ease: 0.11,                 // lerp toward target — light inertia, still responsive
    wheelSpeed: 0.85,
    dragSpeed: 1.05,
    momentum: 12,
    dragClickSuppressMs: 260,
    hoverXRatio: 0.084,
    hoverXMin: 72,
    hoverXMax: 340,
    hoverYRatio: 0.022,
    hoverYMin: 14,
    hoverYMax: 90,
    hoverSpring: 178,
    hoverDamping: 20,
    hoverLabelOffsetX: 14,
    hoverLabelOffsetY: 18,
    hoverLabelFollow: 0.24,
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (min, max, value) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const snapPixel = (value, scale = window.devicePixelRatio || 1) => Math.round(value * scale) / scale;
  const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
  const getViewportState = () => {
    const width = window.innerWidth;
    return {
      width,
      height: window.innerHeight,
      isMobile: width < 760,
      isTablet: width < 1200,
      deviceScale: window.devicePixelRatio || 1,
    };
  };

  const safeJson = (value, fallback = []) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const normalizeImageList = images => (
    Array.isArray(images)
      ? images.map(url => (typeof url === 'string' ? url.trim() : '')).filter(Boolean)
      : []
  );
  const sanitizeMediaRatio = value => clamp(0.42, 2.4, Number.isFinite(value) && value > 0 ? value : 1);
  const getMediaNaturalRatio = media => {
    if (!media) return 0;
    if (media.tagName === 'IMG' && media.naturalWidth > 0 && media.naturalHeight > 0) {
      return media.naturalWidth / media.naturalHeight;
    }
    if (media.tagName === 'VIDEO' && media.videoWidth > 0 && media.videoHeight > 0) {
      return media.videoWidth / media.videoHeight;
    }
    return 0;
  };
  const getMediaDeclaredRatio = media => {
    if (!media) return 0;
    const width = Number(media.getAttribute?.('width'));
    const height = Number(media.getAttribute?.('height'));
    return width > 0 && height > 0 ? width / height : 0;
  };
  const waitForMediaRatio = (media, fallback = 1) => new Promise(resolve => {
    const immediate = getMediaNaturalRatio(media);
    if (immediate) {
      resolve(sanitizeMediaRatio(immediate));
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      media?.removeEventListener?.('load', finish);
      media?.removeEventListener?.('loadedmetadata', finish);
      media?.removeEventListener?.('error', finish);
      resolve(sanitizeMediaRatio(getMediaNaturalRatio(media) || fallback));
    };
    const timer = window.setTimeout(finish, 450);
    media?.addEventListener?.('load', finish, { once: true });
    media?.addEventListener?.('loadedmetadata', finish, { once: true });
    media?.addEventListener?.('error', finish, { once: true });
    media?.decode?.().then(finish).catch(() => {});
  });
  const safePlay = video => video?.play?.().catch(() => {});
  const pauseMedia = media => {
    if (media?.tagName === 'VIDEO') media.pause();
  };
  const shouldIgnoreProjectOpen = target => {
    if (!(target instanceof Element)) return true;
    if (target.closest(`${SELECTORS.projectModal}, .mini-modal, .site-header`)) return true;
    const interactive = target.closest('a, button, input, textarea, select, label, [data-open], [data-mini-close], [data-mini-stop]');
    return Boolean(interactive && !interactive.closest(SELECTORS.row));
  };
  const resetModalScroll = shell => {
    if (!shell) return;
    if (typeof shell.scrollTo === 'function') {
      shell.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      shell.scrollTop = 0;
      shell.scrollLeft = 0;
    }
  };
  const getProjectData = row => {
    const data = row.dataset;
    return {
      title: data.title || '',
      description: data.description || '',
      services: safeJson(data.services, []),
      images: normalizeImageList(safeJson(data.images, [])),
      featuredType: data.featuredType || 'image',
      featuredVideo: data.featuredVideo || '',
      projectUrl: data.projectUrl || '',
      mainImage: data.mainImage || '',
    };
  };
  const setMediaVideoAttrs = video => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
  };
  const createMedia = ({ type, src, className, alt = '', autoplay = false }) => {
    const isVideo = type === 'video';
    const el = document.createElement(isVideo ? 'video' : 'img');
    el.className = className;
    el.src = src || '';
    if (isVideo) {
      setMediaVideoAttrs(el);
      el.autoplay = autoplay;
    } else {
      el.alt = alt;
    }
    return el;
  };
  const mediaFromProject = (data, index = 0, className = 'pmodal__featured') => {
    const hasFeaturedVideo = index === 0 && data.featuredType === 'video' && data.featuredVideo;
    const src = hasFeaturedVideo ? data.featuredVideo : (data.images[index] || data.mainImage);
    return createMedia({
      type: hasFeaturedVideo ? 'video' : 'image',
      src,
      className,
      alt: data.title,
      autoplay: hasFeaturedVideo,
    });
  };
  const getScrollableCaptures = data => {
    if (!data.images.length) return [];
    return data.featuredType === 'video' && data.featuredVideo ? data.images : data.images.slice(1);
  };

  /* =====================================================
     VINYL LIST — continuous diagonal rail
  ===================================================== */
  class VinylList {
    constructor() {
      this.container = qs(SELECTORS.container);
      this.wrapper = qs(SELECTORS.wrapper);
      const visibleCategories = new Set((qs('meta[name="portfolio-visible-categories"]')?.content || 'website,branding,webdesign,draw')
        .split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
      this.rows = qsa(SELECTORS.row, this.wrapper).filter(row => !row.dataset.railClone).filter(row => {
        const categories = safeJson(row.dataset.categories || '[]', []);
        const isVisible = !categories.length || categories.some(category => visibleCategories.has(String(category).toLowerCase()));
        row.hidden = !isVisible;
        return isVisible;
      });
      this.logicalCount = this.rows.length;
      this.mediaRatios = this.rows.map(row => {
        const media = qs(SELECTORS.rowMediaEl, row);
        return getMediaNaturalRatio(media) || getMediaDeclaredRatio(media) || 1;
      });
      const visualRows = this.rows.flatMap((row, index) => {
        const makeClone = copyOffset => {
          const clone = row.cloneNode(true);
          clone.dataset.railClone = String(copyOffset);
          clone.setAttribute('aria-hidden', 'true');
          clone.setAttribute('tabindex', '-1');
          this.wrapper.appendChild(clone);
          return { row: clone, railIndex: index, copyOffset, isClone: true };
        };
        return [
          makeClone(-1),
          { row, railIndex: index, copyOffset: 0, isClone: false },
          makeClone(1),
        ];
      });
      this.items = visualRows.map(visual => ({
        ...visual,
        row: visual.row,
        media: qs(SELECTORS.rowMedia, visual.row),
        hit: null,
        finalWidth: 0,
        finalRatio: 1,
        introStackIndex: 0,
        hover: 0,
        hoverTarget: 0,
        hoverVelocity: 0,
        introOpacity: 1,
        introClip: 0,
      }));
      this.viewport = getViewportState();
      this.offset = 0;
      this.target = 0;
      this.focusedIndex = -1;
      this.lastInputTime = 0;
      this.lastDragEnd = 0;
      this.drag = null;
      this.reduced = prefersReducedMotion();
      this.modal = null;
      this.rafId = 0;
      this.hoveredIndex = -1;
      this.lastFrameTime = 0;
      this.hoverLabel = null;
      this.hoverLabelIndex = null;
      this.hoverLabelTitle = null;
      this.hoverLabelX = 0;
      this.hoverLabelY = 0;
      this.hoverLabelTargetX = 0;
      this.hoverLabelTargetY = 0;
      this.hoverLabelReady = false;
      this.introState = {
        active: true,
        angle: 0,
        rotation: 0,
        spread: 0,
      };
    }

    get pitch() {
      return clamp(CONFIG.pitchMin, CONFIG.pitchMax, this.viewport.height * CONFIG.pitchRatio);
    }

    get span() {
      return this.logicalCount * this.pitch; // one logical project loop
    }

    init() {
      if (!this.wrapper || !this.items.length) return;
      qsa('img', this.wrapper).forEach(img => { img.loading = 'eager'; });
      qsa('video', this.wrapper).forEach(video => {
        setMediaVideoAttrs(video);
        video.pause();
      });
      this.createHitLayer();
      this.sizeCards();
      this.rows.forEach((row, index) => {
        const media = qs(SELECTORS.rowMediaEl, row);
        const syncRatio = () => {
          const ratio = getMediaNaturalRatio(media) || getMediaDeclaredRatio(media);
          if (!ratio || Math.abs(ratio - this.mediaRatios[index]) < 0.001) return;
          this.mediaRatios[index] = ratio;
          this.sizeCards();
          this.render(true);
        };
        media?.addEventListener?.('load', syncRatio, { once: true });
        media?.addEventListener?.('loadedmetadata', syncRatio, { once: true });
        media?.decode?.().then(syncRatio).catch(() => {});
      });
      this.bindEvents();
      this.modal = new VinylModal(this);
      this.modal.init();
      this.render(true);
      this.intro();
      const loop = now => {
        this.tick(now);
        this.rafId = window.requestAnimationFrame(loop);
      };
      this.rafId = window.requestAnimationFrame(loop);
    }

    createHitLayer() {
      this.hitLayer = document.createElement('div');
      this.hitLayer.className = 'vinyl-hit-layer';
      this.hitLayer.setAttribute('aria-hidden', 'true');

      this.items.forEach((item, index) => {
        const hit = document.createElement('div');
        hit.className = 'vinyl-hit-target';
        hit.dataset.hitIndex = String(index);
        item.hit = hit;
        this.hitLayer.appendChild(hit);
      });

      this.wrapper.appendChild(this.hitLayer);

      this.hoverLabel = document.createElement('div');
      this.hoverLabel.className = 'vinyl-hover-label';
      this.hoverLabel.setAttribute('aria-hidden', 'true');
      this.hoverLabelIndex = document.createElement('span');
      this.hoverLabelIndex.className = 'vinyl-hover-label__index';
      this.hoverLabelTitle = document.createElement('span');
      this.hoverLabelTitle.className = 'vinyl-hover-label__title';
      this.hoverLabel.append(this.hoverLabelIndex, this.hoverLabelTitle);
      this.container.appendChild(this.hoverLabel);
    }

    // Keep the visual rhythm varied while preserving every artwork's real aspect ratio.
    sizeCards() {
      const WIDTHS = [0.23, 0.225, 0.25, 0.22, 0.215, 0.235, 0.245, 0.22];
      const { width, height, isMobile } = this.viewport;
      const boost = isMobile ? 2.5 : 1;
      const maxH = height * (isMobile ? 0.54 : 0.6);
      const maxW = width * (isMobile ? 0.7 : 0.29);
      this.introSquareSize = Math.round(Math.min(
        width * (isMobile ? 0.54 : 0.18),
        height * (isMobile ? 0.32 : 0.28),
      ));

      this.items.forEach(item => {
        const ratio = this.mediaRatios[item.railIndex] || 1;
        let w = width * WIDTHS[item.railIndex % WIDTHS.length] * boost;
        w = Math.min(w, maxW, maxH * ratio);

        item.finalWidth = Math.round(w);
        item.finalRatio = ratio;
        const initialWidth = this.introState.active ? this.introSquareSize : item.finalWidth;
        const initialRatio = this.introState.active ? 1 : item.finalRatio;
        item.row.style.width = `${initialWidth}px`;
        item.media.style.aspectRatio = String(initialRatio);
        item.hit.style.width = `${initialWidth}px`;
        item.hit.style.aspectRatio = String(initialRatio);
        item.row.dataset.railFormat = ratio < 1 ? 'portrait' : 'landscape';
      });
    }

    setHoveredIndex(index) {
      if (index === this.hoveredIndex) return;
      this.hoveredIndex = index;
      this.items.forEach((item, itemIndex) => {
        item.hoverTarget = itemIndex === index ? 1 : 0;
        item.row.classList.toggle('is-hovered', itemIndex === index);
        const video = qs('.project-row__media-video', item.row);
        if (video && itemIndex === index) safePlay(video);
        else if (video) video.pause();
      });

      if (this.hoverLabel) {
        const row = index >= 0 ? this.items[index]?.row : null;
        if (row) {
          this.hoverLabelIndex.textContent = qs('.project-row__index', row)?.textContent?.trim() || String(index + 1).padStart(2, '0');
          this.hoverLabelTitle.textContent = qs('.project-row__title', row)?.textContent?.trim() || row.dataset.title || '';
          this.hoverLabel.classList.add('is-visible');
          this.hoverLabel.setAttribute('aria-hidden', 'false');
        } else {
          this.hoverLabel.classList.remove('is-visible');
          this.hoverLabel.setAttribute('aria-hidden', 'true');
        }
      }

      if (this.reduced) {
        this.items.forEach(item => {
          item.hover = item.hoverTarget;
          item.hoverVelocity = 0;
        });
      }
      this.render(true);
    }

    setHoverLabelPosition(event, snap = false) {
      if (!this.hoverLabel || this.hoveredIndex < 0) return;
      const item = this.items[this.hoveredIndex];
      const rect = item?.media?.getBoundingClientRect?.();
      if (!rect) return;
      const gap = CONFIG.hoverLabelOffsetX;
      const labelWidth = this.hoverLabel.offsetWidth;
      const labelHeight = this.hoverLabel.offsetHeight;
      const rightX = rect.right + gap;
      this.hoverLabelTargetX = rightX + labelWidth <= window.innerWidth - 12
        ? rightX
        : Math.max(12, rect.left - gap - labelWidth);
      this.hoverLabelTargetY = clamp(12, window.innerHeight - labelHeight - 12, rect.top + ((rect.height - labelHeight) / 2));
      if (snap || !this.hoverLabelReady || this.reduced) {
        this.hoverLabelX = this.hoverLabelTargetX;
        this.hoverLabelY = this.hoverLabelTargetY;
        this.hoverLabelReady = true;
      }
    }

    updateHoverLabel() {
      if (!this.hoverLabelReady || !this.hoverLabel) return;
      this.setHoverLabelPosition(null);
      const follow = this.reduced ? 1 : CONFIG.hoverLabelFollow;
      this.hoverLabelX += (this.hoverLabelTargetX - this.hoverLabelX) * follow;
      this.hoverLabelY += (this.hoverLabelTargetY - this.hoverLabelY) * follow;
      this.hoverLabel.style.transform =
        `translate3d(${this.hoverLabelX.toFixed(2)}px, ${this.hoverLabelY.toFixed(2)}px, 0)`;
    }

    updateHover(dt) {
      let moving = false;
      this.items.forEach(item => {
        if (this.reduced) return;
        const displacement = item.hoverTarget - item.hover;
        const acceleration = (displacement * CONFIG.hoverSpring) - (item.hoverVelocity * CONFIG.hoverDamping);
        item.hoverVelocity += acceleration * dt;
        item.hover += item.hoverVelocity * dt;

        if (Math.abs(displacement) < 0.0008 && Math.abs(item.hoverVelocity) < 0.0015) {
          item.hover = item.hoverTarget;
          item.hoverVelocity = 0;
        } else {
          moving = true;
        }
      });
      return moving;
    }

    isBusy() {
      return this.modal?.isPopupOpen
        || this.modal?.isAnimating
        || document.body.classList.contains('is-locked')
        || document.body.classList.contains('is-home-intro-running');
    }

    bindEvents() {
      const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
      this.items.forEach((item, index) => {
        if (canHover) {
          item.hit.addEventListener('pointerenter', event => {
            if (!this.isBusy()) {
              this.setHoveredIndex(index);
              this.setHoverLabelPosition(event, true);
            }
          });
          item.hit.addEventListener('pointermove', event => {
            if (this.hoveredIndex === index) this.setHoverLabelPosition(event);
          });
          item.hit.addEventListener('pointerleave', () => {
            if (this.hoveredIndex === index) this.setHoveredIndex(-1);
          });
        }

        item.hit.addEventListener('click', event => {
          if (event.defaultPrevented || this.isBusy()) return;
          if (performance.now() - this.lastDragEnd < CONFIG.dragClickSuppressMs) return;
          event.preventDefault();
          this.setHoveredIndex(-1);
          this.modal.open(item.row);
        });
      });

      window.addEventListener('wheel', event => {
        if (this.isBusy()) return;
        event.preventDefault();
        this.setHoveredIndex(-1);
        const delta = event.deltaY * (event.deltaMode === 1 ? 33 : 1);
        this.target += delta * CONFIG.wheelSpeed;
        this.lastInputTime = performance.now();
      }, { passive: false });

      this.wrapper.addEventListener('touchstart', event => {
        if (this.isBusy()) return;
        this.setHoveredIndex(-1);
        this.drag = {
          startY: event.touches[0].clientY,
          lastY: event.touches[0].clientY,
          lastTime: performance.now(),
          velocity: 0,
          moved: 0,
        };
      }, { passive: true });

      this.wrapper.addEventListener('touchmove', event => {
        if (!this.drag || this.isBusy()) return;
        event.preventDefault();
        const y = event.touches[0].clientY;
        const now = performance.now();
        const dy = this.drag.lastY - y;
        const dt = Math.max(1, now - this.drag.lastTime);
        this.drag.velocity = dy / dt;
        this.drag.moved += Math.abs(dy);
        this.drag.lastY = y;
        this.drag.lastTime = now;
        this.target += dy * CONFIG.dragSpeed;
        this.lastInputTime = now;
      }, { passive: false });

      const endDrag = () => {
        if (!this.drag) return;
        if (this.drag.moved > 8) {
          this.lastDragEnd = performance.now();
          this.target += this.drag.velocity * CONFIG.momentum * this.pitch * 0.16;
        }
        this.lastInputTime = performance.now();
        this.drag = null;
      };
      this.wrapper.addEventListener('touchend', endDrag);
      this.wrapper.addEventListener('touchcancel', endDrag);

      window.addEventListener('keydown', event => {
        if (this.isBusy()) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          this.scrollToStep(Math.round(this.target / this.pitch) + 1);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          this.scrollToStep(Math.round(this.target / this.pitch) - 1);
        }
      });

      document.addEventListener('click', event => {
        if (event.defaultPrevented || this.isBusy() || shouldIgnoreProjectOpen(event.target)) return;
        if (performance.now() - this.lastDragEnd < CONFIG.dragClickSuppressMs) return;
        const row = event.target.closest(SELECTORS.row);
        if (!row) return;
        event.preventDefault();
        this.modal.open(row);
      });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const row = event.target.closest?.(SELECTORS.row);
        if (!row || this.isBusy()) return;
        event.preventDefault();
        this.modal.open(row);
      });

      window.addEventListener('resize', () => {
        const step = Math.round(this.offset / this.pitch);
        this.viewport = getViewportState();
        this.offset = this.target = step * this.pitch;
        this.sizeCards();
        this.render(true);
      });
    }

    scrollToStep(step) {
      this.target = step * this.pitch;
      this.lastInputTime = performance.now();
    }

    scrollToIndex(index) {
      // shortest wrapped path from the current step to the requested record
      const count = this.logicalCount;
      const step = Math.round(this.target / this.pitch);
      const current = ((step % count) + count) % count;
      let delta = ((index - current) % count + count) % count;
      if (delta > count / 2) delta -= count;
      this.scrollToStep(step + delta);
    }

    tick(now = performance.now()) {
      const dt = this.lastFrameTime
        ? clamp(0.001, 0.032, (now - this.lastFrameTime) / 1000)
        : 1 / 60;
      this.lastFrameTime = now;
      this.updateHoverLabel();
      const hoverMoving = this.updateHover(dt);

      // no snap — the rail glides freely; lerp gives the inertia
      const delta = this.target - this.offset;
      if (Math.abs(delta) < 0.015) {
        if (this.offset !== this.target) {
          this.offset = this.target;
          this.render();
        } else if (hoverMoving) {
          this.render();
        }
        return;
      }
      this.offset += delta * (this.reduced ? 1 : CONFIG.ease);
      this.render();
    }

    render(force = false) {
      if (!force && (this.modal?.isAnimating || this.modal?.isPopupOpen)) return;
      const { width, height, isMobile } = this.viewport;
      const pitch = this.pitch;
      // one straight rail through the viewport center: constant vector, regular steps
      const stepX = width * (isMobile ? CONFIG.mobileStepXRatio : CONFIG.stepXRatio);
      const stepY = height * (isMobile ? CONFIG.mobileStepYRatio : CONFIG.stepYRatio);
      const span = this.span;
      const half = span / 2;
      const hoverX = clamp(CONFIG.hoverXMin, CONFIG.hoverXMax, width * CONFIG.hoverXRatio);
      const hoverY = clamp(CONFIG.hoverYMin, CONFIG.hoverYMax, width * CONFIG.hoverYRatio);
      const intro = this.introState;
      const spread = intro.active ? intro.spread : 1;
      const angle = intro.active ? intro.angle : 1;
      const introRotation = intro.active ? intro.rotation : 0;

      this.items.forEach(item => {
        // global progression + index offset, wrapped for the infinite loop,
        // centered so t=0 sits at the middle of the viewport
        let raw = this.offset - (item.railIndex * pitch);
        raw = ((raw % span) + span) % span;            // [0, span)
        if (raw > half) raw -= span;                   // (-half, half]
        raw += item.copyOffset * span;
        const t = raw / pitch;
        const a = Math.abs(t);
        const cardWidth = this.introSquareSize + ((item.finalWidth - this.introSquareSize) * spread);
        const cardRatio = 1 + ((item.finalRatio - 1) * spread);
        const widthValue = `${cardWidth.toFixed(2)}px`;
        const ratioValue = cardRatio.toFixed(4);
        item.row.style.width = widthValue;
        item.media.style.aspectRatio = ratioValue;
        item.hit.style.width = widthValue;
        item.hit.style.aspectRatio = ratioValue;

        if (intro.active && item.isClone) {
          item.row.style.visibility = 'hidden';
          item.hit.style.visibility = 'hidden';
          return;
        }

        if (item.row.style.visibility === 'hidden') item.row.style.visibility = '';
        if (item.hit.style.visibility === 'hidden') item.hit.style.visibility = '';

        const x = t * stepX * spread;                  // the centered stack opens onto the rail
        const y = -t * stepY * spread;
        const stackDepth = item.introStackIndex - ((this.logicalCount - 1) / 2);
        const stackGapX = isMobile ? 0.78 : 1.18;
        const stackGapY = isMobile ? 0.64 : 0.92;
        const stackGapProgress = angle * (1 - spread);
        const stackX = -stackDepth * stackGapX * stackGapProgress;
        const stackY = stackDepth * stackGapY * stackGapProgress;
        // Lower-left panels sit fractionally nearer; upper-right panels recede.
        // The small depth cue keeps the rail directional without breaking its line.
        const scale = clamp(0.9, 1.02, 0.995 - (t * 0.01) - (a * 0.004));
        const hoverProgress = clamp(0, 1.06, item.hover) * spread;
        const hoverEase = hoverProgress;
        const visualX = x + stackX + (hoverX * hoverEase);
        const visualY = y + stackY + (hoverY * hoverEase);
        const railScale = scale * (1 + (0.018 * hoverEase));
        const visualScale = 1 + ((railScale - 1) * spread);

        // bottom-left (t < 0) passes in front of the run continuing up-right
        const baseZ = 500 - Math.round(t * 12);
        const zIndex = intro.active && spread < 0.5 ? 650 + item.introStackIndex : baseZ;
        const skew = CONFIG.skew * angle;
        item.row.style.zIndex = String(zIndex);
        item.hit.style.zIndex = String(zIndex);
        item.row.style.transform =
          `translate(-50%, -50%) translate3d(${visualX.toFixed(2)}px, ${visualY.toFixed(2)}px, 0) rotate(${introRotation.toFixed(2)}deg) skewY(${skew.toFixed(2)}deg) scale(${visualScale.toFixed(4)})`;
        // Keep the invisible interaction surface welded to the animated card.
        // This prevents the card's former position from remaining hoverable.
        item.hit.style.transform =
          `translate(-50%, -50%) translate3d(${visualX.toFixed(2)}px, ${visualY.toFixed(2)}px, 0) rotate(${introRotation.toFixed(2)}deg) skewY(${skew.toFixed(2)}deg) scale(${visualScale.toFixed(4)})`;
        item.row.style.opacity = item.introOpacity.toFixed(3);
        if (intro.active) {
          const clip = clamp(0, 50, item.introClip);
          const clipPath = clip > 0.01 ? `inset(${clip.toFixed(2)}%)` : 'inset(0%)';
          item.row.style.clipPath = clipPath;
          item.row.style.webkitClipPath = clipPath;
        }
        item.media.style.opacity = '';
        item.media.style.filter = '';
      });

      const count = this.logicalCount;
      const focused = ((Math.round(this.offset / pitch) % count) + count) % count;
      if (focused !== this.focusedIndex) {
        this.focusedIndex = focused;
        this.rows.forEach((row, i) => row.classList.toggle('is-focused', i === focused));
      }
    }

    intro() {
      const root = document.documentElement;
      const headerBits = [
        qs(SELECTORS.headerTop),
        ...qsa(SELECTORS.headerControl),
        ...qsa(SELECTORS.headerBottomItem),
      ].filter(Boolean);

      gsap.set(this.wrapper, { autoAlpha: 1 });
      gsap.set(headerBits, { autoAlpha: 0 });
      document.body.classList.add('is-home-intro-running');

      const railPosition = item => {
        let raw = this.offset - (item.railIndex * this.pitch);
        raw = ((raw % this.span) + this.span) % this.span;
        if (raw > this.span / 2) raw -= this.span;
        return raw / this.pitch;
      };
      const introItems = this.items.filter(item => !item.isClone).sort((a, b) => railPosition(b) - railPosition(a));
      introItems.forEach((item, stackIndex) => { item.introStackIndex = stackIndex; });
      this.items.forEach(item => {
        item.introOpacity = 0;
        item.introClip = 50;
      });
      Object.assign(this.introState, { active: true, angle: 0, rotation: 0, spread: 0 });
      this.render(true);
      root.classList.remove('is-home-intro-prep');

      if (this.reduced) {
        this.items.forEach(item => {
          item.introOpacity = 1;
          item.introClip = 0;
        });
        Object.assign(this.introState, { active: false, angle: 1, rotation: 0, spread: 1 });
        gsap.set(headerBits, { autoAlpha: 1 });
        document.body.classList.remove('is-home-intro-running');
        this.render(true);
        return;
      }

      const revealStagger = this.viewport.isMobile ? 0.065 : 0.075;
      const revealStart = 0.04;
      const angleStart = revealStart + (Math.max(0, introItems.length - 1) * revealStagger) + 0.34;
      const spreadStart = angleStart + 0.56;
      const tl = gsap.timeline({
        onUpdate: () => this.render(true),
        onComplete: () => {
          this.introState.active = false;
          this.items.forEach(item => {
            item.introOpacity = 1;
            item.row.style.removeProperty('clip-path');
            item.row.style.removeProperty('-webkit-clip-path');
          });
          document.body.classList.remove('is-home-intro-running');
          this.render(true);
        },
      });
      tl.to(introItems, {
        introOpacity: 1,
        introClip: 0,
        duration: 0.52,
        stagger: revealStagger,
        ease: 'power4.out',
      }, revealStart);
      tl.to(this.introState, {
        angle: 1,
        rotation: -5.5,
        duration: 0.72,
        ease: 'power3.inOut',
      }, angleStart);
      tl.to(this.introState, {
        spread: 1,
        rotation: 0,
        duration: 1.14,
        ease: 'power4.inOut',
      }, spreadStart);
      tl.to(headerBits, {
        autoAlpha: 1,
        duration: 0.5,
        stagger: 0.045,
        clearProps: 'opacity,visibility',
      }, spreadStart + 0.34);
    }
  }

  /* =====================================================
     PROJECT MODAL — simplified open/close
  ===================================================== */
  class VinylModal {
    constructor(list) {
      this.list = list;
      this.isPopupOpen = false;
      this.isAnimating = false;
      this.stageRatio = 1;
      this.activeRow = null;
      this.els = null;
    }

    init() {
      const modal = qs(SELECTORS.projectModal);
      if (!modal) return;
      this.els = {
        modal,
        overlay: qs(SELECTORS.pmodalOverlay, modal),
        shell: qs(SELECTORS.pmodalShell, modal),
        layout: qs(SELECTORS.pmodalLayout, modal),
        mediaCol: qs(SELECTORS.pmodalMediaCol, modal),
        stage: qs(SELECTORS.pmodalStage, modal),
        captures: qs(SELECTORS.pmodalCaptures, modal),
        title: qs(SELECTORS.pmodalTitle, modal),
        mobileTitle: qs(SELECTORS.pmodalMobileTitle, modal),
        desc: qs(SELECTORS.pmodalDescription, modal),
        services: qs(SELECTORS.pmodalServices, modal),
        website: qs(SELECTORS.pmodalWebsite, modal),
        websiteBlock: qs(SELECTORS.pmodalWebsiteBlock, modal),
        thumbs: qs(SELECTORS.pmodalThumbs, modal),
        info: qs(SELECTORS.pmodalInfo, modal),
        close: qs(SELECTORS.pmodalClose, modal),
        closeTriggers: qsa(SELECTORS.pmodalCloseTrigger, modal),
      };
      this.els.descriptionBlock = this.els.desc?.closest('.pmodal__block');
      this.els.servicesBlock = this.els.services?.closest('.pmodal__block');
      this.els.closeTriggers.forEach(trigger => trigger.addEventListener('click', () => this.close()));
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.isPopupOpen) this.close();
      });
      window.addEventListener('resize', () => this.updateStageSize());
    }

    getStageSize(ratio = this.stageRatio) {
      const viewport = getViewportState();
      const mediaColWidth = this.els.mediaCol?.getBoundingClientRect?.().width || 0;
      const maxWidth = mediaColWidth || Math.min(viewport.width * 0.62, viewport.height * 0.8, 860);
      const verticalChrome = viewport.isMobile ? 110 : (viewport.isTablet ? 122 : 96);
      const maxHeight = Math.max(220, viewport.height - verticalChrome);
      const safeRatio = sanitizeMediaRatio(ratio);
      const height = Math.min(maxWidth / safeRatio, maxHeight);
      const width = Math.min(maxWidth, height * safeRatio);
      return {
        width: snapPixel(width, viewport.deviceScale),
        height: snapPixel(height, viewport.deviceScale),
      };
    }

    setStageRatio(ratio) {
      this.stageRatio = sanitizeMediaRatio(ratio);
      this.updateStageSize();
    }

    updateStageSize() {
      if (!this.els?.layout) return;
      const { width, height } = this.getStageSize();
      this.els.layout.style.setProperty('--pmodal-stage-ratio', String(this.stageRatio));
      this.els.layout.style.setProperty('--pmodal-stage-width', `${width}px`);
      this.els.layout.style.setProperty('--pmodal-stage-height', `${height}px`);
    }

    renderInfo(data) {
      this.els.title.textContent = data.title;
      this.els.mobileTitle.textContent = data.title;
      this.els.desc.textContent = data.description;
      this.els.descriptionBlock.hidden = !data.description.trim();
      this.els.servicesBlock.hidden = !data.services.length;
      this.els.websiteBlock.hidden = !data.projectUrl;
      if (data.projectUrl) this.els.website.href = data.projectUrl;
      else this.els.website.removeAttribute('href');
      this.els.services.replaceChildren();
      if (data.services.length) {
        const list = document.createElement('ul');
        list.className = 'pmodal__services-list';
        data.services.forEach(service => {
          const item = document.createElement('li');
          item.textContent = service;
          list.appendChild(item);
        });
        this.els.services.appendChild(list);
      }
    }

    renderCaptures(data) {
      const captures = getScrollableCaptures(data);
      const fragment = document.createDocumentFragment();
      this.els.captures.replaceChildren();
      captures.forEach((url, index) => {
        const figure = document.createElement('figure');
        const image = createMedia({
          type: 'image',
          src: url,
          className: 'pmodal__capture-media',
          alt: data.title ? `${data.title} capture ${index + 1}` : `Project capture ${index + 1}`,
        });
        figure.className = 'pmodal__capture';
        image.loading = 'lazy';
        image.decoding = 'async';
        figure.appendChild(image);
        fragment.appendChild(figure);
      });
      this.els.captures.appendChild(fragment);
    }

    open(row) {
      if (!this.els || this.isAnimating || this.isPopupOpen) return;
      this.isAnimating = true;
      this.activeRow = row;
      this.list.setHoveredIndex(-1);

      const data = getProjectData(row);
      const sourceMedia = qs(SELECTORS.rowMediaEl, row);
      this.renderInfo(data);
      this.renderCaptures(data);
      this.els.thumbs.replaceChildren();
      const featured = mediaFromProject(data, 0);
      this.els.stage.replaceChildren(featured);
      if (featured.tagName === 'VIDEO') safePlay(featured);

      this.setStageRatio(getMediaNaturalRatio(featured) || getMediaNaturalRatio(sourceMedia) || 1);
      resetModalScroll(this.els.shell);

      const visibleItems = this.list.items
        .filter(item => item.row.style.visibility !== 'hidden')
        .sort((a, b) => a.row.getBoundingClientRect().top - b.row.getBoundingClientRect().top);
      const activeItem = visibleItems.find(item => item.row === row);
      const otherMedia = visibleItems.filter(item => item.row !== row).map(item => item.media);
      this.listTransitionMedia = visibleItems.map(item => item.media);
      const exitTargets = new Map(visibleItems.map((item, index) => {
        const rect = item.media.getBoundingClientRect();
        const rowTransform = getComputedStyle(item.row).transform;
        const matrix = rowTransform && rowTransform !== 'none'
          ? new DOMMatrixReadOnly(rowTransform)
          : null;
        const verticalScale = Math.max(0.5, matrix ? Math.hypot(matrix.c, matrix.d) : 1);
        const edgeClearance = Math.max(180, window.innerHeight * 0.15);
        const direction = rect.left + (rect.width / 2) < window.innerWidth / 2 ? -1 : 1;
        const drift = direction * (22 + ((index % 3) * 9));
        return [item.media, {
          upY: -(rect.bottom + edgeClearance) / verticalScale,
          downY: (window.innerHeight - rect.top + edgeClearance) / verticalScale,
          x: drift,
          rotation: direction * 1.1,
        }];
      }));

      document.body.classList.add('is-locked', 'is-project-transitioning');
      this.els.modal.classList.add('is-visible');
      this.els.modal.setAttribute('aria-hidden', 'false');

      const reduced = prefersReducedMotion();
      const isMobileDetail = window.matchMedia('(max-width: 640px)').matches;
      const blocks = qsa(SELECTORS.pmodalBlock, this.els.info).filter(block => !block.hidden);
      const detailClearance = Math.max(120, window.innerHeight * 0.1);
      const stageRect = this.els.stage.getBoundingClientRect();
      const infoRect = this.els.info.getBoundingClientRect();
      const mediaEnterY = -(stageRect.bottom + detailClearance);
      const infoEnterY = -(infoRect.bottom + detailClearance);
      gsap.set(this.els.close, { autoAlpha: 0, y: -24 });
      gsap.set(this.els.mobileTitle, { autoAlpha: 0, y: 22 });
      gsap.set(this.els.mediaCol, {
        autoAlpha: isMobileDetail ? 0 : 1,
        y: isMobileDetail ? 34 : mediaEnterY,
      });
      gsap.set(this.els.info, {
        autoAlpha: isMobileDetail ? 0 : 1,
        y: isMobileDetail ? 28 : infoEnterY,
      });
      gsap.set(this.els.title, { autoAlpha: isMobileDetail ? 0 : 1 });
      gsap.set(blocks, {
        autoAlpha: isMobileDetail ? 0 : 1,
        y: isMobileDetail ? 18 : 0,
      });
      gsap.set(this.els.captures, { autoAlpha: 0 });
      gsap.set(this.els.overlay, { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          this.isAnimating = false;
          this.isPopupOpen = true;
        },
      });
      const exitDuration = reduced ? 0.01 : 0.78;
      const exitStagger = 0;
      if (activeItem) {
        const target = exitTargets.get(activeItem.media);
        tl.to(activeItem.media, {
          y: target.upY,
          x: target.x * 1.35,
          rotation: target.rotation * 1.1,
          duration: reduced ? 0.01 : 0.72,
          ease: 'power3.in',
        }, 0);
      }
      if (otherMedia.length) {
        tl.to(otherMedia, {
          y: (index, media) => exitTargets.get(media).downY,
          x: (index, media) => exitTargets.get(media).x,
          rotation: (index, media) => exitTargets.get(media).rotation,
          duration: exitDuration,
          stagger: exitStagger,
          ease: 'power3.in',
        }, 0);
      }

      const detailStart = reduced
        ? 0.03
        : Math.max(0.8, exitDuration + 0.08);
      tl.to(this.els.overlay, { opacity: 1, duration: reduced ? 0.01 : 0.28, ease: 'power1.out' }, detailStart);
      if (isMobileDetail) {
        tl.to(this.els.mobileTitle, {
          autoAlpha: 1,
          y: 0,
          duration: reduced ? 0.01 : 0.52,
          ease: 'power3.out',
        }, detailStart + 0.04);
      }
      tl.to(this.els.mediaCol, {
        autoAlpha: 1,
        y: 0,
        duration: reduced ? 0.01 : 0.78,
        ease: 'power4.out',
      }, detailStart + 0.08);
      tl.to(this.els.info, {
        autoAlpha: 1,
        y: 0,
        duration: reduced ? 0.01 : 0.7,
        ease: 'power4.out',
      }, detailStart + 0.16);
      if (isMobileDetail && blocks.length) {
        tl.to(blocks, {
          autoAlpha: 1,
          y: 0,
          duration: reduced ? 0.01 : 0.46,
          stagger: reduced ? 0 : 0.07,
          ease: 'power3.out',
        }, detailStart + 0.22);
      }
      tl.to(this.els.close, { autoAlpha: 1, y: 0, duration: reduced ? 0.01 : 0.38, ease: 'power3.out' }, detailStart + 0.34);
      tl.to(this.els.captures, {
        autoAlpha: 1,
        duration: reduced ? 0.01 : 0.36,
        ease: 'power2.out',
      }, detailStart + (reduced ? 0.05 : 0.9));
    }

    close() {
      if (!this.els || this.isAnimating || !this.isPopupOpen) return;
      this.isAnimating = true;

      const featured = qs(SELECTORS.pmodalFeatured, this.els.stage);
      const reduced = prefersReducedMotion();
      const isMobileDetail = window.matchMedia('(max-width: 640px)').matches;
      const blocks = qsa(SELECTORS.pmodalBlock, this.els.info).filter(block => !block.hidden);
      const transitionMedia = this.listTransitionMedia || this.list.items.map(item => item.media);
      const tl = gsap.timeline({
        onComplete: () => {
          pauseMedia(featured);
          this.els.modal.classList.remove('is-visible');
          this.els.modal.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('is-locked', 'is-project-transitioning');
          gsap.set([featured, this.els.overlay, this.els.close, this.els.mediaCol, this.els.info, this.els.title, this.els.mobileTitle, this.els.captures, ...blocks], { clearProps: 'all' });
          gsap.set(transitionMedia, { clearProps: 'transform,opacity,visibility' });
          this.els.stage.replaceChildren();
          this.isAnimating = false;
          this.isPopupOpen = false;
          this.activeRow = null;
          this.listTransitionMedia = null;
          this.list.render(true);
        },
      });
      const detailClearance = Math.max(120, window.innerHeight * 0.1);
      const mediaExitY = -(this.els.stage.getBoundingClientRect().bottom + detailClearance);
      const infoExitY = -(this.els.info.getBoundingClientRect().bottom + detailClearance);
      const exitStart = reduced ? 0.01 : 0.24;
      tl.to(this.els.captures, { autoAlpha: 0, duration: reduced ? 0.01 : 0.24, ease: 'power2.inOut' }, 0);
      tl.to(this.els.close, { autoAlpha: 0, duration: reduced ? 0.01 : 0.24, ease: 'power1.in' }, exitStart);
      if (isMobileDetail) {
        tl.to([this.els.mobileTitle, ...blocks], {
          autoAlpha: 0,
          y: -16,
          duration: reduced ? 0.01 : 0.3,
          stagger: reduced ? 0 : 0.025,
          ease: 'power2.in',
        }, exitStart);
      }
      tl.to(this.els.mediaCol, { y: mediaExitY, duration: reduced ? 0.01 : 0.7, ease: 'power3.in' }, exitStart);
      tl.to(this.els.info, { y: infoExitY, duration: reduced ? 0.01 : 0.64, ease: 'power3.in' }, exitStart + 0.04);
      tl.to(this.els.overlay, { opacity: 0, duration: reduced ? 0.01 : 0.3, ease: 'power1.inOut' }, exitStart + 0.68);
      tl.call(() => {
        gsap.set(transitionMedia, { clearProps: 'transform,opacity,visibility' });
        this.list.render(true);
        gsap.set(transitionMedia, {
          y: (index, media) => {
            const rect = media.getBoundingClientRect();
            const row = media.closest(SELECTORS.row);
            const rowTransform = row ? getComputedStyle(row).transform : 'none';
            const matrix = rowTransform && rowTransform !== 'none'
              ? new DOMMatrixReadOnly(rowTransform)
              : null;
            const verticalScale = Math.max(0.5, matrix ? Math.hypot(matrix.c, matrix.d) : 1);
            const edgeClearance = Math.max(180, window.innerHeight * 0.15);
            return (window.innerHeight - rect.top + edgeClearance) / verticalScale;
          },
          x: index => (index % 2 === 0 ? -1 : 1) * (20 + ((index % 3) * 8)),
          rotation: index => index % 2 === 0 ? -1.1 : 1.1,
        });
      }, null, exitStart + 0.72);
      tl.to(transitionMedia, {
        y: 0,
        x: 0,
        rotation: 0,
        duration: reduced ? 0.01 : 0.72,
        stagger: reduced ? 0 : 0.055,
        ease: 'power3.inOut',
      }, exitStart + 0.74);
    }
  }

  const boot = () => {
    const list = new VinylList();
    list.init();
    window.__vinylList = list;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
