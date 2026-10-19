/* Controles de usuario y coordinación automática. No expone asociaciones técnicas. */
(function(root){
 'use strict';
 function init({get,mutate,modal,escape:E,toast,isDemo,blocked}){
  const C=RitmoCore,M=C.SyncModel,A=RitmoGoogleAuth,api=RitmoGoogleAPI.create(A.request);
  let lists=[],calendars=[],working=false,jobEpoch=0,message='',scheduled=null,lastAttempt=0,failures=0,preparing=false;
  const engine=RitmoSync.create({get,mutate,api,identity:()=>A.status().user,isActive:()=>!isDemo()&&!blocked()&&jobEpoch===A.generation(),permissions:()=>A.status()});
  const g=(a,label,cls='secondary-button',extra='')=>`<button type="button" class="${cls}" data-google="${a}" ${extra}>${label}</button>`;
  function summary(){const s=get(),a=A.status();if(working)return 'Sincronizando…';if(blocked())return 'Error de guardado: revisar Cuenta';if(!navigator.onLine)return 'Pendiente de conexión';if(s.sync.conflicts.length||s.sync.review.some(r=>r.status==='pending'))return 'Hay datos para revisar';if(!a.connected&&message.startsWith('Desconectado'))return message;if(!a.connected)return s.sync.queue.length?'Cambios pendientes · conectá Google':'Google desconectado';if(message.startsWith('Error:'))return message;if(s.sync.queue.length)return 'Cambios pendientes de sincronización';return message||'Actualizado';}
  function refresh(){document.querySelectorAll('[data-sync-status]').forEach(el=>el.textContent=summary());document.querySelectorAll('#panel [data-google="sync"]').forEach(el=>el.disabled=working);}
  const opts=(items,value,label='Elegir…')=>`<option value="">${label}</option>`+items.map(x=>`<option value="${E(x.id)}" ${x.id===value?'selected':''}>${E(x.title||x.summary||x.id.replace(/.*/,'Destino guardado'))}</option>`).join('');
  function open(){
   if(isDemo()){modal('Google','<p>Salí de la demostración para conectar tus datos.</p>');return;}
   const s=get(),a=A.status(),c=s.sync.config,pending=s.sync.review.filter(r=>r.status==='pending'),history=Object.values(s.history).flatMap(r=>Object.values(r.items)).filter(r=>r.source==='legacy-unverified').length;
   modal('Google y sincronización',`<p class="google-simple-status" data-sync-status role="status">${E(summary())}</p><p>${a.connected?E(a.user?.email||'Cuenta Google conectada'):'Tus datos locales siguen disponibles sin Google.'}</p>
    <div class="google-connect-card"><span class="google-mark" aria-hidden="true">G</span><div><strong>Google Tasks</strong><small>Diario y Facultad, por separado</small></div>${g('connect-tasks',a.tasks?'Renovar':'Conectar','secondary-button',!a.ready||working?'disabled':'')}</div>
    <div class="google-connect-card"><span class="google-mark calendar" aria-hidden="true">31</span><div><strong>Google Calendar</strong><small>Parciales, recuperatorios y finales</small></div>${g('connect-calendar',a.calendar?'Renovar':'Conectar','secondary-button',!a.ready||working?'disabled':'')}</div>
    <p class="google-simple-hint">${!a.ready?'Preparando conexión… ':''}Al reabrir la app, Google puede pedir conectar nuevamente. Las ediciones offline se conservan.</p>
    <section class="settings-section">${g('sources','Elegir listas y calendarios')}${g('sync','Sincronizar ahora','primary-button',working?'disabled':'')}${g('disconnect','Desconectar Google','text-button',working?'':'')}</section>
    ${(pending.length||s.sync.conflicts.length)?`<section class="settings-section"><h3>Revisar datos</h3><p>${s.sync.conflicts.length} conflictos · ${pending.length} grupos para revisar.</p>${g('reviews','Revisar y reparar','secondary-button')}</section>`:''}
    ${history?`<section class="settings-section"><h3>Historial anterior</h3><p>${history} marcas antiguas sin procedencia suficiente están conservadas como desconocidas.</p>${g('legacy-history','Revisar marcas anteriores')}</section>`:''}
    <p class="google-simple-hint">La sincronización automática funciona mientras Ritmo está abierto y la autorización sigue vigente. Los borrados en Google requieren confirmación adicional.</p>
    ${new URLSearchParams(location.search).get('dev')==='1'?g('diagnostics','Descargar diagnóstico técnico','text-button'):''}`);
   document.querySelector('#panel').dataset.googlePanel='main';
   if(!a.ready&&!preparing&&navigator.onLine){preparing=true;A.prepare().then(()=>{if(document.querySelector('#panel').dataset.googlePanel==='main')open();}).catch(e=>{message=e.message;refresh();}).finally(()=>preparing=false);}
  }
  async function destinations(){const a=A.status();if(!a.connected)throw Error('Conectá Google para consultar tus fuentes.');if(a.tasks)lists=await api.taskLists();if(a.calendar)calendars=await api.calendars();}
  function sources(){
   const c=get().sync.config,unique=name=>{const found=lists.filter(l=>M.lower(l.title)===name);return found.length===1?found[0].id:'';};
   const diary=c.diaryListId||unique('diario'),faculty=c.facultyListId||unique('facultad');
   const calendarOptions=calendars.length?calendars:c.calendarIds.map(id=>({id,summary:'Calendario guardado'}));
   modal('Fuentes de Google',`<form data-google-form="sources"><p>Confirmá qué origen corresponde a cada sección. Los nombres sólo sugieren; se guardan los identificadores seleccionados.</p><label class="field">Hábitos · lista Diario<select name="diaryListId">${opts(lists,diary)}</select></label><label class="field">Tareas · lista Facultad<select name="facultyListId">${opts(lists,faculty)}</select></label><fieldset><legend>Calendarios con exámenes</legend>${calendarOptions.map(x=>`<label class="setting-row"><span>${E(x.summary)}${['owner','writer'].includes(x.accessRole)?'':' (lectura)'}</span><input type="checkbox" name="calendars" value="${E(x.id)}" ${c.calendarIds.includes(x.id)?'checked':''}></label>`).join('')||'<p>Conectá Calendar para elegir.</p>'}</fieldset><label class="field">Calendario para nuevos exámenes<select name="defaultCalendarId">${opts(calendarOptions.filter(x=>['owner','writer'].includes(x.accessRole)),c.defaultCalendarId,'Sólo local hasta elegir')}</select></label><p class="google-simple-hint">Nuevos hábitos y tareas se enviarán a sus listas. Los exámenes nuevos se enviarán al calendario elegido aquí. Antes de reparar entradas antiguas podés exportar una copia desde Cuenta.</p><label class="setting-row"><span>Activar sincronización automática con estas fuentes</span><input type="checkbox" name="enabled" ${c.enabled?'checked':''}></label><p class="form-error" role="alert"></p><button class="primary-button">Guardar fuentes</button></form>${g('subjects','Configurar materias','text-button')}`);
   document.querySelector('#panel').dataset.googlePanel='sources';
  }
  function subjects(){
   const c=get().sync.config;modal('Materias',`<p>Definí nombres y alias. Ejemplo: Introducción a la Algoritmia · alias: progra 1, algoritmia. El correo nunca se usa como materia.</p><form data-google-form="subject"><label class="field">Materia<input name="name" required maxlength="100"></label><label class="field">Alias separados por coma<input name="aliases" maxlength="500"></label><label class="field">Calendario de esa materia (opcional)<select name="calendarId">${opts(calendars,'','Sólo por alias del título')}</select></label><p class="form-error" role="alert"></p><button class="primary-button">Guardar materia</button></form><ul>${c.subjects.map(x=>`<li>${E(x.name)} · ${E(x.aliases.join(', '))}</li>`).join('')}</ul><p>Los exámenes sin coincidencia quedan como «Materia por asignar» y podés editarla en su tarjeta.</p>`);document.querySelector('#panel').dataset.googlePanel='subjects';
  }
  function reviews(){const s=get();modal('Revisar datos',`<p>Los elementos apartados siguen en el respaldo. Ninguna reparación borra datos de Google.</p>${s.sync.conflicts.map(c=>{const l=s.sync.links.find(l=>l.id===c.linkId),e=l&&(M.entity(s,l)||l.lastLocal);return `<section class="sync-row"><strong>${E(e?.name||e?.title||'Registro')}</strong><p>${E(c.message)}</p>${g('conflict','Revisar conflicto','text-button',`data-id="${E(c.linkId)}"`)}</section>`;}).join('')}${s.sync.review.filter(r=>r.status==='pending').map(r=>`<section class="sync-row"><strong>${E(r.label||'Registros anteriores')}</strong><p>${E(r.message||'')}${r.items?' · '+r.items.length+' ocurrencias':''}</p>${g('review','Revisar','text-button',`data-id="${E(r.id)}"`)}</section>`).join('')||'<p>No hay grupos pendientes.</p>'}`);document.querySelector('#panel').dataset.googlePanel='reviews';}
  function review(id){const r=get().sync.review.find(r=>r.id===id);if(!r)return;
   if(r.kind==='habit-occurrences'){
    modal('Asignar ocurrencias',`<p><strong>${E(r.label)}</strong> · ${r.items.length} registros. El parecido del título es sólo una sugerencia.</p><ul>${r.items.slice(0,20).map(x=>`<li>${E(x.title)} · ${x.status==='completed'?'Completado '+E(M.localDate(x.completed)||'sin fecha'): 'Pendiente · '+E(x.due?.slice(0,10)||'sin fecha')}</li>`).join('')}</ul><form data-google-form="occurrences" data-id="${E(id)}"><label class="field">Pertenecen al hábito<select name="habitId" required><option value="">Elegir…</option>${get().habits.filter(h=>!h.deletedAt).map(h=>`<option value="${E(h.id)}">${E(h.name)}</option>`).join('')}<option value="new">Crear un único hábito con estos registros</option></select></label><p>Se conservarán los IDs de cada ocurrencia y se agregará un marcador a sus notas para reconocerlas. No se completará la próxima ocurrencia al corregir una anterior.</p><p class="form-error" role="alert"></p><button class="primary-button">Confirmar pertenencia e incorporar</button></form>${g('ignore-review','Dejar fuera sin borrar','text-button',`data-id="${E(id)}"`)}`);
   }else if(r.kind==='source')modal('Revisar origen',`<p>${E(r.label)}</p><p>${E(r.message)}</p>${g('keep-task','Confirmar como tarea académica local','primary-button',`data-id="${E(id)}"`)}${g('ignore-review','Conservar apartada','secondary-button',`data-id="${E(id)}"`)}`);
   else modal('Dato conservado para revisión',`<p>${E(r.label)}</p><p>${E(r.message)}</p><p>Revisá el dato en Google. No se publicará una copia mientras no pueda confirmarse la identidad.</p>${g('ignore-review','Ocultar este aviso sin borrar','text-button',`data-id="${E(id)}"`)}`);
   document.querySelector('#panel').dataset.googlePanel='review';
  }
  function conflict(id){const c=get().sync.conflicts.find(c=>c.linkId===id),link=get().sync.links.find(l=>l.id===id);if(!c)return;
   const labels={name:'Nombre',title:'Título',description:'Descripción',done:'Completado',due:'Fecha',date:'Fecha del registro',time:'Hora',allDay:'Todo el día',endDate:'Fecha de fin',duration:'Duración en minutos',timeZone:'Zona horaria'};
   const show=v=>v?Object.entries(v).map(([k,v])=>`${labels[k]||k}: ${v===null?'Sin datos':v===true?'Sí':v===false?'No':v}`).join('\n'):'No disponible';
   modal('Resolver conflicto',`<p>${E(c.message)}</p><h3>Ritmo</h3><pre class="sync-values">${E(show(c.local))}</pre><h3>Google</h3><pre class="sync-values">${E(show(c.remote))}</pre>${c.local&&c.remote?g('resolve-local','Conservar Ritmo y enviarlo a Google','primary-button',`data-id="${E(id)}"`)+g('resolve-remote','Conservar Google en Ritmo','secondary-button',`data-id="${E(id)}"`):''}${c.kind==='remote-deleted'&&link?.domain!=='diary'?g('delete-local','Eliminar también la copia local','text-button danger',`data-id="${E(id)}"`):''}${c.kind==='delete-changed'?g('confirm-delete','Confirmar eliminación actual en Google','text-button danger',`data-id="${E(id)}"`):''}${g('detach','Conservar copia local sin vincular','text-button',`data-id="${E(id)}"`)}`);document.querySelector('#panel').dataset.googlePanel='conflict';
  }
  async function exclusive(fn){if(working||blocked()||isDemo())throw Error('Esperá o revisá el estado del guardado.');if(!navigator.locks)throw Error('La sincronización necesita un navegador compatible con Web Locks.');working=true;jobEpoch=A.generation();refresh();try{return await navigator.locks.request('ritmo-google-sync',{ifAvailable:true},async lock=>{if(!lock)throw Error('Otra pestaña está sincronizando.');return fn();});}finally{working=false;refresh();}}
  async function sync(manual=false){
   if(working||blocked()||isDemo())return;const a=A.status();if(!navigator.onLine||!a.connected){message='Pendiente de conexión: conectá Google para enviar los cambios.';refresh();if(manual)open();return;}
   lastAttempt=Date.now();try{await exclusive(()=>engine.run());failures=0;message='Actualizado';}catch(e){failures++;message='Error: '+e.message;}refresh();if(manual)open();
  }
  function schedule(force=false){clearTimeout(scheduled);if(isDemo()||blocked()||!get().sync.config.enabled){refresh();return;}const wait=Math.max(force?1500:3000,lastAttempt+Math.min(300000,failures?15000*2**Math.min(failures,4):1500)-Date.now());scheduled=setTimeout(()=>sync(false),wait);refresh();}
  async function action(a,id){
   if(a==='open'){open();return;}if(a==='connect-tasks'||a==='connect-calendar'){
    const auth=await A.authorize(root.RitmoGoogleConfig.clientId,a.endsWith('tasks')?'tasks':'calendar');
    mutate(s=>{if(s.sync.config.accountId!==auth.user.sub){s.sync.config.accountId=auth.user.sub;s.sync.config.diaryListId='';s.sync.config.facultyListId='';s.sync.config.calendarIds=[];s.sync.config.defaultCalendarId='';s.sync.config.enabled=false;}});await destinations();if(!get().sync.config.enabled)sources();else{open();schedule(true);}return;
   }
   if(a==='sources'){await exclusive(destinations);sources();return;}
   if(a==='subjects'){subjects();return;}
   if(a==='sync'){await sync(true);return;}
   if(a==='disconnect'){clearTimeout(scheduled);const revoked=await A.disconnect();message=revoked?'Desconectado; los datos y cambios pendientes se conservaron.':'Desconectado localmente; Google no confirmó la revocación. Podés quitar el acceso desde tu cuenta Google.';open();return;}
   if(a==='reviews'){reviews();return;}if(a==='review'){review(id);return;}if(a==='conflict'){conflict(id);return;}
   if(['resolve-local','resolve-remote','detach','delete-local','confirm-delete'].includes(a)){
    await exclusive(()=>engine.resolve(id,a.replace('resolve-','')));reviews();schedule();return;
   }
   if(a==='ignore-review'){mutate(s=>{s.sync.review.find(r=>r.id===id).status='ignored';});reviews();return;}
   if(a==='keep-task'){mutate(s=>{const r=s.sync.review.find(r=>r.id===id),l=s.sync.links.find(l=>l.id===r.linkId),t=l&&s.tasks.find(t=>t.id===l.localId);if(!t)throw Error('No es una tarea académica.');t.quarantined=false;M.detach(s,l.id);r.status='resolved';});reviews();return;}
   if(a==='legacy-history'){const rows=[];for(const [date,r]of Object.entries(get().history))for(const h of Object.values(r.items))if(h.source==='legacy-unverified')rows.push(`${date} · ${h.name}: ${h.legacyDone?'completado':'pendiente'}`);modal('Confirmar historial anterior',`<p>Estas marcas quedaron guardadas, pero la versión anterior no distinguía registros manuales de valores automáticos. Confirmá sólo si reconocés el historial. Las marcas confirmadas pasan a tus estadísticas.</p><pre class="sync-values">${E(rows.join('\n'))}</pre>${g('confirm-history','Confirmo que estas marcas son correctas','primary-button')}`);document.querySelector('#panel').dataset.googlePanel='legacy';return;}
   if(a==='confirm-history'){mutate(s=>{for(const r of Object.values(s.history))for(const h of Object.values(r.items))if(h.source==='legacy-unverified')Object.assign(h,{done:h.legacyDone,source:'legacy-confirmed'});});open();return;}
   if(a==='diagnostics'){const s=get();const blob=new Blob([JSON.stringify({schemaVersion:s.schemaVersion,links:s.sync.links,queue:s.sync.queue,conflicts:s.sync.conflicts},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Ritmo-diagnostico.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-google]');if(!b||isDemo())return;action(b.dataset.google,b.dataset.id).catch(error=>{message='Error: '+error.message;refresh();const panel=document.querySelector('#panel');let el=panel.querySelector('.form-error');if(el)el.textContent=error.message;else{el=document.createElement('p');el.setAttribute('role','alert');el.textContent=error.message;panel.append(el);}});});
  document.addEventListener('submit',e=>{const form=e.target;if(!form.dataset.googleForm)return;e.preventDefault();try{
   if(working||blocked()||isDemo())throw Error('Esperá a que termine la operación actual.');const data=new FormData(form),v=Object.fromEntries(data),a=A.status();
   if(form.dataset.googleForm==='sources'){
    if(!a.connected)throw Error('Conectá Google.');const c=get().sync.config,diary=a.tasks?v.diaryListId:c.diaryListId,faculty=a.tasks?v.facultyListId:c.facultyListId,ids=a.calendar?data.getAll('calendars'):c.calendarIds;
    if(diary&&diary===faculty)throw Error('Diario y Facultad deben ser listas diferentes.');for(const id of [diary,faculty])if(id&&!lists.some(l=>l.id===id)&&id!==c.diaryListId&&id!==c.facultyListId)throw Error('La lista no corresponde a esta cuenta.');
    if(v.defaultCalendarId&&!ids.includes(v.defaultCalendarId))throw Error('Seleccioná también el calendario de destino entre las fuentes.');
    mutate(s=>{Object.assign(s.sync.config,{accountId:a.user.sub,diaryListId:diary,facultyListId:faculty,calendarIds:ids,defaultCalendarId:a.calendar?v.defaultCalendarId:c.defaultCalendarId,enabled:!!v.enabled});});open();schedule(true);
   }else if(form.dataset.googleForm==='occurrences'){mutate(s=>RitmoGoogleDomainSync.reviewHabit(s,form.dataset.id,v.habitId));reviews();schedule(true);}
   else if(form.dataset.googleForm==='subject'){
    if(!v.name.trim()||v.name.includes('@'))throw Error('Ingresá el nombre de la materia, sin correo.');
    mutate(s=>{const rule={id:C.uid('subject'),name:v.name.trim(),aliases:v.aliases.split(',').map(x=>M.lower(x)).filter(Boolean),calendarIds:v.calendarId?[v.calendarId]:[]};const index=s.sync.config.subjects.findIndex(x=>M.lower(x.name)===M.lower(rule.name));if(index>=0)s.sync.config.subjects[index]=rule;else s.sync.config.subjects.push(rule);for(const exam of s.exams)if(exam.subjectSource!=='manual'){const l=s.sync.links.find(l=>l.localKind==='exam'&&l.localId===exam.id);const name=M.subject(s,{summary:exam.title},{id:l?.containerId});exam.name=name;exam.subjectSource=name==='Materia por asignar'?'unassigned':'mapping';}});subjects();
   }
  }catch(error){form.querySelector('.form-error').textContent=error.message;}});
  document.querySelector('#panel').addEventListener('close',()=>delete document.querySelector('#panel').dataset.googlePanel);
  addEventListener('ritmo-state-changed',()=>schedule());addEventListener('online',()=>schedule(true));addEventListener('focus',()=>{if(Date.now()-lastAttempt>30000)schedule();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastAttempt>30000)schedule();});
  setInterval(()=>{if(document.visibilityState==='visible'&&get().sync.config.enabled)schedule();},120000);
  setTimeout(()=>{if(get().sync.config.enabled)schedule();},1000);
  return {open,summary,stop:()=>A.clear()};
 }
 root.RitmoGoogleUI={init};
})(globalThis);
