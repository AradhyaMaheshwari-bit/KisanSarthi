/**
 * KisanSarthi — Explainable Crop Recommendation Engine (Phase 9C)
 *
 * Standalone, explainable recommendation engine that evaluates farmer context
 * against evidence-based agronomics, crop economics, and market analytics.
 *
 * ARCHITECTURAL PRINCIPLES & GOVERNANCE:
 * 1. Independent Pillars — No Opaque Composite Score:
 *    Completely avoids arbitrary linear formulas (e.g. 0.40 * agro + 0.35 * econ + 0.25 * risk)
 *    and pseudo-scientific percentages (e.g. 87.2%). Returns 5 transparent, explainable pillars:
 *    - agronomicFit
 *    - economics
 *    - marketRisk
 *    - dataReliability
 *    - explanation
 *
 * 2. Pre-Economic Biological Feasibility Filtering (Phase 9A Rule):
 *    Biologically or agronomically infeasible conditions (season mismatch, incompatible soil,
 *    infeasible irrigation) are identified BEFORE economic evaluation. Infeasible crops receive
 *    status: 'INFEASIBLE' with explicit exclusion reasons and are excluded from top recommendations.
 *
 * 3. Market Price Freshness Tiers:
 *    - Fresh (< 2 years): Current economic estimate based on recent APMC prices.
 *    - Stale (2–5 years): Stale price benchmark; carries explicit warning.
 *    - Historical (> 5 years): Historical benchmark only; NEVER presented as current expectation.
 *    - Unavailable: Marked explicitly without synthetic prices.
 *
 * 4. Deterministic Multi-Factor Ranking:
 *    Ranks feasible crops deterministically (Agronomic Tier -> Economic Category & Margin ->
 *    Market Volatility -> Deterministic Key) without arbitrary weighting.
 *
 * 5. Explainability & Cautions:
 *    Produces grounded 'whyRecommended' statements and actionable 'cautions' directly derived
 *    from verified metadata, preventing ungrounded AI claims.
 *
 * 6. Zero Network, Zero DOM:
 *    Pure computation engine compatible with Node.js and modern browsers.
 */

