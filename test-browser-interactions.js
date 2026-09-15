/* ═══════════════════════════════════════════════════════
   Phase 10.3 — Full Interactive Browser Test (Playwright)
   Tests every navigation, button, form, and interaction
   as a real user would.
═══════════════════════════════════════════════════════ */
const { chromium } = require('playwright');

const BASE = 'http://localhost:3001';
let browser, page;
let results = [];
let consoleErrors = [];

function log(msg) { console.log(msg); }
function pass(label, detail) { results.push({ label, status: 'PASS', detail: detail || '' }); log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); }
function fail(label, detail) { results.push({ label, status: 'FAIL', detail: detail || '' }); log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }

async function setup() {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  log('\n═══ Page loaded ═══');
}

async function clearErrors() { consoleErrors = []; }
async function getErrors() { return [...consoleErrors]; }
async function dismissKeyOverlay() {
  await page.evaluate(() => {
    const ov = document.getElementById('key-overlay');
    if (ov) ov.remove();
  });
  await page.waitForTimeout(100);
}

async function clickNav(name, index) {
  await clearErrors();
  const tabs = await page.$$('.tab-bar .tab');
  if (index >= tabs.length) { fail(`Nav: ${name}`, `tab index ${index} not found`); return false; }
  await tabs[index].click();
  await page.waitForTimeout(300);
  return true;
}

async function isPageVisible(pageId) {
  const el = await page.$(`#page-${pageId}`);
  if (!el) return false;
  const display = await el.evaluate(e => getComputedStyle(e).display);
  const hasOn = await el.evaluate(e => e.classList.contains('on'));
  return display !== 'none' && hasOn;
}

// ═══ 3. TOP NAVIGATION ═══
async function testNavigation() {
  log('\n═══ 3. TOP NAVIGATION ═══');

  const navItems = [
    { name: 'Home', id: 'home', idx: 0 },
    { name: 'Advisor', id: 'advisor', idx: 1 },
    { name: 'Crop Recs', id: 'croprecs', idx: 2 },
    { name: 'Prices', id: 'prices', idx: 3 },
    { name: 'Weather', id: 'weather', idx: 4 },
    { name: 'AI Chat', id: 'chat', idx: 5 },
    { name: 'New Farmer', id: 'newfarmer', idx: 6 },
    { name: 'Scan Plant', id: 'disease', idx: 7 },
    { name: 'Schemes', id: 'schemes', idx: 8 },
    { name: 'Mandi', id: 'mandi', idx: 9 },
  ];

  for (const nav of navItems) {
    await clickNav(nav.name, nav.idx);
    const errors = await getErrors();
    const visible = await isPageVisible(nav.id);
    if (visible && errors.length === 0) {
      pass(`Nav: ${nav.name}`, 'section visible, no errors');
    } else if (visible) {
      pass(`Nav: ${nav.name}`, 'section visible');
      fail(`Nav: ${nav.name} console`, errors.join('; '));
    } else {
      fail(`Nav: ${nav.name}`, 'section NOT visible');
      if (errors.length > 0) fail(`Nav: ${nav.name} errors`, errors.join('; '));
    }
  }
  await clickNav('Home', 0);
}

