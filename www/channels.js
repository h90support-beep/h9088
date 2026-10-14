/* ================================================================
   H90 — channels.js (v7.0 — Coordinator Only)
   ================================================================
   ✅ Coordinator فقط — يعتمد على channels-server2.js
   ✅ حذف Server 1 بالكامل
   ✅ CHANNEL_LOGOS + GROUP_LOGOS قاعدة موحدة
   ✅ _proxifyImage: تمرير صور http عبر Worker
   ✅ API موحّد (قنوات + باقات + بحث)
   ✅ بدون إيموجي — كلها SVG icons
   🔧 v7.0: فصل كامل — server2.js مسؤول عن الجلب والعرض
   ================================================================ */

'use strict';

/* ================================================================
   [01] Proxy للصور
   ================================================================ */
const IMAGE_PROXY = 'https://lio.houssenalhoussen24.workers.dev/proxy?url=';

function _proxifyImage(imgUrl) {
  if (!imgUrl) return '';
  const u = String(imgUrl).trim();
  if (!u) return '';
  if (u.startsWith('https://')) return u;
  if (u.startsWith('http://')) {
    return IMAGE_PROXY + encodeURIComponent(u);
  }
  return u;
}

/* ================================================================
   [02] صورة موحدة beIN Sports
   ================================================================ */
const BEIN_LOGO = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkuwIi4KCSdEc0i8OLMZSEhUkAzkd6cWArxA&s';

/* ================================================================
   [03] CHANNEL_LOGOS — صور القنوات
   ================================================================ */
