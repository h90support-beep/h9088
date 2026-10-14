/* ================================================================
   H90 v30.1 — Core Script
   ================================================================
   [v30.1]
   - حذف نظام اللغة بالكامل
   - حذف نظام صوت الإشعار
   - حذف إعدادات المؤثرات الصوتية
   - حذف الأزرار المحذوفة من HTML

   [v30.0]
   - FAQ موسّع (150+ سؤال)
   - دمج AI Assistant
   - حماية XSS في عرض الأسئلة

   [v29.0]
   - المباريات تعرض مباشرة
   - switchTab('matches') -> renderMatches() مباشرة
   - دعم كامل لـ Server 2
   - ربط مع matches.js
   - طلب إذن الإشعارات تلقائياً
   - دعم Capacitor Push + LocalNotifications
   ================================================================ */

'use strict';

/* ================================================================
   0. Sound Helper
   ================================================================ */
const SoundBridge = {
  tap()      { try { typeof H90Sounds !== 'undefined' && H90Sounds.tap      && H90Sounds.tap();      } catch (e) {} },
  nav()      { try { typeof H90Sounds !== 'undefined' && H90Sounds.nav      && H90Sounds.nav();      } catch (e) {} },
  open()     { try { typeof H90Sounds !== 'undefined' && H90Sounds.open     && H90Sounds.open();     } catch (e) {} },
  close()    { try { typeof H90Sounds !== 'undefined' && H90Sounds.close    && H90Sounds.close();    } catch (e) {} },
  favorite() { try { typeof H90Sounds !== 'undefined' && H90Sounds.favorite && H90Sounds.favorite(); } catch (e) {} },
  success()  { try { typeof H90Sounds !== 'undefined' && (H90Sounds.success ? H90Sounds.success() : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} },
  error()    { try { typeof H90Sounds !== 'undefined' && (H90Sounds.error   ? H90Sounds.error()   : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} },
  warning()  { try { typeof H90Sounds !== 'undefined' && (H90Sounds.warning ? H90Sounds.warning() : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} },
  toggle()   { try { typeof H90Sounds !== 'undefined' && (H90Sounds.toggle  ? H90Sounds.toggle()  : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} },
  add()      { try { typeof H90Sounds !== 'undefined' && (H90Sounds.add     ? H90Sounds.add()     : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} },
  remove()   { try { typeof H90Sounds !== 'undefined' && (H90Sounds.remove  ? H90Sounds.remove()  : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} },
  message()  { try { typeof H90Sounds !== 'undefined' && (H90Sounds.message ? H90Sounds.message() : (H90Sounds.tap && H90Sounds.tap())); } catch (e) {} }
};
window.SoundBridge = SoundBridge;

(function unlockAudioOnce() {
  const events = ['touchstart', 'touchend', 'mousedown', 'click', 'keydown'];
  const handler = () => {
    try {
      if (typeof H90Sounds !== 'undefined' && typeof H90Sounds.unlock === 'function') {
        H90Sounds.unlock();
      }
    } catch (e) {}
    events.forEach(evt => document.removeEventListener(evt, handler, true));
  };
  events.forEach(evt => document.addEventListener(evt, handler, true));
})();

/* ================================================================
   كشف بيئة APK
   ================================================================ */
const __H90_IS_APK__ = (function () {
  try {
    return !!(
      window.__H90_APK_MODE__ ||
      window.__H90_NATIVE_EARLY__ ||
      (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
      window.cordova ||
      location.protocol === 'file:'
    );
  } catch (e) { return false; }
})();

console.log('H90 Core — Environment:', __H90_IS_APK__ ? 'APK/Native' : 'Web');

/* ================================================================
   1. الحالة العامة
   ================================================================ */
let currentLang = 'ar';
let currentTab = 'channels';
let currentView = 'groups';
let currentGroupId = null;
let currentFilteredChannels = [];
let favorites = [];
let recentChannels = [];
let deferredPrompt = null;
let clockInterval = null;
let currentSubScreen = null;
let _currentRenderedTab = null;

const FAV_KEY = 'h90_favorites';
const RECENT_KEY = 'h90_recent';
const THEME_KEY = 'h90_theme';
const SETTINGS_KEY = 'h90_settings';
const NOTIF_SETTINGS_KEY = 'h90_notif_settings';
const MATCH_TIME_KEY = 'h90_match_reminder_time';
const NOTIF_API = 'https://h90-notfiy.dairalzor33.workers.dev';
const LAST_SEEN_NOTIF_KEY = 'h90_last_seen_notif';
const NOTIF_ASKED_AFTER_WELCOME_KEY = 'h90_notif_asked_after_welcome';

const DEFAULT_NOTIF_SETTINGS = {
  general: true, matches: true, breaking: false,
  newchannels: true, streamOffline: true, dnd: false
};

const TIME_OPTIONS = [
  { id: 5,   label: '5 دقائق' },
  { id: 10,  label: '10 دقائق' },
  { id: 15,  label: '15 دقيقة' },
  { id: 30,  label: '30 دقيقة' },
  { id: 60,  label: 'ساعة واحدة' },
  { id: 120, label: 'ساعتان' }
];

/* ================================================================
   2. مكتبة أيقونات SVG
   ================================================================ */
const SVG_ICONS = {
  check:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  close:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  alert:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  star:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  tv:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>',
  play:       '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  layers:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  clock:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  bell:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  search:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  ball:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7l3 2.5-1 3.5h-4l-1-3.5L12 7z"/><path d="M12 2v5M19.5 8.5L15 10.5M18 18l-3.5-2M6 18l3.5-2M4.5 8.5L9 10.5"/></svg>',
  help:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  message:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bookOpen:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  zap:        '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  diamond:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20M12 21V9M6 3l6 6 6-6"/></svg>',
  palette:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>'
};

function getIcon(name) {
  return SVG_ICONS[name] || SVG_ICONS.info;
}

/* ================================================================
   3. الاهتزاز
   ================================================================ */
function haptic(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern || 10); } catch (e) {}
  }
}

/* ================================================================
   طلب إذن الإشعارات الموحّد
   ================================================================ */
async function requestNotificationPermissionUnified() {
  console.log('[H90] طلب إذن الإشعارات...');

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    console.log('[H90] الإذن ممنوح مسبقاً');
    showToast('الإشعارات مفعّلة مسبقاً', 'success');
    updateNotifToggles();
    if (window.H90Firebase && typeof window.H90Firebase.register === 'function') {
      window.H90Firebase.register().catch(function () {});
    }
    return true;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    console.warn('[H90] الإذن مرفوض مسبقاً');
    showToast('الإشعارات مرفوضة — فعّلها من إعدادات المتصفح', 'warning');
    Sound.warning();
    return false;
  }

  if (__H90_IS_APK__ && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
    try {
      var PushNotifications = window.Capacitor.Plugins.PushNotifications;
      var permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        console.log('[H90] Capacitor Push permission granted');
        showToast('تم تفعيل الإشعارات', 'success');
        Sound.success();
        haptic(15);
        updateNotifToggles();

        try { await PushNotifications.register(); } catch (e) {}

        try {
          window.dispatchEvent(new CustomEvent('h90:notifications:enabled'));
        } catch (e) {}

        return true;
      }
    } catch (e) {
      console.warn('Capacitor Push permission failed:', e);
    }
  }

  if (typeof Notification === 'undefined') {
    showToast('متصفحك لا يدعم الإشعارات', 'warning');
    return false;
  }

  var perm = 'default';
  try {
    console.log('[H90] استدعاء Notification.requestPermission()...');
    perm = await Notification.requestPermission();
    console.log('[H90] نتيجة الإذن:', perm);
  } catch (e) {
    console.error('[H90] فشل طلب الإذن:', e);
    showToast('فشل طلب الإذن', 'error');
    return false;
  }

  if (perm !== 'granted') {
    console.warn('[H90] الإذن غير ممنوح:', perm);
    Sound.warning();
    return false;
  }

  console.log('[H90] تم منح الإذن');
  showToast('تم تفعيل الإشعارات', 'success');
  Sound.success();
  haptic(15);
  updateNotifToggles();

  try {
    if (window.H90Firebase && typeof window.H90Firebase.register === 'function') {
      window.H90Firebase.register().catch(function (e) {
        console.warn('Firebase register failed:', e);
      });
    }
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('h90:notifications:enabled'));
  } catch (e) {}

  return true;
}

/* ================================================================
   فحص إذا كانت الإشعارات مفعّلة
   ================================================================ */
function areNotificationsEnabled() {
  if (__H90_IS_APK__ && window.H90Firebase && typeof window.H90Firebase.hasCapacitorPush === 'function') {
    if (window.H90Firebase.hasCapacitorPush()) {
      var status = window.H90Firebase.getStatus ? window.H90Firebase.getStatus() : {};
      if (status.hasNativeToken || status.hasToken) return true;
    }
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    return true;
  }
  return false;
}

/* ================================================================
   طلب الإذن تلقائياً بعد شاشة الترحيب
   ================================================================ */
async function askNotificationAfterWelcome() {
  try {
    if (localStorage.getItem(NOTIF_ASKED_AFTER_WELCOME_KEY) === 'true') {
      return false;
    }
  } catch (e) {}

  if (areNotificationsEnabled()) {
    try { localStorage.setItem(NOTIF_ASKED_AFTER_WELCOME_KEY, 'true'); } catch (e) {}
    return true;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    try { localStorage.setItem(NOTIF_ASKED_AFTER_WELCOME_KEY, 'true'); } catch (e) {}
    return false;
  }

  await new Promise(function (r) { setTimeout(r, 800); });

  var granted = await requestNotificationPermissionUnified();

  try { localStorage.setItem(NOTIF_ASKED_AFTER_WELCOME_KEY, 'true'); } catch (e) {}

  return granted;
}

/* ================================================================
   4. التهيئة الأولية
   ================================================================ */
document.addEventListener('DOMContentLoaded', async function () {
  console.log('%cH90 v30.1 — Core Ready', 'color:#ff2d55;font-weight:900;font-size:14px');

  window.addEventListener('h90:welcome:closed', function () {
    setTimeout(function () {
      askNotificationAfterWelcome();
    }, 700);
  });

  var welcomeCheckInterval = setInterval(function () {
    try {
      if (localStorage.getItem('h90_welcome_seen_v1') === 'true') {
        clearInterval(welcomeCheckInterval);
        setTimeout(function () {
          askNotificationAfterWelcome();
        }, 1200);
      }
    } catch (e) {}
  }, 1000);

  setTimeout(function () { clearInterval(welcomeCheckInterval); }, 180000);

  loadFavorites();
  loadRecent();
  loadTheme();

  if (typeof loadM3UFromWorker === 'function') {
    try { await loadM3UFromWorker(); }
    catch (e) { console.error('فشل تحميل القنوات:', e); }
  }

  setTimeout(function () {
    try {
      renderGroupsScreen();
      renderThemeGrid();
    } catch (e) { console.warn('render initial fail:', e); }
  }, 100);

  document.querySelectorAll('.nav-item').forEach(function (item) {
    if (item.dataset.bound === '1') return;
    item.dataset.bound = '1';
    item.addEventListener('click', function () {
      var tab = item.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  if (window.PlayerEngine && typeof window.PlayerEngine.init === 'function') {
    setTimeout(function () {
      try { window.PlayerEngine.init(); } catch (e) {}
    }, 500);
  }

  updateNotifToggles();
  initDNDState();

  if (typeof window.updateTeamsCountLabel === 'function') {
    setTimeout(window.updateTeamsCountLabel, 500);
  }

  setTimeout(function () {
    if (typeof window.startMatchReminders === 'function' && areNotificationsEnabled()) {
      window.startMatchReminders();
    }
  }, 3000);

  setTimeout(checkNewH90Notifications, 3000);

  setTimeout(bindSoundEvents, 300);
});

/* ================================================================
   4.1 bindSoundEvents
   ================================================================ */
function bindSoundEvents() {
  if (typeof H90Sounds === 'undefined') {
    console.warn('sounds.js not loaded — sound bindings skipped');
    return;
  }

  document.querySelectorAll('.header-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { Sound.tap(); }, { passive: true });
  });

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.channel-card, .channel-item, .server-card, .group-card, .ent-card, .s1-card, .s1-group-card, .match-card');
    if (card) Sound.open();
  }, { passive: true });

  document.addEventListener('click', function (e) {
    var favBtn = e.target.closest('.channel-fav');
    if (favBtn) Sound.favorite();
  }, { passive: true });

  document.addEventListener('click', function (e) {
    var pcBtn = e.target.closest('.pc-btn');
    if (pcBtn && !pcBtn.classList.contains('pc-play')) Sound.tap();
  }, { passive: true });

  document.addEventListener('click', function (e) {
    var pill = e.target.closest('.quality-pill');
    if (pill) Sound.tap();
  }, { passive: true });

  document.querySelectorAll('#drawer > div[onclick]').forEach(function (item) {
    item.addEventListener('click', function () { Sound.tap(); }, { passive: true });
  });

  console.log('Sound bindings attached');
}

/* ================================================================
   5. switchTab
   ================================================================ */
function switchTab(tab) {
  if (_currentRenderedTab === tab && tab !== 'channels' && tab !== 'settings' && tab !== 'matches' && tab !== 'entertainment') {
    return;
  }

  _currentRenderedTab = tab;
  currentTab = tab;

  if (tab !== 'series' && tab !== 'movies' && tab !== 'news' && tab !== 'entertainment' && clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }

  document.querySelectorAll('.nav-item').forEach(function (item) {
    item.classList.toggle('active', item.dataset.tab === tab);
  });

  var categoriesBar = document.getElementById('categoriesBar');
  var heroBanner = document.getElementById('heroBanner');
  var pageContent = document.getElementById('pageContent');
  var matchesTabContent = document.getElementById('matchesTabContent');

  if (categoriesBar) categoriesBar.style.display = 'none';
  if (heroBanner) heroBanner.style.display = 'none';
  if (pageContent) pageContent.style.display = 'block';
  if (matchesTabContent) matchesTabContent.style.display = 'none';

  currentSubScreen = null;

  try {
    if (tab === 'channels') {
      currentView = 'groups';
      currentGroupId = null;
      renderGroupsScreen();
    } else if (tab === 'matches') {
      currentView = 'matches';
      currentSubScreen = 'schedule';
      currentGroupId = null;

      if (typeof window.renderMatches === 'function') {
        window.renderMatches();
      }
    } else if (tab === 'entertainment') {
      currentView = 'entertainment-menu';
      currentGroupId = null;
      if (typeof window.renderEntertainmentScreen === 'function') {
        window.renderEntertainmentScreen();
      }
    } else if (tab === 'series') {
      currentView = 'coming-soon';
      currentSubScreen = 'series';
      if (typeof window.renderSeriesScreen === 'function') {
        window.renderSeriesScreen();
      }
    } else if (tab === 'movies') {
      currentView = 'coming-soon';
      currentSubScreen = 'movies';
      if (typeof window.renderMoviesPage === 'function') {
        window.renderMoviesPage();
      }
    } else if (tab === 'news') {
      currentView = 'coming-soon';
      currentSubScreen = 'news';
      renderNewsScreen();
    } else if (tab === 'schedule') {
      currentView = 'matches';
      currentSubScreen = 'schedule';
      if (typeof window.renderMatches === 'function') {
        window.renderMatches();
      }
    } else if (tab === 'favorites') {
      currentView = 'favorites';
      currentGroupId = null;
      renderFavorites();
    } else if (tab === 'recent') {
      currentView = 'recent';
      currentGroupId = null;
      renderRecent();
    } else if (tab === 'rooms') {
      currentView = 'rooms';
      if (typeof openRoomsScreen === 'function') {
        openRoomsScreen();
      }
    } else if (tab === 'settings') {
      openSettings();
    }
  } catch (e) {
    console.error('switchTab error:', e);
  }

  Sound.nav();
  haptic(10);
}

/* ================================================================
   6. renderScreenHeader
   ================================================================ */
function renderScreenHeader(title, subtitle, backFunction) {
  var backFn = backFunction || 'backToMainTab()';
  return (
    '<div class="screen-header">' +
      '<button onclick="' + backFn + '" class="screen-header-back" aria-label="رجوع">' +
        '<div style="width:20px;height:20px;">' + getIcon('chevronRight') + '</div>' +
      '</button>' +
      '<div class="screen-header-title">' +
        '<div class="screen-header-title-main">' + title + '</div>' +
        (subtitle ? '<div class="screen-header-title-sub">' + subtitle + '</div>' : '') +
      '</div>' +
    '</div>'
  );
}

/* ================================================================
   7. renderMatchesScreen
   ================================================================ */
function renderMatchesScreen() {
  if (typeof window.renderMatches === 'function') {
    window.renderMatches();
  } else {
    var grid = document.getElementById('channelsGrid');
    if (grid) {
      grid.innerHTML = renderEmptyState('ball', 'المباريات', 'جارٍ التحميل...');
    }
  }
}

/* ================================================================
   8. openMatchesSub
   ================================================================ */
function openMatchesSub(type) {
  if (type === 'schedule' && typeof window.renderMatches === 'function') {
    window.renderMatches();
  }
}

/* ================================================================
   9. backToMainTab
   ================================================================ */
function backToMainTab() {
  Sound.close();
  haptic(8);
  _currentRenderedTab = null;

  if (currentView === 'coming-soon' && currentSubScreen) {
    if (currentSubScreen === 'series' || currentSubScreen === 'movies') {
      if (typeof window.backToEntertainment === 'function') {
        window.backToEntertainment();
      } else {
        switchTab('entertainment');
      }
      return;
    }
    if (currentSubScreen === 'news') {
      switchTab('matches');
      return;
    }
  }

  if (currentView === 'matches' && currentSubScreen === 'schedule') {
    switchTab('matches');
    return;
  }

  switchTab('channels');
}

function renderNewsScreen() {
  if (typeof window.renderComingSoon === 'function') {
    window.renderComingSoon('news');
  }
}

function backToMatches() {
  Sound.close();
  haptic(8);
  _currentRenderedTab = null;
  switchTab('matches');
}

/* ================================================================
   11. renderEmptyState + hexToRgb
   ================================================================ */
function renderEmptyState(iconName, title, desc) {
  return (
    '<div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 24px;text-align:center;">' +
      '<div style="position:relative;width:96px;height:96px;border-radius:28px;background:rgba(255,45,85,0.08);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;margin-bottom:22px;">' +
        '<div style="position:relative;z-index:1;width:44px;height:44px;color:#ff2d55;">' + getIcon(iconName) + '</div>' +
      '</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-0.3px;">' + title + '</div>' +
      (desc ? '<div style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.7;max-width:320px;font-weight:500;">' + desc + '</div>' : '') +
    '</div>'
  );
}

function hexToRgb(hex) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  var n = parseInt(h, 16);
  return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

/* ================================================================
   12. renderGroupsScreen
   ================================================================ */
function renderGroupsScreen() {
  var grid = document.getElementById('channelsGrid');
  if (!grid) return;

  if (typeof window.renderS2GroupCards === 'function') {
    var allGroups = (typeof getAllGroups === 'function') ? getAllGroups() : [];
    var allChannels = (typeof getAllChannels === 'function') ? getAllChannels() : [];

    if (allGroups.length === 0) {
      grid.innerHTML = renderEmptyState('tv', 'لا توجد باقات', 'جارٍ التحميل...');
      return;
    }

    try {
      window.renderS2GroupCards(grid, allGroups, allChannels);
      return;
    } catch (e) {
      console.error('[H90] renderS2GroupCards فشل:', e);
    }
  }

  grid.innerHTML = renderEmptyState('tv', 'خطأ في العرض', 'renderS2GroupCards غير متاح.');
}

/* ================================================================
   13. openGroup + renderGroupChannels
   ================================================================ */
function openGroup(groupId) {
  if (!groupId) return;

  var group = null;

  if (typeof getGroupById === 'function') {
    group = getGroupById(groupId);

    if (!group && !/^s[12]grp_/.test(groupId)) {
      group = getGroupById('s2grp_' + groupId);
    }

    if (!group && /^s[12]grp_/.test(groupId)) {
      var bare = String(groupId).replace(/^s[12]grp_/, '');
      group = getGroupById(bare);
    }
  }

  if (!group) {
    showToast('المجموعة غير موجودة', 'error');
    Sound.error();
    return;
  }

  currentGroupId = group.id;
  currentView = 'channels';
  renderGroupChannels(group);
  Sound.open();
  haptic(10);
}

function renderGroupChannels(group) {
  var grid = document.getElementById('channelsGrid');
  if (!grid) return;

  var channels = (typeof getChannelsByGroup === 'function') ? getChannelsByGroup(group.id) : [];

  if (channels.length === 0) {
    grid.innerHTML = renderEmptyState('tv', 'لا توجد قنوات', 'هذه الباقة فارغة حالياً.');
    return;
  }

  if (typeof window.renderS2ChannelCards === 'function') {
    var headerHtml =
      '<div class="group-header" style="grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:12px 4px;margin-bottom:8px;">' +
        '<button onclick="backToGroups()" class="group-back-btn" aria-label="رجوع" style="width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-family:inherit;padding:0;">' +
          '<div style="width:20px;height:20px;">' + getIcon('chevronRight') + '</div>' +
        '</button>' +
        '<div style="flex:1;text-align:right;">' +
          '<div style="font-size:16px;font-weight:800;color:#fff;">' + group.name_ar + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">' +
            channels.length + ' قنوات' +
          '</div>' +
        '</div>' +
      '</div>';

    grid.innerHTML = headerHtml + '<div id="s2-channels-container" style="grid-column:1/-1;width:100%;"></div>';

    var container = document.getElementById('s2-channels-container');
    if (container) {
      try {
        window.renderS2ChannelCards(container, channels);
        return;
      } catch (e) {
        console.error('renderS2ChannelCards فشل:', e);
      }
    }
  }

  /* fallback */
  var accent = '#00e676';
  var accent2 = '#00b248';

  var headerHtml2 =
    '<div class="group-header" style="grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:12px 4px;margin-bottom:8px;">' +
      '<button onclick="backToGroups()" class="group-back-btn" aria-label="رجوع" style="width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-family:inherit;padding:0;">' +
        '<div style="width:20px;height:20px;">' + getIcon('chevronRight') + '</div>' +
      '</button>' +
      '<div style="flex:1;text-align:right;">' +
        '<div style="font-size:16px;font-weight:800;color:#fff;">' + group.name_ar + '</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">' +
          channels.length + ' قنوات' +
        '</div>' +
      '</div>' +
    '</div>';

  var channelsHtml = '';
  channels.forEach(function (ch) {
    var isFav = favorites.indexOf(ch.id) > -1;
    var name = ch.name_ar;
    var logoHtml = ch.logo
      ? '<img src="' + ch.logo + '" alt="' + name + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="logo-placeholder" style="display:none;">' + (ch.letter || getIcon('tv')) + '</div>'
      : '<div class="logo-placeholder">' + (ch.letter || getIcon('tv')) + '</div>';

    var favIcon = isFav ? getIcon('starFilled') : getIcon('star');

    channelsHtml +=
      '<div class="channel-card" data-channel-id="' + ch.id + '">' +
        '<button class="channel-fav ' + (isFav ? 'active' : '') + '" data-fav-id="' + ch.id + '" aria-label="مفضلة">' + favIcon + '</button>' +
        '<div class="channel-logo">' + logoHtml +
          '<span class="status-badge" style="background:linear-gradient(135deg,' + accent + ',' + accent2 + ');">LIVE</span>' +
        '</div>' +
        '<div class="channel-name">' + name + '</div>' +
        '<div class="channel-servers">' +
          '<div style="width:10px;height:10px;display:inline-flex;">' + getIcon('layers') + '</div>' +
          '<span>' + (ch.qualities ? ch.qualities.length : 1) + ' روابط</span>' +
        '</div>' +
      '</div>';
  });

  grid.innerHTML = headerHtml2 + channelsHtml;

  grid.querySelectorAll('.channel-card[data-channel-id]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.channel-fav')) return;
      openChannel(card.dataset.channelId);
    });
  });

  grid.querySelectorAll('.channel-fav').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleFavorite(btn.dataset.favId);
      setTimeout(function () {
        var g = (typeof getGroupById === 'function') ? getGroupById(currentGroupId) : null;
        if (g) renderGroupChannels(g);
      }, 50);
    });
  });
}