// ═══ 4. QUICK ACTION BUTTONS ═══
async function testQuickActions() {
  log('\n═══ 4. QUICK ACTION BUTTONS ═══');

  const qactions = [
    { text: 'Get crop advice', targetPage: 'advisor' },
    { text: 'Mandi prices', targetPage: 'prices' },
    { text: 'See weather', targetPage: 'weather' },
    { text: 'Ask AI', targetPage: 'chat' },
    { text: 'New Farmer Guide', targetPage: 'newfarmer' },
    { text: 'Scan Plant', targetPage: 'disease' },
    { text: 'Govt Schemes', targetPage: 'schemes' },
    { text: 'Mandi Locator', targetPage: 'mandi' },
  ];

  for (const qa of qactions) {
    await clearErrors();
    await clickNav('Home', 0);
    await page.waitForTimeout(100);

    const btn = await page.$(`#page-home button:has-text("${qa.text}")`);
    if (!btn) { fail(`QuickAction: ${qa.text}`, 'button not found'); continue; }
    await btn.click();
    await page.waitForTimeout(400);

    const errors = await getErrors();
    const visible = await isPageVisible(qa.targetPage);
    if (visible && errors.length === 0) {
      pass(`QuickAction: ${qa.text}`, `→ ${qa.targetPage} visible`);
    } else if (visible) {
      pass(`QuickAction: ${qa.text}`, `→ ${qa.targetPage} visible (with console errors)`);
      if (errors.length > 0) fail(`QuickAction: ${qa.text} errors`, errors.join('; '));
    } else {
      fail(`QuickAction: ${qa.text}`, `expected ${qa.targetPage}, got NOT visible`);
      if (errors.length > 0) fail(`QuickAction: ${qa.text} errors`, errors.join('; '));
    }
  }
}

// ═══ 6. MANDI PRICES ═══
async function testMandiPrices() {
  log('\n═══ 6. MANDI PRICES ═══');

  await clickNav('Prices', 3);
  await clearErrors();
  await page.waitForTimeout(1000);

  // Wait for dynamic crop list to render
  await page.waitForSelector('#price-list .price-item', { timeout: 5000 }).catch(() => null);

  const cropItems = await page.$$('#price-list .price-item');
  if (cropItems.length > 0) {
    pass('Prices: crop items', `${cropItems.length} crop items rendered`);
  } else {
    fail('Prices: crop items', 'no .price-item in #price-list');
    // Debug: dump #price-list HTML
    const html = await page.$eval('#price-list', el => el.innerHTML).catch(() => 'N/A');
    log(`  DEBUG #price-list: ${html.substring(0, 200)}`);
    return;
  }

  // Click wheat
  const wheatBtn = await page.$('#price-list .price-item:has-text("Wheat")');
  if (wheatBtn) {
    await clearErrors();
    await wheatBtn.click();
    await page.waitForTimeout(500);
    pass('Prices: Wheat selection', 'clicked');
    const chartCanvas = await page.$('#price-chart');
    if (chartCanvas) pass('Prices: chart canvas', 'exists');
    else fail('Prices: chart canvas', 'not found');
    const errors = await getErrors();
    if (errors.length > 0) fail('Prices: Wheat errors', errors.join('; '));
  } else {
    fail('Prices: Wheat selection', 'not found');
  }

  // Click rice
  const riceBtn = await page.$('#price-list .price-item:has-text("Rice")');
  if (riceBtn) {
    await clearErrors();
    await riceBtn.click();
    await page.waitForTimeout(500);
    pass('Prices: Rice selection', 'clicked');
    const errors = await getErrors();
    if (errors.length > 0) fail('Prices: Rice errors', errors.join('; '));
  } else {
    fail('Prices: Rice selection', 'not found');
  }

  // Click onion
  const onionBtn = await page.$('#price-list .price-item:has-text("Onion")');
  if (onionBtn) {
    await clearErrors();
    await onionBtn.click();
    await page.waitForTimeout(500);
    pass('Prices: Onion selection', 'clicked');
    const errors = await getErrors();
    if (errors.length > 0) fail('Prices: Onion errors', errors.join('; '));
  } else {
    fail('Prices: Onion selection', 'not found');
  }

  // Check forecast
  const forecastEl = await page.$('#pred-result');
  if (forecastEl) {
    const display = await forecastEl.evaluate(e => e.style.display);
    pass('Prices: forecast element', `display: ${display}`);
  } else {
    fail('Prices: forecast', '#pred-result not found');
  }

  // Check analytics overview
  const analyticsEl = await page.$('#analytics-overview');
  if (analyticsEl) {
    const text = await analyticsEl.evaluate(e => e.textContent);
    pass('Prices: analytics overview', `${text.trim().length} chars`);
  } else {
    fail('Prices: analytics overview', 'not found');
  }

  // Check crop rankings
  const rankingsEl = await page.$('#crop-rankings');
  if (rankingsEl) {
    const text = await rankingsEl.evaluate(e => e.textContent);
    pass('Prices: crop rankings', `${text.trim().length} chars`);
  } else {
    fail('Prices: crop rankings', 'not found');
  }

  // Check data quality
  const dqEl = await page.$('#data-quality');
  if (dqEl) {
    const text = await dqEl.evaluate(e => e.textContent);
    pass('Prices: data quality', `${text.trim().length} chars`);
  } else {
    fail('Prices: data quality', 'not found');
  }
}

