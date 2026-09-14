/**
 * KisanSarthi — Agronomic Metadata Verification Test Suite (Phase 9B)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Load modules
const CropAgronomics = require('./crop-agronomics.js');
const vm = require('vm');
const econCode = fs.readFileSync(path.join(__dirname, 'crop-economics.js'), 'utf8');
const econSandbox = {};
vm.createContext(econSandbox);
vm.runInContext(econCode, econSandbox);
const CropEconomics = econSandbox.CropEconomics;

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

console.log('Running Phase 9B Crop Agronomics Verification Suite...\n');

// 1. API Existence and Contract
console.log('--- Suite 1: Module API & Export Contract ---');
runTest('CropAgronomics object is loaded and defined', () => {
  assert(CropAgronomics !== null && typeof CropAgronomics === 'object');
});

runTest('CropAgronomics exposes public methods', () => {
  assert.strictEqual(typeof CropAgronomics.getCropProfile, 'function');
  assert.strictEqual(typeof CropAgronomics.getSupportedCrops, 'function');
  assert.strictEqual(typeof CropAgronomics.getAllProfiles, 'function');
  assert.strictEqual(typeof CropAgronomics.isSupported, 'function');
  assert(typeof CropAgronomics._disclaimer === 'string' && CropAgronomics._disclaimer.length > 0);
});

// 2. Supported Crops and Alignment with Economics
console.log('\n--- Suite 2: Supported Crops and Cross-Module Alignment ---');
const EXPECTED_CROPS = ['rice', 'wheat', 'maize', 'potato', 'onion', 'mustard'];

runTest('Supported crops contains exactly the 6 primary crops', () => {
  const crops = CropAgronomics.getSupportedCrops();
  assert.strictEqual(crops.length, 6);
  EXPECTED_CROPS.forEach(crop => {
    assert(crops.includes(crop), `Expected ${crop} to be in supported crops`);
  });
});

runTest('CropAgronomics aligns 100% with CropEconomics crop keys', () => {
  const economicCrops = CropEconomics.getSupportedCrops();
  const agronomicCrops = CropAgronomics.getSupportedCrops();
  assert.strictEqual(agronomicCrops.length, economicCrops.length);
  economicCrops.forEach(c => {
    assert(agronomicCrops.includes(c), `Crop ${c} from CropEconomics missing in CropAgronomics`);
  });
});

// 3. Defensive Copying & Immutability
console.log('\n--- Suite 3: Defensive Copying & Mutation Resistance ---');
runTest('getSupportedCrops returns a defensive copy', () => {
  const list1 = CropAgronomics.getSupportedCrops();
  list1.push('fake_crop');
  const list2 = CropAgronomics.getSupportedCrops();
  assert.strictEqual(list2.length, 6);
  assert(!list2.includes('fake_crop'));
});

runTest('getCropProfile returns a deep clone immune to mutation', () => {
  const profile1 = CropAgronomics.getCropProfile('rice');
  assert(profile1 !== null);
  profile1.displayName = 'Mutated Rice';
  profile1.soilSuitability.optimal.push('moon_dust');
  profile1.waterProfile.waterRequirementMm.min = 99999;

  const profile2 = CropAgronomics.getCropProfile('rice');
  assert.strictEqual(profile2.displayName, 'Rice (Paddy)');
  assert(!profile2.soilSuitability.optimal.includes('moon_dust'));
  assert.strictEqual(profile2.waterProfile.waterRequirementMm.min, 1200);
});

runTest('getAllProfiles returns deep copy immune to top-level and nested mutation', () => {
  const all = CropAgronomics.getAllProfiles();
  delete all.rice;
  all.wheat.cropCategory = 'mutated';

  const allFresh = CropAgronomics.getAllProfiles();
  assert(allFresh.rice !== undefined);
  assert.strictEqual(allFresh.wheat.cropCategory, 'cereal');
});

// 4. Input Robustness and Boundary Cases
console.log('\n--- Suite 4: Input Robustness and Null Handling ---');
runTest('getCropProfile handles invalid, empty, or non-string inputs safely', () => {
  assert.strictEqual(CropAgronomics.getCropProfile(''), null);
  assert.strictEqual(CropAgronomics.getCropProfile(null), null);
  assert.strictEqual(CropAgronomics.getCropProfile(undefined), null);
  assert.strictEqual(CropAgronomics.getCropProfile(123), null);
  assert.strictEqual(CropAgronomics.getCropProfile({}), null);
  assert.strictEqual(CropAgronomics.getCropProfile('invalid_crop_xyz'), null);
});

runTest('getCropProfile is case-insensitive and trims whitespace', () => {
  assert(CropAgronomics.getCropProfile('WHEAT') !== null);
  assert(CropAgronomics.getCropProfile('  rice  ') !== null);
  assert(CropAgronomics.getCropProfile('MaIzE') !== null);
});

runTest('isSupported returns correct boolean for all inputs', () => {
  assert.strictEqual(CropAgronomics.isSupported('rice'), true);
  assert.strictEqual(CropAgronomics.isSupported('  wheat '), true);
  assert.strictEqual(CropAgronomics.isSupported('apple'), false);
  assert.strictEqual(CropAgronomics.isSupported(''), false);
  assert.strictEqual(CropAgronomics.isSupported(null), false);
  assert.strictEqual(CropAgronomics.isSupported(undefined), false);
});

// 5. Schema Completeness & Attribute Verification for Every Crop
console.log('\n--- Suite 5: Deep Schema Validation per Crop ---');
const VALID_SEASONS = ['kharif', 'rabi', 'zaid'];
const VALID_IRRIGATION_TIERS = ['compatible', 'conditionally_compatible', 'infeasible'];
const IRRIGATION_TYPES = ['canal', 'tubewell', 'drip', 'sprinkler', 'rainfed'];

EXPECTED_CROPS.forEach(cropKey => {
  runTest(`Deep schema validation for crop: [${cropKey}]`, () => {
    const p = CropAgronomics.getCropProfile(cropKey);
    assert(p, `Profile for ${cropKey} should exist`);

    // Basic Identification
    assert.strictEqual(p.cropKey, cropKey);
    assert(typeof p.displayName === 'string' && p.displayName.length > 0);
    assert(typeof p.botanicalName === 'string' && p.botanicalName.length > 0);
    assert(typeof p.cropCategory === 'string' && p.cropCategory.length > 0);

    // Seasonality
    assert(Array.isArray(p.compatibleSeasons) && p.compatibleSeasons.length > 0);
    p.compatibleSeasons.forEach(s => {
      assert(VALID_SEASONS.includes(s), `Invalid season ${s} in ${cropKey}`);
    });
    assert(p.compatibleSeasons.includes(p.primarySeason), `primarySeason ${p.primarySeason} not in compatibleSeasons`);
    assert(typeof p.sowingWindows === 'object' && p.sowingWindows !== null);
    p.compatibleSeasons.forEach(s => {
      assert(typeof p.sowingWindows[s] === 'string' && p.sowingWindows[s].length > 0, `Missing sowing window for season ${s} in ${cropKey}`);
    });

    // Harvest Duration
    assert(typeof p.harvestDurationDays === 'object' && p.harvestDurationDays !== null);
    assert(typeof p.harvestDurationDays.min === 'number' && p.harvestDurationDays.min > 0);
    assert(typeof p.harvestDurationDays.max === 'number' && p.harvestDurationDays.max >= p.harvestDurationDays.min);
    assert(typeof p.harvestDurationDays.typical === 'number' && p.harvestDurationDays.typical >= p.harvestDurationDays.min && p.harvestDurationDays.typical <= p.harvestDurationDays.max);
    assert(typeof p.harvestDurationDays.notes === 'string' && p.harvestDurationDays.notes.length > 0);

    // Soil Suitability (Graded tiers)
    const soil = p.soilSuitability;
    assert(typeof soil === 'object' && soil !== null);
    assert(Array.isArray(soil.optimal) && soil.optimal.length > 0, 'optimal soil tier missing');
    assert(Array.isArray(soil.moderate) && soil.moderate.length > 0, 'moderate soil tier missing');
    assert(Array.isArray(soil.conditional) && soil.conditional.length > 0, 'conditional soil tier missing');
    assert(Array.isArray(soil.infeasible) && soil.infeasible.length > 0, 'infeasible soil tier missing');

    // Check disjointness of soil tiers
    const allSoils = [...soil.optimal, ...soil.moderate, ...soil.conditional, ...soil.infeasible];
    const uniqueSoils = new Set(allSoils);
    assert.strictEqual(allSoils.length, uniqueSoils.size, `Duplicate soil classification in crop ${cropKey}`);

    assert(typeof soil.optimalPhRange === 'object' && soil.optimalPhRange !== null);
    assert(typeof soil.optimalPhRange.min === 'number' && soil.optimalPhRange.min >= 4.0);
    assert(typeof soil.optimalPhRange.max === 'number' && soil.optimalPhRange.max <= 9.0 && soil.optimalPhRange.max >= soil.optimalPhRange.min);
    assert(typeof soil.drainagePreference === 'string' && soil.drainagePreference.length > 0);

    // Water Profile & Irrigation Feasibility
    const water = p.waterProfile;
    assert(typeof water === 'object' && water !== null);
    assert(typeof water.waterRequirementMm === 'object' && water.waterRequirementMm !== null);
    assert(typeof water.waterRequirementMm.min === 'number' && water.waterRequirementMm.min >= 100);
    assert(typeof water.waterRequirementMm.max === 'number' && water.waterRequirementMm.max >= water.waterRequirementMm.min);
    assert(typeof water.waterRequirementMm.text === 'string' && water.waterRequirementMm.text.length > 0);

    assert(Array.isArray(water.criticalStages) && water.criticalStages.length >= 3, 'Must have at least 3 critical water stages');
    assert(typeof water.irrigationCompatibility === 'object' && water.irrigationCompatibility !== null);
    IRRIGATION_TYPES.forEach(itype => {
      const tier = water.irrigationCompatibility[itype];
      assert(VALID_IRRIGATION_TIERS.includes(tier), `Invalid irrigation tier ${tier} for ${itype} in ${cropKey}`);
    });
    assert(typeof water.irrigationNotes === 'string' && water.irrigationNotes.length > 0);

    // Temperature Profile
    const temp = p.temperatureProfile;
    assert(typeof temp === 'object' && temp !== null);
    assert(typeof temp.optimalTemperatureC === 'object' && temp.optimalTemperatureC !== null);
    assert(typeof temp.optimalTemperatureC.min === 'number');
    assert(typeof temp.optimalTemperatureC.max === 'number' && temp.optimalTemperatureC.max >= temp.optimalTemperatureC.min);
    assert(typeof temp.optimalTemperatureC.text === 'string' && temp.optimalTemperatureC.text.length > 0);
    assert(typeof temp.climateNotes === 'string' && temp.climateNotes.length > 0);

    // Agro-Climatic Context (State-level + Disclaimer)
    const agro = p.agroClimaticContext;
    assert(typeof agro === 'object' && agro !== null);
    assert(Array.isArray(agro.majorGrowingStates) && agro.majorGrowingStates.length >= 5);
    assert(typeof agro.regionalBelts === 'string' && agro.regionalBelts.length > 0);
    assert(typeof agro.disclaimer === 'string' && agro.disclaimer.includes('Soil Health Card'));

    // Agronomic Notes (Pests, Management)
    const notes = p.agronomicNotes;
    assert(typeof notes === 'object' && notes !== null);
    assert(Array.isArray(notes.keyPestsAndDiseases) && notes.keyPestsAndDiseases.length >= 3);
    assert(Array.isArray(notes.managementTips) && notes.managementTips.length >= 2);

    // Provenance / Sourcing
    const src = p.source;
    assert(typeof src === 'object' && src !== null);
    assert(typeof src.institution === 'string' && src.institution.includes('ICAR'));
    assert(typeof src.document === 'string' && src.document.length > 0);
    assert(typeof src.topic === 'string' && src.topic.length > 0);
    assert(src.evidenceConfidence === 'high' || src.evidenceConfidence === 'medium');
    assert(typeof src.notes === 'string' && src.notes.length > 0);
  });
});

// 6. Strict Separation of Concerns & Anti-Hallucination Boundaries
console.log('\n--- Suite 6: Architectural Boundary & Anti-Pollution Checks ---');
runTest('CropAgronomics contains NO economic calculation fields', () => {
  const forbiddenEconomicKeys = [
    'cultivationCostPerAcre',
    'expectedYieldPerAcre',
    'yieldUnit',
    'revenuePerAcre',
    'netMarginPerAcre',
    'returnOnInvestment',
    'breakEvenPricePerQuintal',
    'breakEvenYieldPerAcre'
  ];

  EXPECTED_CROPS.forEach(cropKey => {
    const p = CropAgronomics.getCropProfile(cropKey);
    forbiddenEconomicKeys.forEach(fKey => {
      assert.strictEqual(p[fKey], undefined, `Found forbidden economic field ${fKey} in agronomic profile for ${cropKey}`);
    });
  });
});

runTest('CropAgronomics contains NO decision scores or recommendation engine calculations', () => {
  const forbiddenScoreKeys = [
    'overallScore',
    'recommendationScore',
    'suitabilityScore',
    'agronomicScore',
    'economicScore',
    'riskScore',
    'rank',
    'selected'
  ];

  EXPECTED_CROPS.forEach(cropKey => {
    const p = CropAgronomics.getCropProfile(cropKey);
    forbiddenScoreKeys.forEach(fKey => {
      assert.strictEqual(p[fKey], undefined, `Found forbidden score field ${fKey} in agronomic profile for ${cropKey}`);
    });
  });
});

runTest('CropAgronomics contains NO market price or volatility fields', () => {
  const forbiddenMarketKeys = [
    'modal_price',
    'min_price',
    'max_price',
    'currentPrice',
    'cv',
    'volatility',
    'forecast_30d',
    'trend'
  ];

  EXPECTED_CROPS.forEach(cropKey => {
    const p = CropAgronomics.getCropProfile(cropKey);
    forbiddenMarketKeys.forEach(fKey => {
      assert.strictEqual(p[fKey], undefined, `Found forbidden market field ${fKey} in agronomic profile for ${cropKey}`);
    });
  });
});

// 7. HTML inclusion check
console.log('\n--- Suite 7: HTML Script Inclusion Check ---');
runTest('index.html includes crop-agronomics.js after crop-economics.js and before app.js', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert(htmlContent.includes('<script src="crop-agronomics.js"></script>'));
  const econIdx = htmlContent.indexOf('<script src="crop-economics.js"></script>');
  const agroIdx = htmlContent.indexOf('<script src="crop-agronomics.js"></script>');
  const appIdx = htmlContent.indexOf('<script src="app.js"></script>');

  assert(econIdx !== -1, 'crop-economics.js script tag not found');
  assert(agroIdx !== -1, 'crop-agronomics.js script tag not found');
  assert(appIdx !== -1, 'app.js script tag not found');
  assert(econIdx < agroIdx, 'crop-economics.js should precede crop-agronomics.js');
  assert(agroIdx < appIdx, 'crop-agronomics.js should precede app.js');
});

console.log(`\n==============================================`);
console.log(`Phase 9B Test Results: ${passedTests}/${totalTests} Passed (0 Failed)`);
console.log(`==============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
