/**
 * Tailwind CSS build cho giao diện (thay cho cdn.tailwindcss.com).
 * Giữ nguyên cấu hình trước đây trong templates/base.html. Build: python scripts/build_css.py
 */
module.exports = {
  content: [
    './templates/**/*.html',
    '!./templates/help.html',
    './static/js/src/**/*.js',
    './apps/**/*.py',
    './core/**/*.py',
  ],
  // Class ghép động trong JS/Python (Tailwind không quét được), liệt kê đủ giá trị thực tế:
  // - accounting/advances/advances-list.js: tab con kế toán (brandColor)
  // - dispatch/driver-simulator.js, templates/driver_portal.html: nút mốc tiến độ tài xế (btn.color / item.color)
  // - api_views/dashboard.py: thanh tỉ trọng (f"bg-{color}-500"); core/table-manager.js: text-${align}
  safelist: [
    { pattern: /^(border-(emerald|amber|indigo|teal|sky|rose)-(600|200)|text-(emerald|amber|indigo|teal|sky|rose)-(900|800|600)|bg-(emerald|amber|indigo|teal|sky|rose)-100)$/ },
    'bg-emerald-50/70', 'bg-amber-50/70', 'bg-indigo-50/70', 'bg-teal-50/70', 'bg-sky-50/70', 'bg-rose-50/70',
    { pattern: /^(bg-(teal|blue|amber|emerald)-50|border-(teal|blue|amber|emerald)-500|text-(teal|blue|amber|emerald)-950)$/ },
    { pattern: /^bg-(teal|blue|amber|emerald)-100$/, variants: ['hover'] },
    'ring-teal-200/60', 'ring-blue-200/60', 'ring-amber-200/60', 'ring-emerald-200/60',
    'ring-teal-200/80', 'ring-blue-200/80', 'ring-amber-200/80', 'ring-emerald-200/80',
    { pattern: /^bg-(amber|blue|teal|purple|emerald)-500$/ },
    'text-left', 'text-center', 'text-right',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488',
          700: '#0f766e', 800: '#115e59', 900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
};
