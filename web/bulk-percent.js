/* Shared bulk target ratio for BOTW and TOTK.
 * One browser setting for both editors; never saved in the game save itself.
 */
(function () {
  'use strict';
  var KEY = 'zelda-save-editor.bulk-percent.v1';
  var percent = 100;

  function parse(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 100) return null;
    return n;
  }
  try {
    var saved = parse(window.localStorage.getItem(KEY));
    if (saved !== null) percent = saved;
  } catch (_) {
    // Browser storage may be disabled (e.g. private mode). Use 100% for this visit.
  }

  function setPercent(value) {
    var n = parse(value);
    if (n === null) return false;
    percent = n;
    try { window.localStorage.setItem(KEY, String(n)); } catch (_) {}
    return true;
  }

  function target(maximum) {
    if (!Number.isFinite(maximum) || !Number.isInteger(maximum) || maximum < 1)
      return null;
    return Math.max(1, Math.floor(maximum * percent / 100));
  }

  function createControl(id) {
    var label = document.createElement('label');
    label.className = 'bulk-percent-setting';
    label.style.cssText = 'display:inline-flex;align-items:center;gap:6px;' +
      'white-space:nowrap;flex-wrap:nowrap;font-size:14px;';
    var name = document.createElement('span');
    name.textContent = '批量目标';
    var input = document.createElement('input');
    input.id = id;
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '1';
    input.max = '100';
    input.step = '1';
    input.value = String(percent);
    input.title = '当前分类批量设置为最大值的百分比（1–100）';
    input.setAttribute('aria-label', '批量最大值百分比');
    input.style.cssText = 'width:72px;min-height:40px;padding:6px 8px;' +
      'box-sizing:border-box;font-size:16px;text-align:center;';
    var unit = document.createElement('span');
    unit.textContent = '%';
    label.appendChild(name);
    label.appendChild(input);
    label.appendChild(unit);
    input.addEventListener('change', function () {
      if (!setPercent(input.value)) {
        input.value = String(percent);
        if (typeof window.alert === 'function')
          window.alert('请输入 1～100 的整数百分比');
        return;
      }
      input.value = String(percent);
    });
    window.addEventListener('storage', function (event) {
      if (event.key !== KEY) return;
      var n = parse(event.newValue);
      percent = n === null ? 100 : n;
      input.value = String(percent);
    });
    return label;
  }

  window.BulkPercent = {
    get: function () { return percent; },
    set: setPercent,
    target: target,
    createControl: createControl,
    key: KEY
  };
}());