const CHANNEL_LOGOS = {

  /* beIN SPORTS */
  'bein1':       BEIN_LOGO,
  'bein2':       BEIN_LOGO,
  'bein3':       BEIN_LOGO,
  'bein4':       BEIN_LOGO,
  'bein5':       BEIN_LOGO,
  'bein6':       BEIN_LOGO,
  'bein7':       BEIN_LOGO,
  'bein8':       BEIN_LOGO,
  'bein9':       BEIN_LOGO,
  'beinnews':    BEIN_LOGO,
  'beinglobal':  BEIN_LOGO,
  'bein4k':      BEIN_LOGO,
  'beinxtra1':   BEIN_LOGO,
  'beinxtra2':   BEIN_LOGO,
  'beinnba':     BEIN_LOGO,

  /* Shahid Sport */
  'shahid1':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid2':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid3':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid4':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid5':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid6':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid7':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid8':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid9':     'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'shahid10':    'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',

  /* ALWAN Sport */
  'alwan1':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan2':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan3':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan4':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan5':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan6':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan7':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan8':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan9':      'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwan10':     'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwanf1':     'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwanufc':    'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'alwanwwe':    'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',

  /* SHASHA */
  'shasha1':     'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr-Ar0bO8HBO_LpdsGdbbPbMudjigxr0nLew&s',
  'shasha2':     'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr-Ar0bO8HBO_LpdsGdbbPbMudjigxr0nLew&s',
  'shasha1_hd':  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr-Ar0bO8HBO_LpdsGdbbPbMudjigxr0nLew&s',
  'shasha1_sd':  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr-Ar0bO8HBO_LpdsGdbbPbMudjigxr0nLew&s',
  'shasha1_4k':  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr-Ar0bO8HBO_LpdsGdbbPbMudjigxr0nLew&s',

  /* THMANYAH */
  'thmanyah1':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'thmanyah2':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'thmanyah3':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'thmanyah4':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'thmanyah5':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'thmanyah6':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'thmanyah7':   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',

  /* AL KASS */
  'alkass1':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass2':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass3':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass4':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass5':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass6':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass7':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'alkass8':     'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',

  /* AL FAJER */
  'fajer1':      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQebrSefMXRxiQ0ztfPXsFefodA11EAH_ChEQ&s',
  'fajer2':      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQebrSefMXRxiQ0ztfPXsFefodA11EAH_ChEQ&s',
  'fajer3':      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQebrSefMXRxiQ0ztfPXsFefodA11EAH_ChEQ&s',
  'fajer4':      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQebrSefMXRxiQ0ztfPXsFefodA11EAH_ChEQ&s',
  'fajer5':      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQebrSefMXRxiQ0ztfPXsFefodA11EAH_ChEQ&s',

  /* AD Sports */
  'ad1':         'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'ad2':         'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'adpremium1':  'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'adpremium2':  'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'adasia1':     'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'adasia2':     'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'yas':         'http://pro.netmos.ovh:6051/img/tsawer/sport/SP.yastv.png',
  'adextra':     'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'adyas':       'http://pro.netmos.ovh:6051/img/tsawer/sport/SP.yastv.png',

  /* Dubai Sports */
  'dubai1':      'http://pro.netmos.ovh:6051/img/Dubai.Sports.1.png',
  'dubai2':      'http://pro.netmos.ovh:6051/img/Dubai.Sports.2.png',
  'dubai3':      'http://pro.netmos.ovh:6051/img/Dubai.Sports.2.png',
  'dubairacing1':'http://pro.netmos.ovh:6051/img/Dubai.Sports.2.png',
  'dubairacing2':'http://pro.netmos.ovh:6051/img/Dubai.Sports.2.png',
  'dubairacing3':'http://pro.netmos.ovh:6051/img/Dubai.Sports.2.png',
  'ontime1':     'http://pro.netmos.ovh:6051/img/Ontime.Sports.png',
  'ontime2':     'http://pro.netmos.ovh:6051/img/Ontime.Sports.2.png',
  'ontimehd':    'https://www.tahiamasr.com/Upload/libfiles/63/0/52.jpg',

  /* StarzPlay */
  'starzplay':   'http://pro.netmos.ovh:7355/images/8f571c9f39af9e950481a32505975dc2.png',
  'starzplayufc':'http://pro.netmos.ovh:7355/images/8f571c9f39af9e950481a32505975dc2.png',
  'starzplaygolf':'https://www.arabiclist.net/media/platforms/logos/starsplay.jpg',
  'starzplay1':  'https://www.arabiclist.net/media/platforms/logos/starsplay.jpg',
  'starzplay2':  'https://www.arabiclist.net/media/platforms/logos/starsplay.jpg',
  'starzplay3':  'https://www.arabiclist.net/media/platforms/logos/starsplay.jpg',

  /* قنوات رياضية عربية */
  'sharjah':     'https://sba.net.ae/uploads/19/Jan/24/32ef5753d51bf08a78a06935576556347a6e65746a66464c44675a6e4445.png',
  'oman':        'http://pro.netmos.ovh:6051/img/tsawer/sport/SP.omansport.png',
  'bahrain1':    'http://pro.netmos.ovh:6051/img/Bahrain.Sports.png',
  'bahrain2':    'http://pro.netmos.ovh:6051/img/Bahrain.Sports.png',
  'kuwait':      'http://pro.netmos.ovh:7355/images/b060252c477acb532bcdb54e06633e71.jpeg',
  'kuwaitplus':  'http://pro.netmos.ovh:7355/images/b060252c477acb532bcdb54e06633e71.jpeg',
  'iraqia':      'http://pro.netmos.ovh:7355/images/f691c7e426db215eec5811d50406678b.png',
  'libya1':      'http://pro.netmos.ovh:7355/images/ebbcc89a9d49cc4538dfa3c75bfec15a.png',
  'libya2':      'http://pro.netmos.ovh:7355/images/ebbcc89a9d49cc4538dfa3c75bfec15a.png',
  'syria':       'http://pro.netmos.ovh:6051/img/tsawer/News/Al.Ikhbariya.png',
  'nilesport':   'http://pro.netmos.ovh:6051/img/nilesport.png',
  'alahly':      'https://image.discovery.indazn.com/ca/v2/ca/image?id=05f7c5b8-8727-4e89-8a7f-4daa103d8b10&quality=70',
  'zamalek':     'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200_webp/ffcfdf41645049.560704ca6bd71.jpg',
  'ahlytv':      'https://image.discovery.indazn.com/ca/v2/ca/image?id=05f7c5b8-8727-4e89-8a7f-4daa103d8b10&quality=70',
  'sportstv1':   'https://www.matnnews.com/UploadCache/libfiles/9/3/600x338o/606.png',
  'sportstv2':   'https://www.matnnews.com/UploadCache/libfiles/9/3/600x338o/606.png',
  'elheddaf':    'http://pro.netmos.ovh:6051/img/El-Heddaf.png',
  'maghreb1':    'https://maghrebtelevision.com/wp-content/uploads/2019/10/logo-plat-MAGHREB-TV-02-.png',
  'maghreb2':    'https://maghrebtelevision.com/wp-content/uploads/2019/10/logo-plat-MAGHREB-TV-02-.png',
  'maghreb3':    'https://maghrebtelevision.com/wp-content/uploads/2019/10/logo-plat-MAGHREB-TV-02-.png',
  'tunisiasport':'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnALGhBhzsPugkyrP3biJZzYZqOSZOA8-WjA&s'
};

