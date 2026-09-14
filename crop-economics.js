/**
 * KisanSarthi — Crop Economics Module
 * Crop Profitability Calculator
 *
 * Provides per-acre cultivation cost data and profitability calculations
 * for major Indian crops.
 *
 * DATA SOURCING NOTE:
 * - Yield data: National average yields converted from
 *   Wikipedia "Agriculture in India" (sources: FAO, DES 2017 data)
 * - Cost data: Adapted from existing KisanSarthi estimates and
 *   publicly available Indian agricultural cost surveys.
 *   NOT independently verified against CACP/ICAR primary sources.
 * - Market prices: Dynamically read from price_data.json (APMC data)
 *
 * LIMITATIONS:
 * - Costs are national averages; actual costs vary by state, season,
 *   irrigation, and farming practices
 * - Yields are national averages; actual yields vary significantly
 * - This is an ESTIMATION tool, not a financial guarantee
 * - Cotton and Sugarcane excluded: no market price data available
 *
 * Formula:
 *   Revenue  = Market Price (₹/quintal) × Expected Yield (q/acre) × Acres
 *   Cost     = Cultivation Cost (₹/acre) × Acres
 *   Net Return = Revenue - Cost
 *   ROI      = Net Return / Total Cost × 100
 *   Break-even = Cultivation Cost / Expected Yield (₹/quintal)
 */

