/**
 * نظام إدارة طلاب كلية التربية - Backend (المرحلة 1)
 * Web App: Execute as Me | Who has access: Anyone
 * شغّل setup() مرة واحدة ثم انشر كـ Web App.
 */
var SCHEMA = {
  Users: ['id','username','nationalId','passHash','salt','role','status','fullName','phone','email','createdAt','lastLogin','resetHash','resetExp','statusNote','resetAttempts','resetLockUntil'],
  Students: ['id','userId','fullName','nationalId','sectionId','subjectId','phone','email','createdAt'],
  Teachers: ['id','userId','fullName','phone','email','createdAt'],
  Subjects: ['id','name','code','active'],
  Sections: ['id','name','active'],
  Enrollments: ['id','teacherUserId','subjectId','sectionId'],
  Attendance: ['id','date','subjectId','sectionId','lecture','studentId','status','note','updatedBy','updatedAt'],
  Assessments: ['id','name','type','date','subjectId','sectionId','maxScore','createdBy'],
  Grades: ['id','assessmentId','studentId','score','note','updatedBy','updatedAt'],
  Messages: ['id','fromUserId','toType','toValue','toUserId','title','body','createdAt','readAt'],
  Notifications: ['id','userId','type','title','body','createdAt','read'],
  Announcements: ['id','title','body','subjectId','sectionId','fileUrl','createdBy','createdAt'],
  Materials: ['id','title','description','subjectId','sectionId','lecture','fileId','fileName','createdBy','createdAt'],
  Settings: ['key','value'],
  AuditLogs: ['id','at','userId','userName','action','details'],
  Sessions: ['tokenHash','userId','role','expires','createdAt']
};
var DEFAULT_SETTINGS = {
  siteName:'نظام إدارة طلاب كلية التربية', collegeName:'كلية التربية – جامعة الأزهر بالقاهرة',
  maxAbsencePct:'25', uniquePhone:'true', sessionHours:'8', academicYear:'2025/2026', semester:'الأول', showRank:'false',
  wAttendance:'20', wExams:'40', wHomework:'20', wEval:'20', lvlExcellent:'85', lvlVeryGood:'75', lvlGood:'65', lvlPass:'50'
};

/* ===== الإعداد الأولي ===== */
function setup() {
  Object.keys(SCHEMA).forEach(ensureSheet);
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!(k in rawSettings())) appendObj('Settings', {key:k, value:DEFAULT_SETTINGS[k]});
  });
  if (!readAll('Subjects').length) appendObj('Subjects', {id:'SUB1', name:'المادة الدراسية (عدّل الاسم)', code:'101', active:'true'});
  if (!readAll('Sections').length) ['الشعبة الأولى','الشعبة الثانية'].forEach(function (n, i) { appendObj('Sections', {id:'SEC' + (i + 1), name:n, active:'true'}); });
  var hasAdmin = readAll('Users').some(function (u) { return u.role === 'admin'; });
  if (!hasAdmin) {
    var pw = randomPassword();
    createUser({username:'admin', fullName:'مشرف النظام', role:'admin', status:'approved', password:pw});
    Logger.log('المشرف: admin | كلمة المرور: ' + pw + ' (غيّرها بعد أول دخول)');
  }
  Logger.log('اكتمل الإعداد.');
}

/* ===== نقطة الدخول ===== */
function doGet() { return out({ok:true, message:'API يعمل', version:'1.0'}); }

var PUBLIC = {publicOptions:publicOptions, register:register, login:login, resetRequest:resetRequest, resetConfirm:resetConfirm};
var PRIVATE = {
  me:me, logout:logout, changePassword:changePassword,
  pendingAccounts:pendingAccounts, reviewAccount:reviewAccount,
  createStaff:createStaff, assignTeacher:assignTeacher, adminIssueReset:adminIssueReset, listAdmins:listAdmins, setAdminStatus:setAdminStatus, deleteAdmin:deleteAdmin, sendAdminMessage:sendAdminMessage,
  sendMessage:sendMessage, inbox:inbox, markMessageRead:markMessageRead, sentMessages:sentMessages, listClassStudents:listClassStudents,
  addAnnouncement:addAnnouncement, listAnnouncements:listAnnouncements, deleteAnnouncement:deleteAnnouncement,
  uploadMaterial:uploadMaterial, listMaterials:listMaterials, deleteMaterial:deleteMaterial, downloadFile:downloadFile,
  listStudents:listStudents, exportStudents:exportStudents, studentDetail:studentDetail, updateStudent:updateStudent, setStudentStatus:setStudentStatus,
  deleteStudent:deleteStudent, addStudent:addStudent, earlyWarning:earlyWarning, compare:compare, adminStats:adminStats, auditLogs:auditLogs,
  getSettings:getSettings, saveSettings:saveSettings, adminLists:adminLists, saveSubject:saveSubject, saveSection:saveSection, saveLogo:saveLogo, removeLogo:removeLogo,
  backupData:backupData, seedDemo:seedDemo, clearDemo:clearDemo,
  myScope:myScope, getAttendance:getAttendance, saveAttendance:saveAttendance, createAssessment:createAssessment, listAssessments:listAssessments,
  getGrades:getGrades, saveGrades:saveGrades, studentDashboard:studentDashboard, classSummary:classSummary, markNotificationsRead:markNotificationsRead, listTeachers:listTeachers
};
var WRITE = {register:1, login:1, logout:1, changePassword:1, reviewAccount:1, createStaff:1, assignTeacher:1, resetRequest:1, resetConfirm:1, adminIssueReset:1, setAdminStatus:1, deleteAdmin:1, sendAdminMessage:1, saveAttendance:1, createAssessment:1, saveGrades:1, markNotificationsRead:1, sendMessage:1, markMessageRead:1, addAnnouncement:1, deleteAnnouncement:1, uploadMaterial:1, deleteMaterial:1, updateStudent:1, setStudentStatus:1, deleteStudent:1, addStudent:1, saveSettings:1, saveSubject:1, saveSection:1, saveLogo:1, removeLogo:1, backupData:1, seedDemo:1, clearDemo:1};

function doPost(e) {
  var lock = null;
  try {
    var req = JSON.parse((e.postData && e.postData.contents) || '{}');
    var action = String(req.action || ''), data = req.data || {};
    if (WRITE[action]) { lock = LockService.getScriptLock(); lock.waitLock(20000); }
    if (PUBLIC[action]) return out({ok:true, data:PUBLIC[action](data)});
    if (PRIVATE[action]) { var ctx = authenticate(req.token); return out({ok:true, data:PRIVATE[action](ctx, data)}); }
    fail('UNKNOWN_ACTION', 'العملية المطلوبة غير معروفة');
  } catch (err) {
    if (err && err.code) return out({ok:false, code:err.code, error:err.message});
    console.error(err);
    return out({ok:false, code:'SERVER', error:'حدث خطأ غير متوقع في الخادم. حاول مرة أخرى.'});
  } finally { if (lock) try { lock.releaseLock(); } catch (x) {} }
}

/* ===== الحسابات ===== */
function publicOptions() {
  return {
    subjects: readAll('Subjects').filter(function (s) { return s.active !== 'false'; }).map(function (s) { return {id:s.id, name:s.name}; }),
    sections: readAll('Sections').filter(function (s) { return s.active !== 'false'; }).map(function (s) { return {id:s.id, name:s.name}; }),
    settings: {siteName:getSetting('siteName'), collegeName:getSetting('collegeName')},
    logo: getLogoData()
  };
}

function register(d) { return registerCore(d, 'pending'); }
function registerCore(d, status) {
  var name = clean(d.fullName), nid = clean(d.nationalId), phone = clean(d.phone), email = clean(d.email).toLowerCase();
  var pw = String(d.password || '');
  if (name.split(/\s+/).length < 4) fail('INVALID', 'أدخل الاسم الرباعي كاملًا');
  if (!validNationalId(nid)) fail('INVALID', 'الرقم القومي غير صحيح (14 رقمًا)');
  if (!/^01[0125][0-9]{8}$/.test(phone)) fail('INVALID', 'رقم الهاتف غير صحيح');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('INVALID', 'البريد الإلكتروني غير صحيح');
  checkPassword(pw);
  var subject = byId('Subjects', d.subjectId), section = byId('Sections', d.sectionId);
  if (!subject || !section) fail('INVALID', 'اختر المادة والشعبة من القائمة');
  var users = readAll('Users');
  if (users.some(function (u) { return u.nationalId === nid; })) fail('DUPLICATE', 'يوجد حساب مسجل بنفس الرقم القومي');
  if (getSetting('uniquePhone') === 'true' && users.some(function (u) { return u.phone === phone; }))
    fail('DUPLICATE', 'رقم الهاتف مسجل لحساب آخر');
  var u = createUser({username:nid, nationalId:nid, fullName:name, phone:phone, email:email, role:'student', status:status, password:pw});
  appendObj('Students', {id:newId('S'), userId:u.id, fullName:name, nationalId:nid, sectionId:section.id, subjectId:subject.id, phone:phone, email:email, createdAt:now()});
  audit(u.id, name, status === 'approved' ? 'ADD_STUDENT' : 'REGISTER', 'حساب: ' + subject.name + ' / ' + section.name);
  return {message:'تم إرسال طلب إنشاء الحساب، وسيتم تفعيل حسابك بعد مراجعة المشرف أو دكتور المادة.'};
}

function login(d) {
  var uname = clean(d.username), pw = String(d.password || '');
  if (!uname || !pw) fail('INVALID', 'أدخل اسم المستخدم وكلمة المرور');
  var cache = CacheService.getScriptCache(), key = 'fail_' + uname;
  if (Number(cache.get(key) || 0) >= 5) fail('LOCKED', 'تم إيقاف المحاولات مؤقتًا. حاول بعد 15 دقيقة.');
  var user = readAll('Users').filter(function (u) { return u.username === uname || u.nationalId === uname; })[0];
  if (!user) { bump(cache, key); fail('BAD_CREDENTIALS', 'اسم المستخدم أو كلمة المرور غير صحيح'); }
  if (hashPw(pw, user.salt) !== user.passHash) { bump(cache, key); fail('BAD_CREDENTIALS', 'اسم المستخدم أو كلمة المرور غير صحيح'); }
  if (user.status === 'pending') fail('PENDING', 'حسابك ما زال قيد المراجعة');
  if (user.status === 'rejected') fail('REJECTED', 'تم رفض طلب حسابك' + (user.statusNote ? ': ' + user.statusNote : ''));
  if (user.status === 'suspended') fail('SUSPENDED', 'حسابك موقوف. تواصل مع المشرف.');
  cache.remove(key);
  updateRow('Users', user._row, {lastLogin:now()});
  if (Math.random() < 0.1) cleanupSessions();
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var hours = d.rememberDevice === true ? 30 * 24 : Number(getSetting('sessionHours') || 8);
  var rec = {tokenHash:sha(token), userId:user.id, role:user.role, expires:new Date(Date.now() + hours * 3600000).toISOString(), createdAt:now()};
  appendObj('Sessions', rec);
  cache.put('s_' + rec.tokenHash, JSON.stringify(rec), Math.min(21600, hours * 3600));
  audit(user.id, user.fullName, 'LOGIN', '');
  return {token:token, role:user.role, name:user.fullName, expires:rec.expires};
}

function authenticate(token) {
  if (!token) fail('SESSION', 'انتهت الجلسة. سجّل الدخول مرة أخرى.');
  var th = sha(String(token)), cache = CacheService.getScriptCache();
  var rec = cache.get('s_' + th); rec = rec ? JSON.parse(rec) : null;
  if (!rec) rec = readAll('Sessions').filter(function (s) { return s.tokenHash === th; })[0];
  if (!rec || new Date(rec.expires) < new Date()) fail('SESSION', 'انتهت الجلسة. سجّل الدخول مرة أخرى.');
  var user = byId('Users', rec.userId);
  if (!user || user.status !== 'approved') fail('SESSION', 'الحساب غير مفعّل.');
  return {user:user, tokenHash:th};
}