/* ================================================================
   [04] GROUP_LOGOS — صور الباقات
   ================================================================ */
const GROUP_LOGOS = {
  'bein':        BEIN_LOGO,
  'shahid':      'https://shahid.mbc.net/mediaObject/a7ac67b4-fd29-4bcd-bd69-5ab5d27efdbd',
  'alwan':       'https://i2.wp.com/almuheet.net/wp-content/uploads/%D9%82%D9%86%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D8%A7%D9%86-%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9.jpg',
  'shasha':      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr-Ar0bO8HBO_LpdsGdbbPbMudjigxr0nLew&s',
  'thmanyah':    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3oZdTkpQ4esuN_nemtI_q9g_vjP9TQVJW7IlTatRwvZRKRVF716dKmuRX&s=10',
  'alkass':      'https://i.ytimg.com/vi/BfY7XM3y_28/sddefault.jpg',
  'fajer':       'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQebrSefMXRxiQ0ztfPXsFefodA11EAH_ChEQ&s',
  'adsports':    'http://pro.netmos.ovh:6051/img/tsawer/sport/Abu.Dhabi.Sports.png',
  'dubaisports': 'http://pro.netmos.ovh:6051/img/Dubai.Sports.1.png',
  'ksasports':   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Emblem_of_Saudi_Arabia.svg/1887px-Emblem_of_Saudi_Arabia.svg.png',
  'starzplay':   'http://pro.netmos.ovh:7355/images/8f571c9f39af9e950481a32505975dc2.png',
  'arabic':      'http://pro.netmos.ovh:6051/img/tsawer/sport/SP.omansport.png'
};

/* ================================================================
   [05] الحالة العامة
   ================================================================ */
let CHANNELS_DATA = [];
let CHANNEL_GROUPS = [];

/* ================================================================
   [06] loadM3UFromWorker — Coordinator يطلب من server2
   ================================================================ */
async function loadM3UFromWorker(forceReload) {
  console.log('[CH] تحميل السيرفر 2...');

  let s2 = { channels: [], groups: [] };
  try {
    if (typeof loadServer2Channels === 'function') {
      const result = await loadServer2Channels(forceReload);
      s2 = result || { channels: [], groups: [] };
    } else {
      console.warn('[CH] loadServer2Channels غير متاح — تحقق من تحميل channels-server2.js');
    }
  } catch (e) {
    console.error('[CH] Server 2 فشل:', e);
  }
  console.log('[CH] Server 2:', (s2.channels || []).length, 'قناة،', (s2.groups || []).length, 'باقة');

  CHANNELS_DATA = (s2.channels) || [];
  CHANNEL_GROUPS = (s2.groups) || [];

  window.CHANNELS_DATA = CHANNELS_DATA;
  window.CHANNEL_GROUPS = CHANNEL_GROUPS;

  console.log('[CH] المجموع:', CHANNELS_DATA.length, 'قناة،', CHANNEL_GROUPS.length, 'باقة');
  return true;
}

/* ================================================================
   [07] applyLogo — تطبيق الصورة تلقائيًا
   ================================================================ */
function applyLogo(channel) {
  if (!channel) return channel;

  /* إذا عنده صورة بالفعل → مرّرها عبر Proxy */
  if (channel.logo && channel.logo.trim()) {
    channel.logo = _proxifyImage(channel.logo);
    return channel;
  }

  /* ابحث بالـ ID */
  if (channel.id && CHANNEL_LOGOS[channel.id]) {
    channel.logo = _proxifyImage(CHANNEL_LOGOS[channel.id]);
    return channel;
  }

  /* fallback → صورة الباقة */
  if (channel.group && GROUP_LOGOS[channel.group]) {
    channel.logo = _proxifyImage(GROUP_LOGOS[channel.group]);
    return channel;
  }

  return channel;
}

/* ================================================================
   [08] API — القنوات
   ================================================================ */
