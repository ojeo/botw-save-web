/* Regression test for shared browser % setting and BOTW inventory edits. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('web-dist/index.html','utf8');
assert.match(html,/js\/bulk-percent\.js/);
assert.match(html,/js\/web-bulk\.js/);
assert.ok(!fs.readFileSync('web-dist/js/web-bridge.js','utf8').includes(
  "b=byId('bulk-fill-items');if(b)b.addEventListener"),'No legacy double-click listener');
const common=fs.readFileSync('web-dist/js/bulk-percent.js','utf8');
const botw=fs.readFileSync('web-dist/js/web-bulk.js','utf8');
const data={};
const store={getItem(k){return data[k]??null},setItem(k,v){data[k]=String(v)}};
const changed=[];
function make(tag){return{
  tagName:tag,id:'',textContent:'',value:'',children:[],events:{},style:{},
  appendChild(child){this.children.push(child);child.parentNode=this},
  insertBefore(child,next){const i=this.children.indexOf(next);this.children.splice(i<0?0:i,0,child);child.parentNode=this},
  addEventListener(k,f){const old=this.events[k];this.events[k]=old?function(...args){old(...args);f(...args)}:f},
  setAttribute(k,v){this[k]=v},
  querySelector(k){return k==='input'?this.children.find(x=>x.tagName==='input'):null}
};}
function inventoryInput(name,max,value){
 const x=make('input');
 x.id=name;x.maxValue=max;x.value=String(value);
 x.dispatchEvent(){changed.push({id:this.id,value:this.value})};
 return x;
}
const fields=[
  inventoryInput('number-item1',999,1),
  inventoryInput('number-item2',3,3),
  inventoryInput('number-item3',999999,1),
];
const materials=make('div');materials.querySelectorAll=()=>fields;
const weapons=make('div');
const weapon=inventoryInput('number-item4',70,9);
weapons.querySelectorAll=()=>[weapon];
const button=make('button');button.id='bulk-fill-items';
const parent=make('div');parent.appendChild(button);
const nav=make('button');nav.className='tab-button';
const state=make('span');
const dom={
  getElementById(id){return ({
    'bulk-fill-items':button,'container-materials':materials,
    'container-weapons':weapons,'save-state':state
  })[id]},
  querySelectorAll(sel){return sel==='.tab-button'?[nav]:[]},
  createElement:make
};
const win={localStorage:store,currentTab:'materials',alert(){},confirm(){return true},
  addEventListener(n,f){this['handler_'+n]=f}};
const ctx={window:win,document:dom,Number,Uint8Array,Event:function(n){this.type=n},
  setTimeout(f){f()},tempFile:{_u8array:new Uint8Array([1])},alert(){}};
vm.runInNewContext(common,ctx);
vm.runInNewContext(botw,ctx);
assert.equal(win.BulkPercent.get(),100);
win.handler_load();
assert.equal(parent.children.length,2);
const input=parent.children[0].children[1];
assert.equal(input.value,'100');
assert.match(button.textContent,/100%/);
assert.equal(win.BOTWBulkMax.apply('materials').changed,2);
assert.equal(fields[0].value,'999');
assert.equal(fields[1].value,'3');
assert.equal(fields[2].value,'999999');
assert.equal(win.BulkPercent.set(90),true);
assert.equal(data[win.BulkPercent.key],'90');
assert.equal(win.BOTWBulkMax.apply('materials').changed,3);
assert.equal(fields[0].value,'899');
assert.equal(fields[1].value,'2');
assert.equal(fields[2].value,'899999');
assert.equal(win.BOTWBulkMax.apply('weapons').changed,1);
assert.equal(weapon.value,'63');
assert.equal(win.BOTWBulkMax.apply('clothes').supported,false);
assert.equal(win.BulkPercent.set(0),false);
assert.equal(win.BulkPercent.set(101),false);
assert.equal(win.BulkPercent.set(2.5),false);
assert.equal(win.BulkPercent.get(),90);
input.value='75';input.events.change();
assert.equal(data[win.BulkPercent.key],'75');
assert.match(button.textContent,/75%/);
win.currentTab='home';nav.events.click();
assert.equal(button.disabled,true);
win.currentTab='weapons';nav.events.click();
assert.equal(button.disabled,false);

// Reload a fresh page with the same localStorage backing.
const second={window:{localStorage:store,addEventListener(){}},
  document:{createElement:make},Number};
vm.runInNewContext(common,second);
assert.equal(second.window.BulkPercent.get(),75);
assert.equal(second.window.BulkPercent.target(70),52);
assert.equal(second.window.BulkPercent.target(3),2);
console.log('PASS: BOTW saved percentage, numeric caps, input events and browser storage persistence.');
