"""Regenerar después de modificar recursos estáticos; no usa paquetes externos."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent.parent
files=[root/'index.html',root/'manifest.webmanifest']
for folder in ['js','css','assets']:
 files+=sorted((root/folder).glob('*'))
assets={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
serialized=json.dumps(assets,ensure_ascii=False,sort_keys=True,indent=2)
build=hashlib.sha256(serialized.encode()).hexdigest()[:16]
template=(root/'tools/sw-template.txt').read_text()
(root/'sw.js').write_text(template.replace('__ASSETS__',serialized).replace('__BUILD__',build))
print('Service worker:',build,'·',len(assets),'recursos')
