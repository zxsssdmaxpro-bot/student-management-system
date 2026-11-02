(function () {
  if (!window.S) return;
  var view = document.getElementById('view'), tabsEl = document.getElementById('tabs'), esc = UI.esc, scope = [];
  var $ = function (id) { return document.getElementById(id); };
  var ST = {present:'حاضر', absent:'غائب', late:'متأخر', excused:'غياب بعذر'};
  var TY = {coursework:'أعمال السنة', quiz:'اختبار قصير', monthly:'اختبار شهري', oral:'شفوي', practical:'عملي', homework:'واجبات', project:'مشروع', final:'امتحان نهائي', custom:'تقييم مخصص'};
  var TABS = [['approvals', 'طلبات الحسابات'], ['students', 'الطلاب'], ['attendance', 'الحضور والغياب'], ['grades', 'الدرجات'], ['summary', 'ملخص الفصل'], ['warning', 'يحتاجون متابعة'], ['stats', 'المقارنات'], ['reports', 'التقارير'], ['messages', 'الرسائل'], ['announcements', 'الإعلانات'], ['materials', 'المواد التعليمية']];
  if (S.role === 'admin') { TABS.unshift(['dashboard', 'لوحة المعلومات']); TABS.push(['staff', 'الدكاترة'], ['admins', 'المشرفون'], ['audit', 'سجل العمليات'], ['settings', 'الإعدادات'], ['backup', 'نسخ احتياطي وتجريبي']); }
  var NOSCOPE = ['approvals', 'staff', 'admins', 'dashboard', 'audit'];
  var VIEWS = {approvals: approvals, attendance: attendance, grades: grades, summary: summary, messages: messages, announcements: announcements, materials: materials, staff: staff};

  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function opt(list) { return list.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join(''); }
  function picker() { return '<div class="grid2"><div class="field"><label for="pSub">المادة</label><select id="pSub">' + opt(scope) + '</select></div><div class="field"><label for="pSec">الشعبة</label><select id="pSec"></select></div></div>'; }
  function bindPicker() {
    var sub = $('pSub'), sec = $('pSec');
    function f() { var s = scope.filter(function (x) { return x.id === sub.value; })[0]; sec.innerHTML = s ? opt(s.sections) : ''; }
    sub.onchange = f; f();
  }
  function pv() { return {subjectId: $('pSub').value, sectionId: $('pSec').value}; }
  function empty(t) { return '<div class="empty">' + esc(t) + '</div>'; }
  async function run(btn, fn, label) { UI.busy(btn, true, label); try { await fn(); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(btn, false); }

  tabsEl.innerHTML = TABS.map(function (t) { return '<button role="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('');
  tabsEl.onclick = function (e) { var b = e.target.closest('button[data-t]'); if (b) show(b.dataset.t); };
  function show(t) {
    if (!VIEWS[t] && !(window.StaffViews && StaffViews[t])) t = S.role === 'admin' ? 'dashboard' : 'approvals';
    Array.prototype.forEach.call(tabsEl.children, function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
    location.hash = t;
    if (NOSCOPE.indexOf(t) < 0 && !scope.length) { view.innerHTML = empty('لا توجد مواد مسندة إليك. تواصل مع المشرف لإسنادك إلى مادة وشعبة.'); return; }
    (VIEWS[t] || StaffViews[t])();
  }

  function approvals() { view.innerHTML = '<div id="pending"></div>'; mountApprovals($('pending')); }

  /* ---- الحضور ---- */
  function attendance() {
    view.innerHTML = '<section class="panel">' + picker() +
      '<div class="grid2"><div class="field"><label for="aDate">التاريخ</label><input type="date" id="aDate" value="' + today() + '"></div>' +
      '<div class="field"><label for="aLec">رقم المحاضرة</label><input type="number" id="aLec" min="1" max="50" value="1"></div></div>' +
      '<button class="btn" id="aLoad">عرض الطلاب</button></section><div id="aList"></div>';
    bindPicker();
    $('aLoad').onclick = function () {
      run(this, async function () {
        var q = pv(); q.date = $('aDate').value; q.lecture = $('aLec').value;
        draw(await api('getAttendance', q), q);
      }, 'جارٍ التحميل...');
    };
    function draw(rows, q) {
      var box = $('aList');
      if (!rows.length) { box.innerHTML = '<section class="panel">' + empty('لا يوجد طلاب مقبولون في هذه الشعبة') + '</section>'; return; }
      var edited = rows.filter(function (r) { return r.updatedBy; })[0];
      box.innerHTML = '<section class="panel">' + (edited ? '<p class="alert">سُجّل هذا الحضور سابقًا بواسطة ' + esc(edited.updatedBy) + '. الحفظ سيعدّله.</p>' : '') +
        '<div class="row-end" style="margin:0 0 .5rem"><button class="btn ghost sm" id="allP">تحديد الكل حاضر</button><button class="btn ghost sm" id="allA">تحديد الكل غائب</button></div>' +
        rows.map(function (r) {
          return '<div class="li"><span class="nm">' + esc(r.fullName) + '</span><select data-sid="' + esc(r.studentId) + '" aria-label="حالة ' + esc(r.fullName) + '">' +
            Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + ((r.status || 'present') === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select></div>';
        }).join('') + '<div class="row-end"><button class="btn" id="aSave">حفظ الحضور</button></div></section>';
      var setAll = function (v) { Array.prototype.forEach.call(box.querySelectorAll('select[data-sid]'), function (s) { s.value = v; }); };
      $('allP').onclick = function () { setAll('present'); }; $('allA').onclick = function () { setAll('absent'); };
      $('aSave').onclick = function () {
        run(this, async function () {
          var recs = Array.prototype.map.call(box.querySelectorAll('select[data-sid]'), function (s) { return {studentId: s.dataset.sid, status: s.value}; });
          var r = await api('saveAttendance', Object.assign({}, q, {records: recs})); UI.toast(r.message, 'ok');
        }, 'جارٍ الحفظ...');
      };
    }
  }

  /* ---- الدرجات ---- */
  function grades() {
    view.innerHTML = '<section class="panel">' + picker() + '<button class="btn" id="gLoad">عرض التقييمات</button></section><div id="gBox"></div>';
    bindPicker();
    $('gLoad').onclick = function () { run(this, loadAssess, 'جارٍ التحميل...'); };
    async function loadAssess() {
      var q = pv(), list = await api('listAssessments', q), box = $('gBox');
      box.innerHTML = '<section class="panel">' + (list.length ?
        '<div class="field"><label for="gAs">التقييم</label><select id="gAs">' + list.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.name) + ' — ' + esc(TY[a.type]) + ' — ' + esc(a.date) + ' (من ' + esc(a.maxScore) + ')</option>'; }).join('') + '</select></div>' +
        '<div class="row-end"><button class="btn" id="gOpen">فتح الدرجات</button><button class="btn ghost" id="gNew">تقييم جديد</button></div>' :
        empty('لا توجد تقييمات بعد') + '<div class="row-end"><button class="btn" id="gNew">إنشاء أول تقييم</button></div>') + '</section><div id="gForm"></div><div id="gRows"></div>';
      if (list.length) $('gOpen').onclick = function () { run(this, function () { return openGrades($('gAs').value); }, 'جارٍ التحميل...'); };
      $('gNew').onclick = function () { newForm(q); };
    }
    function newForm(q) {
      $('gForm').innerHTML = '<section class="panel"><h3>تقييم جديد</h3><div class="grid2"><div class="field"><label for="nName">اسم التقييم</label><input id="nName"></div>' +
        '<div class="field"><label for="nType">النوع</label><select id="nType">' + Object.keys(TY).map(function (k) { return '<option value="' + k + '">' + TY[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="nDate">التاريخ</label><input type="date" id="nDate" value="' + today() + '"></div>' +
        '<div class="field"><label for="nMax">الدرجة النهائية</label><input type="number" id="nMax" min="1" value="10"></div></div><button class="btn" id="nSave">إنشاء التقييم</button></section>';
      $('nSave').onclick = function () {
        run(this, async function () {
          var a = await api('createAssessment', Object.assign({}, q, {name: $('nName').value, type: $('nType').value, date: $('nDate').value, maxScore: $('nMax').value}));
          UI.toast('تم إنشاء التقييم', 'ok'); $('gForm').innerHTML = ''; await loadAssess(); $('gAs').value = a.id; await openGrades(a.id);
        }, 'جارٍ الإنشاء...');
      };
    }
    async function openGrades(id) {
      var r = await api('getGrades', {assessmentId: id}), box = $('gRows'), max = Number(r.assessment.maxScore);
      if (!r.students.length) { box.innerHTML = '<section class="panel">' + empty('لا يوجد طلاب مقبولون في هذه الشعبة') + '</section>'; return; }
      box.innerHTML = '<section class="panel"><h3>' + esc(r.assessment.name) + ' — من ' + max + '</h3>' + r.students.map(function (s) {
        return '<div class="li"><span class="nm">' + esc(s.fullName) + '</span><span><input type="number" step="0.25" min="0" max="' + max + '" data-sid="' + esc(s.studentId) + '" value="' + esc(s.score) + '" style="min-width:90px" aria-label="درجة ' + esc(s.fullName) + '"> ' +
          '<input data-note="' + esc(s.studentId) + '" value="' + esc(s.note) + '" placeholder="ملاحظة" style="min-width:140px"></span></div>';
      }).join('') + '<div class="row-end"><button class="btn" id="gSave">حفظ الدرجات</button></div></section>';
      $('gSave').onclick = function () {
        run(this, async function () {
          var recs = Array.prototype.map.call(box.querySelectorAll('input[data-sid]'), function (i) {
            var n = box.querySelector('input[data-note="' + i.dataset.sid + '"]'); return {studentId: i.dataset.sid, score: i.value, note: n ? n.value : ''}; });
          var res = await api('saveGrades', {assessmentId: id, records: recs}); UI.toast(res.message, 'ok');
        }, 'جارٍ الحفظ...');
      };
    }
  }

  /* ---- الملخص ---- */
  function summary() {
    view.innerHTML = '<section class="panel">' + picker() + '<button class="btn" id="sLoad">عرض الملخص</button></section><div id="sBox"></div>';
    bindPicker();
    $('sLoad').onclick = function () {
      run(this, async function () {
        var r = await api('classSummary', pv()), box = $('sBox'), n = function (v, u) { return v === null ? '—' : v + (u || ''); };
        if (!r.rows.length) { box.innerHTML = '<section class="panel">' + empty('لا يوجد طلاب مقبولون في هذه الشعبة') + '</section>'; return; }
        box.innerHTML = '<p>متوسط مستوى المجموعة: <b>' + n(r.groupAvg) + '</b> — عدد الطلاب: <b>' + r.rows.length + '</b></p><div class="table-wrap"><table><thead><tr>' + (r.showRank ? '<th>الترتيب</th>' : '') +
          '<th>الاسم</th><th>الحضور</th><th>الغياب</th><th>مجموع الدرجات</th><th>النسبة</th><th>المستوى</th></tr></thead><tbody>' +
          r.rows.map(function (x) {
            return '<tr>' + (r.showRank ? '<td>' + n(x.rank) + '</td>' : '') + '<td>' + esc(x.fullName) + '</td><td>' + n(x.attPct, '%') + '</td><td' + (x.alert ? ' class="warn"' : '') + '>' + x.absent + ' من ' + x.total + (x.alert ? ' ⚠' : '') +
              '</td><td>' + (x.sumMax ? x.sum + ' / ' + x.sumMax : '—') + '</td><td>' + n(x.pct, '%') + '</td><td><span class="badge b-' + esc(x.level.key) + '">' + esc(x.level.label) + '</span></td></tr>';
          }).join('') + '</tbody></table></div>';
      }, 'جارٍ التحميل...');
    };
  }

  /* ---- الرسائل ---- */
  var TT = {student: 'طالب', class: 'شعبة', subject: 'مادة', all: 'الجميع'};
  function messages() {
    view.innerHTML = '<section class="panel"><h3>رسالة جديدة</h3><div class="field"><label for="mType">المستلمون</label><select id="mType"><option value="student">طالب واحد</option><option value="class">شعبة محددة من المادة</option><option value="subject">كل شعب المادة</option>' +
      (S.role === 'admin' ? '<option value="all">جميع الطلاب</option>' : '') + '</select></div><div id="mPick">' + picker() + '</div><div class="field" id="mStuF"><label for="mStuQ">البحث عن طالب بالاسم أو الرقم القومي</label><input id="mStuQ" type="search" autocomplete="off" placeholder="اكتب الاسم أو الرقم القومي"><label for="mStu">قائمة الطلاب</label><select id="mStu"><option value="">اختر طالبًا</option></select></div>' +
      '<div class="field"><label for="mTitle">العنوان</label><input id="mTitle" maxlength="120"></div><div class="field"><label for="mBody">الرسالة</label><textarea id="mBody" maxlength="2000"></textarea></div><button class="btn" id="mSend">إرسال</button></section>' +
      '<section class="panel"><h3>الرسائل المرسلة</h3><div id="mSent"><span class="spinner"></span></div></section>';
    bindPicker();
    var studentRows = [];
    function normStudentSearch(value) {
      return String(value || '').toLowerCase().replace(/[٠-٩]/g, function (digit) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)); })
        .replace(/[۰-۹]/g, function (digit) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)); }).trim();
    }
    function drawStudentOptions() {
      var query = normStudentSearch($('mStuQ').value), selected = $('mStu').value;
      var filtered = studentRows.filter(function (student) {
        return !query || normStudentSearch(student.fullName).indexOf(query) > -1 || normStudentSearch(student.nationalId).indexOf(query) > -1;
      });
      $('mStu').innerHTML = '<option value="">' + (filtered.length ? 'اختر طالبًا' : 'لا توجد نتائج مطابقة') + '</option>' +
        filtered.map(function (student) { return '<option value="' + esc(student.id) + '">' + esc(student.fullName) + ' — ' + esc(student.nationalId) + '</option>'; }).join('');
      if (filtered.some(function (student) { return student.id === selected; })) $('mStu').value = selected;
    }
    function sync() { var t = $('mType').value; $('mPick').hidden = t === 'all'; $('pSec').parentNode.hidden = t === 'subject'; $('mStuF').hidden = t !== 'student'; if (t === 'student') loadStu(); }
    async function loadStu() {
      try { studentRows = await api('listClassStudents', pv()); $('mStuQ').value = ''; drawStudentOptions(); }
      catch (e) { UI.toast(e.message, 'err'); }
    }
    $('mStuQ').oninput = drawStudentOptions;
    $('mType').onchange = sync;
    $('pSub').addEventListener('change', function () { if ($('mType').value === 'student') loadStu(); });
    $('pSec').addEventListener('change', function () { if ($('mType').value === 'student') loadStu(); });
    sync();
    $('mSend').onclick = function () {
      run(this, async function () {
        var t = $('mType').value, p = t === 'all' ? {} : pv(), v = t === 'student' ? $('mStu').value : t === 'class' ? p.subjectId + '|' + p.sectionId : t === 'subject' ? p.subjectId : '';
        var r = await api('sendMessage', {toType: t, toValue: v, title: $('mTitle').value, body: $('mBody').value});
        UI.toast(r.message, 'ok'); $('mTitle').value = ''; $('mBody').value = ''; sent();
      }, 'جارٍ الإرسال...');
    };
    async function sent() {
      try {
        var l = await api('sentMessages');
        $('mSent').innerHTML = l.length ? '<div class="table-wrap"><table><thead><tr><th>العنوان</th><th>المستلمون</th><th>العدد</th><th>قرأها</th><th>التاريخ</th></tr></thead><tbody>' + l.map(function (m) {
          return '<tr><td>' + esc(m.title) + '</td><td>' + esc(TT[m.toType] || '') + '</td><td>' + m.count + '</td><td>' + m.read + '</td><td>' + new Date(m.createdAt).toLocaleString('ar-EG') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('لم ترسل رسائل بعد');
      } catch (e) { $('mSent').innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
    }
    sent();
  }

  /* ---- الإعلانات والمواد ---- */
  function scopeSelects(allowGeneral) {
    return '<div class="grid2"><div class="field"><label for="pSub">المادة</label><select id="pSub">' + (allowGeneral ? '<option value="">عام لكل الطلاب</option>' : '') + opt(scope) + '</select></div>' +
      '<div class="field"><label for="pSec">الشعبة</label><select id="pSec"></select></div></div>';
  }
  function bindScope() {
    var sub = $('pSub'), sec = $('pSec');
    function f() { var s = scope.filter(function (x) { return x.id === sub.value; })[0]; sec.innerHTML = '<option value="">كل الشعب</option>' + (s ? opt(s.sections) : ''); sec.disabled = !s; }
    sub.onchange = f; f();
  }
  function announcements() {
    view.innerHTML = '<section class="panel"><h3>إعلان جديد</h3>' + scopeSelects(S.role === 'admin') + '<div class="field"><label for="anT">العنوان</label><input id="anT" maxlength="150"></div>' +
      '<div class="field"><label for="anB">النص</label><textarea id="anB" maxlength="3000"></textarea></div><div class="field"><label for="anF">ملف مرفق (اختياري، حتى 30 ميجابايت)</label><input type="file" id="anF"></div><button class="btn" id="anGo">نشر الإعلان</button></section><div id="anList"><span class="spinner"></span></div>';
    bindScope();
    $('anGo').onclick = function () {
      run(this, async function () {
        var file = await Files.read($('anF'));
        var r = await api('addAnnouncement', {subjectId: $('pSub').value, sectionId: $('pSec').value, title: $('anT').value, body: $('anB').value, file: file});
        UI.toast(r.message, 'ok'); $('anT').value = ''; $('anB').value = ''; $('anF').value = ''; list();
      }, 'جارٍ النشر...');
    };
    async function list() {
      try {
        var l = await api('listAnnouncements');
        $('anList').innerHTML = l.length ? l.map(function (a) {
          return '<article class="panel"><h3>' + esc(a.title) + '</h3><small>' + new Date(a.createdAt).toLocaleString('ar-EG') + ' · ' + esc(a.by) + ' · ' + esc(a.subject) + ' / ' + esc(a.section) + '</small><p style="white-space:pre-wrap">' + esc(a.body) + '</p><div class="row-end">' +
            (a.fileName ? '<button class="btn ghost sm" data-k="announcement" data-id="' + esc(a.id) + '">تحميل: ' + esc(a.fileName) + '</button>' : '') + (a.mine ? '<button class="btn danger sm" data-del="' + esc(a.id) + '">حذف</button>' : '') + '</div></article>'; }).join('') : empty('لا توجد إعلانات');
      } catch (e) { $('anList').innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
    }
    $('anList').onclick = async function (e) {
      var d = e.target.closest('button[data-k]'); if (d) return Files.download(d.dataset.k, d.dataset.id, d);
      var b = e.target.closest('button[data-del]'); if (!b) return;
      if (!(await UI.confirm('حذف هذا الإعلان نهائيًا؟', {danger: true, yes: 'حذف'}))) return;
      run(b, async function () { var r = await api('deleteAnnouncement', {id: b.dataset.del}); UI.toast(r.message, 'ok'); list(); }, '...');
    };
    list();
  }
  function materials() {
    view.innerHTML = '<section class="panel"><h3>رفع مادة تعليمية</h3>' + scopeSelects(false) + '<div class="grid2"><div class="field"><label for="mtT">اسم الملف</label><input id="mtT" maxlength="150"></div>' +
      '<div class="field"><label for="mtL">المحاضرة</label><input id="mtL" maxlength="20" placeholder="مثال: المحاضرة 3"></div></div><div class="field"><label for="mtD">وصف</label><input id="mtD" maxlength="500"></div>' +
      '<div class="field"><label for="mtF">الملف (PDF, Word, PowerPoint, Excel, صور, TXT, ZIP — حتى 30 ميجابايت)</label><input type="file" id="mtF"></div><button class="btn" id="mtGo">رفع الملف</button></section><div id="mtList"><span class="spinner"></span></div>';
    bindScope();
    $('mtGo').onclick = function () {
      run(this, async function () {
        var file = await Files.read($('mtF')); if (!file) throw new Error('اختر الملف المراد رفعه');
        var r = await api('uploadMaterial', {subjectId: $('pSub').value, sectionId: $('pSec').value, title: $('mtT').value, lecture: $('mtL').value, description: $('mtD').value, file: file});
        UI.toast(r.message, 'ok'); ['mtT', 'mtL', 'mtD', 'mtF'].forEach(function (i) { $(i).value = ''; }); list();
      }, 'جارٍ الرفع...');
    };
    async function list() {
      try {
        var l = await api('listMaterials');
        $('mtList').innerHTML = l.length ? '<div class="table-wrap"><table><thead><tr><th>الملف</th><th>المادة / الشعبة</th><th>المحاضرة</th><th>أضافه</th><th>التاريخ</th><th></th></tr></thead><tbody>' + l.map(function (m) {
          return '<tr><td>' + esc(m.title) + '</td><td>' + esc(m.subject) + ' / ' + esc(m.section) + '</td><td>' + esc(m.lecture) + '</td><td>' + esc(m.by) + '</td><td>' + new Date(m.createdAt).toLocaleDateString('ar-EG') +
            '</td><td class="actions"><button class="btn sm" data-k="material" data-id="' + esc(m.id) + '">تحميل</button>' + (m.mine ? '<button class="btn danger sm" data-del="' + esc(m.id) + '">حذف</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('لا توجد مواد بعد');
      } catch (e) { $('mtList').innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
    }
    $('mtList').onclick = async function (e) {
      var d = e.target.closest('button[data-k]'); if (d) return Files.download(d.dataset.k, d.dataset.id, d);
      var b = e.target.closest('button[data-del]'); if (!b) return;
      if (!(await UI.confirm('حذف هذا الملف نهائيًا؟', {danger: true, yes: 'حذف'}))) return;
      run(b, async function () { var r = await api('deleteMaterial', {id: b.dataset.del}); UI.toast(r.message, 'ok'); list(); }, '...');
    };
    list();
  }

  /* ---- الدكاترة (مشرف) ---- */
  async function staff() {
    view.innerHTML = '<span class="spinner"></span>';
    try {
      var t = await api('listTeachers');
      view.innerHTML = '<section class="panel"><h3>إضافة دكتور</h3><div class="grid2"><div class="field"><label for="tName">الاسم</label><input id="tName"></div><div class="field"><label for="tUser">اسم المستخدم (إنجليزي)</label><input id="tUser" dir="ltr"></div>' +
        '<div class="field"><label for="tPass">كلمة المرور</label><input id="tPass" type="text" dir="ltr"></div><div class="field"><label for="tPhone">الهاتف</label><input id="tPhone" dir="ltr"></div></div><button class="btn" id="tAdd">إضافة الدكتور</button></section>' +
        '<section class="panel"><h3>إسناد دكتور إلى مادة</h3><div class="grid2"><div class="field"><label for="aT">الدكتور</label><select id="aT">' + opt(t.map(function (x) { return {id: x.userId, name: x.fullName}; })) + '</select></div>' +
        '<div class="field"><label for="pSub">المادة</label><select id="pSub">' + opt(scope) + '</select></div><div class="field"><label for="aSec">الشعبة</label><select id="aSec"></select></div></div><button class="btn" id="aGo">إسناد</button></section>' +
        '<div class="table-wrap"><table><thead><tr><th>الدكتور</th><th>اسم المستخدم</th><th>المواد المسندة</th></tr></thead><tbody>' + (t.length ? t.map(function (x) {
          return '<tr><td>' + esc(x.fullName) + '</td><td dir="ltr">' + esc(x.username) + '</td><td>' + (x.assignments.length ? x.assignments.map(esc).join('، ') : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="empty">لا يوجد دكاترة بعد</td></tr>') + '</tbody></table></div>';
      var fill = function () { var s = scope.filter(function (x) { return x.id === $('pSub').value; })[0]; $('aSec').innerHTML = '<option value="">كل الشعب</option>' + (s ? opt(s.sections) : ''); };
      $('pSub').onchange = fill; fill();
      $('tAdd').onclick = function () { run(this, async function () {
        await api('createStaff', {role: 'teacher', fullName: $('tName').value, username: $('tUser').value, password: $('tPass').value, phone: $('tPhone').value});
        UI.toast('تمت إضافة الدكتور', 'ok'); staff(); }, 'جارٍ الإضافة...'); };
      $('aGo').onclick = function () { run(this, async function () {
        if (!$('aT').value) throw new Error('أضف دكتورًا أولًا');
        await api('assignTeacher', {teacherUserId: $('aT').value, subjectId: $('pSub').value, sectionId: $('aSec').value}); UI.toast('تم الإسناد', 'ok'); staff(); }, 'جارٍ الإسناد...'); };
    } catch (e) { view.innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; }
  }

  window.StaffKit = {view: view, $: $, esc: esc, opt: opt, empty: empty, run: run, scope: function () { return scope; }, refresh: async function () { scope = await api('myScope'); }};
  (async function () {
    try { scope = await api('myScope'); } catch (e) { UI.toast(e.message, 'err'); }
    show(location.hash.slice(1) || (S.role === 'admin' ? 'dashboard' : 'approvals'));
  })();
})();
