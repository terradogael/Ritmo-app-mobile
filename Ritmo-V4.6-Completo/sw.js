/* Generado con tools/build-sw.py. Caché exclusivamente de recursos públicos locales. */
'use strict';
const ASSETS={
  "assets/atom-dia.webp": "7973f6fd76fb1a5e71075d435394ff906fe03c7345edf2ec73103e04afb5816f",
  "assets/atom-noche.webp": "8c6c985085c42af565e661d34f0c3d583afc333c2f358649f54ed241dda8e24e",
  "assets/icono-192.png": "d9c1fdff1304c101a92bc04493be4464d65068cc4169ff9ff96f313166d0b038",
  "assets/icono-512.png": "0eca2033fcc71cf1c22f75d41af2662d1ce4b2137116c98d6edfc51e4fca1e60",
  "assets/icono-maskable-512.png": "ee337a03c61ce165b8d8e6d5ee43a5bdb243675b5b1573088ec26cbc63ad98c5",
  "assets/logo-dia.svg": "6982030909f4c215fa951a71a706d08a71a3a4daa58c60824d9a961699596dc0",
  "assets/logo-noche.svg": "7973902abd41114d9596cf763225f1289b9a403066fab799a325c91501f6417a",
  "css/local.css": "f05f25768a70ec621e12e21def668456bb571263f21ad4cd318ba3cf3faf9e17",
  "css/styles.css": "bdc80e93354a35df70d22fd56d7c478733ac0408d513999de012f1f308661cae",
  "index.html": "fa2894cf3b2f1a2d14d11182aded408586cf96bb820d8b97742e31f559559595",
  "js/app.js": "30614d0a6cf828ee82e916276a98b3f1a03cc67f1753f0c6b3d3483bdf02ec66",
  "js/core.js": "759d7b20d2e25c9b0d84f6475e8fef452380dfdafa30340940311d104b11bc77",
  "js/demo.js": "88d1128b3ce7aadeadc30081ebb9d40ec27958348cd8abc87705fa472232e972",
  "js/google-api.js": "586979618db78f66c74b47348433c5033ea612f8a0535f95bf5c4596e3ace23f",
  "js/google-auth.js": "ddbdaf7f9c7e5c5a6b880098ee6e4b81e3e260c15b287833d37203748e4f6cc8",
  "js/google-config.js": "d5addb4b265ca4195032ee10e566faabbd7d5c1310ba2898e968fa97eac0f390",
  "js/google-domain-sync.js": "c2639cc186e164a00b9532f0bc7b9712e1aa1222c5233bc42c0e7765903914da",
  "js/google-ui.js": "7a900689116294e1c57527d92841d5b73590b3a1e01b72a5f4af7958272dca47",
  "js/metrics.js": "ac1f845e28bae5492ab6342b296b69c48ab3e391ad234c15804361a2a35b05af",
  "js/pwa.js": "9a7c986e92b11ecc29682ad38001f82634e034c664ed603052d1d3a76da40573",
  "js/storage.js": "97cd757c1bf8bf486601439b6f16468c39b8ed61e6a004cb185390569d78abe9",
  "js/sync-engine.js": "38ffcbdbbb80b11f0e6beb4d035f3afb774875fe6e8b06643a9c31c1ff2f0689",
  "js/sync-model.js": "ce792ebcd714f21f6b442c4a4207e53eb499e6a3a33597d92bc86d64ad542fd2",
  "js/timer.js": "2ceda638221e062ca7bf8febc6f36999da2296b2dd61d771ec2c8e9016575f97",
  "manifest.webmanifest": "e1a70f0f415c852a5f9ad5f6a9c593366a9e476c5e7da792c91ce8f1c91b4322"
};
const PREFIX='ritmo-static-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'949b0ad5e4ae1723';
const urlFor=path=>new URL(path,self.registration.scope).href;
async function verified(path){
  const response=await fetch(new Request(urlFor(path),{cache:'reload',credentials:'omit'}));
  if(!response.ok||response.type==='opaque')throw Error('Recurso no disponible');
  const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==ASSETS[path])throw Error('Versión incompleta o archivos modificados: regenerá sw.js');
  return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{const results=await Promise.allSettled(Object.keys(ASSETS).map(async path=>{await cache.put(urlFor(path),await verified(path));}));if(results.some(r=>r.status==='rejected'))throw Error('Descarga incompleta');}
  catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='ACTIVATE_UPDATE')return;
  event.waitUntil((async()=>{
    const windows=(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(c=>c.url.startsWith(self.registration.scope));
    if(windows.length>1){event.source?.postMessage({type:'UPDATE_BLOCKED'});return;}
    await self.skipWaiting();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||request.headers.has('Authorization')||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  let path=url.pathname.slice(scope.pathname.length);
  if(path===''&&request.mode==='navigate')path='index.html';
  if(!Object.hasOwn(ASSETS,path)||url.search)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),stored=await cache.match(urlFor(path));
    if(stored)return stored;
    try{const response=await verified(path);await cache.put(urlFor(path),response.clone());return response;}
    catch{return new Response('Ritmo: recurso no disponible. Volvé a conectarte y buscá actualizaciones.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
  })());
});
