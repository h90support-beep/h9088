/* ================================================================
   H90 AI Cloud — v3.1 (SECURED - NO API KEY IN SOURCE)
   ================================================================
   ✅ Cloudflare Worker Proxy (الأساسي)
   ✅ لا يوجد مفتاح API في الكود المصدري
   ✅ المفتاح مخفي في Cloudflare Worker
   ✅ Multi-Model Fallback عبر Worker
   ✅ Image Understanding
   ✅ Rate Limiting 15/دقيقة، 500/يوم
   ✅ Cache 24 ساعة
   ✅ Direct API Disabled (يُفعَّل عند الحاجة فقط)
   ================================================================ */

(function () {
  'use strict';

  console.log('H90 AI Cloud v3.1 loading (secured)...');

  /* ================================================================
     ⚙️ Cloud State
     ================================================================ */
  const CLOUD = {
    /* ═══════════════════════════════════════════
       Worker Proxy — المفتاح في Worker (آمن)
       ═══════════════════════════════════════════ */
    proxyUrl: 'https://iutihdjif-igdjiffjid-iudfjudd-62684.x4storebot.workers.dev/',
    useProxy: true,

    /* ═══════════════════════════════════════════
       Direct API — معطّل (لأنه يحتاج مفتاح)
       ═══════════════════════════════════════════ */
    apiKey: 'SECURED_VIA_PROXY',  /* placeholder — لا يُستخدم */
    useDirectFallback: false,     /* معطّل — Worker يكفي */

    /* ═══════════════════════════════════════════ */
    models: [
      'gemini-3-flash-preview',
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-image',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest'
    ],
    currentModelIndex: 0,
    lastSuccessfulModel: null,
    modelFailCounts: {},
    maxModelFails: 2,

    /* Rate Limiting */
    requests: [],
    maxRequestsPerMinute: 15,
    maxRequestsPerDay: 500,
    dailyCount: 0,
    dailyReset: Date.now(),

    /* Cache */
    cache: new Map(),
    cacheMaxAge: 24 * 60 * 60 * 1000,

    /* State */
    enabled: true,
    initialized: false,
    lastError: null,
    isOnline: navigator.onLine,

    /* Stats */
    stats: {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      workerCalls: 0,
      workerSuccess: 0,
      workerFailed: 0,
      directCalls: 0,
      modelSwitches: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  };

  const CLOUD_SETTINGS_KEY = 'h90_ai_cloud_settings_v1';

  /* ================================================================
     💾 حفظ/استرجاع الإعدادات
     ================================================================ */
  function saveCloudSettings() {
    try {
      localStorage.setItem(CLOUD_SETTINGS_KEY, JSON.stringify({
        enabled: CLOUD.enabled,
        dailyCount: CLOUD.dailyCount,
        dailyReset: CLOUD.dailyReset
      }));
    } catch (e) {}
  }

  function loadCloudSettings() {
    try {
      const raw = localStorage.getItem(CLOUD_SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      CLOUD.enabled = data.enabled !== false;
      CLOUD.dailyCount = data.dailyCount || 0;
      CLOUD.dailyReset = data.dailyReset || Date.now();

      if (Date.now() - CLOUD.dailyReset > 24 * 60 * 60 * 1000) {
        CLOUD.dailyCount = 0;
        CLOUD.dailyReset = Date.now();
        saveCloudSettings();
      }
    } catch (e) {}
  }

  /* ================================================================
     🔄 إدارة الموديلات
     ================================================================ */
  function getCurrentModel() {
    return CLOUD.models[CLOUD.currentModelIndex] || CLOUD.models[0];
  }

  function switchToNextModel() {
    if (CLOUD.models.length < 2) return false;

    const currentModel = getCurrentModel();
    CLOUD.modelFailCounts[currentModel] = (CLOUD.modelFailCounts[currentModel] || 0) + 1;

    CLOUD.currentModelIndex = (CLOUD.currentModelIndex + 1) % CLOUD.models.length;

    let attempts = 0;
    while (CLOUD.modelFailCounts[getCurrentModel()] >= CLOUD.maxModelFails &&
           attempts < CLOUD.models.length) {
      CLOUD.currentModelIndex = (CLOUD.currentModelIndex + 1) % CLOUD.models.length;
      attempts++;
    }

    CLOUD.stats.modelSwitches++;
    console.log('[H90 Cloud] Switched to:', getCurrentModel());
    return true;
  }

  function markModelSuccess() {
    const model = getCurrentModel();
    CLOUD.modelFailCounts[model] = 0;
    CLOUD.lastSuccessfulModel = model;
  }

  /* ================================================================
     🚦 Rate Limiting
     ================================================================ */
  function checkRateLimit() {
    const now = Date.now();

    if (CLOUD.dailyCount >= CLOUD.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: 'daily_limit',
        message: 'تم استهلاك الحد اليومي. حاول لاحقاً.'
      };
    }

    CLOUD.requests = CLOUD.requests.filter(function (t) { return now - t < 60000; });

    if (CLOUD.requests.length >= CLOUD.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: 'minute_limit',
        message: 'انتظر قليلاً قبل الإرسال التالي',
        waitMs: 60000 - (now - CLOUD.requests[0])
      };
    }

    return { allowed: true };
  }

  function recordRequest() {
    CLOUD.requests.push(Date.now());
    CLOUD.dailyCount++;
    CLOUD.stats.totalCalls++;
    saveCloudSettings();
  }

  /* ================================================================
     💾 Cache
     ================================================================ */
  function getCacheKey(query, imageHash) {
    const str = (query || '') + '|' + (imageHash || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'cloud_' + Math.abs(hash).toString(36);
  }

  function getCached(key) {
    const entry = CLOUD.cache.get(key);
    if (!entry) {
      CLOUD.stats.cacheMisses++;
      return null;
    }
    if (Date.now() - entry.timestamp > CLOUD.cacheMaxAge) {
      CLOUD.cache.delete(key);
      CLOUD.stats.cacheMisses++;
      return null;
    }
    CLOUD.stats.cacheHits++;
    return entry.value;
  }

  function setCache(key, value) {
    CLOUD.cache.set(key, { value: value, timestamp: Date.now() });
    if (CLOUD.cache.size > 100) {
      const firstKey = CLOUD.cache.keys().next().value;
      CLOUD.cache.delete(firstKey);
    }
  }

  /* ================================================================
     🌐 Network Status
     ================================================================ */
  window.addEventListener('online', function () {
    CLOUD.isOnline = true;
    console.log('[H90 Cloud] Online');
  });

  window.addEventListener('offline', function () {
    CLOUD.isOnline = false;
    console.log('[H90 Cloud] Offline');
  });

  /* ================================================================
     📸 Image to Base64
     ================================================================ */
  async function imageToBase64(imageSource) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof imageSource === 'string') {
          if (imageSource.startsWith('data:')) {
            const parts = imageSource.split(',');
            const mimeMatch = parts[0].match(/data:([^;]+);/);
            resolve({
              data: parts[1],
              mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg'
            });
            return;
          }

          fetch(imageSource)
            .then(function (res) { return res.blob(); })
            .then(function (blob) {
              const reader = new FileReader();
              reader.onloadend = function () {
                const parts = reader.result.split(',');
                resolve({
                  data: parts[1],
                  mimeType: blob.type || 'image/jpeg'
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
            .catch(reject);
          return;
        }

        if (imageSource instanceof File || imageSource instanceof Blob) {
          if (imageSource.size > 5 * 1024 * 1024) {
            reject(new Error('الصورة كبيرة جداً (5MB كحد أقصى)'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = function () {
            const parts = reader.result.split(',');
            resolve({
              data: parts[1],
              mimeType: imageSource.type || 'image/jpeg'
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageSource);
          return;
        }

        reject(new Error('نوع الصورة غير مدعوم'));
      } catch (e) {
        reject(e);
      }
    });
  }

  /* ================================================================
     🌐 Worker Call — الطريقة الوحيدة الآن
     ================================================================ */
  async function callViaWorker(query, imageData, options) {
    console.log('[H90 Cloud] → Worker');
    console.log('  query:', query ? query.substring(0, 50) : 'none');
    console.log('  hasImage:', !!imageData);

    CLOUD.stats.workerCalls++;

    const workerPayload = {};

    if (query) {
      workerPayload.query = query;
      workerPayload.text = query;
    }

    if (imageData && imageData.data) {
      workerPayload.image = {
        mimeType: imageData.mimeType || 'image/jpeg',
        data: imageData.data
      };

      if (!query) {
        workerPayload.query = 'حلل هذه الصورة وساعدني في فهم المشكلة المتعلقة بتطبيق H90.';
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(function () {
      console.log('[H90 Cloud] Worker TIMEOUT — aborting');
      controller.abort();
    }, 90000);

    try {
      const response = await fetch(CLOUD.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workerPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      console.log('[H90 Cloud] Worker status:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[H90 Cloud] Worker error:', response.status, errText.substring(0, 200));
        CLOUD.stats.workerFailed++;
        throw new Error('Worker HTTP ' + response.status);
      }

      const data = await response.json();
      console.log('[H90 Cloud] Worker data:', JSON.stringify(data).substring(0, 150));

      if (!data.success) {
        CLOUD.stats.workerFailed++;
        throw new Error(data.error || 'Worker returned failure');
      }

      CLOUD.stats.workerSuccess++;
      markModelSuccess();

      return {
        success: true,
        answer: data.answer,
        model: data.model || 'worker',
        usage: data.usage || null,
        source: 'worker'
      };

    } catch (e) {
      clearTimeout(timeout);
      CLOUD.stats.workerFailed++;
      console.error('[H90 Cloud] Worker failed:', e.name, e.message);
      throw e;
    }
  }

  /* ================================================================
     🎯 Main API Call
     ================================================================ */
  async function callCloudAPI(query, imageData, options) {
    options = options || {};

    if (!CLOUD.isOnline) {
      throw new Error('لا يوجد اتصال بالإنترنت');
    }

    if (!CLOUD.enabled) {
      throw new Error('الخدمة السحابية معطلة');
    }

    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.message);
    }

    /* ✅ المسار الوحيد: Worker */
    if (CLOUD.proxyUrl) {
      try {
        const result = await callViaWorker(query, imageData, options);
        recordRequest();
        CLOUD.stats.successfulCalls++;
        return result;
      } catch (workerError) {
        console.warn('[H90 Cloud] Worker failed:', workerError.message);
        recordRequest();
        CLOUD.stats.failedCalls++;
        throw new Error('فشل الاتصال بالخدمة. تحقق من الإنترنت.');
      }
    }

    throw new Error('لا توجد طريقة اتصال متاحة');
  }

  /* ================================================================
     🎯 Public API — Ask Text
     ================================================================ */
  async function askCloud(query, options) {
    options = options || {};

    if (!query || typeof query !== 'string') {
      throw new Error('السؤال مطلوب');
    }

    const cacheKey = getCacheKey(query);
    const cached = getCached(cacheKey);
    if (cached && !options.noCache) {
      console.log('[H90 Cloud] Cache hit');
      return cached;
    }

    const result = await callCloudAPI(query.trim(), null, options);
    setCache(cacheKey, result);
    return result;
  }

  /* ================================================================
     🎯 Public API — Analyze Image
     ================================================================ */
  async function analyzeImage(imageSource, question, options) {
    options = options || {};

    if (!imageSource) {
      throw new Error('الصورة مطلوبة');
    }

    const imageData = await imageToBase64(imageSource);

    const sizeInBytes = (imageData.data.length * 3) / 4;
    if (sizeInBytes > 5 * 1024 * 1024) {
      throw new Error('الصورة كبيرة جداً (5MB كحد أقصى)');
    }

    const finalQuery = question || 'حلل هذه الصورة ووضح المشكلة المتعلقة بتطبيق H90.';

    const cacheKey = getCacheKey(finalQuery, imageData.data.substring(0, 100));
    const cached = getCached(cacheKey);
    if (cached && !options.noCache) {
      console.log('[H90 Cloud] Image cache hit');
      return cached;
    }

    const result = await callCloudAPI(finalQuery, imageData, options);
    setCache(cacheKey, result);
    return result;
  }

  /* ================================================================
     📸 Screenshot Helper
     ================================================================ */
  async function captureScreen() {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: false
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        await new Promise(function (r) { setTimeout(r, 300); });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        stream.getTracks().forEach(function (track) { track.stop(); });

        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) {
            resolve(blob);
          }, 'image/jpeg', 0.85);
        });
      } catch (e) {
        console.warn('[H90 Cloud] getDisplayMedia failed:', e);
      }
    }

    if (typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(document.body);
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) {
            resolve(blob);
          }, 'image/jpeg', 0.85);
        });
      } catch (e) {
        console.warn('[H90 Cloud] html2canvas failed:', e);
      }
    }

    throw new Error('لا يمكن التقاط الشاشة');
  }

  /* ================================================================
     💡 Smart Fallback
     ================================================================ */
  async function smartFallback(query, localResult) {
    if (localResult && localResult.type === 'success' && localResult.confidence > 50) {
      return localResult;
    }

    if (!query || query.trim().length < 4) {
      return localResult;
    }

    if (localResult && (localResult.type === 'greeting' || localResult.type === 'learned')) {
      return localResult;
    }

    try {
      const cloudResult = await askCloud(query);

      if (cloudResult.success && cloudResult.answer) {
        return {
          type: 'cloud',
          answer: cloudResult.answer,
          category: 'مساعد سحابي',
          source: cloudResult.source || 'cloud',
          model: cloudResult.model
        };
      }
    } catch (e) {
      console.warn('[H90 Cloud] Fallback failed:', e.message);
    }

    return localResult;
  }

  /* ================================================================
     ⚙️ Settings API
     ================================================================ */
  function setProxy(url) {
    if (!url || typeof url !== 'string') return false;
    CLOUD.proxyUrl = url.trim();
    CLOUD.useProxy = true;
    saveCloudSettings();
    return true;
  }

  function setEnabled(enabled) {
    CLOUD.enabled = !!enabled;
    saveCloudSettings();
  }

  /* ================================================================
     🌐 API عام
     ================================================================ */
  window.H90AICloud = {
    ask: askCloud,
    analyzeImage: analyzeImage,
    smartFallback: smartFallback,
    captureScreen: captureScreen,

    setProxy: setProxy,
    setEnabled: setEnabled,
    isEnabled: function () { return CLOUD.enabled; },
    isOnline: function () { return CLOUD.isOnline; },

    getProxyUrl: function () { return CLOUD.proxyUrl; },
    getCurrentModel: getCurrentModel,
    getAllModels: function () { return CLOUD.models.slice(); },

    getRateLimitInfo: function () {
      return {
        usedToday: CLOUD.dailyCount,
        maxToday: CLOUD.maxRequestsPerDay,
        usedThisMinute: CLOUD.requests.filter(function (t) {
          return Date.now() - t < 60000;
        }).length,
        maxPerMinute: CLOUD.maxRequestsPerMinute,
        resetAt: new Date(CLOUD.dailyReset + 24 * 60 * 60 * 1000)
      };
    },

    clearCache: function () {
      CLOUD.cache.clear();
      CLOUD.stats.cacheHits = 0;
      CLOUD.stats.cacheMisses = 0;
      console.log('[H90 Cloud] Cache cleared');
    },

    getCacheSize: function () {
      return CLOUD.cache.size;
    },

    resetDaily: function () {
      CLOUD.dailyCount = 0;
      CLOUD.dailyReset = Date.now();
      saveCloudSettings();
    },

    stats: function () {
      return {
        version: '3.1',
        enabled: CLOUD.enabled,
        isOnline: CLOUD.isOnline,
        useProxy: CLOUD.useProxy,
        hasProxy: !!CLOUD.proxyUrl,
        proxyUrl: CLOUD.proxyUrl,
        directFallback: CLOUD.useDirectFallback,
        hasApiKey: false,
        cacheSize: CLOUD.cache.size,
        dailyCount: CLOUD.dailyCount,
        maxDaily: CLOUD.maxRequestsPerDay,
        lastError: CLOUD.lastError,
        stats: Object.assign({}, CLOUD.stats),
        ready: CLOUD.initialized
      };
    },

    testConnection: async function () {
      try {
        const result = await callViaWorker('قل مرحبا فقط', null, {});
        return {
          success: true,
          answer: result.answer,
          model: result.model,
          source: result.source
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    },

    testImage: async function () {
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      try {
        const result = await analyzeImage(testImage, 'ما هذا؟');
        return { success: true, answer: result.answer, model: result.model, source: result.source };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  };

  /* ================================================================
     🚀 التشغيل
     ================================================================ */
  loadCloudSettings();

  /* فرض Worker دائماً */
  CLOUD.useProxy = true;
  CLOUD.proxyUrl = 'https://iutihdjif-igdjiffjid-iudfjudd-62684.x4storebot.workers.dev/';

  CLOUD.initialized = true;

  console.log('%cH90 AI Cloud v3.1 Ready (SECURED)',
    'background:linear-gradient(135deg,#4285f4,#34a853);color:#fff;padding:4px 12px;border-radius:6px;font-weight:900;');
  console.log('  API Key: ❌ NOT IN SOURCE (secured via Worker)');
  console.log('  Worker:', CLOUD.proxyUrl ? '✅ ENABLED' : '❌');
  console.log('  Direct Fallback:', CLOUD.useDirectFallback ? 'ON' : 'OFF');
  console.log('  Max/day:', CLOUD.maxRequestsPerDay);

})();
