const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const output=path.resolve('web-dist');
const botw=fs.readFileSync(path.join(output,'index.html'),'utf8');
const totk=fs.readFileSync(path.join(output,'totk','index.html'),'utf8');
assert.match(botw,/totk\//,'BOTW must link to TOTK');
assert.match(totk,/\.\.\/.*旷野之息/,'TOTK must link back to BOTW');
assert.match(totk,/web-totk\.js/);
assert.match(totk,/web-download\.js/);
assert.match(totk,/zelda-totk\.locale\.js/,'TOTK language loader expected');
assert.ok(fs.existsSync(path.join(output,'savegame-editor.js')));
assert.ok(fs.existsSync(path.join(output,'totk','locale','zelda-totk.locale.zh.js')));
assert.ok(fs.existsSync(path.join(output,'totk','zelda-totk.hashes.csv')));
assert.ok(fs.existsSync(path.join(output,'totk','lib','fflate.min.js')));
assert.ok(fs.existsSync(path.join(output,'totk','lib','FFLATE-LICENSE')));
assert.ok(!totk.includes('https://unpkg.com/fflate'),'Use local fflate asset');
for(const src of totk.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)){
  const value=src[1].split('?')[0];
  if(/^(https?:|\/\/)/.test(value))throw Error('External script dependency: '+value);
  assert.ok(fs.existsSync(path.resolve(output,'totk',value)),
    'Missing JS dependency '+value);
}
assert.match(fs.readFileSync(path.join(output,'totk','zelda-totk.js'),'utf8'),/lang:'zh'/,
  'Simplified Chinese must be default');
assert.match(fs.readFileSync(path.join(output,'totk','web-totk.js'),'utf8'),/SavegameEditor\.save\(\)/);
assert.match(fs.readFileSync(path.join(output,'totk','web-totk.js'),'utf8'),/tempFile\.save\(\)/);
for(const folder of [output,path.join(output,'totk')]){
  assert.ok(!fs.existsSync(path.join(folder,'progress.sav')),
    'Do not publish game saves');
}
// JavaScript syntax validation for all explicit script sources.
const allSrc=[...totk.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)];
for(const result of allSrc){
  const value=result[1].split('?')[0];
  const source=fs.readFileSync(path.resolve(output,'totk',value),'utf8');
  new vm.Script(source,{filename:value});
}
console.log('PASS: TOTK/BOTW navigation, scripts, Chinese, local fflate, safe save import/export.');
