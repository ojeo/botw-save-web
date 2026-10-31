/* TOTK: bulk-maximize the current inventory category.
 * Use TOTK's own pouch models and save pipeline; never patch raw offsets here.
 * Equipment uses its engine-supported "infinite durability" modifier.
 */
(function () {
  'use strict';

  var EQUIPMENT = ['weapons', 'bows', 'shields'];
  var COUNTABLE = ['materials', 'food', 'devices', 'key'];

  function canUse(tab) {
    return EQUIPMENT.indexOf(tab) !== -1 || COUNTABLE.indexOf(tab) !== -1;
  }

  function maximizeQuantities(category) {
    var pouch = SavegameEditor.pouches && SavegameEditor.pouches[category];
    if (!pouch || !Array.isArray(pouch.items)) return 0;
    var count = 0;
    pouch.items.forEach(function (item) {
      if (!item || !item.id) return;
      // Most "key" items are Boolean possession flags; the native editor
      // stores their quantity as -1. They must never be changed to 999.
      if (category === 'key' && Item.KEY_COUNTABLE.indexOf(item.id) === -1)
        return;
      if (!Number.isFinite(item.quantity) || item.quantity < 0) return;
      var limit = Item.getMaximumQuantity(item.id);
      // Honor per-item caps: e.g. travel medallions, korok seeds, zonaite.
      if (!Number.isInteger(limit) || limit < 1 || limit > 2147483647) return;
      if (item.quantity !== limit) {
        item.quantity = limit;
        // Refresh the actual model-backed input; merely setting input.value
        // does not reliably update TOTK's saved pouch data.
        Pouch.updateItemRow(item);
        count++;
      }
    });
    return count;
  }

  function maximizeEquipment(category) {
    var pouch = SavegameEditor.pouches && SavegameEditor.pouches[category];
    if (!pouch || !Array.isArray(pouch.items)) return 0;
    var count = 0;
    pouch.items.forEach(function (item) {
      if (item && SavegameEditor.setInfiniteDurability(item)) count++;
    });
    return count;
  }

  function apply(category) {
    if (!canUse(category)) return { category: category, changed: 0, supported: false };
    if (!SavegameEditor.pouches) return { category: category, changed: 0, supported: false };
    var changed = EQUIPMENT.indexOf(category) !== -1
      ? maximizeEquipment(category)
      : maximizeQuantities(category);
    // The Bows tab also displays arrows in the native TOTK editor.
    // Include the arrow stack when batch processing the Bows category.
    if (category === 'bows') changed += maximizeQuantities('arrows');
    return { category: category, changed: changed, supported: true };
  }

  function updateEnabled(button) {
    var category = UI.getCurrentTab();
    button.disabled = !canUse(category);
    var help = {
      weapons: '将当前武器设为无限耐久（会替换原有武器词条）',
      bows: '将当前弓设为无限耐久（会替换原有弓词条），箭矢数量设为允许上限',
      shields: '将当前盾牌设为无限耐久（会替换原有盾牌词条）',
      materials: '将材料数量设为各物品允许的最大值',
      food: '将料理数量设为各物品允许的最大值',
      devices: '将左纳乌装置数量设为各物品允许的最大值',
      key: '仅修改可以计数的重要物品，不改变持有标志'
    };
    button.title = help[category] || '当前分类无可批量修改的数量或耐久字段';
  }

  function mount() {
    var toolbar = document.getElementById('toolbar');
    if (!toolbar || document.getElementById('totk-bulk-max')) return;
    var row = document.createElement('div');
    row.id = 'totk-bulk-controls';
    row.className = 'wrapper';
    row.style.cssText = 'padding:8px 12px 12px;text-align:right;box-sizing:border-box;';
    var btn = document.createElement('button');
    btn.id = 'totk-bulk-max';
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = '当前分类数量/耐久最大化';
    btn.style.cssText = 'max-width:100%;white-space:normal;min-height:38px;';
    btn.addEventListener('click', function () {
      if (typeof tempFile === 'undefined' || !tempFile ||
          !(tempFile._u8array instanceof Uint8Array) ||
          !SavegameEditor.pouches) {
        UI.toast('请先载入 progress.sav 存档', 'totk-bulk', 5000);
        return;
      }
      var category = UI.getCurrentTab();
      if (!canUse(category)) {
        UI.toast('当前分类无可批量修改的数量/耐久字段', 'totk-bulk', 5000);
        return;
      }
      if (EQUIPMENT.indexOf(category) !== -1 &&
          !window.confirm('将此分类的装备设置为无限耐久，会覆盖原有的攻击力、连射等词条效果。建议先备份 progress.sav。确定继续？')) {
        return;
      }
      var result;
      try {
        result = apply(category);
      } catch (error) {
        UI.toast('批量修改失败：' + (error.message || String(error)), 'totk-bulk-error', 7000);
        return;
      }
      UI.toast('当前分类完成最大化：修改 ' + result.changed + ' 项。请点击“保存修改”导出存档。',
        'totk-bulk', 6000);
    });
    row.appendChild(btn);
    toolbar.appendChild(row);
    var nav = document.getElementById('nav');
    if (nav) {
      nav.addEventListener('click', function () {
        setTimeout(function () { updateEnabled(btn); }, 0);
      });
    }
    updateEnabled(btn);
  }

  // Exposed for a deterministic regression test without a browser.
  window.TOTKBulkMax = { apply: apply, canUse: canUse, mount: mount };
  document.addEventListener('DOMContentLoaded', mount);
}());
