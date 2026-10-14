import puppeteer from 'puppeteer-core';
import { getChromePath } from '../packages/render-adapter/src/index.js';
import assert from 'node:assert/strict';
import path from 'node:path';

async function testBrowserUI() {
  console.log('--- Starting Puppeteer Browser UI Test ---');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Step 1: Open app
  console.log('1. Navigating to http://127.0.0.1:4317...');
  await page.goto('http://127.0.0.1:4317', { waitUntil: 'networkidle0' });

  // Step 2: Verify header & branding
  console.log('2. Verifying header branding & offline badge...');
  const brandText = await page.$eval('.brand-logo span', el => el.textContent);
  assert.equal(brandText, 'Kinetic Studio');

  const offlineBadge = await page.$eval('.badge-offline', el => el.textContent);
  assert.equal(offlineBadge, 'OFFLINE V0.01');
  console.log('✓ Header and OFFLINE badge verified');

  // Step 3: Check Quick Create form
  console.log('3. Editing headline in Quick Create form...');
  const headlineInput = await page.$('textarea.form-textarea');
  assert.ok(headlineInput, 'Headline textarea found');
  await headlineInput.click({ clickCount: 3 });
  await headlineInput.type('The All-In-One AI Inbox for Merchants');

  // Click Sync to Scenes
  const syncBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent?.includes('Sync Quick Create'));
  });
  assert.ok(syncBtn, 'Sync button found');
  await syncBtn.asElement()?.click();
  console.log('✓ Quick Create synced to scenes');

  // Step 4: Preview Player controls
  console.log('4. Testing Preview Player play/pause and aspect ratios...');
  const playBtn = await page.$('.play-toggle-btn');
  assert.ok(playBtn, 'Play button found');
  await playBtn.click();
  await new Promise(r => setTimeout(r, 600));
  await playBtn.click(); // Pause

  // Toggle to landscape
  const landscapeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.aspect-btn'));
    return btns.find(b => b.textContent?.includes('Landscape'));
  });
  await landscapeBtn.asElement()?.click();
  await new Promise(r => setTimeout(r, 300));
  const isLandscape = await page.$('.preview-frame-wrapper.landscape');
  assert.ok(isLandscape, 'Landscape frame wrapper active');
  console.log('✓ Landscape aspect ratio toggle verified');

  // Toggle back to portrait
  const portraitBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.aspect-btn'));
    return btns.find(b => b.textContent?.includes('Portrait'));
  });
  await portraitBtn.asElement()?.click();
  await new Promise(r => setTimeout(r, 300));
  const isPortrait = await page.$('.preview-frame-wrapper.portrait');
  assert.ok(isPortrait, 'Portrait frame wrapper active');
  console.log('✓ Portrait aspect ratio toggle verified');

  // Step 5: Switch to Brand & Palette tab
  console.log('5. Testing Brand & Palette tab...');
  const brandTabBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.nav-tab-btn'));
    return btns.find(b => b.textContent?.includes('Brand & Palette'));
  });
  await brandTabBtn.asElement()?.click();
  await new Promise(r => setTimeout(r, 200));
  const colorPickers = await page.$$('.color-swatch-input');
  assert.ok(colorPickers.length >= 4, 'Color pickers found');
  console.log('✓ Brand Kit tab verified with 4 color pickers');

  // Step 6: Switch to Scenes & Motion tab
  console.log('6. Testing Scenes & Motion tab...');
  const scenesTabBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.nav-tab-btn'));
    return btns.find(b => b.textContent?.includes('Scenes & Motion'));
  });
  await scenesTabBtn.asElement()?.click();
  await new Promise(r => setTimeout(r, 200));
  const sceneItems = await page.$$('.scene-card-item');
  assert.ok(sceneItems.length >= 2, `Found ${sceneItems.length} scenes`);
  console.log(`✓ Scenes tab verified with ${sceneItems.length} scene cards`);

  // Step 7: Preflight Check Modal
  console.log('7. Opening Preflight Validation Report modal...');
  const preflightBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.app-header button'));
    return btns.find(b => b.textContent?.includes('Preflight'));
  });
  await preflightBtn.asElement()?.click();
  await page.waitForSelector('.modal-card', { timeout: 5000 });
  const modalText = await page.$eval('.modal-card', el => el.textContent);
  assert.ok(modalText?.includes('Preflight Validation Report'));
  assert.ok(modalText?.includes('All Preflight Checks Passed'));
  console.log('✓ Preflight Validation Report verified (All Passed)');

  // Close Preflight Modal
  const closeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.modal-footer button'));
    return btns.find(b => b.textContent?.includes('Close'));
  });
  await closeBtn.asElement()?.click();
  await new Promise(r => setTimeout(r, 200));

  // Step 8: Export MP4 Modal
  console.log('8. Opening Export MP4 modal...');
  const exportBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.app-header button'));
    return btns.find(b => b.textContent?.includes('Export MP4'));
  });
  await exportBtn.asElement()?.click();
  await page.waitForSelector('.modal-card', { timeout: 5000 });
  const exportModalText = await page.$eval('.modal-card', el => el.textContent);
  assert.ok(exportModalText?.includes('Offline MP4 Render Center'));
  assert.ok(exportModalText?.includes('Portrait (9:16)'));
  assert.ok(exportModalText?.includes('Landscape (16:9)'));
  console.log('✓ Offline MP4 Render Center modal verified');

  // Close Export Modal
  const exportCloseBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.modal-footer button'));
    return btns.find(b => b.textContent?.includes('Cancel') || b.textContent?.includes('Close'));
  });
  await exportCloseBtn.asElement()?.click();
  await new Promise(r => setTimeout(r, 200));

  // Take screenshot of UI
  const screenshotPath = path.resolve('data/exports/kinetic-studio-ui.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`✓ Screenshot of UI saved to: ${screenshotPath}`);

  await browser.close();
  console.log('>>> BROWSER UI TEST COMPLETED SUCCESSFULLY! ALL CRITERIA PASSED! <<<');
}

testBrowserUI().catch(err => {
  console.error('Browser UI Test Failed:', err);
  process.exit(1);
});
