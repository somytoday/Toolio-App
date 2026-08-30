const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 320, height: 568 });

  // 1. Check #download tab
  await page.goto('http://127.0.0.1:3000/#download', { waitUntil: 'networkidle' });
  const overflowElementsDownload = await page.evaluate(() => {
    const docW = window.innerWidth;
    const elements = Array.from(document.querySelectorAll('*'));
    const overflowing = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docW + 1 || rect.left < -1) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: el.textContent?.trim().slice(0, 40)
        });
      }
    });
    return overflowing;
  });

  console.log('Overflowing elements on #download at 320px:');
  console.log(JSON.stringify(overflowElementsDownload, null, 2));

  // 2. Check Store Catalog
  await page.goto('http://127.0.0.1:3000/store/', { waitUntil: 'networkidle' });
  const overflowElementsStore = await page.evaluate(() => {
    const docW = window.innerWidth;
    const elements = Array.from(document.querySelectorAll('*'));
    const overflowing = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docW + 1 || rect.left < -1) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: el.textContent?.trim().slice(0, 40)
        });
      }
    });
    return overflowing;
  });

  console.log('\nOverflowing elements on Store catalog at 320px:');
  console.log(JSON.stringify(overflowElementsStore, null, 2));

  await browser.close();
})();
