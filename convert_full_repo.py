#!/usr/bin/env python3
"""Convert Xunzi229/Botw-Savediter to a standalone static website."""
import pathlib
import shutil
import sys

if len(sys.argv) != 3:
    raise SystemExit("Usage: python3 convert_full_repo.py UPSTREAM OUTPUT")
src = pathlib.Path(sys.argv[1]).resolve()
dst = pathlib.Path(sys.argv[2]).resolve()
app = src / "zelda-botw"
if not (app / "index.html").is_file() or not (app / "js" / "savegame-editor.js").is_file():
    raise SystemExit("Missing upstream editor files")
if dst.exists():
    raise SystemExit("Output exists: " + str(dst))
shutil.copytree(app, dst)
# Never publish sample or personal game saves.
for save in dst.rglob("*.sav"):
    save.unlink()
for icon in dst.rglob("*.icns"):
    icon.unlink()
htmlfile = dst / "index.html"
html = htmlfile.read_text(encoding="utf-8")
base = '<script type="text/javascript" src="js/savegame-editor.js"></script>'
native = '<script type="text/javascript" src="js/native-app.js"></script>'
if base not in html or native not in html:
    raise SystemExit("Upstream script layout changed; refusing to publish")
html = html.replace(base, base + '\n<script src="js/web-download.js"></script>', 1)
html = html.replace(native, '<script src="js/web-bridge.js"></script>', 1)
html = html.replace("</head>", """<style>
#app-titlebar,.window-controls,.titlebar-drag,#show-save-folder,
#backup-manager,#current-save-label {display:none!important}
body{padding-top:0!important}
#dragzone{padding:32px 20px!important}
#editor-commandbar{flex-wrap:wrap;gap:10px;padding:12px 0}
.web-notice{max-width:1050px;margin:14px auto;padding:13px 18px;
  border-radius:10px;background:#ecf4ff;color:#23415c}
@media(max-width:700px){#header-top h1{font-size:20px}}
</style></head>""", 1)
html = html.replace("<body>", '<body><div class="web-notice">纯 Web 编辑器：本地读取存档，不上传服务器。修改前请用 JKSV 备份；点击保存后下载新文件，再手动放回原槽位。</div>', 1)
htmlfile.write_text(html, encoding="utf-8")
(dst / "js" / "web-download.js").write_text("""
(function(){
  'use strict';
  MarcFile.prototype.save=function(){
    if(!(this._u8array instanceof Uint8Array)||!this._u8array.length)
      throw new Error('未加载有效存档');
    var blob=new Blob([this._u8array],{type:'application/octet-stream'});
    var url=URL.createObjectURL(blob);
    var link=document.createElement('a');
    link.href=url;link.download='game_data.sav';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},60000);
  };
})();
""", encoding="utf-8")
(dst / "js" / "web-bridge.js").write_text("""
(function(){
 'use strict';
 function byId(name){return document.getElementById(name)}
 function loaded(){return typeof tempFile!=='undefined'&&tempFile&&tempFile._u8array}
 function mark(message){var el=byId('save-state');if(el)el.textContent=message||'有未保存修改'}
 function change(id,value){var el=byId('number-'+id)||byId('select-'+id);if(el){
   el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}))}}
 window.saveChanges=function(){
   if(!loaded())return alert('请先载入 game_data.sav');
   try{SavegameEditor.save();tempFile.save();mark('已生成下载文件')}
   catch(err){alert('保存失败：'+err.message)}
 };
 window.addEventListener('load',function(){
   var b=byId('bulk-max-stats');if(b)b.addEventListener('click',function(){
     if(!loaded())return alert('请先载入存档');
     if(!confirm('确定最大化卢比、怪币、生命、精力和英杰之力？建议先备份。'))return;
     change('rupees',999999);change('mons',999999);
     change('max-hearts',120);change('max-stamina',1161527296);
     change('relic-gerudo',99);change('relic-goron',99);change('relic-rito',99);
     mark();
   });
   b=byId('bulk-fill-items');if(b)b.addEventListener('click',function(){
     if(!loaded())return alert('请先载入存档');
     var tab=window.currentTab;
     if(['home','horses','master'].indexOf(tab)!==-1)return alert('请先选择物品分类');
     var panel=byId('container-'+tab);if(!panel)return;
     var count=0;
     panel.querySelectorAll('input[id^="number-item"]').forEach(function(el){
       var max=['weapons','bows','shields'].indexOf(tab)!==-1?99999:999;
       if(Number.isFinite(el.maxValue))max=Math.min(max,el.maxValue);
       el.value=String(max);el.dispatchEvent(new Event('change',{bubbles:true}));count++;
     });mark('已修改 '+count+' 项，保存以下载');
   });
   b=byId('reset-amiibo-cooldown');if(b)b.addEventListener('click',function(){
     if(!loaded())return alert('请先载入存档');
     var hash=0x0a577f65;
     if(SavegameEditor._searchHash(hash)===false)return alert('没有 Amiibo 冷却字段');
     SavegameEditor._writeValueAtHash(hash,19700101);mark();
   });
   var search=byId('item-search');
   function filter(){
     var panel=byId('container-'+window.currentTab);if(!panel||!search)return;
     var q=search.value.trim().toLowerCase();
     Array.prototype.forEach.call(panel.children,function(el){
       el.style.display=(!q||el.textContent.toLowerCase().indexOf(q)!==-1)?'':'none'
     });
   }
   if(search)search.addEventListener('input',filter);
   document.querySelectorAll('.tab-button').forEach(function(el){
     el.addEventListener('click',function(){setTimeout(filter,0)})
   });
   var ed=byId('the-editor');if(ed){
     ed.addEventListener('input',function(){mark()});
     ed.addEventListener('change',function(){mark()});
   }
   var file=byId('file-load');if(file)file.setAttribute('accept','.sav,application/octet-stream');
   var demo=byId('demo');if(demo)demo.remove();
   var back=document.querySelector('button[onclick="closeFileConfirm()"]');
   if(back)back.textContent='返回选择存档';
 });
})();
""", encoding="utf-8")
if (src / "LICENSE").is_file():
    shutil.copy2(src / "LICENSE", dst / "LICENSE")
(dst / ".nojekyll").write_text("", encoding="utf-8")
(dst / "README-WEB.md").write_text(
    "Static Web build from Xunzi229/Botw-Savediter (MIT). "
    "Edit game_data.sav locally. No server upload. "
    "Desktop folder management is not available. Keep an original JKSV backup.\n",
    encoding="utf-8")
print("Generated:", dst)
