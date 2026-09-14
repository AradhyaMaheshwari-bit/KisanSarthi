/**
 * KisanSarthi — Crop Agronomic Metadata Specification (Phase 9B)
 *
 * Standalone agronomic evidence module providing structured, peer-reviewed
 * agronomic profiles for the 6 primary Indian crops.
 *
 * SOURCING & PROVENANCE STANDARDS:
 * - Sourced from published standards of Indian Council of Agricultural Research (ICAR)
 *   institutes (ICAR-IIRR, ICAR-IIWBR, ICAR-IIMR, ICAR-CPRI, ICAR-DOGR, ICAR-DRMR),
 *   DAC&FW (Department of Agriculture, Cooperation & Farmers Welfare), and State
 *   Agricultural Universities (PAU, TNAU, CCSHAU, GBPUAT).
 * - Graded soil and water suitability models replace simplistic binary rules.
 * - State selections are treated as broad agro-climatic context, NOT micro-district guarantees.
 *
 * ARCHITECTURAL SEPARATION:
 * - crop-agronomics.js: Agronomic evidence & physical suitability metadata ONLY.
 * - crop-economics.js: Economic cost/yield/margin calculations ONLY.
 * - analytics.js: Time-series statistical & volatility calculations ONLY.
 * - recommendation-engine.js (Phase 9C): Decision engine that evaluates all layers.
 *
 * No economic multipliers, recommendation scores, or market prices are present in this module.
 */

