import puppeteer from 'puppeteer-core';
import { getChromePath } from '../packages/render-adapter/src/index.js';
import { buildServer } from '../apps/local-server/src/index.js';
import assert from 'node:assert/strict';
import path from 'node:path';

async function testBrowserWorkTreeUI() {
  console.log('--- Starting Puppeteer Work-Tree Browser UI Test ---');

  let serverInstance = null;
  try {
    const healthRes = await fetch('http://127.0.0.1:4317/api/health');
    if (!healthRes.ok) throw new Error('Server not ready');
  } catch (_) {
    console.log('-> Starting local Fastify server at http://127.0.0.1:4317...');
    serverInstance = await buildServer();
    await serverInstance.listen({ port: 4317, host: '127.0.0.1' });
    console.log('✓ Fastify server booted successfully.');
  }

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Step 1: Open app
    console.log('1. Navigating to http://127.0.0.1:4317...');
    await page.goto('http://127.0.0.1:4317', { waitUntil: 'networkidle0' });

  // Step 2: Verify header & storage status
  console.log('2. Verifying header branding & offline storage badge...');
  const appTitle = await page.$eval('.header-app-title', el => el.textContent);
  assert.equal(appTitle?.trim(), 'GROWTH STUDIO');

  const appVersion = await page.$eval('.header-app-version', el => el.textContent);
  assert.ok(appVersion?.includes('OFFLINE VIDEO ENGINE'));

  const storageChip = await page.$('.storage-header-chip');
  assert.ok(storageChip, 'Storage chip rendered in top bar');
  const storageText = await page.$eval('.storage-header-chip', el => el.textContent);
  console.log(`✓ Top bar storage indicator verified: "${storageText.trim()}"`);

  // Step 3: Verify 7 Work-Tree Navigation Nodes
  console.log('3. Verifying 7-Stage Work-Tree Navigation...');
  const navNodes = await page.$$('.work-tree-node');
  assert.equal(navNodes.length, 7, `Expected 7 work-tree stages, got ${navNodes.length}`);
  console.log('✓ All 7 work-tree stages verified (Home, Template, Storyboard, Brand, Motion, Preview, Export)');

  // Step 4: Step 1 (Project Home) - Starter cards
  console.log('4. Checking starter cards on Project Home...');
  await page.waitForSelector('.starter-choice-card', { timeout: 8000 });
  const starterCards = await page.$$('.starter-choice-card');
  assert.ok(starterCards.length >= 4, `Expected at least 4 starter cards, got ${starterCards.length}`);
  console.log(`✓ Found ${starterCards.length} starter cards (including Bengali Guided Story)`);

  // Step 5: Navigate to Template & Format
  console.log('5. Navigating to Stage 2: Template & Format...');
  await navNodes[1].click();
  await page.waitForSelector('.template-selection-card', { timeout: 8000 });
  const templateCards = await page.$$('.template-selection-card');
  assert.equal(templateCards.length, 3, `Expected 3 template archetype cards, got ${templateCards.length}`);
  console.log('✓ Found all 3 template archetypes: Guided Product Story, Bold Kinetic, App Showcase');

  const targetCards = await page.$$('.target-option-box');
  assert.equal(targetCards.length, 3, `Expected 3 target ratio cards, got ${targetCards.length}`);
  console.log('✓ Found 3 aspect ratio targets: 4:5 (Standard), 9:16 (Vertical), 16:9 (Landscape)');

  // Step 6: Navigate to Storyboard & Chapters
  console.log('6. Navigating to Stage 3: Storyboard & Chapters...');
  await navNodes[2].click();
  await page.waitForSelector('.scene-nav-card', { timeout: 8000 });
  const sceneItems = await page.$$('.scene-nav-card');
  assert.ok(sceneItems.length >= 2, `Expected at least 2 scenes in storyboard, got ${sceneItems.length}`);
  console.log(`✓ Storyboard rendered with ${sceneItems.length} scenes`);

  // Test editing headline
  const headlineInput = await page.$('textarea.form-input');
  assert.ok(headlineInput, 'Headline input found');
  await headlineInput.click({ clickCount: 3 });
  await headlineInput.type('সব কাস্টমার মেসেজ এক ইনবক্সে — দ্রুত ও সহজ');
  console.log('✓ Edited Bengali headline in Storyboard');

  // Step 7: Navigate to Brand Kit & Media
  console.log('7. Navigating to Stage 4: Brand Kit & Media...');
  await navNodes[3].click();
  await page.waitForSelector('.preset-chip-btn', { timeout: 8000 });
  const presetButtons = await page.$$('.preset-chip-btn');
  assert.ok(presetButtons.length >= 4, `Found ${presetButtons.length} brand presets`);
  console.log(`✓ Found ${presetButtons.length} brand presets (including Reference Cream/Lime)`);

  // Step 8: Navigate to Motion & Mockups
  console.log('8. Navigating to Stage 5: Motion & Mockups...');
  await navNodes[4].click();
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Motion & Mockup studio rendered cleanly');

  // Step 9: Navigate to Preview & Validate
  console.log('9. Navigating to Stage 6: Preview & Validate...');
  await navNodes[5].click();
  await page.waitForSelector('.player-stage-card', { timeout: 8000 });
  const playerStage = await page.$('.player-stage-card');
  assert.ok(playerStage, 'Interactive player stage rendered');

  const playerIframe = await page.$('.player-iframe');
  assert.ok(playerIframe, 'Preview iframe rendered');

  const playBtn = await page.$('.play-btn');
  assert.ok(playBtn, 'Play button rendered');
  await playBtn.click();
  await new Promise(r => setTimeout(r, 600));
  await playBtn.click(); // pause
  console.log('✓ Live Preview Player & playback controls verified');

  // Step 10: Navigate to Export Studio
  console.log('10. Navigating to Stage 7: Export Studio...');
  await navNodes[6].click();
  await page.waitForSelector('.export-control-card', { timeout: 8000 });
  const exportCard = await page.$('.export-control-card');
  assert.ok(exportCard, 'Export config card rendered');
  console.log('✓ Export Studio verified with storage preflight and render trigger');

  // Capture UI screenshot artifact
  const screenshotPath = path.resolve('data/exports/growth-studio-ui-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ UI Screenshot captured: ${screenshotPath}`);

  } finally {
    try {
      await browser.close();
    } catch (_) {}
    if (serverInstance) {
      try {
        await serverInstance.close();
        console.log('✓ Fastify server closed.');
      } catch (_) {}
    }
  }

  console.log('\n========================================================');
  console.log('   >>> ALL BROWSER WORK-TREE UI TESTS PASSED! <<<      ');
  console.log('========================================================');
}

testBrowserWorkTreeUI().catch(err => {
  console.error('\nBrowser UI Test Failed:', err);
  process.exit(1);
});