function getChannelById(id, preferServer) {
  if (!id) return null;

  /* أولاً: جرّب من CHANNELS_DATA */
  if (CHANNELS_DATA && CHANNELS_DATA.length > 0) {
    var found = CHANNELS_DATA.find(function(c) {
      return c.id === id && (!preferServer || c.server === preferServer);
    });
    if (found) return applyLogo(Object.assign({}, found));
  }

  /* fallback: من SERVER2_DATA مباشرة */
  if (typeof SERVER2_DATA !== 'undefined' && SERVER2_DATA && SERVER2_DATA.length > 0) {
    var found2 = SERVER2_DATA.find(function(c) {
      return c.id === id && (!preferServer || c.server === preferServer);
    });
    if (found2) return applyLogo(Object.assign({}, found2));
  }

  return null;
}

function getAllChannels() {
  /* أولاً: CHANNELS_DATA */
  if (CHANNELS_DATA && CHANNELS_DATA.length > 0) {
    return CHANNELS_DATA.map(function(c) { return applyLogo(Object.assign({}, c)); });
  }

  /* fallback: SERVER2_DATA */
  if (typeof SERVER2_DATA !== 'undefined' && SERVER2_DATA && SERVER2_DATA.length > 0) {
    return SERVER2_DATA.map(function(c) { return applyLogo(Object.assign({}, c)); });
  }

  return [];
}

function getChannelsByCategory(cat) {
  if (!cat || cat === 'all') return getAllChannels();
  var source = (CHANNELS_DATA && CHANNELS_DATA.length > 0) ? CHANNELS_DATA : (typeof SERVER2_DATA !== 'undefined' ? SERVER2_DATA : []);
  return source
    .filter(function(c) { return c.category === cat; })
    .map(function(c) { return applyLogo(Object.assign({}, c)); });
}

function getChannelName(channel, lang) {
  if (!channel) return '';
  return (lang || 'ar') === 'ar' ? channel.name_ar : channel.name_en;
}

function getChannelsCount() {
  if (CHANNELS_DATA && CHANNELS_DATA.length > 0) return CHANNELS_DATA.length;
  if (typeof SERVER2_DATA !== 'undefined' && SERVER2_DATA) return SERVER2_DATA.length;
  return 0;
}

function getServerChannels(serverId) {
  if (!serverId) return [];
  var source = (CHANNELS_DATA && CHANNELS_DATA.length > 0) ? CHANNELS_DATA : (typeof SERVER2_DATA !== 'undefined' ? SERVER2_DATA : []);
  return source
    .filter(function(c) { return c.server === serverId; })
    .map(function(c) { return applyLogo(Object.assign({}, c)); });
}

/* ================================================================
   [09] API — الباقات
   ================================================================ */
function getAllGroups() {
  /* أولاً: CHANNEL_GROUPS */
  if (CHANNEL_GROUPS && CHANNEL_GROUPS.length > 0) {
    return CHANNEL_GROUPS;
  }

  /* fallback: SERVER2_GROUPS_DATA مباشرة */
  if (typeof SERVER2_GROUPS_DATA !== 'undefined' && SERVER2_GROUPS_DATA && SERVER2_GROUPS_DATA.length > 0) {
    return SERVER2_GROUPS_DATA;
  }

  return [];
}

function getGroupById(groupId) {
  if (!groupId) return null;

  var source = getAllGroups();
  return source.find(function(g) { return g.id === groupId; }) || null;
}

function getChannelsByGroup(groupId) {
  const group = getGroupById(groupId);
  if (!group || !group.channels) return [];

  return group.channels
    .map(function(id) { return getChannelById(id, group.server); })
    .filter(Boolean);
}

function getGroupsCount() {
  return getAllGroups().length;
}

function getServerGroups(serverId) {
  if (!serverId) return [];
  return getAllGroups().filter(function(g) {
    return g.server === serverId;
  });
}

/* ================================================================
   [10] API — روابط القنوات
   ================================================================ */
function getChannelUrls(channel, serverId) {
  if (!channel || !channel.urls) return [];

  var server = serverId || channel.server || 'server2';
  var serverData = channel.urls[server];

  if (!serverData) return [];

  var list = Array.isArray(serverData) ? serverData : (serverData.list || []);
  if (!Array.isArray(list)) return [];

  return list.filter(function(u) {
    return u && typeof u === 'string' && u.trim().length > 0;
  });
}