function logout(ctx) {
  var s = readAll('Sessions').filter(function (x) { return x.tokenHash === ctx.tokenHash; })[0];
  if (s) deleteRow('Sessions', s._row);
  CacheService.getScriptCache().remove('s_' + ctx.tokenHash);
  audit(ctx.user.id, ctx.user.fullName, 'LOGOUT', '');
  return {};
}
function revokeUserSessions(userId, exceptTokenHash) {
  readAll('Sessions').filter(function (s) { return s.userId === userId && s.tokenHash !== exceptTokenHash; }).forEach(function (s) {
    CacheService.getScriptCache().remove('s_' + s.tokenHash);
  });
  deleteWhere('Sessions', function (s) { return s.userId === userId && s.tokenHash !== exceptTokenHash; });
}

function me(ctx) {
  var u = ctx.user, res = {id:u.id, fullName:u.fullName, role:u.role, phone:u.phone, email:u.email, status:u.status};
  if (u.role === 'student') {
    var st = readAll('Students').filter(function (s) { return s.userId === u.id; })[0];
    if (st) {
      var sub = byId('Subjects', st.subjectId), sec = byId('Sections', st.sectionId);
      res.nationalIdMasked = u.nationalId.slice(0, 3) + '********' + u.nationalId.slice(-3);
      res.subject = sub ? sub.name : ''; res.section = sec ? sec.name : '';
    }
  }
  return res;
}

function changePassword(ctx, d) {
  if (hashPw(String(d.oldPassword || ''), ctx.user.salt) !== ctx.user.passHash) fail('BAD_PASSWORD', 'كلمة المرور الحالية غير صحيحة');
  checkPassword(String(d.newPassword || ''));
  var salt = Utilities.getUuid();
  updateRow('Users', ctx.user._row, {salt:salt, passHash:hashPw(d.newPassword, salt)});
  revokeUserSessions(ctx.user.id, ctx.tokenHash);
  audit(ctx.user.id, ctx.user.fullName, 'CHANGE_PASSWORD', '');
  return {message:'تم تغيير كلمة المرور'};
}

/* ===== استعادة كلمة المرور ===== */
function resetRequest(d) {
  var nid = clean(d.nationalId), phone = clean(d.phone);
  var u = readAll('Users').filter(function (x) { return x.nationalId === nid && x.phone === phone; })[0];
  if (u) {
    var timestamp = Date.now(), lockUntil = Date.parse(u.resetLockUntil || ''), attempts = Number(u.resetAttempts) || 0;
    if (lockUntil > timestamp) return {message:'إذا كانت البيانات صحيحة فسيصلك الرمز على بريدك، أو اطلبه من المشرف إن لم يكن لديك بريد.'};
    if (u.resetLockUntil && lockUntil <= timestamp) attempts = 0;
    var code = resetCode();
    updateRow('Users', u._row, {resetHash:hashPw(code, u.salt), resetExp:new Date(timestamp + 15 * 60000).toISOString(), resetAttempts:String(attempts), resetLockUntil:''});
    if (u.email) try { MailApp.sendEmail(u.email, 'رمز استعادة كلمة المرور', 'رمز التحقق: ' + code + '\nصالح لمدة 15 دقيقة.'); } catch (e) {}
    audit(u.id, u.fullName, 'RESET_REQUEST', u.email ? 'أُرسل بالبريد' : 'يحتاج رمزًا من المشرف');
  }
  return {message:'إذا كانت البيانات صحيحة فسيصلك الرمز على بريدك، أو اطلبه من المشرف إن لم يكن لديك بريد.'};
}
function resetCode() {
  var randomValue = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16);
  return String(100000 + randomValue % 900000);
}
function adminIssueReset(ctx, d) {
  requireRole(ctx, ['admin']);
  var u = byId('Users', d.userId); if (!u) fail('NOT_FOUND', 'المستخدم غير موجود');
  if (u.role === 'admin') requireOwner(ctx);
  var code = resetCode();
  updateRow('Users', u._row, {resetHash:hashPw(code, u.salt), resetExp:new Date(Date.now() + 15 * 60000).toISOString(), resetAttempts:'0', resetLockUntil:''});
  audit(ctx.user.id, ctx.user.fullName, 'ISSUE_RESET', u.fullName);
  return {code:code, message:'سلّم الرمز للمستخدم. صالح 15 دقيقة.'};
}
function resetConfirm(d) {
  var identifier = clean(d.nationalId).toLowerCase(), code = String(d.code || '').trim();
  var u = readAll('Users').filter(function (x) { return x.nationalId === identifier || x.username === identifier; })[0];
  if (!u) fail('BAD_CODE', 'الرمز غير صحيح أو منتهي أو تم تجاوز عدد المحاولات');
  var timestamp = Date.now(), lockUntil = Date.parse(u.resetLockUntil || '');
  if (u.resetLockUntil && lockUntil <= timestamp) {
    updateRow('Users', u._row, {resetAttempts:'0', resetLockUntil:''});
    u.resetAttempts = '0'; u.resetLockUntil = '';
  }
  if (Date.parse(u.resetLockUntil || '') > timestamp) fail('BAD_CODE', 'الرمز غير صحيح أو منتهي أو تم تجاوز عدد المحاولات');
  if (!u.resetHash || !u.resetExp || Date.parse(u.resetExp) <= timestamp) fail('BAD_CODE', 'الرمز غير صحيح أو منتهي أو تم تجاوز عدد المحاولات');
  if (hashPw(code, u.salt) !== u.resetHash) {
    var attempts = (Number(u.resetAttempts) || 0) + 1;
    updateRow('Users', u._row, {resetAttempts:String(attempts), resetLockUntil:attempts >= 5 ? new Date(timestamp + 15 * 60000).toISOString() : ''});
    fail('BAD_CODE', 'الرمز غير صحيح أو منتهي أو تم تجاوز عدد المحاولات');
  }
  checkPassword(String(d.newPassword || ''));
  var salt = Utilities.getUuid();
  updateRow('Users', u._row, {salt:salt, passHash:hashPw(d.newPassword, salt), resetHash:'', resetExp:'', resetAttempts:'0', resetLockUntil:''});
  revokeUserSessions(u.id, '');
  audit(u.id, u.fullName, 'RESET_PASSWORD', '');
  return {message:'تم تعيين كلمة المرور الجديدة. يمكنك تسجيل الدخول.'};
}

/* ===== الموافقة على الحسابات ===== */
function teacherSubjects(userId) {
  return readAll('Enrollments').filter(function (e) { return e.teacherUserId === userId; }).map(function (e) { return e.subjectId; });
}
function pendingAccounts(ctx) {
  requireRole(ctx, ['admin', 'teacher']);
  var allowed = ctx.user.role === 'teacher' ? teacherSubjects(ctx.user.id) : null;
  var users = {}; readAll('Users').forEach(function (u) { users[u.id] = u; });
  return readAll('Students').filter(function (s) {
    var u = users[s.userId];
    return u && u.status === 'pending' && (!allowed || allowed.indexOf(s.subjectId) > -1);
  }).map(function (s) {
    var sub = byId('Subjects', s.subjectId), sec = byId('Sections', s.sectionId);
    return {userId:s.userId, fullName:s.fullName, nationalId:s.nationalId, phone:s.phone, email:s.email,
            subject:sub ? sub.name : '', section:sec ? sec.name : '', createdAt:s.createdAt};
  });
}
function reviewAccount(ctx, d) {
  requireRole(ctx, ['admin', 'teacher']);
  var u = byId('Users', d.userId); if (!u || u.role !== 'student') fail('NOT_FOUND', 'الطالب غير موجود');
  if (u.status !== 'pending') fail('INVALID', 'تمت مراجعة هذا الطلب مسبقًا');
  var st = readAll('Students').filter(function (s) { return s.userId === u.id; })[0];
  if (ctx.user.role === 'teacher' && (!st || teacherSubjects(ctx.user.id).indexOf(st.subjectId) < 0))
    fail('FORBIDDEN', 'ليس لديك صلاحية على هذا الطالب');
  var ok = d.decision === 'approve';
  if (!ok && d.decision !== 'reject') fail('INVALID', 'قرار غير صحيح');
  updateRow('Users', u._row, {status:ok ? 'approved' : 'rejected', statusNote:clean(d.note)});
  appendObj('Notifications', {id:newId('N'), userId:u.id, type:ok ? 'account_approved' : 'account_rejected',
    title:ok ? 'تم قبول حسابك' : 'تم رفض حسابك', body:ok ? 'يمكنك الآن تسجيل الدخول.' : clean(d.note), createdAt:now(), read:'false'});
  audit(ctx.user.id, ctx.user.fullName, ok ? 'APPROVE_STUDENT' : 'REJECT_STUDENT', u.fullName);
  return {message:ok ? 'تم قبول الحساب' : 'تم رفض الحساب'};
}

/* ===== إدارة العاملين (مشرف) ===== */
function createStaff(ctx, d) {
  requireRole(ctx, ['admin']);
  var role = d.role === 'admin' ? 'admin' : 'teacher', uname = clean(d.username).toLowerCase();
  if (role === 'admin') requireOwner(ctx);
  if (!/^[a-z0-9_.]{4,30}$/.test(uname)) fail('INVALID', 'اسم المستخدم: 4-30 حرفًا إنجليزيًا أو أرقامًا');
  if (clean(d.fullName).length < 6) fail('INVALID', 'أدخل الاسم كاملًا');
  checkPassword(String(d.password || ''));
  if (readAll('Users').some(function (u) { return u.username === uname; })) fail('DUPLICATE', 'اسم المستخدم مستخدم من قبل');
  var u = createUser({username:uname, fullName:clean(d.fullName), phone:clean(d.phone), email:clean(d.email), role:role, status:'approved', password:d.password});
  if (role === 'teacher') appendObj('Teachers', {id:newId('T'), userId:u.id, fullName:u.fullName, phone:u.phone, email:u.email, createdAt:now()});
  audit(ctx.user.id, ctx.user.fullName, 'CREATE_STAFF', u.fullName + ' (' + role + ')');
  return {id:u.id};
}
function listAdmins(ctx) {
  requireRole(ctx, ['admin']);
  return {canManage:isOwner(ctx), admins:readAll('Users').filter(function (u) { return u.role === 'admin'; }).map(function (u) {
    return {id:u.id, fullName:u.fullName, username:u.username, status:u.status, current:u.id === ctx.user.id};
  })};
}
function setAdminStatus(ctx, d) {
  requireOwner(ctx);
  var u = byId('Users', d.userId);
  if (!u || u.role !== 'admin') fail('NOT_FOUND', 'المشرف غير موجود');
  if (['approved', 'suspended'].indexOf(d.status) < 0 || ['approved', 'suspended'].indexOf(u.status) < 0)
    fail('INVALID', 'لا يمكن تغيير هذه الحالة من هنا');
  if (d.status === 'suspended' && u.id === ctx.user.id) fail('INVALID', 'لا يمكنك تعطيل حسابك الحالي');
  if (d.status === 'suspended' && readAll('Users').filter(function (x) { return x.role === 'admin' && x.status === 'approved'; }).length <= 1)
    fail('INVALID', 'يجب إبقاء مشرف نشط واحد على الأقل');
  updateRow('Users', u._row, {status:d.status});
  audit(ctx.user.id, ctx.user.fullName, d.status === 'suspended' ? 'SUSPEND_ADMIN' : 'REACTIVATE_ADMIN', u.fullName);
  return {message:d.status === 'suspended' ? 'تم تعطيل حساب المشرف' : 'تمت إعادة تفعيل حساب المشرف'};
}
function deleteAdmin(ctx, d) {
  requireOwner(ctx);
  var u = byId('Users', d.userId);
  if (!u || u.role !== 'admin') fail('NOT_FOUND', 'المشرف غير موجود');
  if (u.id === ctx.user.id || String(u.username).toLowerCase() === 'm_a_diaa') fail('INVALID', 'لا يمكن حذف حساب مالك النظام');
  deleteWhere('Sessions', function (o) { return o.userId === u.id; });
  deleteWhere('Messages', function (o) { return o.toUserId === u.id || o.fromUserId === u.id; });
  deleteWhere('Notifications', function (o) { return o.userId === u.id; });
  deleteWhere('Users', function (o) { return o.id === u.id; });
  audit(ctx.user.id, ctx.user.fullName, 'DELETE_ADMIN', u.fullName + ' (' + u.username + ')');
  return {message:'تم حذف حساب المشرف وجلساته ورسائله'};
}
function sendAdminMessage(ctx, d) {
  requireOwner(ctx);
  var u = byId('Users', d.userId);
  if (!u || u.role !== 'admin') fail('NOT_FOUND', 'المشرف غير موجود');
  var title = cleanText(d.title, 120), body = cleanText(d.body, 2000);
  if (title.length < 2) fail('INVALID', 'أدخل عنوان الرسالة');
  if (!body) fail('INVALID', 'اكتب نص الرسالة');
  appendObj('Messages', {id:newId('M'), fromUserId:ctx.user.id, toType:'admin', toValue:u.id, toUserId:u.id, title:title, body:body, createdAt:now(), readAt:''});
  audit(ctx.user.id, ctx.user.fullName, 'PRIVATE_ADMIN_MESSAGE', u.fullName + ' (' + u.username + '): ' + title);
  return {message:'تم إرسال الرسالة الخاصة إلى ' + u.fullName};
}
function assignTeacher(ctx, d) {
  requireRole(ctx, ['admin']);
  var t = byId('Users', d.teacherUserId); if (!t || t.role !== 'teacher') fail('NOT_FOUND', 'الدكتور غير موجود');
  if (!byId('Subjects', d.subjectId)) fail('NOT_FOUND', 'المادة غير موجودة');
  appendObj('Enrollments', {id:newId('E'), teacherUserId:t.id, subjectId:d.subjectId, sectionId:d.sectionId || ''});
  audit(ctx.user.id, ctx.user.fullName, 'ASSIGN_TEACHER', t.fullName + ' -> ' + d.subjectId);
  return {};
}

