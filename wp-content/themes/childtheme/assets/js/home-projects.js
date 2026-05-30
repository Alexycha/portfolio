(() => {
  const SELECTORS = {
    wrapper: '.home-projects__wrapper',
    row: '.project-row, .artist_item',
    webflowRow: '.artist_item',
    modalRow: '.project-row',
    rowFrame: '.project-row__media, .media-link',
    rowLabel: '.tag-home-wrap',
    rowIntroLabel: '.project-row__header, .tag-home-wrap',
    rowMedia: '.project-row__media-el, .media-slider-home',
    videoMedia: 'video.project-row__media-el, video.media-slider-home',
    snakeZoomControl: '[data-snake-zoom-control]',
    projectModal: '#pmodal',
    pmodalOverlay: '.pmodal__overlay',
    pmodalShell: '.pmodal__shell',
    pmodalLayout: '.pmodal__layout',
    pmodalMediaCol: '.pmodal__media-col',
    pmodalStage: '[data-pmodal-stage]',
    pmodalCaptures: '[data-pmodal-captures]',
    pmodalTitle: '[data-pmodal-title]',
    pmodalDescription: '[data-pmodal-desc]',
    pmodalServices: '[data-pmodal-services]',
    pmodalThumbs: '[data-pmodal-thumbs]',
    pmodalInfo: '.pmodal__info-col',
    pmodalClose: '.pmodal__close',
    pmodalCloseTrigger: '[data-pmodal-close]',
    pmodalBlock: '.pmodal__block',
    pmodalThumb: '.pmodal__thumb',
    pmodalFeatured: '.pmodal__featured',
    snakeZoom: '[data-snake-zoom]',
    headerTop: '.site-header__top',
    headerRole: '.site-header__role',
    headerNavItem: '.site-header__nav .site-header__link',
    headerControl: '.header-controls > button',
    headerBottomItem: '.header-bottom-items .header-item',
    homeTitle: '.home-projects__title',
  };

  const CLASSES = {
    active: 'is-active',
    snakeView: 'is-snake-view',
    locked: 'is-locked',
    animatingProject: 'is-project-animating',
    modalVisible: 'is-visible',
    transitionSource: 'is-transition-source',
    homeIntroPrep: 'is-home-intro-prep',
    homeIntroRunning: 'is-home-intro-running',
  };

  const CONFIG = {
    galleryEase: 0.082,
    galleryDragSpeed: 2.45,
    galleryWheelSpeed: 2.55,
    mobileSnakeGalleryEase: 0.2,
    mobileSnakeDragSpeed: 3.7,
    mobileSnakeWheelSpeed: 3.15,
    mobileSnakeReleaseMomentum: 8.2,
    horizontalGalleryEase: 0.036,
    mobileHorizontalGalleryEase: 0.068,
    horizontalDragSpeed: 0.72,
    mobileHorizontalDragSpeed: 0.58,
    horizontalWheelSpeed: 0.34,
    mobileHorizontalWheelSpeed: 0.28,
    viewFadeDuration: 240,
    activeGalleryDistance: 200,
    videoMargin: 260,
    videoUpdateInterval: 250,
    dragClickSuppressMs: 260,
    leadingCloneSets: 3,
    trailingCloneSets: 8,
    classicOverlap: 2.25,
    classicRevealDistanceVh: 34,
    mobileClassicRevealDistanceVh: 50,
    classicStartHeightRatio: 0.34,
    mobileClassicStartHeightRatio: 0.42,
    mobileClassicMaxScale: 1.84,
    mobileClassicMaxHeightRatio: 0.72,
    snakeIdleWaveAmplitude: 5,
    snakeIdleWaveSpeed: 0.0011,
    snakeIdleWavePhase: 0.36,
    snakeSpeedReference: 16,
    snakeSpeedMaxIntensity: 1,
    snakeAccelEase: 0.105,
    snakeDecelEase: 0.045,
    snakeVelocityDecay: 0.87,
    snakeVelocityImpulse: 0.08,
    snakePitchRatio: 0.42,
    snakeViewportShift: 0.04,
    mobileSnakeViewportShift: 0,
    snakeZoomEase: 0.12,
    projectTransitionStagger: 0.24,
    projectExitDuration: 0.64,
    projectReturnDuration: 0.66,
    projectSelectedExitDuration: 0.72,
    projectSelectedReturnDuration: 0.72,
    projectStageEnterDuration: 0.68,
    projectStageExitDuration: 0.46,
    projectOffscreenFactor: 1.28,
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = gsap.utils.clamp;
  const wrap = gsap.utils.wrap;
  const snapPixel = (value, scale = window.devicePixelRatio || 1) => Math.round(value * scale) / scale;
  const isSnakeView = () => document.body.classList.contains(CLASSES.snakeView);
  const isLocked = () => document.body.classList.contains(CLASSES.locked);
  const getViewportState = () => {
    const width = window.innerWidth;
    return {
      width,
      height: window.innerHeight,
      center: width / 2,
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
  const getRectRatio = el => {
    if (!el?.getClientRects?.().length) return 0;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 0;
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
  const getEventAxis = event => (event.touches ? event.touches[0] : event).clientX;
  const getHorizontalEase = viewport => (viewport.isMobile ? CONFIG.mobileHorizontalGalleryEase : CONFIG.horizontalGalleryEase);
  const getHorizontalDragSpeed = viewport => (viewport.isMobile ? CONFIG.mobileHorizontalDragSpeed : CONFIG.horizontalDragSpeed);
  const getHorizontalWheelSpeed = viewport => (viewport.isMobile ? CONFIG.mobileHorizontalWheelSpeed : CONFIG.horizontalWheelSpeed);
  const getSnakeEase = viewport => (viewport.isMobile ? CONFIG.mobileSnakeGalleryEase : CONFIG.galleryEase);
  const getSnakeDragSpeed = viewport => (viewport.isMobile ? CONFIG.mobileSnakeDragSpeed : CONFIG.galleryDragSpeed);
  const getSnakeWheelSpeed = viewport => (viewport.isMobile ? CONFIG.mobileSnakeWheelSpeed : CONFIG.galleryWheelSpeed);
  const canHover = () => window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches || false;
  const getSnakeZoomProfile = zoom => {
    const zoomOut = clamp(0, 1, -zoom);
    const zoomIn = clamp(0, 1, zoom);

    return {
      itemScale: 1 - (zoomOut * 0.62) + (zoomIn * 0.34),
      pitchScale: 1 - (zoomOut * 0.9) + (zoomIn * 0.28),
      arcScale: 1 - (zoomOut * 0.99) + (zoomIn * 0.82),
      diagonalScale: 1 - zoomOut + (zoomIn * 0.18),
      depthScale: 1 - (zoomOut * 0.92) + (zoomIn * 0.44),
      rotateScale: 1 + (zoomOut * 0.72) + (zoomIn * 0.22),
      sideLean: zoomOut,
      straightness: zoomOut,
      zOffset: -(zoomOut * 92) + (zoomIn * 26),
      yLimitScale: 1 - (zoomOut * 0.16) + (zoomIn * 0.28),
    };
  };
  const shouldIgnoreProjectOpen = target => {
    if (!(target instanceof Element)) return true;
    if (target.closest(`${SELECTORS.projectModal}, .mini-modal, .site-header`)) return true;
    const interactive = target.closest('a, button, input, textarea, select, label, [data-open], [data-mini-close], [data-mini-stop]');
    return Boolean(interactive && !interactive.closest(SELECTORS.modalRow));
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
  const prefersReducedMotion = () => (
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
  );

  const setLabelScale = (row, scale, label = qs(SELECTORS.rowLabel, row)) => {
    row.style.setProperty('--label-scale', String(scale));
    label?.style.setProperty('scale', String(scale));
  };

  const clearLabelScale = (row, label = qs(SELECTORS.rowLabel, row)) => {
    row.style.removeProperty('--label-scale');
    label?.style.removeProperty('scale');
  };

  const setMediaVideoAttrs = video => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
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
      mainImage: data.mainImage || '',
    };
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

  const clearProjectRuntimeStyles = row => {
    row.style.transform = '';
    row.style.scale = '';
    row.style.opacity = '';
    row.style.visibility = '';
    row.style.zIndex = '';
    row.style.filter = '';
    row.style.transformOrigin = '';
    row.style.removeProperty('--modal-y');
    row.style.removeProperty('--modal-opacity');
    clearLabelScale(row);
    qs(SELECTORS.rowFrame, row)?.style.removeProperty('height');
  };

  const pauseMedia = media => {
    if (media?.tagName === 'VIDEO') media.pause();
  };

  const getSnakePose = (rowCenter, viewport = getViewportState(), intensity = 0, zoom = 0) => {
    const { width, center, height, isMobile, isTablet } = viewport;
    const isWide = width >= 1600;
    const isUltraWide = width >= 2200;
    const zoomProfile = getSnakeZoomProfile(zoom);
    const stackMotion = Math.max(0, 1 - (zoomProfile.straightness * 1.12));
    const calmBase = isMobile
      ? Math.min(72, height * 0.085)
      : (isTablet ? Math.min(112, height * 0.12) : Math.min(148, height * 0.145));
    const speedShape = 1 + (intensity * (isMobile ? 0.12 : 0.16) * stackMotion);
    const yAmp = calmBase * speedShape;
    const diagonalRise = (isMobile
      ? Math.min(82, height * 0.095)
      : (isTablet ? Math.min(130, height * 0.135) : Math.min(178, height * 0.17))) *
      (1 + (intensity * (isMobile ? 0.08 : 0.1) * stackMotion));
    const zBase = (isMobile ? -14 : (isTablet ? -20 : -24)) - (intensity * (isMobile ? 4 : 8) * stackMotion);
    const zAmp = (isMobile ? 24 : (isTablet ? 30 : 36)) * (1 + (intensity * 0.45 * stackMotion));
    const leftness = clamp(0, 1, 1 - (rowCenter / width));
    const depthBias = Math.pow(leftness, 1.18);
    const progress = clamp(-1.65, 1.65, (rowCenter - center) / center);
    const abs = Math.abs(progress);
    const broadWaveFrequency = isMobile ? 0.66 : 0.74;
    const broadWavePhase = progress * Math.PI * broadWaveFrequency - 0.42;
    const secondaryWavePhase = progress * Math.PI * 1.12 + 0.72;
    const broadWave = Math.sin(broadWavePhase);
    const secondaryWave = Math.sin(secondaryWavePhase) * (isMobile ? 0.12 : 0.16);
    const directionBias = clamp(-1, 1, progress);
    const diagonalY = -directionBias * diagonalRise * zoomProfile.diagonalScale;
    const arcY = -(broadWave + secondaryWave) * yAmp * zoomProfile.arcScale * stackMotion;
    const broadWaveDerivative = Math.cos(broadWavePhase) * Math.PI * broadWaveFrequency;
    const secondaryWaveDerivative = Math.cos(secondaryWavePhase) * Math.PI * 1.12 * (isMobile ? 0.12 : 0.16);
    const dyPerProgress = -diagonalRise - ((broadWaveDerivative + secondaryWaveDerivative) * yAmp);
    const tangentAngle = Math.atan2(dyPerProgress, center) * (180 / Math.PI);
    const sideTurnProgress = Math.pow(clamp(0, 1, (leftness - 0.18) / 0.82), 1.75) * stackMotion;
    const sideTurnMax = isMobile ? 26 : (isTablet ? 31 : (isUltraWide ? 17 : (isWide ? 22 : 34)));
    const sideTurn = sideTurnProgress * sideTurnMax * zoomProfile.rotateScale;
    const baseRotateY = isMobile ? -13 : (isTablet ? -15 : (isUltraWide ? -10 : (isWide ? -12 : -16)));
    const minRotateY = isMobile ? -38 : (isTablet ? -45 : (isUltraWide ? -28 : (isWide ? -34 : -49)));
    const sideLean = zoomProfile.sideLean * (isMobile ? -30 : (isTablet ? -36 : -42));
    const rawMinRotateY = minRotateY - (zoomProfile.sideLean * (isMobile ? 16 : (isTablet ? 22 : 28)));
    const rawMaxRotateY = (isMobile ? -11 : -13) - (zoomProfile.sideLean * (isMobile ? 30 : (isTablet ? 38 : 46)));
    const minRotateYZoomed = Math.min(rawMinRotateY, rawMaxRotateY);
    const maxRotateYZoomed = Math.max(rawMinRotateY, rawMaxRotateY);
    const curvedRotateY = clamp(
      minRotateYZoomed,
      maxRotateYZoomed,
      baseRotateY - sideTurn + sideLean + (directionBias * (isMobile ? 0.8 : 1.15))
    );
    const stackedRotateX = isMobile ? -22 : (isTablet ? -24 : -26);
    const rotateX = stackedRotateX * zoomProfile.straightness;
    const stackedRotateY = isMobile ? -13 : (isTablet ? -14 : (isUltraWide ? -14 : -15));
    const rotateY = curvedRotateY + ((stackedRotateY - curvedRotateY) * zoomProfile.straightness);
    const yLimit = Math.max(
      isMobile ? 92 : 128,
      ((height * (isMobile ? 0.34 : 0.38)) - (isMobile ? 58 : 84)) * zoomProfile.yLimitScale
    );
    const containedY = clamp(-yLimit, yLimit, diagonalY + arcY);
    const rotateZ = clamp(
      isMobile ? -2.8 : -3.6,
      isMobile ? 2.6 : 3.2,
      (tangentAngle * (isMobile ? 0.13 : 0.16) * zoomProfile.rotateScale * stackMotion) -
        (isMobile ? 0.2 : 0.35) +
        (Math.sin(progress * Math.PI) * intensity * (isMobile ? 0.12 : 0.18) * stackMotion)
    );
    const stackedRotateZ = 0;
    const finalRotateZ = rotateZ + ((stackedRotateZ - rotateZ) * zoomProfile.straightness);
    const curvedZ = zBase + zoomProfile.zOffset - ((abs * zAmp) * zoomProfile.depthScale) - (depthBias * (isMobile ? 8 : (isWide ? 10 : 18)) * zoomProfile.depthScale);
    const stackedZ = isMobile ? -86 : (isTablet ? -102 : -118);
    const finalZ = curvedZ + ((stackedZ - curvedZ) * zoomProfile.straightness);
    const curvedScale = (1 - (Math.min(abs, 1.45) * 0.01 * (1 + (intensity * 0.18 * stackMotion)))) * zoomProfile.itemScale;
    const finalScale = curvedScale + ((zoomProfile.itemScale - curvedScale) * zoomProfile.straightness);
    const scaleY = 1;
    const curvedOpacity = 1 - (Math.min(abs, 1.65) * 0.032 * (1 + (intensity * 0.16 * stackMotion)));
    const finalOpacity = curvedOpacity + ((1 - curvedOpacity) * zoomProfile.straightness);

    return {
      progress,
      y: containedY,
      z: finalZ,
      rotateX,
      rotateY,
      rotateZ: finalRotateZ,
      scale: finalScale,
      scaleY,
      opacity: finalOpacity,
    };
  };

  const getSnakeZIndex = pose => Math.round(1000 - Math.abs(pose.progress) * 90);

  const getClassicScale = (visualLeft, visualWidth, viewport = getViewportState(), rowWidth = 0) => {
    const progress = clamp(
      0,
      1,
      (visualLeft + visualWidth) / (viewport.width + visualWidth)
    );
    const minScale = viewport.isMobile ? 0.4 : (viewport.isTablet ? 0.26 : 0.28);
    let maxScale = viewport.isMobile ? CONFIG.mobileClassicMaxScale : (viewport.isTablet ? 1.86 : 2.18);

    if (rowWidth > 0) {
      const maxHeightRatio = viewport.isMobile ? CONFIG.mobileClassicMaxHeightRatio : (viewport.isTablet ? 0.72 : 0.82);
      maxScale = Math.min(maxScale, (viewport.height * maxHeightRatio) / rowWidth);
    }

    return {
      progress,
      scale: minScale + ((maxScale - minScale) * progress),
    };
  };

  const getClassicPose = (visualLeft, rowWidth, viewport = getViewportState()) => {
    let visualWidth = rowWidth * 0.28;
    let pose = getClassicScale(visualLeft, visualWidth, viewport, rowWidth);

    for (let i = 0; i < 4; i += 1) {
      visualWidth = rowWidth * pose.scale;
      pose = getClassicScale(visualLeft, visualWidth, viewport, rowWidth);
    }

    visualWidth = Math.ceil((rowWidth * pose.scale) * viewport.deviceScale) / viewport.deviceScale;
    pose = getClassicScale(visualLeft, visualWidth, viewport, rowWidth);

    const revealVh = viewport.isMobile ? CONFIG.mobileClassicRevealDistanceVh : CONFIG.classicRevealDistanceVh;
    const revealDistance = viewport.height * (revealVh / 100);
    const revealProgress = clamp(0, 1, (visualLeft + visualWidth) / revealDistance);
    const startHeightRatio = viewport.isMobile ? CONFIG.mobileClassicStartHeightRatio : CONFIG.classicStartHeightRatio;
    const heightRatio = startHeightRatio +
      ((1 - startHeightRatio) * revealProgress);

    return {
      ...pose,
      scale: visualWidth / rowWidth,
      mediaHeight: rowWidth * heightRatio,
      visualWidth,
      zIndex: Math.round(10 + (pose.progress * 90)),
    };
  };

  class VideoController {
    constructor() {
      this.videos = [];
      this.lastUpdate = 0;
    }

    init(root = document) {
      this.videos = qsa(SELECTORS.videoMedia, root);
      this.videos.forEach(video => {
        setMediaVideoAttrs(video);
        video.autoplay = false;
        video.pause();
      });
      this.update(true);
    }

    update(force = false) {
      const now = performance.now();
      if (!force && now - this.lastUpdate < CONFIG.videoUpdateInterval) return;
      this.lastUpdate = now;

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        margin: CONFIG.videoMargin,
      };

      this.videos.forEach(video => {
        if (this.isNearViewport(video, viewport)) {
          if (video.paused) safePlay(video);
        } else if (!video.paused) {
          video.pause();
        }
      });
    }

    isNearViewport(video, viewport) {
      if (!video.getClientRects().length) return false;
      const rect = video.getBoundingClientRect();
      return rect.right > -viewport.margin &&
        rect.left < viewport.width + viewport.margin &&
        rect.bottom > -viewport.margin &&
        rect.top < viewport.height + viewport.margin;
    }
  }

  class ViewToggleController {
    constructor(scrollView) {
      this.scrollView = scrollView;
      this.viewTransitionTimers = [];
    }

    init() {
      this.initSnakeToggle();
    }

    initSnakeToggle() {
      this.syncSnakeToggle();
      qs('#snake-toggle')?.addEventListener('click', () => this.toggleViewWithFade());
    }

    syncSnakeToggle() {
      qs('#snake-toggle')?.setAttribute(
        'aria-label',
        isSnakeView() ? 'Switch to list view' : 'Switch to snake view'
      );
    }

    clearViewTransitionTimers() {
      this.viewTransitionTimers.forEach(timer => window.clearTimeout(timer));
      this.viewTransitionTimers = [];
    }

    setViewTransitionTimer(callback, delay) {
      const timer = window.setTimeout(() => {
        this.viewTransitionTimers = this.viewTransitionTimers.filter(item => item !== timer);
        callback();
      }, delay);

      this.viewTransitionTimers.push(timer);
    }

    toggleViewWithFade() {
      this.clearViewTransitionTimers();
      document.body.classList.add('is-view-fading', 'is-snake-transition');
      window.requestAnimationFrame(() => {
        document.body.classList.add('is-view-fade-visible');
      });

      this.setViewTransitionTimer(() => {
        document.body.classList.toggle(CLASSES.snakeView);
        this.syncSnakeToggle();
        this.scrollView.calcDimensions();
        this.scrollView.render();

        window.requestAnimationFrame(() => {
          document.body.classList.remove('is-view-fade-visible');
        });

        this.setViewTransitionTimer(() => {
          document.body.classList.remove('is-view-fading', 'is-snake-transition');
          this.scrollView.render();
        }, CONFIG.viewFadeDuration);
      }, CONFIG.viewFadeDuration);
    }
  }

  class ScrollView {
    constructor(videoController) {
      this.videoController = videoController;
      this.wrapper = qs(SELECTORS.wrapper) || qs(SELECTORS.webflowRow)?.parentElement;
      if (this.wrapper && !this.wrapper.matches(SELECTORS.wrapper)) {
        this.wrapper.classList.add(SELECTORS.wrapper.slice(1));
      }
      this.items = [];
      this.current = 0;
      this.target = 0;
      this.paused = false;
      this.ticker = () => this.render();
      this.tickerActive = false;
      this.viewport = getViewportState();
      this.singleSetWidth = 0;
      this.originalCount = 0;
      this.leadingWidth = 0;
      this.snakeOriginIndex = 0;
      this.needsLayout = true;
      this.scrollVelocity = 0;
      this.scrollDirection = 0;
      this.inputVelocity = 0;
      this.snakeIntensity = 0;
      this.snakeIntensityTarget = 0;
      this.snakeZoom = 0;
      this.snakeZoomTarget = 0;
      this.zoomRange = qs(SELECTORS.snakeZoom);
      this.lastRenderAt = performance.now();
      this.resizeFrame = 0;
      this.drag = { start: 0, down: false, moved: false, suppressClickUntil: 0, lastDelta: 0 };
      this.boundRows = new WeakSet();
      this.hoverTargets = new WeakMap();
      this.hoverValues = new WeakMap();
    }

    init() {
      if (!this.wrapper) return;

      this.cloneRows();
      this.cacheItems();
      this.calcDimensions();
      this.bindInput();
      this.bindZoomControl();
      this.wake();
    }

    bindZoomControl() {
      if (!this.zoomRange) return;

      const syncZoom = () => {
        const rawValue = Number.parseFloat(this.zoomRange.value);
        const value = Number.isFinite(rawValue) ? clamp(0, 100, rawValue) : 50;
        this.snakeZoomTarget = (value - 50) / 50;
        this.zoomRange.style.setProperty('--snake-zoom-progress', `${value}%`);
        this.wake();
      };

      this.zoomRange.addEventListener('input', syncZoom);
      this.zoomRange.addEventListener('change', syncZoom);
      syncZoom();
    }

    cloneRows() {
      const originals = qsa(SELECTORS.row, this.wrapper);
      this.originalCount = originals.length;
      if (!originals.length) return;

      const leading = document.createDocumentFragment();
      for (let i = 0; i < CONFIG.leadingCloneSets; i += 1) {
        originals.forEach(row => leading.appendChild(this.createClone(row)));
      }
      this.wrapper.insertBefore(leading, this.wrapper.firstChild);

      const trailing = document.createDocumentFragment();
      for (let i = 0; i < CONFIG.trailingCloneSets; i += 1) {
        originals.forEach(row => trailing.appendChild(this.createClone(row)));
      }
      this.wrapper.appendChild(trailing);
    }

    createClone(row) {
      const clone = row.cloneNode(true);
      clone.dataset.clone = 'true';
      qsa('img', clone).forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
      });
      qsa('video', clone).forEach(video => {
        setMediaVideoAttrs(video);
        video.autoplay = false;
        video.pause();
      });
      return clone;
    }

    cacheItems() {
      this.items = qsa(SELECTORS.row, this.wrapper).map((row, index) => {
        this.bindRowHover(row);
        return {
          row,
          index,
          media: qs(SELECTORS.rowFrame, row),
          label: qs(SELECTORS.rowLabel, row),
          isOriginal: !row.dataset.clone,
          left: 0,
          width: 0,
          marginRight: 0,
          active: row.classList.contains(CLASSES.active),
          labelScale: 1,
          mediaHeight: '',
          mode: '',
        };
      });

      this.originalCount = this.items.filter(item => item.isOriginal).length;
      this.snakeOriginIndex = CONFIG.leadingCloneSets * this.originalCount;
    }

    bindRowHover(row) {
      if (this.boundRows.has(row)) return;
      this.boundRows.add(row);
      if (!canHover()) return;

      row.addEventListener('pointerenter', () => {
        this.hoverTargets.set(row, 1);
        this.wake();
      });

      row.addEventListener('pointerleave', () => {
        this.hoverTargets.set(row, 0);
        this.wake();
      });
    }

    wake() {
      if (this.tickerActive) return;
      this.tickerActive = true;
      gsap.ticker.add(this.ticker);
    }

    sleep() {
      if (!this.tickerActive) return;
      gsap.ticker.remove(this.ticker);
      this.tickerActive = false;
    }

    bindInput() {
      window.addEventListener('wheel', event => {
        if (isLocked()) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        const speed = isSnakeView()
          ? getSnakeWheelSpeed(this.viewport) * this.getSnakeInputMultiplier()
          : getHorizontalWheelSpeed(this.viewport);
        const movement = delta * speed;
        this.target += movement;
        this.pushVelocityImpulse(movement);
        this.wake();
      }, { passive: true });

      document.addEventListener('click', event => {
        if (!this.shouldSuppressClick()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);

      window.addEventListener('mousedown', event => this.pointerDown(event));
      window.addEventListener('mousemove', event => this.pointerMove(event));
      window.addEventListener('mouseup', () => this.pointerUp());
      window.addEventListener('touchstart', event => this.pointerDown(event), { passive: true });
      window.addEventListener('touchmove', event => this.pointerMove(event), { passive: true });
      window.addEventListener('touchend', () => this.pointerUp());
      window.addEventListener('resize', () => this.scheduleResize());
    }

    scheduleResize() {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.calcDimensions();
        this.videoController.update(true);
        this.wake();
      });
    }

    pointerDown(event) {
      if (isLocked()) return;
      this.drag.down = true;
      this.drag.moved = false;
      this.drag.lastDelta = 0;
      this.drag.start = getEventAxis(event);
    }

    pointerMove(event) {
      if (!this.drag.down) return;

      const current = getEventAxis(event);
      const speed = isSnakeView()
        ? getSnakeDragSpeed(this.viewport) * this.getSnakeInputMultiplier()
        : getHorizontalDragSpeed(this.viewport);
      const delta = (this.drag.start - current) * speed;

      this.drag.start = current;
      this.drag.lastDelta = delta;
      if (Math.abs(delta) > 1) {
        this.drag.moved = true;
        this.drag.suppressClickUntil = performance.now() + CONFIG.dragClickSuppressMs;
      }
      this.target += delta;
      this.pushVelocityImpulse(delta);
      this.wake();
    }

    pointerUp() {
      if (this.drag.moved) {
        this.drag.suppressClickUntil = performance.now() + CONFIG.dragClickSuppressMs;
      }
      if (this.drag.moved && isSnakeView() && this.viewport.isMobile) {
        this.target += this.drag.lastDelta * CONFIG.mobileSnakeReleaseMomentum * this.getSnakeInputMultiplier();
      }
      this.drag.down = false;
      this.wake();
      setTimeout(() => { this.drag.moved = false; }, CONFIG.dragClickSuppressMs);
    }

    isDragging() {
      return this.shouldSuppressClick();
    }

    shouldSuppressClick() {
      return this.drag.moved || performance.now() < this.drag.suppressClickUntil;
    }

    pushVelocityImpulse(delta) {
      const scale = this.viewport.isMobile ? 0.56 : 1;
      this.inputVelocity = Math.max(
        this.inputVelocity,
        Math.min(180, Math.abs(delta) * scale)
      );
    }

    calcDimensions() {
      if (!this.items.length) this.cacheItems();

      this.viewport = getViewportState();
      this.singleSetWidth = 0;
      this.needsLayout = true;

      this.items.forEach(item => {
        const { row } = item;
        const style = getComputedStyle(row);

        item.left = row.offsetLeft;
        item.width = row.offsetWidth;
        item.marginRight = parseFloat(style.marginRight) || 0;

        if (item.isOriginal) {
          this.singleSetWidth += item.width + item.marginRight;
        }
      });

      this.leadingWidth = this.singleSetWidth * CONFIG.leadingCloneSets;
    }

    getSnakeZoomOut() {
      return clamp(0, 1, -this.snakeZoomTarget);
    }

    getSnakeInputMultiplier() {
      const zoomOut = this.getSnakeZoomOut();
      return 1 + (zoomOut * (this.viewport.isMobile ? 3.2 : 3.8));
    }

    getSnakeEaseMultiplier() {
      const zoomOut = this.getSnakeZoomOut();
      return 1 + (zoomOut * (this.viewport.isMobile ? 1.1 : 1.45));
    }

    render() {
      if (this.paused || !this.singleSetWidth) {
        this.sleep();
        return;
      }

      const snake = isSnakeView();
      const ease = snake
        ? Math.min(this.viewport.isMobile ? 0.42 : 0.32, getSnakeEase(this.viewport) * this.getSnakeEaseMultiplier())
        : getHorizontalEase(this.viewport);
      const delta = this.target - this.current;
      const previous = this.current;

      if (Math.abs(delta) > 0.01) {
        this.current += delta * ease;
      } else {
        this.current = this.target;
      }

      const now = performance.now();
      const elapsed = Math.min(80, Math.max(16, now - this.lastRenderAt));
      this.lastRenderAt = now;
      this.snakeZoom += (this.snakeZoomTarget - this.snakeZoom) * CONFIG.snakeZoomEase;
      if (Math.abs(this.snakeZoomTarget - this.snakeZoom) < 0.001) {
        this.snakeZoom = this.snakeZoomTarget;
      }

      const motion = Math.abs(this.current - previous);
      const velocityDecay = Math.pow(CONFIG.snakeVelocityDecay, elapsed / 16.67);
      const compositeVelocity = motion + (this.inputVelocity * CONFIG.snakeVelocityImpulse);
      const mobileVelocityScale = this.viewport.isMobile ? 0.58 : 1;

      this.inputVelocity *= velocityDecay;
      this.scrollVelocity = (this.scrollVelocity * 0.78) + (compositeVelocity * 0.22);
      this.scrollDirection = (this.scrollDirection * 0.82) + ((this.current - previous) * 0.18);
      this.snakeIntensityTarget = clamp(
        0,
        CONFIG.snakeSpeedMaxIntensity,
        (this.scrollVelocity * mobileVelocityScale) / CONFIG.snakeSpeedReference
      );
      const intensityEase = this.snakeIntensityTarget > this.snakeIntensity ? CONFIG.snakeAccelEase : CONFIG.snakeDecelEase;
      this.snakeIntensity += (this.snakeIntensityTarget - this.snakeIntensity) * intensityEase;
      if (Math.abs(this.snakeIntensityTarget - this.snakeIntensity) < 0.001) {
        this.snakeIntensity = this.snakeIntensityTarget;
      }

      const settled = !this.drag.down && Math.abs(this.target - this.current) <= 0.01;

      if (!snake && settled && !this.needsLayout) {
        this.videoController.update();
        this.sleep();
        return;
      }

      const keepRendering = this.renderGallery();
      this.videoController.update();

      if (!this.drag.down && Math.abs(this.target - this.current) <= 0.01 && !keepRendering) {
        this.sleep();
      }
    }

    renderGallery() {
      if (this.singleSetWidth > 0 && (this.current < 0 || this.current >= this.singleSetWidth)) {
        const delta = this.target - this.current;
        this.current = wrap(0, this.singleSetWidth, this.current);
        this.target = this.current + delta;
      }

      const snake = isSnakeView();
      const wrapperX = snake ? 0 : -this.leadingWidth - wrap(0, this.singleSetWidth, this.current);
      gsap.set(this.wrapper, { x: wrapperX, y: 0, force3D: true, overwrite: true });

      if (snake) {
        const keepRendering = this.renderSnakeGallery();
        this.needsLayout = false;
        return keepRendering;
      }

      const keepRendering = this.renderClassicGallery(wrapperX);
      this.needsLayout = false;
      return keepRendering;
    }

    renderSnakeGallery() {
      let keepRendering = false;
      const now = performance.now();
      const idleStrength = 1 - clamp(0, 1, this.snakeIntensity / CONFIG.snakeSpeedMaxIntensity);
      const idleWaveTime = now * CONFIG.snakeIdleWaveSpeed;
      const progress = wrap(0, this.singleSetWidth, this.current) / this.singleSetWidth;
      const unitOffset = progress * this.originalCount;
      const speedDirection = clamp(-1, 1, this.scrollDirection / (this.viewport.isMobile ? 12 : 18));
      const speedMass = clamp(0, 1, this.snakeIntensity / CONFIG.snakeSpeedMaxIntensity);
      const zoomProfile = getSnakeZoomProfile(this.snakeZoom);
      const stackMotion = Math.max(0, 1 - (zoomProfile.straightness * 1.12));
      keepRendering = stackMotion > 0.001 || Math.abs(this.snakeZoomTarget - this.snakeZoom) > 0.001;
      const stackInset = this.viewport.width * (this.viewport.isMobile ? 0.23 : (this.viewport.isTablet ? 0.26 : 0.3)) * zoomProfile.straightness;

      this.items.forEach(item => {
        const { row } = item;
        const basePitch = Math.max(
          item.width * CONFIG.snakePitchRatio,
          this.viewport.isMobile ? 72 : (this.viewport.isTablet ? 96 : 118)
        );
        const pitch = Math.max(basePitch * zoomProfile.pitchScale, basePitch * 0.1);
        const sequenceIndex = item.index - this.snakeOriginIndex - unitOffset;
        const viewportShift = this.viewport.isMobile ? CONFIG.mobileSnakeViewportShift : CONFIG.snakeViewportShift;
        const visualCenter = (sequenceIndex * pitch) + (pitch * 0.35) - (this.viewport.width * viewportShift) + stackInset;
        const offsetX = visualCenter - item.left - (item.width / 2);
        const pose = getSnakePose(visualCenter, this.viewport, this.snakeIntensity, this.snakeZoom);
        const hoverTarget = this.hoverTargets.get(row) || 0;
        const hoverCurrent = this.hoverValues.get(row) || 0;
        const hover = hoverCurrent + ((hoverTarget - hoverCurrent) * 0.14);
        const hoverLift = -46 * hover * stackMotion;
        const idleWave = Math.sin(idleWaveTime + (item.index * CONFIG.snakeIdleWavePhase)) *
          CONFIG.snakeIdleWaveAmplitude *
          idleStrength *
          stackMotion;
        const inertiaX = speedDirection * speedMass * (this.viewport.isMobile ? 7 : 12) * stackMotion;
        const inertiaSkew = speedDirection * speedMass * (this.viewport.isMobile ? 0.85 : 1.45) * stackMotion;
        const inertiaRotate = speedDirection * speedMass * (this.viewport.isMobile ? 0.42 : 0.78) * stackMotion;
        this.hoverValues.set(row, hover);
        keepRendering = keepRendering || Math.abs(hover - hoverTarget) > 0.001;

        if (item.mode !== 'snake') {
          row.style.scale = '';
          row.style.visibility = '';
          row.style.filter = '';
          row.style.transformOrigin = '50% 50%';
          item.mode = 'snake';
        }

        if (item.mediaHeight) {
          item.media?.style.removeProperty('height');
          item.mediaHeight = '';
        }

        if (item.labelScale !== 1) {
          clearLabelScale(row, item.label);
          item.labelScale = 1;
        }

        const sourceLift = row.classList.contains(CLASSES.transitionSource) ? 600 : 0;
        row.style.zIndex = String(getSnakeZIndex(pose) + sourceLift);
        row.style.opacity = `calc(${pose.opacity} * var(--modal-opacity, 1))`;
        row.style.transform = `translate3d(${offsetX + inertiaX}px, calc(${pose.y + hoverLift + idleWave}px + var(--modal-y, 0px)), ${pose.z}px) rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg) rotateZ(${pose.rotateZ + inertiaRotate}deg) skewY(${inertiaSkew}deg) scale3d(${pose.scale}, ${pose.scale * pose.scaleY}, 1)`;

        this.setActive(item, Math.abs(this.viewport.center - visualCenter) < CONFIG.activeGalleryDistance);
      });

      return keepRendering;
    }

    renderClassicGallery(wrapperX) {
      if (!this.items.length) return false;

      const anchorIndex = Math.min(
        this.items.length - 1,
        Math.max(0, CONFIG.leadingCloneSets * this.originalCount)
      );
      const placements = new Array(this.items.length);

      let visualLeft = this.items[anchorIndex].left + wrapperX;
      for (let i = anchorIndex; i < this.items.length; i += 1) {
        const item = this.items[i];
        const pose = getClassicPose(visualLeft, item.width, this.viewport);
        placements[i] = { visualLeft, pose, baseLeft: item.left + wrapperX };
        visualLeft += pose.visualWidth - CONFIG.classicOverlap;
      }

      visualLeft = this.items[anchorIndex].left + wrapperX;
      for (let i = anchorIndex - 1; i >= 0; i -= 1) {
        const item = this.items[i];
        let previousLeft = visualLeft - item.width + CONFIG.classicOverlap;
        let pose = getClassicPose(previousLeft, item.width, this.viewport);

        for (let j = 0; j < 4; j += 1) {
          previousLeft = visualLeft - pose.visualWidth + CONFIG.classicOverlap;
          pose = getClassicPose(previousLeft, item.width, this.viewport);
        }

        placements[i] = { visualLeft: previousLeft, pose, baseLeft: item.left + wrapperX };
        visualLeft = previousLeft;
      }

      placements.forEach((placement, index) => {
        if (!placement) return;

        const item = this.items[index];
        const { row } = item;
        const { pose } = placement;
        const offsetX = snapPixel(placement.visualLeft - placement.baseLeft, this.viewport.deviceScale);
        const visualCenter = placement.visualLeft + (pose.visualWidth / 2);

        if (item.mode !== 'classic') {
          row.style.scale = '';
          row.style.visibility = '';
          row.style.filter = '';
          row.style.transformOrigin = '0% 100%';
          item.mode = 'classic';
        }

        row.style.zIndex = String(pose.zIndex + (row.classList.contains(CLASSES.transitionSource) ? 600 : 0));
        row.style.opacity = 'var(--modal-opacity, 1)';
        row.style.transform = `translate3d(${offsetX}px, var(--modal-y, 0px), 0) scale(${pose.scale})`;

        const mediaHeight = `${snapPixel(pose.mediaHeight, this.viewport.deviceScale)}px`;
        if (item.media && item.mediaHeight !== mediaHeight) {
          item.media.style.height = mediaHeight;
          item.mediaHeight = mediaHeight;
        }

        const labelScale = 1 / pose.scale;
        if (item.labelScale !== labelScale) {
          setLabelScale(row, labelScale, item.label);
          item.labelScale = labelScale;
        }

        this.setActive(item, Math.abs(this.viewport.center - visualCenter) < CONFIG.activeGalleryDistance);
      });

      return false;
    }

    setActive(item, active) {
      if (item.active === active) return;
      item.row.classList.toggle(CLASSES.active, active);
      item.active = active;
    }

    resetRows() {
      this.items.forEach(item => {
        clearProjectRuntimeStyles(item.row);
        item.active = false;
        item.labelScale = 1;
        item.mediaHeight = '';
        item.mode = '';
      });
    }
  }

  class HomeIntro {
    constructor(scrollView) {
      this.scrollView = scrollView;
      this.timeline = null;
    }

    init() {
      if (!document.documentElement.classList.contains(CLASSES.homeIntroPrep)) return;

      if (prefersReducedMotion()) {
        this.showImmediately();
        return;
      }

      this.play();
    }

    showImmediately() {
      document.documentElement.classList.remove(CLASSES.homeIntroPrep);
      document.body.classList.remove(CLASSES.homeIntroRunning);
    }

    splitTitle(title) {
      if (!title) return [];
      if (title.dataset.introSplit === 'true') {
        return qsa('.home-projects__title-char', title);
      }

      const text = title.textContent || '';
      const fragment = document.createDocumentFragment();

      Array.from(text).forEach(char => {
        const span = document.createElement('span');
        span.className = `home-projects__title-char${char === ' ' ? ' home-projects__title-char--space' : ''}`;
        span.textContent = char === ' ' ? '\u00a0' : char;
        fragment.appendChild(span);
      });

      title.textContent = '';
      title.appendChild(fragment);
      title.dataset.introSplit = 'true';

      return qsa('.home-projects__title-char', title);
    }

    getIntroFrames() {
      const viewport = getViewportState();
      const horizontalInset = viewport.isMobile ? 0.38 : (viewport.isTablet ? 0.62 : 0.86);
      const horizontalOutset = viewport.isMobile ? 0.82 : (viewport.isTablet ? 1.18 : 1.58);
      const minLeft = -viewport.width * horizontalInset;
      const maxRight = viewport.width * (1 + horizontalOutset);
      const entries = this.scrollView.items
        .map(item => {
          const frame = item.media || qs(SELECTORS.rowFrame, item.row);
          const rect = item.row.getBoundingClientRect();
          const frameRect = frame?.getBoundingClientRect?.() || rect;

          return {
            row: item.row,
            frame,
            media: qs(SELECTORS.rowMedia, item.row),
            label: qs(SELECTORS.rowIntroLabel, item.row),
            rect,
            frameRect,
          };
        })
        .filter(item => (
          item.frame &&
          item.frameRect.width > 20 &&
          item.frameRect.height > 20 &&
          item.frameRect.right > minLeft &&
          item.frameRect.left < maxRight &&
          item.frameRect.bottom > -220 &&
          item.frameRect.top < viewport.height + 220
        ));

      return entries.sort((a, b) => a.frameRect.left - b.frameRect.left);
    }

    play() {
      const wrapper = this.scrollView.wrapper;
      const title = qs(SELECTORS.homeTitle);
      const zoomControl = qs(SELECTORS.snakeZoomControl);
      const titleChars = this.splitTitle(title);
      const topItems = [
        qs(SELECTORS.headerRole),
        ...qsa(SELECTORS.headerNavItem),
      ].filter(Boolean);
      const controls = qsa(SELECTORS.headerControl);
      const bottomItems = qsa(SELECTORS.headerBottomItem);
      this.scrollView.render();
      const introFrames = this.getIntroFrames();
      const frames = introFrames.map(item => item.frame);
      const mediaEls = introFrames.map(item => item.media).filter(Boolean);
      const labels = introFrames.map(item => item.label).filter(Boolean);
      const viewport = getViewportState();
      const tilt = viewport.isMobile ? 1.4 : 2.2;
      const itemSpread = clamp(0.88, viewport.isMobile ? 1.18 : 1.68, introFrames.length * (viewport.isMobile ? 0.104 : 0.084));
      const itemDelay = introFrames.length > 1 ? itemSpread / (introFrames.length - 1) : 0;
      const itemStart = 0.34;
      const itemDuration = viewport.isMobile ? 0.92 : 1.04;
      const footerStart = itemStart + itemSpread + 0.42;

      this.scrollView.wake();
      document.body.classList.add(CLASSES.homeIntroRunning);

      const introTargets = [wrapper, title, ...titleChars, ...topItems, ...controls, ...bottomItems, ...frames, ...mediaEls, ...labels];
      if (zoomControl) introTargets.push(zoomControl);

      gsap.killTweensOf(introTargets);
      gsap.set(topItems, { autoAlpha: 0, x: -18, clipPath: 'inset(0% 100% 0% 0%)' });
      gsap.set(controls, { autoAlpha: 0, y: -18, scale: 0.94 });
      gsap.set(bottomItems, { autoAlpha: 0, y: 24, clipPath: 'inset(100% 0% 0% 0%)' });
      if (zoomControl) {
        gsap.set(zoomControl, {
          autoAlpha: 0,
          y: 14,
          scaleX: 0.96,
          scaleY: 0.9,
          transformOrigin: '50% 50%',
        });
      }
      gsap.set(title, { autoAlpha: 1, perspective: 900 });
      gsap.set(titleChars, {
        autoAlpha: 0,
        filter: 'blur(18px)',
        rotateX: -10,
        scale: 0.985,
        transformOrigin: '50% 100%',
      });
      gsap.set(wrapper, { opacity: 1 });
      gsap.set(frames, {
        autoAlpha: 0,
        y: index => {
          const rect = introFrames[index]?.frameRect;
          const margin = viewport.isMobile ? 72 : 120;
          return rect ? -(rect.bottom + margin) : -(viewport.height + margin);
        },
        x: index => (index % 2 === 0 ? -10 : 10),
        rotateZ: index => (index % 2 === 0 ? -tilt : tilt),
        scale: 0.985,
        clipPath: 'inset(0% 0% 14% 0%)',
        backgroundColor: 'transparent',
        transformOrigin: '50% 8%',
      });
      gsap.set(mediaEls, { scale: 1.045, filter: 'blur(8px)', transformOrigin: '50% 50%' });
      gsap.set(labels, {
        autoAlpha: 0,
        filter: 'blur(8px)',
        clipPath: 'inset(0% 0% 0% 0%)',
      });

      document.documentElement.classList.remove(CLASSES.homeIntroPrep);

      this.timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          document.body.classList.remove(CLASSES.homeIntroRunning);
          gsap.set([wrapper, title, ...titleChars, ...topItems, ...controls, ...bottomItems], {
            clearProps: 'opacity,visibility,transform,clipPath,perspective,filter',
          });
          if (zoomControl) {
            gsap.set(zoomControl, { clearProps: 'opacity,visibility,transform,transformOrigin' });
          }
          gsap.set(titleChars, { clearProps: 'opacity,visibility,transform,filter,transformOrigin' });
          gsap.set(frames, { clearProps: 'opacity,visibility,transform,clipPath,backgroundColor,transformOrigin' });
          gsap.set(mediaEls, { clearProps: 'transform,filter' });
          gsap.set(labels, { clearProps: 'opacity,visibility,filter,clipPath' });
          this.timeline = null;
        },
      });

      this.timeline
        .to(topItems, {
          autoAlpha: 1,
          x: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.54,
          stagger: 0.06,
        }, 0.05)
        .to(controls, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.48,
          stagger: 0.045,
          ease: 'power2.out',
        }, 0.15)
        .to(titleChars, {
          autoAlpha: 1,
          filter: 'blur(0px)',
          rotateX: 0,
          scale: 1,
          duration: 0.9,
          stagger: { each: 0.055, from: 'start' },
          ease: 'power3.out',
        }, 0.18)
        .to(bottomItems, {
          autoAlpha: 1,
          y: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.62,
          stagger: 0.06,
          ease: 'power3.out',
        }, footerStart);

      if (zoomControl) {
        this.timeline.to(zoomControl, {
          autoAlpha: 1,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.62,
          ease: 'power3.out',
        }, 0.2);
      }

      introFrames.forEach((item, index) => {
        const offset = itemStart + (index * itemDelay) + ((index % 3) * 0.012);

        this.timeline
          .to(item.frame, {
            autoAlpha: 1,
            y: 0,
            x: 0,
            rotateZ: 0,
            scale: 1,
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: itemDuration,
            ease: 'expo.out',
          }, offset);

        if (item.media) {
          this.timeline.to(item.media, {
            scale: 1,
            filter: 'blur(0px)',
            duration: itemDuration * 0.68,
            ease: 'power3.out',
          }, offset + 0.12);
        }

        if (item.label && !isSnakeView()) {
          this.timeline.to(item.label, {
            autoAlpha: 1,
            filter: 'blur(0px)',
            duration: 0.34,
            ease: 'power2.out',
          }, offset + itemDuration - 0.08);
        }
      });
    }
  }

  class ProjectModal {
    constructor(scrollView) {
      this.scrollView = scrollView;
      this.activeRow = null;
      this.activeProject = null;
      this.activeMediaIndex = 0;
      this.stageRatio = 1;
      this.isAnimating = false;
      this.isPopupOpen = false;
      this.transitionTimeline = null;
      this.galleryRows = [];
      this.hiddenGalleryRows = [];
      this.galleryTravel = 0;
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
        desc: qs(SELECTORS.pmodalDescription, modal),
        services: qs(SELECTORS.pmodalServices, modal),
        thumbs: qs(SELECTORS.pmodalThumbs, modal),
        info: qs(SELECTORS.pmodalInfo, modal),
        close: qs(SELECTORS.pmodalClose, modal),
        closeTriggers: qsa(SELECTORS.pmodalCloseTrigger, modal),
      };

      this.bindEvents();
    }

    bindEvents() {
      if (!this.scrollView.wrapper) return;

      document.addEventListener('click', event => {
        if (event.defaultPrevented || this.scrollView.isDragging() || shouldIgnoreProjectOpen(event.target)) return;
        const row = event.target.closest(SELECTORS.modalRow);
        if (row) {
          event.preventDefault();
          this.open(row);
        }
      });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        const row = event.target.closest(SELECTORS.modalRow);
        if (!row) return;

        event.preventDefault();
        this.open(row);
      });

      this.els.closeTriggers.forEach(trigger => trigger.addEventListener('click', () => this.close()));
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.isPopupOpen) this.close();
      });
      window.addEventListener('resize', () => this.updateStageSize());
    }

    async open(row) {
      if (this.isAnimating || this.isPopupOpen) return;

      this.isAnimating = true;
      this.activeRow = row;
      this.activeProject = row;
      const visibleRows = this.getVisibleGalleryRows();
      this.galleryRows = visibleRows.filter(item => item !== row);
      const data = getProjectData(row);
      const sourceMedia = qs(SELECTORS.rowMedia, row);
      const sourceRatio = sanitizeMediaRatio(
        getMediaNaturalRatio(sourceMedia) ||
        getRectRatio(sourceMedia) ||
        1
      );

      this.renderInfo(data);
      this.renderThumbs(data);
      const featuredMedia = this.renderMedia(data);
      this.renderCaptures(data);
      this.setStageRatio(sourceRatio);

      const featuredRatio = await waitForMediaRatio(featuredMedia, sourceRatio);
      if (this.activeRow !== row) {
        this.isAnimating = false;
        return;
      }
      this.setStageRatio(featuredRatio);
      this.scrollView.render();
      this.prepareOpenState();

      this.animateOpen(this.galleryRows);
    }

    close() {
      if (this.isAnimating || !this.isPopupOpen) return;

      this.animateClose();
    }

    getStageEntranceOffset() {
      const rect = this.els.stage?.getBoundingClientRect?.();
      const height = window.innerHeight || 800;
      if (!rect?.height) return -Math.round(height * 0.62);
      return -Math.ceil(rect.bottom + Math.max(56, height * 0.08));
    }

    getAllGalleryRows() {
      const seen = new Set();
      const rows = this.scrollView.items
        .map(item => item.row)
        .filter(row => {
          if (!row || seen.has(row)) return false;
          seen.add(row);
          return true;
        });

      return rows.length ? rows : qsa(SELECTORS.modalRow, this.scrollView.wrapper);
    }

    getListTravel(rows = []) {
      const viewport = getViewportState();
      const baseTravel = viewport.height * CONFIG.projectOffscreenFactor;
      if (!rows.length) return Math.ceil(baseTravel);

      const margin = Math.max(80, viewport.height * 0.14);
      const rects = rows
        .map(row => row.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0);

      if (!rects.length) return Math.ceil(baseTravel);

      const maxBottom = Math.max(...rects.map(rect => rect.bottom));
      const minTop = Math.min(...rects.map(rect => rect.top));

      return Math.ceil(Math.max(
        baseTravel,
        maxBottom + margin,
        viewport.height - minTop + margin
      ));
    }

    getVisibleGalleryRows() {
      const viewport = getViewportState();
      const rows = this.getAllGalleryRows()
        .map(row => ({ row, rect: row.getBoundingClientRect() }))
        .filter(({ rect }) => (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right > -120 &&
          rect.left < viewport.width + 120 &&
          rect.bottom > -180 &&
          rect.top < viewport.height + 180
        ))
        .sort((a, b) => a.rect.left - b.rect.left)
        .map(item => item.row);

      return rows.length ? rows : this.getAllGalleryRows();
    }

    prepareGalleryRows(rows) {
      const animatedRows = new Set(rows);
      const allRows = this.getAllGalleryRows();

      this.hiddenGalleryRows = allRows.filter(row => row !== this.activeProject && !animatedRows.has(row));
      gsap.killTweensOf(allRows);

      allRows.forEach(row => {
        row.style.setProperty('--modal-y', '0px');
        row.style.setProperty('--modal-opacity', '1');
        row.style.pointerEvents = 'none';
      });
      this.activeProject?.classList.add(CLASSES.transitionSource);
    }

    clearGalleryRows(rows = this.getAllGalleryRows()) {
      gsap.killTweensOf(rows);
      rows.forEach(row => {
        row.style.removeProperty('--modal-y');
        row.style.removeProperty('--modal-opacity');
        row.style.opacity = '';
        row.style.pointerEvents = '';
        row.classList.remove(CLASSES.transitionSource);
      });
    }

    renderInfo(data) {
      this.els.title.textContent = data.title;
      this.els.desc.textContent = data.description;
      this.els.services.replaceChildren();

      if (!data.services.length) return;

      const list = document.createElement('ul');
      list.className = 'pmodal__services-list';
      data.services.forEach(service => {
        const item = document.createElement('li');
        item.textContent = service;
        list.appendChild(item);
      });
      this.els.services.appendChild(list);
    }

    renderThumbs(data) {
      this.els.thumbs.replaceChildren();
    }

    renderMedia(data, index = 0, animate = false) {
      this.activeMediaIndex = index;

      const prev = qs(SELECTORS.pmodalFeatured, this.els.stage);
      const next = mediaFromProject(data, index);

      if (!animate || !prev) {
        pauseMedia(prev);
        this.els.stage.replaceChildren(next);
      } else {
        gsap.set(next, { opacity: 0, scale: 1.015 });
        this.els.stage.appendChild(next);
        gsap.to(prev, {
          opacity: 0,
          scale: 0.985,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => {
            pauseMedia(prev);
            prev.remove();
          },
        });
        gsap.to(next, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
      }

      if (next.tagName === 'VIDEO') safePlay(next);
      qsa(SELECTORS.pmodalThumb, this.els.thumbs).forEach((thumb, i) => thumb.classList.toggle(CLASSES.active, i === index));
      return next;
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
      if (!this.els?.layout || !this.els.stage) return;

      const { width, height } = this.getStageSize();
      this.els.layout.style.setProperty('--pmodal-stage-ratio', String(this.stageRatio));
      this.els.layout.style.setProperty('--pmodal-stage-width', `${width}px`);
      this.els.layout.style.setProperty('--pmodal-stage-height', `${height}px`);
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

    prepareOpenState() {
      const { modal, overlay, shell, stage, close, title, info, thumbs, captures } = this.els;

      modal.classList.add(CLASSES.modalVisible);
      modal.setAttribute('aria-hidden', 'false');
      this.isPopupOpen = true;
      document.body.classList.add(CLASSES.locked);
      document.body.classList.add(CLASSES.animatingProject);
      // Keep the serpent ticker alive so the scene breathes while the selected card opens.
      this.scrollView.paused = false;
      this.scrollView.wake();
      resetModalScroll(shell);

      const stageOffset = this.getStageEntranceOffset();

      gsap.set(overlay, { opacity: 0, '--pmodal-blur': '0px' });
      gsap.set(stage, {
        opacity: 0,
        visibility: 'hidden',
        y: stageOffset,
        scale: 1,
        filter: 'blur(0px)',
        transformOrigin: '50% 0%',
      });
      gsap.set(close, { opacity: 0, y: -6 });
      gsap.set(title, { opacity: 0, y: 12 });
      gsap.set(qsa(SELECTORS.pmodalBlock, info), { opacity: 0, y: 12 });
      gsap.set(info, { opacity: 1 });
      gsap.set(thumbs, { opacity: 0, y: 12 });
      gsap.set(captures, { opacity: 0, y: 12 });
    }

    animateOpen(galleryRows = []) {
      const { overlay, stage, close, title, info, thumbs, captures } = this.els;
      const activeRow = this.activeProject;
      const travel = this.getListTravel(activeRow ? [...galleryRows, activeRow] : galleryRows);
      const blocks = qsa(SELECTORS.pmodalBlock, info);
      const reduced = prefersReducedMotion();

      this.galleryTravel = travel;
      this.prepareGalleryRows(galleryRows);
      const hiddenRows = this.hiddenGalleryRows;
      this.transitionTimeline?.kill();

      this.transitionTimeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          this.isAnimating = false;
          this.transitionTimeline = null;
        },
      });

      const timeline = this.transitionTimeline;

      // Stable extraction: the selected card leaves upward, every other visible card drops downward.
      timeline.to(galleryRows, {
        '--modal-y': `${travel}px`,
        '--modal-opacity': 0,
        duration: reduced ? 0.01 : CONFIG.projectExitDuration,
        stagger: reduced ? 0 : { amount: CONFIG.projectTransitionStagger, from: 'center' },
        ease: 'power3.inOut',
        overwrite: true,
      }, 0);

      if (hiddenRows.length) {
        timeline.to(hiddenRows, {
          '--modal-y': `${travel}px`,
          '--modal-opacity': 0,
          duration: reduced ? 0.01 : 0.38,
          ease: 'power3.inOut',
          overwrite: true,
        }, 0);
      }

      if (activeRow) {
        timeline.to(activeRow, {
          '--modal-y': `${-travel}px`,
          '--modal-opacity': 0,
          duration: reduced ? 0.01 : CONFIG.projectSelectedExitDuration,
          ease: 'expo.inOut',
          overwrite: true,
        }, 0.02);
      }

      timeline.to(overlay, {
        opacity: 1,
        '--pmodal-blur': '0px',
        duration: reduced ? 0.01 : 0.34,
        ease: 'power2.out',
      }, 0.28);

      timeline.add(() => gsap.set(stage, { visibility: 'visible' }), reduced ? 0 : 0.58);
      timeline.to(stage, {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: reduced ? 0.01 : CONFIG.projectStageEnterDuration,
        ease: 'power4.out',
      }, 0.58);
      timeline.to(close, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.24, ease: 'power2.out' }, 0.86);
      timeline.to(title, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.36, ease: 'power2.out' }, 0.92);
      timeline.to(blocks, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.34, stagger: reduced ? 0 : 0.04, ease: 'power2.out' }, 0.98);
      timeline.to(thumbs, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.3, ease: 'power2.out' }, 1.02);
      timeline.to(captures, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.32, ease: 'power2.out' }, 1.04);
    }

    animateClose() {
      const { modal, overlay, stage, close, title, info, thumbs, captures } = this.els;
      const galleryRows = (this.galleryRows.length ? this.galleryRows : this.getVisibleGalleryRows())
        .filter(row => row !== this.activeProject);
      const allRows = this.getAllGalleryRows();
      const travel = Math.ceil(Math.max(this.galleryTravel, window.innerHeight * CONFIG.projectOffscreenFactor));
      const blocks = qsa(SELECTORS.pmodalBlock, info);
      const reduced = prefersReducedMotion();
      const activeRow = this.activeProject;
      const stageOffset = this.getStageEntranceOffset();

      this.isAnimating = true;
      this.isPopupOpen = false;
      this.transitionTimeline?.kill();
      gsap.killTweensOf(allRows);
      allRows.forEach(row => {
        row.style.setProperty('--modal-y', row === activeRow ? `${-travel}px` : `${travel}px`);
        row.style.setProperty('--modal-opacity', '0');
        row.style.pointerEvents = 'none';
      });
      activeRow?.classList.add(CLASSES.transitionSource);
      this.scrollView.paused = false;
      this.scrollView.wake();

      this.transitionTimeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
          modal.classList.remove(CLASSES.modalVisible);
          modal.setAttribute('aria-hidden', 'true');
          document.body.classList.remove(CLASSES.locked);
          document.body.classList.remove(CLASSES.animatingProject);
          gsap.set(stage, { clearProps: 'scale,y,filter,visibility,transformOrigin' });
          this.clearGalleryRows(allRows);
          this.scrollView.render();
          this.scrollView.wake();
          this.galleryRows = [];
          this.hiddenGalleryRows = [];
          this.galleryTravel = 0;
          this.activeRow = null;
          this.activeProject = null;
          this.isAnimating = false;
          this.transitionTimeline = null;
        },
      });

      const timeline = this.transitionTimeline;

      timeline.to([close, title], { opacity: 0, y: 10, duration: reduced ? 0.01 : 0.24, ease: 'power2.inOut' }, 0);
      timeline.to(blocks, { opacity: 0, y: 10, duration: reduced ? 0.01 : 0.22, stagger: reduced ? 0 : 0.02, ease: 'power2.inOut' }, 0);
      timeline.to(thumbs, { opacity: 0, y: 10, duration: reduced ? 0.01 : 0.22, ease: 'power2.in' }, 0.02);
      timeline.to(captures, { opacity: 0, y: 12, duration: reduced ? 0.01 : 0.24, ease: 'power2.in' }, 0.02);
      timeline.to(stage, {
        opacity: 0,
        y: stageOffset,
        scale: 1,
        filter: 'blur(0px)',
        duration: reduced ? 0.01 : CONFIG.projectStageExitDuration,
        ease: 'power3.in',
      }, 0.02);

      if (activeRow) {
        timeline.to(activeRow, {
          '--modal-y': '0px',
          '--modal-opacity': 1,
          duration: reduced ? 0.01 : CONFIG.projectSelectedReturnDuration,
          ease: 'expo.out',
          overwrite: true,
        }, 0.26);
      }

      timeline.to(overlay, { opacity: 0, '--pmodal-blur': '0px', duration: reduced ? 0.01 : 0.34, ease: 'power2.inOut' }, 0.18);
      timeline.to(galleryRows, {
        '--modal-y': '0px',
        '--modal-opacity': 1,
        duration: reduced ? 0.01 : CONFIG.projectReturnDuration,
        stagger: reduced ? 0 : { amount: CONFIG.projectTransitionStagger, from: 'center' },
        ease: 'power3.out',
        overwrite: true,
      }, 0.34);
    }
  }

  const init = () => {
    document.body.classList.add(CLASSES.snakeView);

    const videoController = new VideoController();
    const scrollView = new ScrollView(videoController);
    // Horizontal/list view disabled for now.
    // const viewToggle = new ViewToggleController(scrollView);
    const projectModal = new ProjectModal(scrollView);
    const homeIntro = new HomeIntro(scrollView);

    scrollView.init();
    videoController.init();
    projectModal.init();
    // viewToggle.init();
    homeIntro.init();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
