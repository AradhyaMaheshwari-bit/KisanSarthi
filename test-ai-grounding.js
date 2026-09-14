#!/usr/bin/env node
/**
 * Phase 9E — AI Grounding Tests (20 assertions)
 * Tests: buildRecommendationAIContext, CHAT_SYSTEM grounding rules, lifecycle, anti-hallucination.
 *
 * Run: node test-ai-grounding.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');

/* ── assertion helpers ──────────────────────────── */
let _pass = 0, _fail = 0, _total = 0;
function assert(cond, label) {
  _total++;
  if (cond) { _pass++; console.log('  ✓ ' + label); }
  else      { _fail++; console.error('  ✗ FAIL: ' + label); }
}
function section(n) { console.log('\n── ' + n + ' ──'); }

/* ── load engine via require (auto-loads deps) ──── */
const CropRecommendation = require('./recommendation-engine.js');

/* ── extract buildRecommendationAIContext from app.js ── */
const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Extract the function source (top-level, starts at column 2)
const fnMatch = appSrc.match(
  /function\s+buildRecommendationAIContext\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/
);
if (!fnMatch) { console.error('FATAL: could not extract buildRecommendationAIContext'); process.exit(1); }
// Wrap as IIFE that assigns to global
const fnCode = fnMatch[0];
const buildRecommendationAIContext = (function() {
  const fn = new Function('return (' + fnCode.replace(/^function\s+buildRecommendationAIContext/, 'function') + ')')();
  return fn;
})();

// Extract CHAT_SYSTEM template literal
const chatMatch = appSrc.match(/const\s+CHAT_SYSTEM\s*=\s*`([\s\S]*?)`;/);
if (!chatMatch) { console.error('FATAL: could not extract CHAT_SYSTEM'); process.exit(1); }
const CHAT_SYSTEM = chatMatch[1];

/* ── helper: run engine with valid context ──────── */
function runEngine(overrides) {
  return CropRecommendation.getRecommendations(Object.assign({
    state: 'Punjab', soilType: 'alluvial', irrigationType: 'canal',
    season: 'rabi', landAcres: 2, laborAvailable: 'family',
    budgetLevel: 'medium', riskTolerance: 'moderate', preferredCrops: ''
  }, overrides || {}));
}

/* ══════════════════════════════════════════════════════
   SUITE 1 — CONTEXT ADAPTER (8 assertions)
   ══════════════════════════════════════════════════════ */