/* ===== أدوات مساعدة ===== */
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail(code, message) { throw {code:code, message:message}; }
function requireRole(ctx, roles) { if (roles.indexOf(ctx.user.role) < 0) fail('FORBIDDEN', 'ليس لديك صلاحية لتنفيذ هذه العملية'); }
function isOwner(ctx) { return ctx.user.role === 'admin' && String(ctx.user.username).toLowerCase() === 'm_a_diaa'; }
function requireOwner(ctx) { if (!isOwner(ctx)) fail('FORBIDDEN', 'هذه العملية متاحة لمالك النظام فقط'); }
function now() { return new Date().toISOString(); }
function newId(p) { return p + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function clean(s) {
  s = String(s === undefined || s === null ? '' : s).replace(/[<>]/g, '').trim().slice(0, 200);
  return /^[=+\-@]/.test(s) && !/^\+?[0-9]+$/.test(s) ? "'" + s : s;   // منع حقن المعادلات
}
function bump(cache, key) { cache.put(key, String(Number(cache.get(key) || 0) + 1), 900); }
function sha(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function hashPw(pw, salt) { var h = pw + salt; for (var i = 0; i < 300; i++) h = sha(h + salt); return h; }
function checkPassword(pw) {
  if (pw.length < 8 || !/[A-Za-z\u0600-\u06FF]/.test(pw) || !/[0-9]/.test(pw)) fail('WEAK_PASSWORD', 'كلمة المرور 8 أحرف على الأقل وتحتوي على حروف وأرقام');
}
function randomPassword() {
  var c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', p = '', random = '';
  for (var i = 0; i < 10; i++) {
    if (random.length < 6) random += Utilities.getUuid().replace(/-/g, '');
    p += c[parseInt(random.slice(0, 6), 16) % c.length]; random = random.slice(6);
  }
  return p + '7';
}
function validNationalId(n) {
  if (!/^[23][0-9]{13}$/.test(n)) return false;
  var m = Number(n.substr(3, 2)), dd = Number(n.substr(5, 2));
  return m >= 1 && m <= 12 && dd >= 1 && dd <= 31;
}
function createUser(o) {
  var salt = Utilities.getUuid(), u = {
    id:newId('U'), username:o.username, nationalId:o.nationalId || '', salt:salt, passHash:hashPw(o.password, salt),
    role:o.role, status:o.status, fullName:o.fullName, phone:o.phone || '', email:o.email || '', createdAt:now()
  };
  appendObj('Users', u); return u;
}
function audit(userId, userName, action, details) {
  appendObj('AuditLogs', {id:newId('L'), at:now(), userId:userId, userName:userName, action:action, details:details});
}

/* ===== طبقة Google Sheets ===== */
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function ensureSheet(name) {
  var sh = ss().getSheetByName(name) || ss().insertSheet(name), h = SCHEMA[name];
  sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#0E5A48').setFontColor('#ffffff');
  sh.getRange(2, 1, sh.getMaxRows() - 1, h.length).setNumberFormat('@');
  sh.setFrozenRows(1); sh.setRightToLeft(true);
}
function readAll(name) {
  var sh = ss().getSheetByName(name), h = SCHEMA[name], n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, h.length).getValues().map(function (r, i) {
    var o = {_row:i + 2}; h.forEach(function (k, j) { o[k] = String(r[j]); }); return o;
  }).filter(function (o) { return o[h[0]] !== ''; });
}
function byId(name, id) { return readAll(name).filter(function (o) { return o.id === id; })[0]; }
function appendObj(name, obj) {
  var h = SCHEMA[name], sh = ss().getSheetByName(name), row = sh.getLastRow() + 1;
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 500);
  sh.getRange(row, 1, 1, h.length).setNumberFormat('@').setValues([h.map(function (k) { return obj[k] === undefined ? '' : obj[k]; })]);
}
function updateRow(name, row, patch) {
  var h = SCHEMA[name], rng = ss().getSheetByName(name).getRange(row, 1, 1, h.length), v = rng.getValues()[0];
  Object.keys(patch).forEach(function (k) { var i = h.indexOf(k); if (i > -1) v[i] = patch[k]; });
  rng.setValues([v]);
}
function deleteRow(name, row) { ss().getSheetByName(name).deleteRow(row); }
var _SET = null;
function rawSettings() { if (!_SET) { _SET = {}; readAll('Settings').forEach(function (s) { _SET[s.key] = s.value; }); } return _SET; }
function getSetting(k) { var r = rawSettings(); return k in r ? r[k] : (DEFAULT_SETTINGS[k] || ''); }

/* ================= المرحلة 2: الحضور والدرجات والمستوى ================= */
var STATUSES = ['present', 'absent', 'late', 'excused'];
var TYPE_CAT = {coursework:'eval', quiz:'exams', monthly:'exams', oral:'exams', practical:'exams', homework:'homework', project:'eval', final:'exams', custom:'eval'};

function canAccess(ctx, subjectId, sectionId) {
  if (ctx.user.role === 'admin') return true;
  return ctx.user.role === 'teacher' && enrCached().some(function (e) {
    return e.teacherUserId === ctx.user.id && e.subjectId === subjectId && (e.sectionId === '' || e.sectionId === sectionId);
  });
}
function needAccess(ctx, subjectId, sectionId) {
  requireRole(ctx, ['admin', 'teacher']);
  if (!subjectId || !sectionId || !canAccess(ctx, subjectId, sectionId)) fail('FORBIDDEN', 'ليس لديك صلاحية على هذه المادة أو الشعبة');
}
function checkDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s)) || isNaN(new Date(s).getTime())) fail('INVALID', 'التاريخ غير صحيح');
}
function lectureNo(v) { var n = Number(v); if (!(n >= 1 && n <= 50) || n % 1) fail('INVALID', 'رقم المحاضرة من 1 إلى 50'); return String(n); }
function r1(x) { return x === null || x === undefined || isNaN(x) ? null : Math.round(x * 10) / 10; }

function myScope(ctx) {
  requireRole(ctx, ['admin', 'teacher']);
  var act = function (x) { return x.active !== 'false'; };
  var subs = readAll('Subjects').filter(act), secs = readAll('Sections').filter(act);
  var pack = function (list) { return list.map(function (c) { return {id:c.id, name:c.name}; }); };
  if (ctx.user.role === 'admin') return subs.map(function (s) { return {id:s.id, name:s.name, sections:pack(secs)}; });
  var en = readAll('Enrollments').filter(function (e) { return e.teacherUserId === ctx.user.id; });
  return subs.filter(function (s) { return en.some(function (e) { return e.subjectId === s.id; }); }).map(function (s) {
    var all = en.some(function (e) { return e.subjectId === s.id && e.sectionId === ''; });
    return {id:s.id, name:s.name, sections:pack(secs.filter(function (c) {
      return all || en.some(function (e) { return e.subjectId === s.id && e.sectionId === c.id; }); }))};
  });
}
function classStudents(subjectId, sectionId) {
  var users = {}; readAll('Users').forEach(function (u) { users[u.id] = u; });
  return readAll('Students').filter(function (s) {
    return s.subjectId === subjectId && s.sectionId === sectionId && users[s.userId] && users[s.userId].status === 'approved';
  });
}

/* ---- الحضور ---- */
function getAttendance(ctx, d) {
  needAccess(ctx, d.subjectId, d.sectionId); checkDate(d.date); var lec = lectureNo(d.lecture), ex = {};
  readAll('Attendance').forEach(function (a) {
    if (a.subjectId === d.subjectId && a.sectionId === d.sectionId && a.date === d.date && a.lecture === lec) ex[a.studentId] = a;
  });
  return classStudents(d.subjectId, d.sectionId).map(function (s) {
    var a = ex[s.id];
    return {studentId:s.id, fullName:s.fullName, status:a ? a.status : '', note:a ? a.note : '', updatedBy:a ? a.updatedBy : ''};
  });
}
function saveAttendance(ctx, d) {
  needAccess(ctx, d.subjectId, d.sectionId); checkDate(d.date); var lec = lectureNo(d.lecture);
  var valid = {}; classStudents(d.subjectId, d.sectionId).forEach(function (s) { valid[s.id] = s; });
  var prev = {};
  readAll('Attendance').forEach(function (a) {
    if (a.subjectId === d.subjectId && a.sectionId === d.sectionId && a.date === d.date && a.lecture === lec) prev[a.studentId] = a.status;
  });
  var byStu = {}, notes = [];
  (d.records || []).forEach(function (r) {
    var s = valid[r.studentId]; if (!s || STATUSES.indexOf(r.status) < 0) return;
    byStu[s.id] = {id:newId('A'), date:d.date, subjectId:d.subjectId, sectionId:d.sectionId, lecture:lec, studentId:s.id, status:r.status,
      note:clean(r.note), updatedBy:ctx.user.fullName, updatedAt:now()};
    if (r.status === 'absent' && prev[s.id] !== 'absent')
      notes.push({id:newId('N'), userId:s.userId, type:'absence', title:'تم تسجيل غياب', body:'غياب بتاريخ ' + d.date + ' - المحاضرة ' + lec, createdAt:now(), read:'false'});
  });
  var objs = Object.keys(byStu).map(function (k) { return byStu[k]; });
  if (!objs.length) fail('INVALID', 'لا توجد سجلات صالحة للحفظ');
  var res = upsertMany('Attendance', ['date', 'subjectId', 'sectionId', 'lecture', 'studentId'], objs);
  appendMany('Notifications', notes);
  audit(ctx.user.id, ctx.user.fullName, res.updated ? 'UPDATE_ATTENDANCE' : 'RECORD_ATTENDANCE',
    d.date + ' م' + lec + ' | جديد ' + res.added + ' / معدّل ' + res.updated);
  return {message:'تم حفظ الحضور (' + objs.length + ' طالب)'};
}

