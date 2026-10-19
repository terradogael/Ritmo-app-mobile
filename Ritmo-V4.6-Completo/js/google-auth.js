/* GIS token model: credenciales sólo en memoria, por gesto explícito. */
(function(root){
  'use strict';
  const scopes={tasks:['https://www.googleapis.com/auth/tasks'],calendar:['https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events']};
  let token=null,expires=0,granted=[],user=null,epoch=0,loading=null,authorizing=false;
  const active=new Set(),listeners=new Set();
  const notify=()=>listeners.forEach(fn=>fn());
  const status=()=>({ready:!!root.google?.accounts?.oauth2,connected:!!token&&Date.now()<expires,user:user?{...user}:null,tasks:!!token&&Date.now()<expires&&scopes.tasks.every(s=>granted.includes(s)),calendar:!!token&&Date.now()<expires&&scopes.calendar.every(s=>granted.includes(s)),authorizing});
  function prepare(){
    if(status().ready)return Promise.resolve();if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';
      const timeout=setTimeout(()=>{script.remove();loading=null;reject(Error('No se pudo cargar Google. Revisá la conexión.'));},15000);
      script.onload=()=>{clearTimeout(timeout);notify();resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();loading=null;reject(Error('Google no está disponible sin conexión.'));};document.head.append(script);
    });return loading;
  }
  function clear(){epoch++;for(const c of active)c.abort();active.clear();token=null;expires=0;user=null;granted=[];authorizing=false;notify();}
  function authorize(clientId,service){
    if(!status().ready)return Promise.reject(Error('Primero cargá la conexión de Google.'));
    if(!/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId))return Promise.reject(Error('Falta configurar la conexión de Google en esta versión de Ritmo. Avisale al desarrollador.'));
    if(authorizing)return Promise.reject(Error('Ya hay una autorización en curso.'));
    if(!scopes[service])return Promise.reject(Error('Servicio inválido.'));
    clear();const generation=epoch;authorizing=true;notify();
    return new Promise((resolve,reject)=>{
      const rejectSafe=message=>{if(generation===epoch){clear();}reject(Error(message));};
      const client=root.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:['openid','email',...scopes[service]].join(' '),include_granted_scopes:true,
        error_callback:()=>rejectSafe('Autorización cancelada o ventana bloqueada. Volvé a conectar.'),
        callback:async response=>{
          if(generation!==epoch)return reject(Error('Conexión cancelada.'));
          if(response.error||!response.access_token)return rejectSafe('Google no concedió la autorización. Los datos locales se conservan.');
          if(!root.google.accounts.oauth2.hasGrantedAllScopes(response,...scopes[service]))return rejectSafe('Faltan permisos del servicio seleccionado. Podés seguir usando Ritmo localmente.');
          token=response.access_token;expires=Date.now()+Math.max(0,Number(response.expires_in)-60)*1000;granted=String(response.scope||'').split(' ');
          try{
            const info=await request(null,'https://openidconnect.googleapis.com/v1/userinfo');
            if(generation!==epoch)throw Error('Conexión cancelada.');
            if(typeof info.sub!=='string'||!info.sub)throw Error('No se pudo identificar la cuenta.');
            user={sub:info.sub,email:typeof info.email==='string'?info.email:''};authorizing=false;notify();resolve(status());
          }catch{rejectSafe('No se pudo verificar la cuenta. Volvé a conectar.');}
        }});
      client.requestAccessToken({prompt:'select_account'});
    });
  }
  async function request(service,url,options={}){
    if(!token||Date.now()>=expires){clear();throw Object.assign(Error('Sesión expirada. Conectá Google nuevamente.'),{code:401});}
    if(service&&!scopes[service].every(s=>granted.includes(s)))throw Object.assign(Error('Faltan permisos. Conectá este servicio.'),{code:403});
    if(!/^https:\/\/(tasks\.googleapis\.com\/tasks\/v1\/|www\.googleapis\.com\/calendar\/v3\/|openidconnect\.googleapis\.com\/v1\/userinfo$)/.test(url))throw Error('Destino de API no permitido.');
    const generation=epoch,controller=new AbortController();active.add(controller);const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(generation!==epoch)throw Error('Conexión cancelada.');
      if(!response.ok){if(response.status===401)clear();throw Object.assign(Error(({401:'Sesión expirada. Volvé a conectar.',403:'Permiso insuficiente o cuota de Google. Revisá la configuración.',404:'Recurso remoto no encontrado.',409:'El recurso ya existe.',410:'El recurso remoto fue eliminado.',412:'Google cambió mientras se guardaba. Revisá el conflicto.',429:'Cuota temporal de Google. Reintentá más tarde.'})[response.status]||'Google no pudo completar la solicitud.'),{code:response.status});}
      return response.status===204?null:await response.json();
    }catch(e){if(e.code)throw e;throw Object.assign(Error('No se pudo confirmar la solicitud. Revisá la red o reconectá. No se borraron datos locales.'),{code:'network'});}
    finally{clearTimeout(timeout);active.delete(controller);}
  }
  async function disconnect(){
    const old=token;clear();if(!old||!root.google?.accounts?.oauth2)return false;
    return new Promise(resolve=>{const timeout=setTimeout(()=>resolve(false),8000);root.google.accounts.oauth2.revoke(old,r=>{clearTimeout(timeout);resolve(r.successful===true);});});
  }
  root.RitmoGoogleAuth={prepare,authorize,status,request,disconnect,clear,onChange:fn=>listeners.add(fn),generation:()=>epoch};
})(globalThis);