section('Suite 1: Context Adapter');
{
  const result    = runEngine();
  const farmerCtx = { state: 'Punjab', season: 'rabi', landAcres: 2 };
  const ctx       = buildRecommendationAIContext(result, farmerCtx);

  // 1. Returns non-empty string for valid result
  assert(typeof ctx === 'string' && ctx.length > 100,
    'returns non-empty string for valid result (length=' + ctx.length + ')');

  // 2. Feasible crop ordering preserved
  const firstName = result.feasible[0].displayName;
  assert(ctx.indexOf(firstName) !== -1,
    'first feasible crop "' + firstName + '" appears in context');

  // 3. Infeasible crops and exclusion reasons appear (if any)
  if (result.infeasible && result.infeasible.length > 0) {
    const infeasName = result.infeasible[0].displayName;
    assert(ctx.indexOf(infeasName) !== -1,
      'infeasible crop "' + infeasName + '" appears in context');
    const hasReason = result.infeasible[0].exclusionReasons.some(
      r => ctx.indexOf(r) !== -1
    );
    assert(hasReason,
      'exclusion reason for "' + infeasName + '" appears in context');
  } else {
    assert(true, 'no infeasible crops — exclusion test skipped');
    assert(true, 'no infeasible crops — exclusion test skipped');
  }

  // 4. Economics appear in output
  const eco = result.feasible[0].economics;
  if (eco) {
    if (eco.estimatedNetReturn != null)
      assert(ctx.indexOf('₹') !== -1, 'currency symbol present for net return');
    else
      assert(ctx.indexOf('unavailable') !== -1, 'shows "unavailable" for null net return');
    if (eco.freshnessTier)
      assert(ctx.indexOf(eco.freshnessTier) !== -1,
        'freshness tier "' + eco.freshnessTier + '" appears');
    else
      assert(true, 'no freshness tier — skipped');
  } else {
    assert(true, 'no economics — skipped');
    assert(true, 'no economics — skipped');
  }

  // 5. Negative returns appear as negative (not clamped)
  const negResult = {
    isValid: true, feasible: [{
      cropKey: 'test', displayName: 'TestCrop',
      agronomicFit: { tier: 'good', soilStatus: 'suitable', seasonStatus: 'suitable',
                      harvestDurationDays: { typical: 90 } },
      economics: { estimatedNetReturn: -5000, roi: -15, marketPrice: 1500,
                    breakEvenPrice: 2000, totalCost: 8000, estimatedRevenue: 3000,
                    isNegativeReturn: true, freshnessTier: 'fresh' },
      marketRisk: { tier: 'moderate', volatilityCV: 25 },
      dataReliability: { agronomicEvidenceConfidence: 'high' },
      explanation: { whyRecommended: ['test reason'], cautions: ['test caution'] }
    }], infeasible: []
  };
  const negCtx = buildRecommendationAIContext(negResult, farmerCtx);
  assert(negCtx.indexOf('-5000') !== -1,
    'negative return -5000 appears in context');
  assert(negCtx.indexOf('WARNING: Negative return') !== -1,
    'negative return warning label present');

  // 6. Market risk tier and CV appear
  const risk = result.feasible[0].marketRisk;
  if (risk && risk.tier)
    assert(ctx.indexOf(risk.tier) !== -1,
      'market risk tier "' + risk.tier + '" appears');
  else
    assert(true, 'no market risk tier — skipped');

  // 7. WHY recommended items appear
  const why = result.feasible[0].explanation && result.feasible[0].explanation.whyRecommended;
  if (why && why.length > 0)
    assert(ctx.indexOf(why[0]) !== -1,
      'whyRecommended item appears');
  else
    assert(true, 'no whyRecommended — skipped');

  // 8. CAUTIONS appear
  const caut = result.feasible[0].explanation && result.feasible[0].explanation.cautions;
  if (caut && caut.length > 0)
    assert(ctx.indexOf(caut[0]) !== -1,
      'caution item appears');
  else
    assert(true, 'no cautions — skipped');
}

/* ══════════════════════════════════════════════════════
   SUITE 2 — DATA INTEGRITY (5 assertions)
   ══════════════════════════════════════════════════════ */
section('Suite 2: Data Integrity');
{
  const farmerCtx = { state: 'Punjab', season: 'rabi', landAcres: 2 };

  // 9. No fake ₹0 values for unavailable economics
  const nullEcoResult = {
    isValid: true, feasible: [{
      cropKey: 'test', displayName: 'NullEcoCrop',
      agronomicFit: { tier: 'good', soilStatus: 'suitable', seasonStatus: 'suitable',
                      harvestDurationDays: { typical: 90 } },
      economics: null, marketRisk: null, dataReliability: null,
      explanation: { whyRecommended: [], cautions: [] }
    }], infeasible: []
  };
  const nullCtx = buildRecommendationAIContext(nullEcoResult, farmerCtx);
  assert(nullCtx.indexOf('₹0/q') === -1,   'no fake ₹0/q value for null economics');
  assert(nullCtx.indexOf('₹0/acre') === -1, 'no fake ₹0/acre value for null economics');

  // 10. No opaque composite score (e.g. "92% match", "score: 87")
  const result = runEngine();
  const ctx    = buildRecommendationAIContext(result, farmerCtx);
  assert(!/\d{2,3}%\s*match/i.test(ctx),   'no composite percentage score like "92% match"');
  assert(!/score[:\s]*\d/i.test(ctx),       'no numeric "score: N" pattern');

  // 11. Farmer context (state, season, acres) appears
  assert(ctx.indexOf('Punjab') !== -1, 'farmer state "Punjab" appears in context');
  assert(ctx.indexOf('rabi')   !== -1, 'season "rabi" appears in context');
  assert(ctx.indexOf('2 acres') !== -1, 'land area "2 acres" appears in context');

  // 12. Data reliability confidence appears
  const rel = result.feasible[0].dataReliability;
  if (rel && rel.agronomicEvidenceConfidence)
    assert(ctx.indexOf(rel.agronomicEvidenceConfidence) !== -1,
      'data reliability confidence appears');
  else
    assert(true, 'no data reliability confidence — skipped');

  // 13. Engine footer grounding instruction present
  assert(ctx.indexOf('IMPORTANT: This data is from KisanSarthi deterministic recommendation engine') !== -1,
    'engine grounding footer present');
  assert(ctx.indexOf('Do not create new rankings') !== -1,
    'anti-override instruction present');
}

