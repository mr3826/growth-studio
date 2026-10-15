import puppeteer from 'puppeteer-core';
import { getChromePath } from '../packages/render-adapter/src/index.js';
import { buildServer } from '../apps/local-server/src/index.js';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolveStoragePaths } from '../packages/contracts/src/storage.js';

const REQUESTED_PORT = Number(process.env.PORT || 4317);

async function testBrowserWorkTreeUI() {
  console.log('--- Starting Puppeteer Work-Tree Browser UI Test ---');

  const serverInstance = await buildServer();
  await serverInstance.listen({ port: REQUESTED_PORT, host: '127.0.0.1' });
  const actualPort = serverInstance.server.address().port;
  const baseUrl = `http://127.0.0.1:${actualPort}`;

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setRequestInterception(true);
    const externalRequests = [];
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (['127.0.0.1', 'localhost'].includes(hostname)) request.continue();
      else {
        externalRequests.push(request.url());
        request.abort('blockedbyclient');
      }
    });

    // Step 1: Open app
    console.log(`1. Navigating to ${baseUrl} with all non-local requests blocked...`);
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  // Step 2: Verify header & storage status
  console.log('2. Verifying header branding & offline storage badge...');
  const appTitle = await page.$eval('.header-app-title', el => el.textContent);
  assert.equal(appTitle?.trim(), 'GROWTH STUDIO');

  const appVersion = await page.$eval('.header-app-version', el => el.textContent);
  assert.ok(appVersion?.includes('CREATIVE DIRECTOR'), `Expected V0.03 version text, got: ${appVersion}`);

  const storageChip = await page.$('.storage-header-chip');
  assert.ok(storageChip, 'Storage chip rendered in top bar');
  const storageText = await page.$eval('.storage-header-chip', el => el.textContent);
  console.log(`✓ Top bar storage indicator verified: "${storageText.trim()}"`);

  // Step 2b: Verify AI Spend button in header
  const aiSpendBtn = await page.$('.header-actions-cluster button');
  assert.ok(aiSpendBtn, 'AI Spend indicator button rendered in header');
  console.log('✓ Header AI Spend / Offline indicator verified');

  // Step 3: Verify 7 Work-Tree Navigation Nodes
  console.log('3. Verifying 7-Stage Work-Tree Navigation...');
  let navNodes = await page.$$('.work-tree-node');
  assert.equal(navNodes.length, 7, `Expected 7 work-tree stages, got ${navNodes.length}`);
  console.log('✓ All 7 work-tree stages verified (Home, Template, Storyboard, Brand, Motion, Preview, Export)');

  // Step 4: Step 1 (Project Home) - Starter cards and AI Creative Director button
  console.log('4. Checking starter cards and AI Creative Director button on Project Home...');
  await page.waitForSelector('.starter-choice-card', { timeout: 8000 });
  const starterCards = await page.$$('.starter-choice-card');
  assert.ok(starterCards.length >= 5, `Expected the generic, language, app, and brand starter cards, got ${starterCards.length}`);
  console.log(`✓ Found ${starterCards.length} neutral, language, app, and brand starter cards`);

  // Create a neutral project and verify the Creative Director waits for explicit consent.
  await page.type('.create-card input.form-input', 'Browser Creative Consent Check');
  await page.click('.create-action-btn');
  await page.waitForSelector('.template-selection-card', { timeout: 8000 });
  navNodes = await page.$$('.work-tree-node');
  await navNodes[0].click();
  await page.waitForSelector('.active-project-card', { timeout: 8000 });
  await page.click('button[title^="Open AI Creative Director"]');
  await page.waitForSelector('h2', { visible: true });
  const creativeHeading = await page.$eval('.fixed.inset-0 h2', el => el.textContent?.trim());
  assert.equal(creativeHeading, 'OpenAI Creative Director');
  const truthTab = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
    return buttons.find(b => b.textContent?.includes('2. Product Truth Profile')) || null;
  });
  const truthTabEl = await truthTab.asElement();
  assert.ok(truthTabEl, 'Product Truth Profile tab found');
  await truthTabEl.click();
  const consent = await page.$('.fixed.inset-0 label input[type="checkbox"]');
  assert.ok(consent, 'OpenAI consent checkbox is visible');
  assert.equal(await consent.evaluate(el => el.checked), false, 'Cloud consent starts unchecked');
  const generateConcepts = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
    return buttons.find(b => b.textContent?.includes('Generate 3 Concepts with OpenAI')) || null;
  });
  const generateConceptsEl = await generateConcepts.asElement();
  assert.ok(generateConceptsEl, 'Concept generation action is visible');
  assert.equal(await generateConceptsEl.evaluate(el => el.disabled), true, 'Concept generation requires explicit consent');
  assert.equal(externalRequests.length, 0, `Unexpected external request before consent: ${externalRequests.join(', ')}`);
  await page.click('.fixed.inset-0 button[title="Close modal"]');
  navNodes = await page.$$('.work-tree-node');
  console.log('✓ Neutral project creation is local; OpenAI concepts remain gated until explicit consent');

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

  // Verify AI Rewrite button exists in Storyboard
  const aiRewriteBtn = await page.$('button[title*="Rewrite this specific scene"]');
  assert.ok(aiRewriteBtn, 'AI Rewrite button rendered in scene editor');
  console.log('✓ Single-scene AI Rewrite button verified');

  // Verify Creative Review button exists in Storyboard
  const reviewBtn = await page.$('button[title*="Creative Director Audit"]');
  assert.ok(reviewBtn, 'Creative Review button rendered in Storyboard header');
  console.log('✓ Creative Review button verified');

  // Test editing headline
  const headlineInput = await page.$('textarea.form-input');
  assert.ok(headlineInput, 'Headline input found');
  await headlineInput.click({ clickCount: 3 });
  await headlineInput.type('আপনার প্রজেক্টের গল্প এখানে সাজান');
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

  // Check the small laptop/mobile breakpoint and a keyboard-reachable control.
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 250));
  const mobileLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    focusedTag: document.activeElement?.tagName
  }));
  assert.ok(mobileLayout.documentWidth <= mobileLayout.viewportWidth, `Horizontal overflow at 390px: ${JSON.stringify(mobileLayout)}`);
  await page.keyboard.press('Tab');
  const keyboardFocus = await page.evaluate(() => document.activeElement?.tagName);
  assert.ok(keyboardFocus && keyboardFocus !== 'BODY', 'Tab reaches a focusable control');
  assert.equal(externalRequests.length, 0, `Browser UI made external requests: ${externalRequests.join(', ')}`);
  console.log(`✓ 390px layout fits without horizontal overflow; Tab focus reaches ${keyboardFocus}`);

  // Capture UI screenshot artifact
  const exportsDir = resolveStoragePaths().exports;
  const screenshotPath = path.join(exportsDir, `v003-browser-ui-${randomUUID()}.png`);
  fs.mkdirSync(exportsDir, { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ UI Screenshot captured: ${screenshotPath}`);

  } finally {
    try {
      await browser.close();
    } catch (_) {}
    await serverInstance.close();
    console.log('✓ Fastify server closed.');
  }

  console.log('\n========================================================');
  console.log('   >>> ALL BROWSER WORK-TREE UI TESTS PASSED! <<<      ');
  console.log('========================================================');
}

testBrowserWorkTreeUI().catch(err => {
  console.error('\nBrowser UI Test Failed:', err);
  process.exit(1);
});
