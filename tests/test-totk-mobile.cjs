/*
 * Mobile TOTK build contract + DOM smoke test.
 * Checks hierarchy and tap navigation with no actual save file.
 */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('web-dist/totk/index.html','utf8');
const css=fs.readFileSync('web-dist/totk/web-mobile.css','utf8');
const script=fs.readFileSync('web-dist/totk/web-mobile.js','utf8');
const converter=fs.readFileSync('convert_full_repo.py','utf8');

assert.match(html,/<meta[^>]*name="viewport"/);
assert.match(html,/web-mobile\.css\?v=2/);
assert.match(html,/web-mobile\.js\?v=2/);
assert.match(html,/<details class="web-warning">/);
assert.match(html,/<summary>本地编辑存档/);
assert.match(html,/id="toolbar"/);
assert.match(html,/id="nav"/);
assert.match(html,/onclick="saveChanges\(\)"/);
assert.match(html,/onclick="closeFile\(\)"/);
assert.match(html,/data-target="master"/);
assert.match(html,/class="nav-link"/);
assert.match(html,/web-totk-bulk\.js/);
assert.ok(!html.includes('maximum-scale=1.0'),'Do not disable browser zoom');
assert.ok(!html.includes('user-scalable=0'),'Do not block pinch zoom');
assert.ok(html.indexOf('zelda-totk.css')<html.indexOf('web-mobile.css'));
assert.ok(converter.includes('totk-mobile.css'));
assert.ok(converter.includes('totk-mobile.js'));
assert.ok(!converter.includes('<div class="web-warning">'));
for(const token of [
  '@media (max-width: 760px)', '#nav .nav-link', 'overflow-x: auto',
  'flex-wrap: nowrap !important', '#toolbar > .row > div:last-child',
  'position: fixed', 'env(safe-area-inset-bottom',
  '#totk-bulk-controls', '.bulk-percent-setting', '.row-item-right',
  '.row-item .btn-menu-floating', 'min-height: 44px',
  '#modal-hash-editor', '.game-selector', '.web-warning'
])assert.ok(css.includes(token),'Missing mobile CSS contract: '+token);

const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
  .map(m=>m[1].split('?')[0]);
assert.ok(scripts.includes('./web-mobile.js'),'Mobile JS must be in HTML sources');
for(const p of scripts) {
  if (/^https?:/.test(p)) continue;
  assert.ok(fs.existsSync('web-dist/totk/'+p),'Missing asset: '+p);
}
new vm.Script(script,{filename:'web-mobile.js'});

// DOM test: enhancer can label nav tiles and create accessible source links.
function node(type) {
  return {
    type,attributes:{},children:[],handlers:{},className:'',textContent:'',
    open:false,
    setAttribute(key,val){this.attributes[key]=val},
    getAttribute(key){return this.attributes[key]},
    appendChild(child){this.children.push(child);child.parent=this},
    addEventListener(type,handler){this.handlers[type]=handler},
    contains(x){return this===x||x.parent===this},
    querySelector(sel){
      if(sel==='.totk-nav-label')return this.children.find(x=>x.className==='totk-nav-label');
      return null;
    },
    getBoundingClientRect(){return {left:100,width:60}},
    scrollTo(options){this.lastScroll=options},
    closest(sel){return sel==='button.nav-link[data-target]'?this:null},
    classList:{contains(name){return name==='active'}}
  }
}
const nav=node('nav'),top=node('row');
const targets=['home','weapons','bows','shields','armors','materials','food','devices','key','horses','master'];
const buttons=targets.map(target=>{const b=node('button');b.setAttribute('data-target',target);b.parent=nav;return b});
nav.querySelectorAll=()=>buttons;
let domReady;
const document={
  readyState:'loading',
  getElementById(key){return key==='nav'?nav:null},
  querySelector(key){return key==='#header-top > .row'?top:null},
  createElement:node,
  addEventListener(type,cb){if(type==='DOMContentLoaded')domReady=cb;this[type]=cb}
};
const window={
  setTimeout(cb){cb()},
  matchMedia(){return {matches:true}}
};
vm.runInNewContext(script,{document,window,Array,Math}, {filename:'web-mobile.js'});
assert.equal(typeof domReady,'function');
domReady();
assert.equal(nav.attributes['aria-label'],'编辑分类，左右滑动查看更多');
for(const b of buttons){
  assert.equal(b.children.length,1);
  assert.ok(b.children[0].textContent.length>0);
  assert.equal(b.attributes['aria-label'],b.children[0].textContent);
}
assert.equal(buttons.length,11);
assert.equal(top.children.length,1,'A compact About menu should be present');
assert.equal(top.children[0].type,'details');
assert.equal(top.children[0].children[1].children.length,3);
nav.handlers.click({target:buttons[3]});
assert.ok(nav.lastScroll,'Tab click should horizontally scroll the category rail');
assert.equal(nav.lastScroll.left>=0,true);
console.log('PASS: mobile markup, accessible scrollable tabs, fixed save bar, editable card layout and responsive assets.');