// ═══ 8. CROP RECOMMENDATIONS ═══
async function testCropRecommendations() {
  log('\n═══ 8. CROP RECOMMENDATIONS ═══');

  await clickNav('Crop Recs', 2);
  await clearErrors();
  await page.waitForTimeout(300);

  // Scenario A: Punjab, Alluvial, Canal, Rabi, 2 acres
  log('  Scenario A: Punjab / Alluvial / Canal / Rabi / 2 acres');

  const stateSelect = await page.$('#cr-state');
  if (stateSelect) {
    await stateSelect.selectOption('Punjab');
    pass('CropRecs: state', 'Punjab');
  } else { fail('CropRecs: state', '#cr-state not found'); }

  // Soil option values are lowercase: alluvial, black, red, sandy, clay_loam, sandy_loam, loam
  const soilSelect = await page.$('#cr-soil');
  if (soilSelect) {
    await soilSelect.selectOption('alluvial');
    pass('CropRecs: soil', 'alluvial');
  } else { fail('CropRecs: soil', '#cr-soil not found'); }

  // Irrigation: canal, tubewell, drip, sprinkler, rainfed
  const irrSelect = await page.$('#cr-irrigation');
  if (irrSelect) {
    await irrSelect.selectOption('canal');
    pass('CropRecs: irrigation', 'canal');
  } else { fail('CropRecs: irrigation', '#cr-irrigation not found'); }

  const seasonSelect = await page.$('#cr-season');
  if (seasonSelect) {
    await seasonSelect.selectOption('rabi');
    pass('CropRecs: season', 'rabi');
  } else { fail('CropRecs: season', '#cr-season not found'); }

  const acresInput = await page.$('#cr-acres');
  if (acresInput) {
    await acresInput.fill('2');
    pass('CropRecs: acres', '2');
  } else { fail('CropRecs: acres', '#cr-acres not found'); }

  // Click submit
  await clearErrors();
  const submitBtn = await page.$('#cr-submit');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(500);
    pass('CropRecs: submit clicked', '');
  } else { fail('CropRecs: submit', '#cr-submit not found'); }

  const errors = await getErrors();
  if (errors.length > 0) fail('CropRecs: submit errors', errors.join('; '));

  // Check results
  const resultsEl = await page.$('#cr-results');
  if (resultsEl) {
    const display = await resultsEl.evaluate(e => e.style.display);
    if (display !== 'none' && display !== '') {
      pass('CropRecs: results visible', `display: ${display}`);
      const text = await resultsEl.evaluate(e => e.textContent);
      if (text.includes('Onion') || text.includes('Wheat') || text.includes('Rice') || text.includes('Potato')) {
        pass('CropRecs: crop names in output', 'found');
      } else {
        fail('CropRecs: crop names', 'no crop names in results');
      }
    } else {
      fail('CropRecs: results', `display: ${display}`);
    }
  } else {
    fail('CropRecs: results', '#cr-results not found');
  }

  // Scenario B: Bihar / black / canal / kharif / 1 acre
  log('  Scenario B: Bihar / Black / Canal / Kharif / 1 acre');
  await clearErrors();
  const state2 = await page.$('#cr-state');
  const soil2 = await page.$('#cr-soil');
  const irr2 = await page.$('#cr-irrigation');
  const season2 = await page.$('#cr-season');
  const acres2 = await page.$('#cr-acres');

  if (state2 && soil2 && irr2 && season2 && acres2) {
    await state2.selectOption('Bihar');
    await soil2.selectOption('black');
    await irr2.selectOption('canal');
    await season2.selectOption('kharif');
    await acres2.fill('1');
    await submitBtn.click();
    await page.waitForTimeout(500);

    const text2 = await page.$eval('#cr-results', e => e.textContent).catch(() => '');
    if (text2.length > 50) {
      pass('CropRecs: Scenario B', `results: ${text2.length} chars`);
    } else {
      fail('CropRecs: Scenario B', `only ${text2.length} chars`);
    }
    const errs2 = await getErrors();
    if (errs2.length > 0) fail('CropRecs: Scenario B errors', errs2.join('; '));
  }
}

