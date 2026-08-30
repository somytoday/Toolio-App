/**
 * Toolio Automation — Main Application Controller
 */

// ═══════════════════════════════════════════════════════
// CAROUSEL DATA: 10 Official Product Slides
// ═══════════════════════════════════════════════════════
const CAROUSEL_SLIDES = [
  {
    id: 'flow-video',
    name: 'Flow Video',
    image: 'assets/images/toolio-flow-video.png',
    description: 'Generate and manage video batches through one organized workflow.',
    alt: 'Toolio Flow Video interface showing video batches and prompt controls'
  },
  {
    id: 'flow-image',
    name: 'Flow Image',
    image: 'assets/images/toolio-flow-image.png',
    description: 'Create image batches with references, parallel jobs, and live progress.',
    alt: 'Toolio Flow Image interface showing batch generation and seed controls'
  },
  {
    id: 'google-accounts',
    name: 'Google Accounts Manager',
    image: 'assets/images/toolio-google-accounts.png',
    description: 'Manage multiple Google accounts and monitor connection readiness from one place.',
    alt: 'Toolio Google Accounts Manager showing multiple-account automation setup and readiness status.'
  },
  {
    id: 'credits-account-status',
    name: 'Credits & Account Status',
    image: 'assets/images/toolio-credits-status.png',
    description: 'View account credits, supported services, readiness, and active work at a glance.',
    alt: 'Toolio account dashboard showing credits, supported services, status, and active work.'
  },
  {
    id: 'whiteboard-animator',
    name: 'Whiteboard Animator',
    image: 'assets/images/toolio-whiteboard-animator.png',
    description: 'Turn image sequences into configurable hand-drawn animations.',
    alt: 'Toolio Whiteboard Animator interface showing sketch animation settings'
  },
  {
    id: 'gemini-tts',
    name: 'Gemini TTS',
    image: 'assets/images/toolio-gemini-tts.png',
    description: 'Split long scripts and generate organized voice parts in batches.',
    alt: 'Toolio Gemini TTS interface showing script voice splitting'
  },
  {
    id: 'capcut-automator',
    name: 'CapCut Automator',
    image: 'assets/images/toolio-capcut-automator.png',
    description: 'Prepare and synchronize CapCut projects through a guided workflow.',
    alt: 'Toolio CapCut Automator interface showing project sync flow'
  },
  {
    id: 'prompt-cleaner',
    name: 'Prompt Cleaner',
    image: 'assets/images/toolio-prompt-cleaner.png',
    description: 'Remove repeated prompt patterns while preserving the original content.',
    alt: 'Toolio Prompt Cleaner interface showing text cleaner utility'
  },
  {
    id: 'sequence-checker',
    name: 'Sequence Checker',
    image: 'assets/images/toolio-sequence-checker.png',
    description: 'Detect missing and duplicate sequence numbers before processing.',
    alt: 'Toolio Sequence Checker interface showing sequence gap diagnostics'
  },
  {
    id: 'sequence-shifter',
    name: 'Sequence Shifter',
    image: 'assets/images/toolio-sequence-shifter.png',
    description: 'Preview and safely shift numbered file ranges in batches.',
    alt: 'Toolio Sequence Shifter interface showing numbered range batch re-indexing'
  }
];

let currentSlideIndex = 0;
let lastFocusedLightboxTrigger = null;
let lastFocusedMoreTrigger = null;
const preloadedImages = new Set();
let currentWebsiteTheme = localStorage.getItem('toolio_theme') || 'dark';

document.addEventListener('DOMContentLoaded', () => {
  initWebsiteTheme();
  initNavigationTabs();
  initMobileBottomNav();
  initHomeCarousel();
  initScreenshotLightbox();
  initWebsiteAuthModal();
  initExternalLinks();
  initCommercePrice();
  initChangelogSwitcher();
  initButtonRipplePhysics();
});