/* ---- التقييمات والدرجات ---- */
function createAssessment(ctx, d) {
  needAccess(ctx, d.subjectId, d.sectionId); checkDate(d.date);
  var name = clean(d.name), max = Number(d.maxScore);
  if (name.length < 2) fail('INVALID', 'أدخل اسم التقييم');
  if (!TYPE_CAT[d.type]) fail('INVALID', 'نوع التقييم غير صحيح');
  if (!(max > 0 && max <= 1000)) fail('INVALID', 'الدرجة النهائية بين 1 و 1000');
  var a = {id:newId('AS'), name:name, type:d.type, date:d.date, subjectId:d.subjectId, sectionId:d.sectionId, maxScore:String(max), createdBy:ctx.user.fullName};
  appendObj('Assessments', a);
  audit(ctx.user.id, ctx.user.fullName, 'CREATE_ASSESSMENT', name);
  return a;
}
function listAssessments(ctx, d) {
  needAccess(ctx, d.subjectId, d.sectionId);
  return readAll('Assessments').filter(function (a) { return a.subjectId === d.subjectId && a.sectionId === d.sectionId; })
    .sort(function (x, y) { return y.date < x.date ? -1 : 1; });
}
function assessmentFor(ctx, id) {
  var a = byId('Assessments', id); if (!a) fail('NOT_FOUND', 'التقييم غير موجود');
  needAccess(ctx, a.subjectId, a.sectionId); return a;
}
function getGrades(ctx, d) {
  var a = assessmentFor(ctx, d.assessmentId), g = {};
  readAll('Grades').forEach(function (x) { if (x.assessmentId === a.id) g[x.studentId] = x; });
  return {assessment:a, students:classStudents(a.subjectId, a.sectionId).map(function (s) {
    return {studentId:s.id, fullName:s.fullName, score:g[s.id] ? g[s.id].score : '', note:g[s.id] ? g[s.id].note : ''};
  })};
}
function saveGrades(ctx, d) {
  var a = assessmentFor(ctx, d.assessmentId), max = Number(a.maxScore), valid = {}, prev = {}, byStu = {}, notes = [];
  classStudents(a.subjectId, a.sectionId).forEach(function (s) { valid[s.id] = s; });
  readAll('Grades').forEach(function (x) { if (x.assessmentId === a.id) prev[x.studentId] = x.score; });
  (d.records || []).forEach(function (r) {
    var s = valid[r.studentId]; if (!s || r.score === '' || r.score === null || r.score === undefined) return;
    var n = Number(r.score);
    if (isNaN(n) || n < 0 || n > max) fail('INVALID', 'الدرجة للطالب ' + s.fullName + ' يجب أن تكون بين 0 و ' + max);
    byStu[s.id] = {id:newId('G'), assessmentId:a.id, studentId:s.id, score:String(n), note:clean(r.note), updatedBy:ctx.user.fullName, updatedAt:now()};
    if (prev[s.id] === undefined) notes.push({id:newId('N'), userId:s.userId, type:'grade_new', title:'تمت إضافة درجة جديدة', body:a.name, createdAt:now(), read:'false'});
    else if (prev[s.id] !== String(n)) notes.push({id:newId('N'), userId:s.userId, type:'grade_edit', title:'تم تعديل درجة', body:a.name, createdAt:now(), read:'false'});
  });
  var objs = Object.keys(byStu).map(function (k) { return byStu[k]; });
  if (!objs.length) fail('INVALID', 'لم تُدخل أي درجة');
  var res = upsertMany('Grades', ['assessmentId', 'studentId'], objs);
  appendMany('Notifications', notes);
  audit(ctx.user.id, ctx.user.fullName, res.updated ? 'UPDATE_GRADES' : 'RECORD_GRADES', a.name + ' | جديد ' + res.added + ' / معدّل ' + res.updated);
  return {message:'تم حفظ الدرجات (' + objs.length + ' طالب)'};
}

/* ---- حساب المستوى الذكي ---- */
function levelOf(score) {
  if (score === null) return {key:'none', label:'لم يُقيَّم بعد'};
  var g = function (k) { return Number(getSetting(k)); };
  if (score >= g('lvlExcellent')) return {key:'excellent', label:'ممتاز'};
  if (score >= g('lvlVeryGood')) return {key:'vgood', label:'جيد جدًا'};
  if (score >= g('lvlGood')) return {key:'good', label:'جيد'};
  if (score >= g('lvlPass')) return {key:'pass', label:'مقبول'};
  return {key:'improve', label:'يحتاج إلى تحسين'};
}
function avgOf(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
function computeStudent(st, atts, assess, grades) {
  var c = {present:0, absent:0, late:0, excused:0, total:0};
  atts.forEach(function (a) { if (a.studentId === st.id && c[a.status] !== undefined) { c[a.status]++; c.total++; } });
  var denom = c.total - c.excused;
  var attPct = denom > 0 ? (c.present + c.late) / denom * 100 : null, absPct = denom > 0 ? c.absent / denom * 100 : null;
  var gm = {}; grades.forEach(function (g) { if (g.studentId === st.id) gm[g.assessmentId] = g; });
  var series = [], cats = {exams:[], homework:[], eval:[]}, sum = 0, sumMax = 0, missingHw = 0;
  assess.slice().sort(function (x, y) { return x.date < y.date ? -1 : 1; }).forEach(function (a) {
    if (a.subjectId !== st.subjectId || a.sectionId !== st.sectionId) return;
    var g = gm[a.id], cat = TYPE_CAT[a.type] || 'eval';
    if (g && g.score !== '') { var pp = Number(g.score) / Number(a.maxScore) * 100; cats[cat].push(pp); series.push(pp); sum += Number(g.score); sumMax += Number(a.maxScore); }
    else if (cat === 'homework') missingHw++;
  });
  var comp = {att:attPct, exams:avgOf(cats.exams), homework:avgOf(cats.homework), eval:avgOf(cats.eval)};
  var W = {att:+getSetting('wAttendance'), exams:+getSetting('wExams'), homework:+getSetting('wHomework'), eval:+getSetting('wEval')}, tw = 0, ts = 0;
  Object.keys(comp).forEach(function (k) { if (comp[k] !== null) { tw += W[k]; ts += W[k] * comp[k]; } });
  var score = tw > 0 ? ts / tw : null;
  return {studentId:st.id, counts:c, attPct:r1(attPct), absPct:r1(absPct), sum:sum, sumMax:sumMax, pct:sumMax > 0 ? r1(sum / sumMax * 100) : null,
    comp:{att:r1(comp.att), exams:r1(comp.exams), homework:r1(comp.homework), eval:r1(comp.eval)}, score:r1(score), level:levelOf(score),
    missingHw:missingHw, series:series, alert:absPct !== null && absPct > Number(getSetting('maxAbsencePct'))};
}

function studentDashboard(ctx) {
  requireRole(ctx, ['student']);
  var st = readAll('Students').filter(function (s) { return s.userId === ctx.user.id; })[0];
  if (!st) fail('NOT_FOUND', 'بيانات الطالب غير موجودة');
  var atts = readAll('Attendance'), grades = readAll('Grades');
  var assess = readAll('Assessments').filter(function (a) { return a.subjectId === st.subjectId && a.sectionId === st.sectionId; })
    .sort(function (x, y) { return x.date < y.date ? -1 : 1; });
  var stats = computeStudent(st, atts, assess, grades), mine = {};
  grades.forEach(function (g) { if (g.studentId === st.id) mine[g.assessmentId] = g; });
  var list = assess.map(function (a) {
    var all = grades.filter(function (g) { return g.assessmentId === a.id && g.score !== ''; }).map(function (g) { return Number(g.score); }), g = mine[a.id];
    return {id:a.id, name:a.name, type:a.type, date:a.date, max:Number(a.maxScore), score:g && g.score !== '' ? Number(g.score) : null, note:g ? g.note : '',
      avg:r1(avgOf(all)), high:all.length ? Math.max.apply(null, all) : null, low:all.length ? Math.min.apply(null, all) : null};
  });
  var rank = null;
  if (getSetting('showRank') === 'true' && stats.score !== null) {
    rank = 1; classStudents(st.subjectId, st.sectionId).forEach(function (o) {
      if (o.id === st.id) return; var sc = computeStudent(o, atts, assess, grades).score; if (sc !== null && sc > stats.score) rank++; });
  }
  var recent = atts.filter(function (a) { return a.studentId === st.id; }).sort(function (x, y) { return y.date < x.date ? -1 : 1; }).slice(0, 30)
    .map(function (a) { return {date:a.date, lecture:a.lecture, status:a.status}; });
  var notes = readAll('Notifications').filter(function (n) { return n.userId === ctx.user.id; })
    .sort(function (x, y) { return y.createdAt < x.createdAt ? -1 : 1; });
  return {profile:me(ctx), stats:stats, assessments:list, attendance:recent, rank:rank, home:homeExtras(st, ctx.user.id), maxAbsencePct:Number(getSetting('maxAbsencePct')),
    unread:notes.filter(function (n) { return n.read !== 'true'; }).length,
    notifications:notes.slice(0, 15).map(function (n) { return {title:n.title, body:n.body, at:n.createdAt, read:n.read === 'true'}; })};
}
function markNotificationsRead(ctx) {
  readAll('Notifications').forEach(function (n) { if (n.userId === ctx.user.id && n.read !== 'true') updateRow('Notifications', n._row, {read:'true'}); });
  return {};
}
function classSummary(ctx, d) {
  needAccess(ctx, d.subjectId, d.sectionId);
  var atts = readAll('Attendance'), grades = readAll('Grades');
  var assess = readAll('Assessments').filter(function (a) { return a.subjectId === d.subjectId && a.sectionId === d.sectionId; });
  var rows = classStudents(d.subjectId, d.sectionId).map(function (s) {
    var c = computeStudent(s, atts, assess, grades);
    return {studentId:s.id, fullName:s.fullName, attPct:c.attPct, absent:c.counts.absent, total:c.counts.total, sum:c.sum, sumMax:c.sumMax, pct:c.pct,
      score:c.score, level:c.level, alert:c.alert};
  });
  var useRank = getSetting('showRank') === 'true';
  if (useRank) { var sorted = rows.filter(function (r) { return r.score !== null; }).sort(function (a, b) { return b.score - a.score; });
    sorted.forEach(function (r, i) { r.rank = i + 1; }); }
  return {rows:rows, showRank:useRank, groupAvg:r1(avgOf(rows.filter(function (r) { return r.score !== null; }).map(function (r) { return r.score; })))};
}
function listTeachers(ctx) {
  requireRole(ctx, ['admin']);
  var subs = {}, secs = {}; readAll('Subjects').forEach(function (s) { subs[s.id] = s.name; }); readAll('Sections').forEach(function (s) { secs[s.id] = s.name; });
  var en = readAll('Enrollments');
  return readAll('Users').filter(function (u) { return u.role === 'teacher'; }).map(function (u) {
    return {userId:u.id, fullName:u.fullName, username:u.username, status:u.status, assignments:en.filter(function (e) { return e.teacherUserId === u.id; })
      .map(function (e) { return (subs[e.subjectId] || '؟') + ' - ' + (e.sectionId ? secs[e.sectionId] || '؟' : 'كل الشعب'); })};
  });
}

/* ---- كتابة دفعات (أسرع بكثير من الصف الواحد) ---- */
function appendMany(name, objs) {
  if (!objs.length) return;
  var h = SCHEMA[name], sh = ss().getSheetByName(name), row = sh.getLastRow() + 1, need = row + objs.length - 1;
  if (need > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows() + 500);
  sh.getRange(row, 1, objs.length, h.length).setNumberFormat('@')
    .setValues(objs.map(function (o) { return h.map(function (k) { return o[k] === undefined ? '' : o[k]; }); }));
}
function upsertMany(name, keyFields, objs) {
  var h = SCHEMA[name], sh = ss().getSheetByName(name), n = sh.getLastRow();
  var vals = n > 1 ? sh.getRange(2, 1, n - 1, h.length).getValues() : [];
  var ki = keyFields.map(function (k) { return h.indexOf(k); });
  var keyOf = function (r) { return ki.map(function (i) { return String(r[i]); }).join('|'); };
  var idx = {}; vals.forEach(function (r, i) { idx[keyOf(r)] = i; });
  var adds = [], updated = 0;
  objs.forEach(function (o) {
    var row = h.map(function (k) { return o[k] === undefined ? '' : o[k]; }), key = keyOf(row);
    if (idx[key] !== undefined) { var cur = vals[idx[key]]; row[0] = cur[0]; vals[idx[key]] = row; updated++; } else adds.push(row);
  });
  if (updated) sh.getRange(2, 1, vals.length, h.length).setNumberFormat('@').setValues(vals);
  if (adds.length) {
    var start = Math.max(n, 1) + 1, need = start + adds.length - 1;
    if (need > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows() + 500);
    sh.getRange(start, 1, adds.length, h.length).setNumberFormat('@').setValues(adds);
  }
  return {added:adds.length, updated:updated};
}

/* ================= المرحلة 3: الرسائل والإعلانات والمواد ================= */
var MAX_BYTES = 30 * 1024 * 1024, FILE_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt', 'zip'];
var _EN = null;
function enrCached() { if (!_EN) _EN = readAll('Enrollments'); return _EN; }
function cleanText(s, max) {
  s = String(s === undefined || s === null ? '' : s).replace(/[<>]/g, '').trim().slice(0, max || 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function nameMap(sheet, field) { var m = {}; readAll(sheet).forEach(function (r) { m[r.id] = r[field || 'name']; }); return m; }
function studentOf(ctx) {
  var st = readAll('Students').filter(function (s) { return s.userId === ctx.user.id; })[0];
  if (!st) fail('NOT_FOUND', 'بيانات الطالب غير موجودة'); return st;
}
function audMatch(it, st) { return (!it.subjectId || it.subjectId === st.subjectId) && (!it.sectionId || it.sectionId === st.sectionId); }
function staffSees(ctx, it) {
  if (ctx.user.role === 'admin' || !it.subjectId) return true;
  return enrCached().some(function (e) {
    return e.teacherUserId === ctx.user.id && e.subjectId === it.subjectId && (!it.sectionId || e.sectionId === '' || e.sectionId === it.sectionId); });
}
function needScope(ctx, subj, sec) {
  requireRole(ctx, ['admin', 'teacher']);
  if (ctx.user.role === 'admin') {
    if (subj && !byId('Subjects', subj)) fail('NOT_FOUND', 'المادة غير موجودة');
    if (sec && !byId('Sections', sec)) fail('NOT_FOUND', 'الشعبة غير موجودة'); return;
  }
  if (!subj) fail('FORBIDDEN', 'المحتوى العام لكل الطلاب للمشرف فقط');
  if (sec) needAccess(ctx, subj, sec);
  else if (!enrCached().some(function (e) { return e.teacherUserId === ctx.user.id && e.subjectId === subj && e.sectionId === ''; }))
    fail('FORBIDDEN', 'اختر شعبة محددة، أو اطلب من المشرف إسنادك لكل شعب المادة');
}
function approvedStudents() {
  var u = {}; readAll('Users').forEach(function (x) { u[x.id] = x; });
  return readAll('Students').filter(function (s) { return u[s.userId] && u[s.userId].status === 'approved'; });
}
function notifyMany(students, type, title, body) {
  appendMany('Notifications', students.slice(0, 1000).map(function (s) {
    return {id:newId('N'), userId:s.userId, type:type, title:title, body:body, createdAt:now(), read:'false'}; }));
}

/* ---- الرسائل ---- */
function listClassStudents(ctx, d) {
  needAccess(ctx, d.subjectId, d.sectionId);
  return classStudents(d.subjectId, d.sectionId).map(function (s) { return {id:s.id, fullName:s.fullName, nationalId:s.nationalId}; });
}
function recipientsFor(ctx, d) {
  var list = approvedStudents(), t = d.toType;
  if (t === 'all') { requireRole(ctx, ['admin']); return list; }
  if (t === 'student') {
    var st = list.filter(function (s) { return s.id === d.toValue; })[0];
    if (!st) fail('NOT_FOUND', 'الطالب غير موجود'); needAccess(ctx, st.subjectId, st.sectionId); return [st];
  }
  if (t === 'class') {
    var p = String(d.toValue).split('|'); needAccess(ctx, p[0], p[1]);
    return list.filter(function (s) { return s.subjectId === p[0] && s.sectionId === p[1]; });
  }
  if (t === 'subject') {
    requireRole(ctx, ['admin', 'teacher']);
    return list.filter(function (s) { return s.subjectId === d.toValue && canAccess(ctx, s.subjectId, s.sectionId); });
  }
  fail('INVALID', 'نوع المستلمين غير صحيح');
}
function sendMessage(ctx, d) {
  requireRole(ctx, ['admin', 'teacher']);
  var title = cleanText(d.title, 120), body = cleanText(d.body, 2000);
  if (title.length < 2) fail('INVALID', 'أدخل عنوان الرسالة');
  if (!body) fail('INVALID', 'اكتب نص الرسالة');
  var rec = recipientsFor(ctx, d);
  if (!rec.length) fail('INVALID', 'لا يوجد طلاب مقبولون ضمن المستلمين');
  if (rec.length > 500) fail('INVALID', 'عدد المستلمين كبير (الحد 500). قسّم الإرسال.');
  var at = now();
  appendMany('Messages', rec.map(function (s) {
    return {id:newId('M'), fromUserId:ctx.user.id, toType:d.toType, toValue:String(d.toValue || ''), toUserId:s.userId, title:title, body:body, createdAt:at, readAt:''}; }));
  notifyMany(rec, 'message', 'لديك رسالة جديدة', title);
  audit(ctx.user.id, ctx.user.fullName, 'SEND_MESSAGE', title + ' → ' + rec.length + ' طالب');
  return {message:'تم إرسال الرسالة إلى ' + rec.length + ' طالب'};
}
function inbox(ctx) {
  requireRole(ctx, ['student', 'admin']);
  var names = nameMap('Users', 'fullName');
  return readAll('Messages').filter(function (m) { return m.toUserId === ctx.user.id && (ctx.user.role !== 'admin' || m.toType === 'admin'); })
    .sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }).slice(0, 100)
    .map(function (m) { return {id:m.id, title:m.title, body:m.body, from:names[m.fromUserId] || '', createdAt:m.createdAt, read:m.readAt !== ''}; });
}
function markMessageRead(ctx, d) {
  requireRole(ctx, ['student', 'admin']);
  var m = byId('Messages', d.id);
  if (!m || m.toUserId !== ctx.user.id || (ctx.user.role === 'admin' && m.toType !== 'admin')) fail('FORBIDDEN', 'لا يمكنك الوصول لهذه الرسالة');
  if (!m.readAt) updateRow('Messages', m._row, {readAt:now()});
  return {};
}
function sentMessages(ctx) {
  requireRole(ctx, ['admin', 'teacher']);
  var groups = {}, order = [];
  readAll('Messages').forEach(function (m) {
    if (m.fromUserId !== ctx.user.id) return;
    var k = m.createdAt + '|' + m.title;
    if (!groups[k]) { groups[k] = {title:m.title, createdAt:m.createdAt, toType:m.toType, count:0, read:0}; order.push(k); }
    groups[k].count++; if (m.readAt) groups[k].read++;
  });
  return order.map(function (k) { return groups[k]; }).sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }).slice(0, 30);
}

