(function () {
  var UI = window.UI = {};
  UI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  // الثيم (LocalStorage للتفضيلات فقط)
  UI.setTheme = function (t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('sms_theme', t); } catch (e) {} };
  UI.toggleTheme = function () { UI.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); };
  var saved = null; try { saved = localStorage.getItem('sms_theme'); } catch (e) {}
  UI.setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  UI.toast = function (msg, type) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  };
  UI.busy = function (btn, on, label) {
    if (on) { btn.dataset.l = btn.textContent; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ' + (label || 'جارٍ التنفيذ...'); }
    else { btn.disabled = false; btn.textContent = btn.dataset.l || btn.textContent; }
  };
  // تأكيد (مع حقل ملاحظة اختياري)
  UI.confirm = function (msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var o = document.createElement('div'); o.className = 'overlay';
      o.innerHTML = '<div class="box" role="dialog" aria-modal="true"><p>' + UI.esc(msg) + '</p>' +
        (opts.input ? '<input id="cfIn" placeholder="' + UI.esc(opts.input) + '">' : '') +
        '<div class="row"><button class="btn ' + (opts.danger ? 'danger' : '') + '" id="cfY">' + UI.esc(opts.yes || 'تأكيد') + '</button><button class="btn ghost" id="cfN">إلغاء</button></div></div>';
      document.body.appendChild(o);
      function done(v) { var val = opts.input ? o.querySelector('#cfIn').value : ''; o.remove(); resolve(v ? {ok: true, value: val} : null); }
      o.querySelector('#cfY').onclick = function () { done(true); };
      o.querySelector('#cfN').onclick = function () { done(false); };
      o.querySelector('#cfY').focus();
    });
  };
  // شاشة عدم الاتصال
  UI.showOffline = function () {
    if (document.getElementById('offlineScreen')) return;
    var o = document.createElement('div'); o.id = 'offlineScreen'; o.className = 'overlay offline';
    o.innerHTML = '<div class="box"><h2>لا يوجد اتصال بالإنترنت</h2><p>يجب الاتصال بالإنترنت لمتابعة استخدام نظام إدارة الطلاب.</p>' +
      '<button class="btn" id="retryBtn">إعادة المحاولة</button><p id="retryMsg" class="err" style="color:var(--danger)"></p></div>';
    document.body.appendChild(o);
    o.querySelector('#retryBtn').onclick = async function () {
      var b = this; UI.busy(b, true, 'جارٍ الفحص...');
      var ok = await UI.checkOnline(); UI.busy(b, false);
      if (ok) o.remove(); else o.querySelector('#retryMsg').textContent = 'ما زال الاتصال غير متاح.';
    };
  };
  UI.checkOnline = async function () {
    if (!navigator.onLine) return false;
    try { var c = new AbortController(); setTimeout(function () { c.abort(); }, 8000);
      var r = await fetch(window.APP.API_URL, {signal: c.signal}); return r.ok; } catch (e) { return false; }
  };
  window.addEventListener('offline', UI.showOffline);
  window.addEventListener('online', function () { var o = document.getElementById('offlineScreen'); if (o) o.remove(); });
  document.addEventListener('DOMContentLoaded', function () { if (!navigator.onLine) UI.showOffline(); });
  // الهوية (الاسم والشعار) - إعدادات واجهة غير حساسة
  UI.getBrand = function () { try { return JSON.parse(localStorage.getItem('sms_brand') || '{}'); } catch (e) { return {}; } };
  UI.setBrand = function (b) {
    var cur = UI.getBrand(); Object.keys(b).forEach(function (k) { if (b[k] !== undefined) cur[k] = b[k]; });
    try { localStorage.setItem('sms_brand', JSON.stringify(cur)); } catch (e) {} UI.applyBrand();
  };
  UI.applyBrand = function () {
    var b = UI.getBrand(), h = document.querySelector('.auth-brand h1'), p = document.querySelector('.auth-brand p'), slot = document.getElementById('logo');
    if (h && b.siteName) h.textContent = b.siteName; if (p && b.collegeName) p.textContent = b.collegeName;
    if (slot) { slot.innerHTML = ''; if (b.logo) { var im = new Image(); im.src = b.logo; im.alt = 'الشعار'; slot.appendChild(im); } else slot.textContent = 'شعار الكلية'; }
    var tb = document.querySelector('.topbar'), old = document.getElementById('tbLogo'); if (old) old.remove();
    if (tb && b.logo) { var i2 = new Image(); i2.id = 'tbLogo'; i2.src = b.logo; i2.alt = ''; i2.style.cssText = 'height:36px;width:36px;border-radius:50%;object-fit:cover'; tb.insertBefore(i2, tb.firstChild); }
  };
  document.addEventListener('DOMContentLoaded', UI.applyBrand);
})();