// تُحفظ الجلسة في هذا المتصفح فقط، ويمكن جعلها دائمة عبر خيار تذكر الجهاز.
window.Session = {
  get: function () {
    var raw = null;
    try { raw = localStorage.getItem('sms_session'); } catch (e) {}
    if (!raw) try { raw = sessionStorage.getItem('sms_session'); } catch (e) {}
    try { return JSON.parse(raw || 'null'); } catch (e) { return null; }
  },
  set: function (s, rememberDevice) {
    this.clear();
    try { (rememberDevice ? localStorage : sessionStorage).setItem('sms_session', JSON.stringify(s)); }
    catch (e) { try { sessionStorage.setItem('sms_session', JSON.stringify(s)); } catch (x) {} }
  },
  clear: function () {
    try { localStorage.removeItem('sms_session'); } catch (e) {}
    try { sessionStorage.removeItem('sms_session'); } catch (e) {}
  },
  home: function (role) { return {admin: 'admin.html', teacher: 'teacher.html', student: 'student.html'}[role] || 'login.html'; },
  // حارس الصفحات في الواجهة (الصلاحية الفعلية تُفحص في الخادم)
  guard: function (roles) {
    var s = this.get();
    if (!s || !s.token || new Date(s.expires) < new Date()) { this.clear(); location.replace('login.html'); return null; }
    if (roles.indexOf(s.role) < 0) { location.replace(this.home(s.role)); return null; }
    return s;
  },
  logout: async function () { try { await api('logout'); } catch (e) {} Session.clear(); location.replace('login.html'); }
};
