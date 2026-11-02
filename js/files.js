window.Files = {
  MAX: 30 * 1024 * 1024,
  read: function (input) {
    return new Promise(function (res, rej) {
      var f = input.files && input.files[0]; if (!f) return res(null);
      if (f.size > Files.MAX) return rej(new Error('الحد الأقصى لحجم الملف 30 ميجابايت'));
      var r = new FileReader();
      r.onload = function () { res({name: f.name, mime: f.type, data: String(r.result).split(',')[1]}); };
      r.onerror = function () { rej(new Error('تعذر قراءة الملف')); };
      r.readAsDataURL(f);
    });
  },
  download: async function (kind, id, btn) {
    if (btn) UI.busy(btn, true, 'جارٍ التحميل...');
    try {
      var r = await api('downloadFile', {kind: kind, id: id}), bin = atob(r.data), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([u], {type: r.mime})), a = document.createElement('a');
      a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    } catch (e) { UI.toast(e.message || 'فشل تحميل الملف', 'err'); }
    if (btn) UI.busy(btn, false);
  }
};
