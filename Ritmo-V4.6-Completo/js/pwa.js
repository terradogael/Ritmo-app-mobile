/* Actualización explícita; no se fuerza una recarga mientras se edita. */
(function(root){
  'use strict';
  let registration=null,info='Preparando uso sin conexión…',refreshRequested=false;
  const notify=()=>root.dispatchEvent(new Event('ritmo-pwa-status'));
  async function init(){
    if(!('serviceWorker' in navigator)||!isSecureContext){info='PWA requiere HTTPS o localhost y un navegador compatible.';notify();return;}
    try{
      registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      const watch=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'){info=registration.waiting?'Actualización disponible.':'Recursos guardados para abrir sin conexión.';notify();}if(worker.state==='redundant'){info='No se completó la actualización. La versión anterior se conserva.';notify();}});};
      watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
      await navigator.serviceWorker.ready;info=registration.waiting?'Actualización disponible.':'Recursos guardados para abrir sin conexión.';notify();
    }catch{info='No se pudo preparar el modo offline. Revisá HTTPS, rutas y conexión.';notify();}
  }
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(refreshRequested)location.reload();});
  navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='UPDATE_BLOCKED'){refreshRequested=false;info='Cerrá las otras pestañas de Ritmo antes de actualizar.';notify();}});
  async function check(){if(!registration)await init();if(registration){await registration.update();info=registration.waiting?'Actualización disponible.':'Comprobación solicitada. Si hay una nueva versión, se avisará al descargarla.';notify();}}
  async function activate(){registration=await navigator.serviceWorker.getRegistration();if(!registration?.waiting)throw Error('Todavía no hay una versión nueva lista.');refreshRequested=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
  root.RitmoPWA={init,check,activate,status:()=>({message:info,waiting:!!registration?.waiting})};
  if(document.readyState==='complete')init();else addEventListener('load',init,{once:true});
})(globalThis);
