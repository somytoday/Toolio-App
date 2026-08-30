const { chromium } = require('playwright-core');

const VIEWPORTS = [
  { name: '1920x1080 (FHD Desktop)', width: 1920, height: 1080 },
  { name: '1440x900 (Large Laptop)', width: 1440, height: 900 },
  { name: '1280x800 (Compact Desktop)', width: 1280, height: 800 },
  { name: '1024x768 (Tablet Landscape)', width: 1024, height: 768 },
  { name: '768x1024 (Tablet Portrait)', width: 768, height: 1024 },
  { name: '430x932 (Large Phone - iPhone 14/15 Pro Max)', width: 430, height: 932 },
  { name: '390x844 (Standard Phone - iPhone 12/13/14)', width: 390, height: 844 },
  { name: '320x568 (Narrow Phone - iPhone SE 1st gen)', width: 320, height: 568 }
];

const TABS = [
  'home',
  'download',
  'whats-new',
  'toolio-tools',
  'other-tools',
  'suggestions',
  'community',
  'premium'
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const network404s = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      network404s.push(`${resp.status()} on ${resp.url()}`);
    }
  });

  console.log('=== 1. AUDITING MAIN WEBSITE TABS & VIEWPORTS ===');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const tab of TABS) {
      const url = `http://127.0.0.1:3000/#${tab}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(100);

      const pageMetrics = await page.evaluate((tabName) => {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
        const clientW = window.innerWidth;
        const overflow = scrollW > clientW + 1 ? scrollW - clientW : 0;

        // Check active tab view element
        const viewEl = document.getElementById(`view-${tabName}`);
        const viewVisible = viewEl ? window.getComputedStyle(viewEl).display !== 'none' : false;

        // Check navigation items
        const navBtns = Array.from(document.querySelectorAll('.nav-tab-btn:not([style*="display: none"])'));
        const clippedBtns = navBtns.filter(b => {
          const style = window.getComputedStyle(b);
          if (style.display === 'none') return false;
          return b.scrollWidth > b.clientWidth + 1;
        }).map(b => b.textContent.trim());

        return {
          overflow,
          viewVisible,
          clippedBtns,
          clientW,
          scrollW
        };
      }, tab);

      if (pageMetrics.overflow > 0) {
        console.error(`❌ Overflow at ${vp.name} on #${tab}: ${pageMetrics.overflow}px (scroll: ${pageMetrics.scrollW}, client: ${pageMetrics.clientW})`);
      }
      if (pageMetrics.clippedBtns.length > 0) {
        console.error(`❌ Clipped nav buttons at ${vp.name} on #${tab}: ${pageMetrics.clippedBtns.join(', ')}`);
      }
    }
    console.log(`✓ Tested all tabs at ${vp.name}`);
  }

  console.log('\n=== 2. AUDITING STORE CATALOG PAGE & VIEWPORTS ===');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://127.0.0.1:3000/store/', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(100);

    const storeMetrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientW = window.innerWidth;
      const overflow = scrollW > clientW + 1 ? scrollW - clientW : 0;

      const productCards = document.querySelectorAll('.product-card');
      const heroSlot = document.querySelector('#hero-featured-product-slot');

      return {
        overflow,
        productCardsCount: productCards.length,
        heroSlotPresent: !!heroSlot,
        scrollW,
        clientW
      };
    });

    if (storeMetrics.overflow > 0) {
      console.error(`❌ Store overflow at ${vp.name}: ${storeMetrics.overflow}px`);
    } else {
      console.log(`✓ Store catalog at ${vp.name} (0px overflow, ${storeMetrics.productCardsCount} products)`);
    }
  }

  console.log('\n=== 3. AUDITING STORE PRODUCT PAGE (product.html) ===');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://127.0.0.1:3000/store/product.html?product=toolio-premium', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(100);

    const prodMetrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientW = window.innerWidth;
      const overflow = scrollW > clientW + 1 ? scrollW - clientW : 0;

      const detailContainer = document.querySelector('#product-page-detail-container');
      const homeLink = document.querySelector('.mobile-nav-home-btn, .mobile-nav-home-link');

      return {
        overflow,
        hasDetail: !!detailContainer && detailContainer.children.length > 0,
        hasHomeLink: !!homeLink,
        scrollW,
        clientW
      };
    });

    if (prodMetrics.overflow > 0) {
      console.error(`❌ Product page overflow at ${vp.name}: ${prodMetrics.overflow}px`);
    } else {
      console.log(`✓ Store product page at ${vp.name} (0px overflow, details: ${prodMetrics.hasDetail})`);
    }
  }

  console.log('\n=== 4. CHECKING STORE LINKS AND MODALS ===');
  await page.goto('http://127.0.0.1:3000/#home');
  const storeLinkTargets = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('[data-external-url], a[href*="store"]').forEach(el => {
      links.push({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        externalUrl: el.dataset.externalUrl,
        href: el.getAttribute('href'),
        text: el.textContent.trim()
      });
    });
    return links;
  });

  console.log('Store links detected on main site:');
  console.log(JSON.stringify(storeLinkTargets, null, 2));

  console.log('\n=== 5. SUMMARY OF NETWORK & CONSOLE ===');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error(consoleErrors);
  }
  console.log(`Network 404s: ${network404s.length}`);
  if (network404s.length > 0) {
    console.error(network404s);
  }

  await browser.close();
  console.log('\nAudit complete.');
})().catch(err => {
  console.error('Fatal audit error:', err);
  process.exitCode = 1;
});
