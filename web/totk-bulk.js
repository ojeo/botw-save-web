/* TOTK: bulk-set current category to a browser-stored percentage of each
 * item's maximum. Model-based edits only, preserving equipment modifiers.
 */
(function () {
  'use strict';

  var EQUIPMENT = ['weapons', 'bows', 'shields'];
  var COUNTABLE = ['materials', 'food', 'devices', 'key'];

  function canUse(tab) {
    return EQUIPMENT.indexOf(tab) !== -1 || COUNTABLE.indexOf(tab) !== -1;
  }

  function setQuantities(category, result) {
    var pouch = SavegameEditor.pouches && SavegameEditor.pouches[category];
    if (!pouch || !Array.isArray(pouch.items)) return;
    pouch.items.forEach(function (item) {
      if (!item || !item.id ||
          (category === 'key' && Item.KEY_COUNTABLE.indexOf(item.id) === -1) ||
          !Number.isFinite(item.quantity) || item.quantity < 0) {
        result.skipped++;
        return;
      }
      var limit = Item.getMaximumQuantity(item.id);
      // The upstream editor defines per-item caps (medallions, zonaite, etc).
      if (!Number.isInteger(limit) || limit < 1 || limit > 2147483647) {
        result.skipped++;
        return;
      }
      var target = window.BulkPercent.target(limit);
      if (item.quantity !== target) {
        item.quantity = target;
        // Update the model AND its visible input; do not only change the DOM.
        if (item._htmlRow) Pouch.updateItemRow(item);
        result.changed++;
      }
    });
  }

  function setEquipment(category, result) {
    var pouch = SavegameEditor.pouches && SavegameEditor.pouches[category];
    if (!pouch || !Array.isArray(pouch.items)) return;
    pouch.items.forEach(function (item) {
      if (!item || typeof item.getMaximumDurability !== 'function') {
        result.skipped++;
        return;
      }
      var maximum = item.getMaximumDurability();
      // Skip hacked/infinite durability: its 2.1-billion bonus is not a
      // meaningful finite percentage, and must not rewrite existing modifiers.
      if (!Number.isInteger(maximum) || maximum < 1 || maximum > 100000 ||
          !Number.isFinite(item.durability)) {
        result.skipped++;
        return;
      }
      var target = window.BulkPercent.target(maximum);
      if (item.durability !== target) {
        item.durability = target;
        // Preserve modifier, modifierValue, fuse and extra durability.
        if (item._htmlRow) Pouch.updateItemRow(item);
        result.changed++;
      }
    });
  }

  function apply(category) {
    var result = {
      category: category,
      percent: window.BulkPercent.get(),
      changed: 0,
      skipped: 0,
      supported: canUse(category)
    };
    if (!result.supported || !SavegameEditor.pouches) {
      result.supported = false;
      return result;
    }
    if (EQUIPMENT.indexOf(category) !== -1) setEquipment(category, result);
    else setQuantities(category, result);
    // Arrows are part of the Bows tab in TOTK.
    if (category === 'bows') setQuantities('arrows', result);
    return result;
  }

  function updateEnabled(button) {
    var category = UI.getCurrentTab();
    button.disabled = !canUse(category);
    button.textContent = '当前分类数量/耐久最大化（' + window.BulkPercent.get() + '%）';
    button.title = canUse(category)
      ? '按照每件物品的独立最大值计算；装备只调整耐久，不更改原词条'
      : '当前分类没有可批量设置的数量或耐久字段';
  }

  function mount() {
    var toolbar = document.getElementById('toolbar');
    if (!toolbar || document.getElementById('totk-bulk-max')) return;
    var row = document.createElement('div');
    row.id = 'totk-bulk-controls';
    row.className = 'wrapper';
    row.style.cssText = 'padding:8px 12px 12px;display:flex;flex-wrap:wrap;' +
      'align-items:center;justify-content:flex-end;gap:10px;box-sizing:border-box;';
    var setting = window.BulkPercent.createControl('totk-bulk-percent');
    var input = setting.querySelector('input');
    var btn = document.createElement('button');
    btn.id = 'totk-bulk-max';
    btn.type = 'button';
    btn.className = 'btn';
    btn.style.cssText = 'max-width:100%;white-space:normal;min-height:40px;';
    input.addEventListener('change', function () { updateEnabled(btn); });
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
      var percent = window.BulkPercent.get();
      if (percent < 100 && !window.confirm(
        '将当前分类的数量/耐久设为各自最大值的 ' + percent +
        '%，可能降低已有数值。装备词条不会改变。确定继续？')) return;
      var result;
      try {
        result = apply(category);
      } catch (error) {
        UI.toast('批量修改失败：' + (error.message || String(error)), 'totk-bulk-error', 7000);
        return;
      }
      UI.toast('目标 ' + result.percent + '%：修改 ' + result.changed +
        ' 项，跳过 ' + result.skipped + ' 项。请保存存档。', 'totk-bulk', 6000);
    });
    row.appendChild(setting);
    row.appendChild(btn);
    toolbar.appendChild(row);
    var nav = document.getElementById('nav');
    if (nav) nav.addEventListener('click', function () {
      setTimeout(function () { updateEnabled(btn); }, 0);
    });
    updateEnabled(btn);
  }

  window.TOTKBulkMax = { apply: apply, canUse: canUse, mount: mount };
  document.addEventListener('DOMContentLoaded', mount);
}());
