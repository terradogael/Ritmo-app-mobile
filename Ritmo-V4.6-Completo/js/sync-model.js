/* Esquema 4: identidad por cuenta/contenedor/ID. Sin credenciales. */
(function(C){
 'use strict';
 const clone=C.clone,equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),zone='America/Argentina/Buenos_Aires';
 const localDate=stamp=>{const d=new Date(stamp);if(!Number.isFinite(+d))return null;return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
 const lower=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const fresh=()=>({config:{accountId:'',diaryListId:'',facultyListId:'',calendarIds:[],defaultCalendarId:'',timeZone:zone,subjects:[],enabled:false},links:[],queue:[],conflicts:[],review:[],archive:[],events:[],lastSync:null});
 const entity=(s,l)=>(l.localKind==='habit'?s.habits:l.localKind==='task'?s.tasks:s.exams).find(x=>x.id===l.localId)||null;
 const active=l=>!['detached','deleted'].includes(l.phase);
 const remoteKey=l=>JSON.stringify([l.accountId,l.service,l.containerId,l.remoteId]);
 const safeNotes=notes=>String(notes||'').replace(/\n?\[Ritmo(?:Habit|Date)?:[a-zA-Z0-9_:-]+\]/g,'').trim();
 const habitMarker=notes=>String(notes||'').match(/\[RitmoHabit:([a-zA-Z0-9_-]+)\]/)?.[1]||null;
 function taskRemote(r){
  const name=String(r.title||'').trim(),description=safeNotes(r.notes),due=r.due?r.due.slice(0,10):null;
  if(r.parent||r.assignmentInfo||!name||name.length>100||description.length>2000||(due&&!C.validDate(due)))throw Error('Tarea incompatible (subtarea, asignada, campos extensos o fecha inválida).');
  return {name,description,due,done:r.status==='completed'};
 }
  function parts(ms,zone){
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
    return {due:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,second:p.second};
  }
  function zonedInstant(due,time,zone){
    const target=Date.parse(`${due}T${time}:00Z`),matches=new Set();
    for(let h=-36;h<=36;h+=6){const probe=target+h*3600000,p=parts(probe,zone),offset=Date.parse(`${p.due}T${p.time}:${p.second}Z`)-probe,candidate=target-offset,q=parts(candidate,zone);if(q.due===due&&q.time===time)matches.add(candidate);}
    if(matches.size!==1)throw Error('Hora ambigua o inexistente por cambio horario. Elegí otra hora o zona horaria.');
    return [...matches][0];
  }
 function isExam(title){const s=lower(title);return !/\b(cumpleanos|cumple|reunion|fiesta|vacaciones|aniversario|futbol|copa|champions)\b/.test(s)&&/\b(parcial(?:es)?|final(?:es)?|recuperatorios?|recuperacion|recup|examen(?:es)?|coloquios?|mesa de examen)\b/.test(s);}
 function examType(title){const t=lower(title);return /recup/.test(t)?'Recuperatorio':/\bfinal(?:es)?\b/.test(t)?'Final':/coloquio/.test(t)?'Coloquio':/parcial/.test(t)?'Parcial':'Examen';}
 function subject(s,r,calendar){
  const title=lower(r.summary),rules=s.sync.config.subjects.filter(x=>x.name&&!x.name.includes('@'));
  const alias=rules.filter(x=>(x.aliases||[]).some(a=>a&&(' '+title+' ').includes(' '+lower(a)+' ')));
  if(alias.length===1)return alias[0].name;
  const byCalendar=rules.filter(x=>(x.calendarIds||[]).includes(calendar.id));if(byCalendar.length===1)return byCalendar[0].name;
  return 'Materia por asignar';
 }
 function eventRemote(r,l){
  if(r.eventType&&r.eventType!=='default')throw Error('Este tipo de evento no es un examen.');
  const title=String(r.summary||'').trim();if(!title||title.length>1024)throw Error('Título del evento inválido.');
  if(r.start?.date){const due=r.start.date,endDate=r.end?.date;if(!C.validDate(due)||!C.validDate(endDate)||endDate<=due)throw Error('Fecha de día completo inválida.');return {title,due,time:'',allDay:true,endDate,duration:C.daysBetween(endDate,due)*1440,timeZone:l.timeZone||zone};}
  const a=Date.parse(r.start?.dateTime),b=Date.parse(r.end?.dateTime),tz=r.start?.timeZone||l.timeZone||zone;
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||(b-a)%60000||(b-a)/60000>525600)throw Error('Evento sin horario válido a precisión de minutos.');
  const p=parts(a,tz),end=parts(b,tz);if(p.second!=='00')throw Error('Horario con segundos: requiere revisión.');
  return {title,due:p.due,time:p.time,allDay:false,endDate:end.due,duration:(b-a)/60000,timeZone:tz};
 }
 function habitRemote(r,l){
  const name=String(r.title||'').trim();if(!name||name.length>80||r.parent||r.assignmentInfo)throw Error('Hábito incompatible: revisá nombre o subtarea.');
  const done=r.status==='completed',fixed=String(r.notes||'').match(/\[RitmoDate:(\d{4}-\d{2}-\d{2})\]/)?.[1];
  const date=fixed||(done?localDate(r.completed):l?.occurrenceDate||r.due?.slice(0,10)||C.today());
  if(!C.validDate(date)||date>C.today()&&done)throw Error('No hay fecha de completado verificable para este hábito.');
  return {name,done,date};
 }
 const projectRemote=(r,l)=>l.domain==='diary'?habitRemote(r,l):l.domain==='exams'?eventRemote(r,l):taskRemote(r);
 function local(s,l){
  const e=entity(s,l);if(!e||e.deletedAt)return null;
  if(l.domain==='diary'){const item=s.history[l.occurrenceDate]?.items[e.id];const peers=s.sync.links.filter(x=>active(x)&&x.domain==='diary'&&x.localId===e.id&&x.occurrenceDate===l.occurrenceDate);return {name:e.name,done:item?.source==='legacy-confirmed'?(l.base?.done??null):peers.length>1?(l.observation?.done??l.base?.done??null):(item?.done??null),date:l.occurrenceDate};}
  if(l.domain==='faculty')return {name:e.name,description:e.description,due:e.due,done:e.done};
  if(l.domain==='exams')return {title:e.title,due:e.due,time:e.allDay?'':e.time,allDay:!!e.allDay,endDate:e.allDay?(e.endDate&&e.endDate>e.due?e.endDate:C.addDays(e.due,1)):parts(zonedInstant(e.due,e.time,e.timeZone||l.timeZone)+(e.duration||60)*60000,e.timeZone||l.timeZone).due,duration:e.allDay?C.daysBetween(e.endDate&&e.endDate>e.due?e.endDate:C.addDays(e.due,1),e.due)*1440:(e.duration||60),timeZone:e.timeZone||l.timeZone};
  return null;
 }
 function merge(base,a,b){if(equal(a,b))return {value:clone(a),fields:[]};if(!base)return {value:null,fields:Object.keys(a)};const value={},fields=[];for(const k of Object.keys(a)){if(equal(a[k],b[k]))value[k]=a[k];else if(equal(a[k],base[k]))value[k]=b[k];else if(equal(b[k],base[k]))value[k]=a[k];else fields.push(k);}return {value:fields.length?null:value,fields};}
 function putRecord(s,h,date,done,source,linkId=null){
  if(!C.validDate(date)||date>s.today)return;
  if(date<s.startedOn)s.startedOn=date;
  if(date<h.createdOn){h.createdOn=date;h.versions[0].from=date;}
  const row=s.history[date]||(s.history[date]={date,items:{}}),previous=row.items[h.id];
  row.items[h.id]={name:previous?.name||h.name,icon:previous?.icon||h.icon,emoji:previous?.emoji??h.emoji,...previous,scheduled:true,done,source,updatedAt:new Date().toISOString(),...(linkId?{evidenceLink:linkId}:{})};
 }
 function apply(s,l,v,source='google'){
  const e=entity(s,l);if(!e)throw Error('El elemento local ya no existe.');
  if(l.domain==='diary'){
   if(l.occurrenceDate!==v.date){const old=s.history[l.occurrenceDate]?.items[e.id];if(old?.evidenceLink===l.id&&old.source==='google')Object.assign(old,{done:null,source:'unknown'});}
   if(e.name!==v.name){e.name=v.name;C.refreshToday(s);}l.occurrenceDate=v.date;
   l.observation=clone(v);const prior=s.history[v.date]?.items[e.id];const peers=s.sync.links.filter(x=>active(x)&&x.domain==='diary'&&x.localId===e.id&&x.occurrenceDate===v.date);const done=peers.some(x=>x.observation?.done===true)||v.done;if(prior?.source!=='manual'&&prior?.source!=='legacy-confirmed')putRecord(s,e,v.date,done,source,l.id);
  }else if(l.domain==='faculty'){const old=e.done;Object.assign(e,v);if(old!==e.done)e.completedAt=e.done?new Date().toISOString():null;e.updatedAt=new Date().toISOString();}
  else if(l.domain==='exams'){Object.assign(e,v);if(e.typeSource==='mapping')e.type=examType(v.title);}
 }
 function body(v,l,s,creating=false,remote={}){
  const e=entity(s,l);
  if(l.domain==='faculty')return {title:v.name,notes:v.description+(v.description?'\n':'')+`[Ritmo:${l.marker}]`,due:v.due?v.due+'T00:00:00Z':null,status:v.done?'completed':'needsAction',...(v.done?{}:{completed:null})};
  if(l.domain==='diary'){
   if(v.done===null)throw Error('No se envía un registro desconocido a Google.');
   const notes=String(remote.notes||e.description||'');const tagged=notes.includes(`[RitmoHabit:${e.id}]`)?notes:notes+(notes?'\n':'')+`[RitmoHabit:${e.id}]`;
   return {title:v.name,notes:tagged+(creating?`\n[RitmoDate:${v.date}]\n[Ritmo:${l.marker}]`:''),...(creating?{due:v.date+'T00:00:00Z'}:{}),status:v.done?'completed':'needsAction',completed:v.done?new Date(zonedInstant(v.date,'12:00',zone)).toISOString():null};
  }
  const start=v.allDay?null:zonedInstant(v.due,v.time,v.timeZone),timing=v.allDay?{start:{date:v.due},end:{date:v.endDate}}:{start:{dateTime:new Date(start).toISOString(),timeZone:v.timeZone},end:{dateTime:new Date(start+v.duration*60000).toISOString(),timeZone:v.timeZone}};
  return {...timing,summary:v.title,...(creating?{id:l.remoteId,description:'Creado desde Ritmo. Temario y preparación se conservan localmente.',extendedProperties:{private:{ritmoLink:l.marker}}}:{})};
 }
 function makeLink(s,{domain,localId,containerId,accountId,remoteId=null,date=C.today(),timeZone=zone,readOnly=false,base=null}){
  if(!['diary','faculty','exams'].includes(domain)||!containerId||!accountId)throw Error('Elegí las fuentes de Google antes de sincronizar.');
  const service=domain==='exams'?'calendar':'tasks',kind=domain==='diary'?'habit':domain==='faculty'?'task':'exam';
  if(remoteId&&s.sync.links.some(l=>l.accountId===accountId&&l.service===service&&l.containerId===containerId&&l.remoteId===remoteId))throw Error('Ese registro ya fue vinculado.');
  const id=C.uid('link'),l={id,marker:id,domain,service,localKind:kind,localId,containerId,accountId,remoteId,phase:remoteId?'linked':'new',base:base?clone(base):null,etag:null,timeZone,readOnly,occurrenceDate:domain==='diary'?date:null,lastLocal:null};
  if(!entity(s,l))throw Error('Elemento local inexistente.');l.lastLocal=clone(entity(s,l));s.sync.links.push(l);return l;
 }
 function conflict(s,l,kind,remote=null,etag=null,message=''){
  const existing=s.sync.conflicts.find(c=>c.linkId===l.id);const next={id:existing?.id||C.uid('conflict'),linkId:l.id,kind,local:local(s,l),remote,etag,message,createdAt:existing?.createdAt||new Date().toISOString()};
  const row=l.domain==='diary'?s.history[l.occurrenceDate]?.items[l.localId]:null;if(row?.source==='manual'&&next.local&&next.local.done!==row.done){next.localObserved=clone(next.local);next.local.done=row.done;}
  s.sync.conflicts=s.sync.conflicts.filter(c=>c.linkId!==l.id);s.sync.conflicts.push(next);
 }
 function enqueue(s,l,type='upsert'){
  const existing=s.sync.queue.find(q=>q.linkId===l.id);if(existing){if(existing.status!=='uncertain')existing.status='pending';if(type==='delete')existing.type=type;return;}
  s.sync.queue.push({id:C.uid('op'),linkId:l.id,type,status:'pending',createdAt:new Date().toISOString()});
 }
 function detach(s,id){const l=s.sync.links.find(x=>x.id===id);if(l){if(l.phase==='tombstone'&&!entity(s,l)&&l.lastLocal){(l.localKind==='task'?s.tasks:l.localKind==='exam'?s.exams:s.habits).push(clone(l.lastLocal));}l.phase='detached';}s.sync.queue=s.sync.queue.filter(q=>q.linkId!==id);s.sync.conflicts=s.sync.conflicts.filter(c=>c.linkId!==id);}
 function beforeDelete(s,kind,id,remote=false){
  for(const l of s.sync.links.filter(l=>l.localKind===kind&&l.localId===id&&active(l))){l.lastLocal=clone(entity(s,l));if(remote&&l.remoteId&&!l.readOnly){l.phase='tombstone';enqueue(s,l,'delete');}else detach(s,l.id);}
 }
 function queueLocal(before,s){
  const c=s.sync.config;if(!c.enabled||!c.accountId)return;
  for(const l of s.sync.links.filter(l=>active(l)&&l.domain!=='unclassified'&&l.accountId===c.accountId)){
   const old=before.sync.links.find(x=>x.id===l.id),v=local(s,l);if(!v)continue;
   if(old&&!equal(local(before,old),v))enqueue(s,l);
  }
  for(const [domain,list,containerId]of [['diary',s.habits,c.diaryListId],['faculty',C.academicTasks(s),c.facultyListId],['exams',s.exams,c.defaultCalendarId]]){
   if(!containerId)continue;
   for(const e of list){
    if(e.deletedAt||e.archived||e.googleTaskPending||s.sync.links.some(l=>l.localId===e.id&&l.localKind===(domain==='diary'?'habit':domain==='faculty'?'task':'exam')))continue;
    const l=makeLink(s,{domain,localId:e.id,containerId,accountId:c.accountId,timeZone:e.timeZone||c.timeZone,date:s.today});enqueue(s,l);
   }
  }
  // Una corrección por fecha sólo apunta a la ocurrencia de esa fecha.
  for(const [date,r]of Object.entries(s.history))for(const [id,v]of Object.entries(r.items)){
   const old=before.history[date]?.items[id];if(v.source!=='manual'||equal(old,v)||!c.diaryListId)continue;
   const candidates=s.sync.links.filter(l=>l.domain==='diary'&&l.localId===id&&l.occurrenceDate===date&&active(l)&&l.accountId===c.accountId&&l.containerId===c.diaryListId);
   if(candidates.length===1)enqueue(s,candidates[0]);
   else if(candidates.length>1)for(const l of candidates)conflict(s,l,'occurrences',null,null,'Hay más de una ocurrencia en esta fecha. Revisá cuál modificar.');
   else if(v.done===true){const l=makeLink(s,{domain:'diary',localId:id,containerId:c.diaryListId,accountId:c.accountId,date});enqueue(s,l);}
  }
 }
 function addReview(s,row){const prior=s.sync.review.find(x=>x.key===row.key&&x.status==='pending')||s.sync.review.find(x=>x.key===row.key);if(prior){if(prior.status==='pending'){Object.assign(prior,row);return prior;}if(!row.items?.some(r=>!prior.items?.some(x=>x.id===r.id)))return prior;}const r={id:C.uid('review'),status:'pending',...row};s.sync.review.push(r);return r;}
 function migrate(s){
  const old=clone(s.sync||{});s.sync=fresh();s.sync.legacy=old;
  Object.assign(s.sync.config,{accountId:old.config?.accountId||'',timeZone:old.config?.timeZone||zone});
  const linkMap=new Set();
  for(const l of old.links||[]){const x={...clone(l),domain:'unclassified',readOnly:false,occurrenceDate:null};s.sync.links.push(x);linkMap.add(l.localId);const t=s.tasks.find(t=>t.id===l.localId);if(t)t.quarantined=true;}
  for(const h of s.habits){h.description=h.description||'';if(h.googleTask){const g=h.googleTask;if(!s.sync.links.some(l=>l.service==='tasks'&&l.accountId===g.account&&l.containerId===g.containerId&&l.remoteId===g.remoteId)){const l=makeLink(s,{domain:'diary',localId:h.id,accountId:g.account,containerId:g.containerId,remoteId:g.remoteId,date:s.today});l.needsRebase=true;l.etag=g.etag||null;}}
   if(h.googleTaskPending)addReview(s,{key:'legacy-create:'+h.id,kind:'legacy-create',localId:h.id,label:h.name,message:'Creación anterior sin confirmar. Se buscará su marcador antes de volver a publicar.'});
  }
  for(const e of s.exams){e.allDay=!!e.googleEvent?.allDay;e.time=e.allDay?'':e.time;e.timeZone=e.timeZone||zone;e.duration=e.duration||60;e.endDate=e.endDate||C.addDays(e.due,1);if(e.name.includes('@')){e.legacySubject=e.name;e.name='Materia por asignar';}if(e.googleEvent){const g=e.googleEvent;if(!s.sync.links.some(l=>l.service==='calendar'&&l.accountId===g.account&&l.containerId===g.containerId&&l.remoteId===g.remoteId)){const l=makeLink(s,{domain:'exams',localId:e.id,accountId:g.account,containerId:g.containerId,remoteId:g.remoteId,timeZone:e.timeZone});l.needsRebase=true;}}
  }
  for(const [date,r]of Object.entries(s.history))for(const [id,h]of Object.entries(r.items)){if(h.source)continue;h.legacyDone=h.done;const imported=s.habits.find(x=>x.id===id)?.googleTask;if(!h.done||imported){h.done=null;h.source='legacy-unverified';}else h.source='legacy';}
  s.schemaVersion=4;s.sync.migratedFrom=3;
 }
 function validate(s){
  const x=s.sync,fail=()=>{throw Error('Metadatos de sincronización inválidos. Se conserva el guardado anterior.');};
  if(!x||!x.config||!Array.isArray(x.links)||!Array.isArray(x.queue)||!Array.isArray(x.conflicts)||!Array.isArray(x.review)||!Array.isArray(x.archive))fail();
  const c=x.config;if(!Array.isArray(c.calendarIds)||!Array.isArray(c.subjects)||typeof c.enabled!=='boolean'||typeof c.accountId!=='string'||typeof c.diaryListId!=='string'||typeof c.facultyListId!=='string'||(c.diaryListId&&c.diaryListId===c.facultyListId))fail();
  if(c.calendarIds.some(x=>typeof x!=='string'||!x)||new Set(c.calendarIds).size!==c.calendarIds.length||typeof c.defaultCalendarId!=='string'||c.defaultCalendarId&&!c.calendarIds.includes(c.defaultCalendarId))fail();
  for(const rule of c.subjects)if(!rule||typeof rule.name!=='string'||!rule.name.trim()||rule.name.includes('@')||!Array.isArray(rule.aliases)||rule.aliases.some(x=>typeof x!=='string')||!Array.isArray(rule.calendarIds)||rule.calendarIds.some(x=>typeof x!=='string'))fail();
  try{new Intl.DateTimeFormat('es',{timeZone:c.timeZone});}catch{fail();}
  const ids=new Set(),keys=new Set();for(const l of x.links){if(!l||typeof l.id!=='string'||ids.has(l.id)||!['diary','faculty','exams','unclassified'].includes(l.domain)||!['new','creating','linked','detached','deleted','tombstone'].includes(l.phase)||!['tasks','calendar'].includes(l.service)||typeof l.accountId!=='string'||!l.accountId||typeof l.containerId!=='string'||!l.containerId)fail();if(l.domain!=='unclassified'&&(l.localKind!==({diary:'habit',faculty:'task',exams:'exam'})[l.domain]||l.service!==(l.domain==='exams'?'calendar':'tasks')))fail();if(typeof l.localId!=='string')fail();ids.add(l.id);if(l.remoteId&&l.domain!=='unclassified'&&active(l)){const k=remoteKey(l);if(keys.has(k))fail();keys.add(k);}if(l.domain==='diary'&&!C.validDate(l.occurrenceDate))fail();}
  for(const q of x.queue)if(!ids.has(q.linkId)||!['upsert','delete'].includes(q.type)||!['pending','uncertain','blocked'].includes(q.status))fail();
  const banned=new Set(['access_token','refresh_token','id_token','client_secret','password','__proto__','prototype','constructor']);const check=(o,depth=0)=>{if(depth>30)fail();if(!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o)){if(banned.has(k))fail();check(v,depth+1);}};check(x);
 }
 C.SyncModel={fresh,entity,active,remoteKey,localDate,lower,safeNotes,habitMarker,taskRemote,parts,zonedInstant,isExam,examType,subject,eventRemote,habitRemote,projectRemote,local,merge,putRecord,apply,body,makeLink,conflict,enqueue,detach,beforeDelete,queueLocal,addReview,migrate,validate,equal};
})(RitmoCore);