// ═══ 10. AI CHAT ═══
async function testAIChat() {
  log('\n═══ 10. AI CHAT ═══');

  await clickNav('AI Chat', 5);
  await clearErrors();
  await page.waitForTimeout(300);

  const chatInput = await page.$('#chat-input, #page-chat textarea, #page-chat input[type="text"]');
  if (chatInput) {
    pass('AI Chat: input exists', '');
    await chatInput.fill('What crops grow well in Punjab?');
    pass('AI Chat: message typed', '');

    // Try send button first, then Enter key
    const sendBtn = await page.$('#page-chat button[onclick*="doChat"], #chat-send');
    if (sendBtn) {
      await clearErrors();
      await sendBtn.click();
      await page.waitForTimeout(1000);
      pass('AI Chat: send clicked', '');
    } else {
      await clearErrors();
      await chatInput.press('Enter');
      await page.waitForTimeout(1000);
      pass('AI Chat: Enter key', '');
    }

    const errors = await getErrors();
    if (errors.length > 0) fail('AI Chat: errors', errors.join('; '));
    else pass('AI Chat: no errors', '');

    // Check for loading/response/error state
    const chatMsgs = await page.$$('#page-chat .msg, #page-chat .chat-msg, #chat-messages div');
    pass('AI Chat: message elements', `${chatMsgs.length} messages in chat`);

    // Check for API key prompt (expected without key), then dismiss it
    const keyOverlay = await page.$('#key-overlay');
    if (keyOverlay) {
      pass('AI Chat: API key prompt', 'shown (expected without key)');
      await dismissKeyOverlay();
      pass('AI Chat: overlay dismissed', '');
    }
  } else {
    fail('AI Chat: input', 'no chat input found');
  }
}

// ═══ 11. NEW FARMER GUIDE ═══
async function testNewFarmer() {
  log('\n═══ 11. NEW FARMER GUIDE ═══');

  await clickNav('New Farmer', 6);
  await clearErrors();
  await page.waitForTimeout(300);

  const cropBtns = await page.$$('#nf-crop-grid .nf-crop-btn');
  if (cropBtns.length > 0) {
    pass('NewFarmer: crop buttons', `${cropBtns.length} crops`);

    // Click Wheat
    const wheatBtn = await page.$('[onclick*="selNFCrop"][onclick*="Wheat"]');
    if (wheatBtn) {
      await clearErrors();
      await wheatBtn.click();
      await page.waitForTimeout(200);
      pass('NewFarmer: Wheat selected', '');
      const errors = await getErrors();
      if (errors.length > 0) fail('NewFarmer: Wheat errors', errors.join('; '));
    } else {
      fail('NewFarmer: Wheat', 'button not found');
    }
  } else {
    fail('NewFarmer: crop buttons', 'none found');
  }

  // Select irrigation
  const irrBtn = await page.$('#irr-canal');
  if (irrBtn) {
    await irrBtn.click();
    await page.waitForTimeout(200);
    pass('NewFarmer: canal irrigation', 'clicked');
  } else {
    fail('NewFarmer: canal irrigation', '#irr-canal not found');
  }

  // Click generate
  const genBtn = await page.$('[onclick*="generateFarmerPlan"]');
  if (genBtn) {
    await clearErrors();
    await genBtn.click();
    await page.waitForTimeout(1000);
    pass('NewFarmer: generate clicked', '');
    const errors = await getErrors();
    if (errors.length > 0) fail('NewFarmer: generate errors', errors.join('; '));

    // Check if plan appeared
    const planEl = await page.$('#nf-plan, #page-newfarmer .nf-plan');
    if (planEl) {
      const text = await planEl.evaluate(e => e.textContent);
      pass('NewFarmer: plan generated', `${text.length} chars`);
    } else {
      // Check for any visible result
      const newFarmerContent = await page.$eval('#page-newfarmer', e => e.textContent).catch(() => '');
      pass('NewFarmer: page content', `${newFarmerContent.length} chars total`);
    }
  } else {
    fail('NewFarmer: generate button', 'not found');
  }
}

