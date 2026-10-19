/* Sólo evidencia: desconocido no equivale a incumplimiento ni prolonga una racha. */
(function(C){
 'use strict';
 function metrics(s,habitId=null,start=s.startedOn,end=s.today){
  const all=Object.keys(s.history).filter(d=>d<=s.today).sort().map(date=>{
   const items=Object.entries(s.history[date].items).filter(([id,h])=>h.scheduled&&(!habitId||id===habitId)).map(([,h])=>h);
   return {date,scheduled:items.length,total:items.filter(h=>h.done!==null).length,completed:items.filter(h=>h.done===true).length,unknown:items.filter(h=>h.done===null).length};
  }).filter(r=>r.scheduled);
  let best=0,run=0,current=0;
  for(const r of all){run=!r.unknown&&r.completed===r.total?run+1:0;best=Math.max(best,run);}
  for(const r of [...all].reverse()){if(r.date===s.today&&(r.unknown||r.completed<r.total))continue;if(r.unknown||r.completed!==r.total)break;current++;}
  const range=all.filter(r=>r.date>=start&&r.date<=end),total=range.reduce((n,r)=>n+r.total,0),completed=range.reduce((n,r)=>n+r.completed,0),unknown=range.reduce((n,r)=>n+r.unknown,0);
  return {current,best,total,completed,unknown,rate:total?Math.round(completed/total*100):0,activeDays:all.filter(r=>r.completed>0).length,perfectDays:all.filter(r=>!r.unknown&&r.completed===r.total).length};
 }
 const studyStats=(s,date=null)=>{const list=s.sessions.filter(x=>!date||x.date===date);return {count:list.length,minutes:list.reduce((n,x)=>n+x.seconds,0)/60};};
 Object.assign(C,{metrics,studyStats});
})(RitmoCore);
