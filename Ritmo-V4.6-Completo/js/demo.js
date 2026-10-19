/* Ejemplos aislados: nunca se cargan en los datos personales por defecto. */
(function(C){
"use strict";
  function legacyDemo(today) {
const {addDays,weekDates}=C;
    const habits = [
      { id: 'leer', name: 'Leer 20 páginas', icon: 'book', days: [0,1,2,3,4,5,6], done: true, rate: 92, streak: 12 },
      { id: 'gym', name: 'Ir al gimnasio', icon: 'gym', days: [0,2,4], done: false, rate: 85, streak: 8 },
      { id: 'meditar', name: 'Meditar 10 minutos', icon: 'leaf', days: [0,1,2,3,4,5,6], done: false, rate: 78, streak: 6 },
      { id: 'agua', name: 'Tomar 2L de agua', icon: 'water', days: [0,1,2,3,4,5,6], done: true, rate: 71, streak: 4 },
      { id: 'caminar', name: 'Caminar 30 minutos', icon: 'steps', days: [0,1,2,3,4,5,6], done: false, rate: 82, streak: 7 },
      { id: 'creatina', name: 'Tomar creatina', icon: 'bolt', days: [0,1,2,3,4,5,6], done: true, rate: 96, streak: 18 },
      { id: 'escribir', name: 'Escribir el diario', icon: 'edit', days: [0,2,4], done: false, rate: 68, streak: 3, archived: true },
    ].map(h => ({ archived: false, ...h }));
    // Cada fecha guarda su denominador propio. Nunca se infiere del listado actual.
    const history = {};
    for (let offset = -400; offset < 0; offset++) {
      const day = addDays(today, offset), seed = Math.abs(offset * 17 + 13);
      const total = seed % 19 === 0 ? 0 : 4 + seed % 4;
      history[day] = { date: day, total, completed: total ? seed % (total + 1) : 0 };
    }
    const samples = [[0,5],[1,5],[5,5],[2,4],[4,5],[3,10],[0,0]];
    weekDates(today).forEach((day, i) => {
      if (day < today) history[day] = { date: day, completed: samples[i][0], total: samples[i][1] };
    });
    const tasks = [
      {id:'t1',name:'Estudiar Algoritmos',subject:'Algoritmos',offset:0,minutes:45,done:false},
      {id:'t2',name:'TP Bases de Datos',subject:'Sistemas de Información',offset:0,minutes:60,done:false},
      {id:'t3',name:'Leer teoría',subject:'Sistemas de Información',offset:0,minutes:30,done:true},
      {id:'t4',name:'Revisar ejercicios',subject:'Algoritmos',offset:1,minutes:60,done:false},
      {id:'t5',name:'Repasar memoria y buses',subject:'Arquitectura',offset:4,minutes:40,done:false},
      {id:'t6',name:'Entregar práctica de HTML',subject:'Desarrollo Web',offset:-1,minutes:50,done:true},
      {id:'t7',name:'Completar apuntes',subject:'Arquitectura',offset:-2,minutes:20,done:false},
      {id:'t8',name:'Resolver guía de práctica',subject:'Algoritmos',offset:3,minutes:45,done:false},
      {id:'t9',name:'Leer unidad de redes',subject:'Arquitectura',offset:-3,minutes:25,done:true},
      {id:'t10',name:'Revisar modelo entidad-relación',subject:'Sistemas de Información',offset:-4,minutes:30,done:true},
      {id:'t11',name:'Maquetar portada',subject:'Desarrollo Web',offset:-5,minutes:40,done:true},
      {id:'t12',name:'Resolver pseudocódigo',subject:'Algoritmos',offset:-6,minutes:35,done:true},
    ].map(t => ({...t, due:addDays(today,t.offset)}));
    const exams = [
      {id:'e1',name:'Algoritmos',title:'Primer parcial',type:'Parcial',offset:5,time:'10:00',topics:['Recursión','Estructuras de datos','Complejidad'],preparation:['repasado','estudiando','pendiente']},
      {id:'e2',name:'Sistemas de Información',title:'Parcial integrador',type:'Parcial',offset:29,time:'14:00',topics:['Modelado de datos','Procesos de negocio','Diagramas'],preparation:['repasado','repasado','pendiente']},
      {id:'e3',name:'Arquitectura de Computadores',title:'Final regular',type:'Final',offset:40,time:'10:00',topics:['Organización del sistema','Memoria','Entrada/Salida'],preparation:['pendiente','pendiente','pendiente']},
      {id:'e4',name:'Desarrollo Web',title:'Primer parcial',type:'Parcial',offset:-7,time:'09:00',topics:['HTML semántico','CSS responsive','Accesibilidad'],preparation:['repasado','repasado','repasado']},
    ].map(e => ({...e,due:addDays(today,e.offset)}));
    return {today, habits, history, tasks, exams, preferences:{sounds:false,notifications:false,motion:true},googleDemo:false};
  }

function makeDemo(){
 const old=legacyDemo(C.today()),s=C.createState(C.addDays(C.today(),-30));s.today=C.today();
 s.habits=old.habits.map(h=>({...h,done:undefined,rate:undefined,streak:undefined,emoji:'',createdOn:s.startedOn,deletedAt:null,versions:[{from:s.startedOn,days:h.days,active:!h.archived}]}));
 C.ensureDays(s);let n=0;for(const r of Object.values(s.history)){for(const h of Object.values(r.items)){h.done=(n++%3)!==0;}}
 for(const h of old.habits)if(s.history[s.today]?.items[h.id])s.history[s.today].items[h.id].done=h.done;
 s.tasks=old.tasks.map(t=>({...t,description:'',completedAt:t.done?new Date().toISOString():null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
 s.exams=old.exams.map(e=>({...e,topicIds:e.topics.map(()=>C.uid('topic'))}));C.validate(s);return s;
}

C.makeDemo=makeDemo;
})(RitmoCore);
