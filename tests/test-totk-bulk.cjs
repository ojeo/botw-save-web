/* Verify the real TOTK bulk script acts on the pouch data model,
   not merely on rendered form controls. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const html=fs.readFileSync('web-dist/totk/index.html','utf8');
assert.match(html,/web-totk-bulk\.js/,'TOTK page must include new bulk button logic');
const source=fs.readFileSync('web-dist/totk/web-totk-bulk.js','utf8');
const updated=[];
const notices=[];
const equipmentChanged=[];
let active='home';
const pouches={
  weapons:{items:[{id:'sword',durability:2},{id:'sword2',durability:9}]},
  bows:{items:[{id:'bow',durability:1}]},
  shields:{items:[{id:'shield',durability:3}]},
  arrows:{items:[{id:'arrow1',quantity:10}]},
  materials:{items:[
    {id:'zonaite',quantity:1},
    {id:'medallion',quantity:1},
    {id:'common',quantity:999}
  ]},
  food:{items:[{id:'applePie',quantity:2}]},
  devices:{items:[{id:'zonai',quantity:3}]},
  key:{items:[
    {id:'key_boolean',quantity:-1},
    {id:'key_boolean_two',quantity:1},
    {id:'key_counter',quantity:12}
  ]},
  armors:{items:[{id:'armor',quantity:1}]}
};
const mockElements={};
function element(tag){
  return {
    tag,id:'',type:'',title:'',textContent:'',disabled:false,
    className:'',style:{cssText:''},children:[],events:{},
    addEventListener(type,cb){this.events[type]=cb},
    appendChild(c){this.children.push(c)},
  };
}
const toolbar=element('div'),nav=element('div');
mockElements.toolbar=toolbar;mockElements.nav=nav;
const sandbox={
  document:{
    addEventListener(type,cb){this[type]=cb},
    getElementById(id){if(id==='totk-bulk-max')return undefined;return mockElements[id]},
    createElement:element
  },
  window:{confirm(){return true}},
  Item:{
    KEY_COUNTABLE:['key_counter'],
    getMaximumQuantity(id){
      return ({zonaite:999999,medallion:3,key_counter:1000})[id]||999
    }
  },
  SavegameEditor:{
    pouches,
    setInfiniteDurability(item){
      if(item.infinite)return false;
      item.infinite=true;
      equipmentChanged.push(item.id);
      return true;
    }
  },
  Pouch:{updateItemRow(item){updated.push(item.id)}},
  UI:{getCurrentTab(){return active},toast(...args){notices.push(args)}},
  Uint8Array,Number,
  setTimeout(fn){fn()},
  tempFile:{_u8array:new Uint8Array([0,1,2,3])}
};
vm.runInNewContext(source,sandbox,{filename:'web-totk-bulk.js'});
const api=sandbox.window.TOTKBulkMax;
assert.equal(api.canUse('materials'),true);
assert.equal(api.canUse('armors'),false);
assert.equal(api.canUse('home'),false);
assert.equal(api.apply('materials').changed,2);
assert.equal(pouches.materials.items[0].quantity,999999);
assert.equal(pouches.materials.items[1].quantity,3);
assert.equal(pouches.materials.items[2].quantity,999);
assert.deepEqual(updated.slice(0,2),['zonaite','medallion']);
assert.equal(api.apply('materials').changed,0,'Must be idempotent');
assert.equal(api.apply('key').changed,1,'Skip noncountable key item flags');
assert.equal(pouches.key.items[0].quantity,-1);
assert.equal(pouches.key.items[1].quantity,1);
assert.equal(pouches.key.items[2].quantity,1000);
assert.equal(api.apply('bows').changed,2,'Bows tab also includes arrow stacks');
assert.equal(pouches.arrows.items[0].quantity,999);
assert.equal(pouches.bows.items[0].infinite,true);
assert.equal(api.apply('weapons').changed,2);
assert.equal(api.apply('shields').changed,1);
assert.equal(api.apply('food').changed,1);
assert.equal(api.apply('devices').changed,1);
assert.equal(api.apply('armors').supported,false,'Armor levels should not be modified');

sandbox.document.DOMContentLoaded();
assert.equal(toolbar.children.length,1,'Bulk commandbar must be mounted');
const button=toolbar.children[0].children[0];
assert.equal(button.id,'totk-bulk-max');
assert.equal(button.textContent,'当前分类数量/耐久最大化');
assert.equal(button.disabled,true,'Home tab must disable bulk button');
active='materials';
nav.events.click();
assert.equal(button.disabled,false);
active='horses';
nav.events.click();
assert.equal(button.disabled,true,'Unsupported category must disable bulk action');
active='weapons';
nav.events.click();
button.events.click();
assert.ok(notices.length>0,'Bulk action must show feedback');
console.log('PASS: TOTK bulk quantity caps, native infinite durability, arrows, key flags and UI controls.');
