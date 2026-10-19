(() => {
'use strict';
const C=RitmoCore, $=s=>document.querySelector(s), E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<svg class="icon" aria-hidden="true"><use href="#icon-${n}"/></svg>`;
const days=['L','M','M','J','V','S','D'], fullDays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const assets=JSON.parse($('#resources').textContent);
const store=C.createStore({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)});
const loaded=store.load();let state=loaded.state,storageNotice=loaded.error||'',demoMode=false,realState=null;
let route='',habitFilter='activos',taskFilter='todas',examFilter='proximos',period='mes',periodOffset=0,selectedDay=state.today,pendingImport=null,returnFocus=null;
C.ensureDays(state);
let timer={},toastId,undoAction=null,pendingActivity=null,timerError=false;
let taskSort='cercano',activity={kind:'free'},pickerTab='parcial',focusMode=false,changedHabit=null,celebrating=false;

const last={day:'inicio',night:'facultad'};
const routes={inicio:['Inicio','day'],habitos:['Mis hábitos','day'],estadisticas:['Estadísticas','day'],facultad:['Inicio Facultad','night'],tareas:['Mis tareas','night'],parciales:['Parciales y finales','night'],pomodoro:['Pomodoro','night']};
const night=()=>routes[route][1]==='night';
const dateLabel=d=>d?C.date(d).toLocaleDateString('es-AR',{day:'numeric',month:'short'}):'Sin fecha';
let demo='';
function updateStorageNotice(){const el=$('#storage-notice');el.hidden=!storageNotice&&!demoMode;el.innerHTML=demoMode?`<span class="demo-banner">Demostración · datos separados</span>${button('exit-demo','Volver a mis datos')}`:storageNotice?`${E(storageNotice)}${button('account','Revisar')}`:'';}
function captureUI(){state.ui={...state.ui,last:{...last},habitFilter,taskFilter,examFilter,taskSort,period,periodOffset};}
function restoreUI(){const u=state.ui||{};for(const mode of ['day','night'])if(routes[u.last?.[mode]]?.[1]===mode)last[mode]=u.last[mode];habitFilter=['activos','archivados'].includes(u.habitFilter)?u.habitFilter:'activos';taskFilter=['todas','completadas'].includes(u.taskFilter)?u.taskFilter:'todas';examFilter=['proximos','pasados'].includes(u.examFilter)?u.examFilter:'proximos';taskSort=['cercano','lejano','materia'].includes(u.taskSort)?u.taskSort:'cercano';period=['semana','mes','año'].includes(u.period)?u.period:'mes';periodOffset=Number.isInteger(u.periodOffset)&&Math.abs(u.periodOffset)<200?u.periodOffset:0;}
function persistUI(){captureUI();if(demoMode||storageNotice)return;try{const raw=store.raw();store.save(state,false,!!raw&&JSON.parse(raw).schemaVersion!==C.SCHEMA);}catch(e){storageNotice=e.message;updateStorageNotice();}}
function commit(mutator,message,allowUndo=false,fromSync=false){
 C.ensureDays(state);const before=C.clone(state),draft=C.clone(state);try{mutator(draft);if(!fromSync&&!demoMode)C.SyncModel.queueLocal(before,draft);C.validate(draft);}catch(e){state=before;throw e;}state=draft;captureUI();
 if(!demoMode){try{store.save(state);storageNotice='';}catch(e){state=before;storageNotice='No se guardó el cambio. '+e.message;render();throw Error(storageNotice);}}
 render();const undo=allowUndo?()=>{commit(s=>{for(const key of ['habits','history','tasks','exams','timer','sessions','sync'])if(JSON.stringify(draft[key])!==JSON.stringify(before[key])){if(JSON.stringify(s[key])!==JSON.stringify(draft[key]))throw Error('Hubo otros cambios. No se puede deshacer sin perderlos.');s[key]=C.clone(before[key]);}},'Cambio deshecho.');}:null;
 if(message)toast(demoMode?'Cambio aplicado solo a la demostración.':message,undo);else{clearTimeout(toastId);$('#toast').classList.remove('visible');undoAction=null;}if(!fromSync&&!demoMode)window.dispatchEvent(new Event('ritmo-state-changed'));return true;
}
function rollover(){if(C.today()===state.today)return;const before=C.clone(state);C.ensureDays(state);undoAction=null;
 if(!demoMode&&!storageNotice){try{store.save(state);}catch(e){state=before;storageNotice='No se pudo guardar el cambio de día. '+e.message;}}
 // Preserve open edits; update the page behind the dialog only.
 render();if($('#panel').open&&$('#panel').dataset.day)dayDetail($('#panel').dataset.day);
}
function dayDetail(value){
 if(!C.validDate(value))throw Error('Fecha inválida.');selectedDay=value;const r=C.daySnapshot(state,value),list=C.rows(state,value);
 modal(C.date(value).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),`<div class="day-browse">${button('previous-day',icon('chevron-left'),'month-arrow',`aria-label="Día anterior" ${value<=state.startedOn?'disabled':''}`)}<label class="field"><span class="sr-only">Fecha del registro</span><input type="date" data-select-day value="${value}" min="${state.startedOn}" max="${state.today}" aria-label="Fecha del registro"></label>${button('next-day',icon('chevron-right'),'month-arrow',`aria-label="Día siguiente" ${value>=state.today?'disabled':''}`)}</div><div class="day-detail">${paw(r)}<h3>${snapshotLabel(r)}</h3></div><ul class="day-records">${list.map(h=>`<li class="habit"><span class="habit-icon ${E(h.icon)}">${habitVisual(h)}</span><span class="habit-label">${E(h.name)}${h.done===null?'<small class="record-unknown">Sin datos</small>':''}</span>${button('record-toggle',`<span>${h.done?icon('check'):''}</span>`,'habit-check '+(h.done?'checked':''),`data-id="${h.id}" data-value="${value}" aria-label="${E(h.name)}" aria-pressed="${h.done===true}"`)}</li>`).join('')}</ul><p class="demo-note">${value>state.today?'No se pueden completar días futuros.':value<state.startedOn?'No hay registros anteriores al inicio de tu historial.':list.length?'Podés corregir las marcas de esta fecha. Los cambios de rutina se aplican desde el día en que los hacés.':'Este día no tenía hábitos programados.'}</p>${button('day','Volver a hoy','text-button',`data-value="${state.today}"`)}`);
 $('#panel').dataset.day=value;
}
function downloadText(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportData(){tickTimer();downloadText(JSON.stringify(state,null,2),`Ritmo-${demoMode?'DEMO-':''}${C.today()}.json`);toast(demoMode?'Exportaste una copia de la demo.':'Copia exportada. Guardala en un lugar seguro.');}
function previewImport(candidate,recovery=false){candidate=C.migrate(candidate);if(candidate.startedOn>C.today())throw Error('El respaldo comienza en una fecha futura. Revisá el reloj del dispositivo.');pendingImport=C.clone(candidate);modal(recovery?'Recuperar copia anterior':'Importar copia',`<p>${candidate.habits.filter(h=>!h.deletedAt).length} hábitos · ${candidate.tasks.length} tareas · ${candidate.exams.length} exámenes.</p><p>Historial desde ${dateLabel(candidate.startedOn)}. Esta acción reemplazará tus datos actuales en este navegador. Se conservará una copia del estado anterior cuando sea posible.</p>${button('export','Exportar mis datos antes','secondary-button')}${button('confirm-import',recovery?'Recuperar esta copia':'Reemplazar con esta copia','primary-button')}${button('close','Cancelar','text-button full-width')}`);}
function importConfirmed(){if(!pendingImport)return;RitmoGoogleAuth.clear();const next=C.clone(pendingImport);C.ensureDays(next);store.save(next,true);state=next;pendingImport=null;storageNotice='';undoAction=null;timerError=false;syncTimer();restoreUI();$('#panel').close();render();toast('Datos recuperados y guardados.');}
function enterDemo(){RitmoGoogleAuth.clear();realState=C.clone(state);demoMode=true;state=C.makeDemo();timerError=false;syncTimer();undoAction=null;$('#panel').close();restoreUI();render();}
function exitDemo(){demoMode=false;const fresh=store.load();state=fresh.error?(realState||fresh.state):fresh.state;storageNotice=fresh.error||'';realState=null;C.ensureDays(state);timerError=false;syncTimer();undoAction=null;$('#panel').close();restoreUI();render();}

const empty=text=>`<div class="empty-state">${icon('check')}<p>${text}</p></div>`;
function button(action,label,cls='',extra=''){return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;}
function filters(items,value,action,cls='filter-tabs'){return `<div class="${cls}" role="group" aria-label="Filtros">${items.map(([id,label])=>button(action,label,id===value?'is-active':'',`data-value="${id}" aria-pressed="${id===value}"`)).join('')}</div>`;}
function header(){return `<header class="header"><div class="header-row"><div class="brand"><img src="${assets[night()?'logoNight':'logo']}" alt="" width="41" height="41"><span class="brand-name">Ritmo</span></div>${button('account',icon('user'),'notification','aria-label="Abrir Cuenta y preferencias"')}</div><div class="mode-selector" role="group" aria-label="Modo de Ritmo">${[['day','sun','Hábitos'],['night','cap','Facultad']].map(([m,i,l])=>button('mode',icon(i)+`<span>${l}</span>`,'mode '+(routes[route][1]===m?'is-active':''),`data-value="${m}" aria-pressed="${routes[route][1]===m}"`)).join('')}</div></header>`;}
function dock(){const items=night()?[['facultad','home','Inicio'],['tareas','tasks','Tareas'],['parciales','exams','Parciales'],['pomodoro','timer','Pomodoro']]:[['inicio','home','Inicio'],['habitos','habits','Hábitos'],['estadisticas','chart','Estadísticas']];return `<nav class="dock dock-${items.length}" aria-label="Navegación de ${night()?'Facultad':'Hábitos'}">${items.map(([id,i,l])=>button('route',icon(i)+`<span>${l}</span>`,'dock-item '+(id===route?'is-active':''),`data-value="${id}" ${id===route?'aria-current="page"':''}`)).join('')}</nav>`;}
function heading(title,action){return `<div class="detail-heading"><h1 tabindex="-1">${title}</h1>${action?button(action,icon('plus'),'create-button',`aria-label="${action==='habit-form'?'Crear hábito':action==='task-form'?'Crear tarea':'Crear parcial o final'}"`):''}</div>`;}
function shell(content){return `<div class="app ${night()?'faculty-app faculty-detail':'stats-app'}"><div class="room-backdrop ${night()?'night-room':'stats-room'}" aria-hidden="true"><img class="room-image" data-asset="${night()?'night':'day'}" alt="" width="1122" height="1402" decoding="async"></div>${header()}<main class="detail-content">${content}</main>${dock()}</div>`;}
function paw(record){let color=C.PAW_COLORS[record.state]||'#DCC5AE',neutral=['sin-progreso','sin-habitos','futuro','sin-registro','sin-datos','datos-parciales'].includes(record.state);return `<svg class="paw ${record.state}" viewBox="0 0 44 44" aria-hidden="true" style="color:${color}"><g fill="${neutral?'none':'currentColor'}" stroke="currentColor" stroke-width="1.65"><ellipse cx="8.5" cy="18" rx="4.3" ry="5.8" transform="rotate(-24 8.5 18)"/><ellipse cx="17.2" cy="10.5" rx="4.1" ry="6" transform="rotate(-8 17.2 10.5)"/><ellipse cx="27" cy="10.5" rx="4.1" ry="6" transform="rotate(8 27 10.5)"/><ellipse cx="35.5" cy="18" rx="4.3" ry="5.8" transform="rotate(24 35.5 18)"/><path d="M22 21c-4.2 0-5.3 4-8.5 7-3.8 3.5-2.9 9 1.6 9.7 2.6.5 4.4-1.2 6.9-1.2s4.3 1.7 6.9 1.2c4.5-.7 5.4-6.2 1.6-9.7-3.2-3-4.3-7-8.5-7Z"/></g>${record.state==='completo'?'<path d="m17 30 3.3 3.2 6.8-7" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>':''}</svg>`;}
function snapshotLabel(r){return r.state==='futuro'?'Día futuro':r.state==='sin-registro'?'Sin registro':r.unknown?'Registros: '+r.completed+' completos de '+r.total+' conocidos · '+r.unknown+' sin datos':r.total===0?'Sin hábitos programados':`${r.completed} de ${r.total} hábitos · ${Math.round(C.porcentaje(r.completed,r.total))}%`;}
function week(){return `<ol class="week paw-week" aria-label="Progreso semanal">${C.weekDates(state.today).map((day,i)=>{const r=C.daySnapshot(state,day);return `<li>${button('day',paw(r)+`<span aria-hidden="true">${days[i]}</span>`,day===state.today?'is-today':'',`data-value="${day}" aria-label="${fullDays[i]} ${dateLabel(day)}: ${snapshotLabel(r)}" ${day===state.today?'aria-current="date"':''}`)}</li>`;}).join('')}</ol>`;}
function habitVisual(h){return h.emoji?`<span aria-hidden="true">${E(h.emoji)}</span>`:icon(h.icon);}
function habitRows(){return C.rows(state,state.today).map(h=>`<li class="habit ${changedHabit===h.id?'is-updated':''}"><span class="habit-icon ${E(h.icon)}">${habitVisual(h)}</span><span class="habit-label">${E(h.name)}${h.done===null?'<small class="record-unknown">Sin datos</small>':''}</span>${button('habit-toggle',`<span>${h.done?icon('check'):''}</span>`,'habit-check '+(h.done?'checked':''),`data-id="${h.id}" aria-label="${E(h.name)}" aria-pressed="${h.done===true}"`)}</li>`).join('');}

function home(){let hero=$('#hero-'+(night()?'night':'day')).innerHTML.replace('<!--HEADER-->',header());let body;
if(night()){body=facultyHomeContent();}
else {const r=C.daySnapshot(state,state.today),p=C.porcentaje(r.completed,r.total)||0;body=`<section class="progress-card"><div class="progress-top"><h2>Progreso de hoy</h2><span class="progress-number">${r.completed}/${r.total}</span><svg class="progress-ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="ring-track" cx="24" cy="24" r="19"/><circle class="ring-value" cx="24" cy="24" r="19" pathLength="100" style="stroke-dasharray:${p} 100"/></svg></div><div class="progress-track" role="progressbar" aria-label="Hábitos completados hoy" aria-valuemin="0" aria-valuemax="${r.total||1}" aria-valuenow="${r.completed}"><div class="progress-fill" style="width:${p}%"></div></div>${r.unknown?`<p class="demo-note">${r.unknown} hábitos sin registro. El porcentaje usa sólo datos conocidos.</p>`:""}${week()}</section><section class="habits"><div class="section-heading"><h2>Mis hábitos de hoy</h2>${button('route','Ver todos','view-all','data-value="habitos"')}</div><ul class="habit-list">${habitRows()||'<li>'+empty('Hoy no tenés hábitos programados.')+'</li>'}</ul></section>`;}
if(!night()&&C.daySnapshot(state,state.today).state==='completo')hero=hero.replace('Un pequeño paso<br>también es progreso.','¡Un día completo!<br>Un paso más, juntos.');
return `<div data-atom-state="${night()?'estudiando':C.daySnapshot(state,state.today).state==='completo'?'feliz':'relajado'}" class="app ${night()?'faculty-app':''} ${changedHabit?'has-update':''} ${celebrating?'is-celebrating':''}">${hero}<main class="content ${night()?'faculty-content':''}">${body}${demo}</main>${dock()}</div>`;}
function habits(){const archived=habitFilter==='archivados',list=state.habits.filter(h=>!h.deletedAt&&h.archived===archived);return shell(heading('Mis hábitos','habit-form')+`<p class="page-intro">Un lugar para darle forma a tu rutina.</p>`+filters([['activos',`Activos · ${state.habits.filter(h=>!h.deletedAt&&!h.archived).length}`],['archivados','Archivados']],habitFilter,'habit-filter')+`<div class="management-list">${list.map(h=>({...h,...C.metrics(state,h.id)})).map(h=>`<article class="management-card"><div class="management-top"><span class="habit-icon ${E(h.icon)}">${habitVisual(h)}</span><div><h2>${E(h.name)}</h2><p>${h.days.length===7?'Todos los días':h.days.length+' días por semana'}${archived?' · Archivado':''}</p></div>${button('habit-form',icon('edit'),'icon-button',`data-id="${h.id}" aria-label="Editar ${E(h.name)}"`)}</div><div class="schedule" aria-label="Días programados">${days.map((d,i)=>`<span class="${h.days.includes(i)?'scheduled':''}" aria-label="${fullDays[i]}: ${h.days.includes(i)?'programado':'libre'}">${d}</span>`).join('')}</div><div class="habit-metrics"><span><strong>${h.total?h.rate+'%':'—'}</strong> cumplimiento</span><span>${icon('bolt')} <strong>${h.current}</strong> días de racha</span></div><div class="mini-track" aria-hidden="true"><span style="width:${h.rate}%"></span></div><div class="card-actions">${!archived&&C.rows(state,state.today).some(r=>r.id===h.id)?button('habit-toggle',`<span>${C.rows(state,state.today).find(r=>r.id===h.id).done?icon('check'):''}</span>`,'habit-check '+(C.rows(state,state.today).find(r=>r.id===h.id).done?'checked':''),`data-id="${h.id}" aria-label="${E(h.name)}" aria-pressed="${C.rows(state,state.today).find(r=>r.id===h.id).done===true}"`):''}${button('habit-archive',archived?'Restaurar':'Archivar','text-button',`data-id="${h.id}"`)}${button('habit-delete','Eliminar','text-button danger',`data-id="${h.id}"`)}</div></article>`).join('')||empty('No hay hábitos en esta lista.')}</div><p class="demo-note">Rachas por días programados verificados. Los días desconocidos no prolongan la racha. Hoy pendiente no corta la racha hasta terminar el día.</p>${demo}`);}
function heatCell(day){const r=C.daySnapshot(state,day),neutral=['futuro','sin-registro','sin-habitos','sin-datos','datos-parciales'].includes(r.state);return `<li>${button('day',String(C.date(day).getDate()),'heat-day '+(neutral?'future':r.state==='completo'?'complete':''),`data-value="${day}" style="--heat-color:${neutral?'#f6ebda':C.PAW_COLORS[r.state]}" aria-label="${dateLabel(day)}: ${snapshotLabel(r)}"`)}</li>`;}
function stats(){let cursor=C.date(state.today),title,chart;
if(period==='mes'){cursor.setDate(1);cursor.setMonth(cursor.getMonth()+periodOffset);const start=C.iso(cursor),length=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();title=cursor.toLocaleDateString('es-AR',{month:'long',year:'numeric'});chart=`<div class="calendar-labels" aria-hidden="true">${days.map(d=>`<span>${d}</span>`).join('')}</div><ol class="heatmap">${'<li aria-hidden="true"></li>'.repeat(C.weekday(start))}${Array.from({length},(_,i)=>heatCell(C.addDays(start,i))).join('')}</ol>`;}
else if(period==='semana'){const start=C.weekDates(C.addDays(state.today,periodOffset*7))[0];title=`${dateLabel(start)} – ${dateLabel(C.addDays(start,6))}`;chart=`<div class="week-chart">${Array.from({length:7},(_,i)=>{const d=C.addDays(start,i),r=C.daySnapshot(state,d),p=C.porcentaje(r.completed,r.total);return button('day',`<span class="week-bar"><i style="height:${p||0}%;background:${C.PAW_COLORS[r.state]||'#DCC5AE'}"></i></span><span>${days[i]}</span>`,'week-column',`data-value="${d}" aria-label="${dateLabel(d)}: ${snapshotLabel(r)}"`);}).join('')}</div>`;}
else{const year=cursor.getFullYear()+periodOffset;title=String(year);chart=`<div class="year-chart">${Array.from({length:12},(_,i)=>{const list=Object.keys(state.history).filter(d=>d.startsWith(`${year}-${String(i+1).padStart(2,'0')}`)&&d<=state.today).map(d=>C.daySnapshot(state,d));const total=list.reduce((a,r)=>a+r.total,0),done=list.reduce((a,r)=>a+r.completed,0);return `<div><span>${new Date(year,i,1).toLocaleDateString('es-AR',{month:'short'})}</span><strong>${total?Math.round(done/total*100)+'%':'—'}</strong></div>`;}).join('')}</div>`;}
const lifetime=C.metrics(state),start=period==='mes'?C.iso(cursor):period==='semana'?C.weekDates(C.addDays(state.today,periodOffset*7))[0]:`${cursor.getFullYear()+periodOffset}-01-01`;
const end=period==='mes'?C.iso(new Date(cursor.getFullYear(),cursor.getMonth()+1,0)):period==='semana'?C.addDays(start,6):`${cursor.getFullYear()+periodOffset}-12-31`;
const totals=C.metrics(state,null,start,end),ranked=state.habits.filter(h=>!h.deletedAt&&!h.archived).map(h=>({...h,...C.metrics(state,h.id,start,end)})).filter(h=>h.total).sort((a,b)=>b.rate-a.rate).slice(0,4);
return shell(heading('Estadísticas')+`<section class="month-panel">${filters([['semana','Semana'],['mes','Mes'],['año','Año']],period,'period','period-selector')}<div class="month-heading">${button('period-step',icon('chevron-left'),'month-arrow','data-value="-1" aria-label="Período anterior"')}<h2>${title}</h2>${button('period-step',icon('chevron-right'),'month-arrow','data-value="1" aria-label="Período siguiente"')}</div>${chart}<p class="chart-caption">${period==='año'?'Cumplimiento por mes':'Cada día conserva su propio registro'}</p></section><section class="streaks" aria-label="Tus rachas">
        <article class="streak-card"><svg class="streak-art" viewBox="0 0 40 44" aria-hidden="true"><path d="M22 1c3 10-5 12-3 20 4-2 5-6 6-9 8 8 13 16 8 24-4 7-19 9-25 1-7-9 0-18 3-23-1 9 3 11 5 9-3-12 5-15 6-22Z" fill="#f18a50"/><path d="M22 21c0 7-7 8-6 14 3-1 4-3 5-6 6 6 6 11-1 13-9-1-9-8-5-14-1 5 1 6 2 5-1-6 3-8 5-12Z" fill="#ffcc79"/></svg><div><h2 class="streak-label">Racha actual</h2><p class="streak-value">${lifetime.current} días</p></div></article>
        <article class="streak-card"><svg class="streak-art" viewBox="0 0 44 44" aria-hidden="true"><path d="m6 15 9 7 7-13 7 13 9-7-4 19H10L6 15Z" fill="#f6ab47" stroke="#fff4d3" stroke-width="1.5"/><path d="M11 38h22M11 31h22" stroke="#df8b2d" stroke-width="2" stroke-linecap="round"/><g fill="#f6ab47" stroke="#fff4d3"><circle cx="5" cy="12" r="3"/><circle cx="22" cy="6" r="3"/><circle cx="39" cy="12" r="3"/></g><path d="m22 22 3 4-3 4-3-4Z" fill="#fff0cb"/></svg><div><h2 class="streak-label">Mejor racha</h2><p class="streak-value">${lifetime.best} días</p></div></article>
      </section><section class="consistency"><h2>Hábitos más constantes</h2><ul class="consistency-list">${ranked.map(h=>`<li class="consistency-row"><span class="habit-icon ${E(h.icon)}">${habitVisual(h)}</span><span class="consistency-name">${E(h.name)}</span><span class="consistency-track"><span class="consistency-fill" style="--rate:${h.rate}%"></span></span><span class="consistency-rate">${h.rate}%</span></li>`).join('')}</ul>${ranked.length?'':'<p class="page-intro">Todavía no hay hábitos registrados en este período.</p>'}</section><aside class="insight-card"><span class="insight-kicker">UNA MIRADA A TU CONSTANCIA</span><p>${totals.completed} de ${totals.total} registros conocidos completos · ${totals.unknown} sin datos.</p><span>${totals.total?totals.rate+'% de cumplimiento entre los registros conocidos del período.':'Todavía no hay registros en este período.'}</span></aside><section class="achievements"><h2>Mis logros</h2><p class="page-intro">Pequeños pasos que merecen celebrarse.</p><div class="medals">${[['trophy','Siete días programados completos'],['bolt','Diez días de constancia'],['calendar','Treinta días de actividad'],['sun','Día perfecto']].map(([i,t],n)=>`<article><span class="medal">${icon(i)}</span><h3>${t}</h3><small>${[lifetime.best>=7,lifetime.best>=10,lifetime.activeDays>=30,lifetime.perfectDays>=1][n]?'Conseguido':'Por alcanzar'}</small></article>`).join('')}</div></section><p class="demo-note">Rachas generales: días programados con todos los hábitos completos. Los días libres no cuentan ni cortan la racha. Los registros desconocidos no se consideran incumplimientos ni prolongan rachas. Las rachas abarcan todo el historial; el porcentaje corresponde al período elegido.</p>${demo}`);}
function clock(){return $('#clock-template').innerHTML;}
function render(focus=false){syncTimer();demo=demoMode?'<p class="demo-note">Modo demostración · los ejemplos no se guardan en tus datos.</p>':'';updateStorageNotice();closeSortMenu();const previous=document.activeElement?.dataset;document.body.classList.toggle('faculty-page',night());document.body.classList.toggle('reduce-motion',!state.preferences.motion);$('#app-root').innerHTML=route==='inicio'||route==='facultad'?home():({habitos:habits,tareas:tasks,estadisticas:stats,parciales:exams,pomodoro}[route])();document.querySelectorAll('[data-asset]').forEach(el=>el.src=assets[el.dataset.asset]);document.title=`Ritmo · ${routes[route][0]} · V4.6`;$('meta[name="theme-color"]').setAttribute('content',night()?'#080f1c':'#fcf3e5');updateClock();updateFocusMode();changedHabit=null;celebrating=false;$('#app-root').classList.toggle('view-enter',focus);if(!focus&&previous?.action){const control=[...document.querySelectorAll('[data-action]')].find(el=>el.dataset.action===previous.action&&el.dataset.value===previous.value&&el.dataset.id===previous.id);control?.focus({preventScroll:true});}if(focus){window.scrollTo({top:0,behavior:'instant'});const h=$('main h1')||$('.greeting h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}}
function navigate(next){if(!Object.hasOwn(routes,next))next='inicio';if(location.hash.slice(1)===next){route=next;render(true);}else location.hash=next;}
function onRoute(){route=Object.hasOwn(routes,location.hash.slice(1))?location.hash.slice(1):'inicio';last[routes[route][1]]=route;persistUI();if($('#panel').open)$('#panel').close();render(true);}
function toast(message,undo=null){
  undoAction=undo;$('#toast').innerHTML=`<span>${E(message)}</span>${undo?button('undo','Deshacer','undo-button'):''}`;
  $('#toast').classList.add('visible');clearTimeout(toastId);
  toastId=setTimeout(()=>{if($('#toast').contains(document.activeElement))return;$('#toast').classList.remove('visible');undoAction=null;},undo?8000:3800);
}

function modal(title,body,academic=false){const el=$('#panel');if(!el.open){const a=document.activeElement;returnFocus=a?.dataset?.action?{action:a.dataset.action,id:a.dataset.id,value:a.dataset.value}:null;}el.classList.toggle('academic-panel',academic);el.innerHTML=`<div class="panel-heading"><h2 id="panel-title">${title}</h2>${button('close','×','close-button','aria-label="Cerrar panel"')}</div>${body}`;if(!el.open)el.showModal();}
function field(label,name,value='',type='text',extra=''){return `<label class="field">${label}<input name="${name}" type="${type}" value="${E(value)}" ${extra}></label>`;}
function formFooter(){return '<p class="form-error" role="alert"></p><button class="primary-button" type="submit">Guardar</button>'+demo;}
function habitForm(id){const h=state.habits.find(x=>x.id===id)||{name:'',icon:'book',days:[0,1,2,3,4,5,6]};modal(id?'Editar hábito':'Nuevo hábito',`<form data-form="habit" data-id="${id||''}">${field('Nombre','name',h.name,'text','required maxlength="80" autofocus')}${field('Emoji (opcional)','emoji',h.emoji||'','text','maxlength="32" placeholder="Ej.: 🏐"')}<p class="demo-note">Si elegís un emoji, se mostrará en lugar del icono.</p><label class="field">Icono<select name="icon">${[['book','Lectura'],['gym','Ejercicio'],['leaf','Bienestar'],['water','Agua'],['steps','Caminar'],['bolt','Energía'],['edit','Escritura']].map(([v,l])=>`<option value="${v}" ${h.icon===v?'selected':''}>${l}</option>`).join('')}</select></label><fieldset><legend>Días de la semana</legend><div class="day-options">${days.map((d,i)=>`<label><input name="days" type="checkbox" value="${i}" ${h.days.includes(i)?'checked':''}><span aria-label="${fullDays[i]}">${d}</span></label>`).join('')}</div></fieldset>${formFooter()}</form>`);}
function taskForm(id){const t=state.tasks.find(x=>x.id===id)||{name:'',subject:'',due:state.today,minutes:45};modal(id?'Editar tarea':'Nueva tarea',`<form data-form="task" data-id="${id||''}">${field('Tarea','name',t.name,'text','required maxlength="100" autofocus')}${field('Materia (opcional)','subject',t.subject,'text','maxlength="80"')}<label class="field">Descripción (opcional)<textarea name="description" rows="3" maxlength="2000">${E(t.description||'')}</textarea></label>${field('Fecha de entrega (opcional)','due',t.due||'','date')}${field('Duración estimada (minutos)','minutes',t.minutes||'','number','min="1" max="600" step="1"')}${formFooter()}${id?button('task-delete','Eliminar tarea','text-button danger full-width',`data-id="${id}"`):''}</form>`);}
function examForm(id){const e=state.exams.find(e=>e.id===id)||{name:'',title:'',type:'Parcial',due:C.addDays(state.today,7),time:'10:00',duration:60,timeZone:'America/Argentina/Buenos_Aires'};
modal(id?'Editar examen':'Nuevo examen',`<form data-form="exam" data-id="${id||''}">${field('Materia','name',e.name,'text','required maxlength="100" autofocus')}${field('Nombre del examen','title',e.title,'text','required maxlength="1024"')}<label class="field">Tipo<select name="type">${['Parcial','Recuperatorio','Final','Examen','Coloquio'].map(t=>`<option ${e.type===t?'selected':''}>${t}</option>`).join('')}</select></label>${field('Fecha','due',e.due,'date','required')}<label class="setting-row"><span>Todo el día</span><input type="checkbox" name="allDay" ${e.allDay?'checked':''}></label>${field('Hora (para eventos con horario)','time',e.time||'','time')}${field('Duración (minutos, si tiene horario)','duration',e.duration||60,'number','min="1" max="525600"')}${field('Zona horaria','timeZone',e.timeZone||'America/Argentina/Buenos_Aires','text','required')}${e.allDay?field('Fin exclusivo del evento de día completo','endDate',e.endDate||C.addDays(e.due,1),'date'):''}${id?'<p class="demo-note">Los temas se gestionan desde la tarjeta del examen.</p>':'<label class="field">Temas (opcional, uno por línea)<textarea name="topics" rows="4" maxlength="1200"></textarea></label>'}${formFooter()}</form>`);}
function topicForm(id,topicId){const e=state.exams.find(e=>e.id===id);if(!e)throw Error('Examen no disponible.');const i=e.topicIds.indexOf(topicId);modal(topicId?'Editar tema':'Agregar tema',`<form data-form="topic" data-id="${id}" data-topic-id="${topicId||''}">${field('Tema','name',i<0?'':e.topics[i],'text','required maxlength="200" autofocus')}${formFooter()}</form>`);}

function account(){modal('Cuenta',`<div class="account-identity"><span class="avatar">GT</span><div><h3>Gael Terrado</h3><p>Tu espacio con Atom</p></div></div><section class="settings-section"><h3>Datos personales</h3><p>${demoMode?'Estás explorando ejemplos separados de tus datos.':storageNotice?'El guardado necesita atención.':'Guardado local en este navegador.'}</p><p>${demoMode?'Los cambios de la demo se descartan al salir.':'Exportá una copia para trasladar tus datos a otro dispositivo o dirección web.'}</p>${button('export','Exportar copia JSON','secondary-button')}${demoMode?'':button('import','Importar copia JSON','secondary-button')}${!demoMode&&store.migrationBackup()?button('export-migration','Exportar copia previa a V4.6','secondary-button'):''}${demoMode?'':button('recover','Recuperar copia anterior','text-button')}${storageNotice&&!demoMode?button('export-raw','Descargar datos originales','text-button')+button('reload','Recargar datos guardados','text-button'):''}</section><section class="settings-section"><h3>Cuenta de Google</h3>${demoMode?'<p>Disponible fuera de la demostración.</p>':`<p data-sync-status>${E(googleUI.summary())}</p><button type="button" class="secondary-button" data-google="open">Conectar y sincronizar</button>`}</section><section class="settings-section"><h3>Preferencias</h3><label class="setting-row">Animaciones suaves<input type="checkbox" data-pref="motion" ${state.preferences.motion?'checked':''}></label><label class="setting-row">Sonidos de enfoque <small>(pendientes)</small><input type="checkbox" disabled></label><label class="setting-row">Recordatorios <small>(pendientes)</small><input type="checkbox" disabled></label></section><section class="settings-section"><h3>Demostración</h3>${button(demoMode?'exit-demo':'enter-demo',demoMode?'Volver a mis datos':'Explorar datos de ejemplo','secondary-button')}${demoMode?button('reset-demo','Restablecer ejemplos','text-button'):''}</section><section class="settings-section"><h3>Aplicación</h3><p id="pwa-status">${E(RitmoPWA.status().message)}</p>${button('pwa-check','Buscar actualizaciones','secondary-button')}${button('pwa-update','Actualizar y recargar','text-button',RitmoPWA.status().waiting?'':'disabled')}</section><section class="settings-section"><h3>Acerca de Ritmo</h3><p>Hábitos pequeños. Grandes posibilidades.</p><p>Mobile V4.6 · Funcionalidad local</p><p>Pomodoro 45/15, Google opcional y caché local. Las conexiones reales y la instalación móvil deben validarse en tu dispositivo.</p></section>`);}

function syncTimer(){
 const t=state.timer;activity={...t.activity};
 if(activity.kind==='topic')activity.index=state.exams.find(e=>e.id===activity.id)?.topicIds.indexOf(activity.topicId)??-1;
 timer={remaining:C.Timer.remaining(t),running:t.status==='running',sessions:C.studyStats(state,state.today).count,phase:t.phase};
}
function updateClock(){
 syncTimer();const sec=timer.remaining,str=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
 document.querySelectorAll('.clock-value').forEach(el=>{el.textContent=str;el.setAttribute('aria-label',`${Math.floor(sec/60)} minutos y ${sec%60} segundos`);});
 document.querySelectorAll('.clock-label').forEach(el=>el.textContent=timer.phase==='break'?'Descanso':'Enfoque');
 document.querySelectorAll('.clock-accent').forEach(el=>el.style.strokeDasharray=`${sec/C.Timer.durations[timer.phase]*100} 100`);
 document.querySelectorAll('[data-action="timer-toggle"]').forEach(el=>{el.innerHTML=icon(timer.running?'pause':'play');el.setAttribute('aria-label',timer.running?'Pausar temporizador':'Iniciar o reanudar temporizador');});
}
function toggleTimer(){
 if(state.timer.status==='awaiting'){sessionDecision();return;}
 commit(s=>C.Timer.toggle(s),null);timerError=false;focusMode=timer.running;updateFocusMode();
 if(state.timer.status==='awaiting')sessionDecision();
}
function resetTimer(){commit(s=>s.timer=C.Timer.freshTimer(s.timer.activity),null);timerError=false;focusMode=false;$('#panel').close();render();}
function tickTimer(){
 if(timerError||storageNotice&&!demoMode)return;
 if(state.timer.status==='running'&&C.Timer.remaining(state.timer)===0){
   try {commit(s=>{C.Timer.settle(s);},null);focusMode=false;updateFocusMode();if(!$('#panel').open)sessionDecision();}
   catch(e){timerError=true;toast(e.message);}
 }
 updateClock();
}
function sessionDecision(){
 const pending=state.timer.pending;if(!pending)return;
 if(pending.phase==='break'){
   modal('Descanso terminado',`<p>¿Listo para otro bloque de 45 minutos?</p>${button('start-focus','Iniciar enfoque','primary-button')}${button('leave-session','Dejar por ahora','secondary-button')}`,true);return;
 }
 const a=pending.activity,canComplete=a.kind==='task'||a.kind==='topic';
 modal('Sesión completada',`<div class="session-celebration">${icon('check')}<p>45 minutos de concentración registrados.</p></div><h3>${E(a.label)}</h3><p>${a.kind==='task'?'¿Querés marcar esta tarea como completada?':a.kind==='topic'?'¿Querés marcar este tema como repasado?':'Podés descansar antes de continuar.'}</p>${canComplete?button('complete-activity',a.kind==='task'?'Sí, completar tarea':'Sí, marcar repasado','primary-button'):''}${button('start-break',canComplete?'No, continuar tras un descanso':'Iniciar descanso de 15 minutos','secondary-button')}${button('leave-session','Dejar por ahora','text-button full-width')}`,true);
}

function rerenderKeepFocus(el){const action=el.dataset.action,id=el.dataset.id;render();if(action&&id)document.querySelector(`[data-action="${action}"][data-id="${id}"]`)?.focus({preventScroll:true});}
// V4.3 · Entregas y preparación son dos progresos independientes.
function taskRow(t,manage=false){
  const relative=t.done?'Completada':C.relativeDue(t.due,state.today);
  return `<li class="academic-task ${t.done?'completed':''}">
    ${button('task-toggle',`<span class="task-status ${t.done?'is-done':''}">${t.done?icon('check'):''}</span>`,'task-toggle',`data-id="${t.id}" aria-label="${E(t.name)}" aria-pressed="${t.done}"`)}
    <span class="task-copy"><span class="task-title">${E(t.name)}</span>${manage&&t.description?`<span class="task-meta task-description">${E(t.description)}</span>`:''}
      <span class="task-meta">${E(t.subject||'Sin materia')}${t.minutes?` · Est. ${t.minutes} min`:''}</span>
      ${manage?`<span class="task-due"><time ${t.due?`datetime="${t.due}"`:''}>${dateLabel(t.due)}</time><span class="status-label ${!t.done&&t.due&&t.due<state.today?'overdue':''}">${relative}</span></span>`:''}
    </span>${manage?button('task-form',icon('edit'),'icon-button',`data-id="${t.id}" aria-label="Editar ${E(t.name)}"`):''}</li>`;
}
function tasks(){
  const list=C.filteredTasks(state,taskFilter,taskSort),groups=[...new Set(list.map(t=>t.subject))];
  const rows=taskSort==='materia'?groups.map(subject=>`<section class="subject-group"><h2>${E(subject||'Sin materia')}</h2><ul class="academic-list">${list.filter(t=>t.subject===subject).map(t=>taskRow(t,true)).join('')}</ul></section>`).join(''):`<ul class="academic-list chronological-list">${list.map(t=>taskRow(t,true)).join('')}</ul>`;
  return shell(heading('Mis tareas','task-form')+`<div class="task-summary"><div><strong>${C.academicTasks(state).filter(t=>!t.done).length}</strong><span>Pendientes</span></div><div><strong>${C.academicTasks(state).filter(t=>t.done).length}</strong><span>Completadas</span></div></div>`+
    filters([['todas','Todas'],['completadas','Completadas']],taskFilter,'task-filter')+
    sortControl()+ 
    (list.length?rows:empty('No hay tareas para este filtro.'))+demo);
}
function academicStatus(){
  const total=C.academicTasks(state).length,done=C.academicTasks(state).filter(t=>t.done).length,pct=total?Math.round(done/total*100):0;
  return `<section class="academic-status" aria-labelledby="academic-status-title"><div class="academic-eyebrow"><h2 id="academic-status-title">ESTADO ACADÉMICO</h2>${icon('cap')}</div><div class="academic-total"><strong>${total-done}</strong><span>entregas pendientes</span></div><div class="academic-bar" role="progressbar" aria-label="Cumplimiento de tareas registradas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div><div class="academic-progress-copy"><span>${done} de ${total} tareas completadas</span><strong>${pct}%</strong></div><p>Todas tus tareas registradas</p></section>`;
}
function planExam(){return C.filteredExams(state,'proximos')[0]||null;}
function planCard(){const exam=planExam();if(!exam)return `<section class="study-plan"><div class="focus-card-heading"><h2>Mi plan de estudio</h2></div>${empty('Todavía no tenés parciales próximos.')}${button('exam-form','Agregar parcial o final','text-button')}</section>`;
const p=C.examProgress(exam),index=exam.preparation.findIndex(s=>s!=='repasado');return `<section class="study-plan" aria-labelledby="plan-title"><div class="focus-card-heading"><h2 id="plan-title">Mi plan de estudio</h2><span class="example-pill">Próximo examen</span></div><div class="plan-exam"><strong>${E(exam.title)} · ${E(exam.name)}</strong><span>${dateLabel(exam.due)} · ${p.pending} temas por repasar</span></div><div class="plan-next"><span>${index<0?'PREPARACIÓN':'POR REPASAR'}</span><strong>${index<0?'Todos los temas repasados':E(exam.topics[index])}</strong></div><div class="plan-progress"><span>${p.reviewed}/${p.total} repasados</span><div class="mini-track"><span style="width:${p.percent}%"></span></div></div><div class="plan-actions">${index<0?'':button('study-topic',icon('timer')+'Estudiar con Pomodoro','text-button',`data-id="${exam.id}" data-value="${index}"`)}${button('plan-details','Ver plan','text-button',`data-id="${exam.id}"`)}</div></section>`;}

function facultyHomeContent(){
  const list=C.academicTasks(state).filter(t=>t.due===state.today).slice(0,3);
  return academicStatus()+planCard()+`<section class="today-preview"><div class="section-heading"><h2>Tareas de hoy</h2>${button('route','Ver todas','view-all','data-value="tareas"')}</div><ul class="academic-list">${list.map(t=>taskRow(t)).join('')||'<li>'+empty('Hoy no hay entregas programadas.')+'</li>'}</ul></section><div class="agenda-access">${button('agenda',icon('calendar')+'Agenda semanal'+icon('chevron-right'),'agenda-button')}</div>`;
}
const topicLabels={pendiente:'Pendiente',estudiando:'Estudiando',repasado:'Repasado'};
function topicBadge(status){return `<span class="topic-badge ${status}"><span class="topic-dot">${status==='repasado'?icon('check'):''}</span>${topicLabels[status]}</span>`;}
function preparationBar(exam){const p=C.examProgress(exam);return `<div class="preparation"><span>Preparación declarada</span><span>${p.reviewed}/${p.total} repasados · ${p.percent}%</span></div><div class="mini-track" role="progressbar" aria-label="Temas repasados de ${E(exam.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}"><span style="width:${p.percent}%"></span></div>`;}
function topicRows(exam,choose=false){return `<ul class="topic-list">${exam.topics.map((t,i)=>`<li><div class="topic-heading"><strong>${E(t)}</strong>${choose?topicBadge(exam.preparation[i]):button('topic-form',icon('edit'),'icon-button',`data-id="${exam.id}" data-value="${exam.topicIds[i]}" aria-label="Editar tema ${E(t)}"`)+button('topic-delete','×','icon-button',`data-id="${exam.id}" data-value="${exam.topicIds[i]}" aria-label="Eliminar tema ${E(t)}"`)}</div><div class="topic-controls">${choose?'':`<label class="topic-state ${exam.preparation[i]}"><span class="topic-dot">${exam.preparation[i]==='repasado'?icon('check'):''}</span><select data-topic="${exam.id}" data-index="${i}" aria-label="Preparación de ${E(t)}">${Object.entries(topicLabels).map(([v,l])=>`<option value="${v}" ${exam.preparation[i]===v?'selected':''}>${l}</option>`).join('')}</select></label>`}${choose?'':button('topic-task','Crear tarea','text-button',`data-id="${exam.id}" data-value="${exam.topicIds[i]}"`)}${button(choose?'select-topic':'study-topic',icon('timer')+(choose?'Elegir tema':'Estudiar'),'study-button',`data-id="${exam.id}" data-value="${i}" aria-label="${choose?'Elegir':'Estudiar'} ${E(t)}"`)}</div></li>`).join('')}</ul>`;}
function exams(){const list=C.filteredExams(state,examFilter);return shell(heading('Parciales y finales','exam-form')+filters([['proximos','Próximos'],['pasados','Pasados']],examFilter,'exam-filter','exam-filter')+
  `<section class="exam-list" aria-label="Exámenes">${list.map(e=>{const d=C.daysBetween(e.due,state.today);return `<article class="exam-card"><div class="exam-card-top"><span class="academic-badge">${icon('calendar')}</span><div><h2>${E(e.name)}</h2><span class="task-meta">${E(e.title||e.type)}</span><time class="exam-date" datetime="${e.allDay?e.due:e.due+'T'+e.time}">${dateLabel(e.due)} · ${e.allDay?'Todo el día':e.time} ${e.allDay?'':E(e.timeZone||'')}</time></div><span class="countdown" aria-label="${d<0?'Hace '+Math.abs(d):'Faltan '+d} días"><strong>${Math.abs(d)}</strong><span>${d<0?'hace días':d===0?'hoy':'días'}</span></span></div>${topicRows(e)}${preparationBar(e)}<div class="card-actions">${button('topic-form','Agregar tema','text-button',`data-id="${e.id}"`)}${button('exam-form','Editar','text-button',`data-id="${e.id}"`)}${button('exam-delete','Eliminar','text-button danger',`data-id="${e.id}"`)}</div></article>`;}).join('')||empty('No hay exámenes en este período.')}</section><p class="demo-note">Vos elegís cuándo un tema está repasado.<br>El tiempo de enfoque no modifica su preparación.</p>${demo}`);}
function activityCard(){
  if(activity.kind==='task'){
    const t=state.tasks.find(t=>t.id===activity.id);
    if(t)return `<span class="academic-badge">${icon('tasks')}</span><div><p>${E(t.name)}</p><span class="task-meta">${E(t.subject||'Sin materia')}${t.minutes?` · Est. ${t.minutes} min`:''}</span></div>`;
  }
  if(activity.kind==='topic'){
    const e=state.exams.find(e=>e.id===activity.id);
    if(e&&activity.index>=0)return `<span class="academic-badge">${icon('book')}</span><div><p>${E(e.topics[activity.index])}</p><span class="task-meta">${E(e.title||e.type)} · ${E(e.name)}</span><span class="task-meta">Examen: ${dateLabel(e.due)}</span>${topicBadge(e.preparation[activity.index])}</div>`;
  }
  return `<span class="academic-badge">${icon('sun')}</span><div><p>${E(activity.label||'Sesión de concentración libre')}</p><span class="task-meta">Un momento para avanzar a tu ritmo.</span></div>`;
}
function pomodoro(){return shell(heading('Pomodoro')+`<div class="focus-mode-row">${button('focus-mode',focusMode?'Volver a vista normal':'Modo concentración','text-button','aria-pressed="'+focusMode+'"')}</div><section class="focus-stage" aria-label="Sesión de enfoque" data-atom-state="${timer.running?'concentrado':'relajado'}">${clock()}<div class="focus-controls">${button('timer-reset',icon('restart'),'round-control','aria-label="Reiniciar sesión"')}${button('timer-toggle',icon(timer.running?'pause':'play'),'round-control play-control','aria-label="Iniciar o pausar enfoque"')}${button('timer-expand',icon('expand'),'round-control','aria-label="Ampliar temporizador"')}</div></section><section class="focus-card activity-card"><div class="focus-card-heading"><h2>Actividad actual</h2>${button('choose-activity','Cambiar','text-button')}</div><div class="focus-task">${activityCard()}</div></section><section class="focus-card session-card"><div class="focus-card-heading"><h2>Sesiones de hoy</h2><span class="session-count">${timer.sessions}</span></div><ol class="session-list">${Array.from({length:Math.max(4,timer.sessions)},(_,i)=>`<li aria-label="Sesión ${i+1}: ${i<timer.sessions?'completada':'pendiente'}"><span class="session-dot ${i<timer.sessions?'is-done':''}">${i<timer.sessions?icon('check'):''}</span></li>`).join('')}</ol></section>${state.timer.status==='awaiting'?button('timer-decision','Revisar sesión finalizada','primary-button'):''}<p class="demo-note">${C.studyStats(state,state.today).minutes} minutos de enfoque hoy · ${C.studyStats(state).count} sesiones y ${C.studyStats(state).minutes} minutos en total.<br>Se registran bloques de 45 minutos completados. Al volver a la app se recupera el tiempo transcurrido; el siguiente bloque requiere tu decisión.</p>`);}
function activityPicker(tab=pickerTab,examId=null){
  pickerTab=tab;
  let content='';
  if(tab==='parcial'){
    const chosen=state.exams.find(e=>e.id===examId);
    content=chosen?`${button('activity-tab',icon('chevron-left')+'Todos los parciales','text-button','data-value="parcial"')}<div class="picker-heading"><h3>${E(chosen.title||chosen.type)}</h3><p>${E(chosen.name)} · ${dateLabel(chosen.due)}</p></div>${topicRows(chosen,true)}${preparationBar(chosen)}`:
      C.filteredExams(state,'proximos').map(e=>{const p=C.examProgress(e);return button('picker-exam',`<span class="picker-exam-top"><strong>${E(e.title||e.type)}</strong><span>${C.daysBetween(e.due,state.today)===0?'Hoy':'En '+C.daysBetween(e.due,state.today)+' días'}</span></span><span class="picker-subject">${E(e.name)}</span><span class="task-meta">${dateLabel(e.due)} · ${p.total} temas</span><span class="task-meta">${p.reviewed} repasados · ${p.studying} estudiando</span><span class="mini-track"><span style="width:${p.percent}%"></span></span>`,'picker-exam',`data-id="${e.id}"`);}).join('')||empty('No hay parciales próximos.');
  }else if(tab==='tarea'){
    content=`<div class="task-choices">${C.filteredTasks(state,'pendientes').map(t=>button('select-task',`<strong>${E(t.name)}</strong><small>${E(t.subject||'Sin materia')}${t.minutes?` · Est. ${t.minutes} min`:''}</small><small>${dateLabel(t.due)} · ${C.relativeDue(t.due,state.today)}</small>`,'secondary-button',`data-id="${t.id}"`)).join('')||empty('No hay tareas pendientes.')}</div>`;
  }else content=`<div class="free-focus">${icon('sun')}<h3>Concentrate a tu manera</h3><p>Una sesión sin tarea ni parcial asociado.</p>${button('select-free','Elegir enfoque libre','primary-button')}</div>`;
  modal('¿Qué vas a estudiar?',filters([['parcial','Parcial'],['tarea','Tarea'],['libre','Libre']],tab,'activity-tab')+content+'<p class="demo-note">Elegí una tarea, un tema o enfoque libre.</p>');
}
function selectActivity(next,confirmed=false){
 if(next.kind==='topic'&&!next.topicId){const e=state.exams.find(e=>e.id===next.id);next={...next,topicId:e?.topicIds[next.index]};}
 const resolved=C.Timer.resolveActivity(state,next);
 if(!confirmed&&state.timer.status!=='idle'){pendingActivity=resolved;modal('Cambiar actividad',`<p>Se descartará el bloque en curso. Las sesiones completadas se conservan.</p>${button('confirm-activity','Cambiar actividad','primary-button')}${button('close','Cancelar','secondary-button')}`);return;}
 commit(s=>s.timer=C.Timer.freshTimer(resolved),null);pendingActivity=null;focusMode=false;$('#panel').close();if(route!=='pomodoro')navigate('pomodoro');
}

function showPlan(id){const e=state.exams.find(e=>e.id===id)||planExam();if(!e){modal('Mi plan de estudio',empty('No hay exámenes próximos.'));return;}modal('Mi plan de estudio',`<div class="picker-heading"><h3>${E(e.title)} · ${E(e.name)}</h3><p>${dateLabel(e.due)}</p></div>${topicRows(e)}${preparationBar(e)}<p class="demo-note">Elegí qué tema repasar. No se genera una planificación automática.</p>`);$('#panel').dataset.examId=e.id;}

function agenda(){
  const end=C.addDays(state.today,6),items=[...C.academicTasks(state).filter(t=>!t.done&&t.due>=state.today&&t.due<=end).map(t=>({kind:'task',id:t.id,due:t.due,name:t.name,subject:t.subject})),...state.exams.filter(e=>e.due>=state.today&&e.due<=end).map(e=>({kind:'exam',id:e.id,due:e.due,name:e.title||e.type,subject:e.name}))].sort((a,b)=>a.due.localeCompare(b.due));
  modal('Agenda semanal',`<p class="page-intro">${dateLabel(state.today)} — ${dateLabel(end)}</p><ol class="agenda-list">${items.map(item=>`<li><time datetime="${item.due}">${dateLabel(item.due)}</time>${button(item.kind==='task'?'agenda-task':item.kind==='google'?'agenda-google':'agenda-exam',`<span class="agenda-kind">${item.kind==='task'?'Entrega':item.kind==='google'?'Google Calendar':'Parcial / final'}</span><strong>${E(item.name)}</strong><small>${E(item.subject)}</small>`,'agenda-item',`data-id="${E(item.id)}"`)}</li>`).join('')||'<li>'+empty('No hay entregas ni exámenes en estos siete días.')+'</li>'}</ol>`);
}

function updateFocusMode(){const stage=$('.focus-stage');if(stage)stage.dataset.atomState=timer.running?'concentrado':'relajado';document.body.classList.toggle('focus-mode',route==='pomodoro'&&focusMode);document.querySelectorAll('[data-action="focus-mode"]').forEach(el=>{el.textContent=focusMode?'Volver a vista normal':'Modo concentración';el.setAttribute('aria-pressed',String(focusMode));});}
// Menú de ordenamiento propio: portal fuera de las tarjetas, sin <select> nativo.
const sortOptions=[['cercano','Vencimiento más cercano'],['lejano','Vencimiento más lejano'],['materia','Materia (A–Z)']];
function sortControl(){
  const label=sortOptions.find(([value])=>value===taskSort)[1];
  return `<div class="sort-row"><span id="sort-label">Ordenar por</span>${button('sort-toggle',`<span>${label}</span>${icon('chevron-down')}`,'sort-trigger','id="task-sort-trigger" aria-haspopup="menu" aria-controls="task-sort-menu" aria-expanded="false" aria-labelledby="sort-label sort-selection"').replace('<span>'+label+'</span>','<span id="sort-selection">'+label+'</span>')}</div>`;
}
function closeSortMenu(restoreFocus=false){
  const menu=$('#task-sort-menu');
  if(menu.hidden)return;
  menu.hidden=true;
  const trigger=$('#task-sort-trigger');
  if(trigger){trigger.setAttribute('aria-expanded','false');if(restoreFocus)trigger.focus({preventScroll:true});}
}
function openSortMenu(focusEdge=null){
  const menu=$('#task-sort-menu'),trigger=$('#task-sort-trigger');
  if(!trigger)return;
  menu.innerHTML=sortOptions.map(([value,label])=>button('sort-select',`<span>${label}</span><span class="sort-check">${value===taskSort?icon('check'):''}</span>`,'sort-option',`role="menuitemradio" aria-checked="${value===taskSort}" tabindex="-1" data-value="${value}"`)).join('');
  menu.hidden=false;menu.style.visibility='hidden';menu.style.maxHeight='';
  const rect=trigger.getBoundingClientRect(),viewport=window.visualViewport;
  const leftEdge=viewport?.offsetLeft||0,topEdge=viewport?.offsetTop||0;
  const viewWidth=viewport?.width||document.documentElement.clientWidth;
  const viewBottom=topEdge+(viewport?.height||window.innerHeight);
  const width=Math.min(276,viewWidth-24),left=Math.max(leftEdge+12,Math.min(rect.right-width,leftEdge+viewWidth-width-12));
  menu.style.width=`${width}px`;menu.style.left=`${left}px`;
  const dockTop=$('.dock')?.getBoundingClientRect().top??viewBottom;
  const bottomLimit=Math.min(viewBottom-12,dockTop-10),height=menu.getBoundingClientRect().height;
  const below=bottomLimit-rect.bottom-7,above=rect.top-7-(topEdge+12);
  const down=below>=height||below>=above;
  const available=Math.max(48,down?below:above),actualHeight=Math.min(height,available);
  menu.style.maxHeight=`${available}px`;
  menu.style.top=`${Math.max(topEdge+12,down?rect.bottom+7:rect.top-7-actualHeight)}px`;
  menu.style.visibility='visible';trigger.setAttribute('aria-expanded','true');
  const items=[...menu.querySelectorAll('[role="menuitemradio"]')];
  const index=focusEdge==='first'?0:focusEdge==='last'?items.length-1:sortOptions.findIndex(([value])=>value===taskSort);
  items[index]?.focus({preventScroll:true});
}
function toggleSortMenu(){if($('#task-sort-menu').hidden)openSortMenu();else closeSortMenu(true);}
function selectSort(value){
  if(!sortOptions.some(([key])=>key===value))return;
  taskSort=value;persistUI();closeSortMenu();render();$('#task-sort-trigger')?.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{
  const trigger=event.target.closest('#task-sort-trigger'),menu=$('#task-sort-menu');
  if(trigger&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openSortMenu(event.key==='ArrowDown'?'first':'last');return;}
  if(menu.hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeSortMenu(true);return;}
  if(event.key==='Tab'){closeSortMenu(true);return;}
  if(!menu.contains(event.target))return;
  const items=[...menu.querySelectorAll('[role="menuitemradio"]')],index=items.indexOf(document.activeElement);
  let next;
  if(event.key==='ArrowDown')next=(index+1)%items.length;
  if(event.key==='ArrowUp')next=(index-1+items.length)%items.length;
  if(event.key==='Home')next=0;
  if(event.key==='End')next=items.length-1;
  if(next!==undefined){event.preventDefault();items[next]?.focus({preventScroll:true});}
  if(event.key==='Enter'||event.key===' '){event.preventDefault();selectSort(event.target.closest('[data-value]')?.dataset.value);}
});
window.addEventListener('resize',()=>closeSortMenu());
window.addEventListener('scroll',()=>closeSortMenu(),{passive:true});
window.visualViewport?.addEventListener('resize',()=>closeSortMenu());

document.addEventListener('click',event=>{
 if(!event.target.closest('.sort-row')&&!event.target.closest('#task-sort-menu'))closeSortMenu();
 const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,v=el.dataset.value,id=el.dataset.id;
 try{
 rollover();
 if(a==='sort-toggle')toggleSortMenu();else if(a==='sort-select')selectSort(v);else if(a==='route')navigate(v);else if(a==='mode')navigate(last[v]);else if(a==='close')$('#panel').close();else if(a==='account')account();
 else if(a==='habit-toggle'||a==='record-toggle'){
  const day=a==='record-toggle'?v:state.today;changedHabit=id;
  commit(s=>{const done=C.toggleHabit(s,id,day);celebrating=done&&day===s.today&&C.daySnapshot(s,day).state==='completo';},null);
  if(a==='record-toggle'){dayDetail(day);document.querySelector(`[data-action="record-toggle"][data-id="${id}"]`)?.focus({preventScroll:true});}
 }
 else if(a==='task-toggle')commit(s=>C.toggleTask(s,id),null);
 else if(a==='habit-filter'){habitFilter=v;persistUI();render();}else if(a==='task-filter'){taskFilter=v;persistUI();render();}else if(a==='exam-filter'){examFilter=v;persistUI();render();}
 else if(a==='period'){period=v;periodOffset=0;persistUI();render();}else if(a==='period-step'){periodOffset+=Number(v);persistUI();render();}
 else if(a==='habit-form')habitForm(id);else if(a==='task-form')taskForm(id);else if(a==='exam-form')examForm(id);
 else if(a==='habit-archive')commit(s=>C.archiveHabit(s,id),'Rutina actualizada desde hoy.',true);
 else if(a==='habit-delete'){const h=state.habits.find(h=>h.id===id);if(!h)return;modal('Eliminar hábito',`<p>¿Querés eliminar «${E(h.name)}»? Dejará de aparecer desde hoy. Los registros de fechas anteriores se conservan.</p>${button('confirm-delete','Eliminar hábito','primary-button',`data-id="${id}"`)}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='confirm-delete'){commit(s=>C.deleteHabit(s,id),'Hábito eliminado.',true);$('#panel').close();}
 else if(a==='topic-task'){commit(s=>{const e=s.exams.find(e=>e.id===id),i=e?.topicIds.indexOf(v);if(!e||i<0)throw Error('Tema no disponible.');if(C.academicTasks(s).some(t=>t.examId===id&&t.topicId===v))throw Error('Este tema ya tiene una tarea asociada.');const t=C.saveTask(s,{name:('Estudiar: '+e.topics[i]).slice(0,100),subject:e.name,due:e.due,description:e.topics[i],minutes:45});t.examId=id;t.topicId=v;},'Tarea de estudio creada.');}
 else if(a==='topic-form')topicForm(id,v);
 else if(a==='topic-delete'){modal('Eliminar tema',`<p>¿Querés eliminar este tema y su estado de preparación? Las sesiones realizadas se conservan.</p>${button('confirm-topic-delete','Eliminar tema','primary-button',`data-id="${id}" data-value="${v}"`)}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='confirm-topic-delete'){commit(s=>C.deleteTopic(s,id,v),'Tema eliminado.');$('#panel').close();}
 else if(a==='exam-delete'){modal('Eliminar examen',`<p>¿Querés eliminar este examen y sus temas? Las sesiones realizadas se conservan.</p>${button('confirm-exam-delete','Eliminar sólo de Ritmo','primary-button',`data-id="${id}"`)}${state.sync.links.some(l=>l.localKind==='exam'&&l.localId===id&&l.remoteId&&C.SyncModel.active(l))?button('confirm-exam-delete-google','Eliminar también en Google','text-button danger',`data-id="${id}"`):''}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='confirm-exam-delete-google'){commit(s=>C.deleteExam(s,id,true),'Eliminación remota pendiente de sincronizar.');$('#panel').close();}
 else if(a==='confirm-exam-delete'){commit(s=>C.deleteExam(s,id),'Examen eliminado.');$('#panel').close();}
 else if(a==='day')dayDetail(v);
 else if(a==='previous-day')dayDetail(C.addDays(selectedDay,-1));else if(a==='next-day')dayDetail(C.addDays(selectedDay,1));
 else if(a==='enter-demo'){modal('Explorar demostración',`<p>Vas a ver datos de ejemplo separados de tus registros personales. El temporizador personal se conserva; los ejemplos usan un temporizador separado.</p>${button('confirm-demo','Abrir demostración','primary-button')}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='confirm-demo')enterDemo();else if(a==='exit-demo')exitDemo();
 else if(a==='reset-demo'){state=C.makeDemo();timerError=false;syncTimer();undoAction=null;$('#panel').close();render();toast('Ejemplos restablecidos.');}
 else if(a==='export')exportData();else if(a==='import')$('#import-file').click();
 else if(a==='recover')previewImport(store.backup(),true);
 else if(a==='confirm-import')importConfirmed();
 else if(a==='export-raw'){const raw=store.raw();if(!raw)throw Error('No hay datos originales disponibles.');downloadText(raw,`Ritmo-recuperacion-${C.today()}.json`);}
 else if(a==='reload')location.reload();
 else if(a==='export-migration'){const raw=store.migrationBackup();if(raw)downloadText(raw,'Ritmo-antes-de-V4.6.json');}
 else if(a==='pwa-check')RitmoPWA.check().catch(e=>toast(e.message));
 else if(a==='pwa-update'){modal('Actualizar Ritmo',`<p>Los datos guardados y el Pomodoro se conservan. Cerrá las otras pestañas de Ritmo antes de recargar.</p>${button('pwa-confirm','Actualizar y recargar','primary-button')}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='pwa-confirm')RitmoPWA.activate().catch(e=>toast(e.message));
 else if(a==='timer-toggle')toggleTimer();
 else if(a==='timer-reset'){if(state.timer.status==='idle')resetTimer();else modal('Reiniciar sesión',`<p>Se descartará el bloque en curso. Las sesiones completadas se conservan.</p>${button('confirm-timer-reset','Reiniciar','primary-button')}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='confirm-timer-reset')resetTimer();
 else if(a==='confirm-activity'&&pendingActivity)selectActivity(pendingActivity,true);
 else if(a==='timer-decision')sessionDecision();
 else if(a==='complete-activity'){commit(s=>{const a=s.timer.pending?.activity;if(a?.kind==='task'){const t=s.tasks.find(t=>t.id===a.id);if(t&&!t.done)C.toggleTask(s,t.id);}else if(a?.kind==='topic'){const e=s.exams.find(e=>e.id===a.id),i=e?.topicIds.indexOf(a.topicId);if(e&&i>=0)e.preparation[i]='repasado';}C.Timer.nextPhase(s,'break',false);},null);$('#panel').close();}
 else if(a==='start-break'){commit(s=>C.Timer.nextPhase(s,'break'),null);$('#panel').close();}
 else if(a==='start-focus'){commit(s=>C.Timer.nextPhase(s,'focus'),null);$('#panel').close();}
 else if(a==='leave-session')resetTimer();
 else if(a==='timer-expand'){modal('Tu momento de enfoque',`${clock()}<div class="focus-controls">${button('timer-toggle',icon('play'),'round-control play-control','aria-label="Iniciar enfoque"')}</div><p class="demo-note">El estado se guarda al iniciar y pausar. El tiempo se recalcula al regresar.</p>`);updateClock();}
 else if(a==='choose-activity')activityPicker(activity.kind==='topic'?'parcial':activity.kind==='task'?'tarea':'libre');
 else if(a==='activity-tab')activityPicker(v);else if(a==='picker-exam')activityPicker('parcial',id);
 else if(a==='select-task')selectActivity({kind:'task',id});else if(a==='select-free')selectActivity({kind:'free'});
 else if(a==='select-topic'||a==='study-topic')selectActivity({kind:'topic',id,index:Number(v)});
 else if(a==='plan-details')showPlan(id);else if(a==='agenda')agenda();else if(a==='agenda-task')taskForm(id);

 else if(a==='agenda-exam'){examFilter='proximos';navigate('parciales');}
 else if(a==='focus-mode'){focusMode=!focusMode;updateFocusMode();}
 else if(a==='undo'){const undo=undoAction;undoAction=null;if(undo){undo();if($('#panel').open&&$('#panel').dataset.day)dayDetail($('#panel').dataset.day);}}
 else if(a==='task-delete'){const t=state.tasks.find(t=>t.id===id);if(!t)return;modal('Eliminar tarea',`<p>¿Querés eliminar «${E(t.name)}»?</p>${button('confirm-task-delete','Eliminar sólo de Ritmo','primary-button',`data-id="${id}"`)}${state.sync.links.some(l=>l.localKind==='task'&&l.localId===id&&l.remoteId&&C.SyncModel.active(l))?button('confirm-task-delete-google','Eliminar también en Google','text-button danger',`data-id="${id}"`):''}${button('close','Cancelar','secondary-button')}`);}
 else if(a==='confirm-task-delete-google'){commit(s=>C.deleteTask(s,id,true),'Eliminación remota pendiente de sincronizar.');$('#panel').close();}
 else if(a==='confirm-task-delete'){commit(s=>{C.deleteTask(s,id);},'Tarea eliminada.',true);$('#panel').close();}
 }catch(e){toast(e.message);}
});
document.addEventListener('change',event=>{
 const el=event.target;
 try{
 if(el.hasAttribute('data-select-day')){if(!C.validDate(el.value)||el.value>state.today||el.value<state.startedOn)throw Error('Elegí una fecha del historial, hasta hoy.');dayDetail(el.value);}
 if(el.dataset.pref)commit(s=>{if(el.dataset.pref==='motion')s.preferences.motion=el.checked;},'Preferencia guardada.');
 if(el.dataset.topic){const examId=el.dataset.topic,index=Number(el.dataset.index),value=el.value;if(!Object.hasOwn(topicLabels,value))return;const inPanel=$('#panel').open;commit(s=>{const e=s.exams.find(e=>e.id===examId);if(!e||!Number.isInteger(index)||index<0||index>=e.topics.length)throw Error('Tema no disponible.');e.preparation[index]=value;},'Preparación guardada.');if(inPanel)showPlan(examId);document.querySelector(`[data-topic="${examId}"][data-index="${index}"]`)?.focus({preventScroll:true});}
 }catch(e){toast(e.message);}
});
document.addEventListener('submit',event=>{
 const form=event.target;if(!form.dataset.form)return;event.preventDefault();const fd=new FormData(form),values=Object.fromEntries(fd),id=form.dataset.id;
 try{commit(s=>{
 if(form.dataset.form==='habit')C.saveHabit(s,{name:values.name,emoji:values.emoji,icon:values.icon,days:fd.getAll('days').map(Number)},id);
 else if(form.dataset.form==='task'){C.saveTask(s,values,id);if(!id)taskFilter='todas';}
 else if(form.dataset.form==='topic')C.saveTopic(s,id,values.name,form.dataset.topicId);
 else if(form.dataset.form==='exam'){C.saveExam(s,values,id);examFilter=values.due<s.today?'pasados':'proximos';}
 },'Guardado.');$('#panel').close();}catch(e){form.querySelector('.form-error').textContent=e.message;}
});
$('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>10*1024*1024)throw Error('La copia supera el límite de 10 MB.');previewImport(JSON.parse(await file.text()));}catch(e){toast('No se importó el archivo. '+e.message);}});
$('#panel').addEventListener('click',event=>{if(event.target===$('#panel')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
$('#panel').addEventListener('close',()=>{delete $('#panel').dataset.day;delete $('#panel').dataset.examId;pendingImport=null;if(returnFocus){const r=returnFocus;[...document.querySelectorAll('[data-action]')].find(el=>el.dataset.action===r.action&&el.dataset.id===r.id&&el.dataset.value===r.value)?.focus({preventScroll:true});returnFocus=null;}});
window.addEventListener('hashchange',onRoute);
window.addEventListener('storage',event=>{if(event.key!==C.KEY&&event.key!==null)return;if(demoMode)return;store.block();storageNotice='Los datos cambiaron en otra pestaña. Recargá antes de seguir editando.';undoAction=null;updateStorageNotice();});
window.addEventListener('focus',rollover);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')rollover();});
setInterval(rollover,15000);
setInterval(tickTimer,250);
window.addEventListener('focus',tickTimer);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tickTimer();});
const googleUI=RitmoGoogleUI.init({get:()=>state,mutate:fn=>{if(demoMode||storageNotice)throw Error('Revisá el guardado o salí de la demo.');return commit(fn,null,false,true);},modal,button,escape:E,toast,isDemo:()=>demoMode,blocked:()=>!!storageNotice});
window.addEventListener('ritmo-pwa-status',()=>{const el=$('#pwa-status');if(el){el.textContent=RitmoPWA.status().message;const btn=$('[data-action="pwa-update"]');if(btn)btn.disabled=!RitmoPWA.status().waiting;}});
restoreUI();onRoute();tickTimer();
})();
