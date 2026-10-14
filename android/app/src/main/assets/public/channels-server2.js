/* ================================================================
   H90 — channels-server2.js (v18.0 — Fixed m3u8 handling)
   ================================================================
   ✅ يتصل بـ Worker 2 (Lio) v4.0
   ✅ يقرأ CHANNEL_LOGOS و GROUP_LOGOS من channels.js
   ✅ يُطبّق الصور تلقائياً على كل قناة
   ✅ Cache ذكي 24 ساعة
   🎨 v17.2: CSS مدمج داخل الملف
   🔧 v18.0: ملفات .m3u8 لا تُلفّ — تبقى أصلية (إصلاح fragLoadError)
   ================================================================ */

'use strict';

/* ✅ الرابط الصحيح 100% */
const SERVER2_PROXY_API = 'https://lio.houssenalhoussen24.workers.dev';
const S2_PROXY_WRAPPER = 'https://lio.houssenalhoussen24.workers.dev/proxy?url=';

/* ✅ v18.0: مفتاح cache جديد */
const SERVER2_CACHE_KEY = 'h90_server2_v18_0';
const SERVER2_CACHE_TIME_KEY = 'h90_server2_time_v18_0';
const SERVER2_CACHE_DURATION = 24 * 60 * 60 * 1000;

let SERVER2_DATA = [];
let SERVER2_GROUPS_DATA = [];

/* ═══════════════════════════════════════════════════════════════
   🎨 CSS مدمج — Premium Cards Styles
   ═══════════════════════════════════════════════════════════════ */
