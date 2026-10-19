/* Ritmo V4.5: entidades locales; sincronización separada. */
(function(root){
'use strict';
const SCHEMA=4, KEY='ritmo.app.state', BACKUP=KEY+'.backup';
const clone=x=>JSON.parse(JSON.stringify(x));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const date=s=>new Date(s+'T12:00:00');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&s<='2200-12-31'&&iso(date(s))===s;
const addDays=(s,n)=>{const d=date(s);d.setDate(d.getDate()+n);return iso(d);};
const weekday=s=>(date(s).getDay()+6)%7;
const daysBetween=(a,b)=>Math.round((Date.UTC(...a.split('-').map((n,i)=>i===1?+n-1:+n))-Date.UTC(...b.split('-').map((n,i)=>i===1?+n-1:+n)))/86400000);
const weekDates=s=>Array.from({length:7},(_,i)=>addDays(s,i-weekday(s)));
const uid=prefix=>prefix+'-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const ICONS=['book','gym','leaf','water','steps','bolt','edit'];
const PAW_COLORS=Object.freeze({'sin-progreso':'#DCC5AE',parcial:'#E5A982',avanzado:'#BD7147',completo:'#53664A'});
const porcentaje=(n,total)=>total>0?n/total*100:null;
const estadoPatita=(n,total)=>!total?'sin-habitos':!n?'sin-progreso':n===total?'completo':n/total<.5?'parcial':'avanzado';
function createState(day=today()) {return {schemaVersion:SCHEMA,revision:0,updatedAt:null,startedOn:day,today:day,habits:[],history:{},tasks:[],exams:[],sessions:[],timer:root.RitmoCore.Timer.freshTimer(),sync:root.RitmoCore.SyncModel.fresh(),preferences:{motion:true,sounds:false,notifications:false},ui:{last:{day:'inicio',night:'facultad'},habitFilter:'activos',taskFilter:'todas',examFilter:'proximos',taskSort:'cercano',period:'mes'}};}
function configAt(h,day){return h.versions.filter(v=>v.from<=day).at(-1);}
function isDue(h,day){const c=configAt(h,day);return h.createdOn<=day&&!!c?.active&&c.days.includes(weekday(day));}
function materializeDay(s,day,refresh=false){
 if(day<s.startedOn||day>s.today)return;
 if(s.history[day]&&!refresh)return;
 const old=s.history[day]?.items||{},items=Object.fromEntries(Object.entries(old).map(([id,h])=>[id,{...h,scheduled:false}]));
 s.habits.filter(h=>isDue(h,day)).forEach(h=>{items[h.id]={name:h.name,icon:h.icon,emoji:h.emoji||'',...old[h.id],scheduled:true,done:old[h.id]?.done??null,source:old[h.id]?.source||'unknown'};});
 s.history[day]={date:day,items};
}
function ensureDays(s,day=today()){
 s.today=day;
 let start=s.startedOn;
 for(let d=start;d<=day;d=addDays(d,1))materializeDay(s,d);
}
function rows(s,day){if(day>s.today||day<s.startedOn)return [];materializeDay(s,day);return Object.entries(s.history[day]?.items||{}).filter(([,h])=>h.scheduled).map(([id,v])=>({id,...v}));}
function daySnapshot(s,day){
 if(day>s.today)return {date:day,total:null,completed:null,state:'futuro'};
 if(day<s.startedOn)return {date:day,total:null,completed:null,state:'sin-registro'};
 const list=rows(s,day),known=list.filter(h=>h.done!==null),total=known.length,completed=known.filter(h=>h.done).length,unknown=list.length-total;
 return {date:day,total,completed,unknown,scheduledTotal:list.length,state:unknown?(total?'datos-parciales':'sin-datos'):estadoPatita(completed,total)};
}
function refreshToday(s){materializeDay(s,s.today,true);}
function setVersion(h,day,active,days=h.days){h.versions=h.versions.filter(v=>v.from!==day);h.versions.push({from:day,days:[...days],active});h.versions.sort((a,b)=>a.from.localeCompare(b.from));h.archived=!active;}
function cleanText(value,label,max){const s=String(value||'').trim();if(!s||s.length>max)throw Error(`${label}: escribí entre 1 y ${max} caracteres.`);return s;}
function saveHabit(s,data,id){
 const name=cleanText(data.name,'Nombre',80),days=[...new Set(data.days||[])].filter(d=>Number.isInteger(d)&&d>=0&&d<=6);
 if(!days.length)throw Error('Elegí al menos un día de la semana.');
 if(!ICONS.includes(data.icon))throw Error('Elegí un icono válido.');
 const emoji=String(data.emoji||'').trim();if(Array.from(emoji).length>16)throw Error('Elegí un solo emoji o dejá el campo vacío.');
 let h=id?s.habits.find(h=>h.id===id&&!h.deletedAt):null;
 if(id&&!h)throw Error('El hábito ya no está disponible.');
 const isNew=!h;if(!h){h={id:uid('h'),createdOn:s.today,archived:false,deletedAt:null,versions:[],description:''};s.habits.push(h);}
 Object.assign(h,{name,icon:data.icon,emoji,days});setVersion(h,s.today,!h.archived);refreshToday(s);if(isNew&&s.history[s.today]?.items[h.id])Object.assign(s.history[s.today].items[h.id],{done:false,source:'local',updatedAt:new Date().toISOString()});return h;
}
function archiveHabit(s,id){const h=s.habits.find(h=>h.id===id&&!h.deletedAt);if(!h)throw Error('Hábito no disponible.');setVersion(h,s.today,h.archived);refreshToday(s);}
function deleteHabit(s,id){const h=s.habits.find(h=>h.id===id&&!h.deletedAt);if(!h)throw Error('Hábito no disponible.');root.RitmoCore.SyncModel.beforeDelete(s,'habit',id,false);h.deletedAt=new Date().toISOString();setVersion(h,s.today,false);refreshToday(s);}
function toggleHabit(s,id,day){if(!validDate(day)||day>s.today||day<s.startedOn)throw Error('Elegí una fecha registrada, hasta hoy.');materializeDay(s,day);const h=s.history[day]?.items[id];if(!h?.scheduled)throw Error('Este hábito no estaba programado ese día.');h.done=!h.done;h.source='manual';h.updatedAt=new Date().toISOString();return h.done;}
function saveTask(s,data,id){
 const name=cleanText(data.name,'Tarea',100),subject=String(data.subject||'').trim();if(subject.length>80)throw Error('La materia admite hasta 80 caracteres.');
 const due=data.due||null;if(due&&!validDate(due))throw Error('Elegí una fecha válida.');
 const minutes=data.minutes===''||data.minutes==null?null:Number(data.minutes);if(minutes!==null&&(!Number.isInteger(minutes)||minutes<1||minutes>600))throw Error('La duración debe ser un entero entre 1 y 600 minutos.');
 let t=id?s.tasks.find(t=>t.id===id):null;if(id&&!t)throw Error('La tarea ya no está disponible.');
 if(!t){t={id:uid('t'),done:false,completedAt:null,createdAt:new Date().toISOString()};s.tasks.push(t);}
 const description=String(data.description||'').trim();if(description.length>2000)throw Error('La descripción admite hasta 2000 caracteres.');
 Object.assign(t,{name,subject,due,minutes,description,updatedAt:new Date().toISOString()});return t;
}
function toggleTask(s,id){const t=s.tasks.find(t=>t.id===id);if(!t)throw Error('Tarea no disponible.');t.done=!t.done;t.completedAt=t.done?new Date().toISOString():null;t.updatedAt=new Date().toISOString();return t.done;}
function saveExam(s,data,id){
 const name=cleanText(data.name,'Materia',100),title=cleanText(data.title,'Nombre del examen',1024),allDay=data.allDay===true||data.allDay==='on';if(name.includes('@'))throw Error('Asigná una materia; no un correo electrónico.');
 if(!validDate(data.due)||(!allDay&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)))throw Error('Revisá la fecha y la hora.');
 if(!['Parcial','Final','Recuperatorio','Examen','Coloquio'].includes(data.type))throw Error('Elegí Parcial o Final.');
 const timeZone=data.timeZone||'America/Argentina/Buenos_Aires';try{new Intl.DateTimeFormat('es',{timeZone});}catch{throw Error('Zona horaria inválida.');}const duration=Number(data.duration||60);if(!Number.isInteger(duration)||duration<1||duration>525600)throw Error('Duración inválida.');
 const topics=String(data.topics||'').split('\n').map(t=>t.trim()).filter(Boolean);if(topics.length>60||topics.some(t=>t.length>200)||String(data.topics).length>1200)throw Error('Ingresá temas válidos, uno por línea (hasta 1200 caracteres).');
 let e=id?s.exams.find(e=>e.id===id):null;
 if(id&&!e)throw Error('Examen no disponible.');
 const endDate=allDay?(data.endDate||addDays(data.due,e?.allDay?Math.max(1,daysBetween(e.endDate,e.due)):1)):addDays(data.due,1);if(!validDate(endDate)||allDay&&endDate<=data.due)throw Error('El fin debe ser posterior al inicio.');
 if(e){Object.assign(e,{name,title,type:data.type,due:data.due,time:allDay?'':data.time,allDay,typeSource:'manual',subjectSource:'manual',timeZone,duration,endDate});}
 else {e={id:uid('e'),name,title,type:data.type,due:data.due,time:allDay?'':data.time,allDay,typeSource:'manual',subjectSource:'manual',timeZone,duration,endDate,topics,topicIds:topics.map(()=>uid('topic')),preparation:topics.map(()=>'pendiente')};s.exams.push(e);}
 return e;
}
const academicTasks=s=>s.tasks.filter(t=>!t.quarantined);
function filteredTasks(s,filter='todas',sort='cercano'){
 return academicTasks(s).filter(t=>filter==='completadas'?t.done:!t.done).sort((a,b)=>{
 const dates=!a.due&&!b.due?0:!a.due?1:!b.due?-1:(sort==='lejano'?-1:1)*a.due.localeCompare(b.due);
 return sort==='materia'?a.subject.localeCompare(b.subject,'es')||dates||a.name.localeCompare(b.name,'es'):dates||a.name.localeCompare(b.name,'es');});
}
const relativeDue=(due,day)=>{if(!due)return 'Sin fecha';const n=daysBetween(due,day);return n<0?'Vencida':n===0?'Vence hoy':n===1?'Vence mañana':`En ${n} días`;};
const filteredExams=(s,f)=>s.exams.filter(e=>f==='pasados'?e.due<s.today:e.due>=s.today).sort((a,b)=>f==='pasados'?b.due.localeCompare(a.due):a.due.localeCompare(b.due));
function examProgress(e){const prep=e?.preparation||[],total=e?.topics.length||0,reviewed=prep.filter(p=>p==='repasado').length;return {total,reviewed,studying:prep.filter(p=>p==='estudiando').length,pending:total-reviewed,percent:total?Math.round(reviewed/total*100):0};}
function validate(s){
 const fail=()=>{throw Error('El archivo no contiene un respaldo válido de Ritmo.');};
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
 const str=(x,n)=>typeof x==='string'&&x.length<=n;
 const days=x=>Array.isArray(x)&&x.length>0&&x.length<=7&&new Set(x).size===x.length&&x.every(n=>Number.isInteger(n)&&n>=0&&n<=6);
 if(!object(s)||s.schemaVersion!==SCHEMA||!Number.isSafeInteger(s.revision)||s.revision<0||!validDate(s.startedOn)||!validDate(s.today)||!Array.isArray(s.habits)||!Array.isArray(s.tasks)||!Array.isArray(s.exams)||!object(s.history)||!object(s.preferences)||!object(s.ui))fail();
 if(s.habits.length>5000||s.tasks.length>20000||s.exams.length>5000||Object.keys(s.history).length>40000)fail();
 for(const list of [s.habits,s.tasks,s.exams]){if(new Set(list.map(x=>x.id)).size!==list.length)fail();for(const x of list)if(!object(x)||!id(x.id))fail();}
 for(const h of s.habits){if(!str(h.name,80)||!h.name.trim()||!ICONS.includes(h.icon)||!str(h.emoji,64)||!days(h.days)||typeof h.archived!=='boolean'||!validDate(h.createdOn)||h.createdOn<s.startedOn||!Array.isArray(h.versions)||!h.versions.length)fail();let last='';for(const v of h.versions){if(!object(v)||!validDate(v.from)||v.from<h.createdOn||v.from<=last||!days(v.days)||typeof v.active!=='boolean')fail();last=v.from;}}
 const ids=new Set(s.habits.map(h=>h.id));for(const [d,r]of Object.entries(s.history)){if(!validDate(d)||d<s.startedOn||!object(r)||r.date!==d||!object(r.items))fail();for(const [hid,h]of Object.entries(r.items)){if(!ids.has(hid)||!object(h)||!str(h.name,80)||!ICONS.includes(h.icon)||!str(h.emoji,64)||(h.done!==null&&typeof h.done!=='boolean')||typeof h.scheduled!=='boolean')fail();}}
 for(const t of s.tasks)if(!str(t.description,2000)||!str(t.name,100)||!t.name.trim()||!str(t.subject,80)||(t.due!==null&&!validDate(t.due))||(t.minutes!==null&&(!Number.isInteger(t.minutes)||t.minutes<1||t.minutes>600))||typeof t.done!=='boolean'||(t.completedAt!==null&&(typeof t.completedAt!=='string'||!Number.isFinite(Date.parse(t.completedAt)))))fail();
 for(const e of s.exams)if(!str(e.name,100)||!e.name.trim()||!str(e.title,1024)||!e.title.trim()||!['Parcial','Final','Recuperatorio','Examen','Coloquio'].includes(e.type)||!validDate(e.due)||(!e.allDay&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))||!Array.isArray(e.topics)||e.topics.length>60||e.topics.some(t=>!str(t,200)||!t.trim())||!Array.isArray(e.topicIds)||e.topicIds.length!==e.topics.length||new Set(e.topicIds).size!==e.topicIds.length||e.topicIds.some(x=>!id(x))||!Array.isArray(e.preparation)||e.preparation.length!==e.topics.length||e.preparation.some(p=>!['pendiente','estudiando','repasado'].includes(p)))fail();
 for(const e of s.exams){if(typeof e.allDay!=='boolean'||!Number.isInteger(e.duration)||e.duration<1||e.duration>525600||!validDate(e.endDate)||(e.allDay&&e.endDate<=e.due))fail();try{new Intl.DateTimeFormat('es',{timeZone:e.timeZone});}catch{fail();}}
 for(const k of ['motion','sounds','notifications'])if(typeof s.preferences[k]!=='boolean')fail();
 root.RitmoCore.Timer.validate(s);root.RitmoCore.SyncModel.validate(s);
 // UI is restored through allowlists, never interpolated as markup.
 return s;
}