function backToGroups() {
  currentGroupId = null;
  currentView = 'groups';
  renderGroupsScreen();
  Sound.close();
  haptic(8);
}

/* ================================================================
   14. openChannel
   ================================================================ */
function openChannel(channelId) {
  var channel = (typeof getChannelById === 'function') ? getChannelById(channelId) : null;
  if (!channel) {
    showToast('القناة غير موجودة', 'error');
    return;
  }

  Sound.tap();
  haptic(12);

  if (!window.PlayerEngine || typeof window.PlayerEngine.loadChannel !== 'function') {
    showToast('المشغل الداخلي غير جاهز', 'error');
    Sound.error();
    return;
  }

  addToRecent(channel.id);

  var playerPage = document.getElementById('playerPage');
  if (playerPage) {
    playerPage.classList.add('show');
    playerPage.style.display = 'flex';
  }

  var title = document.getElementById('playerTitle');
  if (title) title.textContent = channel.name_ar || '';

  try {
    window.PlayerEngine.loadChannel(channel, 0, 'server2');
  } catch (e) {
    console.error('[H90] loadChannel فشل:', e);
    showToast('فشل تشغيل القناة', 'error');
    Sound.error();
  }

  haptic(15);
}

/* ================================================================
   20. closePlayer
   ================================================================ */
