window.mountApprovals = function (box) {
  async function load() {
    try {
      var rows = await api('pendingAccounts');
      if (!rows.length) { box.innerHTML = '<div class="empty">لا توجد طلبات قيد المراجعة</div>'; return; }
      box.innerHTML = '<div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الرقم القومي</th><th>الشعبة</th><th>المادة</th><th>الهاتف</th><th>تاريخ الطلب</th><th>الإجراء</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td>' + UI.esc(r.fullName) + '</td><td dir="ltr">' + UI.esc(r.nationalId) + '</td><td>' + UI.esc(r.section) + '</td><td>' + UI.esc(r.subject) +
            '</td><td dir="ltr">' + UI.esc(r.phone) + '</td><td>' + new Date(r.createdAt).toLocaleDateString('ar-EG') +
            '</td><td class="actions"><button class="btn sm" data-d="approve" data-id="' + UI.esc(r.userId) + '">قبول</button><button class="btn sm danger" data-d="reject" data-id="' + UI.esc(r.userId) + '">رفض</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    } catch (e) { box.innerHTML = '<div class="alert err">' + UI.esc(e.message) + ' <button class="btn sm" id="rt">إعادة المحاولة</button></div>'; document.getElementById('rt').onclick = load; }
  }
  box.addEventListener('click', async function (ev) {
    var b = ev.target.closest('button[data-d]'); if (!b) return;
    var approve = b.dataset.d === 'approve';
    var c = await UI.confirm(approve ? 'قبول هذا الحساب وتفعيله؟' : 'رفض هذا الحساب؟', {input: approve ? null : 'سبب الرفض (اختياري)', danger: !approve, yes: approve ? 'قبول' : 'رفض'});
    if (!c) return;
    UI.busy(b, true, '...');
    try { var r = await api('reviewAccount', {userId: b.dataset.id, decision: b.dataset.d, note: c.value}); UI.toast(r.message, 'ok'); load(); }
    catch (e) { UI.toast(e.message, 'err'); UI.busy(b, false); }
  });
  load();
};
