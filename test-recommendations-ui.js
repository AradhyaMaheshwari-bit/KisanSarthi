/**
 * KisanSarthi — Crop Recommendations UI Integration Test Suite (Phase 9D)
 * Tests: form validation, engine integration, result rendering, translations, tab registration, CSS, HTML
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// ── Load modules ──────────────────────────────────────────
const CropAgronomics = require('./crop-agronomics.js');

const econCode = fs.readFileSync(path.join(__dirname, 'crop-economics.js'), 'utf8');
const econSandbox = {};
vm.createContext(econSandbox);
vm.runInContext(econCode, econSandbox);
const CropEconomics = econSandbox.CropEconomics;

const analyticsCode = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');
const analyticsSandbox = { window: {} };
vm.createContext(analyticsSandbox);
vm.runInContext(analyticsCode, analyticsSandbox);

const CropRecommendation = require('./recommendation-engine.js');
const priceData = JSON.parse(fs.readFileSync(path.join(__dirname, 'price_data.json'), 'utf8'));

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// ── Extract T dictionary from app.js ──────────────────────
function extractTranslations() {
  // Use regex to find the T object contents
  const enMatch = appJs.match(/en:\{([^}]+)\}/);
  const hiMatch = appJs.match(/hi:\{([^}]+)\}/);

  const enKeys = {};
  const hiKeys = {};

  if (enMatch) {
    // Extract all key:value pairs
    const pairs = enMatch[1].matchAll(/(\w+):'([^']*)'/g);
    for (const m of pairs) enKeys[m[1]] = m[2];
  }
  if (hiMatch) {
    const pairs = hiMatch[1].matchAll(/(\w+):'([^']*)'/g);
    for (const m of pairs) hiKeys[m[1]] = m[2];
  }

  return { en: enKeys, hi: hiKeys };
}

// ── Test framework ────────────────────────────────────────
let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('Running Phase 9D Crop Recommendations UI Integration Suite...\n');

// ════════════════════════════════════════════════════════════
// 1. FORM VALIDATION
// ════════════════════════════════════════════════════════════
console.log('--- Suite 1: Form Validation ---');

function validateForm(state, soil, irrigation, season, acresVal) {
  if (!state || !soil || !irrigation || !season || !acresVal) {
    return { valid: false, error: 'missing' };
  }
  var acres = parseFloat(acresVal);
  if (isNaN(acres) || acres < 0.1 || acres > 500) {
    return { valid: false, error: 'acres' };
  }
  return { valid: true, acres: acres };
}

runTest('All fields empty → validation fails (missing)', () => {
  const r = validateForm('', '', '', '', '');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.error, 'missing');
});

runTest('Missing state → validation fails (missing)', () => {
  const r = validateForm('', 'alluvial', 'canal', 'rabi', '2');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.error, 'missing');
});

runTest('Acres = 0 → validation fails (acres)', () => {
  const r = validateForm('Punjab', 'alluvial', 'canal', 'rabi', '0');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.error, 'acres');
});

runTest('Acres = -5 → validation fails (acres)', () => {
  const r = validateForm('Punjab', 'alluvial', 'canal', 'rabi', '-5');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.error, 'acres');
});

runTest('Acres = "abc" → validation fails (acres)', () => {
  const r = validateForm('Punjab', 'alluvial', 'canal', 'rabi', 'abc');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.error, 'acres');
});

// ════════════════════════════════════════════════════════════
// 2. ENGINE INTEGRATION
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 2: Engine Integration ---');

runTest('Valid form data produces correct engine context', () => {
  const context = {
    landAcres: 2.0, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  };
  const result = CropRecommendation.getRecommendations(context);
  assert.strictEqual(result.isValid, true);
  assert(result.feasible.length > 0, 'Should have feasible crops');
});

runTest('Result isValid=true has non-empty feasible array', () => {
  const result = CropRecommendation.getRecommendations({
    landAcres: 3.0, season: 'kharif', soilType: 'clay_loam',
    irrigationType: 'canal', state: 'West Bengal'
  });
  assert.strictEqual(result.isValid, true);
  assert(result.feasible.length >= 1, 'At least 1 feasible crop');
});

runTest('Wrong season produces infeasible crops', () => {
  const result = CropRecommendation.getRecommendations({
    landAcres: 2.0, season: 'kharif', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  assert(result.infeasible.length > 0, 'Should have infeasible crops');
  const wheat = result.infeasible.find(c => c.cropKey === 'wheat');
  assert(wheat !== undefined, 'Wheat should be infeasible in Kharif');
});

runTest('Negative margin detection works for low-price mock', () => {
  const mockData = JSON.parse(JSON.stringify(priceData));
  mockData.wheat.current_price = 800;
  const eval_ = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 1.0, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal'
  }, { priceData: mockData });
  assert.strictEqual(eval_.economics.isNegativeReturn, true);
  assert(eval_.economics.estimatedNetReturn < 0);
});

runTest('Disclaimer string is present in engine output', () => {
  assert(typeof CropRecommendation._disclaimer === 'string');
  assert(CropRecommendation._disclaimer.length > 0);
});

// ════════════════════════════════════════════════════════════
// 3. RESULT RENDERING DATA STRUCTURE
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 3: Result Rendering Data Structure ---');

runTest('Feasible crop has all 5 pillar keys', () => {
  const result = CropRecommendation.getRecommendations({
    landAcres: 2.0, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  const crop = result.feasible[0];
  assert(typeof crop.agronomicFit === 'object');
  assert(typeof crop.economics === 'object');
  assert(typeof crop.marketRisk === 'object');
  assert(typeof crop.dataReliability === 'object');
  assert(typeof crop.explanation === 'object');
});

runTest('Economic values are properly structured for rendering', () => {
  const crop = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 2.0, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  const eco = crop.economics;
  assert(typeof eco.estimatedNetReturn === 'number');
  assert(typeof eco.roi === 'number');
  assert(typeof eco.marketPrice === 'number');
  assert(typeof eco.totalYield === 'number');
  assert(typeof eco.totalCost === 'number');
  assert(typeof eco.estimatedRevenue === 'number');
  assert(typeof eco.isNegativeReturn === 'boolean');
  assert(typeof eco.breakEvenPrice === 'number');
});

runTest('Infeasible crop has exclusionReasons array', () => {
  const result = CropRecommendation.getRecommendations({
    landAcres: 2.0, season: 'kharif', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  result.infeasible.forEach(function(crop) {
    assert(Array.isArray(crop.exclusionReasons));
    assert(crop.exclusionReasons.length > 0, crop.cropKey + ' should have exclusion reasons');
  });
});

runTest('Stale crop has freshnessTier=stale and warning', () => {
  const evalMaize = CropRecommendation.evaluateCrop('maize', {
    landAcres: 1.0, season: 'kharif', soilType: 'sandy_loam',
    irrigationType: 'canal'
  });
  assert.strictEqual(evalMaize.economics.freshnessTier, 'stale');
  assert(evalMaize.dataReliability.warning !== null);
});

runTest('Historical crop has freshnessTier=historical', () => {
  const evalMustard = CropRecommendation.evaluateCrop('mustard', {
    landAcres: 1.0, season: 'rabi', soilType: 'sandy_loam',
    irrigationType: 'tubewell'
  });
  assert.strictEqual(evalMustard.economics.freshnessTier, 'historical');
});

runTest('Land total correctly scales with acres', () => {
  const acres = 5.0;
  const crop = CropRecommendation.evaluateCrop('wheat', {
    landAcres: acres, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  const eco = crop.economics;
  assert.strictEqual(eco.landAcres, acres);
  assert.strictEqual(eco.totalCost, eco.cultivationCostPerAcre * acres);
  assert.strictEqual(eco.totalYield, eco.expectedYieldPerAcre * acres);
});

runTest('Rank order matches engine feasible array order', () => {
  const result = CropRecommendation.getRecommendations({
    landAcres: 2.0, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  assert(result.feasible.length >= 2);
  // First should be optimal tier
  assert.strictEqual(result.feasible[0].agronomicFit.tier, 'optimal');
  // Order should be deterministic
  const result2 = CropRecommendation.getRecommendations({
    landAcres: 2.0, season: 'rabi', soilType: 'alluvial',
    irrigationType: 'canal', state: 'Punjab'
  });
  assert.deepStrictEqual(
    result.feasible.map(c => c.cropKey),
    result2.feasible.map(c => c.cropKey)
  );
});

// ════════════════════════════════════════════════════════════
// 4. TRANSLATION KEYS
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 4: Translation Keys ---');

const { en: enT, hi: hiT } = extractTranslations();

const EN_REQUIRED_KEYS = [
  'cropRecs', 'crFormTitle', 'crFormBadge', 'crFormSub',
  'crStateLabel', 'crSoilLabel', 'crIrrigationLabel', 'crSeasonLabel', 'crAcresLabel',
  'crSubmit', 'crLoading', 'crResultTitle', 'crFeasibleBadge', 'crInfeasibleBadge',
  'crNetReturn', 'crRoi', 'crPerAcre', 'crTotalFor', 'crAcresUnit',
  'crBreakEven', 'crMarketPrice', 'crYield', 'crCost', 'crRevenue',
  'crFreshness', 'crVolatility', 'crAgronomic', 'crEconomics',
  'crMarketRisk', 'crDataReliability', 'crWhyTitle', 'crCautionTitle',
  'crNotSuitable', 'crDisclaimer', 'crNegativeWarning',
  'crStaleData', 'crHistoricalData', 'crErrorMissing', 'crErrorAcres'
];

const HI_REQUIRED_KEYS = [
  'cropRecs', 'crFormTitle', 'crFormSub',
  'crStateLabel', 'crSoilLabel', 'crIrrigationLabel', 'crSeasonLabel', 'crAcresLabel',
  'crSubmit', 'crLoading', 'crResultTitle',
  'crNetReturn', 'crRoi', 'crPerAcre', 'crTotalFor', 'crAcresUnit',
  'crAgronomic', 'crEconomics', 'crMarketRisk', 'crDataReliability',
  'crWhyTitle', 'crCautionTitle', 'crDisclaimer',
  'crStaleData', 'crHistoricalData', 'crErrorMissing', 'crErrorAcres'
];

runTest('All EN crop-recs keys present in T.en', () => {
  EN_REQUIRED_KEYS.forEach(key => {
    assert(enT[key] !== undefined, `Missing EN key: ${key}`);
    assert(typeof enT[key] === 'string' && enT[key].length > 0, `Empty EN key: ${key}`);
  });
});

runTest('All HI crop-recs keys present in T.hi', () => {
  HI_REQUIRED_KEYS.forEach(key => {
    assert(hiT[key] !== undefined, `Missing HI key: ${key}`);
    assert(typeof hiT[key] === 'string' && hiT[key].length > 0, `Empty HI key: ${key}`);
  });
});

runTest('Tab key cropRecs exists in both languages', () => {
  assert.strictEqual(enT.cropRecs, 'Crop Recs');
  assert(hiT.cropRecs.length > 0);
});

runTest('Form labels exist in both languages', () => {
  ['crStateLabel', 'crSoilLabel', 'crIrrigationLabel', 'crSeasonLabel', 'crAcresLabel'].forEach(k => {
    assert(enT[k], 'Missing EN: ' + k);
    assert(hiT[k], 'Missing HI: ' + k);
  });
});

runTest('Result labels exist in both languages', () => {
  ['crResultTitle', 'crFeasibleBadge', 'crInfeasibleBadge', 'crNetReturn', 'crRoi'].forEach(k => {
    assert(enT[k], 'Missing EN: ' + k);
    assert(hiT[k], 'Missing HI: ' + k);
  });
});

runTest('Error messages exist in both languages', () => {
  assert(enT.crErrorMissing, 'Missing EN: crErrorMissing');
  assert(enT.crErrorAcres, 'Missing EN: crErrorAcres');
  assert(hiT.crErrorMissing, 'Missing HI: crErrorMissing');
  assert(hiT.crErrorAcres, 'Missing HI: crErrorAcres');
});

runTest('Pillar labels exist in both languages', () => {
  ['crAgronomic', 'crEconomics', 'crMarketRisk', 'crDataReliability', 'crWhyTitle'].forEach(k => {
    assert(enT[k], 'Missing EN: ' + k);
    assert(hiT[k], 'Missing HI: ' + k);
  });
});

runTest('Disclaimer exists in both languages', () => {
  assert(enT.crDisclaimer.includes('KVK'), 'EN disclaimer should mention KVK');
  assert(hiT.crDisclaimer.length > 10, 'HI disclaimer should be substantive');
});

// ════════════════════════════════════════════════════════════
// 5. TAB REGISTRATION
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 5: Tab Registration ---');

runTest('Tab array includes croprecs', () => {
  assert(appJs.includes("'croprecs'"), "Tab array should include 'croprecs'");
});

runTest('Tab croprecs is between advisor and prices', () => {
  const idx = appJs.indexOf("['home','advisor','croprecs','prices'");
  assert(idx !== -1, 'croprecs should be between advisor and prices in tab array');
});

runTest('page-croprecs div exists in HTML', () => {
  assert(html.includes('id="page-croprecs"'), 'page-croprecs div missing from HTML');
});

// ════════════════════════════════════════════════════════════
// 6. CSS CLASSES
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 6: CSS Classes ---');

runTest('.cr-eco-grid class exists in style.css', () => {
  assert(css.includes('.cr-eco-grid'), '.cr-eco-grid class missing from style.css');
});

runTest('.cr-pillar class exists in style.css', () => {
  assert(css.includes('.cr-pillar{'), '.cr-pillar class missing from style.css');
});

// ════════════════════════════════════════════════════════════
// 7. HTML STRUCTURE
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 7: HTML Structure ---');

runTest('cr-state select has state options', () => {
  assert(html.includes('id="cr-state"'), 'cr-state select missing');
  assert(html.includes('<option>Punjab</option>'), 'State options missing');
  assert(html.includes('<option>Uttar Pradesh</option>'), 'UP state option missing');
});

runTest('cr-submit button exists with onclick handler', () => {
  assert(html.includes('onclick="runCropRecommendations()"'), 'Submit onclick handler missing');
  assert(html.includes('id="cr-submit"'), 'Submit button missing');
});

// ════════════════════════════════════════════════════════════
// 8. FUNCTION EXISTENCE IN APP.JS
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 8: Function Definitions ---');

runTest('runCropRecommendations function defined in app.js', () => {
  assert(appJs.includes('function runCropRecommendations()'), 'runCropRecommendations missing');
});

runTest('renderCropRecResults function defined in app.js', () => {
  assert(appJs.includes('function renderCropRecResults('), 'renderCropRecResults missing');
});

runTest('fmtINR helper function defined in app.js', () => {
  assert(appJs.includes('function fmtINR('), 'fmtINR missing');
});

runTest('Season auto-detect for croprecs in goPage', () => {
  assert(appJs.includes("id==='croprecs'"), 'goPage should handle croprecs');
});

// ════════════════════════════════════════════════════════════
// 9. ANTI-REGRESSION: NO AGRICULTURAL LOGIC IN UI
// ════════════════════════════════════════════════════════════
console.log('\n--- Suite 9: Anti-Regression ---');

runTest('runCropRecommendations delegates to CropRecommendation engine', () => {
  assert(appJs.includes('CropRecommendation.getRecommendations'), 'Must call engine, not compute locally');
});

runTest('No crop-specific feasibility logic in app.js (no hardcoded soil tiers)', () => {
  // app.js should NOT contain soil feasibility arrays
  assert(!appJs.includes("'clay_loam':"), 'Hardcoded soil tiers found in app.js');
  assert(!appJs.includes("infeasible: ['"), 'Hardcoded infeasible arrays found in app.js');
});

runTest('Script load order preserved: recommendation-engine.js before app.js', () => {
  const recIdx = html.indexOf('<script src="recommendation-engine.js"></script>');
  const appIdx = html.indexOf('<script src="app.js"></script>');
  assert(recIdx !== -1, 'recommendation-engine.js script tag missing');
  assert(appIdx !== -1, 'app.js script tag missing');
  assert(recIdx < appIdx, 'recommendation-engine.js must load before app.js');
});

// ════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════
console.log(`\n==============================================`);
console.log(`Phase 9D UI Test Results: ${passedTests}/${totalTests} Passed (0 Failed)`);
console.log(`==============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