/* ══════════════════════════════════════════════════════
   SUITE 3 — LIFECYCLE (4 assertions)
   ══════════════════════════════════════════════════════ */
section('Suite 3: Lifecycle');
{
  const farmerCtxA = { state: 'Punjab', season: 'rabi', landAcres: 2 };
  const farmerCtxB = { state: 'Bihar',  season: 'kharif', landAcres: 5 };

  // 14. New recommendation replaces old (fresh context)
  const resultA = runEngine({ state: 'Punjab', season: 'rabi' });
  const resultB = runEngine({ state: 'Bihar',  season: 'kharif' });
  const ctxA = buildRecommendationAIContext(resultA, farmerCtxA);
  const ctxB = buildRecommendationAIContext(resultB, farmerCtxB);
  assert(ctxA.indexOf('Punjab') !== -1, 'context A contains Punjab');
  assert(ctxB.indexOf('Bihar')  !== -1, 'context B contains Bihar');
  assert(ctxB.indexOf('Punjab') === -1,  'context B does not contain Punjab (fresh replacement)');

  // 15. Handles missing economics gracefully (null values -> "unavailable")
  const partialResult = {
    isValid: true, feasible: [{
      cropKey: 'test', displayName: 'PartialCrop',
      agronomicFit: { tier: 'moderate', soilStatus: 'unknown', seasonStatus: 'unknown',
                      harvestDurationDays: null },
      economics: { estimatedNetReturn: null, roi: null, marketPrice: null,
                    breakEvenPrice: null, totalCost: null, estimatedRevenue: null,
                    isNegativeReturn: false, freshnessTier: null, freshnessWarning: null,
                    priceDate: null },
      marketRisk: { tier: null, volatilityCV: null },
      dataReliability: { agronomicEvidenceConfidence: null, warning: null },
      explanation: { whyRecommended: [], cautions: [] }
    }], infeasible: []
  };
  const partialCtx = buildRecommendationAIContext(partialResult, farmerCtxA);
  assert(partialCtx.indexOf('unavailable') !== -1, 'null economics shown as "unavailable"');
  assert(partialCtx.indexOf('PartialCrop') !== -1,  'crop name still present');
  assert(partialCtx.indexOf('unknown') !== -1,      'null agronomic fields shown as "unknown"');

  // 16. Handles empty feasible array
  const emptyResult = { isValid: true, feasible: [], infeasible: [] };
  const emptyCtx    = buildRecommendationAIContext(emptyResult, farmerCtxA);
  assert(typeof emptyCtx === 'string',                       'returns string for empty feasible');
  assert(emptyCtx.indexOf('RECOMMENDATION ORDER') !== -1,   'contains recommendation header');
  assert(emptyCtx.indexOf('IMPORTANT:') !== -1,              'contains grounding footer');

  // 17. Contains no API credentials
  assert(ctxA.toLowerCase().indexOf('api_key')  === -1, 'no api_key in context');
  assert(ctxA.toLowerCase().indexOf('x-api-key') === -1, 'no x-api-key in context');
  assert(ctxA.indexOf('sk-') === -1,                     'no sk- credential pattern');

  // Guard clause: returns empty for invalid/missing result
  assert(buildRecommendationAIContext(null, farmerCtxA) === '',
    'returns empty string for null result');
  assert(buildRecommendationAIContext({ isValid: false, feasible: null }, farmerCtxA) === '',
    'returns empty string for isValid=false');
}

