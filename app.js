/* ═══════════════════════════════════════════════════════
   LANGUAGE
══════════════════════════════════════════════════════ */
window.onload = function() {
  /* ═══════════════════════════════════════════════════════
     PRICE DATA — loaded from price_data.json
  ══════════════════════════════════════════════════════ */
  let PRICE_DATA = null;
  let PRICE_DATA_ERROR = null;

  async function loadPriceData() {
    try {
      const resp = await fetch("price_data.json");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json || typeof json !== 'object' || Object.keys(json).length === 0) {
        throw new Error('Empty or invalid dataset');
      }
      PRICE_DATA = json;
    } catch (err) {
      PRICE_DATA_ERROR = err.message || 'Failed to load price data';
      console.error('Price data load error:', PRICE_DATA_ERROR);
    }
  }

  // Format crop key "wheat" to display name "Wheat"
  function formatCropName(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Get valid forecast (reject negative values)
  function getValidForecast(crop) {
    const val = crop.forecast_30d;
    if (val == null || val < 0) return null;
    return val;
  }

  // Get crop market context for AI integration (Phase 4 prep)
  function getCropMarketContext(cropKey) {
    if (!PRICE_DATA || !PRICE_DATA[cropKey]) return null;
    const c = PRICE_DATA[cropKey];
    return {
      name: formatCropName(cropKey),
      current_price: c.current_price,
      unit: c.unit,
      avg_7d: c.avg_7d,
      change_30d_pct: c.change_30d_pct,
      forecast_30d: getValidForecast(c),
      last_updated: c.last_updated
    };
  }

  // Validate forecast values — log invalid ones for pipeline correction
  function validateForecasts() {
    if (!PRICE_DATA) return;
    const bad = Object.entries(PRICE_DATA)
      .filter(([, v]) => v.forecast_30d != null && v.forecast_30d < 0);
    if (bad.length > 0) {
      console.warn('Data quality: invalid (negative) forecasts detected:');
      bad.forEach(([k, v]) => console.warn(`  ${k}: forecast_30d = ${v.forecast_30d}`));
    }
  }

  // Calculate dataset statistics from loaded data
  function getDatasetStats() {
    if (!PRICE_DATA) return null;
    const crops = Object.keys(PRICE_DATA);
    let totalObs = 0;
    let minDate = '9999-99-99';
    let maxDate = '0000-00-00';
    crops.forEach(k => {
      const hist = PRICE_DATA[k].history || [];
      totalObs += hist.length;
      hist.forEach(h => {
        if (h.date < minDate) minDate = h.date;
        if (h.date > maxDate) maxDate = h.date;
      });
    });
    return {
      cropCount: crops.length,
      totalObservations: totalObs,
      dateRange: { min: minDate, max: maxDate }
    };
  }

  // Show price data error in the price list area
  function showPriceError() {
    const list = document.getElementById('price-list');
    if (list) {
      list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text2)">
        <div style="font-size:14px;font-weight:500;margin-bottom:6px">Price data unavailable</div>
        <div style="font-size:12px">${PRICE_DATA_ERROR || 'Could not load price dataset.'}</div>
      </div>`;
    }
  }

  // Initialize price data, then boot the UI
  loadPriceData().then(() => {
    validateForecasts();
    bootApp();
  });

  function bootApp() {

  const T = {
    en:{
      home:'Home',advisor:'Advisor',prices:'Prices',weather:'Weather',chat:'AI Chat',newfarmer:'New Farmer',disease:'Scan Plant',schemes:'Schemes',mandi:'Mandi',
      appTitle:'KisanSarthi',appSub:'Smart Agriculture Advisor',
      greet:'🙏 Namaste!',heroTitle:'Welcome to KisanSarthi',
      heroSub:'Your smart AI partner for better farming & higher income',
      tips:"Today's AI Tips",
      // Home static
      bestCropLabel:'Best crop — April',bestCropChg:'↑ 92% AI match',
      wheatPriceLabel:'Wheat / quintal',wheatPriceChg:'↑ 4.2% this week',
      weatherLabel:"Today's weather",weatherChg:'Partly cloudy',
      askAI:'Ask AI',askAILabel:'Get instant answers',askAIBadge:'● Live',
      quickActions:'Quick Actions',
      qCropAdvice:'🌾 Get crop advice',qMandiPrices:'💹 Mandi prices',qWeather:'🌦 See weather',qAskAI:'🤖 Ask AI',
      qNewFarmer:'🌱 New Farmer Guide — Water, Fertilizer & Care Plan',
      qDisease:'🔬 Scan Plant — AI Disease Detection',
      qSchemes:'🏛 Govt Schemes',qMandiLocator:'📍 Mandi Locator',
      todayTip1:'🌱 Best time to sow <strong>Moong Dal</strong> — soil temp ideal this week. Expect 6–8 q/acre.',
      todayTip2:'⚠️ Aphid alert in your region. Apply neem spray before Wednesday rain.',
      todayTip3:'💧 Wheat at grain-fill stage — water every 8 days. Do not overwater.',
      todayTip4:'🌡 Heat wave possible in 10 days — protect nursery seedlings with shade net.',
      tipAlerts:'3 alerts',
      // Prices page
      allCrops:'All crops',grains:'Grains',pulses:'Pulses',vegetables:'Vegetables',oilseeds:'Oilseeds',cashCrops:'Cash crops',
      livePricesTitle:'Live Mandi Prices — April 2026',priceTrendTitle:'Price Trend Forecast',aiPredTitle:'AI Price Predictor',
      pickCropForecast:'Pick a crop to forecast:',
      // Weather page
      weatherTitle:'Greater Noida, UP',weatherUpdated:'Updated just now',
      tempLabel:'Temperature',humLabel:'Humidity',windLabel:'Wind',
      soilTitle:'Soil Health Monitor',soilGood:'Good',
      soilMoisture:'Soil Moisture',soilMoistureVal:'68% — Good',
      soilN:'Nitrogen (N)',soilNVal:'55% — Medium',
      soilP:'Phosphorus (P)',soilPVal:'72% — Good',
      soilK:'Potassium (K)',soilKVal:'28% — Add fertiliser!',
      weatherImpactTitle:'Weather Impact on Your Crops',
      wtip1:'✅ <strong>Wheat:</strong> Grain-fill stage — conditions ideal. Maintain 8-day irrigation cycle.',
      wtip2:'⚠️ <strong>Rain Wed–Thu:</strong> Delay pesticide spray by 2 days for full effectiveness.',
      wtip3:'🌱 <strong>Moong Dal:</strong> Post-rain Friday is perfect for sowing. Temperature ideal.',
      wtip4:'🌡 <strong>Heat alert in 10 days:</strong> Cover young seedlings with shade net in afternoon.',
      // Chat page
      chatTitle:'Ask KisanAI',chatReady:'● AI Ready',
      chatQBtns:['🌱 June crop?','🐛 Aphid control?','🧪 Urea timing?','📈 Price forecast?','💧 Paddy water?','🏛 Govt schemes?','🌻 Mustard fertilizer?','💰 Sell timing?'],
      chatInitMsg:"Namaste! 🙏 I'm KisanAI — your smart farming assistant powered by AI. Ask me anything about crops, prices, weather, fertilizers, pest control, or government schemes. I give practical advice in simple language!",
      chatPlaceholder:'Type your farming question…',
      // New Farmer page
      nfHeroGreet:'🌱 Naya Kisan',nfHeroTitle:"New Farmer's Complete Guide",nfHeroSub:'Select your crop and get a full care plan — watering, fertilizers, pest control & more!',
      nfChooseCrop:'Choose Your Crop',nfNoneSelected:'None selected',nfStateLabel:'🗺 Your state?',
      nfGenBtn:'🌱 Generate My Crop Guide',nfLoadingText:'KisanAI is preparing your complete crop guide…',
      nfCompleteGuideFor:'Complete Guide for',nfFullSeason:'Full season care plan',
      nfWatering:'💧 Watering Schedule',nfWaterBadge:'Critical',
      nfFertilizer:'🧪 Fertilizer Plan',nfFertBadge:'AI Recommended',
      nfPest:'🐛 Pest & Disease Control',nfPestBadge:'Stay Alert',
      nfWeekly:'📅 Week-by-Week Care',
      nfTips:'💡 Beginner Tips',nfTipsBadge:'Must Read',
      nfAskMore:'❓ Ask More Questions',nfChatPlaceholder:'Ask anything about your crop…',
      nfAnotherCrop:'← Choose Another Crop',
      // Disease Detection page
      ddHeroTitle:'AI Disease Detection',ddHeroSub:'Upload a leaf photo and get instant diagnosis, disease name & remedy!',
      ddUploadTitle:'📸 Upload Leaf Photo',ddAiBadge:'AI Powered',
      ddDropText:'Tap to upload a leaf photo',ddDropSub:'JPG, PNG — Take a clear photo of the affected leaf',
      ddTip1:'📸 <strong>Photo tips:</strong> Take photo in daylight. Show both healthy and diseased parts of the leaf for best results.',
      ddTip2:'🌿 <strong>Works for:</strong> Wheat, Paddy, Maize, Mustard, Tomato, Cotton, Potato, and most crops.',
      ddLoadingText:'Plant Doctor AI is analyzing your leaf…',
      ddDiagnosis:'Diagnosis',
      ddAboutTitle:'🦠 About This Disease',ddSymptomsTitle:'👁 Signs & Symptoms',
      ddOrganicTitle:'🌿 Organic Remedy',ddOrganicBadge:'Natural',
      ddChemicalTitle:'🧪 Chemical Treatment',ddChemicalBadge:'Fast Acting',
      ddPreventionTitle:'🛡 Prevention Tips',ddChatTitle:'❓ Ask More About This Disease',
      ddScanAgain:'📸 Scan Another Leaf',ddAnalyzeBtn:'🔬 Analyze Now',ddClearBtn:'✕ Clear',
      ddChatPlaceholder:'Ask about treatment, cost, spray timing…',
      // Schemes page
      scHeroTitle:'Government Scheme Checker',scHeroSub:'Answer a few questions and find all schemes you qualify for!',
      scCheckTitle:'🔍 Check Your Eligibility',scStepBadge:'Step 1 of 4',
      scQ1Lbl:'🗺 Your state?',scQ2Lbl:'📐 How much land do you own?',scQ3Lbl:'👤 Your category?',scQ4Lbl:'🌾 What do you grow?',
      scCheckBtnTxt:'🏛 Check My Eligible Schemes',scLoadingText:'Checking all 20+ government schemes for you…',
      scCheckAgain:'← Check Again',
      // Mandi page
      mnHeroTitle:'Nearest Mandi Finder',mnHeroSub:'Find APMC mandis near you by state, district & area to get the best price!',
      mnSelectTitle:'🗺 Select Your Location',mnStateLbl:'State',mnDistLbl:'District',mnAreaLbl:'Area / Block (optional)',
      mnFindBtnTxt:'📍 Find Nearest Mandis',mnLoadingText:'Finding APMC mandis near you…',
      mnResTitleTxt:'Nearby APMC Mandis',mnTipsTitle:'💡 Mandi Tips',
      mnTip1:'✅ <strong>Carry all documents:</strong> Aadhaar, land papers, and bank passbook for smooth transactions.',
      mnTip2:'⚠️ <strong>Best time to sell:</strong> Arrive early (6–9 AM) for better price discovery and fresh assessment.',
      mnTip3:'💰 <strong>Check MSP first:</strong> Know today\'s MSP before going to ensure you don\'t sell below minimum price.',
      mnSearchAgain:'← Search Again',
    },
    hi:{
      home:'होम',advisor:'सलाह',prices:'भाव',weather:'मौसम',chat:'AI चैट',newfarmer:'नया किसान',disease:'पौधा जांचें',schemes:'योजना',mandi:'मंडी',
      appTitle:'किसान सारथी',appSub:'स्मार्ट कृषि सलाहकार',
      greet:'🙏 नमस्ते!',heroTitle:'किसान सारथी में आपका स्वागत है',
      heroSub:'बेहतर खेती और ज़्यादा कमाई के लिए आपका AI साथी',
      tips:'आज की AI सलाह',
      // Home static
     
      bestCropLabel:'सर्वश्रेष्ठ फसल — अप्रैल',bestCropChg:'↑ 92% AI मिलान',
      wheatPriceLabel:'गेहूं / क्विंटल',wheatPriceChg:'↑ 4.2% इस हफ्ते',
      weatherLabel:'आज का मौसम',weatherChg:'आंशिक बादल',
      askAI:'AI से पूछें',askAILabel:'तुरंत जवाब पाएं',askAIBadge:'● लाइव',
      quickActions:'त्वरित कार्य',
      qCropAdvice:'🌾 फसल सलाह लें',qMandiPrices:'💹 मंडी भाव',qWeather:'🌦 मौसम देखें',qAskAI:'🤖 AI से पूछें',
      qNewFarmer:'🌱 नया किसान गाइड — सिंचाई, खाद और देखभाल',
      qDisease:'🔬 पौधा जांचें — AI रोग पहचान',
      qSchemes:'🏛 सरकारी योजनाएं',qMandiLocator:'📍 मंडी खोजें',
      todayTip1:'🌱 <strong>मूंग दाल</strong> बोने का सबसे अच्छा समय — इस हफ्ते मिट्टी का तापमान आदर्श है। 6-8 क्विंटल/एकड़ की उम्मीद।',
      todayTip2:'⚠️ आपके क्षेत्र में माहू का प्रकोप। बुधवार की बारिश से पहले नीम का स्प्रे करें।',
      todayTip3:'💧 गेहूं दाने भरने की अवस्था में है — हर 8 दिन में पानी दें। अधिक पानी न दें।',
      todayTip4:'🌡 10 दिनों में गर्मी की लहर संभव — दोपहर में शेड नेट से नर्सरी की रक्षा करें।',
      tipAlerts:'3 अलर्ट',
      // Prices page
      allCrops:'सभी फसलें',grains:'अनाज',pulses:'दालें',vegetables:'सब्जियां',oilseeds:'तिलहन',cashCrops:'नकद फसलें',
      livePricesTitle:'लाइव मंडी भाव — अप्रैल 2026',priceTrendTitle:'भाव पूर्वानुमान',aiPredTitle:'AI भाव पूर्वानुमान',
      pickCropForecast:'पूर्वानुमान के लिए फसल चुनें:',
      // Weather page
      weatherTitle:'ग्रेटर नोएडा, UP',weatherUpdated:'अभी अपडेट किया',
      tempLabel:'तापमान',humLabel:'नमी',windLabel:'हवा',
      soilTitle:'मिट्टी स्वास्थ्य मॉनिटर',soilGood:'अच्छी',
      soilMoisture:'मिट्टी की नमी',soilMoistureVal:'68% — अच्छी',
      soilN:'नाइट्रोजन (N)',soilNVal:'55% — मध्यम',
      soilP:'फास्फोरस (P)',soilPVal:'72% — अच्छी',
      soilK:'पोटेशियम (K)',soilKVal:'28% — खाद डालें!',
      weatherImpactTitle:'मौसम का आपकी फसलों पर असर',
      wtip1:'✅ <strong>गेहूं:</strong> दाना भरने की अवस्था — स्थिति आदर्श है। 8 दिन की सिंचाई चक्र बनाए रखें।',
      wtip2:'⚠️ <strong>बुध-गुरु बारिश:</strong> पूरे असर के लिए कीटनाशक स्प्रे 2 दिन के लिए टालें।',
      wtip3:'🌱 <strong>मूंग दाल:</strong> शुक्रवार बारिश के बाद बोने के लिए परफेक्ट है। तापमान आदर्श।',
      wtip4:'🌡 <strong>10 दिनों में गर्मी का अलर्ट:</strong> दोपहर में नर्सरी के पौधों को शेड नेट से ढकें।',
      // Chat page
      chatTitle:'किसान AI से पूछें',chatReady:'● AI तैयार',
      chatQBtns:['🌱 जून की फसल?','🐛 माहू नियंत्रण?','🧪 यूरिया समय?','📈 भाव पूर्वानुमान?','💧 धान का पानी?','🏛 सरकारी योजना?','🌻 सरसों खाद?','💰 बेचने का समय?'],
      chatInitMsg:"नमस्ते! 🙏 मैं किसान AI हूं — AI द्वारा संचालित आपका स्मार्ट खेती सहायक। फसलों, भाव, मौसम, खाद, कीट नियंत्रण या सरकारी योजनाओं के बारे में कुछ भी पूछें। मैं सरल भाषा में व्यावहारिक सलाह देता हूं!",
      chatPlaceholder:'अपना कृषि प्रश्न टाइप करें…',
      // New Farmer page
      nfHeroGreet:'🌱 नया किसान',nfHeroTitle:'नए किसान की पूरी गाइड',nfHeroSub:'अपनी फसल चुनें और पाएं पूरा देखभाल प्लान — सिंचाई, खाद, कीट नियंत्रण और बहुत कुछ!',
      nfChooseCrop:'अपनी फसल चुनें',nfNoneSelected:'कोई नहीं चुना',nfStateLabel:'🗺 आपका राज्य?',
      nfGenBtn:'🌱 मेरी फसल गाइड बनाएं',nfLoadingText:'किसान AI आपकी पूरी फसल गाइड तैयार कर रहा है…',
      nfCompleteGuideFor:'पूरी गाइड',nfFullSeason:'पूरे सीज़न की देखभाल योजना',
      nfWatering:'💧 सिंचाई कार्यक्रम',nfWaterBadge:'ज़रूरी',
      nfFertilizer:'🧪 खाद योजना',nfFertBadge:'AI अनुशंसित',
      nfPest:'🐛 कीट और रोग नियंत्रण',nfPestBadge:'सतर्क रहें',
      nfWeekly:'📅 हफ्ते-दर-हफ्ते देखभाल',
      nfTips:'💡 नए किसान के लिए सुझाव',nfTipsBadge:'ज़रूर पढ़ें',
      nfAskMore:'❓ और सवाल पूछें',nfChatPlaceholder:'अपनी फसल के बारे में कुछ भी पूछें…',
      nfAnotherCrop:'← दूसरी फसल चुनें',
      // Disease Detection page
      ddHeroTitle:'AI रोग पहचान',ddHeroSub:'पत्ती की फोटो अपलोड करें और तुरंत पाएं रोग का नाम, कारण और इलाज!',
      ddUploadTitle:'📸 पत्ती की फोटो अपलोड करें',ddAiBadge:'AI आधारित',
      ddDropText:'पत्ती की फोटो अपलोड करने के लिए टैप करें',ddDropSub:'JPG, PNG — प्रभावित पत्ती की साफ फोटो लें',
      ddTip1:'📸 <strong>फोटो टिप्स:</strong> दिन की रोशनी में फोटो लें। बेहतर जांच के लिए स्वस्थ और बीमार दोनों हिस्से दिखाएं।',
      ddTip2:'🌿 <strong>इन फसलों के लिए:</strong> गेहूं, धान, मक्का, सरसों, टमाटर, कपास, आलू और अधिकतर फसलें।',
      ddLoadingText:'Plant Doctor AI आपकी पत्ती की जांच कर रहा है…',
      ddDiagnosis:'रोग पहचान',
      ddAboutTitle:'🦠 इस रोग के बारे में',ddSymptomsTitle:'👁 लक्षण और संकेत',
      ddOrganicTitle:'🌿 जैविक उपाय',ddOrganicBadge:'प्राकृतिक',
      ddChemicalTitle:'🧪 रासायनिक उपचार',ddChemicalBadge:'तेज़ असर',
      ddPreventionTitle:'🛡 बचाव के उपाय',ddChatTitle:'❓ इस रोग के बारे में और पूछें',
      ddScanAgain:'📸 दूसरी पत्ती स्कैन करें',ddAnalyzeBtn:'🔬 अभी जांचें',ddClearBtn:'✕ हटाएं',
      ddChatPlaceholder:'उपचार, लागत, स्प्रे समय के बारे में पूछें…',
      // Schemes page
      scHeroTitle:'सरकारी योजना जांचकर्ता',scHeroSub:'कुछ सवालों के जवाब दें और जानें कि आप किन योजनाओं के पात्र हैं!',
      scCheckTitle:'🔍 पात्रता जांचें',scStepBadge:'चरण 1 / 4',
      scQ1Lbl:'🗺 आपका राज्य?',scQ2Lbl:'📐 आपके पास कितनी ज़मीन है?',scQ3Lbl:'👤 आपकी श्रेणी?',scQ4Lbl:'🌾 आप क्या उगाते हैं?',
      scCheckBtnTxt:'🏛 मेरी पात्र योजनाएं देखें',scLoadingText:'आपके लिए 20+ सरकारी योजनाएं जांची जा रही हैं…',
      scCheckAgain:'← दोबारा जांचें',
      // Mandi page
      mnHeroTitle:'नज़दीकी मंडी खोजें',mnHeroSub:'राज्य, जिला और क्षेत्र से APMC मंडी खोजें और सबसे अच्छा दाम पाएं!',
      mnSelectTitle:'🗺 अपना स्थान चुनें',mnStateLbl:'राज्य',mnDistLbl:'जिला',mnAreaLbl:'क्षेत्र / ब्लॉक (वैकल्पिक)',
      mnFindBtnTxt:'📍 नज़दीकी मंडियां खोजें',mnLoadingText:'आपके पास APMC मंडियां खोजी जा रही हैं…',
      mnResTitleTxt:'नज़दीकी APMC मंडियां',mnTipsTitle:'💡 मंडी सुझाव',
      mnTip1:'✅ <strong>सभी दस्तावेज लाएं:</strong> सुचारू लेनदेन के लिए आधार, जमीन के कागज और बैंक पासबुक।',
      mnTip2:'⚠️ <strong>बेचने का सबसे अच्छा समय:</strong> बेहतर भाव के लिए सुबह जल्दी (6-9 बजे) पहुंचें।',
      mnTip3:'💰 <strong>पहले MSP जांचें:</strong> न्यूनतम समर्थन मूल्य से नीचे न बेचें।',
      mnSearchAgain:'← फिर खोजें',
    }
  };
  let lang='en';
  function setLang(l,btn){
    lang=l;
    document.querySelectorAll('.lang-toggle button').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const t=T[l];
  
    // ── Helper: set text safely ──────────────────────────
    function txt(id,key){ const el=document.getElementById(id); if(el&&t[key]!==undefined) el.textContent=t[key]; }
    function htm(id,key){ const el=document.getElementById(id); if(el&&t[key]!==undefined) el.innerHTML=t[key]; }
  
    // ── App core ─────────────────────────────────────────
    txt('app-title','appTitle'); txt('app-sub','appSub');
  
    // ── Tab labels ────────────────────────────────────────
    ['home','advisor','prices','weather','chat','newfarmer','disease','schemes','mandi'].forEach(k=>{
      const el=document.getElementById('t-'+k); if(el&&t[k]) el.textContent=t[k];
    });
  
    // ── Home page ─────────────────────────────────────────
    txt('h-greet','greet'); txt('h-title','heroTitle'); txt('h-sub','heroSub'); txt('h-tips','tips');
    // stats
    const statEls=document.querySelectorAll('.stat');
    if(statEls[0]){statEls[0].querySelector('.lbl').textContent=t.bestCropLabel;statEls[0].querySelector('.chg').textContent=t.bestCropChg;}
    if(statEls[1]){statEls[1].querySelector('.lbl').textContent=t.wheatPriceLabel;statEls[1].querySelector('.chg').textContent=t.wheatPriceChg;}
    if(statEls[2]){statEls[2].querySelector('.lbl').textContent=t.weatherLabel;statEls[2].querySelector('.chg').textContent=t.weatherChg;}
    if(statEls[3]){statEls[3].querySelector('.val').textContent=t.askAI;statEls[3].querySelector('.lbl').textContent=t.askAILabel;statEls[3].querySelector('.chg').textContent=t.askAIBadge;}
    // quick actions sec
    const qaH=document.querySelector('#page-home .sec:last-child .sec-head h3');if(qaH)qaH.textContent=t.quickActions;
    const qabtns=document.querySelectorAll('#page-home .action-grid button');
    const qKeys=['qCropAdvice','qMandiPrices','qWeather','qAskAI','qNewFarmer','qDisease','qSchemes','qMandiLocator'];
    qabtns.forEach((b,i)=>{if(t[qKeys[i]])b.textContent=t[qKeys[i]];});
    // tips
    const homeTips=document.querySelectorAll('#page-home .sec:first-of-type .tip');
    ['todayTip1','todayTip2','todayTip3','todayTip4'].forEach((k,i)=>{if(homeTips[i]&&t[k])homeTips[i].innerHTML=t[k];});
    const tipBadge=document.querySelector('#page-home .sec:first-of-type .badge');if(tipBadge)tipBadge.textContent=t.tipAlerts;
  
    // ── Prices page ───────────────────────────────────────
    const fchips=document.querySelectorAll('.filter-row .fchip');
    ['allCrops','grains','pulses','vegetables','oilseeds','cashCrops'].forEach((k,i)=>{if(fchips[i]&&t[k])fchips[i].textContent=t[k];});
    const pricesSecHead=document.querySelector('#page-prices .sec:first-of-type .sec-head h3');if(pricesSecHead)pricesSecHead.textContent=t.livePricesTitle;
    const priceTrendHead=document.querySelector('#page-prices .sec:nth-of-type(2) .sec-head h3');if(priceTrendHead)priceTrendHead.textContent=t.priceTrendTitle;
    const aiPredHead=document.querySelector('#page-prices .sec:nth-of-type(3) .sec-head h3');if(aiPredHead)aiPredHead.textContent=t.aiPredTitle;
    const pickLbl=document.querySelector('#page-prices .sec:nth-of-type(3) .wiz-label');if(pickLbl)pickLbl.textContent=t.pickCropForecast;
  
    // ── Weather page ──────────────────────────────────────
    const wtH=document.querySelector('#page-weather .sec:first-of-type .sec-head h3');if(wtH)wtH.textContent=t.weatherTitle;
    const wtUpd=document.querySelector('#page-weather .sec:first-of-type .sec-head span');if(wtUpd)wtUpd.textContent=t.weatherUpdated;
    const wCells=document.querySelectorAll('.w-cell .w-lbl');
    ['tempLabel','humLabel','windLabel'].forEach((k,i)=>{if(wCells[i]&&t[k])wCells[i].textContent=t[k];});
    const soilH=document.querySelector('#page-weather .sec:nth-of-type(2) .sec-head h3');if(soilH)soilH.textContent=t.soilTitle;
    const soilBadge=document.querySelector('#page-weather .sec:nth-of-type(2) .badge');if(soilBadge)soilBadge.textContent=t.soilGood;
    const npkHeads=document.querySelectorAll('.npk-head');
    if(npkHeads[0]){npkHeads[0].children[0].textContent=t.soilMoisture;npkHeads[0].children[1].textContent=t.soilMoistureVal;}
    if(npkHeads[1]){npkHeads[1].children[0].textContent=t.soilN;npkHeads[1].children[1].textContent=t.soilNVal;}
    if(npkHeads[2]){npkHeads[2].children[0].textContent=t.soilP;npkHeads[2].children[1].textContent=t.soilPVal;}
    if(npkHeads[3]){npkHeads[3].children[0].textContent=t.soilK;npkHeads[3].children[1].textContent=t.soilKVal;}
    const wiH=document.querySelector('#page-weather .sec:nth-of-type(3) .sec-head h3');if(wiH)wiH.textContent=t.weatherImpactTitle;
    const wtips=document.querySelectorAll('#page-weather .sec:nth-of-type(3) .tip');
    ['wtip1','wtip2','wtip3','wtip4'].forEach((k,i)=>{if(wtips[i]&&t[k])wtips[i].innerHTML=t[k];});
  
    // ── Chat page ─────────────────────────────────────────
    const chatH=document.querySelector('#page-chat .sec-head h3');if(chatH)chatH.textContent=t.chatTitle;
    const chatBadge=document.querySelector('#page-chat .sec-head .badge');if(chatBadge)chatBadge.textContent=t.chatReady;
    const chatInp=document.getElementById('chat-inp');if(chatInp)chatInp.placeholder=t.chatPlaceholder;
    const qbtns=document.querySelectorAll('#page-chat .qbtn');
    if(t.chatQBtns) t.chatQBtns.forEach((lbl,i)=>{if(qbtns[i])qbtns[i].textContent=lbl;});
  
    // ── New Farmer page ───────────────────────────────────
    const nfIds = {
      'nf-hero-greet':'nfHeroGreet','nf-hero-title':'nfHeroTitle','nf-hero-sub':'nfHeroSub',
      'nf-choose-crop':'nfChooseCrop','nf-selected-label':'nfNoneSelected',
      'nf-state-label':'nfStateLabel','nf-gen-btn':'nfGenBtn','nf-loading-text':'nfLoadingText',
      'nf-complete-guide-for':'nfCompleteGuideFor','nf-full-season':'nfFullSeason',
      'nf-watering-title':'nfWatering','nf-water-badge':'nfWaterBadge',
      'nf-fertilizer-title':'nfFertilizer','nf-fert-badge':'nfFertBadge',
      'nf-pest-title':'nfPest','nf-pest-badge':'nfPestBadge',
      'nf-weekly-title':'nfWeekly','nf-tips-title':'nfTips','nf-tips-badge':'nfTipsBadge',
      'nf-ask-more-title':'nfAskMore','nf-another-crop':'nfAnotherCrop'
    };
    Object.entries(nfIds).forEach(([id,key])=>{const el=document.getElementById(id);if(el&&t[key])el.textContent=t[key];});
    const nfInp=document.getElementById('nf-chat-inp');if(nfInp)nfInp.placeholder=t.nfChatPlaceholder;
  
    // ── Disease Detection page ────────────────────────────
    const ddIds = {
      'dd-hero-title':'ddHeroTitle','dd-hero-sub':'ddHeroSub',
      'dd-upload-title':'ddUploadTitle','dd-ai-badge':'ddAiBadge',
      'dd-drop-text':'ddDropText','dd-drop-sub':'ddDropSub',
      'dd-loading-text':'ddLoadingText','dd-res-label':'ddDiagnosis',
      'dd-about-title':'ddAboutTitle','dd-symptoms-title':'ddSymptomsTitle',
      'dd-organic-title':'ddOrganicTitle','dd-organic-badge':'ddOrganicBadge',
      'dd-chemical-title':'ddChemicalTitle','dd-chemical-badge':'ddChemicalBadge',
      'dd-prevention-title':'ddPreventionTitle','dd-chat-title':'ddChatTitle',
      'dd-scan-again':'ddScanAgain','dd-analyze-btn':'ddAnalyzeBtn','dd-clear-btn':'ddClearBtn'
    };
    Object.entries(ddIds).forEach(([id,key])=>{const el=document.getElementById(id);if(el&&t[key])el.textContent=t[key];});
    const tip1=document.getElementById('dd-tip1');if(tip1)tip1.innerHTML=t.ddTip1;
    const tip2=document.getElementById('dd-tip2');if(tip2)tip2.innerHTML=t.ddTip2;
    const ddInp=document.getElementById('dd-chat-inp');if(ddInp)ddInp.placeholder=t.ddChatPlaceholder;
  
    // ── Schemes page ──────────────────────────────────────
    const scH=document.querySelector('#page-schemes .hero h2');if(scH)scH.textContent=t.scHeroTitle;
    const scSub=document.querySelector('#page-schemes .hero p');if(scSub)scSub.textContent=t.scHeroSub;
    txt('sc-check-title','scCheckTitle'); txt('sc-step-badge','scStepBadge');
    txt('sc-q1-lbl','scQ1Lbl'); txt('sc-q2-lbl','scQ2Lbl'); txt('sc-q3-lbl','scQ3Lbl'); txt('sc-q4-lbl','scQ4Lbl');
    txt('sc-check-btn-txt','scCheckBtnTxt'); txt('sc-loading-text','scLoadingText'); txt('sc-check-again','scCheckAgain');
  
    // ── Mandi page ────────────────────────────────────────
    const mnH=document.querySelector('#page-mandi .hero h2');if(mnH)mnH.textContent=t.mnHeroTitle;
    const mnSub=document.querySelector('#page-mandi .hero p');if(mnSub)mnSub.textContent=t.mnHeroSub;
    txt('mn-select-title','mnSelectTitle'); txt('mn-state-lbl','mnStateLbl'); txt('mn-dist-lbl','mnDistLbl'); txt('mn-area-lbl','mnAreaLbl');
    txt('mn-find-btn-txt','mnFindBtnTxt'); txt('mn-loading-text','mnLoadingText');
    txt('mn-res-title','mnResTitleTxt'); txt('mn-tips-title','mnTipsTitle');
    htm('mn-tip1','mnTip1'); htm('mn-tip2','mnTip2'); htm('mn-tip3','mnTip3');
    txt('mn-search-again','mnSearchAgain');
  }
  
  /* ═══════════════════════════════════════════════════════
     PAGE NAV
  ══════════════════════════════════════════════════════ */
  function goPage(id,btn){
    document.querySelectorAll('.page').forEach(p=>{p.classList.remove('on');p.style.display='none';});
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
    const pg=document.getElementById('page-'+id);
    if(pg){pg.classList.add('on');pg.style.display='block';}
    if(btn&&btn.classList) btn.classList.add('on');
    if(id==='prices' && PRICE_DATA && !priceChartInst) {
      // Auto-select first crop on initial visit
      const firstKey = Object.keys(PRICE_DATA)[0];
      if (firstKey) setTimeout(() => selectCrop(firstKey), 100);
    }
  }
  
  /* ═══════════════════════════════════════════════════════
     CLAUDE API HELPER
  ══════════════════════════════════════════════════════ */
  /* ── API key helpers ──────────────────────────────────*/
  function getApiKey(){
    return localStorage.getItem('kisanai_api_key')||'';
  }
  function saveApiKey(k){
    localStorage.setItem('kisanai_api_key', k.trim());
  }
  function promptApiKey(onSuccess){
    const existing=getApiKey();
    if(existing){onSuccess(existing);return;}
    // Build modal
    const overlay=document.createElement('div');
    overlay.id='key-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9999';
    overlay.innerHTML=`
      <div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:380px;width:90%;font-family:sans-serif">
        <div style="font-size:17px;font-weight:600;color:#1a1a1a;margin-bottom:6px">🌾 KisanAI — Enter API Key</div>
        <div style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.5">
          Paste your <strong>Anthropic API key</strong> to enable AI chat.<br>
          Get one free at <a href="https://console.anthropic.com" target="_blank" style="color:#1D9E75">console.anthropic.com</a>
        </div>
        <input id="key-inp" type="password" placeholder="sk-ant-api03-..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px">
        <div id="key-err" style="font-size:12px;color:#c0392b;min-height:16px;margin-bottom:8px"></div>
        <button id="key-save" style="width:100%;padding:11px;background:#1D9E75;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Save & Continue</button>
        <div style="font-size:11px;color:#999;margin-top:10px;text-align:center">Key is saved only in your browser. Never shared.</div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('key-save').onclick=function(){
      const val=document.getElementById('key-inp').value.trim();
      if(!val.startsWith('sk-ant')){
        document.getElementById('key-err').textContent='Key should start with sk-ant-...';
        return;
      }
      saveApiKey(val);
      overlay.remove();
      onSuccess(val);
    };
  }
  
  function apiHeaders(){
    return {
      'Content-Type':'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    };
  }
  
  async function callClaude(systemPrompt, userMessage, maxTokens=800){
    return new Promise((resolve,reject)=>{
      promptApiKey(async(key)=>{
        try{
          const res = await fetch('/api',{
            method:'POST',
            headers: apiHeaders(),
            body:JSON.stringify({
              model:'claude-haiku-4-5',
              max_tokens: maxTokens,
              system: systemPrompt,
              messages:[{role:'user',content:userMessage}]
            })
          });
          if(!res.ok){
            const err=await res.json().catch(()=>({}));
            if(res.status===401){localStorage.removeItem('kisanai_api_key');}
            reject(new Error(err.error?.message||'API error: '+res.status));
            return;
          }
          const data = await res.json();
          resolve(data.content.map(b=>b.type==='text'?b.text:'').join(''));
        }catch(e){reject(e);}
      });
    });
  }
  
  /* ═══════════════════════════════════════════════════════
     WIZARD STATE
  ══════════════════════════════════════════════════════ */
  const wizState={state:null,season:null,soil:null,water:null,budget:null,goal:null};
  
  function selOpt(el,key){
    el.parentElement.querySelectorAll('.wiz-opt').forEach(o=>o.classList.remove('sel'));
    el.classList.add('sel');
    wizState[key]=el.textContent.trim();
    checkStep();
  }
  
  function checkStep(){
    const step=parseInt(document.querySelector('.wiz-step.on').id.replace('ws',''));
    const checks=[[wizState.state],[wizState.season,wizState.soil],[wizState.water,wizState.budget],[wizState.goal]];
    const ok=checks[step].every(v=>v);
    document.getElementById('n'+step).disabled=!ok;
  }
  
  function nextStep(i){
    document.getElementById('ws'+i).classList.remove('on');
    document.getElementById('ws'+(i+1)).classList.add('on');
    document.getElementById('sd'+i).classList.replace('active','done');
    document.getElementById('sl'+i).classList.add('done');
    document.getElementById('sd'+(i+1)).classList.replace('todo','active');
    document.getElementById('cur-step').textContent=i+2;
  }
  
  function prevStep(i){
    document.getElementById('ws'+i).classList.remove('on');
    document.getElementById('ws'+(i-1)).classList.add('on');
    document.getElementById('sd'+(i-1)).classList.replace('done','active');
    document.getElementById('sl'+(i-1)).classList.remove('done');
    document.getElementById('sd'+i).classList.replace('active','todo');
    document.getElementById('cur-step').textContent=i;
  }
  
  /* ─── Default crop data (shown while AI loads / fallback) ─ */
  const defaultCrops=[
    {name:'Wheat (Gehun)',em:'🌾',match:92,price:'₹2,340/q',yield:'18–22 q/acre',profit:50000,color:'#2E6B0F'},
    {name:'Moong Dal',em:'🫘',match:78,price:'₹7,240/q',yield:'5–7 q/acre',profit:43000,color:'#1A5FA8'},
    {name:'Mustard (Sarson)',em:'🌻',match:65,price:'₹5,650/q',yield:'8–10 q/acre',profit:51000,color:'#B87214'},
  ];
  const defaultCalendar=[
    ['1','Land Preparation','Plough deep, add compost, level field (Week 1–2)'],
    ['2','Sowing','Use certified seed, row spacing 20 cm, add DAP (Week 3)'],
    ['3','Growth & Care','Irrigate every 10 days, apply urea at 25 days (Weeks 4–8)'],
    ['4','Harvest & Sell','Harvest when 85% grains golden, sell within 2 weeks (Week 12)']
  ];
  
  /* ─── showResults: fixed + AI-powered ─────────────────── */
  async function showResults(){
    // FIX: use correct selector #step-wizard (not missing .step-wizard)
    document.getElementById('step-wizard').style.display='none';
    const rs=document.getElementById('results-section');
    rs.style.display='block';
  
    const land=parseInt(document.getElementById('land-slider').value);
  
    // Show loading
    document.getElementById('advisor-loading').style.display='flex';
    document.getElementById('advisor-output').style.display='none';
  
    // Populate with default data immediately (shown after AI responds)
    let crops=defaultCrops;
    let cal=defaultCalendar;
    let topCropName='🌾 Wheat';
    let topSub=`Top recommended crop — ${wizState.season||'current season'} | ${wizState.soil||'your soil'}`;
    let aiTips=[];
  
    // Ask Claude for personalised recommendations
    try{
      const sysPrompt=`You are KisanAI, an expert Indian agricultural AI. Analyse the farmer's inputs and return ONLY valid JSON, no markdown, no backticks, no extra text.
  JSON structure:
  {
    "topCrop": "Crop name with emoji, e.g. 🌾 Wheat",
    "summary": "One sentence personalised recommendation",
    "crops": [
      {"name": "Crop name","em": "emoji","match": 92,"price": "₹2,340/q","yield": "18–22 q/acre","profit": 50000,"color": "#2E6B0F"},
      {"name": "...","em": "emoji","match": 78,"price": "...","yield": "...","profit": 43000,"color": "#1A5FA8"},
      {"name": "...","em": "emoji","match": 65,"price": "...","yield": "...","profit": 51000,"color": "#B87214"}
    ],
    "calendarSteps": [
      {"step":"1","title":"Land Prep","desc":"What to do and when"},
      {"step":"2","title":"Sowing","desc":"..."},
      {"step":"3","title":"Growth","desc":"..."},
      {"step":"4","title":"Harvest","desc":"..."}
    ],
    "tips": ["Tip 1 specific to conditions","Tip 2","Tip 3"]
  }
  Sort crops by match % descending. profit is per 5 acres in INR. Use realistic 2026 Indian market prices.`;
      const userMsg=`Farmer details:
  - State: ${wizState.state}
  - Season: ${wizState.season}
  - Soil: ${wizState.soil}
  - Water source: ${wizState.water}
  - Budget: ${wizState.budget}
  - Goal: ${wizState.goal}
  - Land: ${land} acres`;
  
      const raw=await callClaude(sysPrompt, userMsg, 1000);
      const clean=raw.replace(/```json|```/g,'').trim();
      const parsed=JSON.parse(clean);
      if(parsed.crops) crops=parsed.crops;
      if(parsed.calendarSteps) cal=parsed.calendarSteps.map(s=>[s.step,s.title,s.desc]);
      if(parsed.topCrop) topCropName=parsed.topCrop;
      if(parsed.summary) topSub=parsed.summary;
      if(parsed.tips) aiTips=parsed.tips;
    } catch(e){
      console.warn('AI advisor fallback:',e);
      // use defaults silently
    }
  
    // Populate UI
    document.getElementById('advisor-loading').style.display='none';
    document.getElementById('advisor-output').style.display='block';
  
    document.getElementById('res-label').textContent=`AI Analysis · ${land} acres · ${wizState.state||''}`;
    document.getElementById('res-top-crop').textContent=topCropName;
    document.getElementById('res-sub').textContent=topSub;
  
    const cr=document.getElementById('crop-results');
    cr.innerHTML=crops.map((c,i)=>`
      <div class="crop-row ${i===0?'best':''} slide-in">
        <div class="crop-emo" style="background:${c.color}22">${c.em}</div>
        <div class="crop-info">
          <div class="crop-nm">${i===0?'⭐ ':''} ${c.name}</div>
          <div class="crop-sub">Price: ${c.price} | Yield: ${c.yield}</div>
          <div class="matchbar"><div class="matchfill" style="width:${c.match}%;background:${c.color}"></div></div>
          <div style="font-size:11px;color:var(--text2);margin-top:3px">AI match: <strong style="color:${c.color}">${c.match}%</strong></div>
        </div>
        <div class="crop-pct" style="color:${c.color}">${Math.round(c.profit*land/5).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}</div>
      </div>`).join('');
  
    const calEl=document.getElementById('farm-calendar');
    calEl.innerHTML=cal.map(s=>`
      <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--green-light);display:grid;place-items:center;font-size:12px;font-weight:600;color:var(--green);flex-shrink:0;border:1.5px solid var(--green-pale)">${s[0]}</div>
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">${s[1]}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px;line-height:1.5">${s[2]}</div>
        </div>
      </div>`).join('');
  
    if(aiTips.length>0){
      const tipsEl=document.getElementById('ai-tips-list');
      tipsEl.innerHTML=aiTips.map(t=>`<div class="res-tip">💡 ${t}</div>`).join('');
      document.getElementById('ai-tips-sec').style.display='block';
    }
  
    setTimeout(()=>drawEarnChart(land,crops),200);
  }
  
  function resetAdvisor(){
    Object.keys(wizState).forEach(k=>wizState[k]=null);
    document.querySelectorAll('.wiz-opt').forEach(o=>o.classList.remove('sel'));
    [0,1,2,3].forEach(i=>{
      const sd=document.getElementById('sd'+i);
      sd.className='step-dot '+(i===0?'active':'todo');
      if(i<3) document.getElementById('sl'+i).classList.remove('done');
    });
    document.getElementById('ws0').classList.add('on');
    [1,2,3].forEach(i=>document.getElementById('ws'+i).classList.remove('on'));
    document.getElementById('n0').disabled=true;
    document.getElementById('cur-step').textContent='1';
    document.getElementById('step-wizard').style.display='block';
    document.getElementById('results-section').style.display='none';
    document.getElementById('advisor-loading').style.display='none';
    document.getElementById('advisor-output').style.display='none';
    document.getElementById('ai-tips-sec').style.display='none';
  }
  
  function drawEarnChart(land,crops=defaultCrops){
    const canvas=document.getElementById('earn-chart');
    if(!canvas)return;
    if(canvas._ch){canvas._ch.destroy();canvas._ch=null}
    const isDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
    const tc=isDark?'rgba(255,255,255,0.6)':'rgba(0,0,0,0.5)';
    canvas._ch=new Chart(canvas,{
      type:'bar',
      data:{
        labels:crops.map(c=>c.name.split(' ')[0]),
        datasets:[{
          label:'Est. Profit (₹)',
          data:crops.map(c=>Math.round(c.profit*land/5)),
          backgroundColor:crops.map(c=>c.color+'33'),
          borderColor:crops.map(c=>c.color),
          borderWidth:1.5,borderRadius:8
        }]
      },
      options:{responsive:true,plugins:{legend:{display:false}},
        scales:{
          x:{ticks:{color:tc,font:{size:11}},grid:{display:false}},
          y:{ticks:{color:tc,font:{size:10},callback:v=>'₹'+Math.round(v/1000)+'K'},grid:{color:'rgba(128,128,128,0.08)'}}
        }
      }
    });
  }
  
  /* ═══════════════════════════════════════════════════════
     PRICES PAGE
  ══════════════════════════════════════════════════════ */
  // ── Dynamic price rendering from PRICE_DATA ─────────────
  let selectedCropKey = null;

  function renderPrices() {
    const list = document.getElementById('price-list');
    if (!PRICE_DATA) { showPriceError(); return; }
    const keys = Object.keys(PRICE_DATA);
    if (keys.length === 0) { showPriceError(); return; }

    list.innerHTML = keys.map(key => {
      const p = PRICE_DATA[key];
      const chg = p.change_30d_pct || 0;
      const dir = chg > 0 ? 'up' : chg < 0 ? 'dn' : 'flat';
      const clr = dir === 'up' ? '#2E6B0F' : dir === 'dn' ? '#A02B2B' : 'var(--text2)';
      const bg = dir === 'up' ? '#E8F5DB' : dir === 'dn' ? '#FBEBEB' : 'var(--card2)';
      const arrow = dir === 'up' ? '↑' : dir === 'dn' ? '↓' : '→';
      const name = formatCropName(key);
      const selected = key === selectedCropKey ? 'border:2px solid var(--green);' : '';
      return `<div class="price-item" style="cursor:pointer;${selected}" onclick="selectCrop('${key}')">
        <div style="flex:1;min-width:0">
          <div class="price-nm">${name}</div>
          <div class="price-loc">${p.unit || 'per quintal'}</div>
        </div>
        <div>
          <div class="price-val" style="color:${clr}">₹${(p.current_price || 0).toLocaleString()}/q</div>
          <div class="price-chg"><span style="background:${bg};color:${clr};font-size:10px;padding:2px 7px;border-radius:9px;font-weight:500">${arrow} ${Math.abs(chg).toFixed(1)}%</span></div>
        </div>
      </div>`;
    }).join('');
  }

  // ── Crop selector → updates chart + forecast + insights ──
  function selectCrop(key) {
    selectedCropKey = key;
    renderPrices();
    updatePriceChart(key);
    updateForecast(key);
    updateInsights(key);
    updateDatasetInfo();
    // Hide hints when a crop is selected
    const ch = document.getElementById('chart-hint');
    const fh = document.getElementById('forecast-hint');
    if (ch) ch.style.display = 'none';
    if (fh) fh.style.display = 'none';
  }
  window.selectCrop = selectCrop;

  // ── Dynamic price trend chart from history[] ──────────────
  let priceChartInst = null;

  function updatePriceChart(cropKey) {
    if (!PRICE_DATA || !PRICE_DATA[cropKey]) return;
    const crop = PRICE_DATA[cropKey];
    const hist = crop.history || [];
    if (hist.length === 0) return;

    const labels = hist.map(h => {
      const d = new Date(h.date);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });
    const prices = hist.map(h => h.price);
    const forecast = getValidForecast(crop);

    // 7-day moving average
    const ma7 = prices.map((_, i) => {
      if (i < 6) return null;
      const slice = prices.slice(i - 6, i + 1);
      return Math.round(slice.reduce((a, b) => a + b, 0) / 7);
    });

    const datasets = [
      {
        label: formatCropName(cropKey) + ' Price',
        data: prices,
        borderColor: '#2E6B0F',
        backgroundColor: 'rgba(46,107,15,0.08)',
        tension: 0.4, fill: true, pointRadius: 2
      },
      {
        label: '7-day Avg',
        data: ma7,
        borderColor: '#1A5FA8',
        borderDash: [5, 3],
        tension: 0.4, fill: false, pointRadius: 0
      }
    ];

    // Append forecast as dashed line
    if (forecast != null) {
      const lastPrice = prices[prices.length - 1];
      const forecastPts = Array(prices.length - 1).fill(null).concat([lastPrice, forecast]);
      datasets.push({
        label: 'Forecast (Predicted)',
        data: forecastPts,
        borderColor: '#B87214',
        borderDash: [6, 3],
        tension: 0.4, fill: false, pointRadius: 0
      });
      // Use extended labels if forecast present
      while (labels.length < forecastPts.length) labels.push('');
      updateChartCanvas(labels, datasets);
      return;
    }
    updateChartCanvas(labels, datasets);
  }

  function updateChartCanvas(labels, datasets) {
    const canvas = document.getElementById('price-chart');
    if (!canvas) return;
    const isDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    const tc = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

    if (priceChartInst) {
      priceChartInst.data.labels = labels;
      priceChartInst.data.datasets = datasets;
      priceChartInst.options.plugins.legend.labels.color = tc;
      priceChartInst.options.scales.x.ticks.color = tc;
      priceChartInst.options.scales.y.ticks.color = tc;
      priceChartInst.update();
      return;
    }

    priceChartInst = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: tc, font: { size: 11 }, boxWidth: 10, padding: 14 } } },
        scales: {
          x: { ticks: { color: tc, font: { size: 11 }, maxTicksLimit: 10 }, grid: { display: false } },
          y: { ticks: { color: tc, font: { size: 10 }, callback: v => '₹' + Math.round(v).toLocaleString() }, grid: { color: 'rgba(128,128,128,0.08)' } }
        }
      }
    });
  }

  // ── Dynamic forecast from dataset (replaces hardcoded selPred) ──
  function updateForecast(cropKey) {
    if (!PRICE_DATA || !PRICE_DATA[cropKey]) return;
    const crop = PRICE_DATA[cropKey];
    const r = document.getElementById('pred-result');
    const metaDiv = document.getElementById('forecast-meta');
    if (!r) return;

    r.style.display = 'block';
    const forecast = getValidForecast(crop);
    const meta = crop.forecast_meta || null;

    if (forecast == null) {
      r.innerHTML = `<div class="slide-in">
        <div class="tip g" style="font-size:13px;color:var(--text2)">
          ${meta && meta.interpretation
            ? meta.interpretation
            : `Forecast unavailable for ${formatCropName(cropKey)}. Insufficient historical data.`}
        </div>
      </div>`;
      if (metaDiv) { metaDiv.style.display = 'none'; metaDiv.innerHTML = ''; }
      return;
    }

    const change = crop.change_30d_pct || 0;
    const trend = change > 0 ? 'rising' : change < 0 ? 'falling' : 'stable';
    const forecastChange = ((forecast - crop.current_price) / crop.current_price * 100);
    const fTrend = forecastChange > 0.5 ? 'rise' : (forecastChange < -0.5 ? 'fall' : 'stay stable');

    r.innerHTML = `<div class="slide-in">
      <div class="pred-grid">
        <div class="pred-cell" style="background:var(--card2);border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text2);font-weight:500">Current Price</div>
          <div style="font-size:22px;font-weight:600;color:var(--text);margin-top:4px;letter-spacing:-.5px">₹${crop.current_price.toLocaleString()}/q</div>
        </div>
        <div class="pred-cell" style="background:var(--green-light);border:1px solid var(--green-pale)">
          <div style="font-size:11px;color:#1a4a08;font-weight:500">30-day Forecast</div>
          <div style="font-size:22px;font-weight:600;color:var(--green);margin-top:4px;letter-spacing:-.5px">₹${forecast.toLocaleString()}/q</div>
        </div>
      </div>
      <div class="tip g">📊 <strong>${formatCropName(cropKey)}:</strong> price is currently <strong>${trend}</strong> (${change > 0 ? '+' : ''}${change.toFixed(1)}% over 30 days). Forecast suggests prices may <strong>${fTrend}</strong> to ₹${forecast.toLocaleString()}/quintal.</div>
    </div>`;

    // ── Forecast metadata display ──
    if (metaDiv && meta) {
      const confColor = meta.confidence === 'high' ? 'var(--green)' :
                         meta.confidence === 'medium' ? 'var(--amber)' : 'var(--text2)';
      const confLabel = (meta.confidence || 'low').toUpperCase();
      const modelType = meta.model_type === 'ml' ? '🤖 ML Model' :
                        meta.model_type === 'baseline' ? '📏 Baseline' : '⚠️ Limited';
      const skillPct = meta.skill_score != null ? (meta.skill_score * 100).toFixed(1) : '—';
      const skillColor = meta.skill_score > 0.1 ? 'var(--green)' :
                          meta.skill_score > 0 ? 'var(--amber)' : 'var(--text2)';
      const dirAcc = meta.direction_accuracy != null ? meta.direction_accuracy.toFixed(0) + '%' : '—';

      metaDiv.style.display = 'block';
      metaDiv.innerHTML = `
        <div class="forecast-meta">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <span class="forecast-model-tag">${meta.model_name || 'Unknown'}</span>
            <span style="font-size:11px;color:var(--text2)">${modelType}</span>
            <span class="forecast-confidence" style="color:${confColor}">
              ● ${confLabel} confidence
            </span>
          </div>
          ${meta.interpretation ? `<div class="forecast-interpretation">${meta.interpretation}</div>` : ''}
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--text2)">
            <span>Skill: <strong style="color:${skillColor}">${skillPct}%</strong></span>
            <span>Direction: <strong>${dirAcc}</strong></span>
            <span>Training: <strong>${meta.training_observations || 0}</strong> obs</span>
            ${meta.validation_mae != null ? `<span>MAE: <strong>₹${meta.validation_mae}</strong></span>` : ''}
          </div>
        </div>`;
    } else if (metaDiv) {
      metaDiv.style.display = 'none';
      metaDiv.innerHTML = '';
    }
  }

  // ── Dynamic market insights (analytics-powered) ──────────
  function updateInsights(cropKey) {
    renderCropAnalytics(cropKey);
  }

  // ── Dynamic dataset info (redirects to analytics quality) ──
  function updateDatasetInfo() {
    renderDataQuality();
  }

  // ── Analytics Overview (all crops summary) ──────────────
  function renderAnalyticsOverview() {
    const el = document.getElementById('analytics-overview');
    if (!el || !PRICE_DATA || !window.KisanAnalytics) return;

    const overview = KisanAnalytics.generateOverview(PRICE_DATA);
    if (!overview) { el.innerHTML = '<p style="font-size:12px;color:var(--text2)">Unable to generate overview.</p>'; return; }

    el.innerHTML = `
      <div class="analytics-grid">
        <div class="analytics-stat">
          <div class="a-val">${overview.totalCrops}</div>
          <div class="a-lbl">Crops analyzed</div>
        </div>
        <div class="analytics-stat">
          <div class="a-val">${overview.totalObservations.toLocaleString()}</div>
          <div class="a-lbl">Total observations</div>
        </div>
        <div class="analytics-stat">
          <div class="a-val" style="color:var(--red)">${overview.mostVolatile.name}</div>
          <div class="a-lbl">Most volatile (${overview.mostVolatile.cv}%)</div>
        </div>
        <div class="analytics-stat">
          <div class="a-val" style="color:var(--green)">${overview.mostStable.name}</div>
          <div class="a-lbl">Most stable (${overview.mostStable.cv}%)</div>
        </div>
        <div class="analytics-stat">
          <div class="a-val" style="color:var(--green)">↑ ${overview.topGainer.name}</div>
          <div class="a-lbl">Top gainer (+${overview.topGainer.change}%)</div>
        </div>
        <div class="analytics-stat">
          <div class="a-val" style="color:var(--red)">↓ ${overview.topLoser.name}</div>
          <div class="a-lbl">Top loser (${overview.topLoser.change}%)</div>
        </div>
      </div>
      <div class="analytics-note">
        <strong>Coverage:</strong> ${overview.dateRange.min} to ${overview.dateRange.max} ·
        ${overview.totalObservations} data points across ${overview.totalCrops} crops
      </div>`;
  }

  // ── Per-Crop Analytics Detail ────────────────────────────
  function renderCropAnalytics(cropKey) {
    const el = document.getElementById('crop-analytics');
    if (!el || !PRICE_DATA || !window.KisanAnalytics) return;

    if (!cropKey || !PRICE_DATA[cropKey]) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text2)">Select a crop above to view detailed analytics.</p>';
      return;
    }

    const analysis = KisanAnalytics.analyzeCrop(PRICE_DATA[cropKey]);
    if (!analysis) { el.innerHTML = '<p style="font-size:12px;color:var(--text2)">Unable to analyze this crop.</p>'; return; }

    const s = analysis.stats;
    const t = analysis.trend;
    const v = analysis.volatility;
    const a = analysis.anomalies;

    // Trend icon/class
    const trendIcon = t.direction === 'rising' ? '📈' : t.direction === 'falling' ? '📉' : '➡️';
    const trendClass = t.direction === 'rising' ? 'up' : t.direction === 'falling' ? 'dn' : 'flat';

    // Volatility class
    const volClass = v.level === 'volatile' ? 'dn' : v.level === 'moderate' ? 'flat' : 'up';

    let html = `<div class="analytics-detail">`;
    html += `<div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:10px">${formatCropName(cropKey)}</div>`;

    // Key metrics
    html += `<div class="analytics-metric"><span class="am-label">Current Price</span><span class="am-value">₹${analysis.currentPrice.toLocaleString()}/q</span></div>`;
    html += `<div class="analytics-metric"><span class="am-label">Historical Average</span><span class="am-value">₹${s.average.toLocaleString()}/q</span></div>`;
    html += `<div class="analytics-metric"><span class="am-label">Median</span><span class="am-value">₹${s.median.toLocaleString()}/q</span></div>`;
    html += `<div class="analytics-metric"><span class="am-label">Range</span><span class="am-value">₹${s.min.toLocaleString()} — ₹${s.max.toLocaleString()}</span></div>`;
    html += `<div class="analytics-metric"><span class="am-label">Observations</span><span class="am-value">${s.count} (${s.dateSpanDays} days)</span></div>`;

    // Trend
    html += `<div class="analytics-metric"><span class="am-label">Trend</span><span class="am-value"><span class="tag ${trendClass}">${trendIcon} ${t.direction}</span></span></div>`;
    html += `<div class="analytics-metric"><span class="am-label">Recent vs Historical</span><span class="am-value">${t.recentChangePct > 0 ? '+' : ''}${t.recentChangePct}%</span></div>`;
    html += `<div class="analytics-metric"><span class="am-label">Confidence</span><span class="am-value">${t.confidence}</span></div>`;

    // Volatility
    html += `<div class="analytics-metric"><span class="am-label">Volatility</span><span class="am-value"><span class="tag ${volClass}">${v.level} (${v.cv}%)</span></span></div>`;

    // Deviation from forecast
    if (analysis.forecastValid) {
      html += `<div class="analytics-metric"><span class="am-label">vs Forecast</span><span class="am-value">${analysis.deviationPct}% ${analysis.deviationDir}</span></div>`;
    }

    // Anomalies
    if (a.count > 0) {
      html += `<div class="analytics-metric"><span class="am-label">Anomalies</span><span class="am-value">${a.count} detected</span></div>`;
    }

    html += `</div>`; // end analytics-detail

    // Interpretation
    if (analysis.interpretation && analysis.interpretation.length > 0) {
      html += `<div class="interp-box">`;
      analysis.interpretation.forEach(function(line) {
        html += `<p>${line}</p>`;
      });
      html += `</div>`;
    }

    el.innerHTML = html;
  }

  // ── Crop Rankings (tabbed) ──────────────────────────────
  let rankingsData = null;
  let activeRankTab = 'gainers';

  function renderRankings(tab) {
    const el = document.getElementById('crop-rankings');
    if (!el || !PRICE_DATA || !window.KisanAnalytics) return;

    if (tab !== undefined) activeRankTab = tab;
    if (!rankingsData) rankingsData = KisanAnalytics.rankCrops(PRICE_DATA);
    if (!rankingsData) { el.innerHTML = '<p style="font-size:12px;color:var(--text2)">Unable to generate rankings.</p>'; return; }

    const tabs = [
      { key: 'gainers', label: '📈 Top Gainers' },
      { key: 'losers', label: '📉 Top Losers' },
      { key: 'volatile', label: '⚡ Most Volatile' },
      { key: 'stable', label: '🔒 Most Stable' }
    ];

    let html = `<div class="analytics-tabs">`;
    tabs.forEach(function(t) {
      html += `<button class="a-tab${activeRankTab === t.key ? ' on' : ''}" onclick="renderRankings('${t.key}')">${t.label}</button>`;
    });
    html += `</div>`;

    // Get data for active tab
    let items = [];
    var unitLabel = '';
    if (activeRankTab === 'gainers') {
      items = rankingsData.topGainers;
      unitLabel = '%';
    } else if (activeRankTab === 'losers') {
      items = rankingsData.topLosers;
      unitLabel = '%';
    } else if (activeRankTab === 'volatile') {
      items = rankingsData.mostVolatile;
      unitLabel = '% CV';
    } else if (activeRankTab === 'stable') {
      items = rankingsData.mostStable;
      unitLabel = '% CV';
    }

    if (items.length === 0) {
      html += '<p style="font-size:12px;color:var(--text2)">No data available for this ranking.</p>';
    } else {
      items.forEach(function(item) {
        const isTop = item.rank <= 3;
        const valColor = activeRankTab === 'gainers' ? 'var(--green)' :
                         activeRankTab === 'losers' ? 'var(--red)' :
                         activeRankTab === 'volatile' ? 'var(--amber)' : 'var(--green)';
        html += `<div class="analytics-ranking">
          <span class="rank-num${isTop ? ' top' : ''}">${item.rank}</span>
          <span class="rank-name">${item.name}</span>
          <span class="rank-val" style="color:${valColor}">${activeRankTab === 'gainers' || activeRankTab === 'losers' ? (item.value > 0 ? '+' : '') + item.value : item.value}${unitLabel}</span>
        </div>`;
      });
    }

    el.innerHTML = html;
  }
  window.renderRankings = renderRankings;

  // ── Data Quality Report ──────────────────────────────────
  function renderDataQuality() {
    const el = document.getElementById('data-quality');
    if (!el || !PRICE_DATA || !window.KisanAnalytics) return;

    const report = KisanAnalytics.generateDataQualityReport(PRICE_DATA);
    if (!report) { el.innerHTML = '<p style="font-size:12px;color:var(--text2)">Unable to generate data quality report.</p>'; return; }

    let html = `<div class="analytics-grid">`;
    html += `<div class="analytics-stat"><div class="a-val">${report.sufficientCrops}/${report.totalCrops}</div><div class="a-lbl">Crops with sufficient data (15+ obs)</div></div>`;
    html += `<div class="analytics-stat"><div class="a-val">${report.avgObsPerCrop}</div><div class="a-lbl">Avg observations per crop</div></div>`;
    html += `</div>`;

    // Sparse crops list
    if (report.sparseCrops.length > 0) {
      html += `<div style="margin-bottom:10px">`;
      report.sparseCrops.forEach(function(c) {
        const quality = c.count >= 10 ? 'fair' : 'poor';
        html += `<div class="quality-row">
          <span class="quality-dot ${quality}"></span>
          <span class="quality-name">${c.name}</span>
          <span class="quality-info">${c.count} obs (${c.spanDays}d span)</span>
        </div>`;
      });
      html += `</div>`;
    }

    // Seasonal note
    if (report.seasonalNote) {
      html += `<div class="analytics-note">⚠️ ${report.seasonalNote}</div>`;
    }

    el.innerHTML = html;
  }

  // ── Update home page wheat price card from data ──────────
  function updateHomeWheatCard() {
    if (!PRICE_DATA) return;
    // Find wheat in dataset (key might be "wheat")
    const wheat = PRICE_DATA['wheat'];
    if (!wheat) return;
    const priceEl = document.getElementById('home-wheat-price');
    const chgEl = document.getElementById('home-wheat-chg');
    if (priceEl) priceEl.textContent = '₹' + wheat.current_price.toLocaleString();
    if (chgEl) {
      const chg = wheat.change_30d_pct || 0;
      const dir = chg > 0 ? 'up' : chg < 0 ? 'dn' : 'flat';
      const arrow = dir === 'up' ? '↑' : dir === 'dn' ? '↓' : '→';
      chgEl.textContent = `${arrow} ${Math.abs(chg).toFixed(1)}% (30d)`;
      chgEl.className = 'chg ' + dir;
    }
  }

  // ── Initialize price UI on load ───────────────────────────
  if (PRICE_DATA) {
    renderPrices();
    renderAnalyticsOverview();
    renderRankings();
    renderDataQuality();
    updateHomeWheatCard();
  } else {
    showPriceError();
  }
  
  /* ═══════════════════════════════════════════════════════
     AI CHAT — powered by Claude API
  ══════════════════════════════════════════════════════ */
  const CHAT_SYSTEM=`You are KisanAI, a friendly and expert Indian agricultural assistant. Help farmers with crop selection, pest control, fertilizer advice, government schemes, market prices, weather impact, and farming best practices.
  
  Rules:
  - Be practical, specific, and actionable. Give actual quantities, timings, prices.
  - Use Indian crop names with English in brackets.
  - Reference realistic 2026 Indian market prices and government schemes.
  - Use emojis sparingly to improve readability.
  - Keep answers concise (under 200 words) unless complex topic needs more.
  - Format multi-step advice with numbered points or bullet symbols.
  - Always end with one short actionable tip.
  - Respond in the same language the farmer writes in (Hindi or English).`;
  
  let chatHistory=[];
  let isChatLoading=false;
  
  async function doChat(){
    const inp=document.getElementById('chat-inp');
    const q=inp.value.trim();
    if(!q||isChatLoading)return;
  
    promptApiKey(async(key)=>{
      isChatLoading=true;
      const sendBtn=document.getElementById('send-btn');
      sendBtn.disabled=true;
  
      addMsg(q,'user');
      inp.value='';
      chatHistory.push({role:'user',content:q});
  
      const typing=addMsg('⋯','bot typing');
  
      try{
        const res=await fetch('/api',{
          method:'POST',
          headers: apiHeaders(),
          body:JSON.stringify({
            model:'claude-haiku-4-5',
            max_tokens:600,
            system: CHAT_SYSTEM,
            messages:chatHistory.slice(-10)
          })
        });
  
        if(!res.ok){
          const err=await res.json().catch(()=>({}));
          if(res.status===401){
            localStorage.removeItem('kisanai_api_key');
            typing.remove();
            addMsg('⚠️ Invalid API key. Please refresh the page and enter a valid key from console.anthropic.com','bot');
          } else if(res.status===429){
            typing.remove();
            addMsg('⚠️ Too many requests. Please wait a moment and try again.','bot');
          } else {
            typing.remove();
            addMsg('⚠️ Error '+res.status+': '+(err.error?.message||'Could not reach KisanAI.'),'bot');
          }
          isChatLoading=false;
          sendBtn.disabled=false;
          return;
        }
  
        const data=await res.json();
        const reply=data.content.map(b=>b.type==='text'?b.text:'').join('').trim();
        typing.remove();
        addMsg(reply,'bot');
        chatHistory.push({role:'assistant',content:reply});
  
      } catch(e){
        typing.remove();
        addMsg('⚠️ Network error — please check your internet connection and try again.','bot');
      }
  
      isChatLoading=false;
      sendBtn.disabled=false;
      inp.focus();
    });
  }
  
  function qAsk(q){
    document.getElementById('chat-inp').value=q;
    doChat();
  }
  
  function addMsg(text,cls){
    const area=document.getElementById('chat-area');
    const d=document.createElement('div');
    d.className='msg '+cls;
    d.textContent=text;
    area.appendChild(d);
    area.scrollTop=area.scrollHeight;
    return d;
  }
  /* ═══════════════════════════════════════════════════════
     NEW FARMER TOOL (v7) — static data-driven plans
  ══════════════════════════════════════════════════════ */
  let nfCrop = null;
  let nfIrr = null;
  
  function selNFCrop(btn, crop, emo) {
    document.querySelectorAll('#nf-crop-grid .nf-crop-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    nfCrop = crop;
    checkNFReady();
  }
  function selIrr(btn, type) {
    ['irr-canal','irr-bore','irr-rain'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.remove('sel');
    });
    btn.classList.add('sel');
    nfIrr = type;
    checkNFReady();
  }
  function checkNFReady() {
    const btn = document.getElementById('nf-generate-btn');
    if(btn) btn.disabled = !(nfCrop && nfIrr);
  }
  
  function generateFarmerPlan() {
    document.getElementById('nf-selector').style.display = 'none';
    document.getElementById('nf-plan').style.display = 'block';
    document.getElementById('nf-loading').style.display = 'flex';
    document.getElementById('nf-output').style.display = 'none';
    const acres = +document.getElementById('nf-acres').value;
    setTimeout(() => {
      document.getElementById('nf-loading').style.display = 'none';
      document.getElementById('nf-output').style.display = 'block';
      renderFarmerPlan(nfCrop, acres, nfIrr);
      document.getElementById('nf-plan').scrollIntoView({ behavior: 'smooth' });
    }, 2000);
  }
  
  function renderFarmerPlan(crop, acres, irr) {
    const plan = getNFPlan(crop, acres, irr);
    let html = `
      <div class="result-hero slide-in" style="background:linear-gradient(135deg,var(--blue),#0d3a6b)">
        <div class="res-label">YOUR PERSONALIZED PLAN</div>
        <div class="big">${plan.emo} ${crop}</div>
        <div class="sub">${acres} acres • ${irr.charAt(0).toUpperCase()+irr.slice(1)} irrigation • ${plan.duration}</div>
      </div>`;
  
    html += `<div class="sec slide-in">
      <div class="sec-head"><h3>📅 Weekly Schedule</h3><span class="badge up tag">${plan.weeks.length} weeks</span></div>
      ${plan.weeks.map(w => `
        <div class="nf-week-row">
          <div class="nf-week-num">Week ${w.n}</div>
          <div class="nf-week-body">
            <div class="nf-week-title">${w.title}</div>
            <div class="nf-week-desc">${w.desc}</div>
          </div>
        </div>`).join('')}
    </div>`;
  
    html += `<div class="sec slide-in">
      <div class="sec-head"><h3>💧 Irrigation Schedule</h3></div>
      ${plan.irrigation.map(i => `
        <div class="nf-water-row">
          <div class="nf-day-badge">${i.time}</div>
          <div><strong style="font-size:13px;color:var(--text)">${i.action}</strong><br><span style="font-size:12px;color:var(--text2)">${i.note}</span></div>
        </div>`).join('')}
    </div>`;
  
    html += `<div class="sec slide-in">
      <div class="sec-head"><h3>🌿 Fertilizer Plan</h3><span class="badge up tag">AI Recommended</span></div>
      ${plan.fertilizers.map(f => `
        <div class="nf-fert-row">
          <div class="nf-fert-name">${f.name}</div>
          <div class="nf-fert-det">${f.dose} · <strong>${f.timing}</strong> · ${f.method}</div>
        </div>`).join('')}
    </div>`;
  
    html += `<div class="sec slide-in">
      <div class="sec-head"><h3>🐛 Pest &amp; Disease Watch</h3><span class="badge" style="background:var(--red-light);color:var(--red)">Stay Alert</span></div>
      ${plan.pests.map(p => `
        <div class="nf-pest-row">
          <div class="nf-pest-name">⚠️ ${p.name}</div>
          <div class="nf-pest-det">Signs: ${p.signs}<br>Treatment: ${p.treatment}</div>
        </div>`).join('')}
    </div>`;
  
    html += `<div class="sec slide-in">
      <div class="sec-head"><h3>💰 Cost &amp; Revenue Estimate</h3></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--red-light);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:11px;color:var(--red);font-weight:700;margin-bottom:4px">TOTAL COST</div>
          <div style="font-size:22px;font-weight:700;color:var(--red)">₹${plan.cost}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">per acre</div>
        </div>
        <div style="background:var(--green-light);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:11px;color:var(--green);font-weight:700;margin-bottom:4px">EXPECTED INCOME</div>
          <div style="font-size:22px;font-weight:700;color:var(--green)">₹${plan.income}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">per acre</div>
        </div>
      </div>
      <div class="tip g" style="margin-top:10px">💵 Net Profit: ~₹${(parseInt(plan.income.replace(/,/g,'')) - parseInt(plan.cost.replace(/,/g,''))).toLocaleString('en-IN')} per acre. Total for ${acres} acres: ~₹${((parseInt(plan.income.replace(/,/g,'')) - parseInt(plan.cost.replace(/,/g,'')))*acres).toLocaleString('en-IN')}</div>
    </div>`;
  
    document.getElementById('nf-output').innerHTML = html;
  }
  
  function getNFPlan(crop, acres, irr) {
    const plans = {
      Rice: {
        emo:'🍚', duration:'130–150 days',
        weeks:[
          {n:1, title:'Land Preparation & Nursery', desc:'Plow 3x, puddling for transplanted rice. Prepare nursery bed 1/10th of area. Sow pre-soaked seeds @25kg/acre.'},
          {n:2, title:'Nursery Management', desc:'Apply DAP @5g/litre for nursery. Maintain 2cm water level. Watch for seedling blight.'},
          {n:'3–4', title:'Transplanting', desc:'Transplant 21-day-old seedlings. 2 seedlings/hill, 20×15cm spacing. Apply basal fertilizer before transplanting.'},
          {n:'5–8', title:'Tillering & Fertilization', desc:'Apply first top dressing of urea @25kg/acre at 21 DAT. Maintain 5cm water. Weed management critical.'},
          {n:'9–14', title:'Panicle Initiation', desc:'Apply 2nd urea dose @20kg/acre. Watch for blast and BLB. Drain field briefly.'},
          {n:'15–20', title:'Grain Filling to Harvest', desc:'Stop irrigation 7 days before harvest. Harvest when 80% grains are golden. Threshing and storage.'},
        ],
        irrigation:[
          {time:'Weekly', action:'Maintain 5cm standing water', note:'Critical during tillering. Drain at flowering stage for 2 days.'},
          {time:'Day 85', action:'Drain field', note:'Drain 10 days before harvest for combine harvester access.'},
          {time:'Critical', action:'Never let soil crack', note:'During grain filling stage (80–100 DAT) — ensure continuous water.'},
        ],
        fertilizers:[
          {name:'DAP (Diammonium Phosphate)', dose:'50 kg/acre', timing:'Basal at transplanting', method:'Mix in soil during puddling'},
          {name:'Urea', dose:'25 kg/acre (1st dose)', timing:'21 days after transplant', method:'Broadcasting into water'},
          {name:'Urea', dose:'20 kg/acre (2nd dose)', timing:'45 days after transplant', method:'Broadcasting into water'},
          {name:'Potash (MOP)', dose:'25 kg/acre', timing:'Basal at transplanting', method:'Mix in soil during final plowing'},
          {name:'Zinc Sulfate', dose:'10 kg/acre', timing:'Basal if zinc deficient', method:'Broadcast and mix'},
        ],
        pests:[
          {name:'Rice Blast', signs:'Diamond-shaped gray spots on leaves', treatment:'Tricyclazole 75WP @0.6g/L spray'},
          {name:'Brown Plant Hopper', signs:'Yellowing patches, hopper burn', treatment:'Buprofezin 25SC @1ml/L spray'},
          {name:'Stem Borer', signs:'Dead heart or white ear, larva in stem', treatment:'Chlorpyriphos 20EC @2ml/L'},
          {name:'Bacterial Leaf Blight', signs:'Water-soaked yellow margin lesions', treatment:'Copper oxychloride 50WP @3g/L'},
        ],
        cost:'18,000', income:'42,000'
      },
      Wheat: {
        emo:'🌾', duration:'120–150 days',
        weeks:[
          {n:1, title:'Land Preparation', desc:'Deep plow, 2 cross harrowing. Fine seedbed essential. Apply FYM 40q/acre 2 weeks before sowing.'},
          {n:2, title:'Sowing (Oct–Nov)', desc:'Sow @40kg/acre. Row spacing 22.5cm. Depth 5cm. Use certified seed of HD 3086/DBW 187.'},
          {n:'3–5', title:'Pre-tiller Irrigation', desc:'First irrigation (CRI stage) at 20–25 DAS. Critical for establishing root system.'},
          {n:'6–9', title:'Tillering', desc:'2nd irrigation at tillering (40 DAS). Apply 2nd dose of urea @30kg/acre after irrigation.'},
          {n:'10–14', title:'Jointing to Heading', desc:'3rd irrigation at jointing, 4th at booting. Watch for rust and aphids.'},
          {n:'15–20', title:'Grain Filling to Harvest', desc:'5th irrigation at grain filling. Stop water 2 weeks before harvest. Harvest at 12% moisture.'},
        ],
        irrigation:[
          {time:'20 DAS', action:'1st irrigation (CRI)', note:'Most critical irrigation. Do not skip — reduces yield by 30% if missed.'},
          {time:'40 DAS', action:'2nd irrigation (Tillering)', note:'Apply urea immediately after this irrigation.'},
          {time:'60 DAS', action:'3rd irrigation (Jointing)', note:'Maintain soil moisture for vigorous growth.'},
          {time:'80 DAS', action:'4th irrigation (Booting)', note:'Protect panicle development.'},
          {time:'100 DAS', action:'5th irrigation (Grain Fill)', note:'Last irrigation. Stop 15 days before harvest.'},
        ],
        fertilizers:[
          {name:'DAP', dose:'50 kg/acre', timing:'Basal at sowing', method:'Drill along with seed or broadcast'},
          {name:'Urea', dose:'55 kg/acre (1st dose)', timing:'Basal at sowing', method:'Broadcast and mix'},
          {name:'Urea', dose:'30 kg/acre (2nd dose)', timing:'After 1st irrigation', method:'Top dressing'},
          {name:'Potash (MOP)', dose:'25 kg/acre', timing:'Basal at sowing', method:'Broadcast and mix'},
          {name:'Sulfur', dose:'10 kg/acre', timing:'Basal', method:'Gypsum form broadcast'},
        ],
        pests:[
          {name:'Aphids (Mahu)', signs:'Clusters of insects on leaves/stems', treatment:'Imidacloprid 17.8SL @0.5ml/L spray'},
          {name:'Stem Rust', signs:'Orange-brown pustules on stems', treatment:'Propiconazole 25EC @1ml/L spray'},
          {name:'Yellow Rust', signs:'Yellow stripe pattern on leaves', treatment:'Tebuconazole 25.9EC @1ml/L spray'},
          {name:'Loose Smut', signs:'Black smutted ears replacing grain', treatment:'Carboxin seed treatment @2g/kg'},
        ],
        cost:'12,000', income:'32,000'
      },
      Maize: {
        emo:'🌽', duration:'90–110 days',
        weeks:[
          {n:1, title:'Land Prep & Sowing', desc:'Deep plow to 20cm. Apply FYM @30q/acre. Sow @8kg/acre, 60×20cm spacing, 5cm depth.'},
          {n:'2–3', title:'Germination & Thinning', desc:'Thin to single plant/hill at 10 DAS. Apply Atrazine 50WP @1kg/acre for weed control.'},
          {n:'4–6', title:'Vegetative Growth', desc:'Apply 1st urea dose @30kg/acre at 25 DAS. First earthing-up at 30 DAS.'},
          {n:'7–10', title:'Tasseling & Silking', desc:'Critical water stage! Apply 2nd urea @25kg/acre. Watch for fall armyworm.'},
          {n:'11–14', title:'Grain Filling', desc:'Stop nitrogen. Maintain soil moisture. Watch for stem borer damage.'},
          {n:'15–16', title:'Maturity & Harvest', desc:'Harvest when husks turn brown, grains hard. Dry to <12% moisture before storage.'},
        ],
        irrigation:[
          {time:'At sowing', action:'Pre-sowing irrigation', note:'Ensure good soil moisture for germination.'},
          {time:'25 DAS', action:'Knee-high stage', note:'Critical — do not stress the crop here.'},
          {time:'55–60 DAS', action:'Tasseling (most critical)', note:'Water stress at this stage reduces yield by 40–50%.'},
          {time:'75 DAS', action:'Grain filling', note:'Ensure moisture for proper grain development.'},
        ],
        fertilizers:[
          {name:'DAP', dose:'50 kg/acre', timing:'At sowing (basal)', method:'Place in furrow below seed'},
          {name:'Urea', dose:'30 kg/acre (1st)', timing:'25 DAS', method:'Side dressing + soil coverage'},
          {name:'Urea', dose:'25 kg/acre (2nd)', timing:'45 DAS (tasseling)', method:'Side dressing + earthing up'},
          {name:'Zinc Sulfate', dose:'10 kg/acre', timing:'Basal if zinc deficient', method:'Broadcast and mix in soil'},
        ],
        pests:[
          {name:'Fall Armyworm', signs:'Holes in leaves, frass in whorl', treatment:'Emamectin benzoate 5SG @0.4g/L spray into whorl'},
          {name:'Stem Borer', signs:'Dead heart in young plants', treatment:'Chlorpyriphos 20EC @2.5ml/L spray at base'},
          {name:'Leaf Blight', signs:'Oval tan lesions on leaves', treatment:'Mancozeb 75WP @2g/L spray every 10 days'},
        ],
        cost:'10,000', income:'28,000'
      },
      Tomato: {
        emo:'🍅', duration:'90–120 days',
        weeks:[
          {n:1, title:'Nursery Preparation', desc:'Prepare raised beds. Sow seeds @150g/acre. Treat seeds with Thiram 2g/kg. Apply vermicompost.'},
          {n:'2–4', title:'Nursery & Transplanting', desc:'Harden seedlings week 3. Transplant 25-day-old seedlings at 60×45cm spacing in evening.'},
          {n:'5–8', title:'Vegetative Growth', desc:'Apply urea @15kg/acre at 15 DAT. Stake plants at 30cm height. Weed twice.'},
          {n:'9–12', title:'Flowering Stage', desc:'Apply 2nd dose NPK. Remove suckers. Spray boron 1g/L for fruit set.'},
          {n:'13–16', title:'Fruiting & Harvest', desc:'Apply potash @20kg/acre. Harvest first picking. Multiple pickings every 5 days.'},
        ],
        irrigation:[
          {time:'At transplant', action:'Immediate light irrigation', note:'Help seedling establishment. Avoid waterlogging.'},
          {time:'Every 4–5 days', action:'Regular drip/furrow', note:'Tomato needs consistent moisture. Irregular watering causes blossom end rot.'},
          {time:'Fruiting', action:'Increase frequency', note:'Critical for fruit size. 2cm water/week during fruit development.'},
        ],
        fertilizers:[
          {name:'FYM / Compost', dose:'40 q/acre', timing:'2 weeks before transplanting', method:'Incorporate in soil'},
          {name:'DAP', dose:'35 kg/acre', timing:'Basal at transplanting', method:'Row application'},
          {name:'Urea', dose:'30 kg/acre (split 3x)', timing:'15, 30, 45 DAT', method:'Side dressing'},
          {name:'Calcium Nitrate', dose:'5 kg/acre in water', timing:'Fruiting stage', method:'Fertigation'},
          {name:'Boron', dose:'1 g/litre foliar', timing:'At first flower', method:'Spray'},
        ],
        pests:[
          {name:'Tomato Leaf Curl Virus', signs:'Upward curling, yellowing, stunted growth', treatment:'Control whitefly with Imidacloprid 17.8SL @0.5ml/L'},
          {name:'Early Blight', signs:'Dark spots with concentric rings', treatment:'Mancozeb 75WP @2g/L spray every 10 days'},
          {name:'Fruit Borer (Helicoverpa)', signs:'Circular holes in fruits', treatment:'Spinosad 45SC @0.3ml/L'},
          {name:'Damping Off (Nursery)', signs:'Seedlings collapse at soil level', treatment:'Drench with Carbendazim 1g/L'},
        ],
        cost:'25,000', income:'75,000'
      },
      Potato: {
        emo:'🥔', duration:'90–110 days',
        weeks:[
          {n:1, title:'Land Prep & Planting', desc:'Deep plough 25–30cm. Apply FYM 50q/acre. Plant certified seed tubers 50×20cm spacing at 8–10cm depth.'},
          {n:'2–3', title:'Emergence', desc:'First irrigation 3–5 days after planting. Watch for late blight in humid weather.'},
          {n:'4–6', title:'Haulm Development', desc:'Earth up at 30 DAS for tuber development. Apply 2nd nitrogen dose.'},
          {n:'7–10', title:'Tuberization', desc:'Most critical period. Ensure regular water. Apply potash for tuber quality.'},
          {n:'11–14', title:'Maturity', desc:'Reduce irrigation 2 weeks before harvest. Haulm killing 10 days before harvest. Harvest when skin sets.'},
        ],
        irrigation:[
          {time:'3–5 DAS', action:'First irrigation after planting', note:'Light irrigation. Do not waterlog.'},
          {time:'Every 7–10 days', action:'Regular furrow irrigation', note:'Maintain even soil moisture throughout season.'},
          {time:'60–80 DAS', action:'Critical tuberization stage', note:'Never let soil dry out — reduces tuber size significantly.'},
        ],
        fertilizers:[
          {name:'DAP', dose:'50 kg/acre', timing:'At planting (basal)', method:'Mix in furrow before placing tubers'},
          {name:'Urea', dose:'40 kg/acre (1st)', timing:'At earthing up (30 DAS)', method:'Side dressing + cover with soil'},
          {name:'Urea', dose:'30 kg/acre (2nd)', timing:'50 DAS', method:'Top dressing with irrigation'},
          {name:'Potash (MOP)', dose:'50 kg/acre', timing:'At planting', method:'Broadcast and mix — improves quality'},
        ],
        pests:[
          {name:'Late Blight', signs:'Dark water-soaked lesions on leaves, white mold beneath', treatment:'Mancozeb 75WP @2.5g/L + Metalaxyl every 7 days'},
          {name:'Aphids', signs:'Curled yellow leaves, honeydew on surface', treatment:'Imidacloprid 17.8SL @0.5ml/L spray'},
          {name:'Cutworm', signs:'Stems cut at ground level', treatment:'Chlorpyriphos 20EC @2ml/L soil drench'},
        ],
        cost:'22,000', income:'55,000'
      },
      Cotton: {
        emo:'🌿', duration:'160–180 days',
        weeks:[
          {n:1, title:'Land Prep & Sowing', desc:'Deep summer plowing. Apply FYM @20q/acre. Sow BT cotton @1.5 bags/acre, 90×60cm spacing in April–May.'},
          {n:'2–4', title:'Seedling Establishment', desc:'Thin to 1 plant/hill at 15 DAS. First irrigation if needed. Watch for sucking pests.'},
          {n:'5–10', title:'Squaring Stage', desc:'Apply 1st urea dose. Spray for whitefly and aphids. Earthing up at 45 DAS.'},
          {n:'11–16', title:'Flowering & Boll Formation', desc:'Most critical stage. Apply 2nd NPK. Watch for bollworm. Timely spray essential.'},
          {n:'17–24', title:'Boll Opening', desc:'Harvest open bolls in stages. 4–6 pickings. Defoliate for machine harvesting.'},
        ],
        irrigation:[
          {time:'At sowing', action:'Pre-sowing moisture', note:'Good moisture ensures uniform germination.'},
          {time:'30 DAS', action:'First irrigation', note:'Light irrigation. Heavy irrigation promotes vegetative growth over fruiting.'},
          {time:'Flowering', action:'Most critical stage', note:'Any water stress at flowering reduces boll retention by 30–40%.'},
        ],
        fertilizers:[
          {name:'DAP', dose:'40 kg/acre', timing:'At sowing', method:'Broadcast and mix'},
          {name:'Urea', dose:'35 kg/acre (1st)', timing:'30 DAS', method:'Side dressing after earthing up'},
          {name:'Urea', dose:'25 kg/acre (2nd)', timing:'60 DAS (squaring)', method:'Top dressing'},
          {name:'Potash (MOP)', dose:'30 kg/acre', timing:'Basal', method:'Broadcast and mix'},
        ],
        pests:[
          {name:'Pink Bollworm', signs:'Entry hole in bolls, damaged seeds, pink larvae', treatment:'Emamectin benzoate 5SG @0.4g/L or Spinosad'},
          {name:'Whitefly', signs:'Yellow leaves, sticky honeydew, white insects', treatment:'Pymetrozine 50WG @0.3g/L or Imidacloprid 0.5ml/L'},
          {name:'Fusarium Wilt', signs:'Yellowing, wilting, stem discoloration', treatment:'Trichoderma @4kg/acre soil application'},
        ],
        cost:'20,000', income:'55,000'
      },
      Sugarcane: {
        emo:'🎋', duration:'10–12 months',
        weeks:[
          {n:1, title:'Land Prep & Planting', desc:'Deep plow to 30cm. Apply FYM @40q/acre. Plant 3-bud setts at 90cm spacing, cover 5–7cm deep.'},
          {n:'2–4', title:'Germination', desc:'Maintain soil moisture for germination. Earthing up at 30 DAP.'},
          {n:'5–12', title:'Tillering & Grand Growth', desc:'Apply urea in splits. 2–3 irrigations/month. Trash mulching between rows conserves moisture.'},
          {n:'13–24', title:'Maturation', desc:'Reduce nitrogen 3 months before harvest. Ripening sprays if needed. Harvest at 10–12 months.'},
        ],
        irrigation:[
          {time:'After planting', action:'Immediate irrigation', note:'Critical for sett germination. Maintain field capacity.'},
          {time:'Every 7–10 days', action:'Regular irrigation', note:'Sugarcane is very water-intensive — 8–12 irrigations in growing season.'},
          {time:'Last 2 months', action:'Reduce irrigation', note:'Withhold water for 6–8 weeks before harvest to improve sugar content.'},
        ],
        fertilizers:[
          {name:'DAP', dose:'50 kg/acre', timing:'At planting', method:'Apply in furrow before sett placement'},
          {name:'Urea', dose:'60 kg/acre (1st)', timing:'30 days after planting', method:'Top dressing after earthing up'},
          {name:'Urea', dose:'40 kg/acre (2nd)', timing:'90 days after planting', method:'Top dressing during grand growth'},
          {name:'Potash (MOP)', dose:'40 kg/acre', timing:'Basal at planting', method:'Broadcast and mix'},
        ],
        pests:[
          {name:'Top Shoot Borer', signs:'Dead heart, exit holes in stem', treatment:'Chlorpyriphos 20EC @3ml/L spray at base'},
          {name:'Woolly Aphid', signs:'White woolly mass on shoots and roots', treatment:'Dimethoate 30EC @1ml/L spray'},
          {name:'Red Rot', signs:'Internal red discoloration of cane, sour smell', treatment:'Use resistant varieties, hot water seed treatment'},
        ],
        cost:'30,000', income:'80,000'
      },
      Onion: {
        emo:'🧅', duration:'120–130 days',
        weeks:[
          {n:1, title:'Nursery & Transplanting', desc:'Prepare nursery bed. Sow @6–8 kg seed/acre. Transplant 8-week-old seedlings at 15×10cm spacing.'},
          {n:'2–5', title:'Vegetative Growth', desc:'Weed twice. Apply urea at 15 DAT. Regular shallow irrigation for leaf growth.'},
          {n:'6–10', title:'Bulb Development', desc:'Apply potash for bulb quality. Reduce nitrogen. Watch for thrips and purple blotch.'},
          {n:'11–16', title:'Maturity & Harvest', desc:'Stop irrigation when 50% tops fall. Cure bulbs in field for 3–5 days before storing.'},
        ],
        irrigation:[
          {time:'At transplant', action:'Light irrigation immediately', note:'Firm the soil around roots. Avoid standing water.'},
          {time:'Every 5–7 days', action:'Regular furrow/drip', note:'Drip irrigation best for onion — reduces purple blotch risk.'},
          {time:'2 weeks before harvest', action:'Stop irrigation', note:'Stopping water at correct time improves storability.'},
        ],
        fertilizers:[
          {name:'FYM', dose:'25 q/acre', timing:'2 weeks before transplanting', method:'Incorporate in soil'},
          {name:'DAP', dose:'40 kg/acre', timing:'At transplanting', method:'Basal application'},
          {name:'Urea', dose:'25 kg/acre (split 2x)', timing:'15 and 30 DAT', method:'Side dressing'},
          {name:'Potash (MOP)', dose:'30 kg/acre', timing:'30 DAT (bulb initiation)', method:'Top dressing — key for bulb quality'},
        ],
        pests:[
          {name:'Thrips', signs:'Silver streaks on leaves, curling', treatment:'Spinosad 45SC @0.3ml/L or Fipronil spray'},
          {name:'Purple Blotch', signs:'Purple lesions with yellow halo on leaves', treatment:'Mancozeb 75WP @2g/L + Iprodione spray'},
          {name:'Basal Rot', signs:'White fluffy mold at base, yellowing', treatment:'Carbendazim 1g/L soil drench + well-drained soil'},
        ],
        cost:'20,000', income:'60,000'
      },
      Mustard: {
        emo:'🌼', duration:'90–110 days',
        weeks:[
          {n:1, title:'Land Prep & Sowing', desc:'Fine seedbed. Sow @2kg/acre, 30×10cm spacing in Oct–Nov. Very shallow sowing (2cm depth).'},
          {n:'2–3', title:'Emergence & Thinning', desc:'Thin to 10cm spacing at 15 DAS. First irrigation at 3-leaf stage if needed.'},
          {n:'4–7', title:'Vegetative & Flowering', desc:'Apply 2nd urea dose. First irrigation critical at flowering. Watch for Alternaria blight.'},
          {n:'8–14', title:'Pod Filling & Harvest', desc:'2nd irrigation at pod filling. Harvest when 75% pods turn golden. Threshing when dry.'},
        ],
        irrigation:[
          {time:'25 DAS (branching)', action:'1st critical irrigation', note:'If no rain, this irrigation is essential. Do not miss.'},
          {time:'50 DAS (flowering)', action:'2nd irrigation', note:'Critical for pod setting. Water stress here reduces yield by 20–30%.'},
          {time:'70 DAS (pod filling)', action:'3rd irrigation', note:'Helps seed development. Stop if rain expected.'},
        ],
        fertilizers:[
          {name:'DAP', dose:'40 kg/acre', timing:'At sowing', method:'Drill below seed or broadcast'},
          {name:'Urea', dose:'25 kg/acre (1st)', timing:'At sowing', method:'Broadcast and mix'},
          {name:'Urea', dose:'20 kg/acre (2nd)', timing:'After 1st irrigation', method:'Top dressing'},
          {name:'Sulfur', dose:'15 kg/acre', timing:'Basal at sowing', method:'Essential for mustard — gypsum form preferred'},
        ],
        pests:[
          {name:'Aphids (Mahu)', signs:'Dense colonies on shoot tips, yellowing', treatment:'Imidacloprid 17.8SL @0.5ml/L or Dimethoate 30EC @1ml/L'},
          {name:'Alternaria Blight', signs:'Dark brown spots with yellow halo on leaves', treatment:'Mancozeb 75WP @2g/L spray at 50% flowering'},
          {name:'White Rust', signs:'White powdery pustules on leaves and stem', treatment:'Metalaxyl 8%+Mancozeb 64WP @2g/L spray'},
        ],
        cost:'8,000', income:'22,000'
      }
    };
    return plans[crop] || plans.Wheat;
  }
  
  function resetNFGuide() {
    nfCrop = null; nfIrr = null;
    document.getElementById('nf-selector').style.display = 'block';
    document.getElementById('nf-plan').style.display = 'none';
    document.querySelectorAll('.nf-crop-btn').forEach(b => b.classList.remove('sel'));
    ['irr-canal','irr-bore','irr-rain'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.remove('sel');
    });
    const btn = document.getElementById('nf-generate-btn');
    if(btn) btn.disabled = true;
    window.scrollTo({ top: 0 });
  }
  
  /* ═══════════════════════════════════════════════════════
     AI PLANT SCAN (v7 — Claude Vision API + demo modes)
  ══════════════════════════════════════════════════════ */
  let scanImageBase64 = null;
  
  function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById('dd-preview');
      img.src = e.target.result;
      img.style.display = 'block';
      document.getElementById('scan-btn').style.display = 'block';
      scanImageBase64 = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
  }
  
  function demoScan(type) {
    document.getElementById('scan-results').style.display = 'block';
    document.getElementById('scan-loading').style.display = 'flex';
    document.getElementById('scan-output').style.display = 'none';
    document.getElementById('dd-preview').style.display = 'none';
    setTimeout(() => {
      document.getElementById('scan-loading').style.display = 'none';
      document.getElementById('scan-output').style.display = 'block';
      renderScanResult(getDemoDisease(type));
      document.getElementById('scan-results').scrollIntoView({ behavior: 'smooth' });
    }, 2000);
  }
  
  async function runScan() {
    if (!scanImageBase64) return;
    document.getElementById('scan-results').style.display = 'block';
    document.getElementById('scan-loading').style.display = 'flex';
    document.getElementById('scan-output').style.display = 'none';
  
    promptApiKey(async(key)=>{
    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1000,
          system: `You are an expert plant pathologist AI for Indian farmers. Analyze the plant image and respond ONLY with a JSON object (no markdown, no extra text):
  {
    "healthy": true/false,
    "disease": "disease name or Healthy Plant",
    "plant": "plant type identified",
    "confidence": 85,
    "severity": "Mild/Moderate/Severe/None",
    "symptoms": ["symptom1","symptom2","symptom3"],
    "organic_remedies": ["remedy1","remedy2"],
    "chemical_treatment": ["chemical1 - dosage","chemical2 - dosage"],
    "prevention": ["tip1","tip2","tip3"],
    "urgency": "Immediate/This week/Routine monitoring"
  }`,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: scanImageBase64 } },
              { type: 'text', text: 'Analyze this plant/crop image for diseases. Respond with JSON only.' }
            ]
          }]
        })
      });
      const data = await response.json();
      let result;
      try {
        const text = data.content.map(b => b.text || '').join('');
        result = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch {
        result = getDemoDisease('generic');
      }
      document.getElementById('scan-loading').style.display = 'none';
      document.getElementById('scan-output').style.display = 'block';
      renderScanResult(result);
    } catch(err) {
      document.getElementById('scan-loading').style.display = 'none';
      document.getElementById('scan-output').innerHTML = '<div class="tip r">⚠️ Scan failed. Please check your API key and try again.</div>';
      document.getElementById('scan-output').style.display = 'block';
    }
    }); // end promptApiKey
  }
  
  function renderScanResult(r) {
    const sevColor = r.healthy ? '#173404' : r.severity === 'Severe' ? '#4a1010' : r.severity === 'Moderate' ? '#3a1e00' : '#3a1e00';
    const sevBg = r.healthy ? 'var(--green-light)' : r.severity === 'Severe' ? 'var(--red-light)' : r.severity === 'Moderate' ? 'var(--amber-light)' : '#fffbe6';
    const gradStart = r.healthy ? '#1a6b0f' : (r.severity === 'Severe' ? '#a8071a' : '#7c2d12');
  
    let html = `
      <div class="dd-result-hero slide-in" style="background:linear-gradient(135deg,${gradStart},#1a1a2e)">
        <div style="font-size:11px;color:rgba(255,255,255,.6);letter-spacing:.5px;font-weight:600;text-transform:uppercase;margin-bottom:4px">${r.plant || 'Plant Analysis'}</div>
        <div class="dis-name">${r.healthy ? '✅ ' : '⚠️ '}${r.disease}</div>
        <div class="dis-conf">AI Confidence: ${r.confidence}%</div>
        <div class="sev-badge" style="background:${sevBg};color:${sevColor}">Severity: ${r.severity || 'None'}</div>
        <div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,.8);background:rgba(255,255,255,.1);padding:5px 12px;border-radius:20px;display:inline-block">⏰ ${r.urgency || 'Routine monitoring'}</div>
      </div>`;
  
    if (!r.healthy && r.symptoms?.length) {
      html += `<div class="sec slide-in"><div class="sec-head"><h3>🔴 Observed Symptoms</h3></div>`;
      html += r.symptoms.map(s => `<div class="dd-sym-item">⚪ ${s}</div>`).join('');
      html += `</div>`;
    }
    if (r.organic_remedies?.length) {
      html += `<div class="sec slide-in"><div class="sec-head"><h3>🌿 Organic Remedies</h3><span class="badge up tag">Natural</span></div>`;
      html += r.organic_remedies.map((s, i) => `<div class="dd-remedy-step"><strong>Step ${i+1}:</strong> ${s}</div>`).join('');
      html += `</div>`;
    }
    if (!r.healthy && r.chemical_treatment?.length) {
      html += `<div class="sec slide-in"><div class="sec-head"><h3>🧪 Chemical Treatment</h3><span class="badge" style="background:#fef3c7;color:#92400e">Fast Acting</span></div>`;
      html += r.chemical_treatment.map(s => `<div class="dd-chem-step">💊 ${s}</div>`).join('');
      html += `</div>`;
    }
    if (r.prevention?.length) {
      html += `<div class="sec slide-in"><div class="sec-head"><h3>🛡 Prevention Tips</h3></div>`;
      html += r.prevention.map(s => `<div class="dd-prevent-item">✅ ${s}</div>`).join('');
      html += `</div>`;
    }
    document.getElementById('scan-output').innerHTML = html;
  }
  
  function getDemoDisease(type) {
    const diseases = {
      wheat_rust: {
        healthy:false, disease:'Wheat Stem Rust (Puccinia graminis)', plant:'Wheat (Triticum aestivum)',
        confidence:94, severity:'Moderate',
        symptoms:['Orange-brown pustules on stems and leaves','Yellowing leaf tissue around pustules','Premature leaf death','Powdery rust-colored spore masses'],
        organic_remedies:['Remove and destroy infected plant material immediately','Apply neem oil spray (5ml/litre) every 7 days','Increase plant spacing to improve air circulation'],
        chemical_treatment:['Propiconazole 25% EC @0.1% spray — repeat after 14 days','Mancozeb 75% WP @2.5 g/litre — preventive spray'],
        prevention:['Use rust-resistant varieties (HD 3086, PBW 550)','Avoid late sowing — early Rabi sowing reduces rust risk','Monitor fields weekly from 60 DAS','Maintain field hygiene — remove crop residue after harvest'],
        urgency:'This week'
      },
      rice_blast: {
        healthy:false, disease:'Rice Blast (Magnaporthe oryzae)', plant:'Rice / Paddy',
        confidence:91, severity:'Severe',
        symptoms:['Diamond-shaped lesions with gray centers','Brown to reddish-brown leaf lesions','Neck blast causing panicle break','Whitish ear heads (neck rot)'],
        organic_remedies:['Apply Trichoderma viride @4 g/litre as foliar spray','Spray pseudomonas fluorescens @10 g/litre','Avoid excess nitrogen application'],
        chemical_treatment:['Tricyclazole 75% WP @0.6 g/litre — 2 sprays 10 days apart','Isoprothiolane 40% EC @1.5 ml/litre at boot leaf stage'],
        prevention:['Use blast-resistant varieties (IR64, Pusa 1460)','Balanced NPK — avoid excess nitrogen','Drain fields intermittently to reduce humidity','Seed treatment with Carbendazim 2g/kg seed'],
        urgency:'Immediate'
      },
      tomato_blight: {
        healthy:false, disease:'Early Blight (Alternaria solani)', plant:'Tomato',
        confidence:89, severity:'Moderate',
        symptoms:['Dark brown spots with concentric rings (target board pattern)','Yellow halo around leaf spots','Lower leaves affected first','Stem lesions at soil level'],
        organic_remedies:['Remove affected leaves and destroy them','Apply copper oxychloride spray @3g/litre','Spray cow dung + water (1:10) as biocontrol'],
        chemical_treatment:['Mancozeb 75% WP @2 g/litre — spray every 10 days','Chlorothalonil 75% WP @2 g/litre alternating with Mancozeb'],
        prevention:['Use certified disease-free seeds','Avoid overhead irrigation — use drip','Maintain 2-year crop rotation','Stake plants for better air circulation'],
        urgency:'This week'
      },
      healthy: {
        healthy:true, disease:'Healthy Plant — No Disease Detected', plant:'Crop Plant',
        confidence:97, severity:'None',
        symptoms:[],
        organic_remedies:['Continue current management practices','Apply neem cake @50 kg/acre as preventive','Maintain regular field monitoring'],
        chemical_treatment:[],
        prevention:['Monitor weekly for early pest/disease signs','Ensure balanced fertilization','Maintain good soil drainage','Keep field weed-free'],
        urgency:'Routine monitoring'
      },
      cotton_wilt: {
        healthy:false, disease:'Cotton Fusarium Wilt (Fusarium oxysporum)', plant:'Cotton',
        confidence:88, severity:'Severe',
        symptoms:['Wilting of entire plant or single branches','Yellowing between leaf veins','Brown discoloration of stem vascular tissue','Premature boll drop'],
        organic_remedies:['Apply Trichoderma harzianum @4 kg/acre in soil','Use neem cake @100 kg/acre at sowing','Crop rotation with sorghum or maize'],
        chemical_treatment:['Carbendazim 50% WP @1 g/litre as drench around roots','Thiophanate methyl @1 g/litre soil drench'],
        prevention:['Use wilt-resistant BT cotton varieties','Avoid waterlogging — ensure good drainage','Deep summer plowing to reduce soil inoculum','Seed treatment with Thiram 3g/kg'],
        urgency:'Immediate'
      },
      mango_anthracnose: {
        healthy:false, disease:'Mango Anthracnose (Colletotrichum gloeosporioides)', plant:'Mango (Mangifera indica)',
        confidence:92, severity:'Moderate',
        symptoms:['Dark brown to black irregular spots on leaves','Blossom blight causing flower drop','Dark sunken spots on mature fruits','Twig dieback in severe cases'],
        organic_remedies:['Bordeaux mixture spray (1%) during flowering','Apply neem oil 2% spray every 15 days','Prune and destroy infected twigs'],
        chemical_treatment:['Carbendazim 0.1% spray — 3 sprays at 15-day intervals','Mancozeb 0.25% spray before and after flowering'],
        prevention:['Maintain orchard hygiene — remove fallen debris','Avoid overhead irrigation in flowering season','Apply copper oxychloride post-harvest','Select anthracnose-tolerant varieties'],
        urgency:'This week'
      }
    };
    return diseases[type] || diseases.healthy;
  }
  
  function resetScan() {
    document.getElementById('scan-results').style.display = 'none';
    const preview = document.getElementById('dd-preview');
    preview.style.display = 'none';
    preview.src = '';
    document.getElementById('scan-btn').style.display = 'none';
    scanImageBase64 = null;
    window.scrollTo({ top: 0 });
  }
  
  
  /* ═══════════════════════════════════════════════════════
     GOVERNMENT SCHEMES
  ══════════════════════════════════════════════════════ */
  const scState={scState:null,scLand:null,scCat:null,scCrop:null};
  
  function scSel(el,key){
    el.parentElement.querySelectorAll('.scheme-q-opt').forEach(o=>o.classList.remove('sel'));
    el.classList.add('sel');
    scState[key]=el.textContent.trim();
    const allDone=Object.values(scState).every(v=>v);
    document.getElementById('sc-check-btn').disabled=!allDone;
  }
  
  const SCHEMES=[
    {id:'pmkisan',name:'PM-KISAN',nameHi:'PM-किसान',icon:'🌾',bg:'#e8f5db',color:'#2E6B0F',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'₹6,000/year direct cash transfer in 3 installments of ₹2,000 to all eligible farmer families.',benefitHi:'सभी पात्र किसान परिवारों को ₹2,000 की 3 किस्तों में ₹6,000/वर्ष सीधे बैंक खाते में।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://pmkisan.gov.in',tags:['Cash Transfer','All Farmers']},
    {id:'faisalbima',name:'PM Fasal Bima Yojana',nameHi:'PM फसल बीमा योजना',icon:'🛡',bg:'#e4effc',color:'#1A5FA8',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'Crop insurance at 1.5–5% premium for Rabi/Kharif crops. Protects against drought, flood, and natural disasters.',benefitHi:'रबी/खरीफ फसलों के लिए 1.5-5% प्रीमियम पर फसल बीमा। सूखे, बाढ़ और प्राकृतिक आपदाओं से सुरक्षा।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://pmfby.gov.in',tags:['Insurance','All Crops']},
    {id:'kcc',name:'Kisan Credit Card (KCC)',nameHi:'किसान क्रेडिट कार्ड',icon:'💳',bg:'#fdf0da',color:'#B87214',ministry:'Ministry of Finance',ministryHi:'वित्त मंत्रालय',benefit:'Credit up to ₹3 lakh at 4% interest rate (after subsidy) for crop production, post-harvest expenses.',benefitHi:'फसल उत्पादन और कटाई के बाद के खर्चों के लिए 4% ब्याज दर पर ₹3 लाख तक ऋण।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://www.nabard.org',tags:['Credit','Low Interest']},
    {id:'pmksy',name:'PM Krishi Sinchayee Yojana',nameHi:'PM कृषि सिंचाई योजना',icon:'💧',bg:'#e4effc',color:'#1A5FA8',ministry:'Ministry of Jal Shakti',ministryHi:'जल शक्ति मंत्रालय',benefit:'Subsidy on micro-irrigation (drip/sprinkler). Up to 55% subsidy for small/marginal farmers, 45% for others.',benefitHi:'सूक्ष्म सिंचाई (ड्रिप/स्प्रिंकलर) पर सब्सिडी। छोटे/सीमांत किसानों के लिए 55%, अन्य के लिए 45%।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://pmksy.gov.in',tags:['Irrigation','Subsidy']},
    {id:'soil',name:'Soil Health Card Scheme',nameHi:'मृदा स्वास्थ्य कार्ड योजना',icon:'🌱',bg:'#e8f5db',color:'#2E6B0F',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'Free soil testing and customised nutrient recommendations. Get a Soil Health Card valid for 2 years.',benefitHi:'मुफ्त मिट्टी परीक्षण और अनुकूलित पोषक तत्व अनुशंसाएं। 2 साल के लिए वैध मृदा स्वास्थ्य कार्ड।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://soilhealth.dac.gov.in',tags:['Free Testing','Soil Nutrition']},
    {id:'pmkvm',name:'PM Kisan Maandhan Yojana',nameHi:'PM किसान मानधन योजना',icon:'👴',bg:'#f3e8ff',color:'#6b21a8',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'Monthly pension of ₹3,000 after age 60. Small/marginal farmers contribute ₹55–200/month (18–40 yrs).',benefitHi:'60 वर्ष की आयु के बाद ₹3,000 मासिक पेंशन। छोटे/सीमांत किसान ₹55-200/माह योगदान करते हैं।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://maandhan.in',tags:['Pension','Small Farmers']},
    {id:'nfsm',name:'National Food Security Mission',nameHi:'राष्ट्रीय खाद्य सुरक्षा मिशन',icon:'🌾',bg:'#e8f5db',color:'#2E6B0F',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'Subsidy on certified seeds, fertilizers and farm equipment for wheat, rice and pulses growers.',benefitHi:'गेहूं, चावल और दाल उगाने वालों के लिए प्रमाणित बीज, उर्वरक और कृषि उपकरणों पर सब्सिडी।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds']},link:'https://nfsm.gov.in',tags:['Seeds','Fertilizer Subsidy']},
    {id:'subhmission',name:'Sub-Mission on Agricultural Mechanisation',nameHi:'कृषि यंत्रीकरण उप-मिशन',icon:'🚜',bg:'#fdf0da',color:'#B87214',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'50–80% subsidy on purchase of farm machinery like tractors, harvesters, threshers for small farmers.',benefitHi:'छोटे किसानों के लिए ट्रैक्टर, हार्वेस्टर, थ्रेशर जैसी कृषि मशीनरी पर 50-80% सब्सिडी।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Cotton / Sugarcane']},link:'https://agrimachinery.nic.in',tags:['Machinery','Subsidy']},
    {id:'horticulture',name:'Mission for Integrated Horticulture',nameHi:'एकीकृत बागवानी मिशन',icon:'🍅',bg:'#fbebeb',color:'#A02B2B',ministry:'Ministry of Agriculture',ministryHi:'कृषि मंत्रालय',benefit:'Subsidy for setting up polyhouses, drip irrigation, and post-harvest management for fruit/vegetable growers.',benefitHi:'फल/सब्जी उगाने वालों के लिए पॉलीहाउस, ड्रिप सिंचाई और कटाई के बाद प्रबंधन के लिए सब्सिडी।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['General','SC / ST','OBC','Women Farmer'],crop:['Vegetables / Fruits']},link:'https://midh.gov.in',tags:['Horticulture','Polyhouse']},
    {id:'womenfarmer',name:'Mahila Kisan Sashaktikaran',nameHi:'महिला किसान सशक्तिकरण',icon:'👩‍🌾',bg:'#fce7f3',color:'#be185d',ministry:'Ministry of Rural Development',ministryHi:'ग्रामीण विकास मंत्रालय',benefit:'Dedicated training, resource support and livelihood grants for women farmers. Priority access to all schemes.',benefitHi:'महिला किसानों के लिए समर्पित प्रशिक्षण, संसाधन सहायता और आजीविका अनुदान। सभी योजनाओं में प्राथमिकता।',eligibility:{land:['Less than 1 acre (Small/Marginal)','1–2 acres (Marginal)','2–5 acres (Small)','More than 5 acres (Medium/Large)'],cat:['Women Farmer'],crop:['Food Grains (Wheat/Rice)','Pulses / Oilseeds','Vegetables / Fruits','Cotton / Sugarcane']},link:'https://aajeevika.gov.in',tags:['Women','Special Benefits']},
  ];
  
  async function checkSchemes(){
    document.getElementById('sc-form-section').style.display='none';
    document.getElementById('sc-loading').style.display='flex';
    document.getElementById('sc-results').style.display='none';
  
    // Small delay for UX feel
    await new Promise(r=>setTimeout(r,1200));
  
    const eligible=SCHEMES.filter(s=>{
      const landOk=!s.eligibility.land||s.eligibility.land.includes(scState.scLand);
      const catOk=!s.eligibility.cat||s.eligibility.cat.includes(scState.scCat);
      const cropOk=!s.eligibility.crop||s.eligibility.crop.includes(scState.scCrop);
      return landOk&&catOk&&cropOk;
    });
  
    document.getElementById('sc-loading').style.display='none';
    document.getElementById('sc-results').style.display='block';
  
    const isHi=lang==='hi';
    document.getElementById('sc-res-count').textContent=eligible.length;
    document.getElementById('sc-res-sub').textContent=isHi?`सरकारी योजनाएं आपकी प्रोफाइल से मेल खाती हैं`:`government schemes match your profile`;
  
    const list=document.getElementById('sc-scheme-list');
    list.innerHTML=eligible.map((s,i)=>`
      <div class="scheme-card slide-in" style="border-color:${s.color}44;animation-delay:${i*0.07}s">
        <div class="scheme-card-head">
          <div class="scheme-icon" style="background:${s.bg}">${s.icon}</div>
          <div>
            <div class="scheme-name">${isHi?s.nameHi:s.name}</div>
            <div class="scheme-ministry">${isHi?s.ministryHi:s.ministry}</div>
          </div>
        </div>
        <div class="scheme-benefit">${isHi?s.benefitHi:s.benefit}</div>
        <div>
          ${s.tags.map(tag=>`<span class="scheme-tag scheme-eligible">${tag}</span>`).join('')}
        </div>
        <a class="scheme-link" href="${s.link}" target="_blank" rel="noopener">${isHi?'आवेदन करें / अधिक जानें →':'Apply / Learn More →'}</a>
      </div>`).join('');
  }
  
  function resetSchemes(){
    Object.keys(scState).forEach(k=>scState[k]=null);
    document.querySelectorAll('.scheme-q-opt').forEach(o=>o.classList.remove('sel'));
    document.getElementById('sc-check-btn').disabled=true;
    document.getElementById('sc-form-section').style.display='block';
    document.getElementById('sc-loading').style.display='none';
    document.getElementById('sc-results').style.display='none';
  }
  
  /* ═══════════════════════════════════════════════════════
     MANDI LOCATOR
  ══════════════════════════════════════════════════════ */
  const MANDI_DATA={
    'Uttar Pradesh':{
      'Agra':['Etmadpur','Kiraoli','Bah','Fatehpur Sikri','Pinahat'],
      'Lucknow':['Mal','Bakshi Ka Talab','Mohanlalganj','Chinhat','Kakori'],
      'Varanasi':['Arajiline','Cholapur','Harahua','Kashi Vidyapeeth','Pindra'],
      'Mathura':['Chhata','Farah','Govardhan','Mant','Nandgaon'],
      'Kanpur':['Bilhaur','Bhitargaon','Ghatampur','Kalyanpur','Rura'],
      'Aligarh':['Atrauli','Gabhana','Iglas','Khair','Tappal'],
      'Meerut':['Hapur','Kharkhoda','Machhrauta','Mawana','Sardhana'],
      'Allahabad':['Baraon','Chail','Handia','Meja','Phulpur'],
    },
    'Punjab':{
      'Amritsar':['Ajnala','Attari','Baba Bakala','Jandiala Guru','Rayya'],
      'Ludhiana':['Doraha','Khanna','Payal','Raikot','Samrala'],
      'Jalandhar':['Adampur','Bhogpur','Kartarpur','Nakodar','Shahkot'],
      'Patiala':['Patran','Rajpura','Samana','Sanour','Sanaur'],
      'Bathinda':['Goniana','Nathana','Phul','Rampura Phul','Talwandi Sabo'],
    },
    'Haryana':{
      'Hisar':['Adampur','Agroha','Barwala','Hansi','Narnaund'],
      'Rohtak':['Asthal Bohar','Kalanaur','Lakhan Majra','Maham','Meham'],
      'Karnal':['Assandh','Gharaunda','Indri','Nilokheri','Nissing'],
      'Ambala':['Ambala City','Ambala Cantt','Naraingarh','Shehzadpur','Saha'],
      'Sirsa':['Dabwali','Ellenabad','Kalanwali','Nathusari Chopta','Rania'],
    },
    'Rajasthan':{
      'Jaipur':['Amber','Bagru','Bassi','Chaksu','Chomu'],
      'Jodhpur':['Balesar','Bilara','Luni','Osian','Phalodi'],
      'Ajmer':['Arain','Bhinai','Kekri','Kishangarh','Masuda'],
      'Bikaner':['Bajju','Khajuwala','Kolayat','Lunkaransar','Nokha'],
      'Kota':['Baran','Digod','Itawa','Pipalda','Sangod'],
    },
    'Bihar':{
      'Patna':['Bihta','Danapur','Fatuha','Khagaul','Maner'],
      'Gaya':['Amas','Atri','Belaganj','Bodhgaya','Gurua'],
      'Muzaffarpur':['Bochaha','Katra','Motipur','Mushahari','Sahebganj'],
      'Bhagalpur':['Bihpur','Gopalpur','Kahalgaon','Nathnagar','Sabour'],
    },
    'Madhya Pradesh':{
      'Bhopal':['Berasia','Budhni','Huzur','Ichhawar','Sehore'],
      'Indore':['Depalpur','Hatod','Mhow','Sanwer','Simrol'],
      'Jabalpur':['Bargi','Kundam','Panagar','Patan','Sihora'],
      'Gwalior':['Bhitarwar','Dabra','Ghatiagaon','Morar','Pichhore'],
      'Ujjain':['Barnagar','Ghattia','Khachrod','Mahidpur','Nagda'],
    },
    'Maharashtra':{
      'Pune':['Baramati','Daund','Haveli','Indapur','Shirur'],
      'Nashik':['Dindori','Igatpuri','Nandgaon','Sinnar','Yeola'],
      'Nagpur':['Hingna','Kamptee','Katol','Narkhed','Ramtek'],
      'Aurangabad':['Gangapur','Kannad','Paithan','Phulambri','Vaijapur'],
      'Solapur':['Akkalkot','Barshi','Karmala','Mohol','Pandharpur'],
    },
    'Gujarat':{
      'Ahmedabad':['Bavla','Detroj','Dholka','Dholera','Mandal'],
      'Surat':['Bardoli','Kamrej','Mahuva','Mandvi','Olpad'],
      'Rajkot':['Gondal','Jasdan','Jetpur','Kotda Sangani','Paddhari'],
      'Vadodara':['Dabhoi','Karjan','Padra','Savli','Waghodia'],
    },
    'Karnataka':{
      'Bengaluru':['Devanahalli','Doddaballapur','Hosakote','Nelamangala','Ramanagara'],
      'Mysuru':['Hunsur','K.R.Nagar','Nanjangud','Periyapatna','T.Narasipura'],
      'Dharwad':['Alnavar','Hubli','Kalghatgi','Navalgund','Kundgol'],
      'Belagavi':['Athani','Bailhongal','Chikkodi','Gokak','Raibag'],
    },
    'Andhra Pradesh':{
      'Kurnool':['Adoni','Alur','Banaganapalle','Nandyal','Yemmiganur'],
      'Guntur':['Amaravati','Bapatla','Narasaraopet','Ponnur','Tenali'],
      'Krishna':['Gudivada','Machilipatnam','Nandigama','Nuzvid','Vijayawada'],
      'Visakhapatnam':['Anakapalli','Bheemunipatnam','Paderu','Pendurthi','Sabbavaram'],
    },
    'Tamil Nadu':{
      'Chennai':['Ambattur','Avadi','Poonamallee','Tiruvallur','Vellore'],
      'Coimbatore':['Annur','Mettupalayam','Pollachi','Sulur','Tirupur'],
      'Madurai':['Dindigul','Melur','Thirumangalam','Usilampatti','Vadipatti'],
      'Salem':['Attur','Edappadi','Gangavalli','Mettur','Omalur'],
    },
    'West Bengal':{
      'Kolkata':['Barasat','Basirhat','Bidhannagar','Dum Dum','Rajarhat'],
      'Howrah':['Bally','Domjur','Jagatballavpur','Panchla','Uluberia'],
      'Murshidabad':['Berhampore','Domkal','Farakka','Kandi','Lalbagh'],
      'Bardhaman':['Bhatar','Galsi','Katwa','Khandaghosh','Memari'],
    },
    'Telangana':{
      'Hyderabad':['Bahadurpura','Charminar','Rajendranagar','Secunderabad','Serilingampally'],
      'Rangareddy':['Chevella','Ibrahimpatnam','Moinabad','Shadnagar','Tandur'],
      'Warangal':['Eturnagaram','Hanamkonda','Narsampet','Parkal','Wardhannapet'],
      'Nizamabad':['Armur','Bheemgal','Bodhan','Kamareddy','Nandipet'],
    },
    'Odisha':{
      'Bhubaneswar':['Balianta','Baliapada','Begunia','Bolagarh','Khordha'],
      'Cuttack':['Athagarh','Baramba','Banki','Niali','Tigiria'],
      'Sambalpur':['Bamra','Burla','Jujumura','Kuchinda','Rengali'],
      'Berhampur':['Aska','Bhanjanagar','Chatrapur','Chikiti','Polasara'],
    }
  };
  
  const MANDI_LIST={
    'Uttar Pradesh':{
      'Agra':['Agra Main APMC','Firozabad Mandi','Etah Grain Market','Agra Vegetable Yard','Kiraoli Sub-Mandi'],
      'Lucknow':['Lucknow Amausi Mandi','Hardoi Road Mandi','Rae Bareli Road Mandi','Chinhat Mandi','Bakshi Ka Talab Mandi'],
      'Varanasi':['Varanasi Main Mandi','Mirzapur APMC','Ghazipur Market Yard','Banaras Grain Market','Jaunpur Mandi'],
      'Mathura':['Mathura Main APMC','Vrindavan Mandi','Bharatpur Road Market','Govardhan Grain Yard','Farah Mandi'],
      'Kanpur':['Kanpur Main APMC','Unnao Market Yard','Fatehpur Mandi','Hamirpur APMC','Rura Sub-Mandi'],
      'Aligarh':['Aligarh Main Mandi','Hathras APMC','Etah Market Yard','Firozabad Mandi','Kasganj Mandi'],
      'Meerut':['Meerut Main APMC','Hapur APMC','Ghaziabad Market','Baghpat Mandi','Muzaffarnagar Mandi'],
      'Allahabad':['Prayagraj Main Mandi','Pratapgarh APMC','Kaushambi Market','Fatehpur Mandi','Chitrakoot Mandi'],
    },
    'Punjab':{
      'Amritsar':['Amritsar Grain Market','Attari Mandi','Rayya APMC','Jandiala Guru Market','Tarn Taran Mandi'],
      'Ludhiana':['Ludhiana Main Market','Khanna APMC','Doraha Grain Yard','Samrala Mandi','Jagraon Mandi'],
      'Jalandhar':['Jalandhar Main Mandi','Nakodar APMC','Kartarpur Market','Phagwara Mandi','Nawanshahr Mandi'],
      'Patiala':['Patiala Main Market','Rajpura APMC','Samana Grain Yard','Sangrur Mandi','Fatehgarh Sahib Mandi'],
      'Bathinda':['Bathinda Main APMC','Mansa Market','Faridkot Mandi','Rampura Phul Yard','Muktsar Mandi'],
    },
    'Haryana':{
      'Hisar':['Hisar Main APMC','Fatehabad Market','Hansi Grain Yard','Sirsa APMC','Barwala Mandi'],
      'Rohtak':['Rohtak Main Market','Jhajjar APMC','Sonipat Mandi','Panipat Grain Yard','Gohana Mandi'],
      'Karnal':['Karnal Main APMC','Kaithal Market','Kurukshetra Mandi','Assandh Grain Yard','Indri Mandi'],
      'Ambala':['Ambala Main Mandi','Naraingarh APMC','Panchkula Market','Pehowa Mandi','Shahabad Mandi'],
      'Sirsa':['Sirsa Main APMC','Dabwali Market','Ellenabad Grain Yard','Fatehabad Mandi','Rania Mandi'],
    },
    'Rajasthan':{
      'Jaipur':['Jaipur Muhana Mandi','Chomu APMC','Chaksu Market','Dudu Grain Yard','Phulera Mandi'],
      'Jodhpur':['Jodhpur Main APMC','Phalodi Market','Luni Mandi','Bilara Grain Yard','Osian Mandi'],
      'Ajmer':['Ajmer Main Mandi','Kishangarh APMC','Kekri Market','Beawar Grain Yard','Nasirabad Mandi'],
      'Bikaner':['Bikaner Main APMC','Nokha Market','Lunkaransar Mandi','Kolayat Grain Yard','Dungargarh Mandi'],
      'Kota':['Kota Main APMC','Baran Market','Bundi Mandi','Jhalawar Grain Yard','Digod Mandi'],
    },
    'Bihar':{
      'Patna':['Patna Sabzi Mandi','Fatuha APMC','Danapur Market','Khagaul Grain Yard','Maner Mandi'],
      'Gaya':['Gaya Main Mandi','Bodh Gaya APMC','Belaganj Market','Aurangabad Grain Yard','Navada Mandi'],
      'Muzaffarpur':['Muzaffarpur Main APMC','Sitamarhi Market','Sheohar Mandi','Motipur Grain Yard','Hajipur Mandi'],
      'Bhagalpur':['Bhagalpur Main Mandi','Banka APMC','Kahalgaon Market','Deoghar Grain Yard','Dumka Mandi'],
    },
    'Madhya Pradesh':{
      'Bhopal':['Bhopal Main APMC','Sehore Market','Berasia Mandi','Vidisha Grain Yard','Raisen Mandi'],
      'Indore':['Indore Main APMC','Depalpur Market','Mhow Mandi','Dhar Grain Yard','Ratlam Mandi'],
      'Jabalpur':['Jabalpur Main APMC','Katni Market','Narsinghpur Mandi','Sagar Grain Yard','Damoh Mandi'],
      'Gwalior':['Gwalior Main APMC','Bhind Market','Morena Mandi','Dabra Grain Yard','Shivpuri Mandi'],
      'Ujjain':['Ujjain Main APMC','Ratlam Market','Dewas Mandi','Shajapur Grain Yard','Agar Malwa Mandi'],
    },
    'Maharashtra':{
      'Pune':['Pune Main APMC','Baramati Market','Indapur Mandi','Shirur Grain Yard','Daund Mandi'],
      'Nashik':['Nashik Main APMC','Lasalgaon Onion Market','Sinnar Mandi','Igatpuri Grain Yard','Nandgaon Mandi'],
      'Nagpur':['Nagpur Main APMC','Wardha Market','Amravati Mandi','Buldhana Grain Yard','Akola Mandi'],
      'Aurangabad':['Aurangabad Main APMC','Jalna Market','Osmanabad Mandi','Latur Grain Yard','Nanded Mandi'],
      'Solapur':['Solapur Main APMC','Pandharpur Market','Barshi Mandi','Akkalkot Grain Yard','Karmala Mandi'],
    },
  };
  
  // Get mandis for state/district (with fallback to generic list)
  function getMandiList(state,district){
    if(MANDI_LIST[state]&&MANDI_LIST[state][district]) return MANDI_LIST[state][district];
    // Generic fallback
    return [`${district} Main APMC Market`,`${district} Grain Market`,`${district} Sub-Mandi`,`${district} Vegetable Yard`,`${district} Wholesale Market`];
  }
  
  function loadMandiDistricts(){
    const state=document.getElementById('mn-state').value;
    const distSel=document.getElementById('mn-district');
    const areaSel=document.getElementById('mn-area');
    distSel.innerHTML='<option value="">-- Select District --</option>';
    areaSel.innerHTML='<option value="">-- Select Area --</option>';
    distSel.disabled=true; areaSel.disabled=true;
    document.getElementById('mn-find-btn').disabled=true;
    if(!state)return;
    const districts=MANDI_DATA[state]?Object.keys(MANDI_DATA[state]):[];
    districts.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;distSel.appendChild(o);});
    distSel.disabled=false;
  }
  
  function loadMandiAreas(){
    const state=document.getElementById('mn-state').value;
    const district=document.getElementById('mn-district').value;
    const areaSel=document.getElementById('mn-area');
    areaSel.innerHTML='<option value="">-- Select Area (optional) --</option>';
    areaSel.disabled=true;
    if(!district){document.getElementById('mn-find-btn').disabled=true;return;}
    const areas=MANDI_DATA[state]&&MANDI_DATA[state][district]?MANDI_DATA[state][district]:[];
    areas.forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;areaSel.appendChild(o);});
    areaSel.disabled=false;
    document.getElementById('mn-find-btn').disabled=false;
  }
  
  function findMandis(){
    const state=document.getElementById('mn-state').value;
    const district=document.getElementById('mn-district').value;
    const area=document.getElementById('mn-area').value;
    if(!state||!district)return;
  
    document.querySelector('#page-mandi .sec').style.display='none';
    document.getElementById('mn-loading').style.display='flex';
    document.getElementById('mn-results').style.display='none';
  
    setTimeout(()=>{
      document.getElementById('mn-loading').style.display='none';
      document.getElementById('mn-results').style.display='block';
  
      const isHi=lang==='hi';
      const mandis=getMandiList(state,district);
      const badge=document.getElementById('mn-res-badge');
      if(badge)badge.textContent=`${mandis.length} ${isHi?'मंडियां मिलीं':'mandis found'}`;
  
      // Crop data per state
      const cropMap={
        'Uttar Pradesh':'Wheat, Sugarcane, Potato, Paddy','Punjab':'Wheat, Paddy, Maize',
        'Haryana':'Wheat, Paddy, Cotton, Mustard','Rajasthan':'Wheat, Mustard, Bajra, Jowar',
        'Bihar':'Paddy, Wheat, Maize, Lentils','Madhya Pradesh':'Wheat, Soybean, Cotton, Maize',
        'Maharashtra':'Cotton, Soybean, Sugarcane, Onion','Gujarat':'Cotton, Groundnut, Castor',
        'Karnataka':'Paddy, Maize, Jowar, Cotton','Andhra Pradesh':'Paddy, Cotton, Chilli',
        'Tamil Nadu':'Paddy, Banana, Sugarcane','West Bengal':'Paddy, Jute, Potato',
        'Telangana':'Paddy, Cotton, Maize','Odisha':'Paddy, Maize, Turmeric'
      };
      const crops=cropMap[state]||'Wheat, Paddy, Vegetables';
      const timings=['6:00 AM – 2:00 PM','5:30 AM – 1:00 PM','6:00 AM – 12:00 PM','7:00 AM – 2:00 PM','5:00 AM – 12:00 PM'];
      const distances=['2.5 km','5.8 km','8.2 km','11.4 km','14.7 km'];
  
      const list=document.getElementById('mn-mandi-list');
      list.innerHTML=mandis.map((m,i)=>`
        <div class="mandi-card">
          <div class="mandi-num">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div class="mandi-nm">${m}</div>
            <div class="mandi-dist">${district}${area?', '+area:''}, ${state}</div>
            <div class="mandi-crops">${isHi?'फसलें: ':'Crops: '}${crops}</div>
          </div>
          <div class="mandi-meta">
            <div class="mandi-dist-km">${distances[i]||'~'+((i+1)*3)+' km'}</div>
            <div class="mandi-timing">${timings[i%5]}</div>
            ${i===0?`<div style="font-size:10px;background:var(--green-light);color:var(--green);padding:2px 6px;border-radius:6px;font-weight:600;margin-top:2px">${isHi?'नज़दीकी':'Nearest'}</div>`:''}
          </div>
        </div>`).join('');
  
    },1500);
  }
  
  function resetMandi(){
    document.querySelector('#page-mandi .sec').style.display='block';
    document.getElementById('mn-results').style.display='none';
    document.getElementById('mn-loading').style.display='none';
    document.getElementById('mn-state').value='';
    document.getElementById('mn-district').innerHTML='<option value="">-- Select District --</option>';
    document.getElementById('mn-district').disabled=true;
    document.getElementById('mn-area').innerHTML='<option value="">-- Select Area --</option>';
    document.getElementById('mn-area').disabled=true;
    document.getElementById('mn-find-btn').disabled=true;
  }

  } // end bootApp()
} // end window.onload