function closePlayer() {
  var playerPage = document.getElementById('playerPage');
  var video = document.getElementById('videoPlayer');
  if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) {} }
  if (playerPage) { playerPage.classList.remove('show'); playerPage.style.display = 'none'; }
  document.body.classList.remove('player-open');
  stopStreamMonitor();
  Sound.close();

  if (currentGroupId) {
    var g = (typeof getGroupById === 'function') ? getGroupById(currentGroupId) : null;
    if (g) renderGroupChannels(g);
  }
}

/* ================================================================
   21-23. المفضلة والسجل
   ================================================================ */
function renderFavorites() {
  var grid = document.getElementById('channelsGrid');
  if (!grid) return;

  var allChannels = (typeof getAllChannels === 'function') ? getAllChannels() : [];
  var favChannels = allChannels.filter(function (c) { return favorites.indexOf(c.id) > -1; });

  var header = renderScreenHeader('المفضلة', favChannels.length + ' قناة في المفضلة', 'backToMainTab()');

  if (favChannels.length === 0) {
    grid.innerHTML = header + renderEmptyState('star', 'لا توجد مفضلات', 'أضف قنواتك المفضلة بالضغط على نجمة البطاقة.');
    return;
  }

  renderChannelList(favChannels, header);
}

function renderRecent() {
  var grid = document.getElementById('channelsGrid');
  if (!grid) return;

  var allChannels = (typeof getAllChannels === 'function') ? getAllChannels() : [];
  var recentList = recentChannels.map(function (id) {
    return allChannels.find(function (c) { return c.id === id; });
  }).filter(Boolean);

  var header = renderScreenHeader('الأخيرة', recentList.length + ' قناة شوهدت مؤخراً', 'backToMainTab()');

  if (recentList.length === 0) {
    grid.innerHTML = header + renderEmptyState('clock', 'لا توجد سجلات', 'القنوات التي تشاهدها ستظهر هنا.');
    return;
  }

  renderChannelList(recentList, header);
}

