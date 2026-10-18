const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Small .env reader so this project stays dependency-free (shell variables take precedence).
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (e) { if (e.code !== 'ENOENT') throw e; }

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };
const ROLES = new Set(['admin','analista','familia']);
const sessions = new Map();
const attempts = new Map();
let writeQueue = Promise.resolve();

function json(res, status, value, extra = {}) { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...extra }); res.end(JSON.stringify(value)); }
function safeUser(u) { return { id:u.id, name:u.name, email:u.email, role:u.role, studentIds:u.studentIds || [], subjectIds:u.subjectIds || [], active:u.active !== false }; }
function readDB() { try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return { users:[], students:[], subjects:[], plans:[], progress:[], settings:{ schoolName:'Institución Educativa Departamental Bruselas', passingScore:60, term:'Periodo académico actual', theme:'light' } }; throw e; } }
function persist(db) { writeQueue = writeQueue.then(() => fs.promises.mkdir(DATA_DIR,{recursive:true}).then(() => fs.promises.writeFile(DB_FILE, JSON.stringify(db,null,2), {mode:0o600}))); return writeQueue; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return new Promise((resolve,reject) => crypto.scrypt(password,salt,64,(e,key) => e ? reject(e) : resolve(`${salt}:${key.toString('hex')}`))); }
async function verifyPassword(password, stored) { const [salt, expected] = String(stored).split(':'); if (!salt || !expected) return false; const actual = await hashPassword(password,salt); const a=Buffer.from(actual.split(':')[1],'hex'), b=Buffer.from(expected,'hex'); return a.length===b.length && crypto.timingSafeEqual(a,b); }
function cookieMap(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2)); }
function session(req) { const id = cookieMap(req).sgaa_session; const s = sessions.get(id); if (!s || s.expires < Date.now()) { if (id) sessions.delete(id); return null; } s.expires = Date.now()+8*60*60*1000; return s; }
function requireAuth(req,res,roles) { const s=session(req); if (!s) { json(res,401,{error:'Inicia sesión para continuar.'}); return null; } if (roles && !roles.includes(s.user.role)) { json(res,403,{error:'No tienes permiso para realizar esta acción.'}); return null; } return s; }
function body(req) { return new Promise((resolve,reject)=>{ let data=''; req.on('data',c=>{data+=c; if(data.length>1024*1024) req.destroy();}); req.on('end',()=>{try{resolve(data?JSON.parse(data):{});}catch{reject(new Error('JSON inválido'));}}); req.on('error',reject); }); }
function str(v,max=160) { if(typeof v!=='string') return ''; return v.trim().slice(0,max); }
function validId(id, list) { return list.find(x=>x.id===id); }
function canSeeStudent(user, student) { if (user.role==='admin') return true; if(user.role==='analista') return !user.studentIds?.length || user.studentIds.includes(student.id); return (user.studentIds||[]).includes(student.id); }
function progressPercent(db,studentId,subjectId) { const rows=db.progress.filter(p=>p.studentId===studentId && p.subjectId===subjectId); if(!rows.length) return 0; const done=rows.filter(p=>p.completed).length; return Math.round(done/rows.length*100); }
async function ensureAdmin() {
  await fs.promises.mkdir(DATA_DIR,{recursive:true});
  const db=readDB();
  if(db.users.length) return;
  const email=str(process.env.ADMIN_EMAIL,254).toLowerCase(), password=process.env.ADMIN_PASSWORD || '';
  if(!email || !email.includes('@') || password.length<12) throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) antes del primer inicio.');
  db.users.push({id:crypto.randomUUID(),name:str(process.env.ADMIN_NAME||'Administrador',100),email,role:'admin',passwordHash:await hashPassword(password),active:true,studentIds:[],subjectIds:[]});
  await persist(db);
}
function setSecurityHeaders(res) { res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()'); res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"); }

const server=http.createServer(async(req,res)=>{
  setSecurityHeaders(res);
  const url=new URL(req.url,'http://localhost');
  try {
    if(req.method==='GET' && url.pathname==='/api/session') { const s=session(req); return json(res,200,{user:s?safeUser(readDB().users.find(u=>u.id===s.user.id)||s.user):null,csrf:s?.csrf||null}); }
    if(req.method==='POST' && url.pathname==='/api/login') {
      const data=await body(req), email=str(data.email,254).toLowerCase(), password=typeof data.password==='string'?data.password:'';
      const now=Date.now(), recent=(attempts.get(email)||[]).filter(t=>now-t<15*60*1000); if(recent.length>=8) return json(res,429,{error:'Demasiados intentos. Espera 15 minutos.'});
      const db=readDB(), user=db.users.find(u=>u.email===email && u.active!==false);
      if(!user || !(await verifyPassword(password,user.passwordHash))) { recent.push(now); attempts.set(email,recent); return json(res,401,{error:'Correo o contraseña incorrectos.'}); }
      attempts.delete(email); const sid=crypto.randomBytes(32).toString('hex'), csrf=crypto.randomBytes(24).toString('hex'); sessions.set(sid,{user:safeUser(user),csrf,expires:now+8*60*60*1000});
      res.setHeader('Set-Cookie',[`sgaa_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${IS_PROD?'; Secure':''}`,`sgaa_csrf=${csrf}; SameSite=Strict; Path=/; Max-Age=28800${IS_PROD?'; Secure':''}`]);
      return json(res,200,{user:safeUser(user),csrf});
    }
    if(req.method==='POST' && url.pathname==='/api/logout') { const s=session(req); if(s) for(const [id,v] of sessions) if(v===s) sessions.delete(id); res.setHeader('Set-Cookie',[`sgaa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${IS_PROD?'; Secure':''}`,`sgaa_csrf=; SameSite=Strict; Path=/; Max-Age=0${IS_PROD?'; Secure':''}`]); return json(res,200,{ok:true}); }
    if(url.pathname.startsWith('/api/')) {
      const s=requireAuth(req,res); if(!s)return;
      if(!['GET','HEAD','OPTIONS'].includes(req.method)) { const cookies=cookieMap(req); if(req.headers['x-csrf-token']!==s.csrf || req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`) return json(res,403,{error:'Solicitud no válida. Recarga la página e intenta de nuevo.'}); }
      const db=readDB(), role=s.user.role;
      if(req.method==='GET' && url.pathname==='/api/data') {
        const students=db.students.filter(st=>canSeeStudent(s.user,st));
        const subjectAllowed=sb=>role==='admin'||(role==='analista'&&(!s.user.subjectIds?.length||s.user.subjectIds.includes(sb.id)))||students.some(st=>db.plans.some(p=>p.studentId===st.id&&p.subjectId===sb.id));
        const subjects=db.subjects.filter(subjectAllowed), studentIds=students.map(x=>x.id);
        const plans=db.plans.filter(p=>studentIds.includes(p.studentId)&&(role!=='analista'||!s.user.subjectIds?.length||s.user.subjectIds.includes(p.subjectId)));
        const progress=db.progress.filter(p=>studentIds.includes(p.studentId)&&(role!=='analista'||!s.user.subjectIds?.length||s.user.subjectIds.includes(p.subjectId)));
        const alerts=students.flatMap(st=>subjects.map(sb=>({student:st.name,subject:sb.name,percent:progressPercent(db,st.id,sb.id)}))).filter(a=>a.percent<Number(db.settings.passingScore||60));
        return json(res,200,{user:s.user,students,subjects,plans,progress,settings:db.settings,alerts});
      }
      if(req.method==='POST' && url.pathname==='/api/students') {
        if(!['admin','analista'].includes(role)) return json(res,403,{error:'Solo rectoría o analistas pueden registrar estudiantes.'});
        const x=await body(req), name=str(x.name), grade=str(x.grade,40), code=str(x.code,40); if(name.length<3||!grade) return json(res,400,{error:'Nombre y curso son obligatorios.'});
        const item={id:crypto.randomUUID(),name,grade,code,guardian:str(x.guardian),createdAt:new Date().toISOString()}; db.students.push(item); await persist(db); return json(res,201,{item});
      }
      if(req.method==='DELETE' && url.pathname.startsWith('/api/students/')) {
        if(role!=='admin') return json(res,403,{error:'Solo rectoría puede retirar estudiantes.'}); const id=url.pathname.split('/').pop(); db.students=db.students.filter(x=>x.id!==id); db.plans=db.plans.filter(x=>x.studentId!==id); db.progress=db.progress.filter(x=>x.studentId!==id); for(const u of db.users)u.studentIds=(u.studentIds||[]).filter(x=>x!==id); await persist(db); return json(res,200,{ok:true});
      }
      if(req.method==='POST' && url.pathname==='/api/subjects') {
        if(role!=='admin') return json(res,403,{error:'Solo rectoría puede crear materias.'}); const x=await body(req),name=str(x.name),teacher=str(x.teacher); if(name.length<2) return json(res,400,{error:'Indica el nombre de la materia.'}); const item={id:crypto.randomUUID(),name,teacher,description:str(x.description,500)}; db.subjects.push(item); await persist(db); return json(res,201,{item});
      }
      if(req.method==='DELETE' && url.pathname.startsWith('/api/subjects/')) { if(role!=='admin')return json(res,403,{error:'Solo rectoría puede retirar materias.'}); const id=url.pathname.split('/').pop(); db.subjects=db.subjects.filter(x=>x.id!==id); db.plans=db.plans.filter(x=>x.subjectId!==id); db.progress=db.progress.filter(x=>x.subjectId!==id); await persist(db); return json(res,200,{ok:true}); }
      if(req.method==='POST' && url.pathname==='/api/plans') {
        if(!['admin','analista'].includes(role))return json(res,403,{error:'Tu rol no puede editar planes.'}); const x=await body(req),student=validId(x.studentId,db.students),subject=validId(x.subjectId,db.subjects),title=str(x.title),guide=str(x.guide,1000); if(!student||!subject||title.length<2)return json(res,400,{error:'Selecciona estudiante y materia e indica el título del plan.'}); if(!canSeeStudent(s.user,student)||role==='analista'&&s.user.subjectIds?.length&&!s.user.subjectIds.includes(subject.id))return json(res,403,{error:'No puedes editar este registro.'}); const item={id:crypto.randomUUID(),studentId:student.id,subjectId:subject.id,title,guide,createdAt:new Date().toISOString()}; db.plans.push(item); await persist(db); return json(res,201,{item});
      }
      if(req.method==='DELETE' && url.pathname.startsWith('/api/plans/')) { const id=url.pathname.split('/').pop(),item=validId(id,db.plans); if(!item)return json(res,404,{error:'Plan no encontrado.'}); if(role==='familia'||!canSeeStudent(s.user,validId(item.studentId,db.students))||role==='analista'&&s.user.subjectIds?.length&&!s.user.subjectIds.includes(item.subjectId))return json(res,403,{error:'No puedes eliminar este plan.'}); db.plans=db.plans.filter(x=>x.id!==id); db.progress=db.progress.filter(x=>x.planId!==id); await persist(db); return json(res,200,{ok:true}); }
      if(req.method==='POST' && url.pathname==='/api/progress') {
        if(!['admin','analista'].includes(role))return json(res,403,{error:'Solo el personal académico puede registrar avances.'}); const x=await body(req),student=validId(x.studentId,db.students),subject=validId(x.subjectId,db.subjects),note=str(x.note,1000),status=x.completed===true; if(!student||!subject||!note)return json(res,400,{error:'Estudiante, materia y descripción son obligatorios.'}); if(!canSeeStudent(s.user,student)||role==='analista'&&s.user.subjectIds?.length&&!s.user.subjectIds.includes(subject.id))return json(res,403,{error:'No puedes registrar avances para este estudiante o materia.'}); const linkedPlan=x.planId?validId(x.planId,db.plans):null; if(x.planId&&(!linkedPlan||linkedPlan.studentId!==student.id||linkedPlan.subjectId!==subject.id))return json(res,400,{error:'El plan debe corresponder al mismo estudiante y materia.'}); const item={id:crypto.randomUUID(),studentId:student.id,subjectId:subject.id,planId:linkedPlan?.id||'',note,completed:status,observation:str(x.observation,1000),createdAt:new Date().toISOString(),createdBy:s.user.id}; db.progress.push(item); await persist(db); return json(res,201,{item});
      }
      if(req.method==='DELETE' && url.pathname.startsWith('/api/progress/')) { if(role==='familia')return json(res,403,{error:'Solo el personal académico puede retirar registros.'}); const id=url.pathname.split('/').pop(),item=validId(id,db.progress); if(!item||role==='analista'&&s.user.subjectIds?.length&&!s.user.subjectIds.includes(item.subjectId))return json(res,404,{error:'Registro no encontrado.'}); db.progress=db.progress.filter(x=>x.id!==id); await persist(db); return json(res,200,{ok:true}); }
      if(req.method==='PUT' && url.pathname==='/api/settings') { if(role!=='admin')return json(res,403,{error:'Solo rectoría puede cambiar la configuración institucional.'}); const x=await body(req); const score=Number(x.passingScore); if(!Number.isFinite(score)||score<0||score>100)return json(res,400,{error:'El umbral de alerta debe estar entre 0 y 100.'}); db.settings={...db.settings,schoolName:str(x.schoolName,120)||db.settings.schoolName,passingScore:score,term:str(x.term,80)||db.settings.term,theme:x.theme==='dark'?'dark':'light'}; await persist(db); return json(res,200,{settings:db.settings}); }
      if(url.pathname==='/api/users' && req.method==='GET') { if(role!=='admin')return json(res,403,{error:'Solo rectoría puede administrar cuentas.'}); return json(res,200,{users:db.users.map(safeUser),students:db.students,subjects:db.subjects}); }
      if(url.pathname==='/api/users' && req.method==='POST') { if(role!=='admin')return json(res,403,{error:'Solo rectoría puede crear cuentas.'}); const x=await body(req),name=str(x.name),email=str(x.email,254).toLowerCase(),password=typeof x.password==='string'?x.password:'',userRole=str(x.role,20); if(name.length<3||!email.includes('@')||!ROLES.has(userRole)||password.length<12||db.users.some(u=>u.email===email))return json(res,400,{error:'Verifica nombre, correo único, rol y contraseña de mínimo 12 caracteres.'}); const ids=Array.isArray(x.studentIds)?x.studentIds.filter(id=>db.students.some(st=>st.id===id)):[]; const subjectIds=Array.isArray(x.subjectIds)?x.subjectIds.filter(id=>db.subjects.some(sb=>sb.id===id)):[]; if(userRole==='familia'&&!ids.length)return json(res,400,{error:'Asigna al menos un estudiante a la cuenta familiar.'}); const u={id:crypto.randomUUID(),name,email,role:userRole,passwordHash:await hashPassword(password),active:true,studentIds:ids,subjectIds}; db.users.push(u); await persist(db); return json(res,201,{user:safeUser(u)}); }
      if(url.pathname.startsWith('/api/users/') && req.method==='DELETE') { if(role!=='admin')return json(res,403,{error:'Solo rectoría puede desactivar cuentas.'}); const id=url.pathname.split('/').pop(); if(id===s.user.id)return json(res,400,{error:'No puedes desactivar tu propia cuenta.'}); const u=validId(id,db.users); if(!u)return json(res,404,{error:'Cuenta no encontrada.'}); u.active=false; await persist(db); for(const [sid,sv] of sessions)if(sv.user.id===id)sessions.delete(sid); return json(res,200,{ok:true}); }
      return json(res,404,{error:'Ruta no encontrada.'});
    }
    const guarded=url.pathname.startsWith('/src/page/PaginaPrinsipal/');
    if(guarded){ const s=session(req); if(!s)return res.writeHead(302,{Location:'/'}).end(); return res.writeHead(302,{Location:'/'}).end(); }
    let requested=decodeURIComponent(url.pathname); if(requested==='/')requested='/index.html'; const target=path.resolve(ROOT,'.'+requested); if(!target.startsWith(ROOT+path.sep)&&target!==ROOT)return json(res,403,{error:'Acceso denegado.'});
    const relative=path.relative(ROOT,target).split(path.sep); const relativeName=relative.join('/');
    if(relative.some(part=>part==='data'||part==='node_modules'||part==='.git'||part==='.vscode'||part.startsWith('.')) && relativeName!=='.env.example') return json(res,404,{error:'Página no encontrada.'});
    fs.readFile(target,(e,buffer)=>{ if(e)return json(res,404,{error:'Página no encontrada.'}); res.writeHead(200,{'Content-Type':MIME[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':path.extname(target)==='.html'?'no-cache':'public, max-age=3600'}); res.end(buffer); });
  } catch(e) { console.error('Request error:',e.message); if(!res.headersSent)json(res,400,{error:e.message==='JSON inválido'?'La solicitud no tiene un formato válido.':'No fue posible completar la solicitud.'}); else res.destroy(); }
});

ensureAdmin().then(()=>server.listen(PORT,()=>console.log(`SERMA disponible en http://localhost:${PORT}`))).catch(e=>{console.error(e.message);process.exit(1);});
