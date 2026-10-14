/* ================================================================
   H90 — Series API Module (series-api.js) v12.0 (Full Cache + Progressive)
   ================================================================
   ✅ تشفير AES-256-GCM لكل البيانات
   ✅ IndexedDB (SecureDB) بدل localStorage
   ✅ Progressive Loading (1000 مسلسل/دفعة)
   ✅ 26 تصنيف كامل
   ✅ جلب الحلقات مع Token
   ✅ Image Proxy
   ✅ Cache الحلقات مشفّر
   ----------------------------------------------------------------
   🔧 v12.0:
   ✅ MAX_CACHE_SERIES = 100000 (بدل 800)
   ✅ عرض Cache الكامل بدون تقطيع
   ================================================================ */

'use strict';

const SeriesAPI = (function () {

  /* ================================================================
     ⚙️ الإعدادات
     ================================================================ */
  const CONFIG = {
    WORKER_URL: 'https://idjdhdhdhhdueugxbsksigckdhsg.dairalzor33.workers.dev',
    XTREAM_HOST: 'http://vip2.sharkhost.xyz',
    MIN_YEAR: 2000,
    MIN_RATING: 6.5,
    CACHE_HOURS: 24,
    MAX_CACHE_SERIES: 100000,
    TIMEOUT_MS: 120000,
    TOKEN_TTL: 14400,
    BATCH_SIZE: 1000,
    BATCH_DELAY_MS: 50
  };

  /* ================================================================
     🖼️ Image Proxy
     ================================================================ */
  const IMG_PROXY = {
    WORKER: CONFIG.WORKER_URL + '/proxy/image?url=',
    WESERV: 'https://images.weserv.nl/?url=',
    STATICALLY: 'https://cdn.statically.io/img/',
    ENABLED: true,
    TYPE: 'weserv',
    DEFAULT_WIDTH: 300
  };

  /* ================================================================
     🔐 بيانات الاشتراك — من Shards Assembler
     ================================================================ */
  function getCredentials() {
    try {
      if (window.__H90_Assembler__ && typeof window.__H90_Assembler__.get === 'function') {
        var assembled = window.__H90_Assembler__.get();
        if (assembled && assembled.u && assembled.p) {
          return { u: assembled.u, p: assembled.p };
        }
      }
      if (window.__H90_SEC__ && typeof window.__H90_SEC__.c === 'function') {
        return window.__H90_SEC__.c();
      }
    } catch (e) {
      console.warn('⚠️ [Series] فشل الحصول على السر');
    }
    return { u: '', p: '' };
  }

  /* ================================================================
     🏷️ التصنيفات (26 تصنيف)
     ================================================================ */
  const CATEGORIES = {
    '224': { name: 'رمضان 2026', icon: 'calendar', color: '#ffb300', group: 'special' },
    '257': { name: 'Top 50', icon: 'star', color: '#ffb300', group: 'special' },
    '197': { name: 'Shahid', icon: 'tv', color: '#00e5ff', group: 'platform' },
    '212': { name: 'Netflix', icon: 'tv', color: '#e53935', group: 'platform' },
    '219': { name: 'Amazon', icon: 'tv', color: '#00e5ff', group: 'platform' },
    '221': { name: 'HBO', icon: 'tv', color: '#9c27b0', group: 'platform' },
    '218': { name: 'Apple TV+', icon: 'tv', color: '#ffffff', group: 'platform' },
    '220': { name: 'Disney+', icon: 'tv', color: '#0091ea', group: 'platform' },
    '232': { name: 'Hulu', icon: 'tv', color: '#00e676', group: 'platform' },
    '191': { name: 'وثائقي', icon: 'info', color: '#00e5ff', group: 'genre' },
    '202': { name: 'هندية', icon: 'film', color: '#ffb300', group: 'genre' },
    '190': { name: 'آسيوي', icon: 'film', color: '#e91e63', group: 'genre' },
    '196': { name: 'أنمي', icon: 'anime', color: '#e91e63', group: 'genre' },
    '223': { name: 'كرتون زمن الطيبين', icon: 'play', color: '#ffb300', group: 'kids' },
    '222': { name: 'كرتون مترجم', icon: 'play', color: '#00e5ff', group: 'kids' },
    '176': { name: 'كرتون مدبلج', icon: 'play', color: '#00e676', group: 'kids' },
    '187': { name: 'تركي مترجم', icon: 'film', color: '#e53935', group: 'turkish' },
    '188': { name: 'تركي مدبلج', icon: 'film', color: '#ff6b35', group: 'turkish' },
    '194': { name: 'برامج ومسابقات', icon: 'newspaper', color: '#9c27b0', group: 'show' },
    '174': { name: 'خليجي', icon: 'film', color: '#00b248', group: 'arabic' },
    '175': { name: 'مصري', icon: 'film', color: '#ffb300', group: 'arabic' },
    '173': { name: 'سوري', icon: 'film', color: '#e53935', group: 'arabic' },
    '189': { name: 'لبناني', icon: 'film', color: '#00e5ff', group: 'arabic' },
    '216': { name: 'المغرب وتونس', icon: 'film', color: '#00b248', group: 'arabic' },
    '215': { name: 'أردنية', icon: 'film', color: '#ff6b35', group: 'arabic' },
    '210': { name: 'بدوي وتاريخي', icon: 'film', color: '#ffb300', group: 'arabic' }
  };

  /* ================================================================
     🗄️ SecureDB Keys
     ================================================================ */
  const SECURE_KEYS = {
    ALL_SERIES: 'h90_series_secure_v12',
    TIMESTAMP: 'h90_series_ts_v12',
    INFO_PREFIX: 'h90_series_info_v12_'
  };

  /* ================================================================
     🛠️ أدوات
     ================================================================ */
  function log(...args) {
    console.log('%c📺 [Series]', 'color:#00e5ff;font-weight:900;', ...args);
  }

  function warn(...args) {
    console.warn('%c⚠️ [Series]', 'color:#ffb300;font-weight:900;', ...args);
  }

  function error(...args) {
    console.error('%c❌ [Series]', 'color:#ff2d55;font-weight:900;', ...args);
  }

  function extractYear(name) {
    if (!name) return 0;
    const match = String(name).match(/\((\d{4})\)/);
    if (match) return parseInt(match[1], 10);
    return 0;
  }

  function parseRating(rating) {
    if (rating === null || rating === undefined || rating === '') return 0;
    const r = parseFloat(rating);
    return isNaN(r) ? 0 : r;
  }

  function cleanName(name) {
    if (!name) return '';
    return String(name)
      .replace(/\s*\(?\d{4}\)?/g, '')
      .replace(/\s*(4K|UHD|FHD|HD|SD|HEVC|H\.?265|H\.?264)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanImageUrl(url) {
    if (!url) return '';
    if (url.includes('_big.jpg') && url.length < 60) return '';
    return url.replace(/\\/g, '');
  }

  /* ================================================================
     🖼️ Image Proxy
     ================================================================ */
  function proxyImage(url, size) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('./')) return url;
    if (!url.startsWith('http')) return url;

    const width = size || IMG_PROXY.DEFAULT_WIDTH;
    const sizeParam = '&w=' + width;

    if (IMG_PROXY.ENABLED) {
      switch (IMG_PROXY.TYPE) {
        case 'worker':
          return IMG_PROXY.WORKER + encodeURIComponent(url) + sizeParam;
        case 'weserv':
          return IMG_PROXY.WESERV + encodeURIComponent(url.replace(/^https?:\/\//, '')) + sizeParam;
        case 'statically':
          return IMG_PROXY.STATICALLY + url.replace(/^https?:\/\//, '') + '?w=' + width;
        default:
          return url;
      }
    }
    return url;
  }

  function getFallbackImageUrl(url) {
    if (!url) return '';
    if (url.includes('weserv.nl')) {
      try {
        const original = decodeURIComponent(url.split('url=')[1].split('&')[0]);
        return IMG_PROXY.STATICALLY + original + '?w=300';
      } catch (e) {
        return url;
      }
    }
    if (url.startsWith('http')) {
      return IMG_PROXY.WESERV + encodeURIComponent(url.replace(/^https?:\/\//, '')) + '&w=300';
    }
    return url;
  }

  /* ================================================================
     🌐 HTTP
     ================================================================ */
  async function httpGet(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || CONFIG.TIMEOUT_MS);

    try {
      log('🌐 Fetching:', url.substring(0, 120) + '...');

      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      log('✅ Response:', res.status);

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        error('استجابة غير JSON:', text.substring(0, 100));
        throw new Error('استجابة API غير صالحة');
      }

      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') throw new Error('انتهت المهلة');
      throw e;
    }
  }

  /* ================================================================
     🎯 طلب Token من Worker
     ================================================================ */
  async function requestToken(type, id, ext) {
    log('🔐 طلب Token:', type, id, ext);

    try {
      const res = await fetch(CONFIG.WORKER_URL + '/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, ext: ext || 'mp4' })
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      log('✅ Token مُولّد');
      return data;
    } catch (e) {
      error('فشل Token:', e.message);
      return null;
    }
  }

  /* ================================================================
     🔗 بناء روابط API
     ================================================================ */
  function buildApiUrl(action, extra) {
    const creds = getCredentials();
    let url = CONFIG.XTREAM_HOST + '/player_api.php' +
      '?username=' + encodeURIComponent(creds.u) +
      '&password=' + encodeURIComponent(creds.p) +
      '&action=' + action;
    if (extra) url += extra;
    return url;
  }

  /* ================================================================
     🎬 توليد رابط الحلقة
     ================================================================ */
  async function buildStreamUrl(episodeId, ext) {
    const tokenData = await requestToken('series', episodeId, ext || 'mp4');

    if (!tokenData || !tokenData.url) {
      warn('فشل Token — استخدام رابط مباشر');
      const creds = getCredentials();
      return CONFIG.XTREAM_HOST + '/series/' +
        encodeURIComponent(creds.u) + '/' +
        encodeURIComponent(creds.p) + '/' +
        episodeId + '.' + (ext || 'mp4');
    }

    return tokenData.url;
  }

  /* ================================================================
     🗄️ Cache — يستخدم SecureDB
     ================================================================ */
  async function isCacheValid() {
    try {
      var db = window.H90SecureDB;
      if (!db) return false;

      var ts = await db.get(SECURE_KEYS.TIMESTAMP);
      if (!ts || !ts.time) return false;

      var hours = (Date.now() - ts.time) / (1000 * 60 * 60);
      return hours < CONFIG.CACHE_HOURS;
    } catch (e) {
      return false;
    }
  }

  async function readCache() {
    try {
      var db = window.H90SecureDB;
      if (!db) {
        warn('SecureDB غير متاح');
        return null;
      }

      var data = await db.get(SECURE_KEYS.ALL_SERIES);
      if (data && data.series) {
        log('💾 من SecureDB:', data.series.length, 'مسلسل');
        return data.series;
      }
      return null;
    } catch (e) {
      error('فشل قراءة Cache:', e.message);
      return null;
    }
  }

  async function writeCache(series) {
    try {
      var db = window.H90SecureDB;
      if (!db) {
        warn('SecureDB غير متاح');
        return false;
      }

      /* ✅ v12.0: حفظ كل المسلسلات بدون حد أقصى */
      var maxSeries = CONFIG.MAX_CACHE_SERIES || 100000;
      var toCache = series.length > maxSeries ? series.slice(0, maxSeries) : series;

      await db.set(SECURE_KEYS.ALL_SERIES, { series: toCache });
      await db.set(SECURE_KEYS.TIMESTAMP, { time: Date.now() });

      log('🔐 تم حفظ Cache مشفّر:', toCache.length, 'مسلسل');
      return true;
    } catch (e) {
      error('فشل حفظ Cache:', e.message);
      return false;
    }
  }

  async function saveInfoCache(seriesId, info) {
    try {
      var db = window.H90SecureDB;
      if (!db) return false;

      await db.set(SECURE_KEYS.INFO_PREFIX + seriesId, {
        data: info,
        timestamp: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function readInfoCache(seriesId) {
    try {
      var db = window.H90SecureDB;
      if (!db) return null;

      var cached = await db.get(SECURE_KEYS.INFO_PREFIX + seriesId);
      if (!cached || !cached.data) return null;

      var hoursPassed = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
      if (hoursPassed > CONFIG.CACHE_HOURS) return null;

      return cached.data;
    } catch (e) {
      return null;
    }
  }

  async function clearCache() {
    try {
      var db = window.H90SecureDB;
      if (!db) return false;

      await db.delete(SECURE_KEYS.ALL_SERIES);
      await db.delete(SECURE_KEYS.TIMESTAMP);

      log('🗑️ تم مسح Cache');
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ================================================================
     🎯 فلترة
     ================================================================ */
  function shouldIncludeSeries(s) {
    if (!s || !s.name) return false;
    if (s.is_adult === '1' || s.is_adult === 1) return false;
    const year = extractYear(s.name);
    if (year > 0 && year < CONFIG.MIN_YEAR) return false;
    return true;
  }

  function normalizeSeries(raw) {
    const year = extractYear(raw.name);
    const rating = parseRating(raw.rating);
    const cleanTitle = cleanName(raw.name);
    const catId = String(raw.category_id || '');

    const rawPoster = cleanImageUrl(raw.cover);
    const proxiedPoster = proxyImage(rawPoster, 300);

    const rawBackdrop = cleanImageUrl(
      raw.backdrop_path && raw.backdrop_path[0] ? raw.backdrop_path[0] : ''
    );
    const proxiedBackdrop = rawBackdrop ? proxyImage(rawBackdrop, 800) : '';

    return {
      id: raw.series_id,
      name: raw.name,
      title: cleanTitle || raw.name,
      year: year,
      rating: rating,
      rating5: raw.rating_5based || 0,
      poster: proxiedPoster,
      originalPoster: rawPoster,
      categoryId: catId,
      categoryName: CATEGORIES[catId] ? CATEGORIES[catId].name : 'مسلسل',
      plot: raw.plot || '',
      cast: raw.cast || '',
      director: raw.director || '',
      genre: raw.genre || '',
      releaseDate: raw.releaseDate || '',
      lastModified: raw.last_modified || '',
      addedAt: parseInt(raw.last_modified || '0', 10) || Date.now(),
      episodeRunTime: raw.episode_run_time || '',
      backdrop: proxiedBackdrop,
      originalBackdrop: rawBackdrop,
      youtubeTrailer: raw.youtube_trailer || ''
    };
  }

  /* ================================================================
     📡 جلب المسلسلات
     ================================================================ */
  async function fetchAllSeriesFromApi() {
    log('📡 جلب المسلسلات من السيرفر...');
    const url = buildApiUrl('get_series');

    const raw = await httpGet(url, CONFIG.TIMEOUT_MS);

    if (!Array.isArray(raw)) {
      throw new Error('استجابة API غير صالحة');
    }

    log('📥 تم جلب', raw.length, 'مسلسل');

    const filtered = [];
    for (const item of raw) {
      if (shouldIncludeSeries(item)) {
        filtered.push(normalizeSeries(item));
      }
    }

    log('✅ بعد الفلترة:', filtered.length);
    return filtered;
  }

  /* ================================================================
     📦 التحميل الرئيسي
     ================================================================ */
  let _loadingPromise = null;

  async function loadSeries(forceReload) {
    if (_loadingPromise) {
      log('⏳ تحميل جارٍ');
      return _loadingPromise;
    }

    if (!forceReload && await isCacheValid()) {
      const cached = await readCache();
      if (cached && cached.length > 0) {
        log('💾 من Cache:', cached.length);
        return cached;
      }
    }

    _loadingPromise = (async () => {
      try {
        const series = await fetchAllSeriesFromApi();
        await writeCache(series);
        return series;
      } catch (e) {
        error('فشل التحميل:', e.message);
        const cached = await readCache();
        if (cached && cached.length > 0) {
          warn('🔄 من Cache القديم');
          return cached;
        }
        return [];
      } finally {
        _loadingPromise = null;
      }
    })();

    return _loadingPromise;
  }

  /* ================================================================
     ⚡ Progressive Loading — v12.0 محسّن
     ================================================================ */
  let _progressiveState = {
    isLoading: false,
    total: 0,
    delivered: 0,
    batches: 0,
    startTime: 0
  };

  async function loadSeriesProgressively(onBatch, forceReload) {
    if (_progressiveState.isLoading) {
      warn('⚠️ تحميل تدريجي جارٍ');
      return _loadingPromise || [];
    }

    _progressiveState.isLoading = true;
    _progressiveState.startTime = Date.now();
    _progressiveState.delivered = 0;
    _progressiveState.batches = 0;

    try {
      /* ✅ v12.0: من Cache — عرض كل المسلسلات دفعة واحدة */
      if (!forceReload && await isCacheValid()) {
        const cached = await readCache();
        if (cached && cached.length > 0) {
          log('💾 [Progressive] من Cache:', cached.length);

          if (typeof onBatch === 'function') {
            try {
              onBatch(cached, {
                batch: cached.length,
                batchIndex: 0,
                totalBatches: 1,
                delivered: cached.length,
                total: cached.length,
                isComplete: true,
                fromCache: true
              });
            } catch (cbErr) {}
          }

          _progressiveState.isLoading = false;
          _progressiveState.total = cached.length;
          _progressiveState.delivered = cached.length;
          return cached;
        }
      }

      log('📡 [Progressive] جلب من السيرفر...');
      const allSeries = await fetchAllSeriesFromApi();

      _progressiveState.total = allSeries.length;
      await writeCache(allSeries);

      const BATCH_SIZE = CONFIG.BATCH_SIZE;
      const totalBatches = Math.ceil(allSeries.length / BATCH_SIZE);

      log('📦 [Progressive] تقسيم', allSeries.length, 'على', totalBatches, 'دفعة');

      for (let i = 0; i < allSeries.length; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, allSeries.length);
        const batchSoFar = allSeries.slice(0, batchEnd);
        const batchIndex = Math.floor(i / BATCH_SIZE);

        _progressiveState.delivered = batchEnd;
        _progressiveState.batches = batchIndex + 1;

        if (typeof onBatch === 'function') {
          try {
            onBatch(batchSoFar, {
              batch: batchEnd - i,
              batchIndex: batchIndex,
              totalBatches: totalBatches,
              delivered: batchEnd,
              total: allSeries.length,
              isComplete: batchEnd >= allSeries.length,
              fromCache: false
            });
          } catch (cbErr) {}
        }

        if (batchEnd < allSeries.length) {
          await new Promise(r => setTimeout(r, CONFIG.BATCH_DELAY_MS));
        }
      }

      const elapsed = Date.now() - _progressiveState.startTime;
      log('✅ [Progressive] انتهى —', allSeries.length, 'مسلسل في', elapsed + 'ms');

      _progressiveState.isLoading = false;
      return allSeries;

    } catch (e) {
      error('❌ [Progressive] فشل:', e.message);
      _progressiveState.isLoading = false;

      const cached = await readCache();
      if (cached && cached.length > 0) {
        if (typeof onBatch === 'function') {
          try {
            onBatch(cached, {
              batch: cached.length,
              batchIndex: 0,
              totalBatches: 1,
              delivered: cached.length,
              total: cached.length,
              isComplete: true,
              fromCache: true,
              hadError: true
            });
          } catch (cbErr) {}
        }
        return cached;
      }
      return [];
    }
  }

  function isProgressivelyLoading() {
    return _progressiveState.isLoading;
  }

  function getProgressStatus() {
    return {
      isLoading: _progressiveState.isLoading,
      delivered: _progressiveState.delivered,
      total: _progressiveState.total,
      batches: _progressiveState.batches,
      percent: _progressiveState.total > 0
        ? Math.round((_progressiveState.delivered / _progressiveState.total) * 100)
        : 0,
      elapsedMs: _progressiveState.startTime > 0
        ? Date.now() - _progressiveState.startTime
        : 0
    };
  }

  /* ================================================================
     📺 جلب معلومات مسلسل (الحلقات)
     ================================================================ */
  async function getSeriesInfo(seriesId) {
    log('📥 جلب معلومات المسلسل:', seriesId);

    const cached = await readInfoCache(seriesId);
    if (cached) {
      log('💾 من Cache الحلقات');
      return cached;
    }

    try {
      const url = buildApiUrl('get_series_info', '&series_id=' + seriesId);
      const data = await httpGet(url, 30000);

      if (!data) {
        warn('استجابة فارغة');
        return { episodes: {}, info: {}, seasons: [] };
      }

      const episodes = data.episodes || {};
      const info = data.info || {};

      const seasons = Object.keys(episodes).sort(function (a, b) {
        return parseInt(a) - parseInt(b);
      });

      log('✅ تم جلب', seasons.length, 'موسم');

      const result = { info, episodes, seasons };
      await saveInfoCache(seriesId, result);
      return result;

    } catch (e) {
      error('فشل جلب معلومات المسلسل:', e.message);
      return { episodes: {}, info: {}, seasons: [], error: e.message };
    }
  }

  /* ================================================================
     📊 فلاتر
     ================================================================ */
  function filterByCategory(series, categoryId) {
    if (!categoryId) return series;
    return series.filter(s => String(s.categoryId) === String(categoryId));
  }

  function getTrending(series, limit) {
    return [...series].sort((a, b) => {
      const scoreA = a.rating * 10 + (a.year >= 2023 ? 20 : a.year >= 2020 ? 10 : 0);
      const scoreB = b.rating * 10 + (b.year >= 2023 ? 20 : b.year >= 2020 ? 10 : 0);
      return scoreB - scoreA;
    }).slice(0, limit || 20);
  }

  function getTopRated(series, limit) {
    return [...series]
      .filter(s => s.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit || 20);
  }

  function getRecentlyAdded(series, limit) {
    return [...series]
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, limit || 20);
  }

  function getNewReleases(series, limit) {
    return [...series]
      .filter(s => s.year >= 2023)
      .sort((a, b) => b.year - a.year || b.rating - a.rating)
      .slice(0, limit || 20);
  }

  function search(series, query, limit) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return series
      .filter(s => s.title.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit || 50);
  }

  /* ================================================================
     🎯 تصنيفات مميزة
     ================================================================ */
  function getFeaturedGroups(series) {
    return {
      ramadan: filterByCategory(series, '224'),
      top50: filterByCategory(series, '257'),
      netflix: filterByCategory(series, '212'),
      shahid: filterByCategory(series, '197'),
      amazon: filterByCategory(series, '219'),
      hbo: filterByCategory(series, '221'),
      apple: filterByCategory(series, '218'),
      disney: filterByCategory(series, '220'),
      hulu: filterByCategory(series, '232'),
      turkish: [
        ...filterByCategory(series, '187'),
        ...filterByCategory(series, '188')
      ],
      anime: filterByCategory(series, '196'),
      asian: filterByCategory(series, '190'),
      indian: filterByCategory(series, '202'),
      documentary: filterByCategory(series, '191'),
      kids: [
        ...filterByCategory(series, '223'),
        ...filterByCategory(series, '222'),
        ...filterByCategory(series, '176')
      ],
      tv: filterByCategory(series, '194'),
      gulf: filterByCategory(series, '174'),
      egypt: filterByCategory(series, '175'),
      syria: filterByCategory(series, '173'),
      lebanon: filterByCategory(series, '189'),
      morocco: filterByCategory(series, '216'),
      jordan: filterByCategory(series, '215'),
      history: filterByCategory(series, '210')
    };
  }

  /* ================================================================
     🧪 اختبار
     ================================================================ */
  async function testConnection() {
    console.log('%c🧪 [Series] اختبار...', 'color:#00e5ff;font-weight:900;');

    const results = { version: '12.0' };

    try {
      if (window.__H90_SEC__) {
        const c = getCredentials();
        results.credentials = { ok: true, hasUser: !!c.u, hasPass: !!c.p };
      }
    } catch (e) {
      results.credentials = { ok: false };
    }

    try {
      const url = buildApiUrl('get_series');
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      const data = await res.json();
      results.api = { ok: true, count: data.length };
      console.log('✅ API يعمل — عدد المسلسلات:', data.length);
    } catch (e) {
      results.api = { ok: false, error: e.message };
    }

    try {
      const tokenData = await requestToken('series', 1523708, 'mp4');
      if (tokenData && tokenData.url) {
        results.token = { ok: true };
      }
    } catch (e) {
      results.token = { ok: false };
    }

    try {
      results.secureDB = {
        available: !!window.H90SecureDB,
        crypto: !!window.H90Crypto
      };
    } catch (e) {}

    console.log('📊 النتيجة:', results);
    return results;
  }

  /* ================================================================
     🌐 API عام
     ================================================================ */
  return {
    loadSeries,
    loadSeriesProgressively,
    isProgressivelyLoading,
    getProgressStatus,
    clearCache,
    isCacheValid,
    getSeriesInfo,

    getTrending, getTopRated, getRecentlyAdded, getNewReleases,
    filterByCategory, getFeaturedGroups, search,

    extractYear, cleanName, buildStreamUrl, getCredentials,
    CATEGORIES, CONFIG,

    proxyImage,
    getFallbackImageUrl,
    IMG_PROXY,

    testConnection,

    getStatus: function () {
      return {
        version: '12.0',
        securityAvailable: !!window.__H90_SEC__,
        secureDBAvailable: !!window.H90SecureDB,
        cryptoAvailable: !!window.H90Crypto,
        shardsReady: window.__H90_Assembler__ ? window.__H90_Assembler__.isReady() : false,
        categoriesCount: Object.keys(CATEGORIES).length,
        proxyEnabled: IMG_PROXY.ENABLED,
        proxyType: IMG_PROXY.TYPE,
        progressiveSupported: true,
        progressiveBatchSize: CONFIG.BATCH_SIZE,
        maxCacheSeries: CONFIG.MAX_CACHE_SERIES
      };
    }
  };

})();

window.SeriesAPI = SeriesAPI;

console.log('%c📺 H90 — Series API v12.0 (Full Cache + Progressive + Encrypted) Loaded',
  'background:linear-gradient(135deg,#00e5ff,#9c27b0);color:#fff;padding:5px 12px;border-radius:8px;font-weight:900;font-size:11px;');