function renderChannelList(channels, headerHtml) {
  var grid = document.getElementById('channelsGrid');
  if (!grid) return;

  var html = headerHtml || '';

  channels.forEach(function (ch) {
    var isFav = favorites.indexOf(ch.id) > -1;
    var logoHtml = ch.logo
      ? '<img src="' + ch.logo + '" alt="' + ch.name_ar + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="logo-placeholder" style="display:none;">' + (ch.letter || getIcon('tv')) + '</div>'
      : '<div class="logo-placeholder">' + (ch.letter || getIcon('tv')) + '</div>';

    var accent = '#00e676';
    var accent2 = '#00b248';
    var favIcon = isFav ? getIcon('starFilled') : getIcon('star');

    html +=
      '<div class="channel-card" data-channel-id="' + ch.id + '">' +
        '<button class="channel-fav ' + (isFav ? 'active' : '') + '" data-fav-id="' + ch.id + '" aria-label="مفضلة">' + favIcon + '</button>' +
        '<div class="channel-logo">' + logoHtml +
          '<span class="status-badge" style="background:linear-gradient(135deg,' + accent + ',' + accent2 + ');">LIVE</span>' +
        '</div>' +
        '<div class="channel-name">' + ch.name_ar + '</div>' +
      '</div>';
  });
  grid.innerHTML = html;

  grid.querySelectorAll('.channel-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.channel-fav')) return;
      openChannel(card.dataset.channelId);
    });
  });

  grid.querySelectorAll('.channel-fav').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleFavorite(btn.dataset.favId);
      if (currentView === 'favorites') renderFavorites();
      else if (currentView === 'recent') renderRecent();
    });
  });
}

/* ================================================================
   24. Favorites & Recent Storage
   ================================================================ */
function loadFavorites() {
  try { favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
  catch (e) { favorites = []; }
}

function saveFavorites() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch (e) {}
}

function toggleFavorite(id) {
  var idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    showToast('تمت الإزالة من المفضلة', 'info');
    Sound.remove();
  } else {
    favorites.push(id);
    showToast('تمت الإضافة للمفضلة', 'success');
    Sound.favorite();
  }
  saveFavorites();
  haptic(12);
}

function loadRecent() {
  try { recentChannels = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch (e) { recentChannels = []; }
}

function addToRecent(id) {
  recentChannels = recentChannels.filter(function (x) { return x !== id; });
  recentChannels.unshift(id);
  recentChannels = recentChannels.slice(0, 20);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentChannels)); } catch (e) {}
}

/* ================================================================
   25. Drawer
   ================================================================ */
function openDrawer() {
  var d = document.getElementById('drawer');
  var o = document.getElementById('drawerOverlay');
  if (d) d.classList.add('show');
  if (o) o.classList.add('show');
  Sound.open();
  haptic(8);
}

function closeDrawer() {
  var d = document.getElementById('drawer');
  var o = document.getElementById('drawerOverlay');
  var wasOpen = d && d.classList.contains('show');
  if (d) d.classList.remove('show');
  if (o) o.classList.remove('show');
  if (wasOpen) Sound.close();
}

/* ================================================================
   26. Themes
   ================================================================ */
function loadTheme() { applyTheme(localStorage.getItem(THEME_KEY) || 'crimson'); }

function applyTheme(theme) {
  if (theme === 'black') document.body.classList.add('theme-black');
  else document.body.classList.remove('theme-black');
}

function toggleTheme() {
  var isBlack = document.body.classList.toggle('theme-black');
  localStorage.setItem(THEME_KEY, isBlack ? 'black' : 'crimson');
  renderThemeGrid();
  closeDrawer();
  Sound.tap();
  haptic(10);
}

function renderThemeGrid() {
  var grid = document.getElementById('themeGrid');
  if (!grid) return;

  var current = localStorage.getItem(THEME_KEY) || 'crimson';
  if (current === 'red') current = 'crimson';

  var themes = [
    { id: 'crimson', name: 'أحمر نيون', color: '#ff2d55', bg: '#0a0a0f', icon: 'zap' },
    { id: 'black',   name: 'أسود نقي',  color: '#ffffff', bg: '#000000', icon: 'diamond' }
  ];

  var html = '';
  themes.forEach(function (t) {
    var active = t.id === current;
    var borderStyle = active ? 'border-color:rgba(255,255,255,0.9);' : 'border-color:rgba(255,255,255,0.1);opacity:0.7;';

    html +=
      '<button onclick="setTheme(\'' + t.id + '\')" style="aspect-ratio:1.6;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:2.5px solid;background:linear-gradient(135deg,' + t.bg + ' 45%,' + t.color + ' 130%);color:#fff;font-weight:800;font-size:13px;font-family:inherit;position:relative;' + borderStyle + '">' +
        '<div style="width:28px;height:28px;color:' + t.color + ';margin-bottom:6px;">' + getIcon(t.icon) + '</div>' +
        '<div style="font-size:12px;letter-spacing:0.5px;">' + t.name + '</div>' +
        (active ? '<div style="position:absolute;top:8px;right:8px;width:20px;height:20px;background:' + t.color + ';border-radius:50%;display:flex;align-items:center;justify-content:center;color:#000;"><div style="width:12px;height:12px;">' + getIcon('check') + '</div></div>' : '') +
      '</button>';
  });

  grid.innerHTML = html;
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  renderThemeGrid();
  showToast(theme === 'crimson' ? 'تم تطبيق الثيم الأحمر' : 'تم تطبيق الثيم الأسود', 'success');
  Sound.success();
  haptic(12);
}

/* ================================================================
   27-30. الإعدادات والإشعارات
   ================================================================ */
function getNotifSettings() {
  try {
    return Object.assign({}, DEFAULT_NOTIF_SETTINGS, JSON.parse(localStorage.getItem(NOTIF_SETTINGS_KEY) || '{}'));
  } catch (e) { return Object.assign({}, DEFAULT_NOTIF_SETTINGS); }
}