// Migración aditiva de la primera V4.4 local. El store conserva el JSON previo.
function migrate(input){
 const s=clone(input);
 if(s.schemaVersion===1){
   s.schemaVersion=2;s.sessions=[];s.timer=root.RitmoCore.Timer.freshTimer();
   if(Array.isArray(s.tasks))s.tasks.forEach(t=>t.description=t.description||'');
 }
 if(s.schemaVersion===2){s.sync={config:{},links:[],conflicts:[],events:[]};s.schemaVersion=3;}
 if(s.schemaVersion===3)root.RitmoCore.SyncModel.migrate(s);
 return validate(s);
}
function saveTopic(s,examId,name,topicId){
 const e=s.exams.find(e=>e.id===examId);if(!e)throw Error('Examen no disponible.');
 name=cleanText(name,'Tema',200);
 if(topicId){const i=e.topicIds.indexOf(topicId);if(i<0)throw Error('Tema no disponible.');e.topics[i]=name;}
 else {if(e.topics.length>=60)throw Error('Máximo 60 temas por examen.');e.topicIds.push(uid('topic'));e.topics.push(name);e.preparation.push('pendiente');}
}
function deleteTopic(s,examId,topicId){
 const e=s.exams.find(e=>e.id===examId);if(!e)throw Error('Examen no disponible.');
 const i=e.topicIds.indexOf(topicId);if(i<0)throw Error('Tema no disponible.');
 root.RitmoCore.Timer.detach(s,'topic',examId,topicId);
 for(const t of s.tasks)if(t.examId===examId&&t.topicId===topicId){delete t.examId;delete t.topicId;}
 e.topics.splice(i,1);e.topicIds.splice(i,1);e.preparation.splice(i,1);
}
function deleteExam(s,id,remote=false){root.RitmoCore.SyncModel.beforeDelete(s,'exam',id,remote);root.RitmoCore.Timer.detach(s,'topic',id);for(const t of s.tasks)if(t.examId===id){delete t.examId;delete t.topicId;}s.exams=s.exams.filter(e=>e.id!==id);}
function deleteTask(s,id,remote=false){root.RitmoCore.SyncModel.beforeDelete(s,'task',id,remote);root.RitmoCore.Timer.detach(s,'task',id);s.tasks=s.tasks.filter(t=>t.id!==id);}

root.RitmoCore={academicTasks,migrate,saveTopic,deleteTopic,deleteExam,deleteTask,SCHEMA,KEY,BACKUP,clone,iso,date,today,validDate,addDays,weekday,daysBetween,weekDates,uid,ICONS,PAW_COLORS,porcentaje,estadoPatita,createState,isDue,ensureDays,rows,daySnapshot,refreshToday,saveHabit,archiveHabit,deleteHabit,toggleHabit,saveTask,toggleTask,saveExam,filteredTasks,relativeDue,filteredExams,examProgress,validate};
})(globalThis);
