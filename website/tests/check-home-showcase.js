const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const pageUrl = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}#home`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let browser;

(async () => {
  browser = await chromium.launch({ headless: true, executablePath: edgePath });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(5000);

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const slideCount = await page.evaluate(() => CAROUSEL_SLIDES.length);
  assert(slideCount === 10, `Expected 10 showcase slides, found ${slideCount}`);

  const initialStage = await page.locator('.showcase-image-container').boundingBox();
  assert(initialStage, 'Showcase stage is missing');

  for (let index = 1; index < slideCount; index += 1) {
    await page.evaluate(() => document.querySelector('#carousel-btn-next').click());
    await page.waitForTimeout(250);
    const stage = await page.locator('.showcase-image-container').boundingBox();
    assert(stage, `Showcase stage is missing on slide ${index + 1}`);
    assert(Math.abs(stage.width - initialStage.width) < 1, `Stage width moved on slide ${index + 1}`);
    assert(Math.abs(stage.height - initialStage.height) < 1, `Stage height moved on slide ${index + 1}`);
  }

  const desktop = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect();
    const style = getComputedStyle(document.querySelector('#carousel-img'));
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      objectFit: style.objectFit,
      imageHeight: box('#carousel-img').height,
      stageHeight: box('.showcase-image-container').height,
      brand: box('.nav-brand-row'),
      tabs: box('.nav-tabs'),
      actions: box('.nav-actions')
    };
  });

  assert(desktop.overflow <= 1, `Desktop horizontal overflow is ${desktop.overflow}px`);
  assert(desktop.objectFit === 'contain', `Expected object-fit contain, found ${desktop.objectFit}`);
  assert(Math.abs(desktop.imageHeight - desktop.stageHeight) < 1, 'Image does not fill the stable stage box');
  assert(desktop.brand.left < desktop.tabs.left, 'Brand is not in the left header region');
  assert(desktop.tabs.right <= desktop.actions.left + 1, 'Navigation overlaps the account action region');
  assert(1920 - desktop.actions.right < 32, 'Account actions are not aligned to the far right');

  for (const viewport of [
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
    { width: 1200, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 }
  ]) {
    await page.setViewportSize(viewport);
    const before = await page.locator('.showcase-image-container').boundingBox();
    await page.evaluate(() => document.querySelector('#carousel-btn-next').click());
    await page.waitForTimeout(250);
    const after = await page.locator('.showcase-image-container').boundingBox();
    const layout = await page.evaluate(() => {
      const tabs = document.querySelector('.nav-tabs');
      const actions = document.querySelector('.nav-actions');
      const dock = document.querySelector('.mobile-bottom-dock');
      const tabsRect = tabs ? tabs.getBoundingClientRect() : null;
      const actionsRect = actions ? actions.getBoundingClientRect() : null;
      const isDesktop = window.innerWidth >= 1280;
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tabsRight: tabsRect ? tabsRect.right : 0,
        actionsLeft: actionsRect ? actionsRect.left : 0,
        actionsRight: actionsRect ? actionsRect.right : 0,
        hasDock: !!dock,
        dockVisible: dock ? getComputedStyle(dock).display !== 'none' : false,
        isDesktop
      };
    });
    assert(before && after, `Missing showcase at ${viewport.width}x${viewport.height}`);
    assert(Math.abs(before.width - after.width) < 1, `Stage width moved at ${viewport.width}x${viewport.height}`);
    assert(Math.abs(before.height - after.height) < 1, `Stage height moved at ${viewport.width}x${viewport.height}`);
    assert(layout.overflow <= 1, `Horizontal overflow at ${viewport.width}x${viewport.height}`);
    if (layout.isDesktop) {
      assert(layout.tabsRight <= layout.actionsLeft + 1, `Header regions overlap at ${viewport.width}x${viewport.height}`);
      assert(viewport.width - layout.actionsRight < 40, `Account actions are not right aligned at ${viewport.width}x${viewport.height}: ${viewport.width - layout.actionsRight}px inset`);
      assert(!layout.dockVisible, `Bottom dock should not be visible on desktop at ${viewport.width}px`);
    } else {
      assert(layout.dockVisible, `Bottom dock should be visible below 1280px at ${viewport.width}px`);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);

  const mobile = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect();
    const contentSelectors = ['.hero-title', '.hero-description', '.hero-cta-group', '.hero-features-strip', '.showcase-wrapper'];
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      brand: box('.nav-brand-row'),
      dock: box('.mobile-bottom-dock'),
      actions: box('.nav-actions'),
      stage: box('.showcase-image-container'),
      actionsRight: box('.nav-actions').right,
      contentOverflow: contentSelectors.map(selector => ({ selector, right: box(selector).right }))
    };
  });

  assert(mobile.overflow <= 1, `Mobile horizontal overflow is ${mobile.overflow}px`);
  assert(Math.abs(mobile.brand.top - mobile.actions.top) < 8, 'Mobile brand and account actions are not on the same row');
  assert(mobile.dock.top > mobile.brand.bottom, 'Mobile bottom navigation dock is not below header');
  assert(mobile.actionsRight <= 390, `Mobile account actions are clipped at ${mobile.actionsRight}px`);
  mobile.contentOverflow.forEach(item => assert(item.right <= 390, `${item.selector} is clipped at ${item.right}px`));
  assert(mobile.stage.width <= 390, 'Mobile showcase exceeds the viewport');

  await browser.close();
  browser = null;
  console.log('PASS: 10-slide showcase is stable and the account-ready header is responsive.');
})().catch(async error => {
  if (browser) await browser.close();
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
