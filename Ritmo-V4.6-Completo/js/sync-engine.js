/* Un solo motor y una cola durable; ninguna escritura usa la identidad de otra cuenta. */
(function(root){
 'use strict';const C=root.RitmoCore,M=C.SyncModel,D=root.RitmoGoogleDomainSync;
 function create({get,mutate,api,identity,isActive=()=>true,permissions=()=>({tasks:true,calendar:true})}){
  let busy=false;const find=id=>get().sync.links.find(l=>l.id===id);
  const guard=account=>{if(!isActive()||identity()?.sub!==account||get().sync.config.accountId!==account)throw Error('La sesión o la cuenta cambió. Sincronización detenida.');};
  const save=(account,fn)=>{guard(account);mutate(fn);};
  const fail=(account,id,kind,remote=null,etag=null,message='')=>save(account,s=>{const l=s.sync.links.find(l=>l.id===id);if(l&&M.active(l))M.conflict(s,l,kind,remote,etag,message);});
  function ack(account,id,captured,v,r){save(account,s=>{const l=s.sync.links.find(x=>x.id===id);if(!l||!M.active(l))return;l.remoteId=r.id;l.phase='linked';
    if(!M.equal(M.local(s,l),captured)){M.conflict(s,l,'concurrent',v,r.etag,'Cambiaste el elemento mientras se sincronizaba. Se conservó tu edición.');return;}
    M.apply(s,l,v);l.base=C.clone(v);l.etag=r.etag||null;l.lastLocal=C.clone(M.entity(s,l));l.needsRebase=false;l.needsTag=false;
    s.sync.queue=s.sync.queue.filter(q=>q.linkId!==id);s.sync.conflicts=s.sync.conflicts.filter(c=>c.linkId!==id);
  });}
  async function reconcile(id,account,r){
   guard(account);let l=find(id);if(!l||!M.active(l)||l.phase==='tombstone')return;
   if(!r||r.deleted||r.status==='cancelled'){fail(account,id,'remote-deleted',null,null,'Google eliminó o dejó de exponer este registro. Se conservan tus datos locales.');return;}
   let remote,local=M.local(get(),l);if(!local)return;
   try{remote=M.projectRemote(r,l);}catch(e){fail(account,id,'unsupported',null,r.etag,e.message);return;}
   const captured=C.clone(local);
   if(l.domain==='diary'){
    const row=get().history[remote.date]?.items[l.localId];
    const peers=get().sync.links.filter(x=>M.active(x)&&x.domain==='diary'&&x.localId===l.localId&&x.occurrenceDate===remote.date);
    if(row?.source==='manual'&&((peers.length>1&&row.done!==remote.done)||(!M.equal(remote,l.base)&&row.done!==remote.done))){fail(account,id,'both',remote,r.etag,'Google difiere de tu corrección manual. Elegí qué registro conservar.');return;}
   }
   if(l.domain==='diary'&&local.done===null)local={...local,done:l.base?.done??remote.done};
   const merged=M.merge(l.base,local,remote);
   if(!merged.value){fail(account,id,'both',remote,r.etag,'Hay cambios que necesitan tu decisión. Ninguna versión fue reemplazada.');return;}
   const value=merged.value;let result=r;
   if(!M.equal(value,remote)||l.needsTag){
    if(l.readOnly){fail(account,id,'readonly',remote,r.etag,'Este calendario es de solo lectura. Conservá Google o desvinculá para mantener una copia local.');return;}
    try{result=await api.patch(C.clone(l),M.body(value,l,get(),false,r),r.etag);}
    catch(e){if(e.code===412){fail(account,id,'race',remote,r.etag,'Google cambió durante el guardado. Volvé a revisar.');return;}throw e;}
   }
   guard(account);ack(account,id,captured,M.projectRemote(result,l),result);
  }
  async function createRemote(id,account,records){
   let l=find(id);if(!l||!M.active(l)||!M.entity(get(),l))return;
   if(l.readOnly){fail(account,id,'readonly',null,null,'El calendario de destino es de solo lectura. Se conserva el examen local.');return;}
   // Marcadores e ID propio recuperan respuestas perdidas antes de reenviar.
   const matches=records.filter(r=>String(r.notes||'').includes(`[Ritmo:${l.marker}]`)||l.service==='calendar'&&r.extendedProperties?.private?.ritmoLink===l.marker);
   let existing=matches.length===1?matches[0]:null;
   if(matches.length>1){fail(account,id,'uncertain',null,null,'Hay varias respuestas con la misma identidad. Revisá Google.');return;}
   if(!existing&&l.remoteId)existing=await api.get(C.clone(l));guard(account);
   if(existing){save(account,s=>{const x=s.sync.links.find(x=>x.id===id);x.remoteId=existing.id;x.phase='linked';});await reconcile(id,account,existing);return;}
   if(l.phase==='creating'){fail(account,id,'uncertain',null,null,'La creación previa no está confirmada. No se repite automáticamente para evitar duplicados.');return;}
   if(l.domain==='diary'&&get().sync.review.some(r=>r.status==='pending'&&r.kind==='habit-occurrences'&&r.accountId===account&&r.containerId===l.containerId&&r.candidates?.includes(l.localId))){fail(account,id,'review',null,null,'Confirmá primero las ocurrencias de este hábito.');return;}
   let value=M.local(get(),l);if(l.domain==='diary'&&value.done===null)return;
   save(account,s=>{const x=s.sync.links.find(x=>x.id===id);x.phase='creating';M.enqueue(s,x);s.sync.queue.find(q=>q.linkId===id).status='uncertain';if(x.service==='calendar')x.remoteId='r'+C.uid('event').replace(/[^0-9a-f]/g,'');});
   l=C.clone(find(id));let r;
   try{r=await api.insert(l,M.body(value,l,get(),true));}
   catch(e){if(e.code===409&&l.service==='calendar'){r=await api.get(l);if(r?.extendedProperties?.private?.ritmoLink!==l.marker){fail(account,id,'uncertain',null,null,'El ID ya existe y no corresponde a esta operación.');return;}}else{fail(account,id,'uncertain',null,null,'No se confirmó la creación. Se conserva la operación pendiente.');throw e;}}
   guard(account);save(account,s=>{const x=s.sync.links.find(x=>x.id===id);if(x&&M.active(x)){x.remoteId=r.id;x.phase='linked';}});ack(account,id,value,M.projectRemote(r,l),r);
  }
  async function removeRemote(id,account){
   const l=C.clone(find(id)),r=await api.get(l);guard(account);
   if(r&&!r.deleted&&r.status!=='cancelled'){
    if(l.readOnly)throw Error('No se puede eliminar en un calendario de solo lectura.');
    if(l.etag&&r.etag!==l.etag){fail(account,id,'delete-changed',M.projectRemote(r,l),r.etag,'Google cambió desde que pediste eliminar. Revisá antes de confirmar de nuevo.');return;}
    await api.remove(l,r.etag);
   }
   save(account,s=>{const x=s.sync.links.find(x=>x.id===id);x.phase='deleted';s.sync.queue=s.sync.queue.filter(q=>q.linkId!==id);s.sync.conflicts=s.sync.conflicts.filter(c=>c.linkId!==id);});
  }
  async function run(){
   if(busy)throw Error('Ya hay una sincronización en curso.');const account=identity()?.sub;guard(account);const config=get().sync.config;if(!config.enabled)throw Error('Elegí y guardá tus fuentes.');busy=true;
   try{
    const p=permissions(),diary=p.tasks&&config.diaryListId?await api.tasks(config.diaryListId):[],faculty=p.tasks&&config.facultyListId?await api.tasks(config.facultyListId):[],calendars=[];
    if(p.calendar&&config.calendarIds.length){const available=await api.calendars();for(const id of config.calendarIds){const calendar=available.find(x=>x.id===id);if(!calendar)throw Error('Un calendario seleccionado ya no está disponible. Se conservaron los datos.');const start=C.addDays(C.today(),-730),end=C.addDays(C.today(),730),items=await api.events(id,new Date(M.zonedInstant(start,'00:00',config.timeZone)).toISOString(),new Date(M.zonedInstant(end,'00:00',config.timeZone)).toISOString());calendars.push({calendar,items});}}
    guard(account);let imported=0;save(account,s=>{imported=D.discover(s,{account,diary,faculty,calendars});for(const group of calendars)for(const link of s.sync.links.filter(l=>l.service==='calendar'&&l.accountId===account&&l.containerId===group.calendar.id))link.readOnly=!['owner','writer'].includes(group.calendar.accessRole);const before=C.clone(s);M.queueLocal(before,s);});
    const eligible=l=>l.accountId===account&&M.active(l)&&((p.tasks&&l.domain==='diary'&&l.containerId===config.diaryListId)||(p.tasks&&l.domain==='faculty'&&l.containerId===config.facultyListId)||(p.calendar&&l.domain==='exams'&&config.calendarIds.includes(l.containerId)));
    const ids=get().sync.links.filter(eligible).map(l=>l.id);
    for(const id of ids){guard(account);const l=find(id);if(!l||!eligible(l))continue;const records=l.domain==='diary'?diary:l.domain==='faculty'?faculty:calendars.find(g=>g.calendar.id===l.containerId)?.items||[];
     if(l.phase==='tombstone'){await removeRemote(id,account);continue;}
     if(l.phase==='new'||l.phase==='creating'){await createRemote(id,account,records);continue;}
     const r=records.find(r=>r.id===l.remoteId)||await api.get(C.clone(l));await reconcile(id,account,r);
    }
    const report={at:new Date().toISOString(),imported,checked:ids.length};save(account,s=>{s.sync.lastSync=report;C.ensureDays(s);});return report;
   }finally{busy=false;}
  }
  async function resolve(id,choice){
   if(busy)throw Error('Esperá a que termine la sincronización.');const account=identity()?.sub;guard(account);const l=find(id),c=get().sync.conflicts.find(c=>c.linkId===id);if(!l||!c||l.accountId!==account)throw Error('Conectá la cuenta de este registro.');
   if(choice==='detach'){save(account,s=>M.detach(s,id));return;}
   if(choice==='delete-local'&&l.domain==='diary')throw Error('Conservá el historial desvinculando sólo esta ocurrencia.');
   if(choice==='delete-local'){save(account,s=>{s.sync.archive.push({kind:'user-confirmed-removal',entity:C.clone(M.entity(s,l)||l.lastLocal)});if(l.localKind==='task')C.deleteTask(s,l.localId);else if(l.localKind==='exam')C.deleteExam(s,l.localId);else C.deleteHabit(s,l.localId);M.detach(s,id);});return;}
   busy=true;try{const r=await api.get(C.clone(l));guard(account);if(!r||r.deleted||r.status==='cancelled'){fail(account,id,'remote-deleted',null,null,'Google ya no contiene ese elemento.');return;}
    if(choice==='confirm-delete'){if(c.kind!=='delete-changed')throw Error('Revisión de borrado inválida.');if(r.etag!==c.etag)throw Error('Google volvió a cambiar. Sincronizá antes de confirmar.');await api.remove(l,r.etag);save(account,s=>{const x=s.sync.links.find(x=>x.id===id);x.phase='deleted';s.sync.queue=s.sync.queue.filter(q=>q.linkId!==id);s.sync.conflicts=s.sync.conflicts.filter(c=>c.linkId!==id);});return;}
    if(!c.remote||!c.local||!['local','remote'].includes(choice))throw Error('Este caso requiere revisión o desvinculación.');
    const captured=c.localObserved||c.local;
    if(r.etag!==c.etag||!M.equal(M.local(get(),l),captured)){await reconcile(id,account,r);throw Error('Los datos cambiaron. Revisá nuevamente.');}
    if(choice==='local'&&l.readOnly)throw Error('Calendario de solo lectura.');
    const result=choice==='local'?await api.patch(l,M.body(c.local,l,get(),false,r),r.etag):r;
    if(choice==='remote'&&l.domain==='diary')save(account,s=>{const row=s.history[M.projectRemote(result,l).date]?.items[l.localId];if(row&&['manual','legacy-confirmed'].includes(row.source))row.source='google';});
    ack(account,id,captured,M.projectRemote(result,l),result);
   }finally{busy=false;}
  }
  return {run,resolve,isBusy:()=>busy};
 }
 root.RitmoSync={create};
})(globalThis);
