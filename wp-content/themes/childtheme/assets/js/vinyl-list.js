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
    pitchRatio: 0.105,          // scroll distance per sleeve = viewport height * ratio
    pitchMin: 64,
    pitchMax: 118,
    // The crate: one straight diagonal through the centre of the screen, bottom-left in front.
    // `card` / `maxHeight` size the sleeve (fractions of the viewport width / height); `stepX` /
    // `stepY` (offset between two sleeves) and `pullX` / `pullY` (how far a hovered sleeve slides
    // out) are fractions of the sleeve width, so the crate keeps its overlap on any screen.
    // Portrait screens (phones, upright tablets) use the steeper `portrait` crate.
    landscape: { card: 0.21, maxHeight: 0.36, stepX: 0.45, stepY: 0.43, pullX: 0.4, pullY: 0.1 },
    portrait: { card: 0.58, maxHeight: 0.3, stepX: 0.23, stepY: 0.41, pullX: 0.17, pullY: 0.035 },
    cardRatio: 1.3,             // one shared sleeve format (media is cropped to fit)
    skew: 10,                   // sleeves lean back along the rail (skewY, deg)
    depth: 0.012,               // front sleeves sit a touch larger than the ones behind
    reach: 6,                   // sleeves further than this from the centre are not drawn
    part: 0.55,                 // hovering a sleeve parts its neighbours by this many steps …
    partReach: 1.6,             // … fading over this many sleeves
    // Motion
    introShift: 7,              // steps the crate slides in along its diagonal on load
    ease: 5.5,                  // scroll smoothing (1/s), frame-rate independent
    speedRef: 9,                // steps/s that count as "full speed" for the effects below
    stretch: 0.06,              // the row loosens a little at speed
    sway: 3,                    // sleeves tip (deg) with the scroll, on a spring
    swaySpring: 70,
    swayDamping: 9.5,
    wheelSpeed: 0.85,
    dragSpeed: 1.05,
    momentum: 12,
    dragClickSuppressMs: 260,
    hoverScale: 0.018,
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
     VINYL LIST — a crate of sleeves on one diagonal rail
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
      // Only as many copies of the list as the visible stretch of rail needs (usually one).
      this.copies = Math.max(1, Math.ceil((CONFIG.reach * 2) / Math.max(1, this.logicalCount)));
      this.items = [];
      for (let copy = 0; copy < this.copies; copy += 1) {
        this.rows.forEach((source, railIndex) => {
          let row = source;
          if (copy > 0) {
            row = source.cloneNode(true);
            row.dataset.railClone = String(copy);
            row.setAttribute('aria-hidden', 'true');
            row.setAttribute('tabindex', '-1');
            this.wrapper.appendChild(row);
          }
          this.items.push({
            row,
            railIndex,
            copy,
            media: qs(SELECTORS.rowMedia, row),
            hit: null,
            culled: false,
            t: 0,
            hover: 0,
            hoverTarget: 0,
            hoverVelocity: 0,
            last: {},
          });
        });
      }
      this.viewport = getViewportState();
      this.offset = 0;
      this.target = 0;
      this.time = 0;
      this.speed = 0;
      this.lastFlow = 0;
      this.sway = 0;
      this.swayVelocity = 0;
      this.dirty = false;
      this.wasMoving = false;
      this.restRendered = false;
      this.cardWidth = 300;
      this.canHover = false;
      this.pointer = null;
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
      this.introState = { shift: 0, alpha: 1 };
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
      this.bindEvents();
      this.modal = new VinylModal(this);
      this.modal.init();
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

    get shape() {
      const { width, height, isMobile } = this.viewport;
      return isMobile || width / height < 0.85 ? CONFIG.portrait : CONFIG.landscape;
    }

    // Every sleeve shares one format.
    sizeCards() {
      const { width, height } = this.viewport;
      const shape = this.shape;
      const ratio = CONFIG.cardRatio;
      this.cardWidth = Math.round(Math.min(width * shape.card, height * shape.maxHeight * ratio));
      const w = `${this.cardWidth}px`;

      this.items.forEach(item => {
        item.row.style.width = w;
        item.media.style.aspectRatio = String(ratio);
        item.hit.style.width = w;
        item.hit.style.aspectRatio = String(ratio);
        item.row.dataset.railFormat = 'landscape';
      });
    }

    setHoveredIndex(index) {
      if (index === this.hoveredIndex) return;
      this.hoveredIndex = index;
      this.items.forEach((item, itemIndex) => {
        item.hoverTarget = itemIndex === index ? 1 : 0;
        item.row.classList.toggle('is-hovered', itemIndex === index);
        const video = qs('.project-row__media-video', item.row);
        if (video && itemIndex === index) {
          // reveal the clip only once frames are actually moving, never a blank buffering frame
          const reveal = () => { if (item.row.classList.contains('is-hovered')) item.row.classList.add('is-video-live'); };
          if (!video.paused && video.currentTime > 0) reveal();
          else video.addEventListener('timeupdate', reveal, { once: true });
          safePlay(video);
        } else if (video) {
          video.pause();
          item.row.classList.remove('is-video-live');
        }
      });

      if (this.hoverLabel) {
        const row = index >= 0 ? this.items[index]?.row : null;
        if (row) {
          // numbered in the order shown, not by the hidden source list (which skips filtered projects)
          this.hoverLabelIndex.textContent = String(this.items[index].railIndex + 1).padStart(2, '0');
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

    // After the crate stops under a still pointer, hover whatever sleeve is now beneath it.
    rehover() {
      if (!this.canHover || !this.pointer || this.isBusy()) return;
      const hit = document.elementFromPoint(this.pointer.x, this.pointer.y);
      const index = hit?.classList?.contains('vinyl-hit-target') ? Number(hit.dataset.hitIndex) : -1;
      this.setHoveredIndex(index);
      if (index >= 0) this.setHoverLabelPosition(null, true);
    }

    bindEvents() {
      const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
      this.canHover = canHover;
      if (canHover) {
        window.addEventListener('pointermove', event => {
          this.pointer = { x: event.clientX, y: event.clientY };
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { this.pointer = null; });
      }
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
        ? clamp(0.001, 0.05, (now - this.lastFrameTime) / 1000)
        : 1 / 60;
      this.lastFrameTime = now;
      this.time = now / 1000;
      this.updateHoverLabel();
      const hoverMoving = this.updateHover(dt);

      // no snap — the rail glides freely; exponential smoothing gives the inertia
      const delta = this.target - this.offset;
      const scrolling = Math.abs(delta) >= 0.015;
      if (scrolling) this.offset += delta * (this.reduced ? 1 : 1 - Math.exp(-CONFIG.ease * dt));
      else this.offset = this.target;
      // hover is dropped while the crate moves; pick it back up once it has nearly settled
      const settling = Math.abs(delta) > this.pitch * 0.04;
      if (this.wasMoving && !settling) this.rehover();
      this.wasMoving = settling;

      if (this.reduced) {
        if (scrolling || hoverMoving || this.dirty) this.render();
        this.dirty = scrolling;
        return;
      }

      // How fast the rail flows past the focus plane (steps/s), intro included. The cards
      // answer on a spring: they swing with the motion and settle with a soft overshoot.
      const flow = (this.offset / this.pitch) + this.introState.shift;
      const speed = (flow - this.lastFlow) / dt;
      this.lastFlow = flow;
      this.speed += (speed - this.speed) * (1 - Math.exp(-14 * dt));
      const swayTarget = clamp(-1, 1, this.speed / CONFIG.speedRef);
      this.swayVelocity += (((swayTarget - this.sway) * CONFIG.swaySpring) - (this.swayVelocity * CONFIG.swayDamping)) * dt;
      this.sway += this.swayVelocity * dt;

      // at rest (no scroll, hover, sway or intro in flight) there is nothing to redraw
      const resting = !scrolling && !hoverMoving
        && Math.abs(this.sway) < 0.0005 && Math.abs(this.swayVelocity) < 0.0005
        && this.introState.shift === 0 && this.introState.alpha === 1;
      if (resting) {
        if (this.sway !== 0 || !this.restRendered) {
          this.sway = 0;
          this.swayVelocity = 0;
          this.render();
          this.restRendered = true;
        }
        return;
      }
      this.restRendered = false;
      this.render();
    }

    render(force = false) {
      if (!force && (this.modal?.isAnimating || this.modal?.isPopupOpen)) return;
      const shape = this.shape;
      const card = this.cardWidth;
      const stepX = card * shape.stepX;
      const stepY = card * shape.stepY;
      const pullX = card * shape.pullX;
      const pullY = card * shape.pullY;
      const count = this.logicalCount;
      const total = count * this.copies;
      const half = total / 2;
      const { shift, alpha } = this.introState;
      const sway = this.reduced ? 0 : this.sway;
      const stretch = 1 + (CONFIG.stretch * Math.min(1, Math.abs(sway)));
      const skew = (CONFIG.skew + (sway * CONFIG.sway)).toFixed(2);
      const progress = this.offset / this.pitch;

      // global progression + index offset, wrapped for the infinite loop and centred:
      // t = 0 is the middle of the screen, t < 0 the front of the crate (bottom-left)
      let open = null;
      this.items.forEach(item => {
        const t = progress - item.railIndex + (item.copy * count);
        item.t = ((((t + half) % total) + total) % total) - half;
        if (item.hover > 0.001 && (!open || item.hover > open.hover)) open = item;
      });
      const openAmount = open ? Math.min(1, open.hover) : 0;

      this.items.forEach(item => {
        let t = item.t;
        // flipping through: the sleeves around the hovered one move apart to show it
        if (open && item !== open) {
          const gap = t - open.t;
          t += Math.sign(gap) * CONFIG.part * openAmount * Math.exp(-Math.abs(gap) / CONFIG.partReach);
        }
        t = (t + shift) * stretch;

        const opacity = clamp(0, 1, (CONFIG.reach - Math.abs(t)) / 0.6) * alpha;
        const last = item.last;

        // off-screen: skip the paint entirely
        const culled = opacity <= 0.004;
        if (culled !== item.culled) {
          item.culled = culled;
          item.row.style.visibility = culled ? 'hidden' : '';
          item.hit.style.visibility = culled ? 'hidden' : '';
        }
        if (culled) return;

        const hover = clamp(0, 1.06, item.hover);
        const pose = (pt, ph) => {
          const scale = clamp(0.9, 1.08, 1 - (pt * CONFIG.depth)) * (1 + (CONFIG.hoverScale * ph));
          return `translate(-50%, -50%) translate3d(${((pt * stepX) + (pullX * ph)).toFixed(2)}px, ${((-pt * stepY) + (pullY * ph)).toFixed(2)}px, 0) skewY(${skew}deg) scale(${scale.toFixed(4)})`;
        };
        const transform = pose(t, hover);
        if (transform !== last.transform) {
          last.transform = transform;
          item.row.style.transform = transform;
        }
        // The interaction surface stays on the sleeve's resting slot: if it followed the
        // pulled-out sleeve, the pointer would fall off it and the sleeve would snap back.
        const hitTransform = pose((item.t + shift) * stretch, 0);
        if (hitTransform !== last.hitTransform) {
          last.hitTransform = hitTransform;
          item.hit.style.transform = hitTransform;
        }

        const opacityValue = opacity.toFixed(3);
        if (opacityValue !== last.opacity) {
          last.opacity = opacityValue;
          item.row.style.opacity = opacityValue;
        }

        // front of the crate (bottom-left) paints over the sleeves behind it
        const zIndex = 500 - Math.round(t * 12);
        if (zIndex !== last.zIndex) {
          last.zIndex = zIndex;
          item.row.style.zIndex = String(zIndex);
        }
        const hitZ = 500 - Math.round(item.t * 12);
        if (hitZ !== last.hitZ) {
          last.hitZ = hitZ;
          item.hit.style.zIndex = String(hitZ);
        }
      });

      const focused = ((Math.round(progress) % count) + count) % count;
      if (focused !== this.focusedIndex) {
        this.focusedIndex = focused;
        this.rows.forEach((row, i) => row.classList.toggle('is-focused', i === focused));
      }
    }

    // The crate slides in along its diagonal and settles.
    intro() {
      const root = document.documentElement;
      const headerBits = [
        qs(SELECTORS.headerTop),
        ...qsa(SELECTORS.headerControl),
        ...qsa(SELECTORS.headerBottomItem),
      ].filter(Boolean);
      const release = () => document.body.classList.remove('is-home-intro-running');

      gsap.set(this.wrapper, { autoAlpha: 1 });

      if (this.reduced) {
        this.render(true);
        root.classList.remove('is-home-intro-prep');
        return;
      }

      gsap.set(headerBits, { autoAlpha: 0 });
      document.body.classList.add('is-home-intro-running');
      Object.assign(this.introState, { shift: CONFIG.introShift, alpha: 0 });
      this.lastFlow = (this.offset / this.pitch) + CONFIG.introShift;
      this.render(true);
      root.classList.remove('is-home-intro-prep');

      // tick() renders every frame, so the timeline only has to move the numbers
      const tl = gsap.timeline({
        onComplete: () => {
          Object.assign(this.introState, { shift: 0, alpha: 1 });
          release();
        },
      });
      tl.to(this.introState, { shift: 0, duration: 2.6, ease: 'expo.out' }, 0.1);
      tl.to(this.introState, { alpha: 1, duration: 0.9, ease: 'power2.out' }, 0.1);
      tl.call(release, null, 1.3);
      tl.to(headerBits, {
        autoAlpha: 1,
        duration: 0.5,
        stagger: 0.045,
        clearProps: 'opacity,visibility',
      }, 0.9);
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
        // on-screen size / layout size: the camera scales each card differently
        const verticalScale = Math.max(0.05, rect.height / (item.media.offsetHeight || rect.height || 1));
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
      // the stylesheet parks the title 24px low for its entrance; the info column carries it in
      gsap.set(this.els.title, { autoAlpha: isMobileDetail ? 0 : 1, y: 0 });
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
            const verticalScale = Math.max(0.05, rect.height / (media.offsetHeight || rect.height || 1));
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
