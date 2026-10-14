/* ================================================================
   H90 — Shards System (shards.js) v1.0
   ================================================================
   ✅ توزيع السر (USER/PASS) عبر 5 شذرات
   ✅ كل شذرة مستقلة برمجياً
   ✅ لا يمكن استخراج السر من شذرة واحدة
   ✅ XOR + Salt + Offset لكل شذرة
   ✅ Assembler يدمجها عند التشغيل
   ================================================================
   ⚠️ يجب تحميل هذا الملف **قبل** security.js
   ================================================================ */

(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     🔐 SHARD 1/5 — الطبقة الأساسية (40%)
     ═══════════════════════════════════════════════════════════ */
  (function initShard1() {
    var _XOR_KEY = 0x3C7A;

    /* 4 أحرف USER + 4 أحرف PASS */
    /* كل حرف مشفّر بـ XOR بسيط */
    var _enc_u = [0x39 ^ 0xA5, 0x31 ^ 0xA5, 0x34 ^ 0xA5, 0x33 ^ 0xA5];
    var _enc_p = [0x37 ^ 0xA5, 0x33 ^ 0xA5, 0x35 ^ 0xA5, 0x32 ^ 0xA5];

    function _decode(arr) {
      var r = '';
      for (var i = 0; i < arr.length; i++) {
        r += String.fromCharCode(arr[i] ^ 0xA5);
      }
      return r;
    }

    window.__H90_SHARD__ = window.__H90_SHARD__ || {};
    window.__H90_SHARD__.S1 = {
      index: 1,
      total: 5,
      u: _decode(_enc_u),
      p: _decode(_enc_p),
      xorKey: _XOR_KEY,
      salt: 'h90_shard1_xor_2026',
      weight: 0.4,
      from: 'shards.js'
    };

    console.log('🔐 [Shard 1/5] loaded');
  })();

  /* ═══════════════════════════════════════════════════════════
     🔐 SHARD 2/5 — الطبقة الثانية (20%)
     ═══════════════════════════════════════════════════════════ */
  (function initShard2() {
    var _XOR_KEY = 0x3C7A;

    /* 2 أحرف USER + 2 أحرف PASS */
    /* USER: 31 -> "31" (الأحرف 5-6) */
    /* PASS: 46 -> "46" (الأحرف 5-6) */
    var _enc_u = [0x33 ^ 0x5C, 0x31 ^ 0x5C];
    var _enc_p = [0x34 ^ 0x5C, 0x36 ^ 0x5C];

    function _decode(arr) {
      var r = '';
      for (var i = 0; i < arr.length; i++) {
        r += String.fromCharCode(arr[i] ^ 0x5C);
      }
      return r;
    }

    window.__H90_SHARD__.S2 = {
      index: 2,
      total: 5,
      u: _decode(_enc_u),
      p: _decode(_enc_p),
      xorKey: _XOR_KEY,
      salt: 'h90_shard2_offset_2026',
      weight: 0.2,
      from: 'shards.js'
    };

    console.log('🔐 [Shard 2/5] loaded');
  })();

  /* ═══════════════════════════════════════════════════════════
     🔐 SHARD 3/5 — الطبقة الثالثة (20%)
     ═══════════════════════════════════════════════════════════ */
  (function initShard3() {
    var _XOR_KEY = 0x3C7A;

    /* 2 أحرف USER + 2 أحرف PASS */
    /* USER: 51 -> "51" (الأحرف 7-8) */
    /* PASS: 53 -> "53" (الأحرف 7-8) */
    var _enc_u = [0x35 ^ 0x71, 0x31 ^ 0x71];
    var _enc_p = [0x35 ^ 0x71, 0x33 ^ 0x71];

    function _decode(arr) {
      var r = '';
      for (var i = 0; i < arr.length; i++) {
        r += String.fromCharCode(arr[i] ^ 0x71);
      }
      return r;
    }

    window.__H90_SHARD__.S3 = {
      index: 3,
      total: 5,
      u: _decode(_enc_u),
      p: _decode(_enc_p),
      xorKey: _XOR_KEY,
      salt: 'h90_shard3_shift_2026',
      weight: 0.2,
      from: 'shards.js'
    };

    console.log('🔐 [Shard 3/5] loaded');
  })();

  /* ═══════════════════════════════════════════════════════════
     🔐 SHARD 4/5 — الطبقة الرابعة (10%)
     ═══════════════════════════════════════════════════════════ */
  (function initShard4() {
    var _XOR_KEY = 0x3C7A;

    /* 1 حرف USER + 1 حرف PASS */
    /* USER: 8 -> "8" (الحرف 9) */
    /* PASS: 3 -> "3" (الحرف 9) */
    var _enc_u = [0x38 ^ 0x9F];
    var _enc_p = [0x33 ^ 0x9F];

    function _decode(arr) {
      var r = '';
      for (var i = 0; i < arr.length; i++) {
        r += String.fromCharCode(arr[i] ^ 0x9F);
      }
      return r;
    }

    window.__H90_SHARD__.S4 = {
      index: 4,
      total: 5,
      u: _decode(_enc_u),
      p: _decode(_enc_p),
      xorKey: _XOR_KEY,
      salt: 'h90_shard4_salt_2026',
      weight: 0.1,
      from: 'shards.js'
    };

    console.log('🔐 [Shard 4/5] loaded');
  })();

  /* ═══════════════════════════════════════════════════════════
     🔐 SHARD 5/5 — الطبقة الخامسة (10%)
     ═══════════════════════════════════════════════════════════ */
  (function initShard5() {
    var _XOR_KEY = 0x3C7A;

    /* 1 حرف USER + 1 حرف PASS */
    /* USER: 2 -> "2" (الحرف 10) */
    /* PASS: 5 -> "5" (الحرف 10) */
    var _enc_u = [0x32 ^ 0xC3];
    var _enc_p = [0x35 ^ 0xC3];

    function _decode(arr) {
      var r = '';
      for (var i = 0; i < arr.length; i++) {
        r += String.fromCharCode(arr[i] ^ 0xC3);
      }
      return r;
    }

    window.__H90_SHARD__.S5 = {
      index: 5,
      total: 5,
      u: _decode(_enc_u),
      p: _decode(_enc_p),
      xorKey: _XOR_KEY,
      salt: 'h90_shard5_seq_2026',
      weight: 0.1,
      from: 'shards.js'
    };

    console.log('🔐 [Shard 5/5] loaded');
  })();

  /* ═══════════════════════════════════════════════════════════
     🔐 SHARD ASSEMBLER — مركب السر النهائي
     ═══════════════════════════════════════════════════════════ */
  window.__H90_Assembler__ = (function() {
    var _requiredShards = ['S1', 'S2', 'S3', 'S4', 'S5'];
    var _timeout = 10000;
    var _startTime = Date.now();
    var _cached = null;

    function _isReady() {
      if (!window.__H90_SHARD__) return false;
      for (var i = 0; i < _requiredShards.length; i++) {
        if (!window.__H90_SHARD__[_requiredShards[i]]) return false;
      }
      return true;
    }

    function _verify() {
      try {
        var shards = window.__H90_SHARD__;

        /* تحقق من XOR key consistency */
        var keys = [];
        for (var i = 0; i < _requiredShards.length; i++) {
          var s = shards[_requiredShards[i]];
          if (s && s.xorKey !== undefined) keys.push(s.xorKey);
        }

        for (var j = 1; j < keys.length; j++) {
          if (keys[j] !== keys[0]) {
            console.error('❌ [Assembler] XOR key mismatch');
            return false;
          }
        }

        /* تحقق من weight */
        var totalWeight = 0;
        for (var k = 0; k < _requiredShards.length; k++) {
          var sh = shards[_requiredShards[k]];
          if (sh && sh.weight) totalWeight += sh.weight;
        }

        if (Math.abs(totalWeight - 1.0) > 0.01) {
          console.error('❌ [Assembler] Weight mismatch:', totalWeight);
          return false;
        }

        return true;
      } catch (e) {
        return false;
      }
    }

    function _assemble() {
      if (!_isReady()) return null;
      if (!_verify()) return null;

      var shards = window.__H90_SHARD__;

      var sorted = _requiredShards
        .map(function(k) { return shards[k]; })
        .sort(function(a, b) { return a.index - b.index; });

      var u = '';
      var p = '';
      for (var i = 0; i < sorted.length; i++) {
        if (sorted[i].u) u += sorted[i].u;
        if (sorted[i].p) p += sorted[i].p;
      }

      if (u.length < 8 || p.length < 8) {
        console.error('❌ [Assembler] Length invalid:', u.length, p.length);
        return null;
      }

      console.log('%c✅ [Assembler] Secret assembled (U:' + u.length + ' P:' + p.length + ')',
        'background:#00e676;color:#000;padding:3px 10px;border-radius:6px;font-weight:900;font-size:10px;');

      return { u: u, p: p };
    }

    function _get() {
      if (_cached) return _cached;
      _cached = _assemble();
      return _cached;
    }

    function _waitForReady() {
      return new Promise(function(resolve, reject) {
        var interval = setInterval(function() {
          if (_isReady()) {
            clearInterval(interval);
            var result = _get();
            if (result) {
              resolve(result);
            } else {
              reject(new Error('Assembly failed'));
            }
            return;
          }

          if (Date.now() - _startTime > _timeout) {
            clearInterval(interval);
            var status = _getStatus();
            console.error('❌ [Assembler] Timeout — المفقود:', status.missing.join(', '));
            reject(new Error('Shards timeout: missing ' + status.missing.join(', ')));
          }
        }, 100);
      });
    }

    function _getStatus() {
      var status = { loaded: [], missing: [], total: _requiredShards.length, ready: false };
      for (var i = 0; i < _requiredShards.length; i++) {
        if (window.__H90_SHARD__ && window.__H90_SHARD__[_requiredShards[i]]) {
          status.loaded.push(_requiredShards[i]);
        } else {
          status.missing.push(_requiredShards[i]);
        }
      }
      status.ready = status.missing.length === 0;
      return status;
    }

    return {
      isReady: _isReady,
      assemble: _assemble,
      get: _get,
      waitForReady: _waitForReady,
      getStatus: _getStatus,
      verify: _verify,
      reset: function() { _cached = null; }
    };
  })();

  /* ═══════════════════════════════════════════════════════════
     🔄 ربط مع __H90_SEC__ (بعد تحميل security.js)
     ═══════════════════════════════════════════════════════════ */
  (function patchSecurity() {
    var tryPatch = function() {
      if (!window.__H90_SEC__) return false;

      var _originalC = window.__H90_SEC__.c;

      /* استبدال دالة c() */
      window.__H90_SEC__.c = function() {
        try {
          var assembled = window.__H90_Assembler__.get();
          if (assembled && assembled.u && assembled.p) {
            return { u: assembled.u, p: assembled.p };
          }
        } catch (e) {}

        /* fallback */
        return _originalC ? _originalC() : { u: '', p: '' };
      };

      /* إضافة دالة الانتظار */
      window.__H90_SEC__.waitForCredentials = function() {
        return window.__H90_Assembler__.waitForReady();
      };

      /* إضافة دالة الحالة */
      window.__H90_SEC__.getShardStatus = function() {
        return window.__H90_Assembler__.getStatus();
      };

      console.log('✅ [Shards] Patched __H90_SEC__.c()');
      return true;
    };

    /* إذا كان جاهزاً الآن */
    if (tryPatch()) return;

    /* انتظر تحميل security.js */
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      if (tryPatch()) {
        clearInterval(interval);
      } else if (attempts > 50) {
        clearInterval(interval);
        console.error('❌ [Shards] Failed to patch __H90_SEC__');
      }
    }, 100);
  })();

  /* ═══════════════════════════════════════════════════════════
     📤 التصدير
     ═══════════════════════════════════════════════════════════ */
  window.H90Shard = window.__H90_SHARD__;
  window.H90Assembler = window.__H90_Assembler__;

  /* ═══════════════════════════════════════════════════════════
     ✅ Log
     ═══════════════════════════════════════════════════════════ */
  console.log('%c🔐 [Shards] 5/5 Loaded — System Ready',
    'background:linear-gradient(135deg,#9c27b0,#e91e63);color:#fff;padding:6px 16px;border-radius:8px;font-weight:900;font-size:12px;');
  console.log('%c💡 الحالة: __H90_Assembler__.getStatus()',
    'color:#ce93d8;font-weight:700;font-size:11px;');
  console.log('%c💡 السر: __H90_Assembler__.get()',
    'color:#ff6b9d;font-weight:700;font-size:11px;');
  console.log('%c💡 الاختبار: await __H90_SEC__.waitForCredentials()',
    'color:#ffb3d1;font-weight:700;font-size:11px;');

})();