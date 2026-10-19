/* Máquina de estados del Pomodoro. El intervalo sólo refresca la pantalla. */
(function(C){
  'use strict';
  const durations={focus:2700,break:900};
  const freshTimer=(activity={kind:'free',label:'Sesión libre'})=>({phase:'focus',status:'idle',remaining:2700,deadline:0,runId:null,activity:C.clone(activity),pending:null});
  function remaining(timer,now=Date.now()){
    return timer.status==='running'?Math.min(durations[timer.phase],Math.max(0,Math.ceil((timer.deadline-now)/1000))):timer.remaining;
  }
  function resolveActivity(state,next){
    if(next.kind==='task'){
      const task=state.tasks.find(t=>t.id===next.id);
      if(!task)throw Error('La tarea ya no está disponible.');
      return {kind:'task',id:task.id,label:task.name};
    }
    if(next.kind==='topic'){
      const exam=state.exams.find(e=>e.id===next.id),index=exam?.topicIds.indexOf(next.topicId);
      if(!exam||index<0)throw Error('El tema ya no está disponible.');
      return {kind:'topic',id:exam.id,topicId:exam.topicIds[index],label:exam.topics[index]+' · '+exam.name};
    }
    return {kind:'free',label:next.label||'Sesión libre'};
  }
  function settle(state,now=Date.now()){
    const t=state.timer;
    if(t.status!=='running'||remaining(t,now)>0)return false;
    if(t.phase==='focus'&&!state.sessions.some(s=>s.id===t.runId)){
      state.sessions.push({id:t.runId,date:C.SyncModel.localDate(t.deadline),completedAt:new Date(t.deadline).toISOString(),seconds:2700,activity:C.clone(t.activity)});
    }
    t.status='awaiting';t.remaining=0;t.pending={phase:t.phase,activity:C.clone(t.activity)};t.deadline=0;
    return true;
  }
  function toggle(state,now=Date.now()){
    const t=state.timer;
    if(settle(state,now)||t.status==='awaiting')return;
    if(t.status==='running'){t.remaining=remaining(t,now);t.deadline=0;t.status='paused';}
    else {t.runId=t.runId||C.uid('session');t.deadline=now+t.remaining*1000;t.status='running';}
  }
  function nextPhase(state,phase,start=true,now=Date.now()){
    const activity=state.timer.activity;
    state.timer={...freshTimer(activity),phase,remaining:durations[phase]};
    if(start)toggle(state,now);
  }
  function detach(state,kind,id,topicId=null){
    const detachOne=a=>{if(a?.kind===kind&&a.id===id&&(!topicId||a.topicId===topicId)){const label=a.label;Object.keys(a).forEach(k=>delete a[k]);Object.assign(a,{kind:'free',label:label+' (elemento eliminado)'});}};
    detachOne(state.timer.activity);detachOne(state.timer.pending?.activity);
    state.sessions.forEach(s=>detachOne(s.activity));
  }
  function validateTimer(state){
    const fail=()=>{throw Error('El respaldo contiene un temporizador o sesiones inválidas.');};
    const activity=a=>{
      if(!a||!['free','task','topic'].includes(a.kind)||typeof a.label!=='string'||a.label.length>500)fail();
      if(a.kind==='task'&&!state.tasks.some(t=>t.id===a.id))fail();
      if(a.kind==='topic'&&!state.exams.some(e=>e.id===a.id&&e.topicIds.includes(a.topicId)))fail();
    };
    const t=state.timer;
    if(!t||!Object.hasOwn(durations,t.phase)||!['idle','running','paused','awaiting'].includes(t.status)||!Number.isInteger(t.remaining)||t.remaining<0||t.remaining>durations[t.phase]||!Number.isFinite(t.deadline)||t.deadline<0)fail();
    if(t.status==='running'&&(!t.deadline||typeof t.runId!=='string'))fail();
    if(t.runId!==null&&(typeof t.runId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(t.runId)))fail();
    if(t.status==='awaiting'&&(!t.pending||t.remaining!==0))fail();
    if(t.status!=='awaiting'&&t.pending!==null)fail();
    activity(t.activity);
    if(t.pending){if(t.pending.phase!==t.phase)fail();activity(t.pending.activity);}
    if(!Array.isArray(state.sessions)||state.sessions.length>50000||new Set(state.sessions.map(s=>s.id)).size!==state.sessions.length)fail();
    state.sessions.forEach(s=>{if(!s||typeof s.id!=='string'||!C.validDate(s.date)||s.seconds!==2700||typeof s.completedAt!=='string'||!Number.isFinite(Date.parse(s.completedAt)))fail();activity(s.activity);});
  }
  C.Timer={durations,freshTimer,remaining,resolveActivity,settle,toggle,nextPhase,detach,validate:validateTimer};
})(RitmoCore);
