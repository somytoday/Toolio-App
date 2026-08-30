/**
 * Toolio Store - Core Application Logic
 * Brand: Toolio Automation | Store: Toolio Store
 * Pure Frontend UI Prototype (Honest state previews, dynamic calculations, XSS safe).
 */

// Runtime Application State
const STATE = {
  currentCurrency: detectUserCurrency(),
  currentTheme: 'dark',
  walletBalance: 0.00,
  cart: [],
  selectedPlans: {},
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  appliedPromo: null,
  activeCheckout: null,
  checkoutPaymentMethod: 'binance_pay',
  selectedUsdtNetwork: 'bep20',
  currentReceiptBase64: null,
  lastActiveElement: null,
  authSession: null
};

const PENDING_PURCHASE_KEY = 'toolio-store-pending-purchase';
const PENDING_PURCHASE_MAX_AGE_MS = 30 * 60 * 1000;

// HTML Escaping Utility for XSS Prevention
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Central Authentication Guard
function requireAuthentication(intent = null) {
  if (STATE.authSession) return true;
  if (intent) savePendingPurchaseIntent(intent);
  openSignInModal('Sign in with Google to continue with this purchase.');
  return false;
}

function savePendingPurchaseIntent(intent) {
  try {
    sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({ version: 1, createdAt: Date.now(), ...intent }));
  } catch { /* A blocked sessionStorage only means the user must click Buy again after sign-in. */ }
}

function validatePurchaseItem(item) {
  if (!item || typeof item.productId !== 'string') return null;
  if (item.productId === TOOLIO_HERO_PRODUCT.id) {
    if (TOOLIO_HERO_PRODUCT.status !== 'available') return null;
    return {
      productId: TOOLIO_HERO_PRODUCT.id,
      productName: TOOLIO_HERO_PRODUCT.name,
      duration: TOOLIO_HERO_PRODUCT.duration,
      priceUSD: TOOLIO_HERO_PRODUCT.priceUSD,
      quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)),
    };
  }

  const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
  if (!product || product.status !== 'available') return null;
  const plan = product.plans.find((candidate) => candidate.id === item.planId);
  if (!plan) return null;
  return {
    productId: product.id,
    productName: product.name,
    planId: plan.id,
    duration: plan.duration,
    priceUSD: plan.priceUSD,
    quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)),
  };
}

function consumePendingPurchaseIntent() {
  let value = null;
  try {
    value = JSON.parse(sessionStorage.getItem(PENDING_PURCHASE_KEY) || 'null');
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
  } catch {
    try { sessionStorage.removeItem(PENDING_PURCHASE_KEY); } catch {}
    return null;
  }
  if (!value || value.version !== 1 || !Number.isFinite(value.createdAt)
      || Date.now() - value.createdAt > PENDING_PURCHASE_MAX_AGE_MS
      || value.createdAt > Date.now() + 60000) return null;

  if (value.type === 'product') {
    const item = validatePurchaseItem(value);
    return item ? { type: 'product', items: [item] } : null;
  }
  if (value.type === 'cart' && Array.isArray(value.items) && value.items.length > 0 && value.items.length <= 20) {
    const items = value.items.map(validatePurchaseItem);
    return items.every(Boolean) ? { type: 'cart', items } : null;
  }
  return null;
}

function openCheckoutForIntent(intent) {
  if (!intent?.items?.length) return;
  const totalUSD = intent.items.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);
  STATE.activeCheckout = {
    type: intent.type,
    orderNumber: null,
    productId: intent.type === 'product' ? intent.items[0].productId : null,
    items: intent.items,
    itemsSummary: intent.items.map((item) => `${item.productName} — ${item.duration}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`).join(', '),
    totalUSD,
  };
  closeCartDrawer();
  openCheckoutModal();
}

function renderStoreAuth(session) {
  STATE.authSession = session || null;
  const identity = window.ToolioAuth?.getIdentity(session);
  document.querySelectorAll('.btn-signin-nav').forEach((button) => {
    const label = button.querySelector('.nav-btn-text-hide-mobile');
    if (label) label.textContent = identity?.name || 'Sign In';
    button.title = identity ? `Account: ${identity.name}` : 'Sign In';
    button.setAttribute('aria-label', identity ? `Account: ${identity.name}` : 'Account Sign In');
  });
}

function initStoreAuth() {
  let unsubscribe = null;
  const bind = () => {
    if (!window.ToolioAuth || unsubscribe) return;
    unsubscribe = window.ToolioAuth.subscribe(({ event, session }) => {
      renderStoreAuth(session);
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const pending = consumePendingPurchaseIntent();
        if (pending) setTimeout(() => openCheckoutForIntent(pending), 0);
      }
    });
  };
  bind();
  window.addEventListener('toolio-auth-ready', bind, { once: true });
}

async function startGoogleSignIn() {
  if (!window.ToolioAuth) return showToast('Sign-in is still loading. Please try again.');
  const result = await window.ToolioAuth.signInWithGoogle();
  if (!result.ok) showToast(result.error);
}

async function signOutStore() {
  const result = await window.ToolioAuth?.signOut();
  if (!result?.ok) return showToast(result?.error || 'Sign out failed. Please try again.');
  closeCheckoutModal();
  showToast('Signed out.');
}

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  PRODUCTS.forEach(prod => {
    STATE.selectedPlans[prod.id] = prod.plans[0].id;
  });

  initTheme();
  initCurrency();
  initCategories();
  renderHeroToolioCard();
  renderProducts();
  renderReviewsSection();
  updateCartUI();
  updateWalletUI();
  initSearch();
  initFAQS();
  setupAccessibilityAndListeners();
  initStoreAuth();

  // Standalone product.html page controller
  if (window.location.pathname.endsWith('product.html')) {
    initProductPage();
  }
});

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', STATE.currentTheme);
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.innerHTML = STATE.currentTheme === 'dark' ? getIcon('sun') : getIcon('moon');
    themeBtn.setAttribute('aria-label', `Switch to ${STATE.currentTheme === 'dark' ? 'Light' : 'Dark'} Theme`);
  }
}

function toggleTheme() {
  STATE.currentTheme = STATE.currentTheme === 'dark' ? 'light' : 'dark';
  initTheme();
  showToast(`Switched to ${STATE.currentTheme} mode`);
}

function updateAccountModalThemeLabel() {
  const lbl = document.getElementById('modal-theme-mode-label');
  if (lbl) {
    lbl.textContent = `Current: ${STATE.currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`;
  }
}

// Currency Engine & Accurate Display (USDT Base Currency)
function detectUserCurrency() {
  return STORE_CONFIG.defaultCurrency || 'USDT';
}

function detectUserRegionCurrency() {
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();

    if (tz.includes('riyadh') || lang.includes('sa')) return 'SAR';
    if (tz.includes('dubai') || lang.includes('ae')) return 'AED';
    if (tz.includes('karachi') || lang.includes('pk')) return 'PKR';
    if (tz.includes('kolkata') || lang.includes('in')) return 'INR';
    if (tz.includes('london') || lang.includes('gb')) return 'GBP';
    if (tz.includes('berlin') || tz.includes('paris') || tz.includes('madrid')) return 'EUR';
  } catch (e) {}

  return 'USD';
}

function initCurrency() {
  const currencySelects = document.querySelectorAll('#currency-select');
  currencySelects.forEach(select => {
    select.value = STATE.currentCurrency;
    select.addEventListener('change', (e) => {
      STATE.currentCurrency = e.target.value;
      currencySelects.forEach(s => s.value = STATE.currentCurrency);
      renderHeroToolioCard();
      renderProducts();
      updateCartUI();
      updateWalletUI();
      if (window.location.pathname.endsWith('product.html')) {
        initProductPage();
      }
      showToast(`Currency updated to ${STATE.currentCurrency}`);
    });
  });
}

function formatPrice(priceUSD) {
  const curr = STORE_CONFIG.currencies[STATE.currentCurrency] || STORE_CONFIG.currencies.USDT;
  const converted = (priceUSD * curr.rate).toFixed(2);
  if (curr.prefix) {
    return `${curr.symbol}${converted}`;
  }
  return `${converted}${curr.symbol}`;
}

function getLocalEstimateString(priceUSD) {
  if (STATE.currentCurrency === 'USDT') {
    const regionCode = detectUserRegionCurrency();
    if (regionCode !== 'USDT' && regionCode !== 'USD' && STORE_CONFIG.currencies[regionCode]) {
      const regionCurr = STORE_CONFIG.currencies[regionCode];
      const converted = (priceUSD * regionCurr.rate).toFixed(2);
      return `≈ ${converted} ${regionCurr.code}`;
    }
    return `≈ $${priceUSD.toFixed(2)} USD`;
  }
  return `≈ ${priceUSD.toFixed(2)} USDT`;
}

