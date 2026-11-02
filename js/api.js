// كل الطلبات POST بنوع text/plain لتفادي CORS preflight عند العمل من file://
window.api = async function (action, data, opts) {
  opts = opts || {};
  if (!window.APP.API_URL || window.APP.API_URL.indexOf('PASTE') === 0) throw mkErr('CONFIG', 'لم يتم ضبط رابط الخادم في js/config.js');
  if (!navigator.onLine) { UI.showOffline(); throw mkErr('OFFLINE', 'لا يوجد اتصال بالإنترنت'); }
  var s = Session.get(), ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, window.APP.TIMEOUT_MS);
  var res, json;
  try {
    res = await fetch(window.APP.API_URL, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action: action, data: data || {}, token: s ? s.token : null}), signal: ctrl.signal});
    json = await res.json();
  } catch (e) {
    clearTimeout(timer);
    if (!navigator.onLine) { UI.showOffline(); throw mkErr('OFFLINE', 'لا يوجد اتصال بالإنترنت'); }
    throw mkErr('NETWORK', e.name === 'AbortError' ? 'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.' : 'تعذر الاتصال بالخادم. تحقق من الرابط ونشر التطبيق.');
  }
  clearTimeout(timer);
  if (!json || json.ok !== true) {
    if (json && json.code === 'SESSION') { Session.clear(); if (!opts.noRedirect) location.replace('login.html'); }
    throw mkErr(json && json.code || 'SERVER', json && json.error || 'استجابة غير متوقعة من الخادم');
  }
  if (action === 'publicOptions' && json.data && json.data.settings) UI.setBrand({siteName: json.data.settings.siteName, collegeName: json.data.settings.collegeName, logo: json.data.logo || ''});
  return json.data;
  function mkErr(code, message) { var e = new Error(message); e.code = code; return e; }
};