(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CropRecommendation = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var REGIONAL_DISCLAIMER = 'State-level agricultural baseline; local soil testing and KVK/Soil Health Card guidance should precede final planting decisions.';

  var SUPPORTED_CROPS = Object.freeze(['rice', 'wheat', 'maize', 'potato', 'onion', 'mustard']);

  var VALID_SEASONS = Object.freeze(['kharif', 'rabi', 'zaid']);

  var SEASON_SYNONYMS = {
    'kharif': 'kharif',
    'monsoon': 'kharif',
    'monsoon_season': 'kharif',
    'rabi': 'rabi',
    'winter': 'rabi',
    'winter_season': 'rabi',
    'zaid': 'zaid',
    'summer': 'zaid',
    'summer_season': 'zaid'
  };

  var IRRIGATION_SYNONYMS = {
    'canal': 'canal',
    'canal_irrigation': 'canal',
    'tubewell': 'tubewell',
    'tube_well': 'tubewell',
    'bore': 'tubewell',
    'borewell': 'tubewell',
    'well': 'tubewell',
    'drip': 'drip',
    'drip_irrigation': 'drip',
    'sprinkler': 'sprinkler',
    'sprinkler_irrigation': 'sprinkler',
    'rainfed': 'rainfed',
    'rain': 'rainfed',
    'rain_fed': 'rainfed',
    'monsoon': 'rainfed'
  };

  var SOIL_SYNONYMS = {
    'alluvial': 'alluvial',
    'alluvial_soil': 'alluvial',
    'alluvial_loam': 'alluvial',
    'alluvial_silt_loam': 'alluvial',
    'light_alluvial': 'alluvial',
    'clay': 'clay',
    'clay_soil': 'clay',
    'clay_loam': 'clay_loam',
    'silt_clay': 'silt_clay',
    'silty_clay': 'silt_clay',
    'silt_loam': 'silt_loam',
    'silty_loam': 'silt_loam',
    'loam': 'loam',
    'loamy_soil': 'loam',
    'red_loam': 'red_loam',
    'red_soil': 'red_loam',
    'red_sandy_loam': 'red_loam',
    'light_red_soil': 'light_red_soil',
    'sandy_loam': 'sandy_loam',
    'sandy_soil': 'sandy_loam',
    'black_soil': 'black_soil',
    'black_loam': 'black_soil',
    'light_black_soil': 'black_soil',
    'loamy_sand': 'light_sandy_soil',
    'light_sandy_soil': 'light_sandy_soil',
    'gravelly_soil': 'gravelly_soil',
    'gravelly_loam': 'gravelly_soil',
    'coarse_sand': 'coarse_sand',
    'waterlogged_soil': 'waterlogged_soil',
    'waterlogged': 'waterlogged_soil',
    'heavy_waterlogged_clay': 'waterlogged_soil',
    'saline_alkali_unreclaimed': 'saline_alkali_unreclaimed',
    'saline': 'saline_alkali_unreclaimed',
    'alkali': 'saline_alkali_unreclaimed',
    'severe_saline_alkali': 'saline_alkali_unreclaimed'
  };

  /**
   * Defensive deep clone helper.
   */
  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      var copyArr = [];
      for (var i = 0; i < obj.length; i++) {
        copyArr.push(deepClone(obj[i]));
      }
      return copyArr;
    }
    var copyObj = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copyObj[key] = deepClone(obj[key]);
      }
    }
    return copyObj;
  }

  /**
   * Format Indian currency: ₹1,23,456
   */
  function formatINR(amount) {
    if (amount == null || isNaN(amount)) return '—';
    var abs = Math.abs(Math.round(amount));
    var sign = amount < 0 ? '-' : '';
    var s = String(abs);
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    if (rest) {
      last3 = ',' + last3;
    }
    return sign + '₹' + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last3;
  }

  /**
   * Format display title for keys.
   */
  function formatTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  /**
   * Resolve environment dependencies safely across Browser and Node environments.
   */
  function resolveDependencies(options) {
    options = options || {};

    var agro = options.CropAgronomics || options.agronomics || (typeof CropAgronomics !== 'undefined' ? CropAgronomics : (typeof window !== 'undefined' ? window.CropAgronomics : (typeof globalThis !== 'undefined' ? globalThis.CropAgronomics : null)));
    var econ = options.CropEconomics || options.economics || (typeof CropEconomics !== 'undefined' ? CropEconomics : (typeof window !== 'undefined' ? window.CropEconomics : (typeof globalThis !== 'undefined' ? globalThis.CropEconomics : null)));
    var analytics = options.KisanAnalytics || options.analytics || (typeof KisanAnalytics !== 'undefined' ? KisanAnalytics : (typeof window !== 'undefined' ? window.KisanAnalytics : (typeof globalThis !== 'undefined' ? globalThis.KisanAnalytics : null)));
    var priceData = options.priceData || options.PRICE_DATA || (typeof PRICE_DATA !== 'undefined' ? PRICE_DATA : (typeof window !== 'undefined' ? window.PRICE_DATA : (typeof globalThis !== 'undefined' ? globalThis.PRICE_DATA : null)));

    // Fallback Node loading if in CommonJS environment
    if (typeof require === 'function') {
      if (!agro) {
        try { agro = require('./crop-agronomics.js'); } catch (e) {}
      }
      if (!econ) {
        try {
          var fs = require('fs');
          var path = require('path');
          var vm = require('vm');
          var code = fs.readFileSync(path.join(__dirname, 'crop-economics.js'), 'utf8');
          var sandbox = {};
          vm.createContext(sandbox);
          vm.runInContext(code, sandbox);
          econ = sandbox.CropEconomics;
        } catch (e) {}
      }
      if (!analytics) {
        try {
          var fsA = require('fs');
          var pathA = require('path');
          var vmA = require('vm');
          var codeA = fsA.readFileSync(pathA.join(__dirname, 'analytics.js'), 'utf8');
          var sandboxA = { window: {} };
          vmA.createContext(sandboxA);
          vmA.runInContext(codeA, sandboxA);
          analytics = sandboxA.window.KisanAnalytics;
        } catch (e) {}
      }
      if (!priceData) {
        try { priceData = require('./price_data.json'); } catch (e) {}
      }
    }

    return {
      CropAgronomics: agro,
      CropEconomics: econ,
      KisanAnalytics: analytics,
      priceData: priceData
    };
  }

  /**
   * Determine market price freshness tier based on date of last observation.
   *
   * @param {string} dateStr — Date string (e.g., '2026-03-10')
   * @param {string|number|Date} [referenceDate] — Optional reference date (defaults to current date)
   * @returns {'fresh'|'stale'|'historical'|'unavailable'}
   */
  function getFreshnessTier(dateStr, referenceDate) {
    if (!dateStr || typeof dateStr !== 'string') return 'unavailable';
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'unavailable';

    var refTime = referenceDate ? (new Date(referenceDate)).getTime() : Date.now();
    if (isNaN(refTime)) refTime = Date.now();

    var ageMs = refTime - date.getTime();
    if (ageMs < 0) {
      return 'fresh'; // contemporary or forward reference
    }

    var ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);

    if (ageYears < 2.0) {
      return 'fresh';
    } else if (ageYears < 5.0) {
      return 'stale';
    } else {
      return 'historical';
    }
  }

  /**
   * Normalize and sanitize soil input key.
   */
  function normalizeSoilKey(soilStr) {
    if (!soilStr || typeof soilStr !== 'string') return '';
    var clean = soilStr.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return SOIL_SYNONYMS[clean] || clean;
  }

  /**
   * Normalize and sanitize irrigation input key.
   */
  function normalizeIrrigationKey(irrStr) {
    if (!irrStr || typeof irrStr !== 'string') return '';
    var clean = irrStr.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return IRRIGATION_SYNONYMS[clean] || clean;
  }

  /**
   * Normalize and sanitize season input key.
   */
  function normalizeSeasonKey(seasonStr) {
    if (!seasonStr || typeof seasonStr !== 'string') return '';
    var clean = seasonStr.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return SEASON_SYNONYMS[clean] || clean;
  }

  /**
   * Validate and sanitize farmer context input.
   *
   * @param {object} context
   * @returns {object} { isValid: boolean, errors: string[], sanitized: object }
   */
  function validateFarmerContext(context) {
    var errors = [];
    if (!context || typeof context !== 'object') {
      return {
        isValid: false,
        errors: ['Farmer context must be a non-null object.'],
        sanitized: {
          state: null,
          soilType: null,
          irrigationType: null,
          season: null,
          landAcres: null
        }
      };
    }

    // 1. Land Acres Validation
    var acres = parseFloat(context.landAcres);
    if (isNaN(acres) || !isFinite(acres) || acres <= 0) {
      errors.push('Land area (landAcres) must be a positive number greater than 0 (received: ' + context.landAcres + ').');
    }

    // 2. Season Validation
    var normSeason = normalizeSeasonKey(context.season);
    if (!normSeason) {
      errors.push("Season is required. Must be one of: 'kharif', 'rabi', 'zaid'.");
    } else if (!VALID_SEASONS.includes(normSeason)) {
      errors.push("Invalid season '" + context.season + "'. Must be one of: 'kharif', 'rabi', 'zaid'.");
    }

    // 3. Soil Type Validation
    var normSoil = normalizeSoilKey(context.soilType);
    if (!normSoil) {
      errors.push("Soil type is required (e.g., 'alluvial', 'clay_loam', 'sandy_loam', 'black_soil').");
    }

    // 4. Irrigation Type Validation
    var normIrrigation = normalizeIrrigationKey(context.irrigationType);
    if (!normIrrigation) {
      errors.push("Irrigation type is required (e.g., 'canal', 'tubewell', 'drip', 'sprinkler', 'rainfed').");
    }

    // 5. State (Optional Context)
    var stateClean = null;
    if (context.state && typeof context.state === 'string' && context.state.trim().length > 0) {
      stateClean = context.state.trim();
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      sanitized: {
        state: stateClean,
        soilType: normSoil || null,
        irrigationType: normIrrigation || null,
        season: normSeason || null,
        landAcres: (!isNaN(acres) && acres > 0) ? acres : null
      }
    };
  }

  /**
   * Determine soil suitability tier for a crop.
   */
  function evaluateSoilSuitability(cropProfile, normalizedSoil) {
    var soil = cropProfile.soilSuitability;
    if (!soil) {
      return { tier: 'unknown', notes: 'Soil suitability profile not available.' };
    }

    // Infeasible tier check
    if (Array.isArray(soil.infeasible)) {
      for (var i = 0; i < soil.infeasible.length; i++) {
        var inf = soil.infeasible[i];
        if (inf === normalizedSoil || normalizeSoilKey(inf) === normalizedSoil) {
          return {
            tier: 'infeasible',
            notes: 'Soil type (' + formatTitle(normalizedSoil) + ') is agronomically infeasible for ' + cropProfile.displayName + ' due to physical/drainage/salinity constraints.'
          };
        }
      }
    }

    // Optimal tier check
    if (Array.isArray(soil.optimal)) {
      for (var j = 0; j < soil.optimal.length; j++) {
        var opt = soil.optimal[j];
        if (opt === normalizedSoil || normalizeSoilKey(opt) === normalizedSoil) {
          return {
            tier: 'optimal',
            notes: 'Soil type (' + formatTitle(normalizedSoil) + ') provides optimal physical structure, depth, and drainage for ' + cropProfile.displayName + '.'
          };
        }
      }
    }

    // Moderate tier check
    if (Array.isArray(soil.moderate)) {
      for (var k = 0; k < soil.moderate.length; k++) {
        var mod = soil.moderate[k];
        if (mod === normalizedSoil || normalizeSoilKey(mod) === normalizedSoil) {
          return {
            tier: 'moderate',
            notes: 'Soil type (' + formatTitle(normalizedSoil) + ') is moderately suitable for ' + cropProfile.displayName + '; standard nutrient and water management recommended.'
          };
        }
      }
    }

    // Conditional tier check
    if (Array.isArray(soil.conditional)) {
      for (var m = 0; m < soil.conditional.length; m++) {
        var cond = soil.conditional[m];
        if (cond === normalizedSoil || normalizeSoilKey(cond) === normalizedSoil) {
          return {
            tier: 'conditional',
            notes: 'Soil type (' + formatTitle(normalizedSoil) + ') is conditionally suitable for ' + cropProfile.displayName + '; may require specific organic amendments, drainage furrows, or pH correction.'
          };
        }
      }
    }

    return {
      tier: 'unknown',
      notes: 'Soil type (' + formatTitle(normalizedSoil) + ') is not explicitly categorized in ICAR profile; verify local soil conditions with KVK/Soil Health Card.'
    };
  }

  /**
   * Evaluate a single crop against farmer context across all 5 explainable pillars.
   *
   * @param {string} cropKey — Key of the crop (e.g. 'wheat')
   * @param {object} farmerContext — Farmer context object
   * @param {object} [options] — Dependency overrides / options
   * @returns {object|null} Evaluated crop recommendation object or null if crop is unknown
   */
  function evaluateCrop(cropKey, farmerContext, options) {
    if (!cropKey || typeof cropKey !== 'string') return null;
    var normCropKey = cropKey.toLowerCase().trim();
    if (!SUPPORTED_CROPS.includes(normCropKey)) return null;

    var deps = resolveDependencies(options);
    var CropAgronomicsModule = deps.CropAgronomics;
    var CropEconomicsModule = deps.CropEconomics;
    var KisanAnalyticsModule = deps.KisanAnalytics;
    var priceData = deps.priceData;

    var validation = validateFarmerContext(farmerContext);
    var sanitized = validation.sanitized;

    var cropProfile = CropAgronomicsModule ? CropAgronomicsModule.getCropProfile(normCropKey) : null;
    if (!cropProfile) return null;

    var exclusionReasons = [];
    var whyRecommended = [];
    var cautions = [];

    // ─────────────────────────────────────────────────────────────
    // 1. BIOLOGICAL & AGRONOMIC FEASIBILITY EVALUATION (Pre-Economic)
    // ─────────────────────────────────────────────────────────────

    // Season Compatibility Check
    var seasonCompatible = false;
    var isPrimarySeason = false;
    var sowingWindow = null;
    var selectedSeason = sanitized.season;

    if (selectedSeason) {
      if (cropProfile.compatibleSeasons && cropProfile.compatibleSeasons.includes(selectedSeason)) {
        seasonCompatible = true;
        isPrimarySeason = (selectedSeason === cropProfile.primarySeason);
        if (cropProfile.sowingWindows && cropProfile.sowingWindows[selectedSeason]) {
          sowingWindow = cropProfile.sowingWindows[selectedSeason];
        }
        if (isPrimarySeason) {
          whyRecommended.push('Optimal season match: ' + formatTitle(selectedSeason) + ' is the primary growing season (sowing: ' + (sowingWindow || 'timely') + ').');
        } else {
          whyRecommended.push('Compatible season: ' + formatTitle(selectedSeason) + ' is viable for ' + cropProfile.displayName + ' (sowing: ' + (sowingWindow || 'recommended window') + ').');
        }
      } else {
        seasonCompatible = false;
        var compatStr = cropProfile.compatibleSeasons ? cropProfile.compatibleSeasons.join(', ') : 'specific seasons';
        exclusionReasons.push("Season '" + selectedSeason + "' is not compatible with " + cropProfile.displayName + ' (Compatible seasons: ' + compatStr + ').');
      }
    }

    // Soil Suitability Check
    var soilEval = { tier: 'unknown', notes: '' };
    if (sanitized.soilType) {
      soilEval = evaluateSoilSuitability(cropProfile, sanitized.soilType);
      if (soilEval.tier === 'infeasible') {
        exclusionReasons.push("Soil type '" + formatTitle(sanitized.soilType) + "' is agronomically infeasible for " + cropProfile.displayName + '.');
      } else if (soilEval.tier === 'optimal') {
        whyRecommended.push('Optimal soil match: ' + formatTitle(sanitized.soilType) + ' soil provides excellent physical and drainage characteristics for ' + cropProfile.displayName + '.');
      } else if (soilEval.tier === 'moderate') {
        whyRecommended.push('Moderate soil match: ' + formatTitle(sanitized.soilType) + ' soil is suitable with standard agronomic practices.');
      } else if (soilEval.tier === 'conditional') {
        cautions.push('Conditional soil requirement: ' + soilEval.notes);
      }
    }

    // Irrigation Compatibility Check
    var irrigationStatus = 'compatible';
    var irrigationNotes = '';
    var waterRequirement = cropProfile.waterProfile ? cropProfile.waterProfile.waterRequirementMm : { min: 0, max: 0, text: '—' };
    var criticalStages = cropProfile.waterProfile ? cropProfile.waterProfile.criticalStages : [];

    if (sanitized.irrigationType && cropProfile.waterProfile && cropProfile.waterProfile.irrigationCompatibility) {
      var irrCompat = cropProfile.waterProfile.irrigationCompatibility[sanitized.irrigationType] || 'compatible';
      irrigationStatus = irrCompat;
      irrigationNotes = cropProfile.waterProfile.irrigationNotes || '';

      if (irrCompat === 'infeasible') {
        exclusionReasons.push("Irrigation method '" + formatTitle(sanitized.irrigationType) + "' is agronomically infeasible for " + cropProfile.displayName + ' under standard cultivation.');
      } else if (irrCompat === 'conditionally_compatible') {
        whyRecommended.push('Irrigation method (' + formatTitle(sanitized.irrigationType) + ') is usable under specific management.');
        cautions.push('Irrigation management caution: ' + irrigationNotes);
      } else {
        whyRecommended.push('Irrigation method (' + formatTitle(sanitized.irrigationType) + ') meets crop water requirement (' + waterRequirement.text + ').');
      }
    }

    // State / Regional Agro-Climatic Context
    var isMajorState = null;
    var stateNotes = '';
    if (sanitized.state && cropProfile.agroClimaticContext && Array.isArray(cropProfile.agroClimaticContext.majorGrowingStates)) {
      var stateList = cropProfile.agroClimaticContext.majorGrowingStates;
      var match = false;
      for (var s = 0; s < stateList.length; s++) {
        if (stateList[s].toLowerCase() === sanitized.state.toLowerCase()) {
          match = true;
          break;
        }
      }
      isMajorState = match;
      if (isMajorState) {
        stateNotes = sanitized.state + ' is recognized as a major commercial growing state for ' + cropProfile.displayName + '.';
        whyRecommended.push('Major producing region: ' + sanitized.state + ' is established as a prime agro-climatic belt for ' + cropProfile.displayName + '.');
      } else {
        stateNotes = 'Cultivated across suitable Indian agro-climatic zones; verify local variety adaptability with district KVK.';
      }
    }

    // Overall Biological Feasibility
    var isFeasible = (exclusionReasons.length === 0);
    var overallStatus = isFeasible ? 'FEASIBLE' : 'INFEASIBLE';

    var agronomicFit = {
      status: overallStatus,
      tier: isFeasible ? soilEval.tier : 'infeasible',
      seasonStatus: seasonCompatible ? 'compatible' : 'infeasible',
      selectedSeason: sanitized.season,
      isPrimarySeason: isPrimarySeason,
      sowingWindow: sowingWindow,
      harvestDurationDays: deepClone(cropProfile.harvestDurationDays),
      soilStatus: soilEval.tier,
      soilNotes: soilEval.notes,
      optimalPhRange: cropProfile.soilSuitability ? deepClone(cropProfile.soilSuitability.optimalPhRange) : null,
      drainagePreference: cropProfile.soilSuitability ? cropProfile.soilSuitability.drainagePreference : '',
      irrigationStatus: irrigationStatus,
      irrigationNotes: irrigationNotes,
      waterRequirementMm: deepClone(waterRequirement),
      criticalWaterStages: deepClone(criticalStages),
      isMajorGrowingState: isMajorState,
      stateNotes: stateNotes,
      climateNotes: cropProfile.temperatureProfile ? cropProfile.temperatureProfile.climateNotes : '',
      regionalDisclaimer: REGIONAL_DISCLAIMER
    };

    // ─────────────────────────────────────────────────────────────
    // 2. ECONOMICS PILLAR (Sourced from CropEconomics)
    // ─────────────────────────────────────────────────────────────

    var acres = sanitized.landAcres || 1.0;
    var econProfitability = null;
    if (CropEconomicsModule && typeof CropEconomicsModule.calculateProfitability === 'function') {
      econProfitability = CropEconomicsModule.calculateProfitability(normCropKey, acres, sanitized.irrigationType, priceData);
    }

    // Date and Freshness assessment
    var cropPriceRecord = (priceData && priceData[normCropKey]) ? priceData[normCropKey] : null;
    var priceDate = null;
    if (cropPriceRecord) {
      if (Array.isArray(cropPriceRecord.history) && cropPriceRecord.history.length > 0) {
        priceDate = cropPriceRecord.history[cropPriceRecord.history.length - 1].date || null;
      } else if (cropPriceRecord.last_updated) {
        priceDate = cropPriceRecord.last_updated;
      }
    }

    var freshnessTier = getFreshnessTier(priceDate);
    var freshnessWarning = null;

    if (freshnessTier === 'stale') {
      freshnessWarning = 'Market price is from a previous season (' + (priceDate || '2–5 years old') + '). Actual current mandi rates may vary significantly.';
      cautions.push('Stale market price benchmark (' + priceDate + ', 2–5 years old). Verify live local mandi rates before financial planning.');
    } else if (freshnessTier === 'historical') {
      freshnessWarning = 'Price data is historical (' + (priceDate || '>5 years old') + '). Treat as historical agronomic benchmark only, not current revenue expectation.';
      cautions.push('Historical price data (' + priceDate + ', >5 years old). This estimate is an agronomic benchmark only and MUST NOT be treated as current revenue expectation.');
    } else if (freshnessTier === 'unavailable') {
      freshnessWarning = 'No APMC market price data available.';
    }

    var economicsPillar = {
      available: !!(econProfitability && econProfitability.available),
      freshnessTier: freshnessTier,
      freshnessWarning: freshnessWarning,
      landAcres: acres,
      cultivationCostPerAcre: econProfitability ? econProfitability.cultivationCostPerAcre : 0,
      expectedYieldPerAcre: econProfitability ? econProfitability.expectedYieldPerAcre : 0,
      yieldUnit: econProfitability ? econProfitability.yieldUnit : 'quintals',
      totalCost: econProfitability ? econProfitability.totalCost : 0,
      totalYield: econProfitability ? econProfitability.totalYield : 0,
      marketPrice: econProfitability ? econProfitability.marketPrice : null,
      priceUnit: econProfitability ? econProfitability.priceUnit : 'per quintal',
      priceDate: priceDate,
      estimatedRevenue: econProfitability ? econProfitability.estimatedRevenue : null,
      estimatedNetReturn: econProfitability ? econProfitability.estimatedNetReturn : null,
      netMarginPerAcre: (econProfitability && econProfitability.estimatedNetReturn != null) ? (econProfitability.estimatedNetReturn / acres) : null,
      roi: econProfitability ? econProfitability.roi : null,
      breakEvenPrice: econProfitability ? econProfitability.breakEvenPrice : null,
      marginPerQuintal: econProfitability ? econProfitability.marginPerQuintal : null,
      isNegativeReturn: !!(econProfitability && econProfitability.estimatedNetReturn != null && econProfitability.estimatedNetReturn < 0),
      source: econProfitability ? econProfitability.source : 'CropEconomics',
      sourceNote: econProfitability ? econProfitability.sourceNote : ''
    };

    // Add economic explainability points
    if (economicsPillar.available && isFeasible) {
      if (!economicsPillar.isNegativeReturn && economicsPillar.estimatedNetReturn > 0) {
        whyRecommended.push('Positive economic projection: Estimated net margin of ' + formatINR(economicsPillar.estimatedNetReturn) + ' across ' + acres + ' acres (ROI: ' + (economicsPillar.roi ? economicsPillar.roi.toFixed(1) + '%' : '—') + ') at baseline price ' + formatINR(economicsPillar.marketPrice) + '/quintal.');
      } else if (economicsPillar.isNegativeReturn) {
        cautions.push('Negative margin warning: Estimated loss of ' + formatINR(Math.abs(economicsPillar.estimatedNetReturn)) + ' at baseline price ' + formatINR(economicsPillar.marketPrice) + '/quintal (Break-even price: ' + formatINR(economicsPillar.breakEvenPrice) + '/quintal).');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. MARKET RISK PILLAR (Historical Price Volatility via KisanAnalytics)
    // ─────────────────────────────────────────────────────────────

    var history = (cropPriceRecord && Array.isArray(cropPriceRecord.history)) ? cropPriceRecord.history : [];
    var volResult = null;
    var trendResult = null;

    if (KisanAnalyticsModule && typeof KisanAnalyticsModule.calculateVolatility === 'function') {
      volResult = KisanAnalyticsModule.calculateVolatility(history);
    }
    if (KisanAnalyticsModule && typeof KisanAnalyticsModule.calculateTrend === 'function') {
      trendResult = KisanAnalyticsModule.calculateTrend(history);
    }

    var volatilityCV = (volResult && volResult.cv != null) ? volResult.cv : null;
    var riskTier = 'insufficient';
    var riskTierLabel = 'Insufficient Data';

    if (volatilityCV != null) {
      if (volatilityCV < 10.0) {
        riskTier = 'low';
        riskTierLabel = 'Low Historical Price Volatility';
        if (isFeasible) {
          whyRecommended.push('Price stability: Low historical price volatility (CV: ' + volatilityCV + '%) in APMC records.');
        }
      } else if (volatilityCV <= 25.0) {
        riskTier = 'moderate';
        riskTierLabel = 'Moderate Historical Price Volatility';
      } else {
        riskTier = 'high';
        riskTierLabel = 'High Historical Price Volatility';
        if (isFeasible) {
          cautions.push('High price volatility: Historical market prices have shown substantial fluctuations (CV: ' + volatilityCV + '%); consider price risk mitigation.');
        }
      }
    }

    var trendDirection = (trendResult && trendResult.direction) ? trendResult.direction : 'insufficient';
    var trendConfidence = (trendResult && trendResult.confidence) ? trendResult.confidence : 'low';
    var trendRecentChangePct = (trendResult && trendResult.recentChangePct != null) ? trendResult.recentChangePct : null;

    if (isFeasible) {
      if (trendDirection === 'rising' && trendRecentChangePct != null) {
        whyRecommended.push('Favorable price trend: Recent APMC prices reflect an upward trajectory (+' + trendRecentChangePct + '% above historical average).');
      } else if (trendDirection === 'falling' && trendRecentChangePct != null) {
        cautions.push('Declining price trend: Recent APMC prices reflect a downward trajectory (' + trendRecentChangePct + '% below historical average).');
      }
    }

    var marketRiskPillar = {
      volatilityCV: volatilityCV,
      tier: riskTier,
      tierLabel: riskTierLabel,
      trend: trendDirection,
      trendConfidence: trendConfidence,
      trendRecentChangePct: trendRecentChangePct,
      observationCount: history.length,
      methodology: 'Historical price volatility measured via Coefficient of Variation (CV' + (volatilityCV != null ? ' = ' + volatilityCV + '%' : ': insufficient data') + '). Tiers: <10% Low, 10–25% Moderate, >25% High. Trend reflects deviation of recent observations from historical average.'
    };

    // ─────────────────────────────────────────────────────────────
    // 4. DATA RELIABILITY PILLAR
    // ─────────────────────────────────────────────────────────────

    var dataReliabilityPillar = {
      priceFreshness: freshnessTier,
      priceDate: priceDate,
      economicDataAvailable: economicsPillar.available,
      economicDataNote: freshnessTier === 'fresh' ? 'Current market estimate based on recent APMC prices (' + priceDate + ').' : (freshnessWarning || 'Data available'),
      agronomicEvidenceConfidence: cropProfile.source ? cropProfile.source.evidenceConfidence : 'high',
      agronomicSource: cropProfile.source ? deepClone(cropProfile.source) : null,
      warning: freshnessWarning
    };

    // ─────────────────────────────────────────────────────────────
    // 5. EXPLANATION PILLAR
    // ─────────────────────────────────────────────────────────────

    // If crop is infeasible, replace whyRecommended with empty array and populate cautions with exclusion reasons
    if (!isFeasible) {
      whyRecommended = [];
      cautions = [
        'Biological / Agronomic constraint: ' + exclusionReasons.join(' ')
      ];
    } else {
      // Add key agronomic management notes to cautions if present
      if (cropProfile.agronomicNotes && Array.isArray(cropProfile.agronomicNotes.keyPestsAndDiseases) && cropProfile.agronomicNotes.keyPestsAndDiseases.length > 0) {
        cautions.push('Key pest vigilance: ' + cropProfile.agronomicNotes.keyPestsAndDiseases[0] + '.');
      }
    }

    var explanationPillar = {
      whyRecommended: whyRecommended,
      cautions: cautions
    };

    return {
      cropKey: normCropKey,
      displayName: cropProfile.displayName,
      botanicalName: cropProfile.botanicalName,
      cropCategory: cropProfile.cropCategory,
      status: overallStatus,
      exclusionReasons: exclusionReasons,
      agronomicFit: agronomicFit,
      economics: economicsPillar,
      marketRisk: marketRiskPillar,
      dataReliability: dataReliabilityPillar,
      explanation: explanationPillar
    };
  }

  /**
   * Deterministic comparison function for sorting feasible crops.
   *
   * Priority:
   * 1. Agronomic Suitability Tier (optimal -> moderate -> conditional -> unknown)
   * 2. Economic Return & Freshness Category:
   *    - Fresh Positive Net Margin
   *    - Stale Positive Net Margin
   *    - Historical Positive Net Margin
   *    - Zero or Negative Net Margin
   *    - Unavailable Data
   * 3. Net Margin per Acre (higher is better)
   * 4. Market Price Volatility Tier (low -> moderate -> high -> insufficient)
   * 5. Deterministic Key Tie-Breaker (alphabetical)
   */
  function compareFeasibleCrops(a, b) {
    // 1. Agronomic Tier Rank
    var tierOrder = { 'optimal': 0, 'moderate': 1, 'conditional': 2, 'unknown': 3 };
    var tierA = tierOrder[a.agronomicFit.tier] !== undefined ? tierOrder[a.agronomicFit.tier] : 3;
    var tierB = tierOrder[b.agronomicFit.tier] !== undefined ? tierOrder[b.agronomicFit.tier] : 3;
    if (tierA !== tierB) {
      return tierA - tierB;
    }

    // 2. Economic Freshness & Positive Return Category
    function getEconCategory(crop) {
      if (!crop.economics.available || crop.economics.estimatedNetReturn == null) return 4;
      if (crop.economics.isNegativeReturn || crop.economics.estimatedNetReturn <= 0) return 3;
      if (crop.economics.freshnessTier === 'fresh') return 0;
      if (crop.economics.freshnessTier === 'stale') return 1;
      if (crop.economics.freshnessTier === 'historical') return 2;
      return 3;
    }

    var catA = getEconCategory(a);
    var catB = getEconCategory(b);
    if (catA !== catB) {
      return catA - catB;
    }

    // 3. Net Margin per Acre (Higher is better)
    var marginA = a.economics.netMarginPerAcre != null ? a.economics.netMarginPerAcre : -Infinity;
    var marginB = b.economics.netMarginPerAcre != null ? b.economics.netMarginPerAcre : -Infinity;
    if (marginA !== marginB && isFinite(marginA) && isFinite(marginB)) {
      return marginB - marginA;
    }

    // 4. Volatility Tier (Lower volatility preferred)
    var volOrder = { 'low': 0, 'moderate': 1, 'high': 2, 'insufficient': 3 };
    var volA = volOrder[a.marketRisk.tier] !== undefined ? volOrder[a.marketRisk.tier] : 3;
    var volB = volOrder[b.marketRisk.tier] !== undefined ? volOrder[b.marketRisk.tier] : 3;
    if (volA !== volB) {
      return volA - volB;
    }

    // 5. Deterministic Key Alphabetical Tie-Breaker
    return a.cropKey.localeCompare(b.cropKey);
  }

  /**
   * Sort infeasible crops by number of exclusion reasons, then alphabetically.
   */
  function compareInfeasibleCrops(a, b) {
    var countA = a.exclusionReasons ? a.exclusionReasons.length : 0;
    var countB = b.exclusionReasons ? b.exclusionReasons.length : 0;
    if (countA !== countB) {
      return countA - countB;
    }
    return a.cropKey.localeCompare(b.cropKey);
  }

  /**
   * Generate comprehensive crop recommendations for a given farmer context.
   *
   * @param {object} farmerContext — { state, soilType, irrigationType, season, landAcres }
   * @param {object} [options] — Dependency overrides or evaluation options
   * @returns {object} Recommendation results with feasible and infeasible crops
   */
  function getRecommendations(farmerContext, options) {
    var validation = validateFarmerContext(farmerContext);
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors,
        feasible: [],
        infeasible: [],
        context: validation.sanitized,
        timestamp: Date.now(),
        disclaimer: REGIONAL_DISCLAIMER
      };
    }

    var feasibleList = [];
    var infeasibleList = [];

    for (var i = 0; i < SUPPORTED_CROPS.length; i++) {
      var cropKey = SUPPORTED_CROPS[i];
      var evalResult = evaluateCrop(cropKey, farmerContext, options);
      if (evalResult) {
        if (evalResult.status === 'FEASIBLE') {
          feasibleList.push(evalResult);
        } else {
          infeasibleList.push(evalResult);
        }
      }
    }

    // Deterministic Sorting
    feasibleList.sort(compareFeasibleCrops);
    infeasibleList.sort(compareInfeasibleCrops);

    return {
      isValid: true,
      errors: [],
      feasible: feasibleList,
      infeasible: infeasibleList,
      context: validation.sanitized,
      timestamp: Date.now(),
      disclaimer: REGIONAL_DISCLAIMER
    };
  }

  /**
   * Get recommendation for a single crop (convenience wrapper).
   */
  function getRecommendation(cropKey, farmerContext, options) {
    return evaluateCrop(cropKey, farmerContext, options);
  }

  /**
   * Get supported crop keys.
   */
  function getSupportedCrops() {
    return SUPPORTED_CROPS.slice();
  }

  // Public API
  return {
    getRecommendations: getRecommendations,
    getRecommendation: getRecommendation,
    evaluateCrop: evaluateCrop,
    validateFarmerContext: validateFarmerContext,
    getSupportedCrops: getSupportedCrops,
    getFreshnessTier: getFreshnessTier,
    _disclaimer: REGIONAL_DISCLAIMER
  };
});