// Render Top-Right Featured Toolio Premium Hero Card
function renderHeroToolioCard() {
  const container = document.getElementById('hero-featured-product-slot');
  if (!container) return;

  const item = TOOLIO_HERO_PRODUCT;
  const displayPrice = formatPrice(item.priceUSD);
  const localEstimate = getLocalEstimateString(item.priceUSD);

  container.innerHTML = `
    <div class="hero-featured-card">
      <div>
        <div class="featured-top-row">
          <div class="featured-logo-wrap">
            <img src="${item.image}" alt="${item.name}" class="featured-logo-img" onerror="this.src='../assets/images/icon.png';" />
            <div>
              <h2 class="featured-product-name">${item.name}</h2>
              <div class="featured-product-type">${item.productType} • ${item.brand}</div>
            </div>
          </div>
          <span class="official-badge-tag">${item.badge}</span>
        </div>

        <ul class="featured-features-list">
          ${item.features.map(f => `
            <li class="featured-feature-item">
              ${getIcon('check')}
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div>
        <div class="featured-price-card">
          <div class="featured-price-block">
            <div class="featured-price-main-usd">${displayPrice}</div>
            <div class="featured-price-local-estimate">${localEstimate}</div>
          </div>
          <div class="featured-duration-pill">${item.duration} Access</div>
        </div>

        <div class="featured-action-btns">
          <button type="button" class="btn-secondary-glass" onclick="openToolioPremiumDetails()">
            ${getIcon('eye')} View Details
          </button>
          <button type="button" class="btn-primary-crypto" style="margin: 0; width: 100%;" onclick="buyToolioPremium()">
            ${getIcon('bolt')} Buy Now
          </button>
        </div>
      </div>
    </div>
  `;
}

function openToolioPremiumDetails() {
  saveLastActiveElement();
  const modal = document.getElementById('quickview-modal');
  const body = document.getElementById('quickview-content');
  if (!modal || !body) return;

  const item = TOOLIO_HERO_PRODUCT;
  const displayPrice = formatPrice(item.priceUSD);
  const localEstimate = getLocalEstimateString(item.priceUSD);

  body.innerHTML = `
    <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
      <div style="width: 100%; max-width: 220px; flex-shrink: 0;">
        <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);" onerror="this.src='../assets/images/icon.png';" />
        <div style="margin-top: 10px;">
          <span class="official-badge-tag" style="display: inline-block;">${item.badge}</span>
        </div>
      </div>

      <div style="flex: 1; min-width: 260px;">
        <div class="brand-tag">${item.brand}</div>
        <h3 style="font-size: 1.3rem; font-weight: 900; color: var(--text-main); margin-bottom: 6px;">${item.name}</h3>
        <p style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
          ${item.description}
        </p>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 14px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">Delivery Format:</div>
          <div style="font-size: 0.8rem; color: var(--text-main);">Official <strong>Activation Code</strong>. Activated directly in Toolio Automation desktop app.</div>
        </div>

        <div class="price-row" style="margin-bottom: 16px;">
          <div>
            <span class="price-amount">${displayPrice}</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 6px;">(${localEstimate})</span>
          </div>
          <span class="badge-tag available">Available</span>
        </div>

        <div class="quickview-disclaimer-box" style="margin-bottom: 16px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.28); border-radius: var(--radius-md); padding: 10px 12px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; color: #fbbf24; font-weight: 700; font-size: 0.78rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>Important Service Notice</span>
          </div>
          <p style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
            Important: Toolio is an automation assistant, not an AI account or credit provider. Your purchase does not include Google accounts, Google Flow or Google AI Studio credits, API credits, or third-party subscriptions. You must use your own eligible accounts and available credits. Toolio helps organize and automate supported workflows; it does not provide the underlying AI generation service.
          </p>
        </div>

        <div class="card-action-btns">
          <button type="button" class="btn-primary-crypto" style="flex: 1;" onclick="closeQuickView(); buyToolioPremium();">
            ${getIcon('bolt')} Buy Now
          </button>
          <button type="button" class="btn-secondary-glass" onclick="closeQuickView(); addToCartToolioPremium();">
            ${getIcon('cart')} Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
}

function buyToolioPremium() {
  initiateInstantCheckout(TOOLIO_HERO_PRODUCT.id);
}

function addToCartToolioPremium() {
  const item = TOOLIO_HERO_PRODUCT;
  const existing = STATE.cart.find(c => c.productId === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    STATE.cart.push({
      id: `cart_${Date.now()}`,
      productId: item.id,
      productName: item.name,
      productImage: item.image,
      brand: item.brand,
      duration: item.duration,
      productType: 'Activation Code',
      priceUSD: item.priceUSD,
      quantity: 1
    });
  }
  updateCartUI();
  showToast(`Added ${item.name} to Cart! 🛒`);
  openCartDrawer();
}