function saveNotifSettings(s) {
  try { localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

function getMatchReminderTime() {
  if (typeof window.getMatchReminderTime === 'function' && window.getMatchReminderTime !== getMatchReminderTime) {
    try {
      var t = window.getMatchReminderTime();
      if (typeof t === 'number' && t > 0) return t;
    } catch (e) {}
  }
  var t2 = parseInt(localStorage.getItem(MATCH_TIME_KEY) || '30', 10);
  return isNaN(t2) ? 30 : t2;
}

async function toggleNotifSetting(key) {
  var settings = getNotifSettings();
  var newValue = !settings[key];

  var notifKeys = ['general', 'matches', 'breaking', 'newchannels', 'streamOffline'];
  var isNotifKey = notifKeys.indexOf(key) > -1;

  if (newValue && isNotifKey && !areNotificationsEnabled()) {
    showToast('جارٍ طلب إذن الإشعارات...', 'info');
    var granted = await requestNotificationPermissionUnified();
    if (!granted) {
      showToast('يجب السماح بالإشعارات أولاً', 'warning');
      Sound.warning();
      updateNotifToggles();
      return;
    }
  }

  settings[key] = newValue;
  saveNotifSettings(settings);

  if (key === 'dnd') updateDNDIndicator(newValue);

  if (key === 'matches' && typeof window.startMatchReminders === 'function') {
    if (newValue && areNotificationsEnabled()) {
      window.startMatchReminders();
    } else if (!newValue && typeof window.stopMatchReminders === 'function') {
      window.stopMatchReminders();
    }
  }

  updateNotifToggles();
  Sound.toggle();
  haptic(10);
}

function updateNotifToggles() {
  var settings = getNotifSettings();

  ['general', 'matches', 'breaking', 'newchannels', 'streamOffline', 'dnd'].forEach(function (key) {
    var el = document.getElementById('toggle-notif-' + key);
    if (el) el.classList.toggle('on', settings[key] === true);
  });

  var timeBtn = document.getElementById('changeMatchTimeBtn');
  if (timeBtn) timeBtn.style.display = settings.matches ? 'flex' : 'none';

  var timeLabel = document.getElementById('currentMatchTimeValue');
  if (timeLabel) {
    var mins = getMatchReminderTime();
    var opt = TIME_OPTIONS.find(function (o) { return o.id === mins; });
    timeLabel.textContent = opt ? opt.label : (mins + ' دقيقة');
  }

  var reqBtn = document.getElementById('requestNotifPermissionBtn');
  if (reqBtn) {
    var hideReqBtn = false;

    if (__H90_IS_APK__ && window.H90Firebase && typeof window.H90Firebase.hasCapacitorPush === 'function' && window.H90Firebase.hasCapacitorPush()) {
      var status = window.H90Firebase.getStatus ? window.H90Firebase.getStatus() : {};
      if (status.hasNativeToken) hideReqBtn = true;
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      hideReqBtn = true;
    }

    reqBtn.style.display = hideReqBtn ? 'none' : 'flex';
  }
}

function updateDNDIndicator(isOn) {
  var indicator = document.getElementById('dndIndicator');
  if (indicator) indicator.classList.toggle('show', isOn);
}

function initDNDState() {
  updateDNDIndicator(getNotifSettings().dnd === true);
}

async function requestNotificationPermission() {
  await requestNotificationPermissionUnified();
}

async function sendLocalNotification(title, body, extra) {
  if (__H90_IS_APK__ && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    try {
      var LN = window.Capacitor.Plugins.LocalNotifications;

      if (typeof LN.requestPermissions === 'function') {
        try { await LN.requestPermissions(); } catch (e) {}
      }

      await LN.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 1000000),
          title: title,
          body: body,
          schedule: { at: new Date(Date.now() + 500) },
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: extra || { type: 'h90_notification' }
        }]
      });
      return true;
    } catch (e) {
      console.warn('Capacitor LN failed:', e.message);
    }
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    var n = new Notification(title, {
      body: body,
      icon: 'H90.jpg',
      badge: 'H90.jpg',
      dir: 'rtl',
      lang: 'ar',
      tag: 'h90-' + Date.now()
    });

    n.onclick = function() {
      try { window.focus(); } catch (e) {}
      n.close();
    };

    setTimeout(function() { try { n.close(); } catch (e) {} }, 8000);

    return true;
  } catch (e) {
    console.error('Web Notification failed:', e.message);
    return false;
  }
}

/* ================================================================
   31. Stream Monitor
   ================================================================ */
var streamMonitorInterval = null;
var lastStreamState = null;

function startStreamMonitor(channel) {
  stopStreamMonitor();
  lastStreamState = null;

  streamMonitorInterval = setInterval(function () {
    var video = document.getElementById('videoPlayer');
    if (!video) return;

    var settings = getNotifSettings();
    if (!settings.streamOffline) return;

    var isStalled = video.readyState < 2 && !video.paused;

    if (isStalled && lastStreamState === 'live') {
      sendLocalNotification('انقطع البث', channel.name_ar, {
        type: 'stream_offline',
        channelId: channel.id
      });
      lastStreamState = 'offline';
    } else if (video.readyState >= 2) {
      lastStreamState = 'live';
    }
  }, 8000);
}

function stopStreamMonitor() {
  if (streamMonitorInterval) { clearInterval(streamMonitorInterval); streamMonitorInterval = null; }
}

/* ================================================================
   32. Time Picker
   ================================================================ */
function openTimePicker() {
  var modal = document.getElementById('timePickerModal');
  var list = document.getElementById('timeOptionsList');
  if (!modal || !list) return;

  var current = getMatchReminderTime();

  list.innerHTML = TIME_OPTIONS.map(function (opt) {
    var selected = opt.id === current ? 'selected' : '';
    return '<button class="time-option ' + selected + '" onclick="selectMatchTime(' + opt.id + ')"><span>' + opt.label + '</span><span class="check"></span></button>';
  }).join('');

  modal.classList.add('show');
  Sound.open();
}

function closeTimePicker() {
  var m = document.getElementById('timePickerModal');
  if (m) m.classList.remove('show');
  Sound.close();
}

function selectMatchTime(minutes) {
  var mins = parseInt(minutes, 10);
  if (isNaN(mins) || mins < 1) return;

  if (typeof window.saveMatchReminderTime === 'function') {
    try {
      window.saveMatchReminderTime(mins);
    } catch (e) {
      console.warn('saveMatchReminderTime failed:', e);
      try { localStorage.setItem(MATCH_TIME_KEY, String(mins)); } catch (e2) {}
    }
  } else {
    try { localStorage.setItem(MATCH_TIME_KEY, String(mins)); } catch (e) {}
  }

  var opt = TIME_OPTIONS.find(function (o) { return o.id === mins; });
  showToast('وقت التذكير: ' + (opt ? opt.label : mins), 'success');
  closeTimePicker();
  updateNotifToggles();
  Sound.success();
  haptic(12);

  try {
    window.dispatchEvent(new CustomEvent('h90:reminder:time-changed', {
      detail: { minutes: mins }
    }));
  } catch (e) {}

  if (typeof window.checkMatchesForReminders === 'function') {
    setTimeout(window.checkMatchesForReminders, 500);
  }
}

/* ================================================================
   33. Settings
   ================================================================ */
function openSettings() {
  closeDrawer();
  renderThemeGrid();
  loadSettingToggles();
  updateNotifToggles();

  if (typeof window.updateTeamsCountLabel === 'function') {
    window.updateTeamsCountLabel();
  }

  var m = document.getElementById('settingsModal');
  if (m) m.classList.add('show');
  Sound.open();
  haptic(10);
}

function closeSettings() {
  var m = document.getElementById('settingsModal');
  if (m) m.classList.remove('show');
  if (_currentRenderedTab === 'settings') _currentRenderedTab = null;
  Sound.close();
}

function loadSettingToggles() {
  try {
    var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    var ta = document.getElementById('toggle-autoplay');
    if (ta) ta.classList.toggle('on', s.autoplay !== false);
  } catch (e) {}
  updateNotifToggles();
}

function toggleSetting(key) {
  var s = {};
  try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) {}
  s[key] = !s[key];
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  var el = document.getElementById('toggle-' + key);
  if (el) el.classList.toggle('on', s[key]);
  Sound.toggle();
  haptic(10);
}

function clearAppCache() {
  if (!confirm('هل تريد مسح كل البيانات؟')) return;
  if (typeof clearM3UCache === 'function') clearM3UCache();
  if (typeof window.clearMatchesCache === 'function') window.clearMatchesCache();
  if (typeof clearServer2Cache === 'function') clearServer2Cache();
  localStorage.clear();
  sessionStorage.clear();
  Sound.error();
  location.reload();
}

/* ================================================================
   34. Search
   ================================================================ */
var searchDebounceTimer = null;

function openSearchOverlay() {
  var o = document.getElementById('searchOverlay');
  if (o) o.classList.add('show');
  setTimeout(function () {
    var i = document.getElementById('searchOverlayInput');
    if (i) i.focus();
  }, 100);
  renderSearchBody('');
  Sound.open();
}

