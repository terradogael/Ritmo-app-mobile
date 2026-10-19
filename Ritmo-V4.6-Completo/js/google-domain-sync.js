/* Descubrimiento y reparación: la cuenta y los IDs seleccionados fijan el dominio. */
(function(root){
 'use strict';const C=root.RitmoCore,M=C.SyncModel;
 const ref=(account,containerId,r)=>({accountId:account,containerId,remoteId:r.id,date});
 function find(s,service,account,containerId,id){return s.sync.links.find(l=>l.service===service&&l.accountId===account&&l.containerId===containerId&&l.remoteId===id&&l.domain!=='unclassified')||s.sync.links.find(l=>l.service===service&&l.accountId===account&&l.containerId===containerId&&l.remoteId===id);}
 function repair(s,account){
  const c=s.sync.config;
  for(const l of s.sync.links.filter(l=>l.accountId===account&&l.domain==='unclassified')){
   const t=l.localKind==='task'?s.tasks.find(t=>t.id===l.localId):null;
   if(l.service==='tasks'&&l.containerId===c.facultyListId&&t){l.domain='faculty';t.quarantined=false;}
   else if(l.service==='tasks'&&l.containerId===c.diaryListId&&t){t.quarantined=true;if(!s.sync.archive.some(a=>a.kind==='contaminated-task'&&a.task.id===t.id))s.sync.archive.push({kind:'contaminated-task',task:C.clone(t),origin:C.clone(l)});}
   else if(l.service==='calendar'&&l.localKind==='exam'&&c.calendarIds.includes(l.containerId)){l.domain='exams';l.needsRebase=true;}
   else M.addReview(s,{key:'source:'+l.id,kind:'source',linkId:l.id,label:M.entity(s,l)?.name||'Registro anterior',message:'Su origen no coincide con las fuentes elegidas. Se conserva fuera de las estadísticas académicas hasta revisarlo.'});
  }
 }
 function bindHabit(s,r,h,account,containerId){
  let l=find(s,'tasks',account,containerId,r.id);const date=M.habitRemote(r,null).date;
  for(const pending of s.sync.links.filter(x=>x.domain==='diary'&&x.localId===h.id&&x.accountId===account&&x.containerId===containerId&&!x.remoteId&&x.phase==='new'&&x.occurrenceDate===date))M.detach(s,pending.id);
  if(h.googleTaskPending){delete h.googleTaskPending;s.sync.review=s.sync.review.filter(x=>x.key!=='legacy-create:'+h.id);}
  if(l&&l.domain==='unclassified'){
   const old=s.tasks.find(t=>t.id===l.localId);if(old){old.quarantined=true;old.repairedToHabit=h.id;}
   Object.assign(l,{domain:'diary',localKind:'habit',localId:h.id,occurrenceDate:date,base:null,phase:'linked',readOnly:false,timeZone:'America/Argentina/Buenos_Aires'});
  }
  if(!l)l=M.makeLink(s,{domain:'diary',localId:h.id,accountId:account,containerId,remoteId:r.id,date});
  if(l.localId!==h.id||!M.active(l))return l;
  const value=M.habitRemote(r,l);l.occurrenceDate=value.date;l.etag=r.etag||null;
  const old=s.history[value.date]?.items[h.id];
  if(old?.source==='manual'&&old.done!==value.done)M.conflict(s,l,'both',value,l.etag,'El registro de Google difiere de tu corrección manual.');
  else {M.apply(s,l,value);l.base=C.clone(value);l.lastLocal=C.clone(h);}
  return l;
 }
 function discover(s,{account,diary=[],faculty=[],calendars=[]}){
  repair(s,account);const c=s.sync.config;let imported=0;
  // Facultad: identidad remota, sin buscar coincidencias de títulos.
  for(const r of faculty){if(r.deleted)continue;const known=find(s,'tasks',account,c.facultyListId,r.id);if(known)continue;
   try{const v=M.taskRemote(r);const marker=String(r.notes||'').match(/\[Ritmo:([a-zA-Z0-9_-]+)\]/)?.[1],pending=marker&&s.sync.links.find(l=>l.marker===marker&&l.accountId===account&&l.containerId===c.facultyListId);if(pending){pending.remoteId=r.id;pending.phase='linked';continue;}
    const t=C.saveTask(s,v);if(v.done)C.toggleTask(s,t.id);const l=M.makeLink(s,{domain:'faculty',localId:t.id,accountId:account,containerId:c.facultyListId,remoteId:r.id,base:v});l.etag=r.etag||null;imported++;
   }catch(e){M.addReview(s,{key:JSON.stringify(['unsupported',account,c.facultyListId,r.id]),kind:'unsupported',label:r.title||'Tarea',message:e.message});}
  }
  const unknown=[];
  for(const r of diary){if(r.deleted)continue;
   const known=find(s,'tasks',account,c.diaryListId,r.id);if(known&&known.domain==='diary')continue;
   if(s.sync.review.some(x=>x.status==='ignored'&&x.accountId===account&&x.containerId===c.diaryListId&&x.items?.some(t=>t.id===r.id)))continue;
   try{M.habitRemote(r,null);}catch(e){M.addReview(s,{key:JSON.stringify(['unsupported',account,c.diaryListId,r.id]),kind:'unsupported',label:r.title||'Hábito',message:e.message});continue;}
   const marker=M.habitMarker(r.notes),h=marker&&s.habits.find(h=>h.id===marker&&!h.deletedAt);
   if(h){const pending=s.sync.links.find(l=>l.domain==='diary'&&l.localId===h.id&&l.accountId===account&&l.containerId===c.diaryListId&&!l.remoteId&&String(r.notes||'').includes(`[Ritmo:${l.marker}]`));if(pending){pending.remoteId=r.id;pending.phase='linked';}else bindHabit(s,r,h,account,c.diaryListId);continue;}
   unknown.push(r);
  }
  const groups=new Map();for(const r of unknown){const key=M.lower(r.title);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  for(const [key,items]of groups){
   const candidates=s.habits.filter(h=>!h.deletedAt&&M.lower(h.name)===key),pending=items.filter(r=>r.status!=='completed');
   // Sólo una tarea pendiente sin ninguna coincidencia local puede ser un alta inequívoca.
   if(pending.length===1&&!candidates.length){const r=pending[0],h=C.saveHabit(s,{name:r.title,icon:'leaf',days:[0,1,2,3,4,5,6]});h.description=M.safeNotes(r.notes);if(s.history[s.today]?.items[h.id])Object.assign(s.history[s.today].items[h.id],{done:null,source:'unknown'});bindHabit(s,r,h,account,c.diaryListId);imported++;items.splice(items.indexOf(r),1);candidates.push(h);}
   if(items.length)M.addReview(s,{key:JSON.stringify(['occurrences',account,c.diaryListId,key]),kind:'habit-occurrences',accountId:account,containerId:c.diaryListId,label:items[0].title,items:C.clone(items),candidates:candidates.map(h=>h.id),message:'Google no identifica la serie. Confirmá a qué hábito pertenecen estas ocurrencias antes de incorporarlas al historial.'});
  }
  for(const {calendar,items}of calendars)for(const r of items){
   if(r.status==='cancelled'||r.eventType&&r.eventType!=='default'||!M.isExam(r.summary))continue;
   const known=find(s,'calendar',account,calendar.id,r.id);if(known)continue;
   const pending=s.sync.links.find(l=>l.domain==='exams'&&l.accountId===account&&l.containerId===calendar.id&&l.marker===r.extendedProperties?.private?.ritmoLink);
   if(pending){pending.remoteId=r.id;pending.phase='linked';continue;}
   try{const v=M.eventRemote(r,{timeZone:calendar.timeZone||c.timeZone}),name=M.subject(s,r,calendar),e=C.saveExam(s,{name,title:v.title,type:M.examType(v.title),due:v.due,time:v.time,allDay:v.allDay,topics:''});Object.assign(e,v,{typeSource:'mapping',subjectSource:name==='Materia por asignar'?'unassigned':'mapping',originalTitle:r.summary,calendarId:calendar.id,recurringEventId:r.recurringEventId||null,originalStartTime:r.originalStartTime||null});
    const l=M.makeLink(s,{domain:'exams',localId:e.id,accountId:account,containerId:calendar.id,remoteId:r.id,timeZone:v.timeZone,readOnly:!['owner','writer'].includes(calendar.accessRole),base:v});l.etag=r.etag||null;imported++;
   }catch(e){M.addReview(s,{key:JSON.stringify(['event',account,calendar.id,r.id]),kind:'unsupported',label:r.summary,message:e.message});}
  }
  C.ensureDays(s);return imported;
 }
 function reviewHabit(s,id,habitId){
  const row=s.sync.review.find(x=>x.id===id&&x.kind==='habit-occurrences');if(!row)throw Error('Revisión no disponible.');
  let h=s.habits.find(h=>h.id===habitId&&!h.deletedAt);
  if(habitId==='new')h=C.saveHabit(s,{name:row.label,icon:'leaf',days:[0,1,2,3,4,5,6]});if(!h)throw Error('Elegí el hábito correspondiente.');
  for(const r of row.items){const l=bindHabit(s,r,h,row.accountId,row.containerId);l.needsTag=true;M.enqueue(s,l);}
  s.sync.review=s.sync.review.filter(x=>x.id!==id);C.ensureDays(s);
 }
 root.RitmoGoogleDomainSync={discover,repair,reviewHabit,isExam:M.isExam};
})(globalThis);
