const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const tabs = ['home', 'download', 'whats-new', 'toolio-tools', 'other-tools', 'suggestions', 'community', 'premium'];
const moreTabs = ['whats-new', 'other-tools', 'suggestions', 'community', 'premium'];
const viewports = [
  { name: 'desktop-wide', width: 1536, height: 864 },
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop-intermediate-1366', width: 1366, height: 768 },
  { name: 'desktop-intermediate-1280', width: 1280, height: 800 },
  { name: 'compact-tablet-landscape', width: 1200, height: 800 },
  { name: 'compact-tablet-medium', width: 1024, height: 768 },
  { name: 'compact-tablet-portrait', width: 768, height: 1024 },
  { name: 'compact-phone-standard', width: 390, height: 844 },
  { name: 'compact-phone-narrow', width: 320, height: 568 }
];

let browser;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    throw new Error(message);
  }
}

(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  const websiteUrl = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}#home`;
  await page.goto(websiteUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  // Check 1: Meta Description
  const metaDesc = await page.getAttribute('meta[name="description"]', 'content');
  const expectedDesc = 'Toolio is a Windows automation assistant for organizing supported video, image, speech, CapCut, and numbered-media workflows using your own eligible accounts and credits.';
  assert(metaDesc === expectedDesc, `Meta description mismatch:\nExpected: "${expectedDesc}"\nFound: "${metaDesc}"`);
  console.log('✓ Meta description is accurate.');

  // Check 2: Tabs across viewports & Active Navigation State
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const isCompact = viewport.width < 1280;

    for (const tab of tabs) {
      const result = await page.evaluate(({ tabId, isCompactView, moreList }) => {
        setActiveTab(tabId, false);
        const activeView = document.querySelector('.tab-view.active');
        const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;

        const activeDockItems = Array.from(document.querySelectorAll('.dock-item.active'));
        const storeLinkActive = document.querySelector('#dock-btn-store')?.classList.contains('active') || false;
        const homeDockActive = document.querySelector('#dock-btn-home')?.classList.contains('active') || false;
        const moreDockActive = document.querySelector('#dock-btn-more')?.classList.contains('active') || false;

        const navBtns = Array.from(document.querySelectorAll('.nav-tab-btn')).map(b => ({
          tab: b.getAttribute('data-tab'),
          scrollWidth: b.scrollWidth,
          clientWidth: b.clientWidth,
          text: b.textContent.trim(),
          isClipped: b.scrollWidth > b.clientWidth + 1
        }));

        return {
          activeId: activeView?.id,
          overflowX,
          activeDockCount: activeDockItems.length,
          activeDockIds: activeDockItems.map(el => el.id),
          storeLinkActive,
          homeDockActive,
          moreDockActive,
          isMoreTab: moreList.includes(tabId),
          navBtns
        };
      }, { tabId: tab, isCompactView: isCompact, moreList: moreTabs });

      assert(result.overflowX <= 1, `${viewport.name}/${tab}: ${result.overflowX}px horizontal overflow`);
      assert(result.activeId, `${viewport.name}/${tab}: no active view`);

      // Verify every visible nav tab button has scrollWidth <= clientWidth + 1 (no text clipping)
      if (!isCompact) {
        result.navBtns.forEach(b => {
          assert(!b.isClipped, `Nav button "${b.tab}" label text is clipped at ${viewport.width}px: scrollWidth=${b.scrollWidth}px > clientWidth=${b.clientWidth}px`);
        });
      }

      // Mobile dock active state verification
      if (isCompact) {
        assert(result.activeDockCount === 1, `${viewport.name}/${tab}: Expected exactly 1 active dock item, found ${result.activeDockCount} (${result.activeDockIds.join(', ')})`);
        assert(!result.storeLinkActive, `${viewport.name}/${tab}: Store link must NEVER be active`);

        if (tab === 'home') {
          assert(result.homeDockActive, `${viewport.name}/${tab}: Home dock button must be active for #home`);
        } else if (result.isMoreTab) {
          assert(result.moreDockActive, `${viewport.name}/${tab}: More dock button must be active for ${tab}`);
        }
      }
      console.log(`${viewport.name}/${tab}: ${result.activeId}, overflowX=${result.overflowX}px, activeDock=${result.activeDockIds.join(', ') || 'none (desktop)'}`);
    }
  }

  // Check 3: What's New Version Button Non-Stretching at 768px
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.evaluate(() => setActiveTab('whats-new', false));
  await page.waitForTimeout(200);

  const versionBtnBox = await page.evaluate(() => {
    const btn = document.querySelector('.version-nav-btn');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const sidebar = document.querySelector('.version-sidebar')?.getBoundingClientRect();
    return {
      btnHeight: rect.height,
      sidebarHeight: sidebar?.height || 0
    };
  });

  assert(versionBtnBox, 'Version button not found in What\'s New');
  assert(versionBtnBox.btnHeight >= 50 && versionBtnBox.btnHeight <= 70, `Version button height stretched abnormally: ${versionBtnBox.btnHeight}px (expected 52-64px)`);
  console.log(`✓ What's New version button height at 768px is ${versionBtnBox.btnHeight.toFixed(1)}px (not stretched).`);

  // Check 4: More Drawer Positioning Above Dock (drawer.bottom <= bottomDock.top)
  for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(vp);
    await page.evaluate(() => openMoreSheet());
    await page.waitForTimeout(350);

    const positions = await page.evaluate(() => {
      const drawer = document.querySelector('#more-sheet-drawer')?.getBoundingClientRect();
      const dock = document.querySelector('.mobile-bottom-dock')?.getBoundingClientRect();
      return {
        drawerBottom: drawer ? drawer.bottom : 0,
        dockTop: dock ? dock.top : 0,
        drawerTop: drawer ? drawer.top : 0
      };
    });

    assert(positions.drawerBottom <= positions.dockTop + 1.5, `More drawer overlaps bottom dock at ${vp.width}x${vp.height}: drawer.bottom=${positions.drawerBottom.toFixed(1)}px > dock.top=${positions.dockTop.toFixed(1)}px`);
    await page.evaluate(() => closeMoreSheet());
    await page.waitForTimeout(300);
    console.log(`✓ More drawer sits above dock at ${vp.width}x${vp.height} (drawer.bottom: ${positions.drawerBottom.toFixed(1)}px <= dock.top: ${positions.dockTop.toFixed(1)}px)`);
  }

  // Check 5: More Drawer Keyboard Focus Trap & Accessibility
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => openMoreSheet());
  await page.waitForTimeout(250);

  // Tab through all items and verify wrap-around
  const focusElements = await page.evaluate(() => {
    const drawer = document.querySelector('#more-sheet-drawer');
    const closeBtn = document.querySelector('#btn-close-more-sheet');
    const items = Array.from(drawer.querySelectorAll('.more-sheet-item'));
    return {
      closeBtnId: closeBtn?.id,
      itemCount: items.length
    };
  });

  // Focus the close button, press Shift+Tab -> should wrap to last item
  await page.focus('#btn-close-more-sheet');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');

  let activeElDataTab = await page.evaluate(() => document.activeElement?.getAttribute('data-tab'));
  assert(activeElDataTab === 'premium', `Shift+Tab from close button should wrap to last item (premium), got: ${activeElDataTab}`);

  // Tab from last item -> should wrap to close button (or first item)
  await page.keyboard.press('Tab');
  let activeElId = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-tab'));
  assert(activeElId === 'btn-close-more-sheet' || activeElId === 'whats-new', `Tab from last item should wrap to start of drawer, got: ${activeElId}`);

  // Escape key closes drawer and restores focus
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const isDrawerClosed = await page.evaluate(() => !document.querySelector('#more-sheet-drawer')?.classList.contains('active'));
  assert(isDrawerClosed, 'Escape key did not close More drawer');
  console.log('✓ More drawer focus trap & Escape key verified.');

  // Check 6: Store Mobile Pages Toolio Home Navigation (< 600px)
  const storeCatalogUrl = `${pathToFileURL(path.resolve(__dirname, '..', 'store', 'index.html')).href}`;
  const storeProductUrl = `${pathToFileURL(path.resolve(__dirname, '..', 'store', 'product.html')).href}?product=toolio-premium`;

  for (const storePageUrl of [storeCatalogUrl, storeProductUrl]) {
    await page.goto(storePageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    const linkInfo = await page.evaluate(() => {
      const link = document.querySelector('.mobile-nav-home-btn, .mobile-nav-home-link');
      if (!link) return null;
      const rect = link.getBoundingClientRect();
      const style = window.getComputedStyle(link);
      const title = link.getAttribute('title') || '';
      const ariaLabel = link.getAttribute('aria-label') || '';

      return {
        text: link.textContent.trim(),
        title,
        ariaLabel,
        href: link.getAttribute('href'),
        visible: style.display !== 'none' && rect.height > 0 && rect.width > 0,
        height: rect.height,
        width: rect.width
      };
    });

    assert(linkInfo, `Mobile Toolio Home button/link missing on ${storePageUrl}`);
    assert(
      linkInfo.text.includes('Toolio Home') || linkInfo.title.includes('Toolio Page') || linkInfo.ariaLabel.includes('Toolio Page'),
      `Expected Toolio Home indicator, found text="${linkInfo.text}", title="${linkInfo.title}"`
    );
    assert(linkInfo.href === '../index.html', `Expected href="../index.html", found "${linkInfo.href}"`);
    assert(linkInfo.visible, `Mobile Toolio Home button/link is not visible at 390px`);
    assert(linkInfo.height >= 36 && linkInfo.width >= 36, `Mobile Toolio Home touch target too small: ${linkInfo.width}x${linkInfo.height}px`);
  }
  console.log('✓ Store catalog and product pages have visible Toolio Home navigation on mobile.');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  await browser.close();
  browser = null;
  console.log('\n================================================================');
  console.log('PASS: All responsive, navigation, accessibility, & store checks passed.');
  console.log('================================================================');
})().catch(async error => {
  if (browser) await browser.close();
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