function closeSearchOverlay() {
  var o = document.getElementById('searchOverlay');
  var wasOpen = o && o.classList.contains('show');
  if (o) o.classList.remove('show');
  if (wasOpen) Sound.close();
}

function handleSearchOverlay(q) {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(function () { renderSearchBody(q); }, 120);
}

function renderSearchBody(q) {
  var body = document.getElementById('searchOverlayBody');
  if (!body) return;

  q = (q || '').trim();

  if (!q) {
    body.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.35);"><div style="width:60px;height:60px;margin:0 auto 16px;opacity:0.5;color:#ff2d55;">' + getIcon('search') + '</div><div style="font-weight:700;font-size:14px;">ابحث عن قناة</div></div>';
    return;
  }

  var results = (typeof getAllChannels === 'function' ? getAllChannels() : []).filter(function (ch) {
    return ch.name_ar.toLowerCase().indexOf(q.toLowerCase()) > -1;
  });

  if (results.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.4);"><div style="width:60px;height:60px;margin:0 auto 16px;opacity:0.4;color:#ff2d55;">' + getIcon('search') + '</div><div style="font-weight:800;font-size:15px;color:#fff;margin-bottom:6px;">لا نتائج</div><div style="font-size:12px;">لم يتم العثور على "' + q + '"</div></div>';
    return;
  }

  var html = '<div style="color:rgba(255,255,255,0.55);font-size:12px;font-weight:800;padding:12px 4px 10px;display:flex;align-items:center;gap:8px;"><div style="width:14px;height:14px;">' + getIcon('tv') + '</div><span>' + results.length + ' نتيجة</span></div>';

  results.slice(0, 50).forEach(function (ch) {
    var safeId = ch.id.replace(/'/g, "\\'");
    var isFav = favorites.indexOf(ch.id) > -1;
    var accent = '#00e676';

    html +=
      '<button onclick="selectSearch(\'' + safeId + '\')" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;color:#fff;cursor:pointer;font-family:inherit;text-align:right;width:100%;margin-bottom:8px;">' +
        '<div style="width:42px;height:42px;background:rgba(' + hexToRgb(accent) + ',0.15);border:1px solid rgba(' + hexToRgb(accent) + ',0.3);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + accent + ';">' +
          '<div style="width:20px;height:20px;">' + getIcon('tv') + '</div>' +
        '</div>' +
        '<div style="flex:1;text-align:right;">' +
          '<div style="font-weight:700;font-size:13px;color:#fff;">' + ch.name_ar + '</div>' +
          '<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;">' + (ch.group || '') + '</div>' +
        '</div>' +
        (isFav ? '<div style="width:16px;height:16px;color:#ffb300;flex-shrink:0;">' + getIcon('starFilled') + '</div>' : '') +
      '</button>';
  });

  body.innerHTML = html;
}

function selectSearch(id) {
  Sound.tap();
  closeSearchOverlay();
  setTimeout(function () { openChannel(id); }, 250);
}

/* ================================================================
   35. Notifications
   ================================================================ */