/* ---- الملفات (Google Drive) ---- */
function uploadFolder() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('UPLOAD_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('SMS_Uploads'); p.setProperty('UPLOAD_FOLDER_ID', f.getId()); return f;
}
function saveUpload(file) {
  if (!file || !file.name || !file.data) return null;
  var ext = String(file.name).split('.').pop().toLowerCase();
  if (FILE_EXT.indexOf(ext) < 0) fail('FILE_TYPE', 'نوع الملف غير مسموح. المسموح: ' + FILE_EXT.join(', '));
  var bytes; try { bytes = Utilities.base64Decode(file.data); } catch (e) { fail('FILE', 'الملف تالف أو غير مقروء'); }
  if (bytes.length > MAX_BYTES) fail('FILE_SIZE', 'الحد الأقصى لحجم الملف 30 ميجابايت');
  var safe = cleanText(file.name, 100).replace(/[\\\/:*?"|]/g, '_');
  var f; try { f = uploadFolder().createFile(Utilities.newBlob(bytes, String(file.mime || 'application/octet-stream').slice(0, 100), safe)); }
  catch (e) { fail('FILE', 'تعذر حفظ الملف في Google Drive'); }
  return {id:f.getId(), name:safe};
}
function trashFile(id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }

/* ---- الإعلانات ---- */
function addAnnouncement(ctx, d) {
  var subj = d.subjectId || '', sec = d.sectionId || ''; needScope(ctx, subj, sec);
  var title = cleanText(d.title, 150), body = cleanText(d.body, 3000);
  if (title.length < 2) fail('INVALID', 'أدخل عنوان الإعلان');
  if (!body) fail('INVALID', 'اكتب نص الإعلان');
  var f = saveUpload(d.file);
  appendObj('Announcements', {id:newId('AN'), title:title, body:body, subjectId:subj, sectionId:sec, fileUrl:f ? f.id + '|' + f.name : '', createdBy:ctx.user.id, createdAt:now()});
  notifyMany(approvedStudents().filter(function (s) { return audMatch({subjectId:subj, sectionId:sec}, s); }), 'announcement', 'تم نشر إعلان جديد', title);
  audit(ctx.user.id, ctx.user.fullName, 'ADD_ANNOUNCEMENT', title);
  return {message:'تم نشر الإعلان'};
}
function annView(a, names, subs, secs, ctx) {
  var f = a.fileUrl ? a.fileUrl.split('|') : null;
  return {id:a.id, title:a.title, body:a.body, createdAt:a.createdAt, by:names[a.createdBy] || '', subject:a.subjectId ? subs[a.subjectId] || '' : 'الكل',
    section:a.sectionId ? secs[a.sectionId] || '' : 'كل الشعب', fileName:f ? f.slice(1).join('|') : '', mine:ctx.user.role === 'admin' || a.createdBy === ctx.user.id};
}
function listAnnouncements(ctx) {
  var names = nameMap('Users', 'fullName'), subs = nameMap('Subjects'), secs = nameMap('Sections'), st = ctx.user.role === 'student' ? studentOf(ctx) : null;
  return readAll('Announcements').filter(function (a) { return st ? audMatch(a, st) : staffSees(ctx, a); })
    .sort(function (x, y) { return y.createdAt < x.createdAt ? -1 : 1; }).slice(0, 100).map(function (a) { return annView(a, names, subs, secs, ctx); });
}
function deleteAnnouncement(ctx, d) {
  requireRole(ctx, ['admin', 'teacher']);
  var a = byId('Announcements', d.id); if (!a) fail('NOT_FOUND', 'الإعلان غير موجود');
  if (ctx.user.role !== 'admin' && a.createdBy !== ctx.user.id) fail('FORBIDDEN', 'يمكنك حذف إعلاناتك فقط');
  if (a.fileUrl) trashFile(a.fileUrl.split('|')[0]);
  deleteRow('Announcements', a._row); audit(ctx.user.id, ctx.user.fullName, 'DELETE_ANNOUNCEMENT', a.title);
  return {message:'تم حذف الإعلان'};
}

/* ---- المواد التعليمية ---- */
function uploadMaterial(ctx, d) {
  var subj = d.subjectId || '', sec = d.sectionId || ''; if (!subj) fail('INVALID', 'اختر المادة'); needScope(ctx, subj, sec);
  var title = cleanText(d.title, 150); if (title.length < 2) fail('INVALID', 'أدخل اسم الملف');
  if (!d.file) fail('INVALID', 'اختر الملف المراد رفعه');
  var f = saveUpload(d.file);
  appendObj('Materials', {id:newId('MT'), title:title, description:cleanText(d.description, 500), subjectId:subj, sectionId:sec, lecture:cleanText(d.lecture, 20),
    fileId:f.id, fileName:f.name, createdBy:ctx.user.id, createdAt:now()});
  notifyMany(approvedStudents().filter(function (s) { return audMatch({subjectId:subj, sectionId:sec}, s); }), 'material', 'تمت إضافة مادة تعليمية', title);
  audit(ctx.user.id, ctx.user.fullName, 'UPLOAD_MATERIAL', title);
  return {message:'تم رفع الملف'};
}
function listMaterials(ctx) {
  var names = nameMap('Users', 'fullName'), subs = nameMap('Subjects'), secs = nameMap('Sections'), st = ctx.user.role === 'student' ? studentOf(ctx) : null;
  return readAll('Materials').filter(function (m) { return st ? audMatch(m, st) : staffSees(ctx, m); })
    .sort(function (x, y) { return y.createdAt < x.createdAt ? -1 : 1; }).slice(0, 200).map(function (m) {
      return {id:m.id, title:m.title, description:m.description, lecture:m.lecture, fileName:m.fileName, createdAt:m.createdAt, by:names[m.createdBy] || '',
        subject:subs[m.subjectId] || '', section:m.sectionId ? secs[m.sectionId] || '' : 'كل الشعب', mine:ctx.user.role === 'admin' || m.createdBy === ctx.user.id}; });
}
function deleteMaterial(ctx, d) {
  requireRole(ctx, ['admin', 'teacher']);
  var m = byId('Materials', d.id); if (!m) fail('NOT_FOUND', 'الملف غير موجود');
  if (ctx.user.role !== 'admin' && m.createdBy !== ctx.user.id) fail('FORBIDDEN', 'يمكنك حذف ملفاتك فقط');
  trashFile(m.fileId); deleteRow('Materials', m._row); audit(ctx.user.id, ctx.user.fullName, 'DELETE_MATERIAL', m.title);
  return {message:'تم حذف الملف'};
}
function downloadFile(ctx, d) {
  var it = d.kind === 'material' ? byId('Materials', d.id) : d.kind === 'announcement' ? byId('Announcements', d.id) : null;
  if (!it) fail('NOT_FOUND', 'الملف غير موجود');
  var ok = ctx.user.role === 'student' ? audMatch(it, studentOf(ctx)) : staffSees(ctx, it);
  if (!ok) fail('FORBIDDEN', 'ليس لديك صلاحية على هذا الملف');
  var fid = d.kind === 'material' ? it.fileId : it.fileUrl.split('|')[0];
  if (!fid) fail('NOT_FOUND', 'لا يوجد ملف مرفق');
  var blob; try { blob = DriveApp.getFileById(fid).getBlob(); } catch (e) { fail('FILE', 'تعذر الوصول إلى الملف في Google Drive'); }
  return {name:blob.getName(), mime:blob.getContentType(), data:Utilities.base64Encode(blob.getBytes())};
}

/* ---- ملخص الرئيسية للطالب ---- */
function homeExtras(st, userId) {
  var names = nameMap('Users', 'fullName');
  var ann = readAll('Announcements').filter(function (a) { return audMatch(a, st); }).sort(function (x, y) { return y.createdAt < x.createdAt ? -1 : 1; })[0];
  var mats = readAll('Materials').filter(function (m) { return audMatch(m, st); }).sort(function (x, y) { return y.createdAt < x.createdAt ? -1 : 1; }).slice(0, 3);
  return {unreadMessages:readAll('Messages').filter(function (m) { return m.toUserId === userId && !m.readAt; }).length,
    announcement:ann ? {title:ann.title, body:ann.body.slice(0, 200), createdAt:ann.createdAt} : null,
    materials:mats.map(function (m) { return {title:m.title, createdAt:m.createdAt}; })};
}

/* ================= المرحلة 4: إدارة الطلاب والتقارير والتنبيهات ================= */
function studentRows(ctx, f) {
  requireRole(ctx, ['admin', 'teacher']); f = f || {};
  var users = {}; readAll('Users').forEach(function (u) { users[u.id] = u; });
  var subs = nameMap('Subjects'), secs = nameMap('Sections'), assessAll = readAll('Assessments');
  var attBy = {}, grBy = {};
  readAll('Attendance').forEach(function (a) { (attBy[a.studentId] = attBy[a.studentId] || []).push(a); });
  readAll('Grades').forEach(function (g) { (grBy[g.studentId] = grBy[g.studentId] || []).push(g); });
  var q = cleanText(f.q, 60).toLowerCase(), pass = Number(getSetting('lvlPass')), rows = [];
  readAll('Students').forEach(function (s) {
    var u = users[s.userId]; if (!u) return;
    if (f.subjectId && s.subjectId !== f.subjectId) return;
    if (f.sectionId && s.sectionId !== f.sectionId) return;
    if (f.status && u.status !== f.status) return;
    if (ctx.user.role === 'teacher' && !canAccess(ctx, s.subjectId, s.sectionId)) return;
    if (q && (s.fullName + ' ' + s.nationalId + ' ' + s.phone).toLowerCase().indexOf(q) < 0) return;
    var atts = attBy[s.id] || [], grs = grBy[s.id] || [], c = computeStudent(s, atts, assessAll, grs);
    var p = f.preset;
    if (p === 'absent' && !c.counts.absent) return;
    if (p === 'alert' && !c.alert) return;
    if (p === 'improve' && c.level.key !== 'improve') return;
    if (p === 'pass' && !(c.score !== null && c.score >= pass)) return;
    if (p === 'ungraded' && c.sumMax !== 0) return;
    var row = {id:s.id, userId:s.userId, fullName:s.fullName, nationalId:s.nationalId, phone:s.phone, email:s.email, subjectId:s.subjectId, sectionId:s.sectionId,
      subject:subs[s.subjectId] || '', section:secs[s.sectionId] || '', status:u.status, createdAt:s.createdAt, attPct:c.attPct, absPct:c.absPct,
      present:c.counts.present, absent:c.counts.absent, late:c.counts.late, excused:c.counts.excused, total:c.counts.total,
      sum:c.sum, sumMax:c.sumMax, pct:c.pct, score:c.score, level:c.level, alert:c.alert, missingHw:c.missingHw, series:c.series};
    if (f.withGrades) { var gm = {}; grs.forEach(function (g) { gm[g.assessmentId] = g.score; }); row.gm = gm; }
    rows.push(row);
  });
  return rows;
}
function listStudents(ctx, f) {
  var rows = studentRows(ctx, f); f = f || {};
  var key = {att:'attPct', pct:'pct', score:'score'}[f.sort];
  rows.sort(function (a, b) {
    if (!key) return a.fullName < b.fullName ? -1 : 1;
    var x = a[key] === null ? -1 : a[key], y = b[key] === null ? -1 : b[key]; return y - x; });
  var size = Math.min(Math.max(Number(f.pageSize) || 20, 5), 100), pages = Math.max(1, Math.ceil(rows.length / size)), page = Math.min(Math.max(Number(f.page) || 1, 1), pages);
  return {total:rows.length, page:page, pages:pages, size:size, rows:rows.slice((page - 1) * size, page * size).map(function (r) { delete r.series; return r; })};
}
function exportStudents(ctx, f) {
  var rows = studentRows(ctx, Object.assign({}, f, {withGrades:true})), pairs = {};
  rows.forEach(function (r) { pairs[r.subjectId + '|' + r.sectionId] = 1; delete r.series; });
  var assess = readAll('Assessments').filter(function (a) { return pairs[a.subjectId + '|' + a.sectionId]; })
    .sort(function (x, y) { return x.date < y.date ? -1 : 1; }).map(function (a) { return {id:a.id, name:a.name, type:a.type, date:a.date, max:Number(a.maxScore), subjectId:a.subjectId, sectionId:a.sectionId}; });
  audit(ctx.user.id, ctx.user.fullName, 'EXPORT_STUDENTS', rows.length + ' طالب');
  return {rows:rows, assessments:assess};
}
function studentDetail(ctx, d) {
  requireRole(ctx, ['admin', 'teacher']);
  var st = byId('Students', d.studentId); if (!st) fail('NOT_FOUND', 'الطالب غير موجود');
  needAccess(ctx, st.subjectId, st.sectionId);
  var u = byId('Users', st.userId), subs = nameMap('Subjects'), secs = nameMap('Sections');
  var atts = readAll('Attendance').filter(function (a) { return a.studentId === st.id; }), grs = readAll('Grades').filter(function (g) { return g.studentId === st.id; });
  var assess = readAll('Assessments').filter(function (a) { return a.subjectId === st.subjectId && a.sectionId === st.sectionId; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
  var c = computeStudent(st, atts, assess, grs), gm = {}; grs.forEach(function (g) { gm[g.assessmentId] = g; }); delete c.series;
  return {student:{id:st.id, userId:st.userId, fullName:st.fullName, nationalId:st.nationalId, phone:st.phone, email:st.email, status:u ? u.status : '',
      subjectId:st.subjectId, sectionId:st.sectionId, subject:subs[st.subjectId] || '', section:secs[st.sectionId] || '', createdAt:st.createdAt},
    stats:c, assessments:assess.map(function (a) { var g = gm[a.id]; return {name:a.name, type:a.type, date:a.date, max:Number(a.maxScore), score:g && g.score !== '' ? Number(g.score) : null, note:g ? g.note : ''}; }),
    attendance:atts.sort(function (x, y) { return y.date < x.date ? -1 : 1; }).map(function (a) { return {date:a.date, lecture:a.lecture, status:a.status, note:a.note, updatedBy:a.updatedBy}; })};
}
function addStudent(ctx, d) { requireRole(ctx, ['admin']); registerCore(d, 'approved'); return {message:'تمت إضافة الطالب وتفعيل حسابه'}; }
function updateStudent(ctx, d) {
  requireRole(ctx, ['admin']);
  var st = byId('Students', d.studentId); if (!st) fail('NOT_FOUND', 'الطالب غير موجود');
  var u = byId('Users', st.userId);
  var name = clean(d.fullName), nid = clean(d.nationalId), phone = clean(d.phone), email = clean(d.email).toLowerCase();
  if (name.split(/\s+/).length < 4) fail('INVALID', 'أدخل الاسم الرباعي كاملًا');
  if (!validNationalId(nid)) fail('INVALID', 'الرقم القومي غير صحيح');
  if (!/^01[0125][0-9]{8}$/.test(phone)) fail('INVALID', 'رقم الهاتف غير صحيح');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('INVALID', 'البريد الإلكتروني غير صحيح');
  if (!byId('Subjects', d.subjectId) || !byId('Sections', d.sectionId)) fail('INVALID', 'اختر المادة والشعبة');
  var users = readAll('Users');
  if (users.some(function (x) { return x.id !== u.id && x.nationalId === nid; })) fail('DUPLICATE', 'الرقم القومي مسجل لحساب آخر');
  if (getSetting('uniquePhone') === 'true' && users.some(function (x) { return x.id !== u.id && x.phone === phone; })) fail('DUPLICATE', 'رقم الهاتف مسجل لحساب آخر');
  updateRow('Students', st._row, {fullName:name, nationalId:nid, phone:phone, email:email, subjectId:d.subjectId, sectionId:d.sectionId});
  var patch = {fullName:name, nationalId:nid, phone:phone, email:email}; if (u.username === u.nationalId) patch.username = nid;
  updateRow('Users', u._row, patch);
  audit(ctx.user.id, ctx.user.fullName, 'UPDATE_STUDENT', name);
  return {message:'تم حفظ بيانات الطالب'};
}
function setStudentStatus(ctx, d) {
  requireRole(ctx, ['admin']);
  var u = byId('Users', d.userId); if (!u || u.role !== 'student') fail('NOT_FOUND', 'الطالب غير موجود');
  if (['approved', 'suspended'].indexOf(d.status) < 0 || ['approved', 'suspended'].indexOf(u.status) < 0) fail('INVALID', 'لا يمكن تغيير هذه الحالة من هنا');
  updateRow('Users', u._row, {status:d.status});
  audit(ctx.user.id, ctx.user.fullName, d.status === 'suspended' ? 'SUSPEND_STUDENT' : 'REACTIVATE_STUDENT', u.fullName);
  return {message:d.status === 'suspended' ? 'تم تعطيل الحساب' : 'تمت إعادة تفعيل الحساب'};
}
function deleteWhere(name, pred) {
  var h = SCHEMA[name], sh = ss().getSheetByName(name), n = sh.getLastRow(); if (n < 2) return 0;
  var vals = sh.getRange(2, 1, n - 1, h.length).getValues();
  var keep = vals.filter(function (r) { var o = {}; h.forEach(function (k, j) { o[k] = String(r[j]); }); return !pred(o); });
  var del = vals.length - keep.length; if (!del) return 0;
  sh.getRange(2, 1, n - 1, h.length).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, h.length).setNumberFormat('@').setValues(keep);
  return del;
}
function deleteStudent(ctx, d) {
  requireRole(ctx, ['admin']);
  var st = byId('Students', d.studentId); if (!st) fail('NOT_FOUND', 'الطالب غير موجود');
  deleteWhere('Attendance', function (o) { return o.studentId === st.id; });
  deleteWhere('Grades', function (o) { return o.studentId === st.id; });
  deleteWhere('Messages', function (o) { return o.toUserId === st.userId; });
  deleteWhere('Notifications', function (o) { return o.userId === st.userId; });
  deleteWhere('Sessions', function (o) { return o.userId === st.userId; });
  deleteWhere('Students', function (o) { return o.id === st.id; });
  deleteWhere('Users', function (o) { return o.id === st.userId; });
  audit(ctx.user.id, ctx.user.fullName, 'DELETE_STUDENT', st.fullName + ' (' + st.nationalId + ')');
  return {message:'تم حذف الطالب وكل بياناته'};
}

/* ---- التنبيهات المبكرة ---- */
function earlyWarning(ctx, d) {
  var rows = studentRows(ctx, {subjectId:d.subjectId, sectionId:d.sectionId, status:'approved'}), pass = Number(getSetting('lvlPass')), maxAbs = Number(getSetting('maxAbsencePct')), out_ = [];
  rows.forEach(function (r) {
    var why = [], sr = r.series || [];
    if (r.alert) why.push('ارتفاع نسبة الغياب (' + r.absPct + '% وحد الغياب ' + maxAbs + '%)');
    if (r.pct !== null && r.pct < pass) why.push('انخفاض الدرجات (' + r.pct + '%)');
    if (sr.length >= 3 && sr[sr.length - 1] < sr[sr.length - 2] && sr[sr.length - 2] < sr[sr.length - 3]) why.push('انخفاض مستمر في الأداء في آخر 3 تقييمات');
    if (r.missingHw >= 2) why.push('عدم تسليم ' + r.missingHw + ' واجبات');
    if (r.level.key === 'improve') why.push('مستوى التقييم: يحتاج إلى تحسين');
    if (why.length) { delete r.series; out_.push({studentId:r.id, fullName:r.fullName, subject:r.subject, section:r.section, attPct:r.attPct, pct:r.pct, level:r.level, reasons:why}); }
  });
  return out_.sort(function (a, b) { return b.reasons.length - a.reasons.length; });
}

/* ---- مقارنة الأداء (بدون بيانات شخصية) ---- */
function compare(ctx) {
  var rows = studentRows(ctx, {status:'approved'}), pass = Number(getSetting('lvlPass')), groups = {};
  function add(k, subject, section, r) {
    var g = groups[k] = groups[k] || {subject:subject, section:section, n:0, sc:[], att:[], abs:[]};
    g.n++; if (r.score !== null) g.sc.push(r.score); if (r.attPct !== null) g.att.push(r.attPct); if (r.absPct !== null) g.abs.push(r.absPct);
  }
  rows.forEach(function (r) { add(r.subjectId + '|' + r.sectionId, r.subject, r.section, r); add(r.subjectId, r.subject, 'كل الشعب', r); });
  return Object.keys(groups).map(function (k) {
    var g = groups[k];
    return {subject:g.subject, section:g.section, students:g.n, avg:r1(avgOf(g.sc)), max:g.sc.length ? Math.max.apply(null, g.sc) : null, min:g.sc.length ? Math.min.apply(null, g.sc) : null,
      passRate:g.sc.length ? r1(g.sc.filter(function (x) { return x >= pass; }).length / g.sc.length * 100) : null, attRate:r1(avgOf(g.att)), absRate:r1(avgOf(g.abs))};
  }).sort(function (a, b) { return (a.subject + (a.section === 'كل الشعب' ? '' : a.section)) < (b.subject + (b.section === 'كل الشعب' ? '' : b.section)) ? -1 : 1; });
}

/* ---- لوحة المشرف وسجل العمليات ---- */
function adminStats(ctx) {
  requireRole(ctx, ['admin']);
  var st = {pending:0, approved:0, rejected:0, suspended:0}, total = 0, week = 0, cut = Date.now() - 7 * 86400000;
  readAll('Users').forEach(function (u) { if (u.role !== 'student') return; total++; st[u.status] = (st[u.status] || 0) + 1; if (new Date(u.createdAt).getTime() > cut) week++; });
  var pres = 0, abs = 0; readAll('Attendance').forEach(function (a) { if (a.status === 'present' || a.status === 'late') pres++; else if (a.status === 'absent') abs++; });
  var rows = studentRows(ctx, {status:'approved'}), dist = {excellent:0, vgood:0, good:0, pass:0, improve:0, none:0}, sc = [];
  rows.forEach(function (r) { dist[r.level.key]++; if (r.score !== null) sc.push(r.score); });
  var msgs = {}; readAll('Messages').forEach(function (m) { msgs[m.fromUserId + m.createdAt + m.title] = 1; });
  var logs = readAll('AuditLogs'), recent = logs.slice(-10).reverse().map(function (l) { return {at:l.at, userName:l.userName, action:l.action, details:l.details}; });
  return {total:total, newWeek:week, status:st, present:pres, absent:abs, avgScore:r1(avgOf(sc)), levels:dist, materials:readAll('Materials').length,
    messages:Object.keys(msgs).length, recent:recent, warnings:rows.filter(function (r) { return r.alert || r.level.key === 'improve'; }).length};
}
function auditLogs(ctx) {
  requireRole(ctx, ['admin']);
  return readAll('AuditLogs').slice(-300).reverse().map(function (l) { return {at:l.at, userName:l.userName, action:l.action, details:l.details}; });
}

/* ================= المرحلة 5: الإعدادات والنسخ الاحتياطي والبيانات التجريبية ================= */
var SETTING_LABELS = {siteName:'اسم الموقع', collegeName:'اسم الكلية', academicYear:'السنة الدراسية', semester:'الفصل الدراسي', maxAbsencePct:'الحد الأقصى للغياب',
  uniquePhone:'منع تكرار الهاتف', sessionHours:'مدة الجلسة', showRank:'عرض الترتيب', wAttendance:'وزن الحضور', wExams:'وزن الاختبارات', wHomework:'وزن الواجبات', wEval:'وزن التقييمات',
  lvlExcellent:'حد ممتاز', lvlVeryGood:'حد جيد جدًا', lvlGood:'حد جيد', lvlPass:'حد مقبول'};

function setSetting(k, v) {
  var r = readAll('Settings').filter(function (x) { return x.key === k; })[0];
  if (r) updateRow('Settings', r._row, {value:String(v)}); else appendObj('Settings', {key:k, value:String(v)});
  _SET = null;
}
function getSettings(ctx) {
  requireRole(ctx, ['admin']); var v = {};
  Object.keys(SETTING_LABELS).forEach(function (k) { v[k] = getSetting(k); });
  return {values:v, hasLogo:!!getSetting('logoFileId')};
}
function saveSettings(ctx, d) {
  requireRole(ctx, ['admin']);
  var v = d.values || {}, o = {};
  ['siteName', 'collegeName', 'academicYear', 'semester'].forEach(function (k) {
    var t = cleanText(v[k], 100); if (!t) fail('INVALID', 'لا يمكن ترك "' + SETTING_LABELS[k] + '" فارغًا'); o[k] = t; });
  function num(k, min, max) {
    var n = Number(v[k]); if (v[k] === '' || v[k] === null || isNaN(n) || n < min || n > max) fail('INVALID', SETTING_LABELS[k] + ' يجب أن يكون بين ' + min + ' و ' + max); o[k] = String(n); }
  num('maxAbsencePct', 0, 100); num('sessionHours', 1, 72);
  ['wAttendance', 'wExams', 'wHomework', 'wEval'].forEach(function (k) { num(k, 0, 100); });
  if (Number(o.wAttendance) + Number(o.wExams) + Number(o.wHomework) + Number(o.wEval) !== 100) fail('INVALID', 'مجموع أوزان المستوى يجب أن يساوي 100%');
  ['lvlExcellent', 'lvlVeryGood', 'lvlGood', 'lvlPass'].forEach(function (k) { num(k, 1, 100); });
  if (!(Number(o.lvlExcellent) > Number(o.lvlVeryGood) && Number(o.lvlVeryGood) > Number(o.lvlGood) && Number(o.lvlGood) > Number(o.lvlPass))) fail('INVALID', 'حدود المستويات يجب أن تكون تنازلية: ممتاز > جيد جدًا > جيد > مقبول');
  o.uniquePhone = v.uniquePhone === 'true' || v.uniquePhone === true ? 'true' : 'false';
  o.showRank = v.showRank === 'true' || v.showRank === true ? 'true' : 'false';
  var changed = Object.keys(o).filter(function (k) { return getSetting(k) !== o[k]; });
  changed.forEach(function (k) { setSetting(k, o[k]); });
  audit(ctx.user.id, ctx.user.fullName, 'CHANGE_SETTINGS', changed.map(function (k) { return SETTING_LABELS[k]; }).join('، ') || 'بدون تغيير');
  return {message:'تم حفظ الإعدادات', brand:{siteName:o.siteName, collegeName:o.collegeName}};
}
function adminLists(ctx) {
  requireRole(ctx, ['admin']);
  var pack = function (r) { return {id:r.id, name:r.name, code:r.code || '', active:r.active !== 'false'}; };
  return {subjects:readAll('Subjects').map(pack), sections:readAll('Sections').map(pack)};
}
function saveItem(ctx, sheet, prefix, d) {
  requireRole(ctx, ['admin']);
  var name = cleanText(d.name, 100); if (name.length < 2) fail('INVALID', 'أدخل الاسم');
  var obj = {name:name, active:d.active === false || d.active === 'false' ? 'false' : 'true'};
  if (sheet === 'Subjects') obj.code = cleanText(d.code, 20);
  if (d.id) { var r = byId(sheet, d.id); if (!r) fail('NOT_FOUND', 'العنصر غير موجود'); updateRow(sheet, r._row, obj); }
  else { obj.id = newId(prefix); appendObj(sheet, obj); }
  audit(ctx.user.id, ctx.user.fullName, sheet === 'Subjects' ? 'SAVE_SUBJECT' : 'SAVE_SECTION', name);
  return {message:'تم الحفظ'};
}
function saveSubject(ctx, d) { return saveItem(ctx, 'Subjects', 'SUB', d); }
function saveSection(ctx, d) { return saveItem(ctx, 'Sections', 'SEC', d); }

/* ---- الشعار ---- */
function getLogoData() {
  var id = getSetting('logoFileId'); if (!id) return '';
  try { return 'data:image/png;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()); } catch (e) { return ''; }
}
function saveLogo(ctx, d) {
  requireRole(ctx, ['admin']);
  var bytes; try { bytes = Utilities.base64Decode(String((d.file && d.file.data) || '')); } catch (e) { fail('FILE', 'الصورة تالفة'); }
  if (!bytes.length || bytes.length > 250 * 1024) fail('FILE_SIZE', 'حجم الشعار يجب ألا يتجاوز 250 كيلوبايت');
  if (!(bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)) fail('FILE_TYPE', 'الشعار يجب أن يكون صورة PNG');
  var old = getSetting('logoFileId'); if (old) trashFile(old);
  var f = uploadFolder().createFile(Utilities.newBlob(bytes, 'image/png', 'logo.png'));
  setSetting('logoFileId', f.getId());
  audit(ctx.user.id, ctx.user.fullName, 'CHANGE_LOGO', '');
  return {message:'تم رفع الشعار', logo:getLogoData()};
}
function removeLogo(ctx) {
  requireRole(ctx, ['admin']); var old = getSetting('logoFileId'); if (old) trashFile(old);
  setSetting('logoFileId', ''); audit(ctx.user.id, ctx.user.fullName, 'REMOVE_LOGO', '');
  return {message:'تم حذف الشعار'};
}

/* ---- النسخ الاحتياطي (لا يتضمن كلمات المرور أبدًا) ---- */
function backupData(ctx, d) {
  requireRole(ctx, ['admin']);
  var w = d.what, all = w === 'all', sheets = [], includeNationalId = d.includeNationalId !== false, includePhone = d.includePhone !== false;
  if (['students', 'grades', 'attendance', 'messages', 'settings', 'all'].indexOf(w) < 0) fail('INVALID', 'نوع النسخة غير صحيح');
  var users = {}, stu = {}, subs = nameMap('Subjects'), secs = nameMap('Sections'), ass = {};
  readAll('Users').forEach(function (u) { users[u.id] = u; });
  readAll('Students').forEach(function (s) { stu[s.id] = s; });
  readAll('Assessments').forEach(function (a) { ass[a.id] = a; });
  var ST = {pending:'قيد المراجعة', approved:'مقبول', rejected:'مرفوض', suspended:'موقوف'}, AT = {present:'حاضر', absent:'غائب', late:'متأخر', excused:'غياب بعذر'};
  var sn = function (id) { return stu[id] ? stu[id].fullName : ''; };
  if (w === 'students' || all) {
    var studentHead = ['الاسم'];
    if (includeNationalId) studentHead.push('الرقم القومي');
    if (includePhone) studentHead.push('الهاتف');
    studentHead = studentHead.concat(['البريد', 'المادة', 'الشعبة', 'حالة الحساب', 'تاريخ التسجيل']);
    sheets.push({name:'الطلاب', rows:[studentHead].concat(readAll('Students').map(function (s) {
      var row = [s.fullName];
      if (includeNationalId) row.push(s.nationalId);
      if (includePhone) row.push(s.phone);
      return row.concat([s.email, subs[s.subjectId] || '', secs[s.sectionId] || '', users[s.userId] ? ST[users[s.userId].status] : '', s.createdAt]);
    }))});
  }
  if (w === 'grades' || all) {
    var gradesHead = ['الطالب'];
    if (includeNationalId) gradesHead.push('الرقم القومي');
    if (includePhone) gradesHead.push('الهاتف');
    gradesHead = gradesHead.concat(['المادة', 'الشعبة', 'التقييم', 'النوع', 'التاريخ', 'الدرجة', 'النهاية', 'ملاحظات', 'عدّلها', 'تاريخ التعديل']);
    sheets.push({name:'الدرجات', rows:[gradesHead].concat(
    readAll('Grades').map(function (g) { var s = stu[g.studentId] || {}, a = ass[g.assessmentId] || {};
      var row = [s.fullName || ''];
      if (includeNationalId) row.push(s.nationalId || '');
      if (includePhone) row.push(s.phone || '');
      return row.concat([subs[a.subjectId] || '', secs[a.sectionId] || '', a.name || '', a.type || '', a.date || '', g.score, a.maxScore || '', g.note, g.updatedBy, g.updatedAt]); }))});
  }
  if (w === 'attendance' || all) {
    var attendanceHead = ['التاريخ', 'المحاضرة', 'الطالب'];
    if (includeNationalId) attendanceHead.push('الرقم القومي');
    if (includePhone) attendanceHead.push('الهاتف');
    attendanceHead = attendanceHead.concat(['المادة', 'الشعبة', 'الحالة', 'ملاحظات', 'عدّله', 'تاريخ التعديل']);
    sheets.push({name:'الحضور', rows:[attendanceHead].concat(
    readAll('Attendance').map(function (a) { var s = stu[a.studentId] || {};
      var row = [a.date, a.lecture, s.fullName || ''];
      if (includeNationalId) row.push(s.nationalId || '');
      if (includePhone) row.push(s.phone || '');
      return row.concat([subs[a.subjectId] || '', secs[a.sectionId] || '', AT[a.status] || a.status, a.note, a.updatedBy, a.updatedAt]); }))});
  }
  if (w === 'messages' || all) sheets.push({name:'الرسائل', rows:[['التاريخ', 'المرسل', 'المستلم', 'العنوان', 'النص', 'مقروءة']].concat(
    readAll('Messages').map(function (m) { return [m.createdAt, users[m.fromUserId] ? users[m.fromUserId].fullName : '', users[m.toUserId] ? users[m.toUserId].fullName : '', m.title, m.body, m.readAt ? 'نعم' : 'لا']; }))});
  if (w === 'settings' || all) sheets.push({name:'الإعدادات', rows:[['الإعداد', 'القيمة']].concat(Object.keys(SETTING_LABELS).map(function (k) { return [SETTING_LABELS[k], getSetting(k)]; }))});
  audit(ctx.user.id, ctx.user.fullName, 'BACKUP', w);
  return {sheets:sheets};
}

/* ---- البيانات التجريبية (كل معرّفاتها تبدأ بـ DEMO_) ---- */
var DEMO_FIELDS = ['id', 'userId', 'toUserId', 'studentId', 'subjectId', 'sectionId', 'teacherUserId', 'assessmentId'];
function isDemo(o) { return DEMO_FIELDS.some(function (f) { return o[f] && String(o[f]).indexOf('DEMO_') === 0; }); }
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function seedDemo(ctx) {
  requireRole(ctx, ['admin']);
  if (readAll('Users').some(function (u) { return u.id.indexOf('DEMO_') === 0; })) fail('INVALID', 'البيانات التجريبية موجودة بالفعل. احذفها أولًا.');
  var pw = 'Demo12345', salt = Utilities.getUuid(), ph = hashPw(pw, salt), t0 = now();
  var names = ['محمد أحمد علي حسن', 'أحمد محمود إبراهيم سعيد', 'عمر خالد يوسف عبد الله', 'يوسف مصطفى كامل حسين', 'إبراهيم سيد محمد عثمان', 'علي حسن محمود السيد', 'مصطفى عادل أحمد فؤاد', 'خالد إسماعيل طه رمضان', 'محمود عبد الرحمن صالح نبيل', 'حسام الدين ماهر جمال شوقي'];
  var users = [{id:'DEMO_U_T', username:'demo_teacher', nationalId:'', salt:salt, passHash:ph, role:'teacher', status:'approved', fullName:'د. أحمد محمود (تجريبي)', phone:'', email:'', createdAt:t0}], studs = [];
  names.forEach(function (n, i) {
    var nid = '2990101010' + pad(i + 1, 4), ph2 = '01000000' + pad(i + 1, 3);
    users.push({id:'DEMO_U' + i, username:nid, nationalId:nid, salt:salt, passHash:ph, role:'student', status:'approved', fullName:n, phone:ph2, email:'', createdAt:t0});
    studs.push({id:'DEMO_S' + i, userId:'DEMO_U' + i, fullName:n, nationalId:nid, sectionId:i < 5 ? 'DEMO_SEC1' : 'DEMO_SEC2', subjectId:'DEMO_SUB', phone:ph2, email:'', createdAt:t0});
  });
  appendMany('Users', users); appendMany('Students', studs);
  appendMany('Teachers', [{id:'DEMO_T1', userId:'DEMO_U_T', fullName:'د. أحمد محمود (تجريبي)', phone:'', email:'', createdAt:t0}]);
  appendMany('Subjects', [{id:'DEMO_SUB', name:'مادة تجريبية', code:'DEMO', active:'true'}]);
  appendMany('Sections', [{id:'DEMO_SEC1', name:'شعبة تجريبية 1', active:'true'}, {id:'DEMO_SEC2', name:'شعبة تجريبية 2', active:'true'}]);
  appendMany('Enrollments', [{id:'DEMO_E1', teacherUserId:'DEMO_U_T', subjectId:'DEMO_SUB', sectionId:''}]);
  var dates = [], k; for (k = 4; k >= 0; k--) { var dt = new Date(Date.now() - k * 7 * 86400000); dates.push(dt.getFullYear() + '-' + pad(dt.getMonth() + 1, 2) + '-' + pad(dt.getDate(), 2)); }
  var att = [], n = 0;
  studs.forEach(function (s, i) {
    var pa = i % 4 === 0 ? 0.4 : 0.1;
    dates.forEach(function (d, j) {
      var r = Math.random(), st = r < pa ? 'absent' : r < pa + 0.07 ? 'late' : r < pa + 0.11 ? 'excused' : 'present';
      att.push({id:'DEMO_A' + (n++), date:d, subjectId:'DEMO_SUB', sectionId:s.sectionId, lecture:String(j + 1), studentId:s.id, status:st, note:'', updatedBy:'بيانات تجريبية', updatedAt:t0}); });
  });
  var assess = [], defs = [['اختبار قصير 1', 'quiz', 10, 1], ['واجب 1', 'homework', 10, 2], ['اختبار شهري', 'monthly', 20, 3]];
  ['DEMO_SEC1', 'DEMO_SEC2'].forEach(function (sec, si) { defs.forEach(function (df, di) {
    assess.push({id:'DEMO_AS' + si + di, name:df[0], type:df[1], date:dates[df[3]], subjectId:'DEMO_SUB', sectionId:sec, maxScore:String(df[2]), createdBy:'بيانات تجريبية'}); }); });
  var gr = [], g = 0;
  studs.forEach(function (s, i) {
    var base = 0.45 + Math.random() * 0.5;
    assess.filter(function (a) { return a.sectionId === s.sectionId; }).forEach(function (a, di) {
      if (a.type === 'homework' && i % 3 === 0) return;
      var ab = Math.max(0.2, Math.min(1, base - (i % 5 === 0 ? di * 0.12 : 0) + (Math.random() - 0.5) * 0.15));
      gr.push({id:'DEMO_G' + (g++), assessmentId:a.id, studentId:s.id, score:String(Math.round(ab * Number(a.maxScore) * 2) / 2), note:'', updatedBy:'بيانات تجريبية', updatedAt:t0}); });
  });
  appendMany('Attendance', att); appendMany('Assessments', assess); appendMany('Grades', gr);
  appendMany('Messages', studs.map(function (s, i) { return {id:'DEMO_M' + i, fromUserId:ctx.user.id, toType:'subject', toValue:'DEMO_SUB', toUserId:s.userId, title:'رسالة تجريبية', body:'هذه رسالة تجريبية للاختبار.', createdAt:t0, readAt:''}; }));
  appendMany('Announcements', [{id:'DEMO_AN1', title:'إعلان تجريبي', body:'هذا إعلان تجريبي للاختبار.', subjectId:'DEMO_SUB', sectionId:'', fileUrl:'', createdBy:ctx.user.id, createdAt:t0}]);
  audit(ctx.user.id, ctx.user.fullName, 'SEED_DEMO', studs.length + ' طالب');
  return {message:'تم إنشاء البيانات التجريبية', teacher:'demo_teacher', student:studs[0].nationalId, password:pw};
}
function clearDemo(ctx) {
  requireRole(ctx, ['admin']); var total = 0;
  ['Users', 'Students', 'Teachers', 'Subjects', 'Sections', 'Enrollments', 'Attendance', 'Assessments', 'Grades', 'Messages', 'Notifications', 'Announcements', 'Sessions']
    .forEach(function (n) { total += deleteWhere(n, isDemo); });
  audit(ctx.user.id, ctx.user.fullName, 'CLEAR_DEMO', total + ' سجل');
  return {message:'تم حذف ' + total + ' سجلًا تجريبيًا'};
}
function cleanupSessions() { deleteWhere('Sessions', function (o) { return new Date(o.expires) < new Date(); }); }
