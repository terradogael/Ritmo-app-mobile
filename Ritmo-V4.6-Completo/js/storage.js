/* Una única puerta de acceso al almacenamiento. */
(function(C){
'use strict';
const {KEY,BACKUP,clone}=C;
const validate=s=>C.validate(s);
const createState=()=>C.createState();
function createStore(storage){
 let expected=null,blocked=false;
 const parse=raw=>C.migrate(JSON.parse(raw));
 return {KEY,BACKUP,
 load(){try{expected=storage.getItem(KEY);if(expected)return {state:parse(expected),error:null};return {state:createState(),error:null};}catch(e){blocked=true;return {state:createState(),error:'No se pudieron leer tus datos. No se sobrescribirá el guardado anterior.'};}},
 save(s,force=false,backup=true){if(blocked&&!force)throw Error('El guardado está bloqueado. Revisá la recuperación en Cuenta.');
 const current=storage.getItem(KEY);if(!force&&current!==expected){blocked=true;throw Error('Hay cambios de otra pestaña. Recargá para usar la versión más reciente.');}
 validate(s);let previousSchema=null;try{previousSchema=JSON.parse(current)?.schemaVersion;}catch{}if(current&&previousSchema&&previousSchema<4&&!storage.getItem(KEY+'.pre-v46'))storage.setItem(KEY+'.pre-v46',current);const next=clone(s);next.revision=Math.max(next.revision,0)+1;next.updatedAt=new Date().toISOString();const raw=JSON.stringify(next);
 if(current&&backup){let valid=true;try{parse(current);}catch{valid=false;}if(!valid&&!force)throw Error('El guardado anterior es inválido. Recuperá una copia antes de continuar.');try{storage.setItem(valid?BACKUP:KEY+'.recovery',current);}catch{throw Error('No se pudo preservar el estado previo. No se guardaron los cambios.');}}
 storage.setItem(KEY,raw);expected=raw;blocked=false;Object.assign(s,{revision:next.revision,updatedAt:next.updatedAt});return true;},
 backup(){const raw=storage.getItem(BACKUP);if(!raw)throw Error('No hay un respaldo anterior disponible.');return parse(raw);},
 migrationBackup(){return storage.getItem(KEY+'.pre-v46');},raw(){return storage.getItem(KEY);},block(){blocked=true;}
 };
}
C.createStore=createStore;
})(RitmoCore);