async function fetchH90Notifications() {
  try {
    const res = await fetch(NOTIF_API + '/notifications?limit=50', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.notifications || [];
  } catch (e) {
    console.error('فشل تحميل الإشعارات:', e);
    return null;
  }
}

async function openNotifDrawer() {
  var body = document.getElementById('notifDrawerBody');
  var d = document.getElementById('notifDrawer');
  var b = document.getElementById('notifBadge');

  if (d) d.classList.add('show');
  if (b) b.style.display = 'none';

  if (body) {
    body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;color:rgba(255,255,255,0.5);"><div style="width:50px;height:50px;border-radius:50%;border:3px solid rgba(255,45,85,0.2);border-top-color:#ff2d55;animation:spin 1s linear infinite;margin-bottom:18px;"></div><div style="font-weight:700;font-size:14px;">جارٍ تحميل الإشعارات...</div></div>';
  }

  Sound.open();
  haptic(8);

  var notifs = await fetchH90Notifications();

  if (notifs === null) {
    if (body) {
      body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;"><div style="width:70px;height:70px;border-radius:22px;background:rgba(255,45,85,0.1);border:1px solid rgba(255,45,85,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:18px;color:#ff2d55;"><div style="width:32px;height:32px;">' + getIcon('alert') + '</div></div><div style="font-weight:800;color:#fff;font-size:15px;margin-bottom:6px;">فشل تحميل الإشعارات</div><div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px;">تحقق من اتصالك بالإنترنت</div><button onclick="openNotifDrawer()" style="padding:10px 24px;background:linear-gradient(135deg,#ff2d55,#e6003d);color:#fff;border:none;border-radius:12px;font-weight:800;font-family:inherit;cursor:pointer;font-size:13px;">إعادة المحاولة</button></div>';
    }
    return;
  }

  if (notifs.length === 0) {
    if (body) {
      body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;color:rgba(255,255,255,0.4);"><div style="width:80px;height:80px;border-radius:24px;background:rgba(255,45,85,0.1);border:1px solid rgba(255,45,85,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:18px;color:#ff2d55;"><div style="width:36px;height:36px;">' + getIcon('bell') + '</div></div><div style="font-weight:800;color:#fff;font-size:15px;margin-bottom:6px;">لا توجد إشعارات</div><div style="font-size:12px;">ستظهر الإشعارات هنا عند وصولها</div></div>';
    }
    return;
  }

  var html = '';
  notifs.forEach(function (n) {
    var d2 = new Date(n.timestamp);
    var timeStr = d2.toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    var isNew = (Date.now() - n.timestamp) < 86400000;

    html +=
      '<div style="background:rgba(255,255,255,0.04);border:1px solid ' + (isNew ? 'rgba(255,45,85,0.4)' : 'rgba(255,255,255,0.08)') + ';border-radius:14px;padding:14px;margin-bottom:10px;position:relative;">' +
        (isNew ? '<div style="position:absolute;top:12px;left:12px;width:8px;height:8px;background:#ff2d55;border-radius:50%;"></div>' : '') +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:28px;height:28px;border-radius:10px;background:linear-gradient(135deg,#ff2d55,#e6003d);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="width:14px;height:14px;color:#fff;">' + getIcon('bell') + '</div></div><div style="font-weight:800;color:#fff;font-size:14px;flex:1;text-align:right;">' + n.title + '</div></div>' +
        '<div style="color:rgba(255,255,255,0.75);font-size:13px;line-height:1.7;margin-bottom:10px;text-align:right;word-wrap:break-word;">' + n.body + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:rgba(255,255,255,0.4);"><span>' + timeStr + '</span>' + (n.url && n.url !== '/' ? '<a href="' + n.url + '" target="_blank" style="color:#00e5ff;font-weight:700;text-decoration:none;">فتح الرابط</a>' : '') + '</div>' +
      '</div>';
  });

  if (body) body.innerHTML = html;
  try { localStorage.setItem(LAST_SEEN_NOTIF_KEY, Date.now().toString()); } catch (e) {}
}

async function checkNewH90Notifications() {
  try {
    var settings = getNotifSettings ? getNotifSettings() : {};
    if (settings.dnd === true) return;
    if (settings.general === false) return;

    var lastSeen = parseInt(localStorage.getItem(LAST_SEEN_NOTIF_KEY) || '0', 10);
    var notifs = await fetchH90Notifications();

    if (notifs && notifs.length > 0) {
      var latest = notifs[0].timestamp;
      var badge = document.getElementById('notifBadge');
      if (badge) {
        if (latest > lastSeen) badge.style.display = 'block';
        else badge.style.display = 'none';
      }
    }
  } catch (e) {}
}

function closeNotifDrawer() {
  var d = document.getElementById('notifDrawer');
  var wasOpen = d && d.classList.contains('show');
  if (d) d.classList.remove('show');
  if (wasOpen) Sound.close();
}

/* ================================================================
   36. Notification Polling
   ================================================================ */
let notifCheckInterval = null;

function startNotifPolling() {
  if (notifCheckInterval) clearInterval(notifCheckInterval);
  notifCheckInterval = setInterval(function () {
    if (!document.hidden) checkNewH90Notifications();
  }, 120000);
}

function stopNotifPolling() {
  if (notifCheckInterval) { clearInterval(notifCheckInterval); notifCheckInterval = null; }
}

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    stopNotifPolling();
  } else {
    startNotifPolling();
    checkNewH90Notifications();
  }
});

startNotifPolling();

/* ================================================================
   37. showToast
   ================================================================ */
function showToast(msg, type) {
  var existing = document.querySelector('.toast.h90-toast-new');
  if (existing) existing.remove();

  var typeMap = {
    success: { icon: 'check', accent: '#00e676' },
    error:   { icon: 'alert', accent: '#ff2d55' },
    warning: { icon: 'alert', accent: '#ffb300' },
    info:    { icon: 'info',  accent: '#00e5ff' }
  };
  var cfg = typeMap[type] || typeMap.info;

  var t = document.createElement('div');
  t.className = 'toast h90-toast-new ' + (type || '');
  t.style.cssText =
    'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);' +
    'background:rgba(20,20,28,0.98);color:#fff;padding:12px 20px 12px 16px;border-radius:16px;font-size:13px;font-weight:700;' +
    'box-shadow:0 15px 45px rgba(0,0,0,0.5);border:1px solid rgba(' + hexToRgb(cfg.accent) + ',0.4);' +
    'opacity:0;transition:opacity 0.3s,transform 0.3s;z-index:99999;max-width:90%;display:flex;align-items:center;gap:10px;pointer-events:none;';

  var iconWrap = document.createElement('div');
  iconWrap.style.cssText = 'width:26px;height:26px;border-radius:50%;background:' + cfg.accent + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;';
  var iconInner = document.createElement('div');
  iconInner.style.cssText = 'width:14px;height:14px;color:#fff;';
  iconInner.innerHTML = getIcon(cfg.icon);
  iconWrap.appendChild(iconInner);

  var textSpan = document.createElement('span');
  textSpan.textContent = msg;

  t.appendChild(iconWrap);
  t.appendChild(textSpan);
  document.body.appendChild(t);

  setTimeout(function () {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  setTimeout(function () {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(function () { t.remove(); }, 350);
  }, 2600);
}
window.showToast = showToast;

/* ================================================================
   38. refreshAll
   ================================================================ */
function refreshAll() {
  showToast('جارٍ التحديث...', 'info');
  Sound.tap();

  if (typeof window.clearMatchesCache === 'function') window.clearMatchesCache();
  if (typeof clearServer2Cache === 'function') clearServer2Cache();

  if (currentView === 'groups') renderGroupsScreen();
  else if (currentView === 'channels' && currentGroupId) {
    var g = (typeof getGroupById === 'function') ? getGroupById(currentGroupId) : null;
    if (g) renderGroupChannels(g);
  } else if (currentView === 'matches') {
    if (typeof window.renderMatches === 'function') window.renderMatches();
  } else if (currentView === 'entertainment-menu') {
    if (typeof window.renderEntertainmentScreen === 'function') {
      window.renderEntertainmentScreen();
    }
  }
  haptic(10);
}

/* ================================================================
   39. Help / Contact
   ================================================================ */
function openHelp() {
  closeDrawer();
  var m = document.getElementById('helpModal');
  if (m) m.classList.add('show');
  Sound.open();
}

function closeHelp() {
  var m = document.getElementById('helpModal');
  if (m) m.classList.remove('show');
  Sound.close();
}

function openContact() {
  closeHelp();
  var m = document.getElementById('contactModal');
  if (m) m.classList.add('show');
  Sound.open();
}

function closeContact() {
  var m = document.getElementById('contactModal');
  if (m) m.classList.remove('show');
  Sound.close();
}

/* ================================================================
   40. FAQ — يستخدم h90-faq-expanded.js
   ================================================================ */

const FAQ_CATEGORY_ICONS = {
  'عام':                 'info',
  'المشاهدة':            'tv',
  'المفضلة':             'star',
  'الإشعارات':           'bell',
  'التخصيص':             'palette',
  'الدعم':               'help',
  'الأخطاء':             'alert',
  'الميزات':             'zap',
  'المشغل':              'play'
};

const FAQ_CATEGORY_COLORS = {
  'عام':                 { accent: '#3b82f6', accent2: '#2563eb' },
  'المشاهدة':            { accent: '#ff2d55', accent2: '#e6003d' },
  'المفضلة':             { accent: '#ffb300', accent2: '#ff8f00' },
  'الإشعارات':           { accent: '#00e676', accent2: '#00b248' },
  'التخصيص':             { accent: '#a855f7', accent2: '#9333ea' },
  'الدعم':               { accent: '#00e5ff', accent2: '#007bff' },
  'الأخطاء':             { accent: '#ef4444', accent2: '#dc2626' },
  'الميزات':             { accent: '#f59e0b', accent2: '#d97706' },
  'المشغل':              { accent: '#8b5cf6', accent2: '#7c3aed' }
};

function openFAQ() {
  closeHelp();

  var FAQ_DATA = (window.H90_FAQ_DATA || []);

  if (!FAQ_DATA || FAQ_DATA.length === 0) {
    console.warn('[H90] h90-faq-expanded.js غير محمّل');
    FAQ_DATA = [
      { cat: 'عام', q: 'ما هو تطبيق H90؟', a: 'H90 هو تطبيق مجاني لمشاهدة القنوات الرياضية والمباريات بث مباشر بجودة عالية.' },
      { cat: 'عام', q: 'هل التطبيق مجاني؟', a: 'نعم، التطبيق مجاني بالكامل ولا يتطلب أي رسوم اشتراك.' }
    ];
  }

  var categories = [];
  var grouped = {};
  FAQ_DATA.forEach(function (f) {
    if (!grouped[f.cat]) {
      grouped[f.cat] = [];
      categories.push(f.cat);
    }
    grouped[f.cat].push(f);
  });

  var html = '';

  /* Header */
  html +=
    '<div style="background:linear-gradient(135deg,rgba(255,45,85,0.15),rgba(0,229,255,0.08));border:1px solid rgba(255,45,85,0.35);border-radius:16px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:14px;">' +
      '<div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#ff2d55,#e6003d);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 24px rgba(255,45,85,0.45);">' +
        '<div style="width:26px;height:26px;color:#fff;">' + getIcon('bookOpen') + '</div>' +
      '</div>' +
      '<div style="flex:1;text-align:right;">' +
        '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">' + FAQ_DATA.length + ' سؤالاً في ' + categories.length + ' أقسام</div>' +
        '<div style="font-size:11.5px;color:rgba(255,255,255,0.6);">جميع الأسئلة الشائعة مصنّفة في مكان واحد</div>' +
      '</div>' +
    '</div>';

  /* زر AI */
  html +=
    '<button onclick="openAIAssistantFromFAQ()" ' +
      'style="width:100%;padding:14px 18px;background:linear-gradient(135deg,rgba(0,230,118,0.15),rgba(0,229,255,0.1));border:1px solid rgba(0,230,118,0.4);border-radius:14px;color:#fff;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer;margin-bottom:22px;display:flex;align-items:center;justify-content:center;gap:10px;">' +
      '<div style="width:22px;height:22px;color:#00e676;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="3" y="8" width="18" height="12" rx="2"/>' +
          '<circle cx="9" cy="14" r="1.2" fill="currentColor"/>' +
          '<circle cx="15" cy="14" r="1.2" fill="currentColor"/>' +
          '<path d="M9 17h6"/>' +
          '<line x1="12" y1="8" x2="12" y2="4"/>' +
          '<circle cx="12" cy="3" r="1.5" fill="currentColor"/>' +
        '</svg>' +
      '</div>' +
      '<span>اسأل المساعد الذكي بدلاً من البحث</span>' +
    '</button>';

  /* Categories */
  categories.forEach(function (cat) {
    var items = grouped[cat];
    var iconName = FAQ_CATEGORY_ICONS[cat] || 'info';
    var colors = FAQ_CATEGORY_COLORS[cat] || { accent: '#3b82f6', accent2: '#2563eb' };

    html += '<div style="margin-bottom:22px;">';

    html +=
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:10px 4px;">' +
        '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,' + colors.accent + ',' + colors.accent2 + ');display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 18px rgba(' + hexToRgb(colors.accent) + ',0.35);">' +
          '<div style="width:20px;height:20px;color:#fff;">' + getIcon(iconName) + '</div>' +
        '</div>' +
        '<div style="flex:1;text-align:right;">' +
          '<div style="font-size:15px;font-weight:900;color:#fff;">' + cat + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">' + items.length + ' أسئلة</div>' +
        '</div>' +
      '</div>';

    items.forEach(function (f) {
      var safeQ = String(f.q || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var safeA = String(f.a || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      html +=
        '<div style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:10px;padding:14px;transition:all 0.25s;" ' +
          'onmouseover="this.style.background=\'rgba(' + hexToRgb(colors.accent) + ',0.06)\';this.style.borderColor=\'rgba(' + hexToRgb(colors.accent) + ',0.28)\'" ' +
          'onmouseout="this.style.background=\'rgba(255,255,255,0.035)\';this.style.borderColor=\'rgba(255,255,255,0.08)\'">' +
          '<div style="font-weight:800;color:#fff;font-size:13px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;line-height:1.45;">' +
            '<span style="width:24px;height:24px;min-width:24px;border-radius:8px;background:linear-gradient(135deg,' + colors.accent + ',' + colors.accent2 + ');display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">' +
              '<span style="width:12px;height:12px;color:#fff;">' + getIcon('help') + '</span>' +
            '</span>' +
            '<span>' + safeQ + '</span>' +
          '</div>' +
          '<div style="color:rgba(255,255,255,0.72);font-size:12.5px;line-height:1.75;padding-right:34px;">' + safeA + '</div>' +
        '</div>';
    });

    html += '</div>';
  });

  /* Contact */
  html +=
    '<div style="text-align:center;padding:28px 16px;border-top:1px solid rgba(255,255,255,0.08);margin-top:20px;">' +
      '<div style="width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,rgba(255,45,85,0.2),rgba(255,45,85,0.05));border:1px solid rgba(255,45,85,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:#ff4d6d;">' +
        '<div style="width:28px;height:28px;">' + getIcon('message') + '</div>' +
      '</div>' +
      '<div style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:800;margin-bottom:6px;">هل لديك سؤال آخر؟</div>' +
      '<div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:16px;">فريق الدعم جاهز لمساعدتك في أي وقت</div>' +
      '<button onclick="openFAQContact()" style="display:inline-flex;align-items:center;gap:8px;padding:12px 26px;background:linear-gradient(135deg,#ff2d55,#e6003d);color:#fff;border:none;border-radius:24px;font-weight:800;font-family:inherit;cursor:pointer;font-size:13px;box-shadow:0 8px 24px rgba(255,45,85,0.45);">' +
        '<span style="width:16px;height:16px;display:inline-block;">' + getIcon('message') + '</span>' +
        '<span>تواصل مع الدعم</span>' +
      '</button>' +
    '</div>';

  var c = document.getElementById('faqContent');
  if (c) c.innerHTML = html;

  var m = document.getElementById('faqModal');
  if (m) m.classList.add('show');
  Sound.open();
}

function openAIAssistantFromFAQ() {
  closeFAQ();
  setTimeout(function () {
    if (window.H90AI && typeof window.H90AI.open === 'function') {
      window.H90AI.open();
    } else {
      showToast('المساعد الذكي غير متاح', 'warning');
    }
  }, 200);
}

function openFAQContact() {
  closeFAQ();
  setTimeout(function () {
    var m = document.getElementById('contactModal');
    if (m) m.classList.add('show');
    Sound.open();
  }, 200);
}

function closeFAQ() {
  var m = document.getElementById('faqModal');
  if (m) m.classList.remove('show');
  Sound.close();
}

/* ================================================================
   41. shareApp
   ================================================================ */
async function shareApp() {
  var shareData = {
    title: 'H90 — البث المباشر',
    text: 'شاهد قنواتك المفضلة بث مباشر بجودة عالية',
    url: window.location.href
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (e) {}
  }
  closeDrawer();
  Sound.tap();
}

/* ================================================================
   42. Player Bindings
   ================================================================ */
window.togglePlay       = function () { return window.PlayerEngine && window.PlayerEngine.togglePlay(); };
window.seekBy           = function (s) { return window.PlayerEngine && window.PlayerEngine.seekBy(s); };
window.seekFromClick    = function (e) { return window.PlayerEngine && window.PlayerEngine.seekFromClick(e); };
window.toggleMute       = function () { return window.PlayerEngine && window.PlayerEngine.toggleMute(); };
window.cycleSpeed       = function () { return window.PlayerEngine && window.PlayerEngine.cycleSpeed(); };
window.toggleFullscreen = function () { return window.PlayerEngine && window.PlayerEngine.toggleFullscreen(); };
window.reloadStream     = function () { return window.PlayerEngine && window.PlayerEngine.reloadStream(); };
window.closePlayer      = closePlayer;

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeSearchOverlay(); closeSettings(); closeNotifDrawer(); closeDrawer();
    closeHelp(); closeFAQ(); closeContact(); closeTimePicker();
    if (typeof window.closeTeamsPicker === 'function') window.closeTeamsPicker();
    if (typeof window.closeRoomsScreen === 'function') window.closeRoomsScreen();
  }
});

/* ================================================================
   43. loadM3UFromWorker
   ================================================================ */
async function loadM3UFromWorker(forceReload) {
  console.log('تحميل قنوات Server 2...');

  let s2 = { channels: [], groups: [] };
  try {
    if (typeof loadServer2Channels === 'function') {
      const result = await loadServer2Channels(forceReload);
      s2 = result || { channels: [], groups: [] };
    }
  } catch (e) {
    console.error('Server 2 فشل:', e);
  }

  CHANNELS_DATA = (s2.channels) || [];
  CHANNEL_GROUPS = (s2.groups) || [];

  return true;
}

/* ================================================================
   44. جسر النقر
   ================================================================ */
function onGroupSelect(groupId, serverId) {
  openGroup(groupId);
}

function onChannelSelect(channelId, serverId) {
  openChannel(channelId);
}

window.onGroupSelect   = onGroupSelect;
window.onChannelSelect = onChannelSelect;

/* ================================================================
   45. Global Exports
   ================================================================ */
window.loadM3UFromWorker              = loadM3UFromWorker;
window.openDrawer                    = openDrawer;
window.closeDrawer                   = closeDrawer;
window.openSettings                  = openSettings;
window.closeSettings                 = closeSettings;
window.toggleSetting                 = toggleSetting;
window.setTheme                      = setTheme;
window.toggleTheme                   = toggleTheme;
window.clearAppCache                 = clearAppCache;
window.openHelp                      = openHelp;
window.closeHelp                     = closeHelp;
window.openFAQ                       = openFAQ;
window.closeFAQ                      = closeFAQ;
window.openFAQContact                = openFAQContact;
window.openAIAssistantFromFAQ        = openAIAssistantFromFAQ;
window.openContact                   = openContact;
window.closeContact                  = closeContact;
window.shareApp                      = shareApp;
window.openSearchOverlay             = openSearchOverlay;
window.closeSearchOverlay            = closeSearchOverlay;
window.handleSearchOverlay           = handleSearchOverlay;
window.selectSearch                  = selectSearch;
window.openSearch                    = openSearchOverlay;
window.closeSearch                   = closeSearchOverlay;
window.openNotifDrawer               = openNotifDrawer;
window.closeNotifDrawer              = closeNotifDrawer;
window.fetchH90Notifications         = fetchH90Notifications;
window.checkNewH90Notifications      = checkNewH90Notifications;
window.switchTab                     = switchTab;
window.openChannel                   = openChannel;
window.toggleFavorite                = toggleFavorite;
window.refreshAll                    = refreshAll;
window.renderGroupsScreen            = renderGroupsScreen;
window.renderServer2                 = renderServer2;
window.openGroup                     = openGroup;
window.backToGroups                  = backToGroups;
window.renderMatchesScreen           = renderMatchesScreen;
window.openMatchesSub                = openMatchesSub;
window.toggleNotifSetting            = toggleNotifSetting;
window.updateNotifToggles            = updateNotifToggles;
window.requestNotificationPermission = requestNotificationPermission;
window.openTimePicker                = openTimePicker;
window.closeTimePicker               = closeTimePicker;
window.selectMatchTime               = selectMatchTime;
window.getIcon                       = getIcon;
window.haptic                        = haptic;
window.renderEmptyState              = renderEmptyState;
window.hexToRgb                      = hexToRgb;
window.getNotifSettings              = getNotifSettings;
window.getMatchReminderTime          = getMatchReminderTime;
window.bindSoundEvents               = bindSoundEvents;

window.backToMainTab                 = backToMainTab;
window.renderScreenHeader            = renderScreenHeader;
window.renderNewsScreen              = renderNewsScreen;
window.backToMatches                 = backToMatches;

window.renderFavorites               = renderFavorites;
window.renderRecent                  = renderRecent;
window.renderChannelList             = renderChannelList;

window.areNotificationsEnabled              = areNotificationsEnabled;
window.requestNotificationPermissionUnified = requestNotificationPermissionUnified;
window.sendLocalNotification                = sendLocalNotification;
window.askNotificationAfterWelcome          = askNotificationAfterWelcome;

console.log('%cH90 v30.1 — Core Ready',
  'background:linear-gradient(135deg,#ff2d55,#00e5ff);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px');