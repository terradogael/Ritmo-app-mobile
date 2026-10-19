const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
let time=Date.now(),mode='ok',fetches=0,revoked=false,config,partial=false;
const ctx={AbortController,setTimeout,clearTimeout,Date:class extends Date{static now(){return time;}},fetch:async(url,options)=>{fetches++;assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer mock-secret');if(mode==='network')throw Error('red');return {ok:mode==='ok',status:mode==='ok'?200:+mode,json:async()=>({sub:'user-1',email:'user@example.test'})};},google:{accounts:{oauth2:{initTokenClient:c=>{config=c;return {requestAccessToken:()=>c.callback({access_token:'mock-secret',expires_in:3600,scope:partial?'openid email':c.scope})};},hasGrantedAllScopes:(r,...scopes)=>scopes.every(s=>r.scope.split(' ').includes(s)),revoke:(_,cb)=>{revoked=true;cb({successful:true});}}}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/google-auth.js'),'utf8'),ctx);const A=ctx.RitmoGoogleAuth,connect=()=>A.authorize('123-test.apps.googleusercontent.com','tasks');
await connect();assert.equal(A.status().tasks,true);assert.equal(A.status().user.sub,'user-1');assert.equal(JSON.stringify(A.status()).includes('mock-secret'),false);
await assert.rejects(A.request('tasks','https://example.test/'),/permitido/);await assert.rejects(A.request('calendar','https://www.googleapis.com/calendar/v3/calendars/primary/events'),e=>e.code===403);
time+=3600000;const before=fetches;await assert.rejects(A.request('tasks','https://tasks.googleapis.com/tasks/v1/users/@me/lists'),e=>e.code===401);assert.equal(fetches,before);assert.equal(A.status().connected,false);
await connect();mode='401';await assert.rejects(A.request('tasks','https://tasks.googleapis.com/tasks/v1/users/@me/lists'),e=>e.code===401);assert.equal(A.status().connected,false);
mode='ok';await connect();mode='network';await assert.rejects(A.request('tasks','https://tasks.googleapis.com/tasks/v1/users/@me/lists'),e=>e.code==='network');mode='ok';await A.disconnect();assert.equal(revoked,true);assert.equal(A.status().connected,false);
partial=true;await assert.rejects(connect(),/Faltan permisos/);assert.equal(A.status().connected,false);partial=false;
ctx.google.accounts.oauth2.initTokenClient=c=>{config=c;return {requestAccessToken:()=>c.error_callback({type:'popup_closed'})};};await assert.rejects(connect(),/cancelada/);assert.equal(A.status().authorizing,false);
console.log('PASS OAuth mock: scopes parciales, popup cerrado, expiración, 401, red, allowlist, revocación y token privado');
})().catch(e=>{console.error(e);process.exit(1)});