// ═══════════════════════════════════════════════════════
// THEME ENGINE (Light & Dark Modes)
// ═══════════════════════════════════════════════════════
function initWebsiteTheme() {
  document.documentElement.setAttribute('data-theme', currentWebsiteTheme);
  document.body.setAttribute('data-theme', currentWebsiteTheme);
  updateThemeToggleButtons();
}

function toggleWebsiteTheme() {
  currentWebsiteTheme = currentWebsiteTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('toolio_theme', currentWebsiteTheme);
  initWebsiteTheme();
  showToast(`Theme switched to ${currentWebsiteTheme} mode`);
}

function updateThemeToggleButtons() {
  const btns = document.querySelectorAll('.btn-theme-toggle, #theme-toggle-btn');
  btns.forEach(btn => {
    btn.innerHTML = currentWebsiteTheme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    btn.setAttribute('aria-label', `Switch to ${currentWebsiteTheme === 'dark' ? 'Light' : 'Dark'} Theme`);
  });
}

// ═══════════════════════════════════════════════════════
// TOP NAV: Stable URL Hash Navigation & Tab Switching
// ═══════════════════════════════════════════════════════
const VALID_TABS = [
  'home',
  'download',
  'whats-new',
  'toolio-tools',
  'other-tools',
  'suggestions',
  'community',
  'premium'
];

const MORE_SHEET_TABS = [
  'whats-new',
  'other-tools',
  'suggestions',
  'community',
  'premium'
];

