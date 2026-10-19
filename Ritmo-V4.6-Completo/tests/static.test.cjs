const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const[file,sha]of Object.entries(JSON.parse(read('tests/fixtures/visual-sha256.json'))))assert.equal(hash(read(file)),sha,file);
for(const n of fs.readdirSync(path.join(root,'js')).filter(n=>n.endsWith('.js')))assert.equal(cp.spawnSync(process.execPath,['--check',path.join(root,'js',n)]).status,0,n);
const html=read('index.html').toString();for(const m of html.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"#]+)"/g))assert.ok(fs.existsSync(path.join(root,m[1])),m[1]);
const manifest=JSON.parse(read('manifest.webmanifest'));assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'./');assert.ok(html.includes('viewport-fit=cover'));
for(const icon of manifest.icons){const b=read(icon.src);assert.equal(b.readUInt32BE(16)+'x'+b.readUInt32BE(20),icon.sizes);}
const sw=read('sw.js').toString(),assets=JSON.parse(sw.match(/const ASSETS=([\s\S]*?);\nconst PREFIX/)[1]);for(const[f,sha]of Object.entries(assets))assert.equal(hash(read(f)),sha,'SW '+f);
assert.ok(sw.includes("request.headers.has('Authorization')"));assert.ok(sw.includes('url.origin!==scope.origin'));assert.ok(!Object.keys(assets).some(k=>k.includes('tests')||k.endsWith('.json')));
console.log('PASS sintaxis, rutas, 25 hashes SW, iconos, manifest y 10 archivos visuales/config idénticos a V4.5.2');