// Categories Navigation
function initCategories() {
  const container = document.getElementById('category-pills');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <button type="button" class="category-pill-btn ${cat.id === STATE.activeCategory ? 'active' : ''}" data-cat="${cat.id}">
      ${getIcon(cat.icon)}
      <span>${cat.name}</span>
      <span class="category-pill-count">${cat.count}</span>
    </button>
  `).join('');

  container.querySelectorAll('.category-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeCategory = btn.getAttribute('data-cat');
      renderProducts();
    });
  });
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById('products-grid');
  const countDisplay = document.getElementById('product-count-display');
  if (!grid) return;

  let filtered = PRODUCTS.filter(p => {
    const matchesCategory = STATE.activeCategory === 'all' || p.categoryId === STATE.activeCategory;
    const matchesSearch = !STATE.searchQuery || 
      p.name.toLowerCase().includes(STATE.searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(STATE.searchQuery.toLowerCase()) ||
      p.features.some(f => f.toLowerCase().includes(STATE.searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (STATE.sortBy === 'price-asc') {
    filtered.sort((a, b) => a.plans[0].priceUSD - b.plans[0].priceUSD);
  } else if (STATE.sortBy === 'price-desc') {
    filtered.sort((a, b) => b.plans[0].priceUSD - a.plans[0].priceUSD);
  } else if (STATE.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (countDisplay) {
    countDisplay.innerHTML = `Showing <strong>${filtered.length}</strong> subscriptions`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="modal-empty-state" style="grid-column: 1/-1;">
        <div class="modal-icon-badge-large">${getIcon('search')}</div>
        <h3 class="modal-empty-title">No subscriptions found</h3>
        <p class="modal-empty-desc">Try searching for ChatGPT, CapCut, Netflix, or Gemini.</p>
        <button type="button" class="btn-secondary-glass" onclick="resetSearch()">View All Subscriptions</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(prod => {
    const selectedPlanId = STATE.selectedPlans[prod.id] || prod.plans[0].id;
    const currentPlan = prod.plans.find(p => p.id === selectedPlanId) || prod.plans[0];
    const hasMultiplePlans = prod.plans.length > 1;
    const isOutOfStock = prod.status === 'out_of_stock';

    return `
      <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" id="card-${prod.id}">
        <div class="card-banner">
          <img src="${prod.image}" alt="${prod.name}" class="card-img" loading="lazy" onerror="this.src='../assets/images/toolio-automation-logo.png';" />
          <div class="card-overlay"></div>
          
          <div class="card-badges">
            <span class="badge-tag highlight">${prod.badge}</span>
            <span class="badge-tag ${isOutOfStock ? 'out-of-stock' : 'available'}">
              ${isOutOfStock ? 'Out of Stock' : 'Available'}
            </span>
          </div>

          <div class="card-quick-actions">
            <button type="button" class="icon-btn-glass" title="View Details" aria-label="View Details for ${prod.name}" onclick="openQuickView('${prod.id}')">
              ${getIcon('eye')}
            </button>
          </div>
        </div>

        <div class="card-content">
          <div class="card-header-info">
            <span class="brand-tag">${prod.brand}</span>
            <div class="rating-stars">
              ${getIcon('star')}
              <span>${prod.rating}</span>
            </div>
          </div>

          <h3 class="product-title">${prod.name}</h3>

          <div style="margin-bottom: 12px;">
            ${hasMultiplePlans ? `
              <div class="duration-tabs" style="grid-template-columns: repeat(${prod.plans.length}, 1fr);">
                ${prod.plans.map(plan => `
                  <button type="button" class="duration-tab-btn ${plan.id === selectedPlanId ? 'active' : ''}" 
                          onclick="changeProductPlan('${prod.id}', '${plan.id}')">
                    ${plan.duration}
                  </button>
                `).join('')}
              </div>
            ` : `
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary); background: rgba(99, 102, 241, 0.08); padding: 5px 10px; border-radius: 6px; display: inline-block;">
                Duration: ${currentPlan.duration}
              </div>
            `}
          </div>

          <ul class="card-feature-list">
            ${prod.features.slice(0, 3).map(f => `
              <li class="card-feature-item">
                ${getIcon('check')}
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>

          <div class="card-footer">
            <div class="price-row">
              <div>
                <span class="price-amount">${formatPrice(currentPlan.priceUSD)}</span>
                <span class="price-original">${formatPrice(currentPlan.originalUSD)}</span>
              </div>
              <span class="savings-tag">Save ${currentPlan.discount}%</span>
            </div>

            <div class="card-action-btns">
              <button type="button" class="btn-instant-crypto" ${isOutOfStock ? 'disabled' : ''} onclick="initiateInstantCheckout('${prod.id}')">
                ${getIcon('bolt')}
                <span>${isOutOfStock ? 'Out of Stock' : 'Buy Now'}</span>
              </button>
              <button type="button" class="btn-add-cart-icon" title="${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}" aria-label="Add ${prod.name} to Cart" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart('${prod.id}')">
                ${getIcon('cart')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function changeProductPlan(productId, planId) {
  STATE.selectedPlans[productId] = planId;
  renderProducts();
}

// Quick View Modal
function openQuickView(productId) {
  saveLastActiveElement();
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickview-modal');
  const body = document.getElementById('quickview-content');
  if (!modal || !body) return;

  const selectedPlanId = STATE.selectedPlans[productId] || product.plans[0].id;
  const currentPlan = product.plans.find(p => p.id === selectedPlanId) || product.plans[0];
  const isOutOfStock = product.status === 'out_of_stock';

  body.innerHTML = `
    <div style="display: flex; gap: 18px; flex-wrap: wrap;">
      <div style="width: 100%; max-width: 220px; flex-shrink: 0;">
        <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);" />
        <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
          <span class="badge-tag highlight">${product.badge}</span>
          <span class="badge-tag ${isOutOfStock ? 'out-of-stock' : 'available'}">${isOutOfStock ? 'Out of Stock' : 'Available'}</span>
        </div>
      </div>

      <div style="flex: 1; min-width: 260px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span class="brand-tag">${product.brand}</span>
          <div class="rating-stars">${getIcon('star')} <span>${product.rating}</span></div>
        </div>

        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; line-height: 1.35;">${product.name}</h3>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 700;">Select Plan:</div>
          <div class="duration-tabs" style="grid-template-columns: repeat(${product.plans.length}, 1fr);">
            ${product.plans.map(plan => `
              <button type="button" class="duration-tab-btn ${plan.id === selectedPlanId ? 'active' : ''}" 
                      onclick="changeProductPlan('${product.id}', '${plan.id}'); openQuickView('${product.id}');">
                ${plan.duration}
              </button>
            `).join('')}
          </div>
        </div>

        <ul class="card-feature-list" style="margin-bottom: 16px; display: flex !important;">
          ${product.features.map(f => `
            <li class="card-feature-item">
              ${getIcon('check')}
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>

        <div class="price-row" style="margin-bottom: 14px;">
          <div>
            <span class="price-amount">${formatPrice(currentPlan.priceUSD)}</span>
            <span class="price-original">${formatPrice(currentPlan.originalUSD)}</span>
          </div>
          <span class="savings-tag">Save ${currentPlan.discount}%</span>
        </div>

        <div class="card-action-btns">
          <button type="button" class="btn-instant-crypto" ${isOutOfStock ? 'disabled' : ''} style="flex: 1;" onclick="closeQuickView(); initiateInstantCheckout('${product.id}');">
            ${getIcon('bolt')} ${isOutOfStock ? 'Out of Stock' : 'Buy Now'}
          </button>
          <button type="button" class="btn-secondary-glass" ${isOutOfStock ? 'disabled' : ''} onclick="closeQuickView(); addToCart('${product.id}');">
            ${getIcon('cart')} Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
}

function closeQuickView() {
  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  restoreLastActiveElement();
}

// Search System
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const clearBtn = document.getElementById('search-clear-btn');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileClearBtn = document.getElementById('mobile-search-clear-btn');

  let debounceTimer;

  const handleSearch = (val) => {
    STATE.searchQuery = val;
    if (searchInput && searchInput.value !== val) searchInput.value = val;
    if (mobileSearchInput && mobileSearchInput.value !== val) mobileSearchInput.value = val;

    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    if (mobileClearBtn) mobileClearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderProducts();
      renderSearchSuggestions(val);
    }, 200);
  };

  if (searchInput) searchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));
  if (mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));
  if (clearBtn) clearBtn.addEventListener('click', () => handleSearch(''));
  if (mobileClearBtn) mobileClearBtn.addEventListener('click', () => handleSearch(''));

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      STATE.sortBy = e.target.value;
      renderProducts();
    });
  }
}

function renderSearchSuggestions(query) {
  const searchDropdown = document.getElementById('search-dropdown');
  if (!searchDropdown) return;

  if (!query || query.length < 2) {
    searchDropdown.style.display = 'none';
    return;
  }

  const matches = PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.brand.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  if (matches.length === 0) {
    searchDropdown.style.display = 'none';
    return;
  }

  searchDropdown.innerHTML = matches.map(p => `
    <div class="search-item" onclick="openQuickView('${p.id}'); hideSearchDropdown();">
      <img src="${p.image}" class="search-item-img" alt="${p.name}" />
      <div class="search-item-info">
        <div class="search-item-title">${p.name}</div>
        <div class="search-item-price">${formatPrice(p.plans[0].priceUSD)}</div>
      </div>
      <span class="badge-tag highlight" style="font-size: 0.65rem;">View</span>
    </div>
  `).join('');

  searchDropdown.style.display = 'block';
}

function hideSearchDropdown() {
  const searchDropdown = document.getElementById('search-dropdown');
  if (searchDropdown) searchDropdown.style.display = 'none';
}

function resetSearch() {
  const searchInput = document.getElementById('search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  if (searchInput) searchInput.value = '';
  if (mobileSearchInput) mobileSearchInput.value = '';
  STATE.searchQuery = '';
  STATE.activeCategory = 'all';
  initCategories();
  renderProducts();
}

// Shopping Cart (In-Memory Prototype)
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product || product.status === 'out_of_stock') return;

  const planId = STATE.selectedPlans[productId] || product.plans[0].id;
  const plan = product.plans.find(p => p.id === planId) || product.plans[0];

  const existingIndex = STATE.cart.findIndex(item => 
    item.productId === productId && item.planId === planId
  );

  if (existingIndex > -1) {
    STATE.cart[existingIndex].quantity += 1;
  } else {
    STATE.cart.push({
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      brand: product.brand,
      planId: plan.id,
      duration: plan.duration,
      priceUSD: plan.priceUSD,
      quantity: 1
    });
  }

  updateCartUI();
  showToast(`Added ${product.name} (${plan.duration}) to Cart! 🛒`);
  openCartDrawer();
}

function removeFromCart(cartItemId) {
  STATE.cart = STATE.cart.filter(item => item.id !== cartItemId);
  updateCartUI();
  showToast('Item removed from cart');
}

function updateCartUI() {
  const cartBadge = document.getElementById('cart-badge-count');
  const mobileDockCartBadge = document.getElementById('mobile-dock-cart-badge');
  const cartList = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const discountEl = document.getElementById('cart-discount');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  const totalItems = STATE.cart.reduce((sum, i) => sum + i.quantity, 0);
  if (cartBadge) {
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
  }
  if (mobileDockCartBadge) {
    mobileDockCartBadge.textContent = totalItems;
    mobileDockCartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
  }

  if (!cartList) return;

  if (STATE.cart.length === 0) {
    cartList.innerHTML = `
      <div class="modal-empty-state">
        <div class="modal-icon-badge-large">${getIcon('cart')}</div>
        <h4 class="modal-empty-title">Your Cart is Empty</h4>
        <p class="modal-empty-desc">Explore the catalog and select Buy Now or Add to Cart.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    if (discountEl) discountEl.textContent = formatPrice(0);
    if (totalEl) totalEl.textContent = formatPrice(0);
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  const rawSubtotal = STATE.cart.reduce((sum, i) => sum + (i.priceUSD * i.quantity), 0);
  let discountUSD = 0;
  if (STATE.appliedPromo) {
    discountUSD = (rawSubtotal * STATE.appliedPromo.discount) / 100;
  }
  const grandTotalUSD = Math.max(0, rawSubtotal - discountUSD);

  cartList.innerHTML = STATE.cart.map(item => {
    const isToolioItem = item.productId === 'toolio-premium' || item.id === 'toolio-premium' || (item.productName && item.productName.toLowerCase().includes('toolio'));
    return `
      <div class="cart-item-card" style="${isToolioItem ? 'flex-direction: column; align-items: stretch; gap: 8px;' : ''}">
        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
          <img src="${item.productImage}" alt="${item.productName}" class="cart-item-img" onerror="this.src='../assets/images/icon.png';" />
          <div class="cart-item-details" style="flex: 1;">
            <div class="cart-item-title">${item.productName}</div>
            <div class="cart-item-plan">${item.duration}</div>
            <div class="cart-item-price">${formatPrice(item.priceUSD)} × ${item.quantity}</div>
          </div>
          <button type="button" class="cart-item-remove" title="Remove" aria-label="Remove ${item.productName}" onclick="removeFromCart('${item.id}')">
            ${getIcon('trash')}
          </button>
        </div>
        ${isToolioItem ? `
          <div class="cart-item-disclaimer-notice" style="display: flex; align-items: flex-start; gap: 6px; padding: 6px 8px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.22); border-radius: 4px; font-size: 0.72rem; color: var(--text-secondary); line-height: 1.35;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" style="flex-shrink:0; margin-top: 1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Toolio does not include Google accounts, AI credits, API credits, or third-party subscriptions. Your own eligible accounts and credits are required.</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = formatPrice(rawSubtotal);
  if (discountEl) discountEl.textContent = `-${formatPrice(discountUSD)}`;
  if (totalEl) totalEl.textContent = formatPrice(grandTotalUSD);
}

function openCartDrawer() {
  saveLastActiveElement();
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
  restoreLastActiveElement();
}

// Checkout Initiation (Guarded by requireAuthentication)
function initiateInstantCheckout(productId) {
  const source = productId === TOOLIO_HERO_PRODUCT.id
    ? { productId, type: 'product' }
    : {
        productId,
        planId: STATE.selectedPlans[productId] || PRODUCTS.find((product) => product.id === productId)?.plans?.[0]?.id,
        type: 'product',
      };
  const item = validatePurchaseItem(source);
  if (!item) return showToast('This product or plan is not currently available.');
  if (!requireAuthentication(source)) return;
  openCheckoutForIntent({ type: 'product', items: [item] });
}

function checkoutFromCart() {
  if (STATE.cart.length === 0) return;
  const intent = {
    type: 'cart',
    items: STATE.cart.map((item) => ({
      productId: item.productId,
      planId: item.planId || null,
      quantity: item.quantity,
    })),
  };
  const items = intent.items.map(validatePurchaseItem);
  if (!items.every(Boolean)) return showToast('One or more cart items are no longer available.');
  closeCartDrawer();
  if (!requireAuthentication(intent)) return;
  openCheckoutForIntent({ type: 'cart', items });
}

// Sign In UI Modal (UI Prototype Only)
function openSignInModal(message = null) {
  if (STATE.authSession) return openAccountModal();
  saveLastActiveElement();
  const modal = document.getElementById('crypto-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="signin-modal-title" style="max-width: 440px;">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="signin-modal-title">
          <span>Sign In to Toolio Store</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body">
        <div class="modal-empty-state" style="padding: 10px 0 16px;">
          <div class="modal-icon-badge-large">
            ${getIcon('shield')}
          </div>
          <h3 class="modal-empty-title">Sign In to Toolio Store</h3>
          <p class="modal-empty-desc">
            ${message || "Sign in with your Google account to manage subscriptions, orders, and Toolio Premium activation codes."}
          </p>
        </div>

        <button type="button" class="btn-google-signin" onclick="startGoogleSignIn()">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div style="background: rgba(99, 102, 241, 0.08); padding: 10px; border-radius: var(--radius-sm); border: 1px solid rgba(99, 102, 241, 0.25); margin-top: 16px; font-size: 0.76rem; color: var(--text-secondary); text-align: center;">
          The same Google account is used across the Toolio website, store, and desktop app.
        </div>
      </div>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
}

// My Orders / Keys Modal (Mobile & Footer Action)
function openMyOrdersModal() {
  if (!STATE.authSession) return openSignInModal('Sign in with Google to view your real orders and activation codes.');
  saveLastActiveElement();
  const modal = document.getElementById('crypto-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="orders-modal-title" style="max-width: 440px;">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="orders-modal-title">
          <span>My Orders & Activation Keys</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body">
        <div class="modal-empty-state" style="padding: 10px 0 20px;">
          <div class="modal-icon-badge-large" style="color: var(--color-primary); background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.3);">
            ${getIcon('shield')}
          </div>
          <h3 class="modal-empty-title">Orders & Keys</h3>
          <p class="modal-empty-desc">
            You do not have any store orders or activation codes yet.
          </p>
        </div>

        <button type="button" class="btn-secondary-glass" style="width: 100%;" onclick="closeCheckoutModal()">
          Return to Store
        </button>
      </div>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
}

// Account & Preferences Modal (Mobile Bottom Dock & Footer Action)
function openAccountModal() {
  saveLastActiveElement();
  const modal = document.getElementById('crypto-modal');
  if (!modal) return;
  if (!STATE.authSession) return openSignInModal();
  const identity = window.ToolioAuth?.getIdentity(STATE.authSession);
  if (!identity) return openSignInModal();

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" style="max-width: 440px;">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="account-modal-title">
          <span>Account & Preferences</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body">
        <div class="modal-empty-state" style="padding: 10px 0 16px;">
          ${identity.avatarUrl
            ? `<img src="${escapeHTML(identity.avatarUrl)}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:10px;">`
            : `<div class="modal-icon-badge-large">${escapeHTML(identity.initial)}</div>`}
          <h3 class="modal-empty-title">${escapeHTML(identity.name)}</h3>
          <p class="modal-empty-desc">${escapeHTML(identity.email)}</p>
        </div>

        <button type="button" class="btn-secondary-glass" style="width:100%;" onclick="signOutStore()">Sign out</button>

        <!-- Mobile Theme Switcher Row Inside Account Modal -->
        <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Theme Mode</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);" id="modal-theme-mode-label">Current: ${STATE.currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
          </div>
          <button type="button" class="btn-secondary-glass" style="padding: 6px 12px; min-height: 36px; font-size: 0.78rem;" onclick="toggleTheme(); updateAccountModalThemeLabel();">
            Toggle Theme
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
}

function activateDockTab(tabName) {
  document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
  const activeEl = document.getElementById(`dock-item-${tabName}`);
  if (activeEl) activeEl.classList.add('active');
}

// Unified Checkout Modal (Prepared for Server Integration)
function openCheckoutModal() {
  saveLastActiveElement();
  const modal = document.getElementById('crypto-modal');
  if (!modal || !STATE.activeCheckout) return;

  const orderNumber = STATE.activeCheckout.orderNumber;
  const totalAmountUSD = STATE.activeCheckout.totalUSD.toFixed(2);
  const localEstimate = getLocalEstimateString(STATE.activeCheckout.totalUSD);

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="checkout-modal-title">
          <span>Checkout & Secure Payment</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body" id="crypto-modal-body-content">
        
        <!-- Order Summary Card with Read-only Toolio Order Number -->
        <div style="background: rgba(0, 0, 0, 0.4); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 14px; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-main);">${escapeHTML(STATE.activeCheckout.itemsSummary)}</div>
              <div style="font-size: 0.76rem; color: var(--color-primary); font-weight: 600;">Official Toolio Automation Store</div>
            </div>
            ${orderNumber ? `<span class="toolio-order-pill">Toolio Order: #${escapeHTML(orderNumber)}</span>` : ''}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
            <span style="font-size: 0.76rem; color: var(--text-muted);">Total Price:</span>
            <div style="text-align: right;">
              <span style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 900; color: var(--color-binance);">${totalAmountUSD} USDT</span>
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-left: 6px;">(${localEstimate})</span>
            </div>
          </div>
        </div>

        ${orderNumber ? `
        <div style="margin-bottom: 14px; width: 100%;">
          <label style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 6px;">
            Select Payment Method (4 Supported Gateways):
          </label>
          <div class="duration-tabs" style="grid-template-columns: repeat(4, 1fr); gap: 6px;">
            <button type="button" class="duration-tab-btn active" id="btn-pay-bpay" onclick="selectCheckoutMethod('binance_pay')">
              Binance Pay
            </button>
            <button type="button" class="duration-tab-btn" id="btn-pay-usdt" onclick="selectCheckoutMethod('usdt')">
              USDT
            </button>
            <button type="button" class="duration-tab-btn" id="btn-pay-easypaisa" onclick="selectCheckoutMethod('easypaisa')">
              EasyPaisa
            </button>
            <button type="button" class="duration-tab-btn" id="btn-pay-jazzcash" onclick="selectCheckoutMethod('jazzcash')">
              JazzCash
            </button>
          </div>
        </div>

        <!-- Dynamic Content Area -->
        <div id="checkout-method-content" style="width: 100%;"></div>
        ` : `
        <div style="padding:14px;border:1px solid rgba(99,102,241,.3);border-radius:var(--radius-md);background:rgba(99,102,241,.08);color:var(--text-secondary);font-size:.8rem;line-height:1.55;text-align:center;">
          Your account and selection are ready. A real Toolio order number and payment instructions will appear here only after the server creates the order.
        </div>
        `}

      </div>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
  if (orderNumber) selectCheckoutMethod('binance_pay');
}

function handleReceiptFileChange(input) {
  const errorEl = document.getElementById('receipt-error-msg');
  if (errorEl) errorEl.style.display = 'none';

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      STATE.currentReceiptBase64 = e.target.result;
      const preview = document.getElementById('receipt-preview-container');
      if (preview) {
        preview.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; margin-top: 8px;">
            <img src="${e.target.result}" alt="Receipt Preview" style="max-height: 90px; border-radius: 6px; border: 1px solid var(--border-subtle);" />
            <span style="font-size: 0.72rem; color: var(--color-success); font-weight: 700; margin-top: 4px;">✓ Receipt Screenshot Attached</span>
          </div>
        `;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// Toolio Service Disclaimer Validation in Checkout
function isCurrentCheckoutToolio() {
  if (!STATE.activeCheckout) return false;
  if (STATE.activeCheckout.productId === 'toolio-premium') return true;
  if (STATE.activeCheckout.items && STATE.activeCheckout.items.some(i => i.productId === 'toolio-premium' || (i.productName && i.productName.toLowerCase().includes('toolio')))) return true;
  if (STATE.activeCheckout.itemsSummary && STATE.activeCheckout.itemsSummary.toLowerCase().includes('toolio')) return true;
  return false;
}

function renderToolioCheckoutDisclaimerHTML() {
  if (!isCurrentCheckoutToolio()) return '';
  return `
    <div class="checkout-disclaimer-box" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.28); border-radius: var(--radius-md); padding: 10px 12px; margin: 12px 0;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; color: #fbbf24; font-weight: 700; font-size: 0.78rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span>Important Product Disclaimer</span>
      </div>
      <p style="font-size: 0.73rem; color: var(--text-secondary); line-height: 1.45; margin: 0 0 8px 0;">
        Important: Toolio is an automation assistant, not an AI account or credit provider. Your purchase does not include Google accounts, Google Flow or Google AI Studio credits, API credits, or third-party subscriptions. You must use your own eligible accounts and available credits. Toolio helps organize and automate supported workflows; it does not provide the underlying AI generation service.
      </p>
      <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.74rem; color: var(--text-main); cursor: pointer; line-height: 1.4; border-top: 1px solid rgba(245, 158, 11, 0.2); padding-top: 8px;">
        <input type="checkbox" id="toolio-disclaimer-checkbox" style="margin-top: 2px; accent-color: #f59e0b; width: 15px; height: 15px; flex-shrink: 0;" onchange="handleDisclaimerCheckboxChange(this)" />
        <span>I understand that Toolio does not include Google accounts, AI credits, API credits, or third-party subscriptions, and that I must use my own eligible accounts and available credits.</span>
      </label>
      <div id="toolio-disclaimer-error" class="field-error-msg" style="display: none; margin-top: 6px; font-size: 0.72rem; color: #ef4444; font-weight: 600;">
        ⚠️ You must acknowledge and accept this disclaimer to continue with your Toolio purchase.
      </div>
    </div>
  `;
}

function handleDisclaimerCheckboxChange(checkbox) {
  const errorEl = document.getElementById('toolio-disclaimer-error');
  if (errorEl && checkbox.checked) {
    errorEl.style.display = 'none';
  }
}

function validateToolioDisclaimer() {
  if (!isCurrentCheckoutToolio()) return true;
  const checkbox = document.getElementById('toolio-disclaimer-checkbox');
  const errorEl = document.getElementById('toolio-disclaimer-error');
  if (checkbox && !checkbox.checked) {
    if (errorEl) errorEl.style.display = 'block';
    checkbox.focus();
    return false;
  }
  return true;
}

function selectCheckoutMethod(method) {
  STATE.checkoutPaymentMethod = method;
  STATE.currentReceiptBase64 = null;
  const contentArea = document.getElementById('checkout-method-content');
  if (!contentArea || !STATE.activeCheckout) return;

  const orderNumber = STATE.activeCheckout.orderNumber;
  const totalAmountUSD = STATE.activeCheckout.totalUSD.toFixed(2);
  const localEstimate = getLocalEstimateString(STATE.activeCheckout.totalUSD);

  document.querySelectorAll('.duration-tab-btn').forEach(b => b.classList.remove('active'));
  const btnMap = {
    binance_pay: 'btn-pay-bpay',
    usdt: 'btn-pay-usdt',
    easypaisa: 'btn-pay-easypaisa',
    jazzcash: 'btn-pay-jazzcash'
  };
  const activeBtn = document.getElementById(btnMap[method]);
  if (activeBtn) activeBtn.classList.add('active');

  // ==========================================
  // 1. Binance Pay Flow
  // ==========================================
  if (method === 'binance_pay') {
    const bp = STORE_CONFIG.paymentMethods.binancePay;
    contentArea.innerHTML = `
      <div class="automated-verification-box">
        <div style="display: flex; justify-content: center; width: 100%; align-items: center; margin-bottom: 8px;">
          <span class="toolio-order-pill">Toolio Order: #${escapeHTML(orderNumber)}</span>
        </div>

        <div class="qr-code-display-wrap">
          <img src="${bp.qrImage}" alt="Binance Pay QR Code" class="qr-code-svg-img" style="width: 140px; height: 140px; object-fit: contain;" onerror="this.src='../assets/images/toolio-automation-logo.png';" />
        </div>

        <div style="font-size: 0.84rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">
          Pay <span style="color: var(--color-binance); font-size: 1.05rem;">${totalAmountUSD} USDT</span> <span style="font-size: 0.76rem; color: var(--text-secondary);">(${localEstimate})</span>
        </div>

        <a href="${bp.deepLinkUrl}" target="_blank" rel="noopener noreferrer" class="btn-open-binance-app" style="text-decoration: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L6 8l3 3 3-3 3 3 3-3-6-6zM6 16l6 6 6-6-3-3-3 3-3-3-3 3z"/></svg>
          <span>Open in Binance App</span>
        </a>

        <div style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 6px;">
          ${bp.description}
        </div>
      </div>

      <div class="copy-field-group">
        <label class="copy-field-label">Binance Pay ID:</label>
        <div class="copy-field-box">
          <input type="text" readonly class="copy-field-input" value="${bp.binancePayId}" style="color: var(--color-binance); font-weight: 800;" />
          <button type="button" class="btn-copy-action" onclick="copyToClipboard('${bp.binancePayId}', 'Binance Pay ID Copied!')">
            ${getIcon('copy')} Copy Pay ID
          </button>
        </div>
      </div>

      <!-- Mandatory Binance Pay Order ID -->
      <div class="copy-field-group" style="margin-top: 12px;">
        <label class="copy-field-label">Binance Pay Order ID *:</label>
        <input type="text" class="copy-field-input" placeholder="Paste the Order ID from Binance Payment Details" id="binance-orderid-input" oninput="toggleBinanceVerifyBtn(this)" />
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
          Open Binance → Payment Details → copy the Order ID shown in your receipt.
        </div>
        <div id="binance-error-msg" class="field-error-msg" style="display: none;">Valid Binance Pay Order ID is required</div>
      </div>

      ${renderToolioCheckoutDisclaimerHTML()}

      <button type="button" id="btn-verify-binance" class="btn-primary-crypto" style="width: 100%; margin-top: 14px;" disabled onclick="verifyBinancePayOrder()">
        Verify Payment
      </button>
    `;
  }

  // ==========================================
  // 2. USDT — Select Network (Dynamic Total)
  // ==========================================
  else if (method === 'usdt') {
    const usdtConfig = STORE_CONFIG.paymentMethods.usdt;
    const currentNet = usdtConfig.networks[STATE.selectedUsdtNetwork] || usdtConfig.networks.bep20;

    contentArea.innerHTML = `
      <!-- 3 Supported Networks -->
      <div style="margin-bottom: 12px; width: 100%;">
        <label class="copy-field-label">Select Network (3 Supported Networks):</label>
        <div class="network-tabs-grid">
          <button type="button" class="network-tab-btn ${STATE.selectedUsdtNetwork === 'bep20' ? 'active' : ''}" onclick="changeUsdtNetwork('bep20')">
            BNB Smart Chain (BEP-20)
          </button>
          <button type="button" class="network-tab-btn ${STATE.selectedUsdtNetwork === 'opbnb' ? 'active' : ''}" onclick="changeUsdtNetwork('opbnb')">
            opBNB
          </button>
          <button type="button" class="network-tab-btn ${STATE.selectedUsdtNetwork === 'trc20' ? 'active' : ''}" onclick="changeUsdtNetwork('trc20')">
            TRON (TRC-20)
          </button>
        </div>
      </div>

      <div class="automated-verification-box">
        <div style="display: flex; justify-content: center; width: 100%; align-items: center; margin-bottom: 8px;">
          <span class="toolio-order-pill">Toolio Order: #${escapeHTML(orderNumber)}</span>
        </div>

        <div class="qr-code-display-wrap">
          <img src="${currentNet.qrImage}" alt="USDT QR Code" class="qr-code-svg-img" style="width: 130px; height: 130px; object-fit: contain;" />
        </div>

        <div style="font-size: 0.84rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
          Exact Amount: <span style="color: var(--color-binance); font-size: 1.1rem;">${totalAmountUSD} USDT</span>
        </div>

        <div style="font-size: 0.74rem; color: var(--color-accent-blue); font-weight: 700; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm); padding: 8px; margin-top: 6px; width: 100%;">
          ⚠️ ${currentNet.note}
        </div>
      </div>

      <div class="copy-field-group">
        <label class="copy-field-label">USDT Deposit Address (${currentNet.name}):</label>
        <div class="copy-field-box">
          <input type="text" readonly class="copy-field-input" value="${currentNet.depositAddress}" style="font-size: 0.78rem;" />
          <button type="button" class="btn-copy-action" onclick="copyToClipboard('${currentNet.depositAddress}', 'USDT Deposit Address Copied!')">
            ${getIcon('copy')} Copy Address
          </button>
        </div>
      </div>

      <!-- Mandatory USDT Transaction Hash (TxID) -->
      <div class="copy-field-group" style="margin-top: 12px;">
        <label class="copy-field-label">USDT Transaction Hash (TxID) *:</label>
        <input type="text" class="copy-field-input" placeholder="Paste the transaction hash from your wallet or exchange" id="usdt-txid-input" oninput="toggleUsdtVerifyBtn(this)" />
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
          Open your wallet or exchange withdrawal history and copy the completed transaction hash.
        </div>
        <div id="usdt-error-msg" class="field-error-msg" style="display: none;">Transaction Hash (TxID) is required</div>
      </div>

      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.74rem; color: var(--color-warning); margin: 12px 0;">
        ℹ️ Your wallet or exchange may enforce a minimum withdrawal or network fee. If you cannot send exactly ${totalAmountUSD} USDT, use Binance Pay.
      </div>

      ${renderToolioCheckoutDisclaimerHTML()}

      <button type="button" id="btn-verify-usdt" class="btn-primary-crypto" style="width: 100%;" disabled onclick="verifyUsdtTransaction()">
        Verify Transaction
      </button>
    `;
  }

  // ==========================================
  // 3. EasyPaisa (PKR) Manual Admin Review
  // ==========================================
  else if (method === 'easypaisa') {
    const ep = STORE_CONFIG.paymentMethods.easypaisa;
    const pkrRate = STORE_CONFIG.currencies.PKR.rate;
    const totalPKR = Math.round(parseFloat(totalAmountUSD) * pkrRate).toLocaleString();

    contentArea.innerHTML = `
      <div style="background: rgba(0, 166, 81, 0.08); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(0, 166, 81, 0.3); margin-bottom: 12px; font-size: 0.8rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: #00C25E; font-weight: 800;">EASYPAISA MOBILE ACCOUNT</span>
          <span class="toolio-order-pill">Toolio Order: #${escapeHTML(orderNumber)}</span>
        </div>
        <div style="color: var(--text-secondary);">${ep.verificationNote}</div>
      </div>

      <div class="copy-field-group">
        <label class="copy-field-label">EasyPaisa Account Number (Tahir Hameed):</label>
        <div class="copy-field-box">
          <input type="text" readonly class="copy-field-input" value="${ep.accountNumber}" style="color: #00C25E; font-weight: 800;" />
          <button type="button" class="btn-copy-action" onclick="copyToClipboard('${ep.accountNumber}', 'EasyPaisa Number Copied!')">
            ${getIcon('copy')} Copy
          </button>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin: 12px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div>
            <label class="copy-field-label">Sender Name *:</label>
            <input type="text" id="manual-sender-name" placeholder="Your Name" class="copy-field-input" />
            <div id="name-error-msg" class="field-error-msg" style="display: none;">Name is required</div>
          </div>
          <div>
            <label class="copy-field-label">Sender Phone Number *:</label>
            <input type="text" id="manual-sender-phone" placeholder="0345-XXXXXXX" class="copy-field-input" />
            <div id="phone-error-msg" class="field-error-msg" style="display: none;">Phone is required</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div>
            <label class="copy-field-label">Transaction ID / TID *:</label>
            <input type="text" id="manual-sender-tid" placeholder="TID from SMS/App..." class="copy-field-input" />
            <div id="tid-error-msg" class="field-error-msg" style="display: none;">TID is required</div>
          </div>
          <div>
            <label class="copy-field-label">Payment Date *:</label>
            <input type="date" id="manual-payment-date" class="copy-field-input" value="${new Date().toISOString().split('T')[0]}" />
          </div>
        </div>

        <label class="copy-field-label">Attach Transfer Receipt / Screenshot *:</label>
        <div class="receipt-upload-box" style="padding: 12px; border: 2px dashed var(--border-light); border-radius: var(--radius-sm); text-align: center; cursor: pointer;" onclick="document.getElementById('receipt-file-input').click()">
          <input type="file" id="receipt-file-input" accept="image/*" style="display: none;" onchange="handleReceiptFileChange(this)" />
          <div style="color: var(--color-primary); margin-bottom: 4px;">${getIcon('download')}</div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">Click to Upload Transfer Receipt</div>
          <div id="receipt-preview-container"></div>
        </div>
        <div id="receipt-error-msg" class="field-error-msg" style="display: none; margin-top: 6px;">
          Receipt screenshot is required! Please attach transfer proof.
        </div>
      </div>

      ${renderToolioCheckoutDisclaimerHTML()}

      <button type="button" class="btn-primary-crypto" style="width: 100%; background: linear-gradient(135deg, #00A651, #007A3D);" onclick="submitManualPayment('${orderNumber}', 'EasyPaisa', '${totalPKR}')">
        Submit for Manual Review
      </button>
    `;
  }

  // ==========================================
  // 4. JazzCash (PKR) Manual Admin Review
  // ==========================================
  else if (method === 'jazzcash') {
    const jc = STORE_CONFIG.paymentMethods.jazzcash;
    const pkrRate = STORE_CONFIG.currencies.PKR.rate;
    const totalPKR = Math.round(parseFloat(totalAmountUSD) * pkrRate).toLocaleString();

    contentArea.innerHTML = `
      <div style="background: rgba(237, 28, 36, 0.08); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(237, 28, 36, 0.3); margin-bottom: 12px; font-size: 0.8rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: #FF4D4D; font-weight: 800;">JAZZCASH MOBILE ACCOUNT</span>
          <span class="toolio-order-pill">Toolio Order: #${escapeHTML(orderNumber)}</span>
        </div>
        <div style="color: var(--text-secondary);">${jc.verificationNote}</div>
      </div>

      <div class="copy-field-group">
        <label class="copy-field-label">JazzCash Account Number (Tahir Hameed):</label>
        <div class="copy-field-box">
          <input type="text" readonly class="copy-field-input" value="${jc.accountNumber}" style="color: #FF4D4D; font-weight: 800;" />
          <button type="button" class="btn-copy-action" onclick="copyToClipboard('${jc.accountNumber}', 'JazzCash Number Copied!')">
            ${getIcon('copy')} Copy
          </button>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin: 12px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div>
            <label class="copy-field-label">Sender Name *:</label>
            <input type="text" id="manual-sender-name" placeholder="Your Name" class="copy-field-input" />
            <div id="name-error-msg" class="field-error-msg" style="display: none;">Name is required</div>
          </div>
          <div>
            <label class="copy-field-label">Sender Phone Number *:</label>
            <input type="text" id="manual-sender-phone" placeholder="0300-XXXXXXX" class="copy-field-input" />
            <div id="phone-error-msg" class="field-error-msg" style="display: none;">Phone is required</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div>
            <label class="copy-field-label">Transaction ID / TID *:</label>
            <input type="text" id="manual-sender-tid" placeholder="TID from SMS/App..." class="copy-field-input" />
            <div id="tid-error-msg" class="field-error-msg" style="display: none;">TID is required</div>
          </div>
          <div>
            <label class="copy-field-label">Payment Date *:</label>
            <input type="date" id="manual-payment-date" class="copy-field-input" value="${new Date().toISOString().split('T')[0]}" />
          </div>
        </div>

        <label class="copy-field-label">Attach Transfer Receipt / Screenshot *:</label>
        <div class="receipt-upload-box" style="padding: 12px; border: 2px dashed var(--border-light); border-radius: var(--radius-sm); text-align: center; cursor: pointer;" onclick="document.getElementById('receipt-file-input').click()">
          <input type="file" id="receipt-file-input" accept="image/*" style="display: none;" onchange="handleReceiptFileChange(this)" />
          <div style="color: var(--color-primary); margin-bottom: 4px;">${getIcon('download')}</div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">Click to Upload Transfer Receipt</div>
          <div id="receipt-preview-container"></div>
        </div>
        <div id="receipt-error-msg" class="field-error-msg" style="display: none; margin-top: 6px;">
          Receipt screenshot is required! Please attach transfer proof.
        </div>
      </div>

      ${renderToolioCheckoutDisclaimerHTML()}

      <button type="button" class="btn-primary-crypto" style="width: 100%; background: linear-gradient(135deg, #ED1C24, #A61016);" onclick="submitManualPayment('${orderNumber}', 'JazzCash', '${totalPKR}')">
        Submit for Manual Review
      </button>
    `;
  }

  // ==========================================
  // 5. Wallet Balance Flow
  // ==========================================
  else if (method === 'wallet') {
    contentArea.innerHTML = `
      <div style="background: rgba(0, 0, 0, 0.4); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 14px; text-align: center; width: 100%;">
        <div style="font-size: 0.75rem; color: var(--text-muted);">Current Toolio Store Wallet Balance:</div>
        <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 900; color: var(--color-danger); margin: 4px 0;">
          ${STATE.walletBalance.toFixed(2)} USDT
        </div>
        <div style="font-size: 0.75rem; color: var(--color-danger); font-weight: 600;">
          Insufficient balance. Please select an alternative payment method or Add Funds.
        </div>
      </div>

      <button type="button" class="btn-secondary-glass" style="width: 100%;" onclick="closeCheckoutModal(); openWalletModal();">
        ${getIcon('wallet')} Manage Wallet / Add Funds
      </button>
    `;
  }
}

function changeUsdtNetwork(netId) {
  STATE.selectedUsdtNetwork = netId;
  selectCheckoutMethod('usdt');
}

function toggleBinanceVerifyBtn(input) {
  const btn = document.getElementById('btn-verify-binance');
  const errorMsg = document.getElementById('binance-error-msg');
  if (errorMsg) errorMsg.style.display = 'none';

  if (btn) {
    btn.disabled = !(input && input.value.trim().length > 0);
  }
}

function toggleUsdtVerifyBtn(input) {
  const btn = document.getElementById('btn-verify-usdt');
  const errorMsg = document.getElementById('usdt-error-msg');
  if (errorMsg) errorMsg.style.display = 'none';

  if (btn) {
    btn.disabled = !(input && input.value.trim().length > 0);
  }
}

function verifyBinancePayOrder() {
  if (!validateToolioDisclaimer()) return;
  const input = document.getElementById('binance-orderid-input');
  const errorMsg = document.getElementById('binance-error-msg');
  const val = input ? input.value.trim() : '';

  if (!val || !/^[a-zA-Z0-9_-]+$/.test(val)) {
    if (input) input.classList.add('input-error');
    if (errorMsg) errorMsg.style.display = 'flex';
    return;
  }

  const modal = document.getElementById('crypto-modal');
  if (!modal || !STATE.activeCheckout) return;

  const orderNumber = STATE.activeCheckout.orderNumber;
  const safeVal = escapeHTML(val);
  const safeOrder = escapeHTML(orderNumber);

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="status-modal-title">
          <span>Binance Pay Verification (Prototype Preview)</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body">
        <div class="modal-empty-state" style="padding: 10px 0 20px;">
          <div class="modal-icon-badge-large" style="color: var(--color-binance); background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.3);">
            ${getIcon('clock')}
          </div>
          <h3 class="modal-empty-title">Order ID Captured</h3>
          <p class="modal-empty-desc">
            Submitted Binance Pay Order ID: <code style="color: var(--color-binance); font-weight: 800;">${safeVal}</code> for <span class="toolio-order-pill">Toolio Order: #${safeOrder}</span>
          </p>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; width: 100%; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
          ℹ️ <strong>Backend integration pending:</strong> In production, the Toolio server will verify the submitted Binance Pay Order ID through the Binance Account API transaction history.
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; font-family: var(--font-mono);">Endpoint: GET /sapi/v1/pay/transactions</div>
        </div>

        <button type="button" class="btn-secondary-glass" style="width: 100%;" onclick="closeCheckoutModal()">
          Close / Return to Store
        </button>
      </div>
    </div>
  `;

  showToast('Binance Pay Order ID captured in prototype.');
}

function verifyUsdtTransaction() {
  if (!validateToolioDisclaimer()) return;
  const input = document.getElementById('usdt-txid-input');
  const errorMsg = document.getElementById('usdt-error-msg');
  const val = input ? input.value.trim() : '';

  if (!val) {
    if (input) input.classList.add('input-error');
    if (errorMsg) errorMsg.style.display = 'flex';
    return;
  }

  const modal = document.getElementById('crypto-modal');
  if (!modal || !STATE.activeCheckout) return;

  const orderNumber = STATE.activeCheckout.orderNumber;
  const netName = STORE_CONFIG.paymentMethods.usdt.networks[STATE.selectedUsdtNetwork]?.name || 'BSC';
  const safeVal = escapeHTML(val);
  const safeOrder = escapeHTML(orderNumber);

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="status-modal-title">
          <span>USDT Transaction (Prototype Preview)</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body">
        <div class="modal-empty-state" style="padding: 10px 0 20px;">
          <div class="modal-icon-badge-large" style="color: var(--color-accent-blue); background: rgba(56, 189, 248, 0.12); border-color: rgba(56, 189, 248, 0.3);">
            ${getIcon('clock')}
          </div>
          <h3 class="modal-empty-title">TxID Captured on ${escapeHTML(netName)}</h3>
          <p class="modal-empty-desc">
            Submitted TxID: <code style="color: var(--color-accent-blue); font-weight: 800; word-break: break-all;">${safeVal}</code> for <span class="toolio-order-pill">Toolio Order: #${safeOrder}</span>
          </p>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; width: 100%; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
          ℹ️ <strong>Backend integration pending:</strong> In production, the Toolio server will verify the submitted TxID using Binance Account API deposit history and the selected network.
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; font-family: var(--font-mono);">Endpoint: GET /sapi/v1/capital/deposit/hisrec</div>
        </div>

        <button type="button" class="btn-secondary-glass" style="width: 100%;" onclick="closeCheckoutModal()">
          Close / Return to Store
        </button>
      </div>
    </div>
  `;

  showToast('USDT Transaction Hash captured in prototype.');
}

function submitManualPayment(orderNumber, methodName, totalPKR) {
  if (!validateToolioDisclaimer()) return;
  const nameInput = document.getElementById('manual-sender-name');
  const phoneInput = document.getElementById('manual-sender-phone');
  const tidInput = document.getElementById('manual-sender-tid');
  const nameError = document.getElementById('name-error-msg');
  const phoneError = document.getElementById('phone-error-msg');
  const tidError = document.getElementById('tid-error-msg');
  const receiptError = document.getElementById('receipt-error-msg');

  const senderName = nameInput ? nameInput.value.trim() : '';
  const senderPhone = phoneInput ? phoneInput.value.trim() : '';
  const tid = tidInput ? tidInput.value.trim() : '';

  let hasError = false;

  if (!senderName) {
    if (nameInput) nameInput.classList.add('input-error');
    if (nameError) nameError.style.display = 'flex';
    hasError = true;
  } else {
    if (nameInput) nameInput.classList.remove('input-error');
    if (nameError) nameError.style.display = 'none';
  }

  if (!senderPhone) {
    if (phoneInput) phoneInput.classList.add('input-error');
    if (phoneError) phoneError.style.display = 'flex';
    hasError = true;
  } else {
    if (phoneInput) phoneInput.classList.remove('input-error');
    if (phoneError) phoneError.style.display = 'none';
  }

  if (!tid) {
    if (tidInput) tidInput.classList.add('input-error');
    if (tidError) tidError.style.display = 'flex';
    hasError = true;
  } else {
    if (tidInput) tidInput.classList.remove('input-error');
    if (tidError) tidError.style.display = 'none';
  }

  // Mandatory Receipt Screenshot
  if (!STATE.currentReceiptBase64) {
    if (receiptError) receiptError.style.display = 'flex';
    hasError = true;
  } else {
    if (receiptError) receiptError.style.display = 'none';
  }

  if (hasError) {
    showToast('Please complete all required fields and upload the transfer receipt.');
    return;
  }

  const modal = document.getElementById('crypto-modal');
  if (!modal || !STATE.activeCheckout) return;

  const safeSenderName = escapeHTML(senderName);
  const safeSenderPhone = escapeHTML(senderPhone);
  const safeTid = escapeHTML(tid);
  const safeOrder = escapeHTML(orderNumber);
  const safeMethod = escapeHTML(methodName);
  const safeTotalPKR = escapeHTML(totalPKR);

  modal.innerHTML = `
    <div class="crypto-modal-card" role="dialog" aria-modal="true" aria-labelledby="manual-submitted-title">
      <div class="crypto-modal-header">
        <div class="crypto-modal-title" id="manual-submitted-title">
          <span>Manual Transfer (Prototype Preview)</span>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close Modal" onclick="closeCheckoutModal()">✕</button>
      </div>

      <div class="crypto-modal-body">
        <div class="modal-empty-state" style="padding: 10px 0 20px;">
          <div class="modal-icon-badge-large" style="color: #38bdf8; background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.3);">
            ${getIcon('clock')}
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
            Submitted — Under Admin Review
          </h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">
            Order <strong>#${safeOrder}</strong> (${safeTotalPKR} PKR via ${safeMethod}) details submitted.
          </p>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; width: 100%;">
          <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.5;">
            Sender: <strong>${safeSenderName}</strong> (${safeSenderPhone})<br />
            TID: <code>${safeTid}</code> • Screenshot Attached
          </div>
        </div>

        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 16px; font-size: 0.76rem; color: var(--text-secondary); text-align: center;">
          ℹ️ <strong>Backend integration pending:</strong> Admin portal will review and confirm this payment.
        </div>

        <button type="button" class="btn-secondary-glass" style="width: 100%;" onclick="closeCheckoutModal()">
          Close
        </button>
      </div>
    </div>
  `;

  if (STATE.activeCheckout.type === 'cart') {
    STATE.cart = [];
    updateCartUI();
  }

  showToast('Receipt captured in prototype.');
}

function closeCheckoutModal() {
  const modal = document.getElementById('crypto-modal');
  if (modal) modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  restoreLastActiveElement();
}

// Wallet Modal Interface
function updateWalletUI() {
  const walletBadge = document.getElementById('wallet-balance-display');
  if (walletBadge) walletBadge.textContent = 'Wallet';
}

function openWalletModal() {
  if (!STATE.authSession) return openSignInModal('Sign in with Google to view your Toolio wallet.');
  saveLastActiveElement();
  const modal = document.getElementById('wallet-modal');
  const body = document.getElementById('wallet-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="modal-empty-state" style="padding:18px 8px 22px;">
      <div class="modal-icon-badge-large">${getIcon('wallet')}</div>
      <h3 class="modal-empty-title">No wallet activity yet</h3>
      <p class="modal-empty-desc">A verified balance and transaction history will appear after the wallet service is connected. No sample balance is shown.</p>
    </div>
  `;

  document.body.classList.add('modal-open');
  modal.classList.add('active');
}

function selectDepositAmount(amt, btn) {
  const input = document.getElementById('custom-deposit-input');
  if (input) input.value = amt;
  btn.parentElement.querySelectorAll('.duration-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function closeWalletModal() {
  const modal = document.getElementById('wallet-modal');
  if (modal) modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  restoreLastActiveElement();
}

// Dedicated product.html Controller
function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const prodId = urlParams.get('product') || 'toolio-premium';

  const container = document.getElementById('product-page-detail-container');
  if (!container) return;

  if (prodId === 'toolio-premium') {
    const item = TOOLIO_HERO_PRODUCT;
    const displayPrice = formatPrice(item.priceUSD);
    const localEstimate = getLocalEstimateString(item.priceUSD);

    container.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-detail-media-col">
          <div class="product-detail-media-card">
            <img src="${item.image}" alt="${item.name}" class="product-detail-media-img" onerror="this.src='../assets/images/icon.png';" />
            <div class="product-detail-badges-row">
              <span class="official-badge-tag">${item.badge}</span>
              <span class="badge-tag available">Available</span>
            </div>
          </div>

          <!-- Compact Product Page Disclaimer (Left Column) -->
          <div class="product-detail-disclaimer-box">
            <div class="product-detail-disclaimer-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="product-disclaimer-icon" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Accounts and credits are not included</span>
            </div>
            <p class="product-detail-disclaimer-text">
              Toolio automates supported workflows using your own eligible accounts and available credits. Google accounts, AI credits, API credits, and third-party subscriptions are not included.
            </p>
          </div>
        </div>

        <div class="product-detail-info-card">
          <div class="brand-tag" style="margin-bottom: 6px;">${item.brand}</div>
          <h1 class="product-detail-title">${item.name}</h1>
          <p class="product-detail-description">
            ${item.description}
          </p>

          <div class="product-detail-price-box">
            <div class="product-detail-price-label">License Price:</div>
            <div class="product-detail-price-amount">
              ${displayPrice}
            </div>
            <div class="product-detail-price-estimate">
              ${localEstimate}
            </div>
            <div class="product-detail-price-subnote">
              Single Device • ${item.duration} Activation Code
            </div>
          </div>

          <div style="margin-bottom: 24px;">
            <h4 class="product-detail-features-title">Premium Features Included:</h4>
            <ul class="product-detail-features-list">
              ${item.features.map(f => `
                <li class="product-detail-feature-item">
                  ${getIcon('check')} <span>${f}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="product-detail-action-btns">
            <button type="button" class="btn-primary-crypto" onclick="buyToolioPremium()">
              ${getIcon('bolt')} Buy Now (${displayPrice})
            </button>
            <button type="button" class="btn-secondary-glass" onclick="addToCartToolioPremium()">
              ${getIcon('cart')} Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Reviews Section
function renderReviewsSection() {
  const container = document.getElementById('reviews-grid-container');
  if (!container) return;

  container.innerHTML = REVIEWS.map(rev => `
    <div class="review-card">
      <div class="review-card-header">
        <div class="review-author-info">
          <div class="review-avatar">${rev.author.charAt(0)}</div>
          <div>
            <div class="review-name">${rev.author}</div>
            <div class="review-location">${rev.location}</div>
          </div>
        </div>
      </div>

      <div class="review-product-pill">${rev.productName}</div>

      <div class="rating-stars" style="margin-bottom: 8px;">
        ${Array.from({ length: rev.rating }).map(() => '★').join('')}
      </div>

      <p class="review-text">"${rev.text}"</p>
    </div>
  `).join('');
}

// FAQs Accordion
function initFAQS() {
  const container = document.getElementById('faq-accordion-container');
  if (!container) return;

  container.innerHTML = FAQS.map((faq, index) => `
    <div class="faq-item ${index === 0 ? 'active' : ''}">
      <button type="button" class="faq-question-btn" onclick="toggleFaq(this)">
        <span>${faq.q}</span>
        ${getIcon('chevron-down')}
      </button>
      <div class="faq-answer">${faq.a}</div>
    </div>
  `).join('');
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  if (item) item.classList.toggle('active');
}

// Toast Notifications
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`📋 ${successMessage}`);
    }).catch(() => fallbackCopy(text, successMessage));
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`📋 ${successMessage}`);
  } catch (err) {}
  document.body.removeChild(ta);
}

// Accessibility & Keyboard Listeners
function saveLastActiveElement() {
  STATE.lastActiveElement = document.activeElement;
}

function restoreLastActiveElement() {
  if (STATE.lastActiveElement && typeof STATE.lastActiveElement.focus === 'function') {
    STATE.lastActiveElement.focus();
  }
}

function setupAccessibilityAndListeners() {
  const spotlight = document.querySelector('.cursor-spotlight');
  if (spotlight) {
    window.addEventListener('mousemove', (e) => {
      spotlight.style.left = `${e.clientX}px`;
      spotlight.style.top = `${e.clientY}px`;
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCheckoutModal();
      closeWalletModal();
      closeQuickView();
      closeCartDrawer();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      hideSearchDropdown();
    }
  });
}

// Vector SVG Icons
function getIcon(name) {
  const icons = {
    'bolt': `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    'star': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    'check': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    'cart': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
    'copy': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    'download': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    'shield': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    'wallet': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path><path d="M16 21V5a2 2 0 0 0-2-2H6"></path><circle cx="16" cy="14" r="1"></circle></svg>`,
    'clock': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    'eye': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    'trash': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    'sun': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    'moon': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    'chevron-down': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    'grid': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    'bot': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`,
    'video': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    'film': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
    'search': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`
  };
  return icons[name] || '';
}
