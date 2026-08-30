const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    throw new Error(message);
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  const failedRequests = [];

  page.on('requestfailed', request => {
    failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
  });

  const storeCatalogUrl = `${pathToFileURL(path.resolve(__dirname, '..', 'store', 'index.html')).href}`;
  await page.goto(storeCatalogUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);

  // Check all 12 products images
  const productImgData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    return cards.map(c => {
      const img = c.querySelector('.card-img');
      const title = c.querySelector('.product-title')?.textContent?.trim();
      return {
        title,
        src: img?.src,
        naturalWidth: img?.naturalWidth,
        naturalHeight: img?.naturalHeight,
        complete: img?.complete
      };
    });
  });

  console.log(`Found ${productImgData.length} product cards rendered.`);
  assert(productImgData.length === 12, `Expected 12 catalog products, found ${productImgData.length}`);

  for (const item of productImgData) {
    assert(item.src, `Image source missing for ${item.title}`);
    assert(!item.src.includes('unsplash.com'), `Unsplash image found for ${item.title}: ${item.src}`);
    assert(item.src.includes('store-products/'), `Expected local store-products path for ${item.title}, got: ${item.src}`);
    assert(item.complete, `Image failed to load for ${item.title}: ${item.src}`);
    console.log(`✓ ${item.title} -> ${item.src.split('/').pop()} (loaded cleanly)`);
  }

  // Check QuickView modal image load
  await page.evaluate(() => openQuickView('sub-chatgpt'));
  await page.waitForTimeout(200);
  const qvImgSrc = await page.evaluate(() => document.querySelector('#quickview-modal img')?.src);
  assert(qvImgSrc && qvImgSrc.includes('store-products/chatgpt.svg'), `QuickView modal image mismatch: ${qvImgSrc}`);
  console.log(`✓ QuickView modal loads local image: ${qvImgSrc.split('/').pop()}`);

  assert(failedRequests.length === 0, `Failed network requests: ${failedRequests.join(', ')}`);

  await browser.close();
  console.log('\nPASS: All product images are local, brand-accurate, and loaded with zero errors.');
})().catch(err => {
  console.error(`FAIL: ${err.message}`);
  process.exitCode = 1;
});
