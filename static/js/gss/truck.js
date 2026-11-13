/* Hình xe đầu kéo + sơ mi rơ-moóc (đầu xe bên phải) — vẽ MỘT lần, dùng lại bằng cloneNode.
   GSSTruck.make(plate) -> <span class="truck-ico"> chứa SVG, biển số in trên thùng xe (gán bằng textContent). */
(function () {
  'use strict';
  var S = 'stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
  var wheel = function (x) { return '<circle cx="' + x + '" cy="70" r="10.5" fill="#fff" ' + S + '/><circle cx="' + x + '" cy="70" r="5.2" fill="#fff" ' + S.replace('2.6', '1.8') + '/><circle cx="' + x + '" cy="70" r="1.8" fill="#0f172a"/>'; };
  
  /* Thiết kế xe chuẩn UI/UX TMS:
     - Bỏ chữ T ngược hoàn toàn.
     - Khung hiển thị rõ nét trên thùng container.
     - Chữ GPX màu xanh ngọc thương hiệu (#0d9488 / #0f766e), in siêu đậm (font-weight: 900), cỡ lớn nổi bật.
     - Biển số xe in đậm to rõ, dễ nhìn, font monospace hiện đại. */
  var MARKUP = '<svg viewBox="0 0 244 84" width="144" height="48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<rect x="3" y="3" width="185" height="52" rx="4" fill="#ffffff" ' + S + '/>'
    + '<path d="M3 46H188" ' + S + '/>'
    + '<path d="M70 46V55M118 46V55M160 46V55" stroke="#0f172a" stroke-width="1.6"/>'
    + '<rect x="8" y="8" width="175" height="34" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.8"/>'
    + '<text class="plate-container" x="95" y="25" text-anchor="middle" dominant-baseline="central" font-family="\'JetBrains Mono\',ui-monospace,Consolas,monospace">'
    + '<tspan class="gpx-prefix" fill="#0d9488" font-size="16" font-weight="900" letter-spacing=".8">GPX</tspan>'
    + '<tspan fill="#64748b" font-size="15" font-weight="900"> </tspan>'
    + '<tspan class="plate-txt" fill="#0f172a" font-size="15.5" font-weight="900" letter-spacing=".5"></tspan>'
    + '</text>'
    + '<path d="M10 60H196M190 66H240" ' + S + '/>'
    + '<path d="M192 60V10H214C220 10 224 13 227 18L238 38C240 42 241 45 241 50V66H192Z" fill="#fff" ' + S + '/>'
    + '<path d="M199 16V40H230L221 22C219 18 217 16 213 16Z" fill="#f8fafc" ' + S.replace('2.6', '1.8') + '/>'
    + '<path d="M206 40V60" stroke="#0f172a" stroke-width="1.8"/>'
    + [33, 52, 71, 150, 214].map(wheel).join('')
    + '</svg>';
  var tpl = null;
  function base() {
    if (!tpl) { tpl = document.createElement('span'); tpl.className = 'truck-ico'; tpl.innerHTML = MARKUP; }
    return tpl;
  }
  function formatPlateOnly(plate) {
    if (!plate) return '';
    var s = String(plate).trim().toUpperCase();
    s = s.replace(/^GPX[\s\-]*/, '').trim();
    if (!s) return '';
    // Tự động định dạng biển số chuẩn: 51C12345 hoặc 51C-12345 -> 51C - 123.45
    var m = s.match(/^(\d{2}[A-Z]{1,2})[\s\-]*(\d{3})[\.\-]?(\d{2})$/);
    if (m) {
      return m[1] + ' - ' + m[2] + '.' + m[3];
    }
    var m2 = s.match(/^(\d{2}[A-Z]{1,2})[\s\-]*(\d{4,5})$/);
    if (m2) {
      if (m2[2].length === 5) {
        return m2[1] + ' - ' + m2[2].slice(0, 3) + '.' + m2[2].slice(3);
      }
      return m2[1] + ' - ' + m2[2];
    }
    return s;
  }
  window.GSSTruck = {
    formatPlate: function (plate) {
      var p = formatPlateOnly(plate);
      return p ? ('GPX ' + p) : 'GPX';
    },
    make: function (plate) {
      var n = base().cloneNode(true);
      var pTxt = formatPlateOnly(plate);
      var plateEl = n.querySelector('.plate-txt');
      if (plateEl) {
        plateEl.textContent = pTxt || '---';
      }
      return n;
    }
  };
})();
