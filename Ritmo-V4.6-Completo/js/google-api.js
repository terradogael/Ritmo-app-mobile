/* REST paginado. Las URL se construyen desde IDs, nunca desde datos remotos. */
(function(root){
  'use strict';
  function create(request){
    const enc=encodeURIComponent;
    const base={tasks:'https://tasks.googleapis.com/tasks/v1/',calendar:'https://www.googleapis.com/calendar/v3/'};
    const json=(method,body,etag)=>({method,headers:{'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})},body:JSON.stringify(body)});
    async function pages(service,path,query={}){
      const all=[];let pageToken=null;const seen=new Set();
      do {const params=new URLSearchParams({...query,...(pageToken?{pageToken}:{})});const r=await request(service,base[service]+path+'?'+params);if(r.items)all.push(...r.items);pageToken=r.nextPageToken||null;if(pageToken&&seen.has(pageToken))throw Error('Paginación repetida. No se aplicaron eliminaciones.');seen.add(pageToken);if(all.length>25000)throw Error('La colección supera el límite local de 25.000 elementos.');}while(pageToken);
      return all;
    }
    const path=l=>l.service==='tasks'?`lists/${enc(l.containerId)}/tasks`:`calendars/${enc(l.containerId)}/events`;
    return {
      taskLists:()=>pages('tasks','users/@me/lists',{maxResults:100}),
      calendars:()=>pages('calendar','users/me/calendarList',{minAccessRole:'reader',maxResults:250}),
      tasks:id=>pages('tasks',`lists/${enc(id)}/tasks`,{showCompleted:true,showHidden:true,showDeleted:true,showAssigned:false,maxResults:100}),
      events:(id,start,end)=>pages('calendar',`calendars/${enc(id)}/events`,{timeMin:start,timeMax:end,singleEvents:true,orderBy:'startTime',maxResults:250}),
      async get(l){try{return await request(l.service,base[l.service]+path(l)+'/'+enc(l.remoteId));}catch(e){if(e.code===404||e.code===410)return null;throw e;}},
      insert:(l,body)=>request(l.service,base[l.service]+path(l)+(l.service==='calendar'?'?sendUpdates=none':''),json('POST',body)),
      remove:(l,etag)=>{if(!etag)throw Error('Falta versión remota para eliminar.');return request(l.service,base[l.service]+path(l)+'/'+enc(l.remoteId)+(l.service==='calendar'?'?sendUpdates=none':''),{method:'DELETE',headers:{'If-Match':etag}});},
      patch:(l,body,etag)=>{if(!etag)throw Error('Google no devolvió ETag; actualización detenida para proteger los datos.');return request(l.service,base[l.service]+path(l)+'/'+enc(l.remoteId)+(l.service==='calendar'?'?sendUpdates=none':''),json('PATCH',body,etag));},
    };
  }
  root.RitmoGoogleAPI={create};
})(globalThis);