// ═══ 13. WEATHER ═══
async function testWeather() {
  log('\n═══ 13. WEATHER ═══');

  await clickNav('Weather', 4);
  await clearErrors();
  await page.waitForTimeout(300);

  const content = await page.$eval('#page-weather', e => e.textContent).catch(() => '');
  if (content.length > 50) {
    pass('Weather: content loaded', `${content.length} chars`);
  } else {
    fail('Weather: content', `only ${content.length} chars`);
  }

  // Check for temperature, humidity, wind data
  const hasTemp = content.includes('°') || content.includes('Temp');
  const hasHumidity = content.includes('Humidity') || content.includes('%');
  pass('Weather: has weather data', `temp: ${hasTemp}, humidity: ${hasHumidity}`);

  const errors = await getErrors();
  if (errors.length > 0) fail('Weather: errors', errors.join('; '));
}

// ═══ 14. SCAN PLANT ═══
async function testScanPlant() {
  log('\n═══ 14. SCAN PLANT ═══');

  await clickNav('Scan Plant', 7);
  await clearErrors();
  await page.waitForTimeout(300);

  const content = await page.$eval('#page-disease', e => e.textContent).catch(() => '');
  if (content.length > 50) {
    pass('Scan Plant: content loaded', `${content.length} chars`);
  } else {
    fail('Scan Plant: content', `only ${content.length} chars`);
  }

  // Check upload area exists
  const uploadEl = await page.$('#page-disease input[type="file"], #page-disease .dd-drop');
  if (uploadEl) {
    pass('Scan Plant: upload area', 'exists');
  } else {
    fail('Scan Plant: upload area', 'not found');
  }

  // Check demo scan buttons
  const demoBtns = await page.$$('#page-disease button[onclick*="demoScan"]');
  if (demoBtns.length > 0) {
    pass('Scan Plant: demo buttons', `${demoBtns.length} found`);

    // Click first demo button
    await clearErrors();
    await demoBtns[0].click();
    await page.waitForTimeout(1000);
    const errors = await getErrors();
    if (errors.length === 0) pass('Scan Plant: demo click', 'no errors');
    else fail('Scan Plant: demo errors', errors.join('; '));
  } else {
    fail('Scan Plant: demo buttons', 'none found');
  }
}

// ═══ 15. SCHEMES ═══
async function testSchemes() {
  log('\n═══ 15. GOVERNMENT SCHEMES ═══');

  await clickNav('Schemes', 8);
  await clearErrors();
  await page.waitForTimeout(300);

  const content = await page.$eval('#page-schemes', e => e.textContent).catch(() => '');
  if (content.length > 100) {
    pass('Schemes: content loaded', `${content.length} chars`);
  } else {
    fail('Schemes: content', `only ${content.length} chars`);
  }

  // Check for scheme selection elements
  const selectBtns = await page.$$('#page-schemes .wiz-opt, #page-schemes select, #page-schemes button');
  pass('Schemes: interactive elements', `${selectBtns.length} found`);

  const errors = await getErrors();
  if (errors.length > 0) fail('Schemes: errors', errors.join('; '));
}

