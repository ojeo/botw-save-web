/* Verify percent-based TOTK bulk edits the model without rewriting modifiers. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('web-dist/totk/index.html','utf8');
assert.match(html,/web-bulk-percent\.js/);
assert.match(html,/web-totk-bulk\.js/);
const settings=fs.readFileSync('web-dist/totk/web-bulk-percent.js','utf8');
const source=fs.readFileSync('web-dist/totk/web-totk-bulk.js','utf8');
const memory={};
const storage={getItem(k){return memory[k]??null},setItem(k,v){memory[k]=v}};
const changed=[],notices=[];
let active='home';
const equipment=(id,durability,max,extra={})=>({
  id,durability,modifier:10,modifierValue:3,
  getMaximumDurability(){return max},...extra
});
const pouches={
  weapons:{items:[equipment('sword',3,70),equipment('infinite',2100000000,2100000070)]},
  bows:{items:[equipment('bow',6,50)]},
  shields:{items:[equipment('shield',10,25)]},
  arrows:{items:[{id:'arrow',quantity:4}]},
  materials:{items:[{id:'zonaite',quantity:1},{id:'medallion',quantity:1},{id:'common',quantity:999}]},
  food:{items:[{id:'stew',quantity:1}]},
  devices:{items:[{id:'device',quantity:1}]},
  key:{items:[{id:'key_flag',quantity:-1},{id:'key_counter',quantity:1}]},
  armors:{items:[{id:'armor',quantity:1}]}
};
function el(tag){
 return {
  tagName:tag,children:[],events:{},style:{},textContent:'',value:'',disabled:false,
  appendChild(c){this.children.push(c);c.parentNode=this},
  addEventListener(type,cb){const old=this.events[type];this.events[type]=old?function(...args){old(...args);cb(...args)}:cb},
  setAttribute(k,v){this[k]=v},
  querySelector(q){return q==='input'?this.children.find(x=>x.tagName==='input'):null}
 };
}
const toolbar=el('div'),nav=el('div');
const dom={
  toolbar,nav,
  getElementById(id){return({toolbar,nav})[id]},
  createElement:el,
  addEventListener(name,cb){this['handler_'+name]=cb}
};
const win={
  localStorage:storage,
  addEventListener(name,cb){this['handler_'+name]=cb},
  confirm(){return true},
  alert(){}
};
const context={
  window:win,document:dom,
  Item:{KEY_COUNTABLE:['key_counter'],getMaximumQuantity(id){
    return ({zonaite:999999,medallion:3,key_counter:1000})[id]||999
  }},
  SavegameEditor:{pouches},
  Pouch:{updateItemRow(item){changed.push(item.id)}},
  UI:{getCurrentTab(){return active},toast(...args){notices.push(args)}},
  Number,Uint8Array,
  setTimeout(cb){cb()},
  tempFile:{_u8array:new Uint8Array([1])}
};
vm.runInNewContext(settings,context);
vm.runInNewContext(source,context);
const api=win.TOTKBulkMax,percent=win.BulkPercent;
assert.equal(percent.get(),100);
assert.equal(api.canUse('armors'),false);
assert.equal(api.apply('materials').changed,2);
assert.equal(pouches.materials.items[0].quantity,999999);
assert.equal(pouches.materials.items[1].quantity,3);
assert.equal(pouches.materials.items[2].quantity,999);
assert.equal(api.apply('key').changed,1);
assert.equal(pouches.key.items[0].quantity,-1);
assert.equal(pouches.key.items[1].quantity,1000);
assert.equal(api.apply('weapons').changed,1);
assert.equal(pouches.weapons.items[0].durability,70);
assert.equal(pouches.weapons.items[0].modifier,10);
assert.equal(pouches.weapons.items[0].modifierValue,3);
assert.equal(pouches.weapons.items[1].durability,2100000000);

assert.equal(percent.set(90),true);
assert.equal(memory[percent.key],'90');
assert.equal(api.apply('materials').changed,3);
assert.equal(pouches.materials.items[0].quantity,899999);
assert.equal(pouches.materials.items[1].quantity,2);
assert.equal(pouches.materials.items[2].quantity,899);
assert.equal(api.apply('bows').changed,2);
assert.equal(pouches.bows.items[0].durability,45);
assert.equal(pouches.arrows.items[0].quantity,899);
assert.equal(api.apply('weapons').changed,1);
assert.equal(pouches.weapons.items[0].durability,63);
assert.equal(pouches.weapons.items[0].modifierValue,3);
assert.equal(api.apply('shields').changed,1);
assert.equal(pouches.shields.items[0].durability,22);
assert.equal(api.apply('key').changed,1);
assert.equal(pouches.key.items[0].quantity,-1);
assert.equal(pouches.key.items[1].quantity,900);
assert.equal(api.apply('armors').supported,false);

dom.handler_DOMContentLoaded();
assert.equal(toolbar.children.length,1,'Controls mounted');
const row=toolbar.children[0];
const button=row.children[1];
const input=row.children[0].children[1];
assert.equal(button.id,'totk-bulk-max');
assert.match(button.textContent,/90%/);
active='materials';
nav.events.click();
assert.equal(button.disabled,false);
input.value='75';
input.events.change();
assert.equal(percent.get(),75);
assert.equal(memory[percent.key],'75');
assert.match(button.textContent,/75%/);
active='horses';nav.events.click();
assert.equal(button.disabled,true);
active='weapons';nav.events.click();button.events.click();
assert.ok(notices.length>0);
assert.ok(changed.length>0);
console.log('PASS: TOTK quantity/durability percent, finite caps, modifiers, key flags and persisted UI.');