(function injectS2Styles() {
  if (document.getElementById('s2-styles-v180')) return;

  const style = document.createElement('style');
  style.id = 's2-styles-v180';
  style.textContent = `
    :root {
      --s1-bg-card: linear-gradient(155deg, #1e2130 0%, #13151f 100%);
      --s1-bg-card-hover: linear-gradient(155deg, #252a3d 0%, #1a1d2b 100%);
      --s1-border: rgba(255,255,255,0.07);
      --s1-border-hover: rgba(255,255,255,0.22);
      --s1-accent: #63b3ed;
      --s1-accent2: #9f7aea;
      --s1-text: #f1f5f9;
      --s1-text-muted: #94a3b8;
      --s1-shadow: 0 10px 40px rgba(0,0,0,0.45);
      --s1-shadow-hover: 0 24px 60px rgba(0,0,0,0.6);
      --s1-radius: 20px;
      --s1-radius-lg: 24px;
      --s1-glow: rgba(99,179,237,0.35);
    }
    .s1-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 16px;
      padding: 16px;
      direction: rtl;
    }
    .s1-grid-groups {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
      padding: 16px;
      direction: rtl;
    }
    @media (max-width: 640px) {
      .s1-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding: 12px; }
      .s1-grid-groups { grid-template-columns: 1fr; padding: 12px; }
    }
    .s1-card {
      position: relative;
      background: var(--s1-bg-card);
      border: 1px solid var(--s1-border);
      border-radius: var(--s1-radius);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      box-shadow: var(--s1-shadow);
      display: flex;
      flex-direction: column;
      aspect-ratio: 1 / 1.18;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .s1-card::before {
      content: '';
      position: absolute;
      inset: -3px;
      background: radial-gradient(circle at var(--s1-mx, 50%) var(--s1-my, 0%), var(--s1-glow) 0%, transparent 60%);
      border-radius: var(--s1-radius);
      opacity: 0;
      transition: opacity 0.4s;
      z-index: 0;
      pointer-events: none;
    }
    .s1-card:hover::before { opacity: 1; }
    .s1-card:hover {
      transform: translateY(-6px);
      border-color: var(--s1-border-hover);
      box-shadow: var(--s1-shadow-hover);
      background: var(--s1-bg-card-hover);
    }
    .s1-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: -120%;
      width: 100%;
      height: 100%;
      background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%);
      transition: left 0.85s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
      z-index: 4;
    }
    .s1-card:hover::after { left: 120%; }
    .s1-card:active {
      transform: translateY(-3px) scale(0.985);
      transition-duration: 0.1s;
    }
    .s1-card-logo {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background:
        radial-gradient(circle at 30% 20%, rgba(99,179,237,0.10), transparent 55%),
        radial-gradient(circle at 70% 80%, rgba(159,122,234,0.08), transparent 55%);
      overflow: hidden;
      z-index: 1;
    }
    .s1-card-logo img {
      max-width: 85%;
      max-height: 85%;
      object-fit: contain;
      filter: drop-shadow(0 6px 20px rgba(0,0,0,0.5));
      transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s;
      z-index: 1;
    }
    .s1-card:hover .s1-card-logo img {
      transform: scale(1.12) rotate(-1deg);
      filter: drop-shadow(0 10px 28px rgba(99,179,237,0.4));
    }
    .s1-card-letter {
      width: 76px;
      height: 76px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--s1-accent), var(--s1-accent2));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 1px;
      box-shadow: 0 10px 30px rgba(99,179,237,0.45), inset 0 1px 1px rgba(255,255,255,0.3);
      font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
      z-index: 1;
      position: relative;
    }
    .s1-card-name {
      padding: 13px 12px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--s1-text);
      background: linear-gradient(180deg, transparent, rgba(0,0,0,0.35));
      border-top: 1px solid var(--s1-border);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
      letter-spacing: 0.3px;
      position: relative;
      z-index: 2;
      transition: color 0.3s;
    }
    .s1-card:hover .s1-card-name { color: #fff; }
    .s1-card-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(16,185,129,0.5), inset 0 1px 1px rgba(255,255,255,0.25);
      z-index: 3;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(6px);
    }
    .s1-card-badge svg { width: 10px; height: 10px; fill: currentColor; }
    .s1-card-badge.quality-hd {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      box-shadow: 0 4px 14px rgba(245,158,11,0.5), inset 0 1px 1px rgba(255,255,255,0.25);
    }
    .s1-card-badge.quality-4k {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow: 0 4px 14px rgba(239,68,68,0.5), inset 0 1px 1px rgba(255,255,255,0.25);
    }
    .s1-card-live {
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 4px 9px;
      background: rgba(239,68,68,0.95);
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      border-radius: 8px;
      letter-spacing: 1px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      z-index: 3;
      box-shadow: 0 4px 14px rgba(239,68,68,0.6);
      backdrop-filter: blur(6px);
    }
    .s1-card-live::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 8px #fff;
      animation: s1-live-blink 1.4s ease-in-out infinite;
    }
    @keyframes s1-live-blink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    .s1-card-play {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%);
      opacity: 0;
      transition: opacity 0.35s;
      z-index: 3;
      backdrop-filter: blur(2px);
      pointer-events: none;
    }
    .s1-card:hover .s1-card-play,
    .s1-card:active .s1-card-play { opacity: 1; }
    .s1-card-play-inner {
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(99,179,237,0.95), rgba(159,122,234,0.95));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 32px rgba(99,179,237,0.6), 0 0 0 8px rgba(99,179,237,0.15), inset 0 2px 2px rgba(255,255,255,0.3);
      transform: scale(0.7);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .s1-card:hover .s1-card-play-inner,
    .s1-card:active .s1-card-play-inner { transform: scale(1); }
    .s1-card-play svg {
      width: 26px;
      height: 26px;
      color: #fff;
      filter: drop-shadow(0 3px 8px rgba(0,0,0,0.5));
      margin-right: -2px;
    }
    .s1-group-card {
      position: relative;
      border-radius: var(--s1-radius-lg);
      overflow: hidden;
      cursor: pointer;
      aspect-ratio: 16 / 9;
      box-shadow: var(--s1-shadow);
      transition: all 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      border: 1px solid var(--s1-border);
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .s1-group-card:hover {
      transform: translateY(-6px) scale(1.015);
      box-shadow: 0 28px 70px rgba(0,0,0,0.7);
      border-color: var(--s1-border-hover);
    }
    .s1-group-card:active {
      transform: translateY(-3px) scale(0.995);
      transition-duration: 0.1s;
    }
    .s1-group-cover {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      background-color: #1e2130;
      transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .s1-group-card:hover .s1-group-cover { transform: scale(1.12); }
    .s1-group-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.95) 100%);
      z-index: 1;
    }
    .s1-group-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 3;
      background: var(--s1-group-accent, linear-gradient(90deg, #63b3ed, #9f7aea));
      box-shadow: 0 0 20px var(--s1-group-accent-glow, rgba(99,179,237,0.6));
    }
    .s1-group-content {
      position: absolute;
      inset: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      z-index: 2;
    }
    .s1-group-title {
      color: #fff;
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 8px 0;
      font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
      text-shadow: 0 3px 12px rgba(0,0,0,0.85);
      letter-spacing: 0.3px;
      line-height: 1.2;
    }
    .s1-group-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }
    .s1-group-count {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 20px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      backdrop-filter: blur(10px);
      font-family: 'Cairo', sans-serif;
    }
    .s1-group-count svg { width: 13px; height: 13px; opacity: 0.9; }
    .s1-group-count::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: s1-blink-dot 2s ease-in-out infinite;
    }
    @keyframes s1-blink-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    .s1-group-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
      border-radius: 20px;
      box-shadow: 0 4px 14px rgba(239,68,68,0.6);
    }
    .s1-group-live-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 8px #fff;
      animation: s1-live-blink 1.4s ease-in-out infinite;
    }
    .s1-group-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(255,255,255,0.08);
      z-index: 4;
      overflow: hidden;
    }
    .s1-group-progress::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 30%;
      height: 100%;
      background: linear-gradient(90deg, transparent, #fff, transparent);
      animation: s1-progress-slide 3s ease-in-out infinite;
    }
    @keyframes s1-progress-slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    .s1-group-arrow {
      position: absolute;
      top: 16px;
      left: 16px;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      z-index: 5;
      transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .s1-group-arrow svg {
      width: 18px;
      height: 18px;
      transform: rotate(180deg);
    }
    .s1-group-card:hover .s1-group-arrow {
      background: rgba(255,255,255,0.25);
      transform: scale(1.1) translateX(-3px);
    }
    .s1-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 70px 20px;
      color: var(--s1-text-muted);
      font-family: 'Cairo', sans-serif;
      font-size: 15px;
      font-weight: 600;
      direction: rtl;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .s1-skeleton {
      background: var(--s1-bg-card);
      border: 1px solid var(--s1-border);
      border-radius: var(--s1-radius);
      overflow: hidden;
      aspect-ratio: 1 / 1.18;
      position: relative;
    }
    .s1-skeleton::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
      animation: s1-skeleton-shimmer 1.6s ease-in-out infinite;
    }
    @keyframes s1-skeleton-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .s1-skeleton-groups {
      aspect-ratio: 16 / 9;
      border-radius: var(--s1-radius-lg);
    }
    .s1-card, .s1-group-card {
      animation: s1-fadeIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards;
    }
    @keyframes s1-fadeIn {
      from { opacity: 0; transform: translateY(24px) scale(0.94); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
  console.log('[S2] Premium styles injected (v18.0)');
})();

/* ═══════════════════════════════════════════════════════════════
   SVG Icons Library
   ═══════════════════════════════════════════════════════════════ */
const S2_ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  signal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>',
  live: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 0 0-7.07 17.07l1.41-1.41A8 8 0 0 1 12 4V2z" opacity=".6"/></svg>',
  quality: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
};

/* ═══════════════════════════════════════════════════════════════
   TARGET_GROUPS
   ═══════════════════════════════════════════════════════════════ */
const S2_TARGET_GROUPS = [
  { id: 'bein',        name_ar: 'beIN Sports',        icon: 'sports',    order: 1,  accent: '#8b5cf6', accent2: '#6d28d9' },
  { id: 'shahid',      name_ar: 'Shahid Sport',       icon: 'satellite', order: 2,  accent: '#f97316', accent2: '#ea580c' },
  { id: 'alwan',       name_ar: 'ALWAN Sport',        icon: 'palette',   order: 3,  accent: '#06b6d4', accent2: '#0891b2' },
  { id: 'shasha',      name_ar: 'Shasha',             icon: 'theater',   order: 4,  accent: '#ec4899', accent2: '#db2777' },
  { id: 'thmanyah',    name_ar: 'Thmanyah',           icon: 'hash',      order: 5,  accent: '#eab308', accent2: '#ca8a04' },
  { id: 'alkass',      name_ar: 'Al Kass',            icon: 'film',      order: 6,  accent: '#10b981', accent2: '#059669' },
  { id: 'fajer',       name_ar: 'AL FAJER',           icon: 'sunrise',   order: 7,  accent: '#f59e0b', accent2: '#d97706' },
  { id: 'adsports',    name_ar: 'AD Sports',          icon: 'sports',    order: 8,  accent: '#3b82f6', accent2: '#2563eb' },
  { id: 'dubaisports', name_ar: 'Dubai Sports',       icon: 'satellite', order: 9,  accent: '#14b8a6', accent2: '#0d9488' },
  { id: 'ksasports',   name_ar: 'KSA Sports',         icon: 'sports',    order: 10, accent: '#22c55e', accent2: '#16a34a' },
  { id: 'starzplay',   name_ar: 'StarzPlay Sport',    icon: 'film',      order: 11, accent: '#a855f7', accent2: '#9333ea' },
  { id: 'arabic',      name_ar: 'قنوات رياضية عربية', icon: 'tv',        order: 12, accent: '#ef4444', accent2: '#dc2626' }
];

function getS2BrandIcon(groupId) {
  const icons = {
    bein: 'sports', shahid: 'satellite', alwan: 'palette',
    shasha: 'theater', thmanyah: 'hash', alkass: 'film',
    fajer: 'sunrise', adsports: 'sports', dubaisports: 'satellite',
    ksasports: 'sports', starzplay: 'film', arabic: 'tv'
  };
  return icons[groupId] || 'tv';
}

/* ═══════════════════════════════════════════════════════════════
   🔧 v18.0: wrapUrlIfNeeded — إصلاح m3u8
   ✅ .m3u8 → لا تلفّها (تبقى أصلية)
   ✅ .ts → لُفّها بـ Proxy
   ✅ http:// و https:// → لُفّها
   ═══════════════════════════════════════════════════════════════ */
function wrapUrlIfNeeded(url) {
  if (!url) return '';
  var u = String(url).trim();
  if (!u) return '';

  /* ✅ إذا كان ملفوفاً مسبقاً → احتفظ به */
  if (u.indexOf('/proxy?url=') !== -1) return u;

  /* ✅ ملفات .m3u8 → لا تلفّها! خليها أصلية (لأنها تحتوي على روابط .ts داخلية) */
  if (/\.m3u8(\?|$)/i.test(u)) {
    return u;
  }

  /* ✅ ملفات .ts → لُفّها بـ proxy */
  if (/\.ts(\?|$)/i.test(u)) {
    return S2_PROXY_WRAPPER + encodeURIComponent(u);
  }

  /* ✅ http:// → لُفّ */
  if (u.startsWith('http://')) {
    return S2_PROXY_WRAPPER + encodeURIComponent(u);
  }

  /* ✅ https:// → لُفّ */
  if (u.startsWith('https://')) {
    return S2_PROXY_WRAPPER + encodeURIComponent(u);
  }

  return u;
}

/* ═══════════════════════════════════════════════════════════════
   _applyLogoToChannel
   ═══════════════════════════════════════════════════════════════ */
function _applyLogoToChannel(ch) {
  if (!ch) return ch;

  if (ch.logo && ch.logo.trim()) {
    if (ch.logo.startsWith('http://')) {
      ch.logo = S2_PROXY_WRAPPER + encodeURIComponent(ch.logo);
    }
    return ch;
  }

  if (typeof CHANNEL_LOGOS !== 'undefined' && CHANNEL_LOGOS[ch.id]) {
    var url = CHANNEL_LOGOS[ch.id];
    if (url.startsWith('http://')) {
      url = S2_PROXY_WRAPPER + encodeURIComponent(url);
    }
    ch.logo = url;
    return ch;
  }

  if (typeof GROUP_LOGOS !== 'undefined' && ch.group && GROUP_LOGOS[ch.group]) {
    var gurl = GROUP_LOGOS[ch.group];
    if (gurl.startsWith('http://')) {
      gurl = S2_PROXY_WRAPPER + encodeURIComponent(gurl);
    }
    ch.logo = gurl;
    return ch;
  }

  return ch;
}

/* ═══════════════════════════════════════════════════════════════
   loadServer2Channels
   ═══════════════════════════════════════════════════════════════ */
async function loadServer2Channels(forceReload) {
  try {
    let rawData = null;

    if (!forceReload) {
      try {
        const cachedTime = parseInt(localStorage.getItem(SERVER2_CACHE_TIME_KEY) || '0', 10);
        const cachedData = localStorage.getItem(SERVER2_CACHE_KEY);
        if (cachedData && (Date.now() - cachedTime) < SERVER2_CACHE_DURATION) {
          rawData = JSON.parse(cachedData);
          console.log('[S2] From cache (v18.0):', rawData.length, 'channels');
        }
      } catch (e) {}
    }

    if (!rawData) {
      console.log('[S2] Fetching from Worker 2...');

      try {
        const res = await fetch(SERVER2_PROXY_API + '/channels', {
          method: 'GET',
          cache: 'no-store',
          mode: 'cors'
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        if (!data.success || !data.channels) throw new Error('Invalid response');

        const mapped = data.channels.map(function(c) {
          var labelsArray = [];
          var urlsArray = [];

          if (c.qualities && Array.isArray(c.qualities)) {
            c.qualities.forEach(function(q) {
              labelsArray.push(q.label || '');
              var wrappedUrl = wrapUrlIfNeeded(q.url);
              urlsArray.push(wrappedUrl);
            });
          }

          var channel = {
            id: c.id,
            name_ar: c.name_ar,
            name_en: c.name_en,
            category: c.group,
            group: c.group,
            brandLabel: c.brandLabel,
            brandIcon: getS2BrandIcon(c.group),
            server: 'server2',
            logo: c.logo || '',
            letter: c.letter || (c.name_ar || '').substring(0, 2).toUpperCase(),
            qualities: c.qualities || [],
            urls: {
              server2: {
                qualities: labelsArray,
                list: urlsArray
              }
            }
          };

          _applyLogoToChannel(channel);
          return channel;
        });

        rawData = mapped;
        console.log('[S2] Loaded:', rawData.length, 'channels (v18.0)');

        if (rawData[0]) {
          console.log('[S2] Example:', rawData[0].id, '→', rawData[0].urls.server2.list[0]);
        }

        try {
          localStorage.setItem(SERVER2_CACHE_KEY, JSON.stringify(rawData));
          localStorage.setItem(SERVER2_CACHE_TIME_KEY, Date.now().toString());
        } catch (e) {}

      } catch (fetchError) {
        console.error('[S2-ERROR] Fetch failed:', fetchError.message);
        try {
          const cachedData = localStorage.getItem(SERVER2_CACHE_KEY);
          if (cachedData) {
            rawData = JSON.parse(cachedData);
            console.log('[S2] Using old cache:', rawData.length, 'channels');
          }
        } catch (e2) {}
      }
    }

    SERVER2_DATA = rawData || [];
    SERVER2_GROUPS_DATA = buildServer2Groups(SERVER2_DATA);

    window.SERVER2_CHANNELS = SERVER2_DATA;
    window.S2_CHANNELS_RAW = SERVER2_DATA;

    return {
      channels: SERVER2_DATA,
      groups: SERVER2_GROUPS_DATA
    };

  } catch (e) {
    console.error('[S2-ERROR] Load failed:', e);
    return { channels: [], groups: [] };
  }
}

/* ═══════════════════════════════════════════════════════════════
   buildServer2Groups
   ═══════════════════════════════════════════════════════════════ */
function buildServer2Groups(channels) {
  if (!channels || channels.length === 0) return [];

  const groupsMap = {};

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    if (!ch.group) continue;
    if (!groupsMap[ch.group]) {
      groupsMap[ch.group] = {
        id: ch.group,
        channels: [],
        icon: ch.brandIcon,
        name_ar: ch.brandLabel
      };
    }
    if (groupsMap[ch.group].channels.indexOf(ch.id) === -1) {
      groupsMap[ch.group].channels.push(ch.id);
    }
  }

  const list = [];
  for (const k in groupsMap) {
    if (!groupsMap.hasOwnProperty(k)) continue;
    const g = groupsMap[k];
    const tg = S2_TARGET_GROUPS.find(function(t) { return t.id === k; });
    if (!tg) continue;

    let coverImg = '';
    if (typeof GROUP_LOGOS !== 'undefined' && GROUP_LOGOS[g.id]) {
      coverImg = GROUP_LOGOS[g.id];
      if (coverImg.startsWith('http://')) {
        coverImg = S2_PROXY_WRAPPER + encodeURIComponent(coverImg);
      }
    } else {
      for (let i = 0; i < g.channels.length; i++) {
        const ch = channels.find(function(c) { return c.id === g.channels[i]; });
        if (ch && ch.logo) { coverImg = ch.logo; break; }
      }
    }

    list.push({
      id: 's2grp_' + g.id,
      name_ar: tg.name_ar,
      icon: tg.icon,
      coverImage: coverImg,
      server: 'server2',
      channels: g.channels,
      _order: tg.order,
      _accent: tg.accent,
      _accent2: tg.accent2
    });
  }

  list.sort(function(a, b) { return a._order - b._order; });

  console.log('[S2] Built', list.length, 'groups');
  return list;
}

/* ═══════════════════════════════════════════════════════════════
   buildServer2Channels
   ═══════════════════════════════════════════════════════════════ */
function buildServer2Channels() {
  return SERVER2_DATA.map(function(ch) {
    return {
      id: ch.id,
      name_ar: ch.name_ar,
      name_en: ch.name_en,
      name: ch.name_ar,
      category: ch.category,
      group: ch.group,
      brandLabel: ch.brandLabel,
      brandIcon: ch.brandIcon,
      server: 'server2',
      logo: ch.logo,
      letter: ch.letter,
      qualities: ch.qualities,
      url: (ch.urls && ch.urls.server2 && ch.urls.server2.list[0]) || '',
      streamUrl: (ch.urls && ch.urls.server2 && ch.urls.server2.list[0]) || '',
      urls: ch.urls
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   clearServer2Cache
   ═══════════════════════════════════════════════════════════════ */
function clearServer2Cache() {
  try {
    localStorage.removeItem(SERVER2_CACHE_KEY);
    localStorage.removeItem(SERVER2_CACHE_TIME_KEY);
    ['v7','v7_1','v8','v8_1','v9_0','v11_0','v12_0','v13_0','v14_0','v14_1','v15_0','v16_0','v17_0','v17_1','v17_2'].forEach(function(v) {
      localStorage.removeItem('h90_server2_' + v);
      localStorage.removeItem('h90_server2_time_' + v);
    });
    SERVER2_DATA = [];
    SERVER2_GROUPS_DATA = [];
    console.log('[S2] Cache cleared');
  } catch (e) {}
}

/* ═══════════════════════════════════════════════════════════════
   renderS2ChannelCards
   ═══════════════════════════════════════════════════════════════ */
function renderS2ChannelCards(container, channels) {
  if (!container) return;

  if (!channels || channels.length === 0) {
    container.innerHTML = '<div class="s1-empty">لا توجد قنوات متاحة</div>';
    return;
  }

  let html = '';
  channels.forEach(function(ch, idx) {
    var logo = ch.logo || '';
    if (!logo && typeof window.applyLogo === 'function') {
      try {
        var withLogo = window.applyLogo(Object.assign({}, ch));
        logo = withLogo.logo || '';
      } catch (e) {}
    }

    const name   = ch.name_ar || ch.name_en || 'قناة';
    const letter = (ch.letter || name.substring(0, 2)).toUpperCase();
    const firstQ = (ch.qualities && ch.qualities[0] && ch.qualities[0].label) || '';
    const qClass = /4k/i.test(firstQ)  ? 'quality-4k'
                 : /hd|fhd/i.test(firstQ) ? 'quality-hd'
                 : '';

    const logoHTML = logo
      ? `<img src="${logo}" alt="${name}" loading="lazy" 
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="s1-card-letter" style="display:none;">${letter}</div>`
      : `<div class="s1-card-letter">${letter}</div>`;

    const badgeHTML = firstQ
      ? `<div class="s1-card-badge ${qClass}">${S2_ICONS.quality}${firstQ}</div>`
      : '';

    const liveBadge = (ch.group === 'bein' || ch.group === 'shahid' || ch.group === 'alkass')
      ? `<div class="s1-card-live">LIVE</div>`
      : '';

    html += `
      <div class="s1-card"
           data-channel-id="${ch.id}"
           data-server="server2"
           tabindex="0"
           role="button"
           aria-label="${name}"
           style="animation-delay:${Math.min(idx * 25, 500)}ms"
           onmousemove="s2TrackMouse(event, this)"
           onclick="s2OnChannelClick('${ch.id}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();s2OnChannelClick('${ch.id}')}">
        ${badgeHTML}
        ${liveBadge}
        <div class="s1-card-logo">
          ${logoHTML}
        </div>
        <div class="s1-card-play">
          <div class="s1-card-play-inner">
            ${S2_ICONS.play}
          </div>
        </div>
        <div class="s1-card-name">${name}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   renderS2GroupCards
   ═══════════════════════════════════════════════════════════════ */
function renderS2GroupCards(container, groups, allChannels) {
  if (!container) return;

  container.classList.add('s1-grid-groups');

  if (!groups || groups.length === 0) {
    container.innerHTML = '<div class="s1-empty">لا توجد مجموعات متاحة</div>';
    return;
  }

  const channelsMap = {};
  (allChannels || []).forEach(function(c) { channelsMap[c.id] = c; });

  const FALLBACK =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#0f766e"/>' +
      '<stop offset="100%" stop-color="#10b981"/>' +
      '</linearGradient></defs>' +
      '<rect width="640" height="360" fill="url(#g)"/></svg>'
    );

  let html = '';
  groups.forEach(function(grp, idx) {
    var cover = '';
    if (typeof window.getGroupCoverImage === 'function') {
      try {
        cover = window.getGroupCoverImage(grp) || '';
      } catch (e) {}
    }

    if (!cover) cover = grp.coverImage || '';

    if (!cover && grp.channels && grp.channels.length) {
      const first = channelsMap[grp.channels[0]];
      if (first && first.logo) cover = first.logo;
    }

    if (!cover) cover = FALLBACK;

    const count = (grp.channels || []).length;
    const accent = grp._accent || '#10b981';
    const accent2 = grp._accent2 || '#059669';

    html += `
      <div class="s1-group-card"
           data-group-id="${grp.id}"
           tabindex="0"
           role="button"
           aria-label="${grp.name_ar || grp.id}"
           style="--s1-group-accent: linear-gradient(90deg, ${accent}, ${accent2});
                  --s1-group-accent-glow: ${accent}99;
                  animation-delay:${Math.min(idx * 50, 600)}ms"
           onclick="s2OnGroupClick('${grp.id}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();s2OnGroupClick('${grp.id}')}">
        <div class="s1-group-cover" style="background-image:url('${cover}');"></div>
        <div class="s1-group-overlay"></div>
        <div class="s1-group-accent-bar"></div>
        <div class="s1-group-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
        <div class="s1-group-content">
          <h3 class="s1-group-title">${grp.name_ar || grp.id}</h3>
          <div class="s1-group-meta">
            <div class="s1-group-count">
              ${S2_ICONS.tv}
              <span>${count} قناة</span>
            </div>
            <div class="s1-group-live-badge">LIVE</div>
          </div>
        </div>
        <div class="s1-group-progress"></div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   s2TrackMouse
   ═══════════════════════════════════════════════════════════════ */
function s2TrackMouse(e, el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  el.style.setProperty('--s1-mx', x + '%');
  el.style.setProperty('--s1-my', y + '%');
}

/* ═══════════════════════════════════════════════════════════════
   معالجات النقر
   ═══════════════════════════════════════════════════════════════ */
function s2OnChannelClick(channelId) {
  console.log('[S2] Channel clicked:', channelId);
  if (typeof window.onChannelSelect === 'function') {
    window.onChannelSelect(channelId, 'server2');
  } else if (typeof window.openChannel === 'function') {
    window.openChannel(channelId);
  } else if (typeof window.openPlayer === 'function') {
    window.openPlayer(channelId, 'server2');
  }
}

function s2OnGroupClick(groupId) {
  console.log('[S2] Group clicked:', groupId);
  if (typeof window.onGroupSelect === 'function') {
    window.onGroupSelect(groupId, 'server2');
  } else if (typeof window.openGroup === 'function') {
    const originalId = groupId.replace(/^s2grp_/, '');
    window.openGroup(originalId);
  }
}

/* ═══════════════════════════════════════════════════════════════
   renderS2Skeleton
   ═══════════════════════════════════════════════════════════════ */
function renderS2Skeleton(container, mode, count) {
  if (!container) return;
  const n = count || 8;
  const cls = mode === 'groups' ? 's1-skeleton s1-skeleton-groups' : 's1-skeleton';
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="${cls}"></div>`;
  }
  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   renderServer2
   ═══════════════════════════════════════════════════════════════ */
async function renderServer2(options) {
  options = options || {};
  const mode       = options.mode || 'channels';
  const container  = options.container
                     || document.querySelector('#server2-container')
                     || document.querySelector('#channels-grid')
                     || document.getElementById('channelsGrid');
  const groupId    = options.groupId || null;
  const forceLoad  = options.forceReload || false;

  if (!container) {
    console.error('[S2] لم يتم العثور على الحاوية');
    return;
  }

  renderS2Skeleton(container, mode, mode === 'groups' ? 6 : 10);

  try {
    const data = await loadServer2Channels(forceLoad);

    if (mode === 'groups') {
      renderS2GroupCards(container, data.groups, data.channels);
    } else {
      let list = data.channels;
      if (groupId) {
        const grp = data.groups.find(function(g) {
          return g.id === groupId || g.id === ('s2grp_' + groupId);
        });
        if (grp) {
          const idSet = new Set(grp.channels);
          list = list.filter(function(c) { return idSet.has(c.id); });
        }
      }
      renderS2ChannelCards(container, list);
    }
  } catch (e) {
    console.error('[S2] Render failed:', e);
    container.innerHTML =
      '<div class="s1-empty">فشل تحميل القنوات: ' + e.message + '</div>';
  }
}

/* ═══════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════ */
window.loadServer2Channels     = loadServer2Channels;
window.buildServer2Channels    = buildServer2Channels;
window.buildServer2Groups      = buildServer2Groups;
window.clearServer2Cache       = clearServer2Cache;
window.renderServer2           = renderServer2;
window.renderS2ChannelCards    = renderS2ChannelCards;
window.renderS2GroupCards      = renderS2GroupCards;
window.renderS2Skeleton        = renderS2Skeleton;
window.s2OnChannelClick        = s2OnChannelClick;
window.s2OnGroupClick          = s2OnGroupClick;
window.s2TrackMouse            = s2TrackMouse;
window.SERVER2_PROXY_API       = SERVER2_PROXY_API;
window.S2_PROXY_WRAPPER        = S2_PROXY_WRAPPER;
window.S2_TARGET_GROUPS        = S2_TARGET_GROUPS;
window.wrapUrlIfNeeded         = wrapUrlIfNeeded;

window.SERVER2_CHANNELS = window.SERVER2_CHANNELS || [];
window.S2_CHANNELS_RAW = window.S2_CHANNELS_RAW || [];

console.log(
  '%c Server 2 ' +
  '%c v18.0 — m3u8 NOT wrapped ',
  'background:linear-gradient(135deg,#00e5ff,#007bff);color:#fff;padding:5px 10px;border-radius:6px 0 0 6px;font-weight:900;font-size:11px;',
  'background:#00a94f;color:#fff;padding:5px 10px;border-radius:0 6px 6px 0;font-weight:900;font-size:10px;'
);
console.log('[S2] Worker API:', SERVER2_PROXY_API);
console.log('[S2] CHANNEL_LOGOS available:', typeof CHANNEL_LOGOS !== 'undefined' ? 'YES' : 'NO');
console.log('[S2] GROUP_LOGOS available:', typeof GROUP_LOGOS !== 'undefined' ? 'YES' : 'NO');
console.log('[S2] UI Mode: Premium v18.0 (m3u8 unwrapped)');
console.log('[S2] Note: .m3u8 stays original; .ts gets proxied');