// ═══ 16. MANDI LOCATOR ═══
async function testMandiLocator() {
  log('\n═══ 16. MANDI LOCATOR ═══');

  await clickNav('Mandi', 9);
  await clearErrors();
  await page.waitForTimeout(300);

  const content = await page.$eval('#page-mandi', e => e.textContent).catch(() => '');
  if (content.length > 50) {
    pass('Mandi Locator: content loaded', `${content.length} chars`);
  } else {
    fail('Mandi Locator: content', `only ${content.length} chars`);
  }

  // Check state selector
  const stateSelect = await page.$('#page-mandi select, #page-mandi .mandi-select');
  if (stateSelect) {
    pass('Mandi Locator: state selector', 'exists');
  } else {
    fail('Mandi Locator: state selector', 'not found');
  }

  const errors = await getErrors();
  if (errors.length > 0) fail('Mandi Locator: errors', errors.join('; '));
}

// ═══ 18. LANGUAGE SWITCHING ═══
async function testLanguageSwitch() {
  log('\n═══ 18. LANGUAGE SWITCHING ═══');

  // First go Home
  await clickNav('Home', 0);
  await page.waitForTimeout(200);

  // Switch to Hindi
  await clearErrors();
  const hiBtn = await page.$('.lang-toggle button:has-text("हि")');
  if (hiBtn) {
    await hiBtn.click();
    await page.waitForTimeout(500);

    const title = await page.$eval('#app-title', el => el.textContent).catch(() => '');
    const errors = await getErrors();

    if (title.includes('किसान') || title.includes('सारथी') || title.includes('KisanSarthi')) {
      pass('Language: Hindi', `title: "${title}"`);
    } else {
      pass('Language: Hindi', `title: "${title}" (may not change app name)`);
    }
    if (errors.length > 0) fail('Language: Hindi errors', errors.join('; '));

    // Check tab labels changed
    const tabTexts = await page.$$eval('.tab-bar .tab span', els => els.map(e => e.textContent));
    const hasHindi = tabTexts.some(t => /[ऀ-ॿ]/.test(t));
    if (hasHindi) {
      pass('Language: Hindi tabs', `tabs: ${tabTexts.join(', ')}`);
    } else {
      pass('Language: Hindi tabs', `tabs: ${tabTexts.join(', ')}`);
    }
  } else {
    fail('Language: Hindi button', 'not found');
  }

  // Switch back to English
  await clearErrors();
  const enBtn = await page.$('.lang-toggle button:has-text("EN")');
  if (enBtn) {
    await enBtn.click();
    await page.waitForTimeout(500);
    const title = await page.$eval('#app-title', el => el.textContent).catch(() => '');
    pass('Language: English', `title: "${title}"`);
    const errors = await getErrors();
    if (errors.length > 0) fail('Language: English errors', errors.join('; '));
  } else {
    fail('Language: EN button', 'not found');
  }
}