function normalizeTabId(rawId) {
  if (!rawId) return 'home';
  const clean = rawId.replace(/^#/, '').toLowerCase();
  if (clean === 'contact') return 'community';
  if (clean === 'external-tools') return 'other-tools';
  return VALID_TABS.includes(clean) ? clean : 'home';
}

function setActiveTab(tabId, updateHistory = true) {
  const activeId = normalizeTabId(tabId);
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const tabViews = document.querySelectorAll('.tab-view');
  const dockBtns = document.querySelectorAll('.dock-item');
  const moreSheetItems = document.querySelectorAll('.more-sheet-item');

  // Update active class on desktop nav buttons
  tabBtns.forEach(btn => {
    const rawTab = btn.getAttribute('data-tab');
    const isMatch = rawTab ? normalizeTabId(rawTab) === activeId : false;
    btn.classList.toggle('active', isMatch);
    if (isMatch) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  // Update active class on mobile dock buttons (Only 1 active destination, never external store)
  const isMoreTab = MORE_SHEET_TABS.includes(activeId);
  dockBtns.forEach(btn => {
    const rawTab = btn.getAttribute('data-tab');
    let isMatch = false;
    if (btn.id === 'dock-btn-more') {
      isMatch = isMoreTab;
    } else if (rawTab) {
      isMatch = normalizeTabId(rawTab) === activeId;
    }
    btn.classList.toggle('active', isMatch);
    if (isMatch) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  // Update active class on more-sheet items
  moreSheetItems.forEach(item => {
    const rawTab = item.getAttribute('data-tab');
    const isMatch = rawTab ? normalizeTabId(rawTab) === activeId : false;
    item.classList.toggle('active', isMatch);
    if (isMatch) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  // Show matching view
  tabViews.forEach(view => {
    const isMatch = view.id === `view-${activeId}` || (activeId === 'other-tools' && view.id === 'view-external-tools');
    view.classList.toggle('active', isMatch);
    if (isMatch) {
      view.style.display = 'flex';
      view.style.opacity = '1';
    } else {
      view.style.display = 'none';
      view.style.opacity = '0';
    }
  });

  // Update URL hash without breaking browser history
  if (updateHistory) {
    if (window.location.hash !== `#${activeId}`) {
      try {
        history.pushState(null, '', `#${activeId}`);
      } catch {
        window.location.hash = activeId;
      }
    }
  }

  // Scroll to top of content smoothly on compact screens (< 1280px)
  if (window.innerWidth < 1280) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ═══════════════════════════════════════════════════════
// MOBILE BOTTOM NAVIGATION & MORE SHEET CONTROLLER
// ═══════════════════════════════════════════════════════
function getMoreSheetFocusableElements() {
  const drawer = document.getElementById('more-sheet-drawer');
  if (!drawer) return [];
  return Array.from(
    drawer.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

function handleMoreSheetKeydown(e) {
  const drawer = document.getElementById('more-sheet-drawer');
  if (!drawer || !drawer.classList.contains('active')) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeMoreSheet();
    return;
  }

  if (e.key === 'Tab') {
    const focusable = getMoreSheetFocusableElements();
    if (!focusable.length) return;

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl || !drawer.contains(document.activeElement)) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl || !drawer.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }
}

function openMoreSheet() {
  const drawer = document.getElementById('more-sheet-drawer');
  const backdrop = document.getElementById('more-sheet-backdrop');
  const moreBtn = document.getElementById('dock-btn-more');

  if (!drawer || !backdrop) return;

  lastFocusedMoreTrigger = document.activeElement;
  drawer.classList.add('active');
  backdrop.classList.add('active');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  if (moreBtn) moreBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('sheet-open');

  document.addEventListener('keydown', handleMoreSheetKeydown);

  // Focus first item inside drawer (or close button)
  const firstItem = drawer.querySelector('.more-sheet-item, .more-sheet-close-btn');
  if (firstItem) {
    setTimeout(() => firstItem.focus(), 50);
  }
}

function closeMoreSheet() {
  const drawer = document.getElementById('more-sheet-drawer');
  const backdrop = document.getElementById('more-sheet-backdrop');
  const moreBtn = document.getElementById('dock-btn-more');

  if (!drawer || !backdrop) return;

  document.removeEventListener('keydown', handleMoreSheetKeydown);

  drawer.classList.remove('active');
  backdrop.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sheet-open');

  if (lastFocusedMoreTrigger && typeof lastFocusedMoreTrigger.focus === 'function') {
    lastFocusedMoreTrigger.focus();
  } else if (moreBtn) {
    moreBtn.focus();
  }
}

function initMobileBottomNav() {
  const moreBtn = document.getElementById('dock-btn-more');
  const closeBtn = document.getElementById('btn-close-more-sheet');
  const backdrop = document.getElementById('more-sheet-backdrop');

  if (moreBtn) {
    moreBtn.addEventListener('click', e => {
      e.preventDefault();
      const drawer = document.getElementById('more-sheet-drawer');
      if (drawer && drawer.classList.contains('active')) {
        closeMoreSheet();
      } else {
        openMoreSheet();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', e => {
      e.preventDefault();
      closeMoreSheet();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', e => {
      e.preventDefault();
      closeMoreSheet();
    });
  }

  // Handle More sheet item selection
  const sheetItems = document.querySelectorAll('.more-sheet-item[data-tab]');
  sheetItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) {
        setActiveTab(tab, true);
        closeMoreSheet();
      }
    });
  });
}

function initNavigationTabs() {
  // Click listener for all tab switch triggers (nav buttons, dock buttons, sheet items, hero CTAs, footer links, brand)
  document.addEventListener('click', e => {
    const trigger = e.target.closest('.nav-tab-btn[data-tab], .dock-item[data-tab], .more-sheet-item[data-tab], .action-switch-tab[data-tab], a[href^="#"]');
    if (!trigger) return;

    let targetTab = trigger.getAttribute('data-tab');
    if (!targetTab && trigger.getAttribute('href')?.startsWith('#')) {
      targetTab = trigger.getAttribute('href').replace(/^#/, '');
    }

    if (targetTab && VALID_TABS.includes(normalizeTabId(targetTab))) {
      e.preventDefault();
      setActiveTab(targetTab, true);
    }
  });

  // Popstate / Hashchange listener for Browser Back & Forward
  window.addEventListener('popstate', () => {
    setActiveTab(window.location.hash, false);
  });

  window.addEventListener('hashchange', () => {
    setActiveTab(window.location.hash, false);
  });

  // Initial tab activation from initial URL hash or fallback to home
  const initialHash = window.location.hash;
  setActiveTab(initialHash, false);
}

function initExternalLinks() {
  document.querySelectorAll('[data-external-url]').forEach(element => {
    element.addEventListener('click', () => {
      const url = element.dataset.externalUrl;
      if (url) window.location.assign(url);
    });
  });
}

// ═══════════════════════════════════════════════════════
// HOME 10-SLIDE PRODUCT SHOWCASE CAROUSEL
// ═══════════════════════════════════════════════════════
function preloadSlideImage(index) {
  if (index < 0 || index >= CAROUSEL_SLIDES.length) return;
  const slide = CAROUSEL_SLIDES[index];
  if (!preloadedImages.has(slide.image)) {
    const img = new Image();
    img.src = slide.image;
    preloadedImages.add(slide.image);
  }
}

function renderCarouselDots() {
  const dotsContainer = document.getElementById('carousel-dots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = CAROUSEL_SLIDES.map((slide, idx) => `
    <button class="carousel-dot ${idx === currentSlideIndex ? 'active' : ''}" data-slide-index="${idx}" type="button" role="tab" aria-selected="${idx === currentSlideIndex}" ${idx === currentSlideIndex ? 'aria-current="true"' : ''} aria-label="Slide ${idx + 1}: ${slide.name}">
      <span class="dot-inner"></span>
    </button>
  `).join('');
}

function updateCarouselSlide(newIndex, crossfade = true) {
  if (newIndex < 0 || newIndex >= CAROUSEL_SLIDES.length) return;
  currentSlideIndex = newIndex;
  const slide = CAROUSEL_SLIDES[currentSlideIndex];

  const carouselImg = document.getElementById('carousel-img');
  const toolBadge = document.getElementById('carousel-tool-badge');
  const toolTitle = document.getElementById('carousel-tool-title');
  const toolDesc = document.getElementById('carousel-tool-desc');
  const counter = document.getElementById('carousel-counter');
  const lightboxTrigger = document.getElementById('btn-open-lightbox');
  const dots = document.querySelectorAll('#carousel-dots .carousel-dot');

  // Lightbox elements
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxCounter = document.getElementById('lightbox-counter');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Crossfade Image Update
  if (carouselImg) {
    if (crossfade && !prefersReducedMotion) {
      carouselImg.classList.add('crossfading');
      setTimeout(() => {
        carouselImg.src = slide.image;
        carouselImg.alt = slide.alt;
        carouselImg.classList.remove('crossfading');
      }, 100);
    } else {
      carouselImg.src = slide.image;
      carouselImg.alt = slide.alt;
    }
  }

  // 2. Update Carousel Metadata
  if (toolBadge) toolBadge.textContent = (currentSlideIndex + 1).toString().padStart(2, '0');
  if (toolTitle) toolTitle.textContent = slide.name;
  if (toolDesc) toolDesc.textContent = slide.description;
  if (counter) counter.textContent = `${currentSlideIndex + 1} / ${CAROUSEL_SLIDES.length}`;
  if (lightboxTrigger) lightboxTrigger.setAttribute('aria-label', `Open full-size screenshot preview of ${slide.name}`);

  // 3. Update Dots
  dots.forEach((dot, idx) => {
    const isActive = idx === currentSlideIndex;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) {
      dot.setAttribute('aria-current', 'true');
    } else {
      dot.removeAttribute('aria-current');
    }
  });

  // 4. Update Lightbox if currently open
  if (lightboxImg) {
    if (crossfade && !prefersReducedMotion) {
      lightboxImg.classList.add('crossfading');
      setTimeout(() => {
        lightboxImg.src = slide.image;
        lightboxImg.alt = slide.alt;
        lightboxImg.classList.remove('crossfading');
      }, 100);
    } else {
      lightboxImg.src = slide.image;
      lightboxImg.alt = slide.alt;
    }
  }
  if (lightboxTitle) lightboxTitle.textContent = `Toolio Automation — ${slide.name}`;
  if (lightboxCounter) lightboxCounter.textContent = `${currentSlideIndex + 1} / ${CAROUSEL_SLIDES.length}`;

  // 5. Preload next adjacent slide image
  const nextAdjacent = (currentSlideIndex + 1) % CAROUSEL_SLIDES.length;
  preloadSlideImage(nextAdjacent);
}

function nextCarouselSlide() {
  const nextIdx = (currentSlideIndex + 1) % CAROUSEL_SLIDES.length;
  updateCarouselSlide(nextIdx, true);
}

function prevCarouselSlide() {
  const prevIdx = (currentSlideIndex - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length;
  updateCarouselSlide(prevIdx, true);
}

function initHomeCarousel() {
  // Generate dots dynamically from CAROUSEL_SLIDES array
  renderCarouselDots();

  // Mark 1st image preloaded & preload 2nd image eagerly
  preloadSlideImage(0);
  preloadSlideImage(1);

  // Control Buttons (Caption Bar & Floating Frame Arrows)
  document.getElementById('carousel-btn-prev')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    prevCarouselSlide();
  });
  document.getElementById('carousel-btn-next')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    nextCarouselSlide();
  });
  document.getElementById('carousel-arrow-prev-frame')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    prevCarouselSlide();
  });
  document.getElementById('carousel-arrow-next-frame')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    nextCarouselSlide();
  });

  // Dots navigation delegation
  const dotsContainer = document.getElementById('carousel-dots');
  dotsContainer?.addEventListener('click', e => {
    const dot = e.target.closest('.carousel-dot');
    if (!dot) return;
    e.preventDefault();
    e.stopPropagation();
    const slideIdx = parseInt(dot.getAttribute('data-slide-index'), 10);
    if (!isNaN(slideIdx)) {
      updateCarouselSlide(slideIdx, true);
    }
  });

  // Keyboard navigation (Left / Right arrow keys)
  document.addEventListener('keydown', e => {
    const lightboxModal = document.getElementById('screenshot-lightbox-modal');
    const isLightboxOpen = lightboxModal && !lightboxModal.classList.contains('hidden');
    const homeView = document.getElementById('view-home');
    const isHomeActive = homeView && homeView.classList.contains('active');

    if (isLightboxOpen || isHomeActive) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCarouselSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCarouselSlide();
      }
    }
  });

  // Touch Swipe Support on Showcase Container
  const showcaseContainer = document.getElementById('btn-open-lightbox');
  setupTouchSwipe(showcaseContainer, () => nextCarouselSlide(), () => prevCarouselSlide());
}

function setupTouchSwipe(element, onSwipeLeft, onSwipeRight) {
  if (!element) return;
  let startX = 0;
  let startY = 0;
  let isSwiping = false;

  element.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  element.addEventListener('touchend', e => {
    if (!isSwiping || e.changedTouches.length !== 1) return;
    isSwiping = false;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Must be predominantly horizontal with a 40px threshold
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════
// FULLSCREEN IMMERSIVE SCREENSHOT VIEWER & PAN / ZOOM
// ═══════════════════════════════════════════════════════
function initScreenshotLightbox() {
  const modal = document.getElementById('screenshot-lightbox-modal');
  const openTrigger = document.getElementById('btn-open-lightbox');
  const closeBtn = document.getElementById('btn-close-lightbox');
  const lightboxPrevBtn = document.getElementById('lightbox-btn-prev');
  const lightboxNextBtn = document.getElementById('lightbox-btn-next');
  const carouselImg = document.getElementById('carousel-img');

  const canvas = document.getElementById('viewer-canvas');
  const transformWrapper = document.getElementById('viewer-transform-wrapper');
  const zoomLevelDisplay = document.getElementById('viewer-zoom-level');
  const zoomInBtn = document.getElementById('btn-zoom-in');
  const zoomOutBtn = document.getElementById('btn-zoom-out');
  const zoomResetBtn = document.getElementById('btn-zoom-reset');

  if (!modal) return;

  // Zoom & Pan State
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.35;

  function updateTransform(smooth = false) {
    if (!transformWrapper) return;
    if (smooth) {
      transformWrapper.style.transition = 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      transformWrapper.style.transition = 'none';
    }

    if (zoom <= 1) {
      panX = 0;
      panY = 0;
    }

    transformWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;

    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${Math.round(zoom * 100)}%`;
    }

    if (canvas) {
      canvas.classList.toggle('is-zoomed', zoom > 1);
    }
  }

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateTransform(true);
  }

  function setZoom(newZoom, centerX = null, centerY = null) {
    const prevZoom = zoom;
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(newZoom * 100) / 100));

    if (clampedZoom === prevZoom) return;

    if (centerX !== null && centerY !== null && canvas) {
      const rect = canvas.getBoundingClientRect();
      const originX = centerX - rect.left - rect.width / 2;
      const originY = centerY - rect.top - rect.height / 2;

      const scaleChange = clampedZoom / prevZoom;
      panX = originX - (originX - panX) * scaleChange;
      panY = originY - (originY - panY) * scaleChange;
    }

    zoom = clampedZoom;
    if (zoom <= 1) {
      panX = 0;
      panY = 0;
    }
    updateTransform(true);
  }

  function openLightbox() {
    lastFocusedLightboxTrigger = document.activeElement;
    resetZoom();
    updateCarouselSlide(currentSlideIndex, false);
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeBtn?.focus(), 50);
  }

  function closeLightbox() {
    resetZoom();
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    if (lastFocusedLightboxTrigger && typeof lastFocusedLightboxTrigger.focus === 'function') {
      lastFocusedLightboxTrigger.focus();
    }
  }

  // Open triggers
  openTrigger?.addEventListener('click', e => {
    if (e.target.closest('.carousel-frame-arrow')) return;
    openLightbox();
  });

  carouselImg?.addEventListener('click', e => {
    e.stopPropagation();
    openLightbox();
  });

  openTrigger?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('.carousel-frame-arrow')) return;
      e.preventDefault();
      openLightbox();
    }
  });

  // Close triggers
  closeBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    closeLightbox();
  });

  // In-Viewer Prev/Next
  lightboxPrevBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    resetZoom();
    prevCarouselSlide();
  });
  lightboxNextBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    resetZoom();
    nextCarouselSlide();
  });

  // Zoom In / Out / Reset buttons
  zoomInBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(zoom + ZOOM_STEP);
  });

  zoomOutBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(zoom - ZOOM_STEP);
  });

  zoomResetBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    resetZoom();
  });

  // 1. Mouse Wheel Zoom (centered on cursor)
  canvas?.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom(zoom * factor, e.clientX, e.clientY);
  }, { passive: false });

  // 2. Mouse Drag / Pan
  canvas?.addEventListener('mousedown', e => {
    if (e.button !== 0) return; // left click only
    if (e.target.closest('.viewer-hud-top') || e.target.closest('.viewer-nav-btn')) return;

    isDragging = true;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;
    canvas.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;
    updateTransform(false);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      canvas?.classList.remove('is-dragging');
    }
  });

  // 3. Double Click to Toggle Zoom (1x <-> 2.2x)
  canvas?.addEventListener('dblclick', e => {
    if (e.target.closest('.viewer-hud-top') || e.target.closest('.viewer-nav-btn')) return;
    e.preventDefault();
    if (zoom > 1.1) {
      resetZoom();
    } else {
      setZoom(2.2, e.clientX, e.clientY);
    }
  });

  // 4. Click outside to close (only when not zoomed and clicking directly on backdrop)
  canvas?.addEventListener('click', e => {
    if (e.target === canvas && zoom <= 1.05) {
      closeLightbox();
    }
  });

  // 5. Keyboard Navigation & Zoom Controls
  document.addEventListener('keydown', e => {
    if (modal.classList.contains('hidden') || !modal.classList.contains('active')) return;
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      resetZoom();
      prevCarouselSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      resetZoom();
      nextCarouselSlide();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoom(zoom + ZOOM_STEP);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      setZoom(zoom - ZOOM_STEP);
    } else if (e.key === '0') {
      e.preventDefault();
      resetZoom();
    }
  });

  // 6. Touch Pinch & Pan Support
  let initialPinchDistance = null;
  let initialPinchZoom = 1;
  let touchStartX = 0;
  let touchStartY = 0;

  canvas?.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchZoom = zoom;
    } else if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX - panX;
      touchStartY = e.touches[0].clientY - panY;
    }
  }, { passive: true });

  canvas?.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialPinchDistance) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midpointX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midpointY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const scale = currentDistance / initialPinchDistance;
      setZoom(initialPinchZoom * scale, midpointX, midpointY);
    } else if (e.touches.length === 1 && zoom > 1.05) {
      panX = e.touches[0].clientX - touchStartX;
      panY = e.touches[0].clientY - touchStartY;
      updateTransform(false);
    }
  }, { passive: true });

  canvas?.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
    }
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════
// WEBSITE AUTHENTICATION MODAL (Frontend UI Hook)
// ═══════════════════════════════════════════════════════
function initWebsiteAuthModal() {
  const modal = document.getElementById('website-auth-modal');
  const openBtn = document.getElementById('btn-navbar-signin');
  const closeBtn = document.getElementById('btn-close-website-auth');
  const oauthHookBtn = document.getElementById('btn-google-oauth-hook');
  const signOutBtn = document.getElementById('btn-website-signout');
  const signedOutView = document.getElementById('website-auth-signed-out');
  const signedInView = document.getElementById('website-auth-signed-in');

  if (!modal) return;

  function openAuthModal() {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  function closeAuthModal() {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }

  openBtn?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    openAuthModal();
  });

  closeBtn?.addEventListener('click', closeAuthModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeAuthModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeAuthModal();
    }
  });

  oauthHookBtn?.addEventListener('click', () => {
    window.ToolioAuth?.signInWithGoogle().then((result) => {
      if (!result.ok) showToast(result.error);
    });
  });

  signOutBtn?.addEventListener('click', () => {
    window.ToolioAuth?.signOut().then((result) => {
      if (!result.ok) showToast(result.error);
      else closeAuthModal();
    });
  });

  const renderAuth = ({ session }) => {
    const identity = window.ToolioAuth?.getIdentity(session);
    signedOutView.hidden = Boolean(identity);
    signedInView.hidden = !identity;

    const label = document.getElementById('navbar-auth-label');
    const googleIcon = document.getElementById('navbar-google-icon');
    const navAvatar = document.getElementById('navbar-account-avatar');
    if (label) label.textContent = identity?.name || 'Sign in';
    if (googleIcon) googleIcon.hidden = Boolean(identity?.avatarUrl);
    if (navAvatar) {
      navAvatar.hidden = !identity?.avatarUrl;
      navAvatar.src = identity?.avatarUrl || '';
    }
    openBtn?.setAttribute('aria-label', identity ? `Account: ${identity.name}` : 'Sign in');

    if (!identity) return;
    document.getElementById('website-account-name').textContent = identity.name;
    document.getElementById('website-account-email').textContent = identity.email;
    document.getElementById('website-account-initial').textContent = identity.initial;
    const avatar = document.getElementById('website-account-avatar');
    const initial = document.getElementById('website-account-initial');
    avatar.src = identity.avatarUrl || '';
    avatar.style.display = identity.avatarUrl ? 'block' : 'none';
    initial.style.display = identity.avatarUrl ? 'none' : 'grid';
  };

  let unsubscribe = null;
  const bindAuth = () => {
    if (!window.ToolioAuth || unsubscribe) return;
    unsubscribe = window.ToolioAuth.subscribe(renderAuth);
  };
  bindAuth();
  window.addEventListener('toolio-auth-ready', bindAuth, { once: true });
}