/* ══════════════════════════════════════════════════════
   SUITE 4 — ANTI-HALLUCINATION RULES IN CHAT_SYSTEM (3 assertions)
   ══════════════════════════════════════════════════════ */
section('Suite 4: Anti-Hallucination Rules');
{
  // 18. CHAT_SYSTEM contains grounding rules
  assert(CHAT_SYSTEM.indexOf('DETERMINISTIC ENGINE') !== -1,
    'CHAT_SYSTEM references deterministic engine');
  assert(CHAT_SYSTEM.indexOf('ranking is authoritative') !== -1,
    'CHAT_SYSTEM states ranking is authoritative');
  assert(CHAT_SYSTEM.indexOf('Do NOT reorder') !== -1,
    'CHAT_SYSTEM forbids reordering');

  // 19. CHAT_SYSTEM explicitly forbids invented prices
  assert(CHAT_SYSTEM.indexOf('Never invent') !== -1,
    'CHAT_SYSTEM contains "Never invent" directive');
  assert(CHAT_SYSTEM.indexOf('Never present old prices as current') !== -1,
    'CHAT_SYSTEM forbids presenting old prices as current');
  assert(CHAT_SYSTEM.indexOf('no price data is available') !== -1,
    'CHAT_SYSTEM handles unavailable prices');

  // 20. CHAT_SYSTEM explicitly forbids overriding infeasibility
  assert(CHAT_SYSTEM.indexOf('Never override the infeasibility') !== -1,
    'CHAT_SYSTEM forbids overriding infeasibility');
  assert(CHAT_SYSTEM.indexOf('NOT FEASIBLE') !== -1,
    'CHAT_SYSTEM references NOT FEASIBLE status');
  assert(CHAT_SYSTEM.indexOf('exclusion reason') !== -1,
    'CHAT_SYSTEM references exclusion reasons');
}

/* ══════════════════════════════════════════════════════
   SUITE 5 — AUDIT: DATA HONESTY & NO DUPLICATION (6 assertions)
   ══════════════════════════════════════════════════════ */
section('Suite 5: Audit — Data Honesty & No Duplication');
{
  // 21. Market context says "Latest Available" not "Current Price"
  const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appSrc.indexOf('Latest Available Price') !== -1,
    'formatContextForAI uses "Latest Available Price" label');
  assert(appSrc.indexOf('not real-time') !== -1,
    'market context includes "not real-time" disclaimer');

  // 22. No duplicate ranking logic defined in app.js (calls to analytics module are fine)
  assert(!/function\s+(sortCrop|rankCrop)\s*\(/.test(appSrc),
    'no duplicate crop ranking function definition in app.js');

  // 23. No duplicate economics calculation in app.js
  assert(!/function\s+(calcEconomics|computeROI)\s*\(/.test(appSrc),
    'no duplicate economics calculation in app.js');

  // 24. No duplicate market risk calculation in app.js
  assert(!/function\s+(calcVolatility|computeRisk)\s*\(/.test(appSrc),
    'no duplicate market risk calculation in app.js');

  // 25. LastCropRecommendation not in localStorage
  assert(appSrc.indexOf("localStorage.setItem('lastCropRecommendation") === -1,
    'lastCropRecommendation never persisted to localStorage');
  assert(appSrc.indexOf("localStorage.setItem('last_crop") === -1,
    'no crop recommendation data in localStorage');
}

/* ══════════════════════════════════════════════════════
   SUMMARY
   ══════════════════════════════════════════════════════ */
console.log('\n═══════════════════════════════════════════');
console.log('  Phase 9E AI Grounding: ' + _pass + '/' + _total + ' assertions');
if (_fail === 0) {
  console.log('  ALL TESTS PASSED ✓');
} else {
  console.log('  ' + _fail + ' FAILURES ✗');
  process.exit(1);
}
console.log('═══════════════════════════════════════════\n');