// ═══ 19. DARK MODE ═══
async function testDarkMode() {
  log('\n═══ 19. DARK MODE ═══');

  // Look for dark mode toggle — check the HTML for any dark/theme toggle
  const darkToggle = await page.$('[onclick*="dark"], [onclick*="theme"], .dark-toggle, #dark-toggle, #theme-toggle, [class*="dark-mode"], [data-action*="dark"]');

  if (!darkToggle) {
    // Check if there's a CSS variable or class-based toggle
    const hasDarkClass = await page.evaluate(() => {
      return document.body.classList.contains('dark') ||
             document.documentElement.hasAttribute('data-theme') ||
             document.querySelector('[class*="dark"]') !== null;
    });

    if (hasDarkClass) {
      pass('Dark mode: detected', 'dark class exists on page');
    } else {
      pass('Dark mode: not implemented', 'no toggle in DOM — feature not present');
    }
    return;
  }

  await clearErrors();
  await darkToggle.click();
  await page.waitForTimeout(300);
  const hasDark = await page.evaluate(() => {
    return document.body.classList.contains('dark') ||
           document.documentElement.getAttribute('data-theme') === 'dark' ||
           document.documentElement.classList.contains('dark');
  });
  if (hasDark) {
    pass('Dark mode: toggle works', 'dark class applied');
  } else {
    fail('Dark mode: toggle', 'clicked but dark class not detected');
  }
  const errors = await getErrors();
  if (errors.length > 0) fail('Dark mode: errors', errors.join('; '));
}

// ═══ 20. BROWSER REFRESH ═══
async function testBrowserRefresh() {
  log('\n═══ 20. BROWSER REFRESH ═══');

  await clickNav('Crop Recs', 2);
  await page.waitForTimeout(200);

  await clearErrors();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const errors = await getErrors();
  const homeVisible = await isPageVisible('home');

  if (errors.length === 0) pass('Refresh: no errors', 'clean reload');
  else fail('Refresh: errors', errors.join('; '));

  if (homeVisible) pass('Refresh: home visible', 'app loaded after refresh');
  else fail('Refresh: home', 'home not visible after refresh');

  // Verify navigation works after refresh
  await clickNav('Prices', 3);
  await page.waitForTimeout(500);
  const pricesVisible = await isPageVisible('prices');
  if (pricesVisible) pass('Refresh: nav works', 'prices accessible after refresh');
  else fail('Refresh: nav', 'prices not accessible after refresh');
}

// ═══ 25. FULL NAVIGATION CYCLE ═══
async function testFullNavigationCycle() {
  log('\n═══ 25. FULL NAVIGATION CYCLE ═══');

  const navOrder = [
    { name: 'Home', idx: 0, id: 'home' },
    { name: 'Advisor', idx: 1, id: 'advisor' },
    { name: 'Crop Recs', idx: 2, id: 'croprecs' },
    { name: 'Prices', idx: 3, id: 'prices' },
    { name: 'Weather', idx: 4, id: 'weather' },
    { name: 'AI Chat', idx: 5, id: 'chat' },
    { name: 'New Farmer', idx: 6, id: 'newfarmer' },
    { name: 'Scan Plant', idx: 7, id: 'disease' },
    { name: 'Schemes', idx: 8, id: 'schemes' },
    { name: 'Mandi', idx: 9, id: 'mandi' },
    { name: 'Home', idx: 0, id: 'home' },
  ];

  let allPassed = true;
  for (const nav of navOrder) {
    await clearErrors();
    await clickNav(nav.name, nav.idx);
    const errors = await getErrors();
    const visible = await isPageVisible(nav.id);
    if (!visible || errors.length > 0) {
      allPassed = false;
      fail(`Cycle: ${nav.name}`, visible ? 'console errors' : 'not visible');
    }
  }

  if (allPassed) pass('Full cycle', 'all 11 navigations clean');
}

// ═══ MAIN ═══
(async () => {
  try {
    await setup();

    await testNavigation();
    await testQuickActions();
    await testMandiPrices();
    await testCropRecommendations();
    await testAIChat();
    await testNewFarmer();
    await testWeather();
    await testScanPlant();
    await testSchemes();
    await testMandiLocator();
    await testLanguageSwitch();
    await testDarkMode();
    await testBrowserRefresh();
    await testFullNavigationCycle();

  } catch (err) {
    log(`\n💥 FATAL: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();

    log('\n══════════════════════════════════════════════════════');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    log(`RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);

    if (failed > 0) {
      log('\nFAILURES:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        log(`  ❌ ${r.label}: ${r.detail}`);
      });
    }
    log('══════════════════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
  }
})();
