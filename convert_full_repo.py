#!/usr/bin/env python3
"""Convert Xunzi229/Botw-Savediter to a standalone static website."""
import pathlib
import shutil
import sys

if len(sys.argv) != 4:
    raise SystemExit("Usage: python3 convert_full_repo.py BOTW_UPSTREAM OUTPUT TOTK_UPSTREAM")
src = pathlib.Path(sys.argv[1]).resolve()
dst = pathlib.Path(sys.argv[2]).resolve()
totk_src = pathlib.Path(sys.argv[3]).resolve()
totk_app = totk_src / "zelda-totk"
if not (totk_app / "index.html").is_file() or not (totk_src / "savegame-editor.js").is_file():
    raise SystemExit("Missing upstream TOTK editor or shared JS library")
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
html = html.replace("<body>", '<body><div class="web-notice">纯 Web 编辑器：本地读取存档，不上传服务器。修改前请用 JKSV 备份；Chrome/Edge 点击保存将弹出另存为；Safari 可能打开分享菜单，请选择存储到文件。请确保保存文件名与原文件一致，再放回原槽位。</div>', 1)
# Preserve the existing BOTW URL and UI, add a clear game selector.
html = html.replace("</head>", """<style>
.game-selector{display:flex;justify-content:center;gap:10px;padding:12px;background:#122944;flex-wrap:wrap}
.game-selector a{color:#fff;text-decoration:none;padding:9px 18px;border:1px solid #7291b7;border-radius:7px}
.game-selector a[aria-current]{background:#eff5ff;color:#183b5c;font-weight:bold}
</style></head>""", 1)
html = html.replace('<body>', '''<body>
<nav class="game-selector" aria-label="游戏切换">
<a href="./" aria-current="page">旷野之息 · BOTW</a>
<a href="./totk/">王国之泪 · TOTK</a>
</nav>
''', 1)
htmlfile.write_text(html, encoding="utf-8")
# The download adapter is maintained as a standalone, independently tested JS file.
shutil.copy2(pathlib.Path(__file__).resolve().parent / "web" / "web-download.js",
             dst / "js" / "web-download.js")
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
   try{
     SavegameEditor.save();
     Promise.resolve(tempFile.save()).then(function(result){
       var filename=(result&&result.filename)||tempFile.fileName||'game_data.sav';
       if(result&&result.method==='cancelled')mark('已取消保存');
       else if(result&&result.method==='picker')mark('已保存：'+filename);
       else if(result&&result.method==='share')mark('分享操作结束：请确认已在系统中存储 '+filename);
       else mark('已开始下载：'+filename);
     }).catch(function(error){
       alert('保存失败：'+(error&&error.message||error));
       mark('保存失败');
     });
   }catch(error){
     alert('保存失败：'+(error&&error.message||error));
     mark('保存失败');
   }
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

# Add the official Tears of the Kingdom editor under /totk/.
totk_target = dst / "totk"
shutil.copytree(totk_app, totk_target)
# Use Marc Robledo's unmodified editor library, but replace its legacy save behavior.
shutil.copy2(totk_src / "savegame-editor.js", dst / "savegame-editor.js")
shutil.copy2(totk_src / "LICENSE", totk_target / "LICENSE")
shutil.copy2(pathlib.Path(__file__).resolve().parent / "web" / "web-download.js",
             totk_target / "web-download.js")
shutil.copy2(pathlib.Path(__file__).resolve().parent / "web" / "totk-bridge.js",
             totk_target / "web-totk.js")
for save_file in totk_target.rglob("*.sav"):
    save_file.unlink()  # Do not publish example progress.sav, caption.sav, or user saves.
totk_index = totk_target / "index.html"
totk_html = totk_index.read_text(encoding="utf-8")
shared_script = '<script type="text/javascript" src="../savegame-editor.js?version=1"></script>'
if shared_script not in totk_html:
    raise SystemExit("TOTK upstream shared script has changed")
totk_html = totk_html.replace(shared_script,
    shared_script + '\n\t<script src="./web-download.js"></script>', 1)
fflate_cdn = '<script src="https://unpkg.com/fflate@0.8.0"></script>'
if fflate_cdn not in totk_html:
    raise SystemExit("TOTK upstream fflate dependency changed")
totk_html = totk_html.replace(fflate_cdn,
    '<script src="./lib/fflate.min.js"></script>', 1)
totk_html = totk_html.replace("</head>",
    '<script src="./web-totk.js"></script>\n'
    '<style>.game-selector{display:flex;justify-content:center;gap:10px;'
    'background:#152943;padding:12px;flex-wrap:wrap}'
    '.game-selector a{color:#fff;text-decoration:none;padding:9px 18px;'
    'border:1px solid #7891ae;border-radius:7px}'
    '.game-selector a[aria-current]{background:#eaf1ff;color:#243f60;font-weight:bold}'
    '.web-warning{padding:12px 20px;background:#fff5db;color:#3d392e;text-align:center}'
    '</style></head>', 1)
totk_html = totk_html.replace("<body>", '''<body>
<nav class="game-selector" aria-label="游戏切换">
<a href="../">旷野之息 · BOTW</a>
<a href="./" aria-current="page">王国之泪 · TOTK</a>
</nav>
<div class="web-warning">王国之泪：选择 JKSV 导出的 slot_0x/progress.sav（或载入备份目录）。
存档只在浏览器中处理；请保留原件。Chrome/Edge 支持另存为，
Safari 支持分享菜单“存储到文件”。</div>
''', 1)
# Chinese by default for new users; stored preferences are still honored.
totk_js_file = totk_target / "zelda-totk.js"
totk_js = totk_js_file.read_text(encoding="utf-8")
default_lang = "lang:'en'"
if default_lang not in totk_js:
    raise SystemExit("TOTK default language setting changed")
totk_js_file.write_text(totk_js.replace(default_lang, "lang:'zh'", 1), encoding="utf-8")
totk_index.write_text(totk_html, encoding="utf-8")
print("TOTK static editor prepared:", totk_target)

print("Generated:", dst)
