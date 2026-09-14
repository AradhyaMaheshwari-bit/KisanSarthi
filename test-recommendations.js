/**
 * KisanSarthi — Crop Recommendation Engine Verification Test Suite (Phase 9C)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// Load dependent modules in sandbox if needed
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
const KisanAnalytics = analyticsSandbox.window.KisanAnalytics;

const priceData = JSON.parse(fs.readFileSync(path.join(__dirname, 'price_data.json'), 'utf8'));

// Load Recommendation Engine
const CropRecommendation = require('./recommendation-engine.js');

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
    console.error(err.stack);
  }
}

console.log('Running Phase 9C Crop Recommendation Engine Verification Suite...\n');

// 1. Module API & Export Contract
console.log('--- Suite 1: Module API & Export Contract ---');
runTest('CropRecommendation is defined and loaded', () => {
  assert(CropRecommendation !== null && typeof CropRecommendation === 'object');
});

runTest('CropRecommendation exposes public methods', () => {
  assert.strictEqual(typeof CropRecommendation.getRecommendations, 'function');
  assert.strictEqual(typeof CropRecommendation.getRecommendation, 'function');
  assert.strictEqual(typeof CropRecommendation.evaluateCrop, 'function');
  assert.strictEqual(typeof CropRecommendation.validateFarmerContext, 'function');
  assert.strictEqual(typeof CropRecommendation.getSupportedCrops, 'function');
  assert.strictEqual(typeof CropRecommendation.getFreshnessTier, 'function');
  assert(typeof CropRecommendation._disclaimer === 'string' && CropRecommendation._disclaimer.length > 0);
});

runTest('getSupportedCrops returns exactly the 6 primary crops', () => {
  const crops = CropRecommendation.getSupportedCrops();
  assert.strictEqual(crops.length, 6);
  ['rice', 'wheat', 'maize', 'potato', 'onion', 'mustard'].forEach(c => {
    assert(crops.includes(c), `Missing crop ${c}`);
  });
});

// 2. Input Validation & Robustness
console.log('\n--- Suite 2: Input Validation & Robustness ---');
runTest('validateFarmerContext catches null, undefined, or empty context', () => {
  const r1 = CropRecommendation.validateFarmerContext(null);
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.length > 0);

  const r2 = CropRecommendation.validateFarmerContext({});
  assert.strictEqual(r2.isValid, false);
  assert(r2.errors.length >= 4); // missing acres, season, soil, irrigation
});

runTest('validateFarmerContext catches invalid or negative land area', () => {
  const r1 = CropRecommendation.validateFarmerContext({
    landAcres: -5,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.some(e => e.includes('landAcres')));

  const r2 = CropRecommendation.validateFarmerContext({
    landAcres: 0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  });
  assert.strictEqual(r2.isValid, false);

  const r3 = CropRecommendation.validateFarmerContext({
    landAcres: 'abc',
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  });
  assert.strictEqual(r3.isValid, false);
});

runTest('validateFarmerContext accepts valid context and normalizes synonyms', () => {
  const res = CropRecommendation.validateFarmerContext({
    landAcres: '2.5',
    season: 'Winter',
    soilType: 'Alluvial Loam',
    irrigationType: 'Borewell',
    state: ' Punjab '
  });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.sanitized.landAcres, 2.5);
  assert.strictEqual(res.sanitized.season, 'rabi');
  assert.strictEqual(res.sanitized.soilType, 'alluvial');
  assert.strictEqual(res.sanitized.irrigationType, 'tubewell');
  assert.strictEqual(res.sanitized.state, 'Punjab');
});

runTest('getRecommendations returns invalid status on invalid input without throwing', () => {
  const result = CropRecommendation.getRecommendations({ landAcres: -1 });
  assert.strictEqual(result.isValid, false);
  assert(Array.isArray(result.errors) && result.errors.length > 0);
  assert.strictEqual(result.feasible.length, 0);
  assert.strictEqual(result.infeasible.length, 0);
});

// 3. Pre-Economic Biological Feasibility Filtering (Phase 9A Rule)
console.log('\n--- Suite 3: Pre-Economic Biological Feasibility Filtering ---');
runTest('Incompatible season filters crops into INFEASIBLE before economic ranking', () => {
  // Wheat in Kharif (Wheat is Rabi only)
  const result = CropRecommendation.getRecommendations({
    landAcres: 2.0,
    season: 'kharif',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  assert.strictEqual(result.isValid, true);
  const wheatFeasible = result.feasible.find(c => c.cropKey === 'wheat');
  const wheatInfeasible = result.infeasible.find(c => c.cropKey === 'wheat');

  assert.strictEqual(wheatFeasible, undefined, 'Wheat should NOT be in feasible list for Kharif');
  assert(wheatInfeasible !== undefined, 'Wheat should be in infeasible list for Kharif');
  assert.strictEqual(wheatInfeasible.status, 'INFEASIBLE');
  assert(wheatInfeasible.exclusionReasons.some(r => r.includes('Season')));
  assert.strictEqual(wheatInfeasible.explanation.whyRecommended.length, 0);
  assert(wheatInfeasible.explanation.cautions.length > 0);
});

runTest('Incompatible soil type filters crops into INFEASIBLE', () => {
  // Potato in waterlogged / heavy clay soil
  const result = CropRecommendation.getRecommendations({
    landAcres: 1.5,
    season: 'rabi',
    soilType: 'waterlogged_soil',
    irrigationType: 'drip',
    state: 'Uttar Pradesh'
  });

  assert.strictEqual(result.isValid, true);
  const potatoInfeasible = result.infeasible.find(c => c.cropKey === 'potato');
  assert(potatoInfeasible !== undefined, 'Potato should be infeasible in waterlogged soil');
  assert.strictEqual(potatoInfeasible.status, 'INFEASIBLE');
  assert(potatoInfeasible.exclusionReasons.some(r => r.includes('Soil')));
});

runTest('Incompatible irrigation method filters crops into INFEASIBLE', () => {
  // Rice under sprinkler — unsuitable for flooded paddy (ICAR: infeasible)
  const evalRice = CropRecommendation.evaluateCrop('rice', {
    landAcres: 3.0,
    season: 'kharif',
    soilType: 'clay_loam',
    irrigationType: 'sprinkler',
    state: 'West Bengal'
  });

  assert(evalRice !== null);
  assert.strictEqual(evalRice.status, 'INFEASIBLE');
  assert(evalRice.exclusionReasons.some(r => r.includes('Irrigation')));
});

// 4. Multi-Pillar Architecture & No Opaque Composite Scores
console.log('\n--- Suite 4: Multi-Pillar Architecture & Anti-Composite Checks ---');
runTest('evaluateCrop returns the 5 distinct, transparent pillars', () => {
  const evaluation = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 2.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  assert(evaluation !== null);
  assert.strictEqual(evaluation.cropKey, 'wheat');
  assert.strictEqual(evaluation.status, 'FEASIBLE');

  // Verify 5 pillars exist
  assert(typeof evaluation.agronomicFit === 'object' && evaluation.agronomicFit !== null, 'agronomicFit missing');
  assert(typeof evaluation.economics === 'object' && evaluation.economics !== null, 'economics missing');
  assert(typeof evaluation.marketRisk === 'object' && evaluation.marketRisk !== null, 'marketRisk missing');
  assert(typeof evaluation.dataReliability === 'object' && evaluation.dataReliability !== null, 'dataReliability missing');
  assert(typeof evaluation.explanation === 'object' && evaluation.explanation !== null, 'explanation missing');
});

runTest('CropEvaluation contains NO opaque composite percentage scores or weighted formulas', () => {
  const evaluation = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 2.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  const forbiddenScoreKeys = [
    'overallScore',
    'recommendationScore',
    'compositeScore',
    'score',
    'suitabilityScore',
    'percentMatch'
  ];

  forbiddenScoreKeys.forEach(fKey => {
    assert.strictEqual(evaluation[fKey], undefined, `Forbidden score field ${fKey} found on evaluation`);
  });
});

// 5. Pillar 1: Agronomic Fit Verification
console.log('\n--- Suite 5: Agronomic Fit Pillar Deep Verification ---');
runTest('agronomicFit contains verified ICAR profile attributes', () => {
  const evalWheat = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 1.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  const fit = evalWheat.agronomicFit;
  assert.strictEqual(fit.tier, 'optimal');
  assert.strictEqual(fit.seasonStatus, 'compatible');
  assert.strictEqual(fit.isPrimarySeason, true);
  assert(typeof fit.sowingWindow === 'string' && fit.sowingWindow.includes('November'));
  assert.strictEqual(fit.harvestDurationDays.typical, 135);
  assert.strictEqual(fit.soilStatus, 'optimal');
  assert.strictEqual(fit.optimalPhRange.min, 6.0);
  assert.strictEqual(fit.optimalPhRange.max, 7.5);
  assert.strictEqual(fit.waterRequirementMm.min, 450);
  assert.strictEqual(fit.waterRequirementMm.max, 650);
  assert(Array.isArray(fit.criticalWaterStages) && fit.criticalWaterStages.length >= 4);
  assert.strictEqual(fit.isMajorGrowingState, true);
  assert(fit.regionalDisclaimer.includes('Soil Health Card'));
});

// 6. Pillar 2: Economics & Land Scaling Verification
console.log('\n--- Suite 6: Economics Pillar & Scaling Verification ---');
runTest('economics scales correctly with landAcres', () => {
  const acres = 3.5;
  const evalWheat = CropRecommendation.evaluateCrop('wheat', {
    landAcres: acres,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  const econ = evalWheat.economics;
  assert.strictEqual(econ.available, true);
  assert.strictEqual(econ.landAcres, acres);
  assert.strictEqual(econ.cultivationCostPerAcre, 12000);
  assert.strictEqual(econ.expectedYieldPerAcre, 11.3);
  assert.strictEqual(econ.totalCost, 12000 * acres);
  assert.strictEqual(econ.totalYield, 11.3 * acres);
  assert.strictEqual(econ.marketPrice, 2480);
  assert.strictEqual(econ.estimatedRevenue, 2480 * 11.3 * acres);
  assert.strictEqual(econ.estimatedNetReturn, (2480 * 11.3 * acres) - (12000 * acres));
  assert.strictEqual(econ.netMarginPerAcre, (econ.estimatedNetReturn / acres));
  assert.strictEqual(econ.breakEvenPrice, 12000 / 11.3);
  assert.strictEqual(econ.isNegativeReturn, false);
});

runTest('economics preserves negative margins truthfully without clamping', () => {
  // Mock price lower than break-even
  const mockLowPriceData = JSON.parse(JSON.stringify(priceData));
  mockLowPriceData.wheat.current_price = 800; // Break-even is ~1062

  const evalWheat = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 1.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  }, { priceData: mockLowPriceData });

  const econ = evalWheat.economics;
  assert.strictEqual(econ.isNegativeReturn, true);
  assert(econ.estimatedNetReturn < 0, 'Estimated net return should be negative');
  assert.strictEqual(econ.estimatedNetReturn, (800 * 11.3) - 12000); // 9040 - 12000 = -2960
  assert(evalWheat.explanation.cautions.some(c => c.includes('Negative margin')));
});

// 7. Market Price Freshness Tiers
console.log('\n--- Suite 7: Market Price Freshness Tiers ---');
runTest('getFreshnessTier classifies dates correctly relative to 2026-09-14', () => {
  const refDate = '2026-09-14';
  assert.strictEqual(CropRecommendation.getFreshnessTier('2026-03-10', refDate), 'fresh'); // ~0.5 yr
  assert.strictEqual(CropRecommendation.getFreshnessTier('2025-05-28', refDate), 'fresh'); // ~1.3 yr
  assert.strictEqual(CropRecommendation.getFreshnessTier('2023-01-30', refDate), 'stale'); // ~3.6 yr
  assert.strictEqual(CropRecommendation.getFreshnessTier('2022-10-01', refDate), 'stale'); // ~3.9 yr
  assert.strictEqual(CropRecommendation.getFreshnessTier('2016-02-09', refDate), 'historical'); // ~10.6 yr
  assert.strictEqual(CropRecommendation.getFreshnessTier(null), 'unavailable');
  assert.strictEqual(CropRecommendation.getFreshnessTier('invalid-date'), 'unavailable');
});

runTest('Stale and historical crops carry prominent freshness warnings in cautions and reliability', () => {
  // Maize is stale in dataset (~2023)
  const evalMaize = CropRecommendation.evaluateCrop('maize', {
    landAcres: 1.0,
    season: 'kharif',
    soilType: 'sandy_loam',
    irrigationType: 'canal'
  });

  assert(evalMaize !== null);
  assert.strictEqual(evalMaize.economics.freshnessTier, 'stale');
  assert(evalMaize.dataReliability.warning !== null);
  assert(evalMaize.explanation.cautions.some(c => c.includes('2–5 years old') || c.includes('Stale')));

  // Mustard is historical in dataset (~2016)
  const evalMustard = CropRecommendation.evaluateCrop('mustard', {
    landAcres: 1.0,
    season: 'rabi',
    soilType: 'sandy_loam',
    irrigationType: 'tubewell'
  });

  assert(evalMustard !== null);
  assert.strictEqual(evalMustard.economics.freshnessTier, 'historical');
  assert(evalMustard.dataReliability.warning !== null);
  assert(evalMustard.explanation.cautions.some(c => c.includes('>5 years old') || c.includes('Historical')));
});

// 8. Pillar 3: Market Risk (Historical Price Volatility)
console.log('\n--- Suite 8: Market Risk & Volatility Verification ---');
runTest('marketRisk reports CV tiers accurately and labels as historical price volatility', () => {
  const evalWheat = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 1.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  });

  const risk = evalWheat.marketRisk;
  assert(risk.volatilityCV !== null && typeof risk.volatilityCV === 'number');
  assert(['low', 'moderate', 'high'].includes(risk.tier));
  assert(risk.methodology.includes('Historical price volatility'));
  assert(!risk.methodology.includes('probability of crop failure'));
});

// 9. Pillar 4: Data Reliability & Provenance
console.log('\n--- Suite 9: Data Reliability & ICAR Provenance ---');
runTest('dataReliability includes verified ICAR institutional citations', () => {
  const evalRice = CropRecommendation.evaluateCrop('rice', {
    landAcres: 1.0,
    season: 'kharif',
    soilType: 'clay_loam',
    irrigationType: 'canal'
  });

  const rel = evalRice.dataReliability;
  assert(rel.agronomicSource !== null);
  assert(rel.agronomicSource.institution.includes('ICAR'));
  assert(rel.agronomicEvidenceConfidence === 'high');
});

// 10. Pillar 5: Explainability & Cautions
console.log('\n--- Suite 10: Explainability & Grounded Cautions ---');
runTest('whyRecommended and cautions are evidence-derived and non-empty for feasible crops', () => {
  const evalWheat = CropRecommendation.evaluateCrop('wheat', {
    landAcres: 2.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  const exp = evalWheat.explanation;
  assert(Array.isArray(exp.whyRecommended) && exp.whyRecommended.length >= 3);
  assert(Array.isArray(exp.cautions) && exp.cautions.length >= 1);

  // Check specific content
  assert(exp.whyRecommended.some(w => w.includes('Optimal season')));
  assert(exp.whyRecommended.some(w => w.includes('Optimal soil')));
  assert(exp.whyRecommended.some(w => w.includes('net margin')));
});

// 11. Deterministic Lexicographic Sorting
console.log('\n--- Suite 11: Deterministic Multi-Factor Ranking ---');
runTest('getRecommendations ranks feasible crops deterministically by agronomic tier and economics', () => {
  const result = CropRecommendation.getRecommendations({
    landAcres: 2.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  assert.strictEqual(result.isValid, true);
  assert(result.feasible.length >= 2);

  // First feasible crop should have optimal agronomic fit
  assert.strictEqual(result.feasible[0].agronomicFit.tier, 'optimal');

  // Verify deterministic order across repeated calls
  const result2 = CropRecommendation.getRecommendations({
    landAcres: 2.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal',
    state: 'Punjab'
  });

  assert.deepStrictEqual(
    result.feasible.map(c => c.cropKey),
    result2.feasible.map(c => c.cropKey)
  );
});

// 12. Immutability & Mutation Resistance
console.log('\n--- Suite 12: Defensive Copying & Immutability ---');
runTest('Mutating returned recommendation results does not corrupt future calls', () => {
  const res1 = CropRecommendation.getRecommendations({
    landAcres: 1.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  });

  assert(res1.feasible.length > 0);
  res1.feasible[0].displayName = 'Corrupted Crop';
  res1.feasible[0].agronomicFit.optimalPhRange.min = 999;
  res1.feasible[0].explanation.whyRecommended.push('Fake Reason');

  const res2 = CropRecommendation.getRecommendations({
    landAcres: 1.0,
    season: 'rabi',
    soilType: 'alluvial',
    irrigationType: 'canal'
  });

  assert.notStrictEqual(res2.feasible[0].displayName, 'Corrupted Crop');
  assert.notStrictEqual(res2.feasible[0].agronomicFit.optimalPhRange.min, 999);
  assert(!res2.feasible[0].explanation.whyRecommended.includes('Fake Reason'));
});

// 13. HTML Inclusion Check
console.log('\n--- Suite 13: HTML Inclusion & Script Order ---');
runTest('index.html includes recommendation-engine.js in strict sequence', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert(html.includes('<script src="recommendation-engine.js"></script>'));

  const agroIdx = html.indexOf('<script src="crop-agronomics.js"></script>');
  const recIdx = html.indexOf('<script src="recommendation-engine.js"></script>');
  const appIdx = html.indexOf('<script src="app.js"></script>');

  assert(agroIdx !== -1, 'crop-agronomics.js script tag missing');
  assert(recIdx !== -1, 'recommendation-engine.js script tag missing');
  assert(appIdx !== -1, 'app.js script tag missing');

  assert(agroIdx < recIdx, 'crop-agronomics.js should precede recommendation-engine.js');
  assert(recIdx < appIdx, 'recommendation-engine.js should precede app.js');
});

console.log(`\n==============================================`);
console.log(`Phase 9C Test Results: ${passedTests}/${totalTests} Passed (0 Failed)`);
console.log(`==============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
