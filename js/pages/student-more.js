// شاشات الطالب: الرسائل - الإعلانات - المواد التعليمية
window.StudentViews = (function () {
  var esc = UI.esc, fmt = function (d) { return new Date(d).toLocaleString('ar-EG', {dateStyle: 'medium', timeStyle: 'short'}); };
  function fail(root, e, retry) {
    root.innerHTML = '<div class="alert err">' + esc(e.message) + ' <button class="btn sm" id="rt">إعادة المحاولة</button></div>';
    document.getElementById('rt').onclick = retry;
  }
  async function messages(root) {
    root.innerHTML = '<span class="spinner"></span>';
    try {
      var list = await api('inbox');
      if (!list.length) { root.innerHTML = '<div class="empty">لا توجد رسائل</div>'; return; }
      root.innerHTML = list.map(function (m) {
        return '<details class="panel msg" data-id="' + esc(m.id) + '" data-read="' + m.read + '"><summary class="' + (m.read ? '' : 'unread') + '">' + (m.read ? '' : '● ') + esc(m.title) +
          '<small> — ' + esc(m.from) + ' · ' + fmt(m.createdAt) + '</small></summary><p style="white-space:pre-wrap">' + esc(m.body) + '</p></details>'; }).join('');
      Array.prototype.forEach.call(root.querySelectorAll('details.msg'), function (d) {
        d.addEventListener('toggle', async function () {
          if (!d.open || d.dataset.read === 'true') return;
          try { await api('markMessageRead', {id: d.dataset.id}); d.dataset.read = 'true'; var s = d.querySelector('summary'); s.classList.remove('unread'); s.firstChild.textContent = s.firstChild.textContent.replace('● ', ''); }
          catch (e) { UI.toast(e.message, 'err'); }
        });
      });
    } catch (e) { fail(root, e, function () { messages(root); }); }
  }
  async function announcements(root) {
    root.innerHTML = '<span class="spinner"></span>';
    try {
      var list = await api('listAnnouncements');
      if (!list.length) { root.innerHTML = '<div class="empty">لا توجد إعلانات</div>'; return; }
      root.innerHTML = list.map(function (a) {
        return '<article class="panel"><h3>' + esc(a.title) + '</h3><small>' + fmt(a.createdAt) + ' · ' + esc(a.by) + (a.subject !== 'الكل' ? ' · ' + esc(a.subject) : '') + '</small><p style="white-space:pre-wrap">' + esc(a.body) + '</p>' +
          (a.fileName ? '<button class="btn ghost sm" data-k="announcement" data-id="' + esc(a.id) + '">تحميل: ' + esc(a.fileName) + '</button>' : '') + '</article>'; }).join('');
      bindDl(root);
    } catch (e) { fail(root, e, function () { announcements(root); }); }
  }
  async function materials(root) {
    root.innerHTML = '<span class="spinner"></span>';
    try {
      var list = await api('listMaterials');
      if (!list.length) { root.innerHTML = '<div class="empty">لا توجد مواد تعليمية بعد</div>'; return; }
      root.innerHTML = '<div class="table-wrap"><table><thead><tr><th>الملف</th><th>الوصف</th><th>المحاضرة</th><th>أضافه</th><th>التاريخ</th><th></th></tr></thead><tbody>' + list.map(function (m) {
        return '<tr><td>' + esc(m.title) + '</td><td>' + esc(m.description) + '</td><td>' + esc(m.lecture) + '</td><td>' + esc(m.by) + '</td><td>' + new Date(m.createdAt).toLocaleDateString('ar-EG') +
          '</td><td><button class="btn sm" data-k="material" data-id="' + esc(m.id) + '">تحميل</button></td></tr>'; }).join('') + '</tbody></table></div>';
      bindDl(root);
    } catch (e) { fail(root, e, function () { materials(root); }); }
  }
  function bindDl(root) {
    root.onclick = function (e) { var b = e.target.closest('button[data-k]'); if (b) Files.download(b.dataset.k, b.dataset.id, b); };
  }
  return {messages: messages, announcements: announcements, materials: materials};
})();
