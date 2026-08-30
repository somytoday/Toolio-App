const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 320, height: 568 });

  await page.goto('http://127.0.0.1:3000/#download', { waitUntil: 'networkidle' });
  const downloadItems = await page.evaluate(() => {
    const docW = window.innerWidth;
    const all = Array.from(document.querySelectorAll('#view-download *'));
    return all.filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > docW + 1;
    }).map(el => ({
      tag: el.tagName,
      id: el.id,
      className: el.className,
      rect: el.getBoundingClientRect(),
      text: el.textContent?.trim().slice(0, 50)
    }));
  });

  console.log('Download overflowing items:', JSON.stringify(downloadItems, null, 2));

  // Also check why store has overflow at 320px
  await page.goto('http://127.0.0.1:3000/store/', { waitUntil: 'networkidle' });
  const storeItems = await page.evaluate(() => {
    const docW = window.innerWidth;
    const all = Array.from(document.querySelectorAll('body *'));
    return all.filter(el => {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      // Exclude offscreen drawer when closed
      if (el.closest('.cart-drawer') && !document.querySelector('.cart-drawer.active')) return false;
      if (el.closest('.category-pills-bar')) return false; // horizontal scrollable is allowed if contained
      return r.right > docW + 1;
    }).map(el => ({
      tag: el.tagName,
      id: el.id,
      className: el.className,
      right: el.getBoundingClientRect().right,
      width: el.getBoundingClientRect().width,
      text: el.textContent?.trim().slice(0, 50)
    }));
  });

  console.log('Store overflowing items:', JSON.stringify(storeItems, null, 2));

  await browser.close();
})();
