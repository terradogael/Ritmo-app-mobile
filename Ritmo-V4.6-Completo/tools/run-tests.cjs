/* node tools/run-tests.cjs [--browser]. Playwright sólo es dependencia de pruebas. */
const cp=require('node:child_process'),path=require('node:path');
const suites=['static','core','timer-metrics','migration','auth','sync','domain-sync','edge-cases'];
if(process.argv.includes('--browser'))suites.push('regression','browser','google-browser','pwa');
let failed=0;for(const name of suites){console.log('\nPRUEBA: '+name);const result=cp.spawnSync(process.execPath,[path.join(__dirname,'../tests',name+'.test.cjs')],{stdio:'inherit',env:process.env});if(result.status!==0)failed++;}
console.log('\nRESULTADO: '+(suites.length-failed)+'/'+suites.length+' suites aprobadas.');process.exitCode=failed?1:0;
