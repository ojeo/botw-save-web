/*
 * Mobile-only presentation enhancements for Marc Robledo's TOTK editor.
 * Existing tab click handlers, file load/save callbacks, and data models
 * are left untouched.
 */
(function () {
  'use strict';
  var NAMES = {
    home: '主页',
    weapons: '武器',
    bows: '弓箭',
    shields: '盾牌',
    armors: '防具',
    materials: '材料',
    food: '料理',
    devices: '左纳乌',
    key: '重要物品',
    horses: '马匹',
    master: '高级'
  };

  function enhanceNavigation() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    nav.setAttribute('aria-label', '编辑分类，左右滑动查看更多');
    var buttons = nav.querySelectorAll('button.nav-link[data-target]');

    Array.prototype.forEach.call(buttons, function (button) {
      var name = NAMES[button.getAttribute('data-target')];
      if (!name) return;
      button.setAttribute('aria-label', name);
      if (!button.querySelector('.totk-nav-label')) {
        var label = document.createElement('span');
        label.className = 'totk-nav-label';
        label.textContent = name;
        label.setAttribute('aria-hidden', 'true');
        button.appendChild(label);
      }
    });

    function syncActive() {
      Array.prototype.forEach.call(buttons, function (button) {
        var isActive = button.classList.contains('active');
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    nav.addEventListener('click', function (event) {
      var button = event.target.closest('button.nav-link[data-target]');
      if (!button || !nav.contains(button)) return;
      // Let the upstream click handler update active tab first.
      window.setTimeout(function () {
        syncActive();
        if (!window.matchMedia || !window.matchMedia('(max-width: 760px)').matches)
          return;
        // Scroll ONLY the category rail; never jump the whole document.
        var track = nav.getBoundingClientRect();
        var tile = button.getBoundingClientRect();
        var left = nav.scrollLeft + tile.left - track.left
          - (track.width - tile.width) / 2;
        if (typeof nav.scrollTo === 'function')
          nav.scrollTo({left: Math.max(0, left), behavior: 'smooth'});
      }, 0);
    });
    syncActive();
  }

  function addMobileAboutMenu() {
    var brandRow = document.querySelector('#header-top > .row');
    if (!brandRow || document.getElementById('totk-mobile-about')) return;

    var about = document.createElement('details');
    about.id = 'totk-mobile-about';

    var heading = document.createElement('summary');
    heading.textContent = '关于';
    about.appendChild(heading);

    var items = document.createElement('div');
    items.className = 'totk-about-links';

    function link(text, href) {
      var a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = text;
      items.appendChild(a);
    }
    link('原作者 · Marc Robledo', 'https://www.marcrobledo.com/');
    link('查看开源项目', 'https://github.com/marcrobledo/savegame-editors/tree/master/zelda-totk');
    link('支持原作者', 'https://www.paypal.me/marcrobledo/5');
    about.appendChild(items);
    brandRow.appendChild(about);

    document.addEventListener('click', function (event) {
      if (about.open && !about.contains(event.target)) about.open = false;
    });
  }

  function init() {
    enhanceNavigation();
    addMobileAboutMenu();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
}());