// ═══════════════════════════════════════════════════════
// COMMERCE PUBLIC OFFER API
// ═══════════════════════════════════════════════════════
async function initCommercePrice() {
  try {
    const response = await fetch('https://bhbvzkogznvejhfrveqb.supabase.co/rest/v1/rpc/get_public_commerce_config', {
      method: 'POST',
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnZ6a29nem52ZWpoZnJ2ZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzc3NjQsImV4cCI6MjA5ODg1Mzc2NH0.uj8yYrD-50kkb3lfmSQHs5KSL2rOMLGX92s7xePq9wE',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnZ6a29nem52ZWpoZnJ2ZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzc3NjQsImV4cCI6MjA5ODg1Mzc2NH0.uj8yYrD-50kkb3lfmSQHs5KSL2rOMLGX92s7xePq9wE',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const config = await response.json();
    if (!response.ok || !config?.offer) return;
    const cents = Number(config.offer.price_usd_cents);
    const days = Number(config.offer.duration_days);
    const priceUsdEl = document.getElementById('website-price-usd');
    const priceDurationEl = document.getElementById('website-price-duration');
    const priceLocalEl = document.getElementById('website-price-local');
    const rateUpdatedEl = document.getElementById('website-rate-updated');

    if (priceUsdEl) priceUsdEl.textContent = `$${(cents / 100).toFixed(2)}`;
    if (priceDurationEl) priceDurationEl.textContent = `for ${days} days`;
    const locale = (navigator.language || '').toUpperCase();
    const region = locale.split('-').at(-1);
    const currencyByRegion = { PK:'PKR', SA:'SAR', AE:'AED', IN:'INR', GB:'GBP' };
    const euroRegions = new Set(['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK']);
    const code = currencyByRegion[region] || (euroRegions.has(region) ? 'EUR' : null);
    const rate = code ? config.rates?.find(item => item.currency_code === code) : null;
    if (rate && priceLocalEl) {
      priceLocalEl.textContent = `≈ ${new Intl.NumberFormat(undefined, { maximumFractionDigits:2 }).format(cents / 100 * Number(rate.units_per_usd))} ${rate.currency_code}`;
      if (rateUpdatedEl) rateUpdatedEl.textContent = rate.updated_at ? `Rate updated ${new Date(rate.updated_at).toLocaleDateString()}` : '';
    }
  } catch { /* The visible $2.50 / 30-day fallback remains usable offline. */ }
}

// ═══════════════════════════════════════════════════════
// BUTTON RIPPLE (Subtle Interaction)
// ═══════════════════════════════════════════════════════
function initButtonRipplePhysics() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('button:not([disabled]), a.btn-primary-glow, a.btn-secondary-glass');
    if (!btn) return;

    const rect   = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size   = Math.max(rect.width, rect.height) * 2.5;

    ripple.className      = 'ripple-fx';
    ripple.style.width    = ripple.style.height = `${size}px`;
    ripple.style.left     = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top      = `${e.clientY - rect.top  - size / 2}px`;

    const pos = getComputedStyle(btn).position;
    if (pos === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);

    setTimeout(() => ripple.remove(), 450);
  });
}

// ═══════════════════════════════════════════════════════
// CHANGELOG SWITCHER
// ═══════════════════════════════════════════════════════
function initChangelogSwitcher() {
  const btns  = document.querySelectorAll('.version-nav-btn');
  const panes = document.querySelectorAll('.changelog-detail-pane');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const ver = btn.getAttribute('data-version');
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panes.forEach(p => {
        const isMatch = p.id === `changelog-${ver}`;
        p.classList.toggle('active', isMatch);
        p.style.display = isMatch ? 'flex' : 'none';
      });
    });
  });
}

// ═══════════════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════
function showToast(message) {
  let toast = document.querySelector('.toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  toast.classList.add('show');
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => toast.classList.remove('show'), 3200);
}