function getChannelQualities(channel, serverId) {
  if (!channel || !channel.urls) return [];

  var server = serverId || channel.server || 'server2';
  var serverData = channel.urls[server];

  if (!serverData) return [];
  if (Array.isArray(serverData)) return [];

  return serverData.qualities || [];
}

/* ================================================================
   [11] API — صور الباقات
   ================================================================ */
function getGroupCoverImage(group) {
  if (!group) return '';

  /* GROUP_LOGOS للباقة */
  var realGroupId = group.id ? group.id.replace(/^s\d+grp_/, '') : null;
  if (realGroupId && GROUP_LOGOS[realGroupId]) {
    return _proxifyImage(GROUP_LOGOS[realGroupId]);
  }

  /* صورة مخصصة */
  if (group.coverImage) {
    return _proxifyImage(group.coverImage);
  }

  /* صورة أول قناة */
  if (!group.channels || group.channels.length === 0) return '';
  const firstChannel = getChannelById(group.channels[0], group.server);
  if (!firstChannel || !firstChannel.logo) return '';
  return firstChannel.logo;
}

/* ================================================================
   [12] API — البحث
   ================================================================ */
function searchChannels(query) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  var source = (CHANNELS_DATA && CHANNELS_DATA.length > 0) ? CHANNELS_DATA : (typeof SERVER2_DATA !== 'undefined' ? SERVER2_DATA : []);

  return source
    .filter(function(c) {
      const nameAr = (c.name_ar || '').toLowerCase();
      const nameEn = (c.name_en || '').toLowerCase();
      return nameAr.indexOf(q) > -1 || nameEn.indexOf(q) > -1;
    })
    .map(function(c) { return applyLogo(Object.assign({}, c)); });
}

/* ================================================================
   [13] تنظيف Cache
   ================================================================ */
function clearM3UCache() {
  try {
    if (typeof clearServer2Cache === 'function') clearServer2Cache();

    CHANNELS_DATA = [];
    CHANNEL_GROUPS = [];

    console.log('[CH] تم مسح كل Cache القنوات');
  } catch (e) {
    console.error('[CH] فشل مسح Cache:', e);
  }
}

/* ================================================================
   [14] حالة API — للفحص
   ================================================================ */
function coordinatorStatus() {
  return {
    channelsData: CHANNELS_DATA.length,
    channelGroups: CHANNEL_GROUPS.length,
    server2Data: typeof SERVER2_DATA !== 'undefined' ? SERVER2_DATA.length : 0,
    server2Groups: typeof SERVER2_GROUPS_DATA !== 'undefined' ? SERVER2_GROUPS_DATA.length : 0,
    loadServer2ChannelsExists: typeof loadServer2Channels === 'function',
    getGroupsCount: getGroupsCount(),
    getChannelsCount: getChannelsCount()
  };
}

/* ================================================================
   [15] الإتاحة العامة (window)
   ================================================================ */
window.CHANNEL_LOGOS = CHANNEL_LOGOS;
window.GROUP_LOGOS = GROUP_LOGOS;
window.applyLogo = applyLogo;

window.loadM3UFromWorker = loadM3UFromWorker;
window.clearM3UCache = clearM3UCache;

window.getChannelById = getChannelById;
window.getAllChannels = getAllChannels;
window.getChannelsByCategory = getChannelsByCategory;
window.getChannelName = getChannelName;
window.getChannelsCount = getChannelsCount;
window.getServerChannels = getServerChannels;

window.getAllGroups = getAllGroups;
window.getGroupById = getGroupById;
window.getChannelsByGroup = getChannelsByGroup;
window.getGroupsCount = getGroupsCount;
window.getServerGroups = getServerGroups;

window.getChannelUrls = getChannelUrls;
window.getChannelQualities = getChannelQualities;
window.getGroupCoverImage = getGroupCoverImage;
window.searchChannels = searchChannels;

window.coordinatorStatus = coordinatorStatus;

console.log('========================================');
console.log('[CH] channels.js v7.0 — Coordinator Only');
console.log('[CH] CHANNEL_LOGOS:', Object.keys(CHANNEL_LOGOS).length, 'صورة');
console.log('[CH] GROUP_LOGOS:', Object.keys(GROUP_LOGOS).length, 'باقة');
console.log('[CH] Tip: coordinatorStatus() → فحص الحالة');
console.log('========================================');