var CropEconomics = (function () {
  'use strict';

  /**
   * CROP_ECONOMICS — per-acre data for crops with BOTH:
   *   1. Available market price in price_data.json
   *   2. Defensible cost/yield data
   *
   * Yield source: FAO/DES national averages (via Wikipedia Agriculture in India)
   * Cost source: Existing KisanSarthi estimates (adapted from public agricultural surveys)
   */
  var CROP_ECONOMICS = {
    rice: {
      cultivationCostPerAcre: 18000,
      expectedYieldPerAcre: 15.6,
      yieldUnit: 'quintals',
      season: 'kharif',
      cropKey: 'rice',
      source: 'KisanSarthi estimate (adapted from DES/CACP public data)',
      sourceNote: 'Yield: 3.85 t/ha (Wikipedia/FAO). Cost: project estimate, not independently verified.'
    },
    wheat: {
      cultivationCostPerAcre: 12000,
      expectedYieldPerAcre: 11.3,
      yieldUnit: 'quintals',
      season: 'rabi',
      cropKey: 'wheat',
      source: 'KisanSarthi estimate (adapted from DES/CACP public data)',
      sourceNote: 'Yield: 2.80 t/ha (Wikipedia/FAO). Cost: project estimate, not independently verified.'
    },
    maize: {
      cultivationCostPerAcre: 10000,
      expectedYieldPerAcre: 4.4,
      yieldUnit: 'quintals',
      season: 'kharif',
      cropKey: 'maize',
      source: 'KisanSarthi estimate (adapted from DES/CACP public data)',
      sourceNote: 'Yield: 1.10 t/ha (Wikipedia/FAO). Cost: project estimate, not independently verified.'
    },
    potato: {
      cultivationCostPerAcre: 22000,
      expectedYieldPerAcre: 80.5,
      yieldUnit: 'quintals',
      season: 'rabi',
      cropKey: 'potato',
      source: 'KisanSarthi estimate (adapted from DES/CACP public data)',
      sourceNote: 'Yield: 19.9 t/ha (Wikipedia/FAO). High yield crop.'
    },
    onion: {
      cultivationCostPerAcre: 20000,
      expectedYieldPerAcre: 67.1,
      yieldUnit: 'quintals',
      season: 'rabi',
      cropKey: 'onion',
      source: 'KisanSarthi estimate (adapted from DES/CACP public data)',
      sourceNote: 'Yield: 16.6 t/ha (Wikipedia/FAO). Price volatile.'
    },
    mustard: {
      cultivationCostPerAcre: 8000,
      expectedYieldPerAcre: 6.4,
      yieldUnit: 'quintals',
      season: 'rabi',
      cropKey: 'mustard',
      source: 'KisanSarthi estimate (adapted from DES/CACP public data)',
      sourceNote: 'Yield: ~1.59 t/ha aggregate oilseed avg (Wikipedia/Agriculture in India, 2019 data). Not mustard-specific. Cost: project estimate, not independently verified.'
    }
  };

  /**
   * Format crop key "brinjal(ladies_finger)" → "Brinjal"
   * Format "bhindi(ladies_finger)" → "Bhindi"
   */
  function formatCropName(key) {
    var clean = key.replace(/\(.*?\)/g, '').replace(/_/g, ' ').trim();
    return clean.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /**
   * Format currency in Indian notation: ₹1,23,456
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
   * Calculate profitability for a single crop.
   *
   * @param {string} cropKey — key in CROP_ECONOMICS (e.g. 'rice')
   * @param {number} acres — land area (> 0)
   * @param {string} irrigationType — 'canal' | 'bore' | 'rain'
   * @param {object} priceData — PRICE_DATA object from price_data.json
   * @returns {object|null} profitability result, or null if invalid
   */
  function calculateProfitability(cropKey, acres, irrigationType, priceData) {
    // --- Input validation ---
    if (!cropKey || !CROP_ECONOMICS[cropKey]) return null;
    acres = parseFloat(acres);
    if (isNaN(acres) || acres <= 0) return null;

    var econ = CROP_ECONOMICS[cropKey];
    var marketPrice = null;
    var priceUnit = 'per quintal';

    // --- Fetch current market price from PRICE_DATA ---
    if (priceData && priceData[econ.cropKey]) {
      marketPrice = priceData[econ.cropKey].current_price;
      priceUnit = priceData[econ.cropKey].unit || 'per quintal';
    }

    // --- Core calculations ---
    var totalCost = econ.cultivationCostPerAcre * acres;
    var yieldPerAcre = econ.expectedYieldPerAcre;
    var totalYield = yieldPerAcre * acres;
    var estimatedRevenue = marketPrice != null ? marketPrice * yieldPerAcre * acres : null;
    var estimatedNetReturn = estimatedRevenue != null ? estimatedRevenue - totalCost : null;
    var roi = estimatedRevenue != null ? (estimatedNetReturn / totalCost) * 100 : null;
    var breakEvenPrice = yieldPerAcre > 0 ? econ.cultivationCostPerAcre / yieldPerAcre : null;
    var marginPerQuintal = marketPrice != null && breakEvenPrice != null ? marketPrice - breakEvenPrice : null;

    return {
      cropKey: cropKey,
      cropName: formatCropName(econ.cropKey),
      acres: acres,
      irrigationType: irrigationType,
      marketPrice: marketPrice,
      priceUnit: priceUnit,
      cultivationCostPerAcre: econ.cultivationCostPerAcre,
      expectedYieldPerAcre: yieldPerAcre,
      yieldUnit: econ.yieldUnit,
      totalCost: totalCost,
      totalYield: totalYield,
      estimatedRevenue: estimatedRevenue,
      estimatedNetReturn: estimatedNetReturn,
      roi: roi,
      breakEvenPrice: breakEvenPrice,
      marginPerQuintal: marginPerQuintal,
      season: econ.season,
      source: econ.source,
      sourceNote: econ.sourceNote,
      available: marketPrice != null
    };
  }

  /**
   * Compare profitability across all crops with valid data.
   *
   * @param {number} acres — land area
   * @param {string} irrigationType — 'canal' | 'bore' | 'rain'
   * @param {object} priceData — PRICE_DATA object
   * @returns {object[]} sorted array by estimated net return (descending)
   */
  function compareCrops(acres, irrigationType, priceData) {
    var results = [];
    var keys = Object.keys(CROP_ECONOMICS);
    for (var i = 0; i < keys.length; i++) {
      var r = calculateProfitability(keys[i], acres, irrigationType, priceData);
      if (r && r.available) {
        results.push(r);
      }
    }
    // Sort by estimated net return (descending)
    results.sort(function (a, b) {
      return (b.estimatedNetReturn || 0) - (a.estimatedNetReturn || 0);
    });
    return results;
  }

  /**
   * Get break-even market price for a crop.
   * Below this price, the farmer operates at a loss.
   *
   * @param {string} cropKey
   * @returns {object|null} { breakEvenPrice, costPerAcre, yieldPerAcre }
   */
  function getBreakEvenPrice(cropKey) {
    if (!CROP_ECONOMICS[cropKey]) return null;
    var econ = CROP_ECONOMICS[cropKey];
    if (econ.expectedYieldPerAcre <= 0) return null;
    return {
      breakEvenPrice: econ.cultivationCostPerAcre / econ.expectedYieldPerAcre,
      costPerAcre: econ.cultivationCostPerAcre,
      yieldPerAcre: econ.expectedYieldPerAcre
    };
  }

  /**
   * Get all supported crop keys.
   */
  function getSupportedCrops() {
    return Object.keys(CROP_ECONOMICS);
  }

  /**
   * Get economics data for a single crop.
   */
  function getCropData(cropKey) {
    return CROP_ECONOMICS[cropKey] || null;
  }

  // Public API
  return {
    CROP_ECONOMICS: CROP_ECONOMICS,
    calculateProfitability: calculateProfitability,
    compareCrops: compareCrops,
    getBreakEvenPrice: getBreakEvenPrice,
    getSupportedCrops: getSupportedCrops,
    getCropData: getCropData,
    formatINR: formatINR,
    formatCropName: formatCropName
  };
})();
