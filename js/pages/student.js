(function () {
  if (!window.S) return;
  var root = document.getElementById('dash'), esc = UI.esc;
  var TY = {coursework:'أعمال السنة', quiz:'اختبار قصير', monthly:'اختبار شهري', oral:'شفوي', practical:'عملي', homework:'واجبات', project:'مشروع', final:'امتحان نهائي', custom:'تقييم مخصص'};
  var ST = {present:'حاضر', absent:'غائب', late:'متأخر', excused:'غياب بعذر'};
  var n = function (v, u) { return v === null || v === undefined ? '—' : v + (u || ''); };
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  async function load() {
    root.innerHTML = '<span class="spinner"></span>';
    try { render(await api('studentDashboard')); }
    catch (e) { root.innerHTML = '<div class="alert err">' + esc(e.message) + ' <button class="btn sm" id="rt">إعادة المحاولة</button></div>'; document.getElementById('rt').onclick = load; }
  }
  function render(d) {
    var p = d.profile, s = d.stats, c = s.counts, lvl = s.level;
    var alertHtml = s.alert ? '<div class="alert err" role="alert">تنبيه: نسبة غيابك ' + s.absPct + '% وتجاوزت الحد المسموح (' + d.maxAbsencePct + '%).</div>' : '';
    root.innerHTML = alertHtml + homeHtml(d.home) +
      '<section class="panel"><h3>بياناتي</h3><div class="grid2"><div>الاسم: <b>' + esc(p.fullName) + '</b></div><div>الرقم القومي: <b dir="ltr">' + esc(p.nationalIdMasked) + '</b></div>' +
      '<div>الشعبة: <b>' + esc(p.section) + '</b></div><div>المادة: <b>' + esc(p.subject) + '</b></div><div>الهاتف: <b dir="ltr">' + esc(p.phone) + '</b></div><div>حالة الحساب: <span class="badge b-excellent">مقبول</span></div></div></section>' +
      '<section class="panel"><h3>مستواي: <span class="badge b-' + esc(lvl.key) + '">' + esc(lvl.label) + '</span>' + (d.rank ? ' &nbsp; الترتيب: ' + d.rank : '') + '</h3>' +
      '<div class="meter ' + esc(lvl.key) + '" role="progressbar" aria-valuenow="' + (s.score || 0) + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + (s.score || 0) + '%"></span></div>' +
      '<small>المؤشر العام: ' + n(s.score, '%') + ' (حضور ' + n(s.comp.att, '%') + ' · اختبارات ' + n(s.comp.exams, '%') + ' · واجبات ' + n(s.comp.homework, '%') + ' · تقييمات ' + n(s.comp.eval, '%') + ')</small></section>' +
      '<div class="stats"><div class="stat"><b>' + c.total + '</b><span>عدد المحاضرات</span></div><div class="stat"><b>' + c.present + '</b><span>مرات الحضور</span></div><div class="stat"><b>' + c.absent + '</b><span>مرات الغياب</span></div>' +
      '<div class="stat"><b>' + n(s.attPct, '%') + '</b><span>نسبة الحضور</span></div><div class="stat"><b>' + (s.sumMax ? s.sum + ' / ' + s.sumMax : '—') + '</b><span>مجموع درجاتي</span></div><div class="stat"><b>' + n(s.pct, '%') + '</b><span>نسبة النجاح الحالية</span></div></div>' +
      '<div class="charts"><div class="panel"><h3>الحضور مقابل الغياب</h3><canvas id="cAtt" aria-label="رسم الحضور"></canvas></div><div class="panel"><h3>تطور درجاتي</h3><canvas id="cTrend" aria-label="رسم الدرجات"></canvas></div>' +
      '<div class="panel"><h3>أدائي مقابل متوسط المجموعة</h3><canvas id="cCmp" aria-label="مقارنة الأداء"></canvas></div></div>' +
      '<section class="panel"><h3>درجاتي</h3>' + gradesTable(d.assessments) + '</section>' +
      '<section class="panel"><h3>آخر سجلات الحضور</h3>' + (d.attendance.length ? '<div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>المحاضرة</th><th>الحالة</th></tr></thead><tbody>' +
        d.attendance.map(function (a) { return '<tr><td>' + esc(a.date) + '</td><td>' + esc(a.lecture) + '</td><td' + (a.status === 'absent' ? ' class="warn"' : '') + '>' + esc(ST[a.status] || a.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">لا توجد سجلات حضور بعد</div>') + '</section>' +
      '<section class="panel"><h3>الإشعارات' + (d.unread ? ' (' + d.unread + ' جديد)' : '') + '</h3>' + (d.notifications.length ? d.notifications.map(function (x) {
        return '<div class="note-item ' + (x.read ? '' : 'new') + '">' + esc(x.title) + (x.body ? ' — ' + esc(x.body) : '') + '<small>' + new Date(x.at).toLocaleString('ar-EG') + '</small></div>'; }).join('') +
        (d.unread ? '<div class="row-end"><button class="btn ghost sm" id="mr">تحديد الكل كمقروء</button></div>' : '') : '<div class="empty">لا توجد إشعارات</div>') + '</section>' +
      '';
    var mr = document.getElementById('mr');
    if (mr) mr.onclick = async function () { try { await api('markNotificationsRead'); load(); } catch (e) { UI.toast(e.message, 'err'); } };
    charts(d);
  }
  function homeHtml(h) {
    if (!h) return '';
    var dot = document.querySelector('#stabs button[data-t=messages]');
    if (dot) dot.innerHTML = 'الرسائل' + (h.unreadMessages ? '<span class="dot">' + h.unreadMessages + '</span>' : '');
    return '<section class="panel"><h3>جديدك</h3>' +
      '<p>الرسائل غير المقروءة: <b>' + h.unreadMessages + '</b></p>' +
      (h.announcement ? '<p>آخر إعلان: <b>' + esc(h.announcement.title) + '</b><br><small>' + esc(h.announcement.body) + '</small></p>' : '<p>لا توجد إعلانات.</p>') +
      (h.materials.length ? '<p>آخر المواد التعليمية: ' + h.materials.map(function (m) { return '<b>' + esc(m.title) + '</b>'; }).join('، ') + '</p>' : '') + '</section>';
  }
  function gradesTable(list) {
    if (!list.length) return '<div class="empty">لم تُضف تقييمات بعد</div>';
    return '<div class="table-wrap"><table><thead><tr><th>التقييم</th><th>النوع</th><th>التاريخ</th><th>درجتي</th><th>المتوسط</th><th>الأعلى</th><th>الأقل</th><th>ملاحظات</th></tr></thead><tbody>' +
      list.map(function (a) { return '<tr><td>' + esc(a.name) + '</td><td>' + esc(TY[a.type] || a.type) + '</td><td>' + esc(a.date) + '</td><td><b>' + (a.score === null ? 'لم تُرصد' : a.score + ' / ' + a.max) + '</b></td><td>' + n(a.avg) + '</td><td>' + n(a.high) + '</td><td>' + n(a.low) + '</td><td>' + esc(a.note) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function charts(d) {
    if (!window.Chart) { return; }
    var ink = css('--ink'), grid = css('--line'), brand = css('--brand'), gold = css('--gold'), bad = css('--danger');
    Chart.defaults.font.family = 'Cairo, Tahoma, sans-serif'; Chart.defaults.color = ink;
    var c = d.stats.counts;
    if (c.total) new Chart(document.getElementById('cAtt'), {type: 'doughnut', data: {labels: ['حاضر', 'متأخر', 'غائب', 'بعذر'], datasets: [{data: [c.present, c.late, c.absent, c.excused], backgroundColor: [brand, gold, bad, '#8A9A94'], borderColor: css('--surface')}]}, options: {plugins: {legend: {position: 'bottom'}}}});
    else document.getElementById('cAtt').replaceWith(Object.assign(document.createElement('div'), {className: 'empty', textContent: 'لا توجد بيانات حضور'}));
    var graded = d.assessments.filter(function (a) { return a.score !== null; });
    if (!graded.length) { ['cTrend', 'cCmp'].forEach(function (id) { document.getElementById(id).replaceWith(Object.assign(document.createElement('div'), {className: 'empty', textContent: 'لا توجد درجات بعد'})); }); return; }
    var labels = graded.map(function (a) { return a.name; }), pct = graded.map(function (a) { return Math.round(a.score / a.max * 1000) / 10; }), run = 0;
    var cum = pct.map(function (v, i) { run += v; return Math.round(run / (i + 1) * 10) / 10; });
    var scales = {y: {min: 0, max: 100, grid: {color: grid}}, x: {grid: {color: grid}}};
    new Chart(document.getElementById('cTrend'), {type: 'line', data: {labels: labels, datasets: [{label: 'نسبتي %', data: pct, borderColor: brand, backgroundColor: brand, tension: .25}, {label: 'المتوسط التراكمي %', data: cum, borderColor: gold, borderDash: [6, 4], tension: .25}]}, options: {scales: scales, plugins: {legend: {position: 'bottom'}}}});
    new Chart(document.getElementById('cCmp'), {type: 'bar', data: {labels: labels, datasets: [{label: 'درجتي %', data: pct, backgroundColor: brand}, {label: 'متوسط المجموعة %', data: graded.map(function (a) { return a.avg === null ? null : Math.round(a.avg / a.max * 1000) / 10; }), backgroundColor: gold}]}, options: {scales: scales, plugins: {legend: {position: 'bottom'}}}});
  }
  var TABS = [['home', 'الرئيسية'], ['messages', 'الرسائل'], ['announcements', 'الإعلانات'], ['materials', 'المواد التعليمية']], stabs = document.getElementById('stabs');
  stabs.innerHTML = TABS.map(function (t) { return '<button role="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('');
  function show(t) {
    Array.prototype.forEach.call(stabs.children, function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
    root.onclick = null;
    if (t === 'home') load(); else StudentViews[t](root);
  }
  stabs.onclick = function (e) { var b = e.target.closest('button[data-t]'); if (b) show(b.dataset.t); };
  show('home');
})();
