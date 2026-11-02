(function () {
  if (!window.S) return;
  var topbar = document.querySelector('.topbar');
  if (!topbar) return;
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn ghost sm';
  button.textContent = 'تغيير كلمة المرور';
  button.addEventListener('click', open);
  var logout = topbar.querySelector('[onclick*="Session.logout"]');
  topbar.insertBefore(button, logout || null);

  function open() {
    if (document.getElementById('passwordDialog')) return;
    var overlay = document.createElement('div');
    overlay.id = 'passwordDialog';
    overlay.className = 'overlay';
    overlay.innerHTML = '<form class="box" style="text-align:right;max-width:520px" role="dialog" aria-modal="true" aria-labelledby="passwordTitle">' +
      '<h2 id="passwordTitle">تغيير كلمة المرور</h2>' +
      '<div class="field"><label for="pwCurrent">كلمة المرور الحالية</label><input id="pwCurrent" type="password" autocomplete="current-password" required></div>' +
      '<div class="field"><label for="pwNew">كلمة المرور الجديدة</label><input id="pwNew" type="password" autocomplete="new-password" required><small>8 أحرف على الأقل، وتحتوي حروفًا وأرقامًا.</small></div>' +
      '<div class="field"><label for="pwConfirm">تأكيد كلمة المرور الجديدة</label><input id="pwConfirm" type="password" autocomplete="new-password" required></div>' +
      '<div class="row-end"><button class="btn" type="submit">حفظ كلمة المرور</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>';
    document.body.appendChild(overlay);
    var form = overlay.querySelector('form'), submit = form.querySelector('[type="submit"]');
    overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target.closest('[data-close]')) overlay.remove(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var oldPassword = form.querySelector('#pwCurrent').value;
      var newPassword = form.querySelector('#pwNew').value;
      if (newPassword !== form.querySelector('#pwConfirm').value) { UI.toast('تأكيد كلمة المرور غير مطابق', 'err'); return; }
      UI.busy(submit, true, 'جارٍ الحفظ...');
      try {
        var result = await api('changePassword', {oldPassword: oldPassword, newPassword: newPassword});
        UI.toast(result.message, 'ok'); overlay.remove();
      } catch (err) {
        UI.toast(err.message, 'err'); UI.busy(submit, false);
      }
    });
    form.querySelector('#pwCurrent').focus();
  }
})();