(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CropAgronomics = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var REGIONAL_DISCLAIMER = 'State-level agricultural baseline; local soil testing and KVK/Soil Health Card guidance should precede final planting decisions.';

  /**
   * CROP_AGRONOMICS — Structured, evidence-backed agronomic metadata dictionary
   * for exactly the 6 primary crops.
   */
  var CROP_AGRONOMICS = {
    rice: {
      cropKey: 'rice',
      displayName: 'Rice (Paddy)',
      botanicalName: 'Oryza sativa',
      cropCategory: 'cereal',
      compatibleSeasons: ['kharif', 'rabi'],
      primarySeason: 'kharif',
      sowingWindows: {
        kharif: 'June 15 – July 15 (transplanting 21–25 days nursery); Direct Seeded Rice (DSR): June 1–15',
        rabi: 'November – December (Boro / Summer rice in West Bengal, Assam, Odisha, and South India)'
      },
      harvestDurationDays: {
        min: 110,
        max: 150,
        typical: 130,
        notes: 'Early duration varieties: 100–115 days; Medium: 120–135 days; Late duration: 140–150+ days.'
      },
      soilSuitability: {
        optimal: ['clay_loam', 'clay', 'alluvial', 'silt_clay'],
        moderate: ['silt_loam', 'loam', 'red_loam'],
        conditional: ['sandy_loam', 'light_red_soil'],
        infeasible: ['coarse_sand', 'gravelly_soil', 'saline_alkali_unreclaimed'],
        optimalPhRange: { min: 5.5, max: 7.5 },
        drainagePreference: 'Submerged/slow drainage during vegetative stage; well-drained during grain ripening.'
      },
      waterProfile: {
        waterRequirementMm: { min: 1200, max: 1500, text: '1,200 – 1,500 mm' },
        criticalStages: [
          'Nursery / Early Transplanting (shallow standing water 2–3 cm)',
          'Active Tillering (3–5 cm water ponding)',
          'Panicle Initiation (PI)',
          'Flowering / Anthesis (moisture stress induces severe floret sterility)',
          'Milk and Dough stage'
        ],
        irrigationCompatibility: {
          canal: 'compatible',
          tubewell: 'compatible',
          drip: 'conditionally_compatible',
          sprinkler: 'infeasible',
          rainfed: 'conditionally_compatible'
        },
        irrigationNotes: 'Drip is conditionally compatible only under Aerobic / DSR cultivation. Sprinkler is unsuitable for flooded paddy. Rainfed is viable only in high-rainfall zones (>1,000 mm Kharif).'
      },
      temperatureProfile: {
        optimalTemperatureC: { min: 22, max: 32, text: '22°C – 32°C' },
        climateNotes: 'Warm and humid climate. Requires mean temperature of 22°C–32°C. Temperatures >35°C during anthesis cause floret sterility.'
      },
      agroClimaticContext: {
        majorGrowingStates: [
          'West Bengal',
          'Uttar Pradesh',
          'Punjab',
          'Andhra Pradesh',
          'Tamil Nadu',
          'Odisha',
          'Bihar',
          'Chhattisgarh',
          'Telangana',
          'Haryana'
        ],
        regionalBelts: 'Indo-Gangetic Alluvial plains, Eastern and Southern Coastal Deltas, Brahmaputra Valley.',
        disclaimer: REGIONAL_DISCLAIMER
      },
      agronomicNotes: {
        keyPestsAndDiseases: [
          'Blast (Magnaporthe oryzae)',
          'Bacterial Leaf Blight (Xanthomonas oryzae)',
          'Sheath Blight (Rhizoctonia solani)',
          'Brown Planthopper (Nilaparvata lugens)',
          'Stem Borer (Scirpophaga incertulas)'
        ],
        managementTips: [
          'Zinc Sulphate (25 kg/ha) application recommended in nursery and field to prevent Khaira disease.',
          'Alternate Wetting and Drying (AWD) saves 15–25% irrigation water without yield loss.',
          'Direct Seeded Rice (DSR) with pre-emergence herbicide reduces labor and nursery water needs.'
        ]
      },
      source: {
        institution: 'ICAR-IIRR (Indian Institute of Rice Research, Hyderabad) & ICAR-NRRI (Cuttack)',
        document: 'Handbook of Agriculture (ICAR, 6th Edition) & Rice Package of Practices (PAU / TNAU)',
        topic: 'Rice Agronomy, Soil Adaptability & Irrigation Scheduling',
        evidenceConfidence: 'high',
        notes: 'National benchmark crop profile verified against ICAR and Directorate of Economics and Statistics (DES) agricultural agronomy guidelines.'
      }
    },

    wheat: {
      cropKey: 'wheat',
      displayName: 'Wheat',
      botanicalName: 'Triticum aestivum',
      cropCategory: 'cereal',
      compatibleSeasons: ['rabi'],
      primarySeason: 'rabi',
      sowingWindows: {
        rabi: 'November 1 – November 25 (Timely sown); Late sown: November 25 – December 15 (yield penalty of 30–40 kg/ha/day delay)'
      },
      harvestDurationDays: {
        min: 110,
        max: 145,
        typical: 135,
        notes: 'Central and Peninsular zones: 105–120 days; North-Western Plains Zone (NWPZ): 130–145 days.'
      },
      soilSuitability: {
        optimal: ['alluvial', 'clay_loam', 'loam', 'silt_loam'],
        moderate: ['black_soil', 'sandy_clay_loam', 'red_loam'],
        conditional: ['sandy_loam', 'light_alluvial'],
        infeasible: ['heavy_waterlogged_clay', 'coarse_sand', 'saline_sodic_unreclaimed'],
        optimalPhRange: { min: 6.0, max: 7.5 },
        drainagePreference: 'Well-drained soil essential; highly sensitive to surface water stagnation exceeding 24 hours.'
      },
      waterProfile: {
        waterRequirementMm: { min: 450, max: 650, text: '450 – 650 mm' },
        criticalStages: [
          'Crown Root Initiation (CRI) at 20–25 DAS (Most critical for tillering)',
          'Tillering stage at 40–45 DAS',
          'Late Jointing / Stem elongation at 60–65 DAS',
          'Booting / Flowering at 80–85 DAS',
          'Milk / Early grain fill at 100–105 DAS',
          'Dough stage at 115–120 DAS'
        ],
        irrigationCompatibility: {
          canal: 'compatible',
          tubewell: 'compatible',
          drip: 'conditionally_compatible',
          sprinkler: 'compatible',
          rainfed: 'conditionally_compatible'
        },
        irrigationNotes: 'Requires 4–6 irrigations in North India. Sprinkler is highly effective in sandy loam tracts. Rainfed is viable only in heavy soil tracts with high residual moisture (e.g. MP Malwa durum/sharbati) with expected 40% yield drop vs irrigated.'
      },
      temperatureProfile: {
        optimalTemperatureC: { min: 15, max: 25, text: '15°C – 25°C' },
        climateNotes: 'Cool winter crop. Sowing optimum: 20°C–22°C; Vegetative: 15°C–20°C; Ripening: 20°C–25°C. High temperatures (>30°C) during March cause terminal heat stress and grain shriveling.'
      },
      agroClimaticContext: {
        majorGrowingStates: [
          'Uttar Pradesh',
          'Madhya Pradesh',
          'Punjab',
          'Haryana',
          'Rajasthan',
          'Bihar',
          'Gujarat',
          'Maharashtra'
        ],
        regionalBelts: 'North-Western Plains Zone (NWPZ), North-Eastern Plains Zone (NEPZ), Central Zone (CZ), Peninsular Zone (PZ).',
        disclaimer: REGIONAL_DISCLAIMER
      },
      agronomicNotes: {
        keyPestsAndDiseases: [
          'Yellow / Stripe Rust (Puccinia striiformis)',
          'Brown / Leaf Rust (Puccinia triticina)',
          'Karnal Bunt (Tilletia indica)',
          'Loose Smut (Ustilago tritici)',
          'Termites and Aphids'
        ],
        managementTips: [
          'Sowing with Happy Seeder / Super Seeder into standing rice stubble conserves soil moisture and prevents terminal heat exposure.',
          'First irrigation at Crown Root Initiation (21 days after sowing) is non-negotiable for root establishment.',
          'Avoid over-irrigation at grain filling to prevent crop lodging under windy conditions.'
        ]
      },
      source: {
        institution: 'ICAR-IIWBR (Indian Institute of Wheat and Barley Research, Karnal)',
        document: 'ICAR-IIWBR Vision 2050 & PAU / CCSHAU Rabi Crop Package of Practices',
        topic: 'Wheat Agronomy, Irrigation Scheduling & Thermal Tolerance',
        evidenceConfidence: 'high',
        notes: 'Verified against ICAR-IIWBR research bulletins and national wheat agronomy recommendations.'
      }
    },

    maize: {
      cropKey: 'maize',
      displayName: 'Maize (Corn)',
      botanicalName: 'Zea mays',
      cropCategory: 'cereal',
      compatibleSeasons: ['kharif', 'rabi', 'zaid'],
      primarySeason: 'kharif',
      sowingWindows: {
        kharif: 'June 15 – July 15 (onset of monsoon)',
        rabi: 'October 15 – November 15 (Bihar, South India, and Eastern UP)',
        zaid: 'February 1 – February 20 (Spring maize in Punjab, Haryana, Western UP)'
      },
      harvestDurationDays: {
        min: 85,
        max: 120,
        typical: 100,
        notes: 'Early hybrids: 80–90 days; Medium maturity: 90–105 days; Full-season Rabi hybrids: 110–125 days.'
      },
      soilSuitability: {
        optimal: ['sandy_loam', 'loam', 'alluvial', 'silt_loam'],
        moderate: ['red_loam', 'light_black_soil', 'clay_loam'],
        conditional: ['heavy_clay_loam', 'shallow_gravelly_soil'],
        infeasible: ['waterlogged_clay', 'saline_alkali_soils', 'poorly_drained_heavy_black'],
        optimalPhRange: { min: 5.8, max: 7.5 },
        drainagePreference: 'Strictly well-drained. Extremely sensitive to water stagnation during early vegetative stages (24–48 hours of flooding kills seedlings).'
      },
      waterProfile: {
        waterRequirementMm: { min: 500, max: 700, text: '500 – 700 mm' },
        criticalStages: [
          'Early vegetative / Knee-high stage (30–35 DAS)',
          'Tasseling stage (50–55 DAS)',
          'Silking stage (55–60 DAS — Most critical for cob pollination)',
          'Grain Filling / Dough stage (75–85 DAS)'
        ],
        irrigationCompatibility: {
          canal: 'compatible',
          tubewell: 'compatible',
          drip: 'compatible',
          sprinkler: 'compatible',
          rainfed: 'compatible'
        },
        irrigationNotes: 'Highly responsive to drip fertigation (yield increase of 20–30% with 40% water savings). In Kharif, ensure drainage furrows to prevent waterlogging.'
      },
      temperatureProfile: {
        optimalTemperatureC: { min: 21, max: 30, text: '21°C – 30°C' },
        climateNotes: 'Versatile C4 cereal. Germinates above 10°C; optimum growth 21°C–30°C. Extreme temperatures (>38°C) during silking desiccate pollen.'
      },
      agroClimaticContext: {
        majorGrowingStates: [
          'Karnataka',
          'Madhya Pradesh',
          'Bihar',
          'Tamil Nadu',
          'Telangana',
          'Maharashtra',
          'Andhra Pradesh',
          'Rajasthan',
          'Uttar Pradesh',
          'Punjab'
        ],
        regionalBelts: 'Peninsular Deccan Plateau, Central India tribal belts, Bihar Eastern plains, North-Western spring maize belt.',
        disclaimer: REGIONAL_DISCLAIMER
      },
      agronomicNotes: {
        keyPestsAndDiseases: [
          'Fall Armyworm (Spodoptera frugiperda — major invasive pest)',
          'Maize Stem Borer (Chilo partellus)',
          'Banded Leaf and Sheath Blight (Rhizoctonia solani)',
          'Turcicum Leaf Blight (Exserohilum turcicum)',
          'Post-flowering Stalk Rot'
        ],
        managementTips: [
          'Plant on ridges or Broad Bed Furrow (BBF) to prevent seedling waterlogging during Kharif rains.',
          'Early scout for Fall Armyworm (FAW) whorl damage; apply biologicals (Metarhizium/Bacillus) or recommended lures.',
          'Heavy feeder of nitrogen: apply in 3 splits (sowing, knee-high, and tasseling stages).'
        ]
      },
      source: {
        institution: 'ICAR-IIMR (Indian Institute of Maize Research, Ludhiana)',
        document: 'ICAR-IIMR Maize Production Technology & TNAU / PAU Crop Handbooks',
        topic: 'Maize Agronomy, Hybrid Selection & Fall Armyworm Integrated Management',
        evidenceConfidence: 'high',
        notes: 'Verified against ICAR-IIMR multi-location trial guidelines and national kharif/rabi maize packages.'
      }
    },

    potato: {
      cropKey: 'potato',
      displayName: 'Potato',
      botanicalName: 'Solanum tuberosum',
      cropCategory: 'tuber',
      compatibleSeasons: ['rabi', 'kharif'],
      primarySeason: 'rabi',
      sowingWindows: {
        rabi: 'October 15 – November 5 (Indo-Gangetic Plains main crop); Early crop: September 25 – October 10',
        kharif: 'June – July (Restricted to plateau and hill tracts: Karnataka Hassan, Maharashtra Pune/Satara, Nilgiris, HP hills)'
      },
      harvestDurationDays: {
        min: 75,
        max: 120,
        typical: 95,
        notes: 'Early table varieties (e.g. Kufri Pukhraj): 70–80 days; Main crop / Cold storage (e.g. Kufri Bahar, Kufri Jyoti): 90–110 days.'
      },
      soilSuitability: {
        optimal: ['sandy_loam', 'silt_loam', 'alluvial'],
        moderate: ['loam', 'friable_clay_loam', 'light_red_loam'],
        conditional: ['sandy_soil', 'red_sandy_loam'],
        infeasible: ['heavy_compact_clay', 'waterlogged_soil', 'saline_alkaline_soil', 'stony_gravelly_soil'],
        optimalPhRange: { min: 5.2, max: 6.8 },
        drainagePreference: 'Loose, friable, highly drained soil essential. Heavy clay restricts tuber expansion, induces misshapen tubers, and promotes soft rot.'
      },
      waterProfile: {
        waterRequirementMm: { min: 450, max: 600, text: '450 – 600 mm' },
        criticalStages: [
          'Sprouting / Emergence (10–15 DAP)',
          'Stolon Formation / Tuber Initiation (30–35 DAP — Critical)',
          'Tuber Bulking stage (45–75 DAP — Most critical for yield)',
          'Dehaulming / Skin hardening (Stop irrigation 7–10 days before harvest)'
        ],
        irrigationCompatibility: {
          canal: 'compatible',
          tubewell: 'compatible',
          drip: 'compatible',
          sprinkler: 'compatible',
          rainfed: 'infeasible'
        },
        irrigationNotes: 'Shallow-rooted crop requiring frequent, light, uniform irrigations (7–10 days interval). Sprinkler provides frost protection during cold waves. Rainfed is strictly infeasible in winter plains.'
      },
      temperatureProfile: {
        optimalTemperatureC: { min: 16, max: 25, text: '16°C – 25°C' },
        climateNotes: 'Requires cool weather with sunny days. Optimum vegetative growth: 20°C–25°C. Critical tuberization requires night temperatures of 16°C–20°C; tuber formation ceases if night temperature exceeds 23°C–25°C.'
      },
      agroClimaticContext: {
        majorGrowingStates: [
          'Uttar Pradesh',
          'West Bengal',
          'Bihar',
          'Gujarat',
          'Madhya Pradesh',
          'Punjab',
          'Haryana'
        ],
        regionalBelts: 'Indo-Gangetic Alluvial Belt (UP, WB, Bihar produce >80% of national output), Gujarat Deesa belt, Malwa plateau.',
        disclaimer: REGIONAL_DISCLAIMER
      },
      agronomicNotes: {
        keyPestsAndDiseases: [
          'Late Blight (Phytophthora infestans — devastating in cool, humid, foggy weather)',
          'Early Blight (Alternaria solani)',
          'Black Scurf (Rhizoctonia solani)',
          'Common Scab (Streptomyces scabies)',
          'Aphids (Myzus persicae — virus vector)'
        ],
        managementTips: [
          'Use certified, disease-free seed tubers treated with Trichoderma or Mancozeb before planting.',
          'Earthing-up (mounding soil around plants) at 25–30 DAP prevents tuber exposure to sunlight and solanine greening.',
          'Dehaulm (cut foliage) 10–12 days prior to digging to allow tuber skin to harden for post-harvest storage.'
        ]
      },
      source: {
        institution: 'ICAR-CPRI (Central Potato Research Institute, Shimla)',
        document: 'ICAR-CPRI Potato Production Technology in India & PAU Vegetable Package of Practices',
        topic: 'Potato Agronomy, Seed Tuber Management & Late Blight Prophylaxis',
        evidenceConfidence: 'high',
        notes: 'Verified against ICAR-CPRI technical guidelines and National Horticulture Board (NHB) crop standards.'
      }
    },

    onion: {
      cropKey: 'onion',
      displayName: 'Onion',
      botanicalName: 'Allium cepa',
      cropCategory: 'bulb_vegetable',
      compatibleSeasons: ['rabi', 'kharif'],
      primarySeason: 'rabi',
      sowingWindows: {
        rabi: 'Nursery: October 15 – November 15; Transplanting: December 15 – January 15; Harvest: April – May (Accounts for 60–65% of national production; suitable for long storage)',
        kharif: 'Nursery: June 15 – July 15; Transplanting: August 1 – August 30; Harvest: November – December (Maharashtra, Karnataka, Rajasthan; limited storage life)'
      },
      harvestDurationDays: {
        min: 120,
        max: 150,
        typical: 135,
        notes: 'Total cycle from seed: 120–150 days (Nursery: 45–50 days; Field: 90–110 days after transplanting).'
      },
      soilSuitability: {
        optimal: ['sandy_loam', 'silt_loam', 'alluvial', 'red_sandy_loam'],
        moderate: ['medium_black_soil', 'loam', 'clay_loam'],
        conditional: ['light_sandy_soil', 'heavy_clay_loam'],
        infeasible: ['heavy_waterlogged_clay', 'saline_alkali_soil', 'acidic_soil_below_5.5'],
        optimalPhRange: { min: 6.0, max: 7.5 },
        drainagePreference: 'Excellent soil drainage required. Heavy sticky clays restrict bulb enlargement, cause split bulbs, and promote fungal basal rot.'
      },
      waterProfile: {
        waterRequirementMm: { min: 350, max: 550, text: '350 – 550 mm' },
        criticalStages: [
          'Establishment / Immediately after transplanting',
          'Vegetative foliage growth (15–45 DAT)',
          'Bulb Initiation stage (50–60 DAT — Critical)',
          'Bulb Development / Enlargement (65–85 DAT — Most critical)',
          'Maturity / Neck fall (Withhold irrigation 10–15 days before harvest)'
        ],
        irrigationCompatibility: {
          canal: 'compatible',
          tubewell: 'compatible',
          drip: 'compatible',
          sprinkler: 'compatible',
          rainfed: 'infeasible'
        },
        irrigationNotes: 'Shallow-rooted root system confined to top 15–20 cm. Drip fertigation improves marketable bulb size and saves 25–35% water. In Rabi, rainfed cultivation is strictly infeasible.'
      },
      temperatureProfile: {
        optimalTemperatureC: { min: 15, max: 30, text: '15°C – 30°C' },
        climateNotes: 'Optimum vegetative growth: 15°C–25°C; Bulb formation: 20°C–30°C with 10–12 hours photoperiod. High temperatures (>35°C) trigger premature bolting and forced bulb maturity.'
      },
      agroClimaticContext: {
        majorGrowingStates: [
          'Maharashtra',
          'Madhya Pradesh',
          'Karnataka',
          'Gujarat',
          'Rajasthan',
          'Bihar',
          'Andhra Pradesh',
          'Haryana'
        ],
        regionalBelts: 'Western Maharashtra (Nashik, Ahmednagar, Pune belt), Malwa plateau (MP), Saurashtra (Gujarat).',
        disclaimer: REGIONAL_DISCLAIMER
      },
      agronomicNotes: {
        keyPestsAndDiseases: [
          'Thrips (Thrips tabaci — primary pest causing silver leaf mottling and vectoring Iris Yellow Spot Virus)',
          'Purple Blotch (Alternaria porri — severe in humid winter showers)',
          'Stemphylium Leaf Blight (Stemphylium vesicarium)',
          'Basal Rot / Damping off (Fusarium oxysporum / Pythium)'
        ],
        managementTips: [
          'Transplant healthy 45–50 day old seedlings at 15 × 10 cm spacing on Broad Bed Furrows (BBF).',
          'Apply micro-irrigation (drip) with water-soluble fertilizers for uniform single-centered bulbs.',
          'Cure harvested bulbs in shade for 3–5 days until outer skin papery dry before storage.'
        ]
      },
      source: {
        institution: 'ICAR-DOGR (Directorate of Onion and Garlic Research, Rajgurunagar, Pune)',
        document: 'ICAR-DOGR Technical Bulletin on Commercial Onion Production & NHB Crop Guidelines',
        topic: 'Onion Agronomy, Nursery Management, Micro-Irrigation & Curing',
        evidenceConfidence: 'high',
        notes: 'Verified against ICAR-DOGR national guidelines and State Agricultural University horticulture bulletins.'
      }
    },

    mustard: {
      cropKey: 'mustard',
      displayName: 'Mustard (Rapeseed)',
      botanicalName: 'Brassica juncea',
      cropCategory: 'oilseed',
      compatibleSeasons: ['rabi'],
      primarySeason: 'rabi',
      sowingWindows: {
        rabi: 'October 1 – October 25 (Optimum: October 10–20; Timely sowing escapes peak aphid infestation in January)'
      },
      harvestDurationDays: {
        min: 105,
        max: 135,
        typical: 120,
        notes: 'Toria varieties: 80–90 days; Indian Mustard (Brassica juncea e.g. RH-749, Giriraj, Pusa Bold): 115–130 days; Gobhi sarson: 140–155 days.'
      },
      soilSuitability: {
        optimal: ['sandy_loam', 'loam', 'alluvial'],
        moderate: ['light_black_soil', 'silt_loam', 'red_sandy_loam'],
        conditional: ['loamy_sand', 'gravelly_loam'],
        infeasible: ['heavy_waterlogged_clay', 'poorly_drained_saline_soils'],
        optimalPhRange: { min: 6.0, max: 7.5 },
        drainagePreference: 'Well-drained soil essential. Highly intolerant of waterlogging and poor subsoil drainage.'
      },
      waterProfile: {
        waterRequirementMm: { min: 250, max: 400, text: '250 – 400 mm' },
        criticalStages: [
          'Pre-sowing irrigation (Rauni/Palewa) for uniform seed germination',
          'Rosette / Pre-flowering stage (30–35 DAS — Most critical for branch and flower initiation)',
          'Siliqua (Pod) development / Seed filling stage (60–65 DAS)'
        ],
        irrigationCompatibility: {
          canal: 'compatible',
          tubewell: 'compatible',
          drip: 'conditionally_compatible',
          sprinkler: 'compatible',
          rainfed: 'compatible'
        },
        irrigationNotes: 'Lowest water requirement among major Rabi cash crops. Sprinkler irrigation is highly effective in sandy undulating terrains (saves 35% water). Exceptionally suited to rainfed / conserved moisture conditions (Barani tracts).'
      },
      temperatureProfile: {
        optimalTemperatureC: { min: 15, max: 25, text: '15°C – 25°C' },
        climateNotes: 'Thrives in dry and cool winter climates. Sowing optimum: 25°C–28°C; Vegetative/flowering: 15°C–22°C. Clear sunny days promote pod setting; cloudy and foggy weather promotes aphid multiplication and Alternaria.'
      },
      agroClimaticContext: {
        majorGrowingStates: [
          'Rajasthan',
          'Madhya Pradesh',
          'Haryana',
          'Uttar Pradesh',
          'West Bengal',
          'Gujarat',
          'Bihar',
          'Assam'
        ],
        regionalBelts: 'Semi-arid North-Western and Central India (Rajasthan alone contributes >40% of national production), Upper Indo-Gangetic Plains, Eastern plains.',
        disclaimer: REGIONAL_DISCLAIMER
      },
      agronomicNotes: {
        keyPestsAndDiseases: [
          'Mustard Aphid (Lipaphis erysimi — major pest; timely October sowing minimizes infestation)',
          'Mustard Sawfly (Athalia lugens proxima)',
          'Alternaria Black Spot / Blight (Alternaria brassicae)',
          'White Rust (Albugo candida)',
          'Sclerotinia Stem Rot'
        ],
        managementTips: [
          'Complete sowing between October 10–20 to enable flowering before peak aphid incidence in January.',
          'Apply Sulphur (20–40 kg/ha or Single Super Phosphate SSP as P source) to boost seed oil content by 1.5–2.5%.',
          'Thinning seedlings at 15–20 DAS to maintain 10–12 cm plant-to-plant spacing ensures robust branching.'
        ]
      },
      source: {
        institution: 'ICAR-DRMR (Directorate of Rapeseed-Mustard Research, Bharatpur, Rajasthan)',
        document: 'ICAR-DRMR Package of Practices for Rapeseed-Mustard & CCSHAU / PAU Rabi Handbooks',
        topic: 'Rapeseed-Mustard Agronomy, Conserved Moisture Utilization & Aphid Escaping Sowing Windows',
        evidenceConfidence: 'high',
        notes: 'Verified against ICAR-DRMR research bulletins, AICRP on Rapeseed-Mustard recommendations, and state university crop guidelines.'
      }
    }
  };

  var SUPPORTED_CROPS = Object.freeze(Object.keys(CROP_AGRONOMICS));

  /**
   * Helper: Deep clone an object to return defensive copies.
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
   * Get agronomic profile for a specific crop.
   *
   * @param {string} cropKey — Key of the crop (e.g., 'rice', 'wheat')
   * @returns {object|null} Defensive copy of the crop profile, or null if unknown
   */
  function getCropProfile(cropKey) {
    if (!cropKey || typeof cropKey !== 'string') return null;
    var normalizedKey = cropKey.toLowerCase().trim();
    if (!CROP_AGRONOMICS[normalizedKey]) return null;
    return deepClone(CROP_AGRONOMICS[normalizedKey]);
  }

  /**
   * Get list of all supported crop keys.
   *
   * @returns {string[]} Array of supported crop keys
   */
  function getSupportedCrops() {
    return SUPPORTED_CROPS.slice();
  }

  /**
   * Get all agronomic profiles.
   *
   * @returns {object} Defensive copy of all crop profiles keyed by cropKey
   */
  function getAllProfiles() {
    return deepClone(CROP_AGRONOMICS);
  }

  /**
   * Check if a crop key is supported by the agronomic module.
   *
   * @param {string} cropKey
   * @returns {boolean}
   */
  function isSupported(cropKey) {
    if (!cropKey || typeof cropKey !== 'string') return false;
    var normalizedKey = cropKey.toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(CROP_AGRONOMICS, normalizedKey);
  }

  // Public API
  return {
    getCropProfile: getCropProfile,
    getSupportedCrops: getSupportedCrops,
    getAllProfiles: getAllProfiles,
    isSupported: isSupported,
    _disclaimer: REGIONAL_DISCLAIMER
  };
});
