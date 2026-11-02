// تصدير Excel (SheetJS) من بيانات الـ API
window.Export = (function () {
  var ST = {present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'غياب بعذر'};
  var STA = {pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض', suspended: 'موقوف'};
  var TY = {coursework: 'أعمال السنة', quiz: 'اختبار قصير', monthly: 'اختبار شهري', oral: 'شفوي', practical: 'عملي', homework: 'واجبات', project: 'مشروع', final: 'امتحان نهائي', custom: 'تقييم مخصص'};
  function v(x) { return x === null || x === undefined ? '' : x; }
  function save(filename, sheets) {
    if (!window.XLSX) { UI.toast('تعذر تحميل مكتبة التصدير. تحقق من الاتصال.', 'err'); return; }
    try {
      var wb = XLSX.utils.book_new();
      sheets.forEach(function (s) {
        var ws = XLSX.utils.aoa_to_sheet(s.rows);
        ws['!cols'] = (s.rows[0] || []).map(function (h, i) { var m = String(h).length; s.rows.slice(1, 50).forEach(function (r) { m = Math.max(m, String(v(r[i])).length); }); return {wch: Math.min(Math.max(m + 2, 8), 40)}; });
        XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
      });
      wb.Workbook = {Views: [{RTL: true}]};
      XLSX.writeFile(wb, filename + '.xlsx');
      UI.toast('تم تصدير الملف', 'ok');
    } catch (e) { UI.toast('فشل تصدير Excel', 'err'); }
  }
  function students(r, name) {
    var head = ['الاسم', 'الرقم القومي', 'الشعبة', 'المادة', 'الهاتف', 'الحضور', 'الغياب', 'متأخر', 'غياب بعذر']
      .concat(r.assessments.map(function (a) { return a.name + ' (' + a.max + ')'; })).concat(['المجموع', 'من', 'النسبة %', 'نسبة الحضور %', 'المستوى']);
    var rows = r.rows.map(function (s) {
      return [s.fullName, "'" + s.nationalId, s.section, s.subject, "'" + s.phone, s.present, s.absent, s.late, s.excused]
        .concat(r.assessments.map(function (a) { return a.subjectId === s.subjectId && a.sectionId === s.sectionId ? v(s.gm && s.gm[a.id]) : ''; }))
        .concat([s.sumMax ? s.sum : '', s.sumMax ? s.sumMax : '', v(s.pct), v(s.attPct), s.level.label]);
    });
    rows.forEach(function (row) { row[1] = String(row[1]).replace(/^'/, ''); row[4] = String(row[4]).replace(/^'/, ''); });
    save(name || 'الطلاب', [{name: 'الطلاب', rows: [head].concat(rows)}]);
  }
  function student(d, name) {
    var s = d.student, c = d.stats;
    save(name || 'طالب-' + s.fullName.split(' ')[0], [
      {name: 'البيانات', rows: [['الحقل', 'القيمة'], ['الاسم', s.fullName], ['الرقم القومي', s.nationalId], ['الشعبة', s.section], ['المادة', s.subject], ['الهاتف', s.phone], ['البريد', s.email], ['حالة الحساب', STA[s.status] || s.status],
        ['نسبة الحضور %', v(c.attPct)], ['مجموع الدرجات', c.sumMax ? c.sum + ' / ' + c.sumMax : ''], ['النسبة %', v(c.pct)], ['المؤشر العام', v(c.score)], ['المستوى', c.level.label]]},
      {name: 'الدرجات', rows: [['التقييم', 'النوع', 'التاريخ', 'الدرجة', 'النهاية', 'ملاحظات']].concat(d.assessments.map(function (a) { return [a.name, TY[a.type] || a.type, a.date, v(a.score), a.max, a.note]; }))},
      {name: 'الحضور', rows: [['التاريخ', 'المحاضرة', 'الحالة', 'ملاحظات', 'عدّله']].concat(d.attendance.map(function (a) { return [a.date, a.lecture, ST[a.status] || a.status, a.note, a.updatedBy]; }))}
    ]);
  }
  function table(name, cols, rows) { save(name, [{name: name, rows: [cols.map(function (c) { return c.h; })].concat(rows.map(function (r) { return cols.map(function (c) { return v(c.f(r)); }); }))}]); }
  function csv(filename, rows) {
    var q = function (x) { x = String(v(x)); if (/^[=+\-@]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };
    var blob = new Blob(['\ufeff' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n')], {type: 'text/csv;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
  }
  return {csv: csv, save: save, students: students, student: student, table: table};
})();
