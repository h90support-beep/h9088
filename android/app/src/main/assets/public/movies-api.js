/* ================================================================
   H90 — Movies API v9.2 (Full Fetch + Categories + No Strict Filter)
   ================================================================
   ✅ جلب كامل للأفلام من جميع التصنيفات
   ✅ إزالة التكرار
   ✅ إلغاء الفلترة القاسية (السنة والتقييم)
   ✅ تشفير AES-256-GCM لكل البيانات
   ✅ IndexedDB (SecureDB) بدل localStorage
   ✅ Progressive Loading (1000 فيلم/دفعة)
   ✅ Image Proxy (weserv.nl)
   ✅ تشغيل الأفلام في H90MoviesPlayer
   ----------------------------------------------------------------
   🔧 v9.2:
   ✅ MAX_CACHE_MOVIES = 100000 (بدل 10000)
   ✅ عرض Cache الكامل بدون تقطيع
   ================================================================ */

'use strict';

const MoviesAPI = (function () {

  /* ================================================================
     ⚙️ الإعدادات
     ================================================================ */
  const CONFIG = {
    WORKER_URL: 'https://idjdhdhdhhdueugxbsksigckdhsg.dairalzor33.workers.dev',
    XTREAM_HOST: 'http://vip2.sharkhost.xyz',
    MIN_YEAR: 1900,
    MIN_RATING: 0,
    CACHE_HOURS: 24,
    MAX_CACHE_MOVIES: 100000,
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
    DEFAULT_WIDTH: 300,
    REFERER: 'no-referrer'
  };

  /* ================================================================
     🔐 بيانات الاشتراك
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
      console.warn('⚠️ [Movies] فشل الحصول على السر');
    }
    return { u: '', p: '' };
  }

  /* ================================================================
     🏷️ التصنيفات
     ================================================================ */
  const CATEGORIES = {
    '254': { name: '2026', icon: 'calendar' },
    '98':  { name: '2024-2026 UHD', icon: 'diamond' },
    '122': { name: 'TOP IMDB', icon: 'star' },
    '192': { name: 'English 4K', icon: 'monitor' },
    '256': { name: 'Marvel', icon: 'lightning' },
    '255': { name: 'DC', icon: 'lightning' },
    '241': { name: 'Horror', icon: 'alert' },
    '248': { name: 'Thriller', icon: 'target' },
    '242': { name: 'Drama', icon: 'film' },
    '246': { name: 'Crime', icon: 'alert' },
    '243': { name: 'Adventure', icon: 'shuffle' },
    '251': { name: 'Comedy', icon: 'film' },
    '247': { name: 'Romance', icon: 'star' },
    '245': { name: 'War', icon: 'target' },
    '171': { name: 'Documentary', icon: 'info' },
    '186': { name: 'KIDS', icon: 'play' },
    '213': { name: 'Anime', icon: 'film' },
    '159': { name: 'KIDS 2', icon: 'play' },
    '168': { name: 'Arabic', icon: 'film' },
    '227': { name: 'WWE PPV', icon: 'target' }
  };

  /* ================================================================
     🗄️ SecureDB Keys
     ================================================================ */
  const SECURE_KEYS = {
    ALL_MOVIES: 'h90_movies_secure_v9',
    TIMESTAMP: 'h90_movies_ts_v9'
  };

  /* ================================================================
     🛠️ أدوات
     ================================================================ */
  function log(...args) {
    console.log('%c🎬 [Movies]', 'color:#00e5ff;font-weight:900;', ...args);
  }

  function warn(...args) {
    console.warn('%c⚠️ [Movies]', 'color:#ffb300;font-weight:900;', ...args);
  }

  function error(...args) {
    console.error('%c❌ [Movies]', 'color:#ff2d55;font-weight:900;', ...args);
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
      .replace(/\s*\d+[Kk]\b/g, '')
      .replace(/\s*(4K|UHD|FHD|HD|SD|HEVC|H\.?265|H\.?264|REMUX|BLURAY|BRRip|WEB-?DL|WEBRip|HDTV|DVDRip|XviD|DivX)\b/gi, '')
      .replace(/\s*\.(?=\s|$)/g, '')
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

  function proxyMovieImages(movies) {
    if (!Array.isArray(movies)) return movies;
    return movies.map(function (movie) {
      if (movie.poster) {
        movie.poster = proxyImage(movie.poster, 300);
      }
      return movie;
    });
  }

  function getFallbackImageUrl(url) {
    if (!url) return '';
    if (url.includes('weserv.nl')) {
      const original = decodeURIComponent(url.split('url=')[1].split('&')[0]);
      return IMG_PROXY.STATICALLY + original + '?w=300';
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
    const timeoutMsFinal = timeoutMs || CONFIG.TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMsFinal);

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
        body: JSON.stringify({ type, id, ext: ext || 'mkv' })
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
     🎬 توليد رابط البث
     ================================================================ */
  async function buildStreamUrl(streamId, ext) {
    const tokenData = await requestToken('movie', streamId, ext || 'mkv');

    if (!tokenData || !tokenData.url) {
      warn('فشل Token — استخدام رابط مباشر');
      const creds = getCredentials();
      return CONFIG.XTREAM_HOST + '/movie/' +
        encodeURIComponent(creds.u) + '/' +
        encodeURIComponent(creds.p) + '/' +
        streamId + '.' + (ext || 'mkv');
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

      var data = await db.get(SECURE_KEYS.ALL_MOVIES);
      if (data && data.movies) {
        log('💾 من SecureDB:', data.movies.length, 'فيلم');
        return data.movies;
      }
      return null;
    } catch (e) {
      error('فشل قراءة Cache:', e.message);
      return null;
    }
  }

  async function writeCache(movies) {
    try {
      var db = window.H90SecureDB;
      if (!db) {
        warn('SecureDB غير متاح — تجاهل الحفظ');
        return false;
      }

      /* ✅ v9.2: حفظ كل الأفلام بدون حد أقصى */
      var maxMovies = CONFIG.MAX_CACHE_MOVIES || 100000;
      var toCache = movies.length > maxMovies ? movies.slice(0, maxMovies) : movies;

      await db.set(SECURE_KEYS.ALL_MOVIES, { movies: toCache });
      await db.set(SECURE_KEYS.TIMESTAMP, { time: Date.now() });

      log('🔐 تم حفظ Cache مشفّر:', toCache.length, 'فيلم');
      return true;
    } catch (e) {
      error('فشل حفظ Cache:', e.message);
      return false;
    }
  }

  async function clearCache() {
    try {
      var db = window.H90SecureDB;
      if (db) {
        await db.delete(SECURE_KEYS.ALL_MOVIES);
        await db.delete(SECURE_KEYS.TIMESTAMP);
      }
      log('🗑️ تم مسح Cache');
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ================================================================
     🎯 فلترة (تم إلغاء الفلترة القاسية)
     ================================================================ */
  function shouldIncludeMovie(movie) {
    if (!movie || !movie.name) return false;
    return true;
  }

  function normalizeMovie(raw) {
    const year = extractYear(raw.name);
    const rating = parseRating(raw.rating);
    const cleanTitle = cleanName(raw.name);

    const rawPoster = cleanImageUrl(raw.stream_icon);
    const proxiedPoster = proxyImage(rawPoster, 300);

    return {
      id: raw.stream_id,
      name: raw.name,
      title: cleanTitle || raw.name,
      year: year,
      rating: rating,
      rating5: raw.rating_5based || 0,
      poster: proxiedPoster,
      originalPoster: rawPoster,
      categoryId: String(raw.category_id || ''),
      categoryName: CATEGORIES[raw.category_id] ? CATEGORIES[raw.category_id].name : 'أفلام',
      extension: raw.container_extension || 'mkv',
      addedAt: parseInt(raw.added || '0', 10)
    };
  }

  /* ================================================================
     📡 جلب الأفلام — الطريقة الجديدة (من التصنيفات)
     ================================================================ */
  async function fetchAllMoviesFromApi() {
    log('📡 جلب الأفلام من السيرفر (جميع التصنيفات)...');

    const allMoviesMap = new Map();

    /* 1. جلب الأفلام العامة */
    try {
      const generalUrl = buildApiUrl('get_vod_streams');
      const generalRaw = await httpGet(generalUrl, CONFIG.TIMEOUT_MS);
      if (Array.isArray(generalRaw)) {
        log('📥 تم جلب', generalRaw.length, 'فيلم (عام)');
        generalRaw.forEach(function(item) {
          if (shouldIncludeMovie(item)) {
            allMoviesMap.set(String(item.stream_id), normalizeMovie(item));
          }
        });
      }
    } catch (e) {
      warn('فشل جلب الأفلام العامة:', e.message);
    }

    /* 2. جلب الأفلام لكل تصنيف */
    const categoryIds = Object.keys(CATEGORIES);
    log('📡 جلب من', categoryIds.length, 'تصنيف...');

    for (let i = 0; i < categoryIds.length; i++) {
      const catId = categoryIds[i];
      try {
        const catUrl = buildApiUrl('get_vod_streams', '&category_id=' + catId);
        const catRaw = await httpGet(catUrl, CONFIG.TIMEOUT_MS);
        if (Array.isArray(catRaw)) {
          log(`📥 تصنيف ${CATEGORIES[catId].name}: ${catRaw.length} فيلم`);
          catRaw.forEach(function(item) {
            if (shouldIncludeMovie(item)) {
              const key = String(item.stream_id);
              if (!allMoviesMap.has(key)) {
                allMoviesMap.set(key, normalizeMovie(item));
              }
            }
          });
        }
      } catch (e) {
        warn(`فشل جلب تصنيف ${CATEGORIES[catId].name}:`, e.message);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    const allMovies = Array.from(allMoviesMap.values());
    log('✅ إجمالي الأفلام بعد إزالة التكرار:', allMovies.length);

    if (allMovies.length === 0) {
      throw new Error('لم يتم العثور على أي أفلام');
    }

    return allMovies;
  }

  /* ================================================================
     📦 التحميل (مع SecureDB)
     ================================================================ */
  let _loadingPromise = null;

  async function loadMovies(forceReload) {
    if (_loadingPromise) return _loadingPromise;

    if (!forceReload && await isCacheValid()) {
      const cached = await readCache();
      if (cached && cached.length > 0) {
        log('💾 من Cache المشفّر:', cached.length);
        return cached;
      }
    }

    _loadingPromise = (async () => {
      try {
        const movies = await fetchAllMoviesFromApi();
        await writeCache(movies);
        return movies;
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
     ⚡ Progressive Loading — v9.2 محسّن
     ================================================================ */
  let _progressiveState = {
    isLoading: false,
    total: 0,
    delivered: 0,
    batches: 0,
    startTime: 0
  };

  async function loadMoviesProgressively(onBatch, forceReload) {
    if (_progressiveState.isLoading) {
      warn('⚠️ تحميل تدريجي جارٍ');
      return _loadingPromise || [];
    }

    _progressiveState.isLoading = true;
    _progressiveState.startTime = Date.now();
    _progressiveState.delivered = 0;
    _progressiveState.batches = 0;

    try {
      /* ✅ v9.2: من Cache — عرض كل الأفلام دفعة واحدة */
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

      /* جلب من السيرفر */
      log('📡 [Progressive] جلب من السيرفر...');
      const allMovies = await fetchAllMoviesFromApi();

      _progressiveState.total = allMovies.length;
      await writeCache(allMovies);

      const BATCH_SIZE = CONFIG.BATCH_SIZE;
      const totalBatches = Math.ceil(allMovies.length / BATCH_SIZE);

      log('📦 [Progressive] تقسيم', allMovies.length, 'على', totalBatches, 'دفعة');

      for (let i = 0; i < allMovies.length; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, allMovies.length);
        const batchSoFar = allMovies.slice(0, batchEnd);
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
              total: allMovies.length,
              isComplete: batchEnd >= allMovies.length,
              fromCache: false
            });
          } catch (cbErr) {}
        }

        if (batchEnd < allMovies.length) {
          await new Promise(r => setTimeout(r, CONFIG.BATCH_DELAY_MS));
        }
      }

      const elapsed = Date.now() - _progressiveState.startTime;
      log('✅ [Progressive] انتهى —', allMovies.length, 'فيلم في', elapsed + 'ms');

      _progressiveState.isLoading = false;
      return allMovies;

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
     📊 فلاتر
     ================================================================ */
  function filterByCategory(movies, categoryId) {
    if (!categoryId) return movies;
    return movies.filter(m => String(m.categoryId) === String(categoryId));
  }

  function getTrending(movies, limit) {
    return [...movies].sort((a, b) => {
      const scoreA = a.rating * 10 + (a.year >= 2023 ? 20 : a.year >= 2020 ? 10 : 0);
      const scoreB = b.rating * 10 + (b.year >= 2023 ? 20 : b.year >= 2020 ? 10 : 0);
      return scoreB - scoreA;
    }).slice(0, limit || 20);
  }

  function getTopRated(movies, limit) {
    return [...movies].sort((a, b) => b.rating - a.rating).slice(0, limit || 20);
  }

  function getRecentlyAdded(movies, limit) {
    return [...movies].sort((a, b) => b.addedAt - a.addedAt).slice(0, limit || 20);
  }

  function getNewReleases(movies, limit) {
    return [...movies]
      .filter(m => m.year >= 2024)
      .sort((a, b) => b.year - a.year || b.rating - a.rating)
      .slice(0, limit || 20);
  }

  function search(movies, query, limit) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return movies
      .filter(m => m.title.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit || 50);
  }

  function paginate(movies, page, pageSize) {
    const start = (page - 1) * (pageSize || 30);
    const end = start + (pageSize || 30);
    return {
      items: movies.slice(start, end),
      total: movies.length,
      totalPages: Math.ceil(movies.length / (pageSize || 30)),
      hasMore: end < movies.length
    };
  }

  /* ================================================================
     🎬 تشغيل الفيلم في المشغل الداخلي
     ================================================================ */
  async function playMovie(movie) {
    if (!movie) {
      showMoviesError('لم يتم تحديد الفيلم');
      return false;
    }

    log('🎬 تشغيل الفيلم:', movie.title || movie.name);

    try {
      const streamUrl = await buildStreamUrl(movie.id, movie.extension);

      if (!streamUrl) {
        throw new Error('فشل الحصول على رابط البث');
      }

      const movieData = {
        url: streamUrl,
        title: movie.title || movie.name,
        poster: movie.poster || movie.originalPoster || '',
        isLive: false
      };

      if (window.H90MoviesPlayer && typeof window.H90MoviesPlayer.play === 'function') {
        window.H90MoviesPlayer.play(movieData);
        log('✅ تم التشغيل بنجاح');
        return true;
      }

      warn('⚠️ H90MoviesPlayer غير متوفر');
      if (window.MoviesPlayerBridge && typeof window.MoviesPlayerBridge.play === 'function') {
        window.MoviesPlayerBridge.play(movieData);
        return true;
      }

      showMoviesError('المشغل الداخلي غير متوفر');
      return false;
    } catch (e) {
      error('❌ فشل التشغيل:', e.message);
      showMoviesError('تعذّر تشغيل الفيلم: ' + e.message);
      return false;
    }
  }

  /* ================================================================
     🎬 تشغيل قائمة كاملة
     ================================================================ */
  async function playMovieList(movies, startIndex) {
    if (!Array.isArray(movies) || movies.length === 0) {
      showMoviesError('القائمة فارغة');
      return false;
    }

    log('🎬 تشغيل قائمة من', movies.length, 'فيلم');

    try {
      const playlist = [];
      for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        try {
          const streamUrl = await buildStreamUrl(movie.id, movie.extension);
          if (streamUrl) {
            playlist.push({
              url: streamUrl,
              title: movie.title || movie.name,
              poster: movie.poster || ''
            });
          }
        } catch (e) {
          warn('⚠️ فشل تحضير فيلم #' + i);
        }
      }

      if (playlist.length === 0) {
        throw new Error('لم يتم تحضير أي فيلم');
      }

      if (window.H90MoviesPlayer && typeof window.H90MoviesPlayer.playPlaylist === 'function') {
        window.H90MoviesPlayer.playPlaylist(playlist, startIndex || 0);
        log('✅ تم تشغيل القائمة — ' + playlist.length);
        return true;
      }

      warn('⚠️ playPlaylist غير متوفر');
      if (playlist[0]) {
        window.H90MoviesPlayer.play(playlist[0]);
        return true;
      }

      return false;
    } catch (e) {
      error('❌ فشل تشغيل القائمة:', e.message);
      showMoviesError('تعذّر تشغيل القائمة: ' + e.message);
      return false;
    }
  }

  /* ================================================================
     🚨 عرض خطأ
     ================================================================ */
  function showMoviesError(msg) {
    if (typeof window.showToastSafe === 'function') {
      window.showToastSafe('❌ ' + msg, 'error');
    } else if (typeof window.showToast === 'function') {
      window.showToast('❌ ' + msg, 'error');
    } else {
      console.error('❌ [Movies]', msg);
    }
  }

  /* ================================================================
     🧪 اختبار
     ================================================================ */
  async function testConnection() {
    console.log('%c🧪 [Movies] اختبار...', 'color:#00e5ff;font-weight:900;');

    const results = { version: '9.2' };

    try {
      if (window.__H90_SEC__) {
        const c = getCredentials();
        results.credentials = { ok: true, hasUser: !!c.u, hasPass: !!c.p };
        console.log('✅ السر مستخرج:', c.u ? 'نعم' : 'لا');
      }
    } catch (e) {
      results.credentials = { ok: false };
    }

    try {
      const url = buildApiUrl('get_vod_streams');
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      const data = await res.json();
      results.api = { ok: true, count: data.length };
      console.log('✅ API يعمل — عدد الأفلام:', data.length);
    } catch (e) {
      results.api = { ok: false, error: e.message };
    }

    try {
      const tokenData = await requestToken('movie', 542910, 'mkv');
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
      console.log('✅ SecureDB:', results.secureDB.available);
    } catch (e) {
      results.secureDB = { ok: false };
    }

    console.log('📊 النتيجة:', results);
    return results;
  }

  /* ================================================================
     🌐 API عام
     ================================================================ */
  return {
    loadMovies,
    loadMoviesProgressively,
    isProgressivelyLoading,
    getProgressStatus,
    clearCache,
    isCacheValid,

    getTrending, getTopRated, getRecentlyAdded, getNewReleases,
    filterByCategory, search, paginate,

    extractYear, cleanName, buildStreamUrl, getCredentials,
    CATEGORIES, CONFIG,

    proxyImage,
    proxyMovieImages,
    getFallbackImageUrl,
    IMG_PROXY,

    playMovie,
    playMovieList,
    showMoviesError,

    testConnection,

    getStatus: function () {
      return {
        version: '9.2',
        cacheValid: false,
        securityAvailable: !!window.__H90_SEC__,
        secureDBAvailable: !!window.H90SecureDB,
        cryptoAvailable: !!window.H90Crypto,
        shardsReady: window.__H90_Assembler__ ? window.__H90_Assembler__.isReady() : false,
        categoriesCount: Object.keys(CATEGORIES).length,
        proxyEnabled: IMG_PROXY.ENABLED,
        proxyType: IMG_PROXY.TYPE,
        moviesPlayerReady: !!(window.H90MoviesPlayer),
        progressiveSupported: true,
        progressiveBatchSize: CONFIG.BATCH_SIZE,
        maxCacheMovies: CONFIG.MAX_CACHE_MOVIES
      };
    }
  };

})();

window.MoviesAPI = MoviesAPI;

console.log('%c🎬 H90 — Movies API v9.2 (Full Cache + Progressive) Loaded',
  'background:linear-gradient(135deg,#00e5ff,#ffb300);color:#fff;padding:5px 12px;border-radius:8px;font-weight:900;font-size:11px;');