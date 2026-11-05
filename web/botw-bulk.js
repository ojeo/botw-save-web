/* BOTW bulk percentage target, preserving native inventory input constraints. */
(function () {
  'use strict';
  var CATEGORIES=['weapons','bows','shields','materials','food','other'];

  function currentCategory() {
    return window.currentTab;
  }

  function apply(category) {
    var result={category:category,percent:BulkPercent.get(),changed:0,skipped:0,
      supported:CATEGORIES.indexOf(category)!==-1};
    if(!result.supported)return result;
    var panel=document.getElementById('container-'+category);
    if(!panel){result.supported=false;return result;}
    var fields=panel.querySelectorAll('input[id^="number-item"]');
    Array.prototype.forEach.call(fields,function(el){
      var max=el.maxValue;
      // Respect maxValue supplied by upstream's _getItemMaximumQuantity().
      // Never guess the cap from the category or modify select-only dye values.
      var value=BulkPercent.target(max);
      if(value===null||!Number.isFinite(Number(el.value))){result.skipped++;return;}
      if(Number(el.value)!==value){
        el.value=String(value);
        el.dispatchEvent(new Event('change',{bubbles:true}));
        result.changed++;
      }
    });
    return result;
  }

  function updateLabel(button){
    button.textContent='当前分类数量/耐久最大化（'+BulkPercent.get()+'%）';
    button.disabled=CATEGORIES.indexOf(currentCategory())===-1;
  }

  function mount(){
    var button=document.getElementById('bulk-fill-items');
    if(!button)return;
    var container=button.parentNode;
    var setting=BulkPercent.createControl('botw-bulk-percent');
    var input=setting.querySelector('input');
    input.addEventListener('change',function(){updateLabel(button)});
    container.insertBefore(setting,button);
    button.addEventListener('click',function(){
      if(typeof tempFile==='undefined'||!tempFile||!(tempFile._u8array instanceof Uint8Array)){
        alert('请先载入 game_data.sav 存档');return;
      }
      var category=currentCategory();
      if(CATEGORIES.indexOf(category)===-1){
        alert('当前分类不能批量修改数量或耐久');return;
      }
      var percent=BulkPercent.get();
      if(percent<100&&!window.confirm('将当前分类设置为最大值的 '+percent+
        '%，可能降低已有数值。确定继续？'))return;
      var result=apply(category);
      var state=document.getElementById('save-state');
      if(state)state.textContent='目标 '+result.percent+'%：修改 '+result.changed+
        ' 项，跳过 '+result.skipped+' 项。请保存存档';
    });
    document.querySelectorAll('.tab-button').forEach(function(tab){
      tab.addEventListener('click',function(){setTimeout(function(){updateLabel(button)},0)});
    });
    updateLabel(button);
  }
  window.BOTWBulkMax={apply:apply,mount:mount};
  window.addEventListener('load',mount);
}());
