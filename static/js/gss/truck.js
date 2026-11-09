/* Hình xe đầu kéo + sơ mi rơ-moóc (đầu xe bên phải) — vẽ MỘT lần, dùng lại bằng cloneNode.
   GSSTruck.make(plate) -> <span class="truck-ico"> chứa SVG, biển số in trên thùng xe (gán bằng textContent). */
(function () {
  'use strict';
  var S = 'stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
  var wheel = function (x) { return '<circle cx="' + x + '" cy="70" r="10.5" fill="#fff" ' + S + '/><circle cx="' + x + '" cy="70" r="5.2" fill="#fff" ' + S.replace('2.6', '1.8') + '/><circle cx="' + x + '" cy="70" r="1.8" fill="#0f172a"/>'; };
  var MARKUP = '<svg viewBox="0 0 244 84" width="128" height="44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<rect x="3" y="3" width="185" height="52" rx="4" fill="#fff" ' + S + '/>'
    + '<path d="M3 46H188" ' + S + '/><path d="M70 46V55M118 46V55M160 46V55" stroke="#0f172a" stroke-width="1.6"/>'
    + '<text class="plate-txt" x="95" y="25" fill="#0f172a" font-family="ui-monospace,Consolas,monospace" font-size="16" font-weight="900" text-anchor="middle" dominant-baseline="central" letter-spacing=".5"></text>'
    + '<path d="M10 60H196M190 66H240" ' + S + '/>'
    + '<path d="M122 60V76M112 78H132" ' + S + '/>'
    + '<path d="M192 60V10H214C220 10 224 13 227 18L238 38C240 42 241 45 241 50V66H192Z" fill="#fff" ' + S + '/>'
    + '<path d="M199 16V40H230L221 22C219 18 217 16 213 16Z" fill="#f8fafc" ' + S.replace('2.6', '1.8') + '/>'
    + '<path d="M206 40V60" stroke="#0f172a" stroke-width="1.8"/>'
    + [33, 52, 71, 150, 214].map(wheel).join('')
    + '</svg>';
  var tpl = null;
  function base() {
    if (!tpl) { tpl = document.createElement('span'); tpl.className = 'truck-ico'; tpl.innerHTML = MARKUP; }  // markup tĩnh, không chứa dữ liệu người dùng
    return tpl;
  }
  window.GSSTruck = {
    make: function (plate) {
      var n = base().cloneNode(true);
      n.querySelector('.plate-txt').textContent = plate || '';
      return n;
    }
  };
})();
