(function () {
  var K = window.StaffKit; if (!K) return;
  var view = K.view, $ = K.$, esc = K.esc, opt = K.opt, empty = K.empty, run = K.run;
  var V = window.StaffViews = {};
  var STA = {pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض', suspended: 'موقوف'};
  var ST = {present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'غياب بعذر'};
  var ACT = {REGISTER: 'طلب حساب', ADD_STUDENT: 'إضافة طالب', APPROVE_STUDENT: 'قبول طالب', REJECT_STUDENT: 'رفض طالب', LOGIN: 'تسجيل دخول', LOGOUT: 'تسجيل خروج', RECORD_ATTENDANCE: 'تسجيل حضور', UPDATE_ATTENDANCE: 'تعديل حضور',
    RECORD_GRADES: 'رصد درجات', UPDATE_GRADES: 'تعديل درجات', CREATE_ASSESSMENT: 'إنشاء تقييم', SEND_MESSAGE: 'إرسال رسالة', ADD_ANNOUNCEMENT: 'نشر إعلان', DELETE_ANNOUNCEMENT: 'حذف إعلان', UPLOAD_MATERIAL: 'رفع ملف',
    DELETE_MATERIAL: 'حذف ملف', UPDATE_STUDENT: 'تعديل طالب', SUSPEND_STUDENT: 'تعطيل طالب', REACTIVATE_STUDENT: 'إعادة تفعيل', DELETE_STUDENT: 'حذف طالب', EXPORT_STUDENTS: 'تصدير بيانات', CHANGE_PASSWORD: 'تغيير كلمة المرور',
    CREATE_STAFF: 'إضافة موظف', ASSIGN_TEACHER: 'إسناد دكتور', RESET_REQUEST: 'طلب استعادة كلمة المرور', ISSUE_RESET: 'إصدار رمز استعادة', RESET_PASSWORD: 'استعادة كلمة المرور',
    SUSPEND_ADMIN: 'حظر مشرف', REACTIVATE_ADMIN: 'إلغاء حظر مشرف', DELETE_ADMIN: 'حذف مشرف', PRIVATE_ADMIN_MESSAGE: 'رسالة خاصة لمشرف'};
  var fmtD = function (d) { return new Date(d).toLocaleString('ar-EG', {dateStyle: 'medium', timeStyle: 'short'}); };
  var n = function (v, u) { return v === null || v === undefined ? '—' : v + (u || ''); };
  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };

  function modal(html) {
    var o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = '<div class="box" style="text-align:right;max-width:680px;max-height:90vh;overflow:auto" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-close]')) o.remove(); });
    return o;
  }
  function sections() { var m = {}; K.scope().forEach(function (s) { s.sections.forEach(function (c) { m[c.id] = c.name; }); }); return Object.keys(m).map(function (k) { return {id: k, name: m[k]}; }); }
  function filt(prefix) {
    return '<div class="grid2"><div class="field"><label for="' + prefix + 'S">المادة</label><select id="' + prefix + 'S"><option value="">الكل</option>' + opt(K.scope()) + '</select></div>' +
      '<div class="field"><label for="' + prefix + 'C">الشعبة</label><select id="' + prefix + 'C"><option value="">الكل</option>' + opt(sections()) + '</select></div></div>';
  }
  function tbl(cols, rows) {
    return '<div class="table-wrap"><table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c.h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (r, i) { return '<tr>' + cols.map(function (c) { var x = c.f(r, i); return '<td>' + (c.raw ? x : esc(n(x))) + '</td>'; }).join('') + '</tr>'; }).join('') :
        '<tr><td colspan="' + cols.length + '" class="empty">لا توجد بيانات</td></tr>') + '</tbody></table></div>';
  }
  var badge = function (l) { return '<span class="badge b-' + esc(l.key) + '">' + esc(l.label) + '</span>'; };

  /* ---------- لوحة المشرف ---------- */
  V.dashboard = async function () {
    view.innerHTML = '<span class="spinner"></span>';
    try {
      var d = await api('adminStats'), st = d.status;
      view.innerHTML = '<div class="stats">' + [['إجمالي الطلاب', d.total], ['حسابات جديدة (7 أيام)', d.newWeek], ['قيد المراجعة', st.pending], ['طلاب نشطون', st.approved], ['موقوفون', st.suspended || 0],
        ['إجمالي الحضور', d.present], ['إجمالي الغياب', d.absent], ['متوسط المستوى', n(d.avgScore, '%')], ['المواد التعليمية', d.materials], ['الرسائل المرسلة', d.messages], ['يحتاجون متابعة', d.warnings]]
        .map(function (x) { return '<div class="stat"><b>' + esc(x[1]) + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' +
        '<div class="charts"><div class="panel"><h3>توزيع مستويات الطلاب</h3><canvas id="chL"></canvas></div><div class="panel"><h3>حالات الحسابات</h3><canvas id="chS"></canvas></div></div>' +
        '<section class="panel"><h3>أحدث العمليات</h3>' + (d.recent.length ? d.recent.map(function (l) { return '<div class="note-item">' + esc(ACT[l.action] || l.action) + ' — ' + esc(l.userName) + (l.details ? ' <small>' + esc(l.details) + '</small>' : '') + '<small>' + fmtD(l.at) + '</small></div>'; }).join('') : empty('لا توجد عمليات')) + '</section>';
      if (window.Chart) {
        Chart.defaults.font.family = 'Cairo, Tahoma, sans-serif'; Chart.defaults.color = css('--ink');
        var L = d.levels;
        new Chart($('chL'), {type: 'bar', data: {labels: ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'يحتاج تحسين', 'غير مقيّم'], datasets: [{data: [L.excellent, L.vgood, L.good, L.pass, L.improve, L.none], backgroundColor: ['#1B7A46', '#2E8B8B', '#3F6FB5', '#B07D1E', '#B3261E', '#8A9A94']}]}, options: {plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true, ticks: {precision: 0}, grid: {color: css('--line')}}}}});
        new Chart($('chS'), {type: 'doughnut', data: {labels: ['مقبول', 'قيد المراجعة', 'مرفوض', 'موقوف'], datasets: [{data: [st.approved, st.pending, st.rejected || 0, st.suspended || 0], backgroundColor: [css('--brand'), css('--gold'), css('--danger'), '#8A9A94'], borderColor: css('--surface')}]}, options: {plugins: {legend: {position: 'bottom'}}}});
      }
    } catch (e) { view.innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
  };

  /* ---------- إدارة الطلاب ---------- */
  var F = {q: '', subjectId: '', sectionId: '', status: '', preset: '', sort: 'name', page: 1}, cache = {};
  V.students = function () {
    var admin = S.role === 'admin';
    view.innerHTML = '<section class="panel"><div class="field"><label for="fq">بحث (الاسم / الرقم القومي / الهاتف)</label><input id="fq" type="search" value="' + esc(F.q) + '"></div>' + filt('f') +
      '<div class="grid2"><div class="field"><label for="fSt">حالة الحساب</label><select id="fSt"><option value="">الكل</option>' + Object.keys(STA).map(function (k) { return '<option value="' + k + '">' + STA[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="fP">تصفية متقدمة</label><select id="fP"><option value="">بدون</option><option value="absent">الطلاب الغائبون</option><option value="alert">تجاوزوا نسبة الغياب</option><option value="improve">يحتاجون إلى تحسين</option><option value="pass">الناجحون</option><option value="ungraded">لم يتم تقييمهم</option></select></div>' +
      '<div class="field"><label for="fSort">الترتيب</label><select id="fSort"><option value="name">الاسم</option><option value="att">نسبة الحضور</option><option value="pct">نسبة الدرجات</option><option value="score">المستوى</option></select></div></div>' +
      '<div class="row-end"><button class="btn ghost" id="fXl">تصدير النتائج (Excel)</button>' + (admin ? '<button class="btn" id="fAdd">إضافة طالب</button>' : '') + '</div></section><div id="sList"></div>';
    $('fS').value = F.subjectId; $('fC').value = F.sectionId; $('fSt').value = F.status; $('fP').value = F.preset; $('fSort').value = F.sort;
    var t; $('fq').oninput = function () { clearTimeout(t); t = setTimeout(function () { F.q = $('fq').value; F.page = 1; load(); }, 400); };
    [['fS', 'subjectId'], ['fC', 'sectionId'], ['fSt', 'status'], ['fP', 'preset'], ['fSort', 'sort']].forEach(function (p) { $(p[0]).onchange = function () { F[p[1]] = this.value; F.page = 1; load(); }; });
    $('fXl').onclick = function () { run(this, async function () { Export.students(await api('exportStudents', F), 'الطلاب'); }, 'جارٍ التجهيز...'); };
    if (admin) $('fAdd').onclick = addModal;
    $('sList').onclick = onAct;
    load();
  };
  async function load() {
    var box = $('sList'); box.innerHTML = '<span class="spinner"></span>';
    try {
      var r = await api('listStudents', F), admin = S.role === 'admin'; cache = {}; r.rows.forEach(function (x) { cache[x.id] = x; });
      var base = (r.page - 1) * r.size;
      box.innerHTML = '<p>عدد النتائج: <b>' + r.total + '</b></p>' + tbl([
        {h: 'رقم', f: function (x, i) { return base + i + 1; }}, {h: 'الاسم', f: function (x) { return x.fullName; }}, {h: 'الرقم القومي', f: function (x) { return x.nationalId; }},
        {h: 'الشعبة', f: function (x) { return x.section; }}, {h: 'المادة', f: function (x) { return x.subject; }}, {h: 'الهاتف', f: function (x) { return x.phone; }},
        {h: 'الحالة', f: function (x) { return STA[x.status] || x.status; }}, {h: 'الحضور', f: function (x) { return n(x.attPct, '%'); }},
        {h: 'المجموع', f: function (x) { return x.sumMax ? x.sum + ' / ' + x.sumMax : '—'; }}, {h: 'المستوى', raw: true, f: function (x) { return badge(x.level); }},
        {h: 'إجراءات', raw: true, f: function (x) {
          var id = esc(x.id), u = esc(x.userId), b = function (a, l, c) { return '<button class="btn sm ' + (c || 'ghost') + '" data-a="' + a + '" data-id="' + id + '" data-u="' + u + '">' + l + '</button>'; };
          return '<div class="actions">' + b('view', 'عرض') + (admin ? b('edit', 'تعديل') : '') + b('msg', 'رسالة') + b('xl', 'Excel') +
            (admin && x.status === 'approved' ? b('off', 'تعطيل') : '') + (admin && x.status === 'suspended' ? b('on', 'إعادة تفعيل') : '') + (admin ? b('del', 'حذف', 'danger') : '') + '</div>'; }}], r.rows) +
        '<div class="row-end"><button class="btn ghost sm" id="pgP"' + (r.page <= 1 ? ' disabled' : '') + '>السابق</button><span>صفحة ' + r.page + ' من ' + r.pages + '</span><button class="btn ghost sm" id="pgN"' + (r.page >= r.pages ? ' disabled' : '') + '>التالي</button></div>';
      $('pgP').onclick = function () { F.page--; load(); }; $('pgN').onclick = function () { F.page++; load(); };
    } catch (e) { box.innerHTML = '<div class="alert err">' + esc(e.message) + ' <button class="btn sm" id="rt">إعادة المحاولة</button></div>'; $('rt').onclick = load; }
  }
  async function onAct(e) {
    var b = e.target.closest('button[data-a]'); if (!b) return; var a = b.dataset.a, id = b.dataset.id, s = cache[id];
    if (a === 'view') return run(b, function () { return viewModal(id); }, '...');
    if (a === 'xl') return run(b, async function () { Export.student(await api('studentDetail', {studentId: id})); }, '...');
    if (a === 'msg') return msgModal(s);
    if (a === 'edit') return editModal(s);
    if (a === 'off' || a === 'on') {
      if (!(await UI.confirm(a === 'off' ? 'تعطيل حساب ' + s.fullName + '؟ لن يستطيع الدخول.' : 'إعادة تفعيل حساب ' + s.fullName + '؟', {danger: a === 'off', yes: a === 'off' ? 'تعطيل' : 'تفعيل'}))) return;
      return run(b, async function () { var r = await api('setStudentStatus', {userId: b.dataset.u, status: a === 'off' ? 'suspended' : 'approved'}); UI.toast(r.message, 'ok'); load(); }, '...');
    }
    if (a === 'del') {
      if (!(await UI.confirm('حذف ' + s.fullName + ' نهائيًا مع كل درجاته وحضوره ورسائله؟ لا يمكن التراجع.', {danger: true, yes: 'حذف نهائي'}))) return;
      run(b, async function () { var r = await api('deleteStudent', {studentId: id}); UI.toast(r.message, 'ok'); load(); }, '...');
    }
  }
  async function viewModal(id) {
    var d = await api('studentDetail', {studentId: id}), s = d.student, c = d.stats;
    var o = modal('<h3>' + esc(s.fullName) + '</h3><div class="grid2"><div>الرقم القومي: <b dir="ltr">' + esc(s.nationalId) + '</b></div><div>الهاتف: <b dir="ltr">' + esc(s.phone) + '</b></div><div>المادة: <b>' + esc(s.subject) + '</b></div><div>الشعبة: <b>' + esc(s.section) + '</b></div>' +
      '<div>الحالة: <b>' + esc(STA[s.status] || s.status) + '</b></div><div>المستوى: ' + badge(c.level) + '</div><div>الحضور: <b>' + n(c.attPct, '%') + '</b> (' + c.counts.present + ' حضور / ' + c.counts.absent + ' غياب)</div><div>الدرجات: <b>' + (c.sumMax ? c.sum + ' / ' + c.sumMax + ' (' + c.pct + '%)' : '—') + '</b></div></div>' +
      '<h3 style="margin-top:1rem">الدرجات</h3>' + tbl([{h: 'التقييم', f: function (a) { return a.name; }}, {h: 'التاريخ', f: function (a) { return a.date; }}, {h: 'الدرجة', f: function (a) { return a.score === null ? '—' : a.score + ' / ' + a.max; }}, {h: 'ملاحظات', f: function (a) { return a.note; }}], d.assessments) +
      '<h3 style="margin-top:1rem">آخر الحضور</h3>' + tbl([{h: 'التاريخ', f: function (a) { return a.date; }}, {h: 'المحاضرة', f: function (a) { return a.lecture; }}, {h: 'الحالة', f: function (a) { return ST[a.status]; }}], d.attendance.slice(0, 15)) +
      '<div class="row-end"><button class="btn" id="mxl">تصدير Excel</button><button class="btn ghost" data-close>إغلاق</button></div>');
    o.querySelector('#mxl').onclick = function () { Export.student(d); };
  }
  function msgModal(s) {
    var o = modal('<h3>رسالة إلى ' + esc(s.fullName) + '</h3><div class="field"><label for="qT">العنوان</label><input id="qT" maxlength="120"></div><div class="field"><label for="qB">الرسالة</label><textarea id="qB" maxlength="2000"></textarea></div><div class="row-end"><button class="btn" id="qGo">إرسال</button><button class="btn ghost" data-close>إلغاء</button></div>');
    o.querySelector('#qGo').onclick = function () { var b = this; run(b, async function () { var r = await api('sendMessage', {toType: 'student', toValue: s.id, title: o.querySelector('#qT').value, body: o.querySelector('#qB').value}); UI.toast(r.message, 'ok'); o.remove(); }, 'جارٍ الإرسال...'); };
  }
  function studentForm(s) {
    s = s || {};
    return '<div class="field"><label for="eN">الاسم الرباعي</label><input id="eN" value="' + esc(s.fullName || '') + '"></div><div class="grid2"><div class="field"><label for="eI">الرقم القومي</label><input id="eI" dir="ltr" maxlength="14" value="' + esc(s.nationalId || '') + '"></div>' +
      '<div class="field"><label for="eP">الهاتف</label><input id="eP" dir="ltr" maxlength="11" value="' + esc(s.phone || '') + '"></div><div class="field"><label for="eSu">المادة</label><select id="eSu">' + opt(K.scope()) + '</select></div>' +
      '<div class="field"><label for="eSe">الشعبة</label><select id="eSe">' + opt(sections()) + '</select></div></div><div class="field"><label for="eE">البريد (اختياري)</label><input id="eE" dir="ltr" value="' + esc(s.email || '') + '"></div>';
  }
  function editModal(s) {
    var o = modal('<h3>تعديل بيانات الطالب</h3>' + studentForm(s) + '<div class="row-end"><button class="btn" id="eGo">حفظ</button><button class="btn ghost" data-close>إلغاء</button></div>');
    o.querySelector('#eSu').value = s.subjectId; o.querySelector('#eSe').value = s.sectionId;
    o.querySelector('#eGo').onclick = function () { var q = function (i) { return o.querySelector(i).value; };
      run(this, async function () { var r = await api('updateStudent', {studentId: s.id, fullName: q('#eN'), nationalId: q('#eI'), phone: q('#eP'), email: q('#eE'), subjectId: q('#eSu'), sectionId: q('#eSe')}); UI.toast(r.message, 'ok'); o.remove(); load(); }, 'جارٍ الحفظ...'); };
  }
  function addModal() {
    var o = modal('<h3>إضافة طالب</h3>' + studentForm() + '<div class="field"><label for="eW">كلمة المرور المبدئية</label><input id="eW" dir="ltr"><small>8 أحرف على الأقل مع حروف وأرقام. سلّمها للطالب ليغيرها.</small></div><div class="row-end"><button class="btn" id="eGo">إضافة</button><button class="btn ghost" data-close>إلغاء</button></div>');
    o.querySelector('#eGo').onclick = function () { var q = function (i) { return o.querySelector(i).value; };
      run(this, async function () { var r = await api('addStudent', {fullName: q('#eN'), nationalId: q('#eI'), phone: q('#eP'), email: q('#eE'), subjectId: q('#eSu'), sectionId: q('#eSe'), password: q('#eW')}); UI.toast(r.message, 'ok'); o.remove(); load(); }, 'جارٍ الإضافة...'); };
  }

  /* ---------- طلاب يحتاجون متابعة ---------- */
  V.warning = function () {
    view.innerHTML = '<section class="panel">' + filt('w') + '<button class="btn" id="wGo">عرض الطلاب</button></section><div id="wBox"></div>';
    $('wGo').onclick = function () {
      run(this, async function () {
        var l = await api('earlyWarning', {subjectId: $('wS').value, sectionId: $('wC').value});
        $('wBox').innerHTML = l.length ? '<p>عدد الطلاب: <b>' + l.length + '</b></p>' + l.map(function (x) {
          return '<div class="panel"><div class="li"><span class="nm">' + esc(x.fullName) + ' <small>— ' + esc(x.subject) + ' / ' + esc(x.section) + '</small></span>' + badge(x.level) + '</div><ul>' + x.reasons.map(function (r) { return '<li class="warn">' + esc(r) + '</li>'; }).join('') + '</ul>' +
            '<button class="btn ghost sm" data-m="' + esc(x.studentId) + '" data-n="' + esc(x.fullName) + '">إرسال رسالة</button></div>'; }).join('') : '<div class="alert ok">لا يوجد طلاب يحتاجون إلى متابعة حاليًا</div>';
      }, 'جارٍ التحليل...');
    };
    $('wBox').onclick = function (e) { var b = e.target.closest('button[data-m]'); if (b) msgModal({id: b.dataset.m, fullName: b.dataset.n}); };
  };

  /* ---------- المقارنات ---------- */
  V.stats = function () {
    view.innerHTML = '<span class="spinner"></span>';
    api('compare').then(function (g) {
      view.innerHTML = '<div class="charts"><div class="panel"><h3>متوسط المستوى</h3><canvas id="cA"></canvas></div><div class="panel"><h3>الحضور والغياب %</h3><canvas id="cB"></canvas></div></div>' +
        tbl([{h: 'المادة', f: function (x) { return x.subject; }}, {h: 'الشعبة', f: function (x) { return x.section; }}, {h: 'الطلاب', f: function (x) { return x.students; }}, {h: 'المتوسط', f: function (x) { return x.avg; }},
          {h: 'الأعلى', f: function (x) { return x.max; }}, {h: 'الأقل', f: function (x) { return x.min; }}, {h: 'نسبة النجاح', f: function (x) { return n(x.passRate, '%'); }}, {h: 'الحضور', f: function (x) { return n(x.attRate, '%'); }}, {h: 'الغياب', f: function (x) { return n(x.absRate, '%'); }}], g) +
        '<p><small>المقارنات تعرض إحصاءات مجمّعة فقط دون بيانات شخصية.</small></p>';
      if (window.Chart && g.length) {
        Chart.defaults.font.family = 'Cairo, Tahoma, sans-serif'; Chart.defaults.color = css('--ink');
        var lb = g.map(function (x) { return x.subject + (x.section === 'كل الشعب' ? '' : ' - ' + x.section); });
        new Chart($('cA'), {type: 'bar', data: {labels: lb, datasets: [{label: 'المتوسط', data: g.map(function (x) { return x.avg; }), backgroundColor: css('--brand')}]}, options: {scales: {y: {min: 0, max: 100, grid: {color: css('--line')}}}}});
        new Chart($('cB'), {type: 'bar', data: {labels: lb, datasets: [{label: 'الحضور %', data: g.map(function (x) { return x.attRate; }), backgroundColor: css('--brand')}, {label: 'الغياب %', data: g.map(function (x) { return x.absRate; }), backgroundColor: css('--danger')}]}, options: {scales: {y: {min: 0, max: 100, grid: {color: css('--line')}}}}});
      }
    }).catch(function (e) { view.innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; });
  };

  /* ---------- التقارير ---------- */
  var RP = {
    attendance: {t: 'تقرير الحضور', cols: [['الاسم', 'fullName'], ['الشعبة', 'section'], ['المحاضرات', 'total'], ['الحضور', 'present'], ['متأخر', 'late'], ['نسبة الحضور %', 'attPct']], sort: ['attPct', 1]},
    absence: {t: 'تقرير الغياب', cols: [['الاسم', 'fullName'], ['الشعبة', 'section'], ['الغياب', 'absent'], ['بعذر', 'excused'], ['نسبة الغياب %', 'absPct']], sort: ['absPct', -1]},
    grades: {t: 'تقرير الدرجات', cols: [['الاسم', 'fullName'], ['الشعبة', 'section'], ['المجموع', function (r) { return r.sumMax ? r.sum + ' / ' + r.sumMax : ''; }], ['النسبة %', 'pct'], ['المستوى', function (r) { return r.level.label; }]], sort: ['pct', -1]},
    top: {t: 'الطلاب الأعلى أداءً', cols: [['الاسم', 'fullName'], ['الشعبة', 'section'], ['المؤشر العام %', 'score'], ['المستوى', function (r) { return r.level.label; }]], sort: ['score', -1], filter: function (r) { return r.score !== null; }, limit: 10},
    bottom: {t: 'الطلاب الأقل أداءً', cols: [['الاسم', 'fullName'], ['الشعبة', 'section'], ['المؤشر العام %', 'score'], ['المستوى', function (r) { return r.level.label; }]], sort: ['score', 1], filter: function (r) { return r.score !== null; }, limit: 10},
    over: {t: 'الطلاب الذين تجاوزوا نسبة الغياب', cols: [['الاسم', 'fullName'], ['الشعبة', 'section'], ['الغياب', 'absent'], ['نسبة الغياب %', 'absPct'], ['الهاتف', 'phone']], sort: ['absPct', -1], filter: function (r) { return r.alert; }},
    accounts: {t: 'تقرير الحسابات الجديدة (آخر 30 يومًا)', admin: true, cols: [['الاسم', 'fullName'], ['الرقم القومي', 'nationalId'], ['المادة', 'subject'], ['الحالة', function (r) { return STA[r.status]; }], ['تاريخ الطلب', function (r) { return new Date(r.createdAt).toLocaleDateString('ar-EG'); }]],
      filter: function (r) { return Date.now() - new Date(r.createdAt).getTime() < 30 * 86400000; }, sort: ['createdAt', -1]}
  };
  V.reports = function () {
    var admin = S.role === 'admin', keys = Object.keys(RP).filter(function (k) { return !RP[k].admin || admin; });
    view.innerHTML = '<section class="panel"><div class="field"><label for="rT">نوع التقرير</label><select id="rT">' + keys.map(function (k) { return '<option value="' + k + '">' + RP[k].t + '</option>'; }).join('') + '<option value="avg">تقرير متوسط درجات الطلاب</option>' + (admin ? '<option value="activity">تقرير النشاط داخل النظام</option>' : '') + '</select></div>' + filt('r') +
      '<div class="row-end"><button class="btn" id="rGo">عرض التقرير</button><button class="btn ghost" id="rPr" hidden>طباعة</button><button class="btn ghost" id="rXl" hidden>تصدير Excel</button></div></section><div id="rOut" class="print-area"></div>';
    var cur = null;
    $('rGo').onclick = function () {
      run(this, async function () {
        var t = $('rT').value, out = $('rOut'), title = $('rT').selectedOptions[0].textContent, cols, rows;
        if (t === 'activity') {
          var l = await api('auditLogs'); cols = [{h: 'الوقت', f: function (x) { return fmtD(x.at); }}, {h: 'المستخدم', f: function (x) { return x.userName; }}, {h: 'العملية', f: function (x) { return ACT[x.action] || x.action; }}, {h: 'التفاصيل', f: function (x) { return x.details; }}]; rows = l;
        } else {
          var r = await api('exportStudents', {subjectId: $('rS').value, sectionId: $('rC').value, status: t === 'accounts' ? '' : 'approved'}); rows = r.rows;
          if (t === 'avg') {
            var g = {}; rows.forEach(function (x) { var k = x.subject + ' / ' + x.section; (g[k] = g[k] || []).push(x); });
            rows = Object.keys(g).map(function (k) { var a = g[k], sc = a.filter(function (x) { return x.score !== null; }).map(function (x) { return x.score; });
              return {k: k, n: a.length, avg: sc.length ? Math.round(sc.reduce(function (p, q) { return p + q; }, 0) / sc.length * 10) / 10 : null, att: Math.round((a.reduce(function (p, q) { return p + (q.attPct || 0); }, 0) / a.length) * 10) / 10}; });
            cols = [{h: 'المادة / الشعبة', f: function (x) { return x.k; }}, {h: 'عدد الطلاب', f: function (x) { return x.n; }}, {h: 'متوسط المستوى %', f: function (x) { return x.avg; }}, {h: 'متوسط الحضور %', f: function (x) { return x.att; }}];
          } else {
            var d = RP[t]; if (d.filter) rows = rows.filter(d.filter);
            if (d.sort) rows.sort(function (a, b) { var k = d.sort[0], dir = d.sort[1], x = a[k], y = b[k]; if (x === null) x = -1; if (y === null) y = -1; return x < y ? -dir : x > y ? dir : 0; });
            if (d.limit) rows = rows.slice(0, d.limit);
            cols = d.cols.map(function (c) { return {h: c[0], f: typeof c[1] === 'function' ? c[1] : function (x) { return x[c[1]]; }}; });
          }
        }
        cur = {title: title, cols: cols, rows: rows};
        out.innerHTML = '<h3>' + esc(title) + '</h3><p><small>' + new Date().toLocaleDateString('ar-EG') + ' — عدد السجلات: ' + rows.length + '</small></p>' + tbl(cols, rows);
        $('rPr').hidden = false; $('rXl').hidden = false;
      }, 'جارٍ إعداد التقرير...');
    };
    $('rPr').onclick = function () { window.print(); };
    $('rXl').onclick = function () { if (cur) Export.table(cur.title, cur.cols, cur.rows); };
  };

  /* ---------- سجل العمليات ---------- */
  V.audit = async function () {
    view.innerHTML = '<span class="spinner"></span>';
    try {
      var l = await api('auditLogs');
      view.innerHTML = '<div class="field"><label for="aq">بحث في السجل</label><input id="aq" type="search"></div><div id="aT"></div>';
      var draw = function () { var q = $('aq').value.trim(); var f = l.filter(function (x) { return !q || (x.userName + ' ' + (ACT[x.action] || x.action) + ' ' + x.details).indexOf(q) > -1; });
        $('aT').innerHTML = tbl([{h: 'الوقت', f: function (x) { return fmtD(x.at); }}, {h: 'المستخدم', f: function (x) { return x.userName; }}, {h: 'العملية', f: function (x) { return ACT[x.action] || x.action; }}, {h: 'التفاصيل', f: function (x) { return x.details; }}], f); };
      $('aq').oninput = draw; draw();
    } catch (e) { view.innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
  };

  /* ---------- المشرفون ---------- */
  V.admins = async function () {
    view.innerHTML = '<span class="spinner"></span>';
    try {
      var result = await api('listAdmins'), admins = result.admins, owner = result.canManage;
      view.innerHTML = (owner ? '<section class="panel"><h3>إضافة مشرف</h3><div class="grid2">' +
        fld('adName', 'الاسم الكامل', '') + fld('adUser', 'اسم المستخدم (إنجليزي)', '', 'text', 'dir="ltr" autocomplete="username"') +
        fld('adPass', 'كلمة المرور الأولية', '', 'password', 'dir="ltr" autocomplete="new-password"') +
        fld('adEmail', 'البريد الإلكتروني (اختياري)', '', 'email', 'dir="ltr"') + fld('adPhone', 'الهاتف (اختياري)', '', 'text', 'dir="ltr"') +
        '</div><small>اسم المستخدم من 4 إلى 30 حرفًا أو رقمًا، وكلمة المرور 8 أحرف على الأقل وتضم حروفًا وأرقامًا.</small><div class="row-end"><button class="btn" id="adAdd">إضافة المشرف</button></div></section>' : '') +
        '<section class="panel"><h3>حسابات المشرفين</h3><div id="adNotice" aria-live="polite"></div>' +
        tbl([{h: 'الاسم', f: function (x) { return x.fullName; }}, {h: 'اسم المستخدم', f: function (x) { return x.username; }},
          {h: 'الحالة', f: function (x) { return x.status === 'approved' ? 'نشط' : 'موقوف'; }},
          {h: 'الإجراءات', raw: true, f: function (x) {
            if (!owner) return x.current ? '<span class="badge">أنت</span>' : '<span class="muted">إدارة الحساب للمالك فقط</span>';
            var buttons = '<button class="btn ghost sm" data-admin-action="message" data-id="' + esc(x.id) + '">رسالة خاصة</button> ' +
              '<button class="btn ghost sm" data-admin-action="reset" data-id="' + esc(x.id) + '">إصدار رمز استعادة</button> ';
            if (x.current) buttons += '<span class="badge">المالك</span>';
            else buttons += '<button class="btn sm ' + (x.status === 'approved' ? 'danger' : '') + '" data-admin-action="' + (x.status === 'approved' ? 'suspend' : 'activate') + '" data-id="' + esc(x.id) + '">' + (x.status === 'approved' ? 'حظر' : 'إلغاء الحظر') + '</button> ' +
              '<button class="btn danger sm" data-admin-action="delete" data-id="' + esc(x.id) + '">حذف</button>';
            return '<div class="actions">' + buttons + '</div>';
          }}], admins) + '</section>' +
        '<section class="panel"><h3>الرسائل الخاصة الواردة</h3><div id="adInbox"><span class="spinner"></span></div></section>';
      if (owner) $('adAdd').onclick = function () {
        run(this, async function () {
          await api('createStaff', {role: 'admin', fullName: $('adName').value, username: $('adUser').value, password: $('adPass').value, email: $('adEmail').value, phone: $('adPhone').value});
          UI.toast('تمت إضافة المشرف', 'ok'); V.admins();
        }, 'جارٍ الإضافة...');
      };
      async function loadInbox() {
        var box = $('adInbox');
        try {
          var messages = await api('inbox');
          box.innerHTML = messages.length ? messages.map(function (m) {
            return '<details class="panel msg" data-id="' + esc(m.id) + '"><summary' + (m.read ? '' : ' class="unread"') + '>' + (!m.read ? 'رسالة جديدة: ' : '') + esc(m.title) +
              '<small> — ' + esc(m.from) + ' · ' + fmtD(m.createdAt) + '</small></summary><p style="white-space:pre-wrap">' + esc(m.body) + '</p>' + (!m.read ? '<button class="btn ghost sm" data-admin-action="read" data-id="' + esc(m.id) + '">تحديد كمقروءة</button>' : '') + '</details>';
          }).join('') : empty('لا توجد رسائل خاصة');
        } catch (e) { box.innerHTML = '<div class="alert err">' + esc(e.message) + ' <button class="btn sm" id="adInboxRetry">إعادة المحاولة</button></div>'; $('adInboxRetry').onclick = loadInbox; }
      }
      loadInbox();
      view.onclick = async function (e) {
        var b = e.target.closest('button[data-admin-action]'); if (!b) return;
        var id = b.dataset.id, action = b.dataset.adminAction;
        if (action === 'read') return run(b, async function () { await api('markMessageRead', {id: id}); loadInbox(); }, 'جارٍ التحديث...');
        if (action === 'message') {
          var target = admins.filter(function (x) { return x.id === id; })[0];
          var o = modal('<h3>رسالة خاصة إلى ' + esc(target.fullName) + '</h3><div class="field"><label for="adMsgTitle">العنوان</label><input id="adMsgTitle" maxlength="120"></div><div class="field"><label for="adMsgBody">الرسالة</label><textarea id="adMsgBody" maxlength="2000"></textarea></div><div class="row-end"><button class="btn" id="adMsgSend">إرسال</button><button class="btn ghost" data-close>إلغاء</button></div>');
          o.querySelector('#adMsgSend').onclick = function () { run(this, async function () { var r = await api('sendAdminMessage', {userId: id, title: o.querySelector('#adMsgTitle').value, body: o.querySelector('#adMsgBody').value}); UI.toast(r.message, 'ok'); o.remove(); }, 'جارٍ الإرسال...'); };
          return;
        }
        if (action === 'reset') return run(b, async function () {
          var r = await api('adminIssueReset', {userId: id}), notice = $('adNotice');
          notice.innerHTML = '<div class="alert ok">' + esc(r.message) + ' الرمز: <b dir="ltr">' + esc(r.code) + '</b> <button class="btn ghost sm" id="adCopy">نسخ الرمز</button></div>';
          $('adCopy').onclick = async function () {
            try { await navigator.clipboard.writeText(r.code); UI.toast('تم نسخ الرمز', 'ok'); }
            catch (err) { UI.toast('تعذر النسخ تلقائيًا؛ حدّد الرمز وانسخه يدويًا.', 'err'); }
          };
        }, 'جارٍ الإصدار...');
        if (action === 'delete') {
          var targetAdmin = admins.filter(function (x) { return x.id === id; })[0];
          if (!(await UI.confirm('حذف حساب المشرف ' + targetAdmin.fullName + ' نهائيًا مع جلساته ورسائله؟ لا يمكن التراجع.', {danger: true, yes: 'حذف نهائي'}))) return;
          return run(b, async function () { var r = await api('deleteAdmin', {userId: id}); UI.toast(r.message, 'ok'); V.admins(); }, 'جارٍ الحذف...');
        }
        var suspend = action === 'suspend';
        if (!(await UI.confirm(suspend ? 'حظر حساب هذا المشرف؟' : 'إلغاء حظر حساب هذا المشرف؟', {danger: suspend, yes: suspend ? 'حظر' : 'إلغاء الحظر'}))) return;
        run(b, async function () { var r = await api('setAdminStatus', {userId: id, status: suspend ? 'suspended' : 'approved'}); UI.toast(r.message, 'ok'); V.admins(); }, 'جارٍ التحديث...');
      };
    } catch (e) {
      var message = e.code === 'UNKNOWN_ACTION' ? 'إصدار Apps Script المنشور لا يحتوي أدوات إدارة المشرفين. حدّث النشر إلى إصدار جديد ثم أعد تحميل الصفحة.' : e.message;
      view.innerHTML = '<div class="alert err">' + esc(message) + '</div>';
    }
  };

  /* ---------- الإعدادات ---------- */
  function fld(id, label, val, type, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '" ' + (extra || '') + '></div>'; }
  function yn(id, label, val) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '"><option value="true"' + (val === 'true' ? ' selected' : '') + '>نعم</option><option value="false"' + (val !== 'true' ? ' selected' : '') + '>لا</option></select></div>'; }
  function resizePng(file, max) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { var r = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/png')); };
      img.onerror = function () { rej(new Error('الملف ليس صورة صالحة')); }; img.src = url;
    });
  }
  V.settings = async function () {
    view.innerHTML = '<span class="spinner"></span>';
    try {
      var r = await api('getSettings'), v = r.values, L = await api('adminLists');
      view.innerHTML = '<section class="panel"><h3>بيانات النظام</h3><div class="grid2">' + fld('s_siteName', 'اسم الموقع', v.siteName) + fld('s_collegeName', 'اسم الكلية', v.collegeName) + fld('s_academicYear', 'السنة الدراسية', v.academicYear) + fld('s_semester', 'الفصل الدراسي', v.semester) + '</div></section>' +
        '<section class="panel"><h3>الغياب والجلسات</h3><div class="grid2">' + fld('s_maxAbsencePct', 'الحد الأقصى لنسبة الغياب %', v.maxAbsencePct, 'number', 'min="0" max="100"') + fld('s_sessionHours', 'مدة الجلسة (ساعات)', v.sessionHours, 'number', 'min="1" max="72"') +
        yn('s_uniquePhone', 'منع تكرار رقم الهاتف', v.uniquePhone) + yn('s_showRank', 'إظهار ترتيب الطالب', v.showRank) + '</div></section>' +
        '<section class="panel"><h3>أوزان المستوى الذكي (المجموع 100%)</h3><div class="grid2">' + fld('s_wAttendance', 'الحضور %', v.wAttendance, 'number', 'min="0" max="100"') + fld('s_wExams', 'الاختبارات %', v.wExams, 'number', 'min="0" max="100"') + fld('s_wHomework', 'الواجبات %', v.wHomework, 'number', 'min="0" max="100"') + fld('s_wEval', 'التقييمات %', v.wEval, 'number', 'min="0" max="100"') + '</div>' +
        '<h3>حدود المستويات (من 100)</h3><div class="grid2">' + fld('s_lvlExcellent', 'ممتاز من', v.lvlExcellent, 'number') + fld('s_lvlVeryGood', 'جيد جدًا من', v.lvlVeryGood, 'number') + fld('s_lvlGood', 'جيد من', v.lvlGood, 'number') + fld('s_lvlPass', 'مقبول من', v.lvlPass, 'number') + '</div>' +
        '<div class="row-end"><button class="btn" id="sSave">حفظ الإعدادات</button></div></section>' +
        '<section class="panel"><h3>الشعار</h3><p><small>ارفع صورة الشعار الرسمية بنفسك (تُصغَّر تلقائيًا إلى 256 بكسل).</small></p><div class="field"><input type="file" id="lgF" accept="image/*"></div><div class="row-end"><button class="btn" id="lgUp">رفع الشعار</button>' + (r.hasLogo ? '<button class="btn ghost" id="lgDel">حذف الشعار</button>' : '') + '</div></section>' +
        '<section class="panel"><h3>المواد</h3><div id="subs"></div><div class="row-end"><button class="btn ghost" id="subAdd">إضافة مادة</button></div></section>' +
        '<section class="panel"><h3>الشعب</h3><div id="secs"></div><div class="row-end"><button class="btn ghost" id="secAdd">إضافة شعبة</button></div></section>';
      var keys = ['siteName', 'collegeName', 'academicYear', 'semester', 'maxAbsencePct', 'sessionHours', 'uniquePhone', 'showRank', 'wAttendance', 'wExams', 'wHomework', 'wEval', 'lvlExcellent', 'lvlVeryGood', 'lvlGood', 'lvlPass'];
      $('sSave').onclick = function () { run(this, async function () { var o = {}; keys.forEach(function (k) { o[k] = $('s_' + k).value; });
        var x = await api('saveSettings', {values: o}); UI.setBrand(x.brand); UI.toast(x.message, 'ok'); }, 'جارٍ الحفظ...'); };
      $('lgUp').onclick = function () { run(this, async function () { var f = $('lgF').files[0]; if (!f) throw new Error('اختر صورة الشعار أولًا');
        var url = await resizePng(f, 256), x = await api('saveLogo', {file: {data: url.split(',')[1], mime: 'image/png', name: 'logo.png'}}); UI.setBrand({logo: x.logo}); UI.toast(x.message, 'ok'); V.settings(); }, 'جارٍ الرفع...'); };
      if ($('lgDel')) $('lgDel').onclick = function () { run(this, async function () { var x = await api('removeLogo'); UI.setBrand({logo: ''}); UI.toast(x.message, 'ok'); V.settings(); }, '...'); };
      function items(box, list, kind) {
        $(box).innerHTML = list.length ? list.map(function (x) {
          return '<div class="li"><span><input data-n value="' + esc(x.name) + '" aria-label="الاسم">' + (kind === 'sub' ? ' <input data-c value="' + esc(x.code) + '" placeholder="الرمز" style="min-width:90px" aria-label="الرمز">' : '') + '</span><span><label style="display:inline"><input type="checkbox" data-a ' + (x.active ? 'checked' : '') + ' style="width:auto;min-height:0"> فعّال</label> ' +
            '<button class="btn sm" data-id="' + esc(x.id) + '">حفظ</button></span></div>'; }).join('') : empty('لا توجد عناصر');
        $(box).onclick = function (e) { var b = e.target.closest('button[data-id]'); if (!b) return; var row = b.closest('.li');
          run(b, async function () { var x = await api(kind === 'sub' ? 'saveSubject' : 'saveSection', {id: b.dataset.id, name: row.querySelector('[data-n]').value, code: row.querySelector('[data-c]') ? row.querySelector('[data-c]').value : '', active: row.querySelector('[data-a]').checked});
            UI.toast(x.message, 'ok'); await K.refresh(); }, '...'); };
      }
      items('subs', L.subjects, 'sub'); items('secs', L.sections, 'sec');
      var add = function (kind) { var o = modal('<h3>' + (kind === 'sub' ? 'إضافة مادة' : 'إضافة شعبة') + '</h3><div class="field"><label for="nm">الاسم</label><input id="nm"></div>' + (kind === 'sub' ? '<div class="field"><label for="cd">الرمز</label><input id="cd"></div>' : '') + '<div class="row-end"><button class="btn" id="go">إضافة</button><button class="btn ghost" data-close>إلغاء</button></div>');
        o.querySelector('#go').onclick = function () { run(this, async function () { await api(kind === 'sub' ? 'saveSubject' : 'saveSection', {name: o.querySelector('#nm').value, code: o.querySelector('#cd') ? o.querySelector('#cd').value : '', active: true}); o.remove(); await K.refresh(); UI.toast('تمت الإضافة', 'ok'); V.settings(); }, '...'); }; };
      $('subAdd').onclick = function () { add('sub'); }; $('secAdd').onclick = function () { add('sec'); };
    } catch (e) { view.innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
  };

  /* ---------- النسخ الاحتياطي والبيانات التجريبية ---------- */
  V.backup = function () {
    var T = [['all', 'نسخة كاملة'], ['students', 'الطلاب'], ['grades', 'الدرجات'], ['attendance', 'الحضور'], ['messages', 'الرسائل'], ['settings', 'الإعدادات']];
    view.innerHTML = '<section class="panel"><h3>نسخ احتياطي</h3><p><small>لا تتضمن النسخ كلمات المرور أو بيانات الجلسات. احفظها في مكان آمن لأنها تحوي بيانات شخصية.</small></p><div class="field"><label for="bF">الصيغة</label><select id="bF"><option value="xlsx">Excel (ملف واحد بعدة أوراق)</option><option value="csv">CSV (ملف لكل ورقة)</option></select></div>' +
      '<div class="grid2"><label class="field"><input id="bNationalId" type="checkbox" checked style="width:auto;min-height:0;margin-inline-end:.4rem">إرفاق الرقم القومي</label><label class="field"><input id="bPhone" type="checkbox" checked style="width:auto;min-height:0;margin-inline-end:.4rem">إرفاق رقم الهاتف</label></div><small>تُطبّق الخيارات على أوراق الطلاب والدرجات والحضور في Excel وCSV.</small>' +
      '<div class="row-end">' + T.map(function (t) { return '<button class="btn ' + (t[0] === 'all' ? '' : 'ghost') + '" data-w="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="panel"><h3>البيانات التجريبية</h3><p><small>تنشئ مادة وشعبتين ودكتورًا و10 طلاب مع حضور ودرجات ورسائل وإعلان للتجربة. كلها تُحذف بزر واحد دون المساس ببياناتك الحقيقية.</small></p><div class="row-end"><button class="btn" id="dSeed">إنشاء بيانات تجريبية</button><button class="btn danger" id="dClear">حذف البيانات التجريبية</button></div><div id="dOut"></div></section>';
    view.onclick = function (e) {
      var b = e.target.closest('button[data-w]'); if (!b) return;
      run(b, async function () {
        var r = await api('backupData', {what: b.dataset.w, includeNationalId: $('bNationalId').checked, includePhone: $('bPhone').checked}), d = new Date().toISOString().slice(0, 10), name = 'نسخة-' + b.dataset.w + '-' + d;
        if ($('bF').value === 'xlsx') Export.save(name, r.sheets); else r.sheets.forEach(function (s) { Export.csv(name + '-' + s.name, s.rows); });
      }, 'جارٍ التجهيز...');
    };
    $('dSeed').onclick = function () { run(this, async function () { var r = await api('seedDemo'); await K.refresh();
      $('dOut').innerHTML = '<div class="alert ok">' + esc(r.message) + '<br>دكتور: <b dir="ltr">' + esc(r.teacher) + '</b> — طالب (الرقم القومي): <b dir="ltr">' + esc(r.student) + '</b> — كلمة المرور للجميع: <b dir="ltr">' + esc(r.password) + '</b></div>'; }, 'جارٍ الإنشاء...'); };
    $('dClear').onclick = async function () { if (!(await UI.confirm('حذف كل البيانات التجريبية؟ لن تتأثر بياناتك الحقيقية.', {danger: true, yes: 'حذف'}))) return;
      run(this, async function () { var r = await api('clearDemo'); await K.refresh(); $('dOut').innerHTML = '<div class="alert ok">' + esc(r.message) + '</div>'; }, 'جارٍ الحذف...'); };
  };
})();