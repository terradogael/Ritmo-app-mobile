const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict'),ctx={};vm.createContext(ctx);for(const n of ['core','timer','sync-model','storage','google-domain-sync'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8'),ctx);const C=ctx.RitmoCore;
for(const fixture of ['v44-state.json','v452-state.json']){
 const raw=fs.readFileSync(path.join(__dirname,'fixtures',fixture),'utf8'),old=JSON.parse(raw),snapshot=JSON.stringify(old),next=C.migrate(old);assert.equal(next.schemaVersion,4);assert.equal(JSON.stringify(old),snapshot);
 for(const name of ['habits','tasks','exams'])assert.equal(JSON.stringify(next[name].map(x=>x.id)),JSON.stringify(old[name].map(x=>x.id)));
 for(const key of ['timer','sessions','preferences','ui','startedOn'])assert.equal(JSON.stringify(next[key]),JSON.stringify(old[key]),key);
 for(const [date,row]of Object.entries(old.history))for(const [id,mark]of Object.entries(row.items)){const upgraded=next.history[date].items[id];assert.equal(upgraded.legacyDone,mark.done);assert.equal(upgraded.name,mark.name);assert.equal(upgraded.scheduled,mark.scheduled);}
 const data={[C.KEY]:raw},store=C.createStore({getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v});const state=store.load().state;store.save(state);assert.equal(data[C.KEY+'.pre-v46'],raw);assert.equal(data[C.BACKUP],raw);store.save(state);assert.equal(data[C.KEY+'.pre-v46'],raw);assert.equal(JSON.parse(data[C.KEY]).schemaVersion,4);C.validate(state);
 if(fixture==='v452-state.json'){
  assert.equal(next.sync.legacy.links.length,2);assert.equal(next.sync.links.length,4);assert.equal(next.exams[0].name,'Materia por asignar');assert.equal(next.exams[0].legacySubject,old.exams[0].name);assert.equal(next.exams[0].topics[0],'Vectores');assert.equal(next.exams[0].allDay,true);
  Object.assign(next.sync.config,{accountId:'a',diaryListId:'d',facultyListId:'f',calendarIds:['cal']});ctx.RitmoGoogleDomainSync.repair(next,'a');assert.equal(C.academicTasks(next).length,1);assert.equal(C.academicTasks(next)[0].description,'TP auténtico');assert.equal(next.tasks.length,2);assert.equal(next.sync.archive.length,1);const remoteIds=next.sync.links.map(l=>l.remoteId).sort();assert.deepEqual(Array.from(remoteIds),['d1','e1','f1','h1']);C.validate(next);
 }
 console.log('PASS '+fixture+': IDs/datos originales conservados, historial recuperable, respaldo exacto e inmutable, fuentes por IDs y sin borrado');
}
