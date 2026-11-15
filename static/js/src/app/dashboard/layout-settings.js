// =========================================================================
// BỐ CỤC DASHBOARD 4 VÙNG + CÀI ĐẶT HIỂN THỊ TỪNG VÙNG
//   Vùng 1: thẻ chỉ số (kpi) · Vùng 2: biểu đồ (charts) · Vùng 3: tab thông tin (journey)
//   Vùng 4: công việc | bản tin (widgets)
// Mỗi vùng có nút "Hiển thị": ẩn/hiện, độ rộng cố định hoặc kéo tự do, chiều cao. Lưu ở localStorage (theo trình duyệt).
// =========================================================================
const DASH_LAYOUT_KEY = 'gss_dash_layout_v1';
const DASH_LAYOUT_DEFAULT = {
    kpi: { visible: true, cols: 'auto', hidden: [] },
    charts: { visible: true, c1: true, c2: true, mode: 'free', ratio: 58, height: 'm' },
    journey: { visible: true, height: 'm', tabs: { journey: true, trips: true, alert: true, pending: true, matrix: true, lookup: true } },
    widgets: { visible: true, tasks: true, news: true, mode: 'free', ratio: 62, height: 'm' },
};
const DASH_ZONE_LABELS = {
    kpi: 'Thẻ chỉ số điều hành', charts: 'Biểu đồ phân tích',
    journey: 'Tab thông tin (hành trình, cảnh báo...)', widgets: 'Công việc & Bản tin nội bộ',
};
const DASH_RATIO_PRESETS = [[50, '50 / 50'], [60, '60 / 40'], [40, '40 / 60'], [70, '70 / 30'], [30, '30 / 70']];
const DASH_HEIGHT_OPTS = [['s', 'Thấp'], ['m', 'Vừa'], ['l', 'Cao'], ['free', 'Tự kéo']];

let dashZonePopoverFor = null;

function dashLayoutLoad() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(DASH_LAYOUT_KEY) || 'null'); } catch (e) { saved = null; }
    const out = JSON.parse(JSON.stringify(DASH_LAYOUT_DEFAULT));
    if (saved && typeof saved === 'object') {
        Object.keys(out).forEach(z => {
            if (saved[z] && typeof saved[z] === 'object') {
                Object.assign(out[z], saved[z]);
                if (z === 'journey') out.journey.tabs = Object.assign({}, DASH_LAYOUT_DEFAULT.journey.tabs, (saved.journey || {}).tabs || {});
                if (z === 'kpi' && !Array.isArray(out.kpi.hidden)) out.kpi.hidden = [];
            }
        });
    }
    return out;
}
window.dashLayoutLoad = dashLayoutLoad;

function dashLayoutSave(layout) {
    try { localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(layout)); } catch (e) { /* trình duyệt chặn lưu: bỏ qua */ }
}

function dashLayoutMode(zone) {
    const L = dashLayoutLoad();
    return (L[zone] && L[zone].mode) || 'free';
}
window.dashLayoutMode = dashLayoutMode;

function dashLayoutSet(zone, key, value) {
    const L = dashLayoutLoad();
    if (!L[zone]) return;
    if (zone === 'journey' && key.startsWith('tab:')) L.journey.tabs[key.slice(4)] = value;
    else L[zone][key] = value;
    dashLayoutSave(L);
    applyDashboardLayout();
    if (dashZonePopoverFor) renderDashZonePopover();
    if (zone === 'journey' && (key === 'visible' || key.startsWith('tab:'))) loadDashJourney();
}
window.dashLayoutSet = dashLayoutSet;

function dashLayoutToggleKpiCard(cardId, show) {
    const L = dashLayoutLoad();
    const set = new Set(L.kpi.hidden || []);
    if (show) set.delete(cardId); else set.add(cardId);
    L.kpi.hidden = Array.from(set);
    dashLayoutSave(L);
    if (bgdDataCache && Array.isArray(bgdDataCache.kpi_cards)) renderRoleKpiCards(bgdDataCache.kpi_cards);
    if (dashZonePopoverFor) renderDashZonePopover();
}
window.dashLayoutToggleKpiCard = dashLayoutToggleKpiCard;

function dashLayoutReset(zone) {
    if (zone === 'all') {
        try {
            localStorage.removeItem(DASH_LAYOUT_KEY);
            localStorage.removeItem('bim_chart_split_ratio');
            localStorage.removeItem('bim_widget_split_ratio');
        } catch (e) { /* bỏ qua */ }
    } else {
        const L = dashLayoutLoad();
        L[zone] = JSON.parse(JSON.stringify(DASH_LAYOUT_DEFAULT[zone]));
        dashLayoutSave(L);
        try {
            if (zone === 'charts') localStorage.removeItem('bim_chart_split_ratio');
            if (zone === 'widgets') localStorage.removeItem('bim_widget_split_ratio');
        } catch (e) { /* bỏ qua */ }
    }
    if (bgdDataCache && Array.isArray(bgdDataCache.kpi_cards)) renderRoleKpiCards(bgdDataCache.kpi_cards);
    applyDashboardLayout();
    if (dashZonePopoverFor) renderDashZonePopover();
    loadDashJourney();
}
window.dashLayoutReset = dashLayoutReset;

// Lớp lưới của hàng thẻ KPI theo số thẻ và tuỳ chọn số cột (viết nguyên chuỗi để Tailwind quét được)
function dashKpiGridClass(count) {
    const cols = dashLayoutLoad().kpi.cols;
    const base = 'grid gap-2.5 2xl:gap-3.5 transition-all duration-300 ';
    if (cols === '3') return base + 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (cols === '6') return base + 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
    if (count >= 6) return base + 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6';
    if (count === 5) return base + 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
    return base + 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
}
window.dashKpiGridClass = dashKpiGridClass;

function dashSetHidden(elOrId, hidden) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    el.classList.toggle('hidden', !!hidden);
}

function dashChartHeights(h) {
    // [canvas px, legend/body px] cho biểu đồ 1 và 2; 'm' = mặc định theo breakpoint (xoá style)
    if (h === 's') return 120;
    if (h === 'l') return 300;
    if (h === 'free') return 240;
    return null;
}

function applyDashboardLayout() {
    const L = dashLayoutLoad();
    dashSetHidden('dash-zone-kpi', !L.kpi.visible);
    const kpiRow = document.getElementById('dashboard-row-pillars');
    const kpiCount = kpiRow ? kpiRow.querySelectorAll('[data-card-id]').length : 0;
    if (kpiRow && kpiCount) kpiRow.className = dashKpiGridClass(kpiCount);
    dashSetHidden('dash-zone-charts', !L.charts.visible);
    dashSetHidden('dash-zone-journey', !L.journey.visible);
    dashSetHidden('dash-zone-widgets', !L.widgets.visible);

    // --- Vùng 2: biểu đồ ---
    const c1 = document.getElementById('dash-chart-card-1');
    const c2 = document.getElementById('dash-chart-card-2');
    const cres = document.getElementById('dash-chart-resizer');
    dashSetHidden(c1, !L.charts.c1);
    dashSetHidden(c2, !L.charts.c2);
    const bothCharts = L.charts.c1 && L.charts.c2;
    if (cres) cres.style.display = (bothCharts && L.charts.mode === 'free') ? '' : 'none';
    try {
        if (L.charts.mode === 'fixed') localStorage.setItem('bim_chart_split_ratio', String(L.charts.ratio));
    } catch (e) { /* bỏ qua */ }
    if (typeof applyChartRatio === 'function') {
        let r = parseFloat(localStorage.getItem('bim_chart_split_ratio'));
        if (isNaN(r) || L.charts.mode === 'fixed') r = L.charts.ratio;
        applyChartRatio(r);
    }
    const hPx = dashChartHeights(L.charts.height);
    ['bgd-revenue-trend-chart', 'bgd-donut-chart'].forEach(id => {
        const wrap = document.getElementById(id)?.parentElement;
        if (wrap) wrap.style.height = hPx ? hPx + 'px' : '';
    });
    const legend = document.getElementById('donut-legend-container');
    if (legend) legend.style.maxHeight = hPx ? hPx + 'px' : '';
    const crow = document.getElementById('dashboard-row-charts');
    if (crow) {
        crow.style.resize = L.charts.height === 'free' ? 'vertical' : '';
        crow.style.overflow = L.charts.height === 'free' ? 'auto' : '';
    }
    setTimeout(() => {
        if (typeof bgdRevenueChart !== 'undefined' && bgdRevenueChart) bgdRevenueChart.resize();
        if (typeof bgdDonutChart !== 'undefined' && bgdDonutChart) bgdDonutChart.resize();
    }, 60);

    // --- Vùng 3: tab thông tin ---
    DASH_TABS.forEach(t => dashSetHidden('dash-jtab-' + t, !L.journey.tabs[t]));
    const jbody = document.getElementById('dash-journey-body');
    if (jbody) {
        const map = { s: '240px', m: '360px', l: '560px', free: '' };
        jbody.style.maxHeight = map[L.journey.height] ?? '360px';
        jbody.style.height = L.journey.height === 'free' ? '360px' : '';
        jbody.style.resize = L.journey.height === 'free' ? 'vertical' : '';
    }

    // --- Vùng 4: công việc | bản tin ---
    const tasks = document.getElementById('dash-widget-tasks-card');
    const news = document.getElementById('dash-widget-news-card');
    const wres = document.getElementById('dash-widget-resizer');
    dashSetHidden(tasks, !L.widgets.tasks);
    dashSetHidden(news, !L.widgets.news);
    if (wres) wres.style.display = (L.widgets.tasks && L.widgets.news && L.widgets.mode === 'free') ? '' : 'none';
    try {
        if (L.widgets.mode === 'fixed') localStorage.setItem('bim_widget_split_ratio', String(L.widgets.ratio));
    } catch (e) { /* bỏ qua */ }
    if (typeof applyWidgetRatio === 'function') {
        let r = parseFloat(localStorage.getItem('bim_widget_split_ratio'));
        if (isNaN(r) || L.widgets.mode === 'fixed') r = L.widgets.ratio;
        applyWidgetRatio(r);
    }
    const wrow = document.getElementById('dashboard-row-widgets');
    if (wrow) {
        const mh = { s: '300px', m: '', l: '640px', free: '' }[L.widgets.height];
        wrow.style.minHeight = mh || '';
        wrow.style.height = L.widgets.height === 'free' ? '480px' : '';
        wrow.style.resize = L.widgets.height === 'free' ? 'vertical' : '';
        wrow.style.overflow = L.widgets.height === 'free' ? 'hidden' : '';
    }
}
window.applyDashboardLayout = applyDashboardLayout;

function initDashboardLayout() {
    applyDashboardLayout();
    const L = dashLayoutLoad();
    const firstVisible = DASH_TABS.find(t => L.journey.tabs[t]);
    if (firstVisible && !L.journey.tabs[dashJourneyState.tab]) dashJourneyState.tab = firstVisible;
    setDashJourneyTab(dashJourneyState.tab, true);
    loadDashJourney(true);
}
window.initDashboardLayout = initDashboardLayout;

// Nút cũ "Ẩn/Hiện biểu đồ" (còn được gọi từ nơi khác): ẩn/hiện vùng biểu đồ
function toggleDashboardCharts() {
    const L = dashLayoutLoad();
    dashLayoutSet('charts', 'visible', !L.charts.visible);
}
window.toggleDashboardCharts = toggleDashboardCharts;

// -------------------------------------------------------------------------
// BẢNG CÀI ĐẶT (popover dùng chung cho mọi vùng)
// -------------------------------------------------------------------------
function dzSwitch(label, checked, onchange, hint) {
    return `<label class="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
        <span class="min-w-0"><span class="block text-xs font-semibold text-slate-700">${label}</span>${hint ? `<span class="block text-[11px] text-slate-400">${hint}</span>` : ''}</span>
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="${onchange}" class="w-4 h-4 accent-teal-600 shrink-0">
    </label>`;
}

function dzSeg(label, options, current, fnName, args) {
    const btns = options.map(([val, txt]) => {
        const on = String(val) === String(current);
        const a = `${args},${typeof val === 'number' ? val : `'${val}'`}`;
        return `<button type="button" onclick="${fnName}(${a})" class="px-2 py-1 text-[11px] font-bold rounded font-heading transition-colors ${on ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}">${txt}</button>`;
    }).join('');
    return `<div class="py-1.5"><p class="text-[11px] font-bold text-slate-500 mb-1">${label}</p>
        <div class="inline-flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-0.5">${btns}</div></div>`;
}

function dzWidthBlock(zone, L) {
    const z = L[zone];
    const ratioLabel = zone === 'charts' ? 'Tỷ lệ Biểu đồ 1 / Biểu đồ 2' : 'Tỷ lệ Công việc / Bản tin';
    return `${dzSeg('Độ rộng hai ô', [['free', 'Tự do kéo'], ['fixed', 'Cố định']], z.mode, 'dashLayoutSet', `'${zone}','mode'`)}
        ${z.mode === 'fixed' ? dzSeg(ratioLabel, DASH_RATIO_PRESETS, z.ratio, 'dashLayoutSet', `'${zone}','ratio'`) : '<p class="text-[11px] text-slate-400 pb-1">Kéo thanh ngăn giữa hai ô để đổi độ rộng (nhớ lần sau).</p>'}`;
}

function dzFooter(zone) {
    return `<div class="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
        <button type="button" onclick="dashLayoutReset('${zone}')" class="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"><i class="ph-bold ph-arrow-counter-clockwise"></i>Khôi phục mặc định</button>
        <button type="button" onclick="closeDashZoneSettings()" class="px-2.5 py-1 text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg font-heading">Xong</button>
    </div>`;
}

function dzBody(zone, L) {
    if (zone === 'all') {
        const rows = ['kpi', 'charts', 'journey', 'widgets'].map(z =>
            dzSwitch(DASH_ZONE_LABELS[z], L[z].visible, `dashLayoutSet('${z}','visible',this.checked)`)).join('');
        return `${rows}<p class="text-[11px] text-slate-400 pt-1">Mỗi vùng còn có nút <b>Hiển thị</b> riêng để chỉnh độ rộng, chiều cao.</p>${dzFooter('all')}`;
    }
    const head = dzSwitch('Hiển thị vùng này', L[zone].visible, `dashLayoutSet('${zone}','visible',this.checked)`);
    if (zone === 'kpi') {
        const cards = (bgdDataCache && bgdDataCache.kpi_cards) || [];
        const hidden = new Set(L.kpi.hidden || []);
        const list = cards.map(c => dzSwitch(String(c.badge_title || c.title || c.id).replace(/<[^>]+>/g, ''), !hidden.has(c.id),
            `dashLayoutToggleKpiCard('${c.id}',this.checked)`)).join('');
        return `${head}${dzSeg('Số thẻ mỗi hàng', [['auto', 'Tự động'], ['3', '3 thẻ'], ['6', '6 thẻ']], L.kpi.cols, 'dashLayoutSet', "'kpi','cols'")}
            <p class="text-[11px] font-bold text-slate-500 pt-1">Thẻ hiển thị</p>${list || '<p class="text-[11px] text-slate-400">Chưa tải xong dữ liệu thẻ.</p>'}${dzFooter('kpi')}`;
    }
    if (zone === 'charts') {
        return `${head}${dzSwitch('Biểu đồ 1 (xu hướng)', L.charts.c1, "dashLayoutSet('charts','c1',this.checked)")}
            ${dzSwitch('Biểu đồ 2 (cơ cấu)', L.charts.c2, "dashLayoutSet('charts','c2',this.checked)")}
            ${dzWidthBlock('charts', L)}
            ${dzSeg('Chiều cao biểu đồ', DASH_HEIGHT_OPTS, L.charts.height, 'dashLayoutSet', "'charts','height'")}
            <p class="text-[11px] text-slate-400 pb-1">Đổi dữ liệu, trục, loại biểu đồ: nút <b>Tùy biến</b> trên từng biểu đồ.</p>${dzFooter('charts')}`;
    }
    if (zone === 'journey') {
        const tabSw = DASH_TAB_LABELS.map(([k, lb]) => dzSwitch('Tab ' + lb, L.journey.tabs[k], `dashLayoutSet('journey','tab:${k}',this.checked)`)).join('');
        return `${head}${tabSw}
            ${dzSeg('Chiều cao bảng', DASH_HEIGHT_OPTS, L.journey.height, 'dashLayoutSet', "'journey','height'")}${dzFooter('journey')}`;
    }
    return `${head}${dzSwitch('Quản lý công việc', L.widgets.tasks, "dashLayoutSet('widgets','tasks',this.checked)")}
        ${dzSwitch('Bản tin nội bộ', L.widgets.news, "dashLayoutSet('widgets','news',this.checked)")}
        ${dzWidthBlock('widgets', L)}
        ${dzSeg('Chiều cao vùng', DASH_HEIGHT_OPTS, L.widgets.height, 'dashLayoutSet', "'widgets','height'")}${dzFooter('widgets')}`;
}

function renderDashZonePopover() {
    const pop = document.getElementById('dash-zone-popover');
    if (!pop || !dashZonePopoverFor) return;
    const L = dashLayoutLoad();
    const title = dashZonePopoverFor.zone === 'all' ? 'Cài đặt hiển thị Dashboard' : DASH_ZONE_LABELS[dashZonePopoverFor.zone];
    pop.innerHTML = `<div class="flex items-center justify-between pb-2 mb-1 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-800 font-heading flex items-center gap-1.5"><i class="ph-bold ph-gear-six text-teal-700"></i>${title}</span>
            <button type="button" onclick="closeDashZoneSettings()" class="text-slate-400 hover:text-slate-600 p-0.5" title="Đóng"><i class="ph-bold ph-x text-sm"></i></button>
        </div>${dzBody(dashZonePopoverFor.zone, L)}`;
}

function openDashZoneSettings(zone, btn) {
    if (dashZonePopoverFor && dashZonePopoverFor.zone === zone && dashZonePopoverFor.btn === btn) {
        closeDashZoneSettings();
        return;
    }
    let pop = document.getElementById('dash-zone-popover');
    if (!pop) {
        pop = document.createElement('div');
        pop.id = 'dash-zone-popover';
        pop.className = 'fixed z-[60] w-72 max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-fade-in custom-scrollbar';
        pop.addEventListener('click', e => e.stopPropagation());
        document.body.appendChild(pop);
    }
    dashZonePopoverFor = { zone, btn };
    renderDashZonePopover();
    const r = btn.getBoundingClientRect();
    const w = 288;
    let left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.classList.remove('hidden');
    const ph = pop.offsetHeight;
    if (top + ph > window.innerHeight - 8) pop.style.top = Math.max(8, window.innerHeight - ph - 8) + 'px';
}
window.openDashZoneSettings = openDashZoneSettings;

function closeDashZoneSettings() {
    dashZonePopoverFor = null;
    const pop = document.getElementById('dash-zone-popover');
    if (pop) pop.classList.add('hidden');
}
window.closeDashZoneSettings = closeDashZoneSettings;

document.addEventListener('click', e => {
    if (!dashZonePopoverFor) return;
    if (e.target.closest('.dash-zone-gear') || e.target.closest('#btn-dash-layout-settings')) return;
    closeDashZoneSettings();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDashZoneSettings(); });

// -------------------------------------------------------------------------
// VÙNG 3: TAB THÔNG TIN
//   Theo dõi hành trình (dùng lại bản dựng của GSS: GSSApp.fleetTimeline) | Danh sách chuyến | Cảnh báo DEM/DET
//   | Chờ nhập xe/tài | Tra cứu B/L · cont. Dữ liệu: /api/gss/trips/?metric=... và /api/gss/lookup/
// -------------------------------------------------------------------------
const DASH_TABS = ['journey', 'trips', 'alert', 'pending', 'matrix', 'lookup'];
const DASH_TAB_LABELS = [['journey', 'Theo dõi hành trình'], ['trips', 'Danh sách chuyến'], ['alert', 'Cảnh báo DEM/DET'], ['pending', 'Chờ nhập xe/tài'], ['matrix', 'Ma trận nhà xe'], ['lookup', 'Tra cứu B/L · cont']];
const DASH_STEPS = ['READY', 'ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED'];
const DASH_JOURNEY_METRICS = [['all', 'Tất cả'], ['received', 'Đã nhận cont'], ['delivering', 'Đang đi giao'], ['delivered', 'Đã giao hàng'], ['returned', 'Đã hạ rỗng']];
const dashJourneyState = { tab: 'journey', metric: 'all', vendor: '', label: '', data: {}, loading: false, mounted: null, lookupQ: '' };
const DASH_MATRIX_COLS = [['total', 'Tổng cont giao', 'all'], ['pending', 'Chờ nhập xe/tài', 'pending'], ['received', 'Đã nhận cont', 'received'], ['delivering', 'Đang đi giao', 'delivering'],
    ['delivered', 'Đã giao hàng', 'delivered'], ['returned', 'Đã hạ rỗng', 'returned'], ['swapped', 'Đổi vỏ hạ', 'swapped'], ['alert', 'Cảnh báo DEM/DET', 'alert']];

function dashOpenTrip(code) {
    if (window.GSSApp && typeof GSSApp.openTrip === 'function') GSSApp.openTrip(code);
    else if (typeof viewTripDetail === 'function') viewTripDetail(code);
}
window.dashOpenTrip = dashOpenTrip;

function setDashJourneyTab(tab, silent) {
    dashJourneyState.tab = tab;
    dashJourneyState.mounted = null;
    DASH_TABS.forEach(t => {
        const b = document.getElementById('dash-jtab-' + t);
        if (!b) return;
        const on = t === tab;
        b.classList.toggle('border-teal-600', on);
        b.classList.toggle('text-teal-800', on);
        b.classList.toggle('border-transparent', !on);
        b.classList.toggle('text-slate-500', !on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // Ô tìm kiếm chung chỉ dùng cho các tab dạng bảng; hành trình và tra cứu có ô tìm riêng
    document.getElementById('dash-journey-searchbox')?.classList.toggle('hidden', !['trips', 'alert', 'pending'].includes(tab));
    renderDashJourneyFilters();
    renderDashJourney();
    if (!silent && ['trips', 'alert', 'pending', 'matrix'].includes(tab) && !dashJourneyState.data[tab]) loadDashJourney();
}
window.setDashJourneyTab = setDashJourneyTab;

function setDashJourneyMetric(metric) {
    dashJourneyState.metric = metric;
    renderDashJourneyFilters();
    loadDashJourney(true, ['trips']);
}
window.setDashJourneyMetric = setDashJourneyMetric;

function renderDashJourneyFilters() {
    const box = document.getElementById('dash-journey-filters');
    if (!box) return;
    if (dashJourneyState.tab !== 'trips') {
        box.classList.add('hidden');
        return;
    }
    box.classList.remove('hidden');
    const custom = dashJourneyState.vendor || !DASH_JOURNEY_METRICS.some(([m]) => m === dashJourneyState.metric);
    const clear = custom ? `<span class="text-teal-800 font-bold ml-1">Đang lọc: ${escapeHtml(dashJourneyState.label || dashJourneyState.metric)}</span><button type="button" onclick="dashClearJourneyFilter()" class="px-2 py-0.5 rounded font-bold text-rose-700 hover:bg-white flex items-center gap-1"><i class="ph-bold ph-x"></i>Bỏ lọc</button>` : '';
    box.innerHTML = '<span class="text-slate-500 mr-1">Lọc theo tiến độ:</span>' + DASH_JOURNEY_METRICS.map(([m, txt]) => {
        const on = !custom && dashJourneyState.metric === m;
        return `<button type="button" onclick="setDashJourneyMetric('${m}')" class="px-2 py-0.5 rounded font-heading font-bold transition-colors ${on ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-white hover:text-teal-800'}">${txt}</button>`;
    }).join('') + clear;
}

function dashClearJourneyFilter() {
    dashJourneyState.vendor = '';
    dashJourneyState.label = '';
    dashJourneyState.metric = 'all';
    renderDashJourneyFilters();
    loadDashJourney(true, ['trips']);
}
window.dashClearJourneyFilter = dashClearJourneyFilter;

// Bấm một con số trong ma trận: mở đúng danh sách cont đó (chuyến hoặc chờ nhập xe/tài)
function dashMatrixOpen(vendorId, metric, label) {
    dashJourneyState.vendor = vendorId ? String(vendorId) : '';
    dashJourneyState.metric = metric;
    dashJourneyState.label = label;
    if (metric === 'pending') {
        loadDashJourney(true, ['pending']).then(() => setDashJourneyTab('pending', true));
    } else {
        loadDashJourney(true, ['trips']).then(() => setDashJourneyTab('trips', true));
    }
}
window.dashMatrixOpen = dashMatrixOpen;

async function loadDashJourney(force, only) {
    const zone = document.getElementById('dash-zone-journey');
    if (!zone || dashLayoutLoad().journey.visible === false) return;
    if (dashJourneyState.loading && !force) return;
    dashJourneyState.loading = true;
    const wanted = only || ['trips', 'alert', 'pending', 'matrix'];
    const vq = dashJourneyState.vendor ? `&vendor=${encodeURIComponent(dashJourneyState.vendor)}` : '';
    const urlFor = t => t === 'matrix' ? '/api/gss/dashboard/' : (t === 'trips' ? `/api/gss/trips/?metric=${dashJourneyState.metric}${vq}` : (t === 'pending' ? `/api/gss/trips/?metric=pending${vq}` : `/api/gss/trips/?metric=${t}`));
    try {
        const results = await Promise.all(wanted.map(async t => {
            const res = await fetchWithAuth(urlFor(t));
            if (res.status === 403) return [t, 'denied'];
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return [t, await res.json()];
        }));
        results.forEach(([t, d]) => {
            if (d === 'denied') { dashJourneyState.data[t] = { denied: true, rows: [], total: 0 }; return; }
            if (t === 'matrix') { dashJourneyState.data[t] = { rows: (d.data && d.data.matrix) || [], totals: (d.data && d.data.totals) || {}, total: ((d.data && d.data.matrix) || []).length }; return; }
            if (t === 'pending') dashJourneyState.data[t] = { rows: d.pending || [], total: (d.pending || []).length };
            else dashJourneyState.data[t] = { rows: d.results || [], total: d.total ?? (d.results || []).length, truncated: !!d.truncated };
        });
    } catch (err) {
        console.error('Dashboard journey load error:', err);
        wanted.forEach(t => { dashJourneyState.data[t] = { error: true, rows: [], total: 0 }; });
    } finally {
        dashJourneyState.loading = false;
        renderDashJourney();
    }
}
window.loadDashJourney = loadDashJourney;

// Làm mới toàn bộ vùng tab (dựng lại cả bản Theo dõi hành trình)
function refreshDashJourney() {
    dashJourneyState.mounted = null;
    loadDashJourney(true);
    if (dashJourneyState.tab === 'journey') renderDashJourney();
}
window.refreshDashJourney = refreshDashJourney;

function filterDashJourney() { renderDashJourney(); }
window.filterDashJourney = filterDashJourney;

function dashFmtDate(iso) {
    if (!iso) return '';
    const p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function dashDemDetCell(label, x) {
    if (!x || !x.expiry || x.level === 'none') return `<span class="text-slate-300">${label}: —</span>`;
    const d = x.days_left;
    if (x.level === 'overdue') return `<span class="text-rose-600 font-bold"><i class="ph-bold ph-warning-circle"></i> ${label} quá ${Math.abs(d)} ngày</span>`;
    if (x.level === 'warn') return `<span class="text-amber-700 font-bold"><i class="ph-bold ph-clock-countdown"></i> ${label} còn ${d} ngày</span>`;
    return `<span class="text-slate-500">${label}: ${dashFmtDate(x.expiry)}</span>`;
}

function dashStepBar(step) {
    const idx = DASH_STEPS.indexOf(step);
    return '<div class="flex items-center gap-0.5 w-32">' + DASH_STEPS.map((s, i) =>
        `<span class="h-1.5 flex-1 rounded-full ${i < idx ? 'bg-emerald-500' : (i === idx ? (idx === DASH_STEPS.length - 1 ? 'bg-emerald-500' : 'bg-teal-500') : 'bg-slate-200')}"></span>`).join('') + '</div>';
}

function dashTripMatches(t, q) {
    if (!q) return true;
    return [t.trip_code, t.container_number, t.return_container_number, t.customer, t.customer_short, t.vendor, t.tractor_plate, t.trailer_plate,
        t.driver_name, t.booking_code, t.step_label].filter(Boolean).join(' ').toLowerCase().includes(q);
}

function dashJourneyTable(rows, kind) {
    const th = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap';
    const td = 'px-3 py-2 align-top';
    const route = t => [t.pickup_location, t.delivery_location, t.dropoff_location].filter(Boolean).map(escapeHtml).join(' <i class="ph ph-arrow-right text-slate-300"></i> ');
    const body = rows.map(t => {
        const cont = escapeHtml(t.container_number || '—') + (t.swapped ? ` <span class="text-amber-700 font-bold" title="${escapeHtml(t.swap_label || 'Đổi vỏ hạ')}"><i class="ph-bold ph-arrows-left-right"></i></span>` : '');
        const who = `${escapeHtml(t.vendor || '—')}<p class="text-[11px] text-slate-500 font-mono">${escapeHtml([t.tractor_plate, t.trailer_plate].filter(Boolean).join(' / ') || '—')}${t.driver_name ? ' · ' + escapeHtml(t.driver_name) : ''}</p>`;
        const first = `<td class="${td} font-mono font-bold text-slate-800 whitespace-nowrap">${cont}<p class="text-[11px] text-teal-700 font-bold">${escapeHtml(t.trip_code)}</p></td>
            <td class="${td} text-slate-800 font-semibold">${escapeHtml(t.customer_short || t.customer || '')}<p class="text-[11px] text-slate-500 font-normal">${escapeHtml(t.booking_code || '')}</p></td>
            <td class="${td} text-slate-700">${who}</td>`;
        const open = `dashOpenTrip('${escapeHtml(t.trip_code)}')`;
        if (kind === 'alert') {
            return `<tr onclick="${open}" class="border-b border-slate-100 hover:bg-teal-50/40 cursor-pointer">${first}
                <td class="${td} text-slate-700 whitespace-nowrap">${escapeHtml(t.step_label)}</td>
                <td class="${td} whitespace-nowrap text-xs">${dashDemDetCell('DEM', t.dem)}<br>${dashDemDetCell('DET', t.det)}</td></tr>`;
        }
        return `<tr onclick="${open}" class="border-b border-slate-100 hover:bg-teal-50/40 cursor-pointer">${first}
            <td class="${td}">${dashStepBar(t.step)}<p class="text-[11px] text-slate-600 mt-1 font-semibold">${escapeHtml(t.step_label)}</p></td>
            <td class="${td} text-slate-600 text-[11.5px]">${route(t) || '—'}</td>
            <td class="${td} whitespace-nowrap text-xs">${dashDemDetCell('DEM', t.dem)}<br>${dashDemDetCell('DET', t.det)}</td></tr>`;
    }).join('');
    const heads = kind === 'alert'
        ? ['Container / Chuyến', 'Khách hàng / Booking', 'Nhà xe · Xe · Tài xế', 'Bước hiện tại', 'Hạn DEM / DET']
        : ['Container / Chuyến', 'Khách hàng / Booking', 'Nhà xe · Xe · Tài xế', 'Tiến độ hành trình', 'Lộ trình', 'Hạn DEM / DET'];
    return `<table class="w-full text-xs"><thead class="bg-slate-50 sticky top-0 z-10"><tr>${heads.map(h => `<th class="${th}">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function dashPendingTable(rows) {
    const th = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500';
    const body = rows.map(r => `<tr class="border-b border-slate-100">
        <td class="px-3 py-2 font-mono font-bold text-slate-800">${escapeHtml(r.booking_code || '')}</td>
        <td class="px-3 py-2 text-slate-700 font-semibold">${escapeHtml(r.vendor || '')}</td>
        <td class="px-3 py-2 text-slate-600">${Number(r.allocated) || 0} cont đã chia</td>
        <td class="px-3 py-2 font-bold text-amber-700"><i class="ph-bold ph-hourglass-medium"></i> Còn thiếu ${Number(r.missing) || 0} cont chưa nhập xe/tài</td></tr>`).join('');
    return `<table class="w-full text-xs"><thead class="bg-slate-50 sticky top-0 z-10"><tr>${['Booking', 'Nhà xe', 'Số lượng chia', 'Tình trạng'].map(h => `<th class="${th}">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

// --- Tab Tra cứu B/L · cont ---
function dashRenderLookupShell(body) {
    body.innerHTML = `<div class="p-3 space-y-3">
        <p class="text-[11px] text-slate-500">Gõ số MBL / HBL / booking hoặc số container (kể cả số cont đổi vỏ) để xem cont, chuyến, nhà xe, trạng thái và số chứng từ.</p>
        <form class="flex items-center gap-2" onsubmit="dashRunLookup(); return false;">
            <input id="dash-lookup-q" type="search" value="${escapeHtml(dashJourneyState.lookupQ)}" placeholder="VD: HBL987654 hoặc MSCU1234565" aria-label="Số B/L hoặc số cont" class="w-full max-w-sm px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none">
            <button type="submit" class="px-3 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg font-heading flex items-center gap-1"><i class="ph-bold ph-magnifying-glass"></i>Tra cứu</button>
        </form>
        <div id="dash-lookup-out"></div></div>`;
    if (dashJourneyState.lookupQ) dashRunLookup();
}

async function dashRunLookup() {
    const q = (document.getElementById('dash-lookup-q')?.value || '').trim();
    const out = document.getElementById('dash-lookup-out');
    if (!out) return;
    if (q.length < 3) { out.innerHTML = '<p class="text-xs text-rose-600">Nhập ít nhất 3 ký tự.</p>'; return; }
    dashJourneyState.lookupQ = q;
    out.innerHTML = '<p class="text-xs text-slate-400"><i class="ph-bold ph-spinner animate-spin mr-1"></i>Đang tìm...</p>';
    try {
        const res = await fetchWithAuth('/api/gss/lookup/?q=' + encodeURIComponent(q));
        if (res.status === 403) { out.innerHTML = '<p class="text-xs text-slate-500">Vai trò của bạn không có quyền tra cứu.</p>'; return; }
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || 'Lỗi tra cứu');
        const list = j.data || [];
        if (!list.length) { out.innerHTML = '<p class="text-xs text-slate-500">Không tìm thấy đơn hàng nào khớp.</p>'; return; }
        out.innerHTML = list.map(b => {
            const pr = b.progress ? `<p class="text-[11px] text-slate-500">Tổng ${b.progress.total} cont · phân bổ ${b.progress.allocated} · đang chạy ${b.progress.running} · đã giao ${b.progress.delivered} · hoàn tất ${b.progress.done}</p>` : '';
            const rows = (b.trips || []).map(t => `<tr onclick="dashOpenTrip('${escapeHtml(t.trip_code)}')" class="border-t border-slate-100 hover:bg-teal-50/40 cursor-pointer">
                <td class="px-2 py-1.5 font-mono font-bold">${escapeHtml(t.container_number || '')}</td><td class="px-2 py-1.5 font-mono text-teal-700 font-bold">${escapeHtml(t.trip_code)}</td>
                <td class="px-2 py-1.5">${escapeHtml(t.vendor || '')}</td><td class="px-2 py-1.5 font-mono">${escapeHtml(t.plate || '')}</td>
                <td class="px-2 py-1.5">${escapeHtml(t.step_label || '')}</td><td class="px-2 py-1.5 text-right">${escapeHtml(String(t.docs ?? ''))}</td></tr>`).join('');
            return `<div class="border border-slate-200 rounded-lg mb-2 overflow-hidden"><div class="px-3 py-2 bg-slate-50"><p class="text-xs font-bold text-slate-800">${escapeHtml(b.booking_code)} · ${escapeHtml(b.customer || '')}${b.hbl ? ' · HBL ' + escapeHtml(b.hbl) : ''}${b.mbl ? ' · MBL ' + escapeHtml(b.mbl) : ''}</p>${pr}</div>
                <table class="w-full text-xs"><thead><tr class="text-[11px] uppercase text-slate-500"><th class="px-2 py-1 text-left">Số cont</th><th class="px-2 py-1 text-left">Mã chuyến</th><th class="px-2 py-1 text-left">Nhà xe</th><th class="px-2 py-1 text-left">Xe</th><th class="px-2 py-1 text-left">Bước</th><th class="px-2 py-1 text-right">Chứng từ</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="px-2 py-2 text-slate-400">Chưa có chuyến xe.</td></tr>'}</tbody></table></div>`;
        }).join('');
    } catch (err) {
        out.innerHTML = `<p class="text-xs text-rose-600">${escapeHtml(err.message || 'Không tra cứu được')}</p>`;
    }
}
window.dashRunLookup = dashRunLookup;

function dashMatrixTable(d) {
    const th = 'px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap';
    const cell = (r, c) => {
        const v = Number(r[c[0]]) || 0;
        const hot = c[0] === 'alert' && v > 0;
        const label = (r.vendor_id ? r.vendor + ' · ' : '') + c[1];
        return `<td class="px-3 py-2 text-right"><button type="button" onclick="dashMatrixOpen('${r.vendor_id || ''}','${c[2]}','${escapeHtml(label).replace(/'/g, '')}')" class="min-w-[2rem] px-2 py-0.5 rounded font-bold tabular-nums hover:bg-teal-50 hover:text-teal-800 ${hot ? 'text-rose-600' : (c[0] === 'pending' && v > 0 ? 'text-amber-700' : 'text-slate-800')}" aria-label="${escapeHtml(label)}: ${v}">${v}${hot ? ' <i class="ph-bold ph-warning"></i>' : ''}</button></td>`;
    };
    const row = (r, bold) => `<tr class="border-b border-slate-100 ${bold ? 'bg-slate-50 font-bold' : ''}"><td class="px-3 py-2 text-slate-800 ${bold ? '' : 'font-semibold'}">${escapeHtml(r.vendor)}</td>${DASH_MATRIX_COLS.map(c => cell(r, c)).join('')}</tr>`;
    const rows = d.rows.map(r => row(r, false)).join('') + (d.rows.length ? row(Object.assign({ vendor: 'TỔNG', vendor_id: '' }, d.totals), true) : '');
    return `<table class="w-full text-xs"><thead class="bg-slate-50 sticky top-0 z-10"><tr><th class="${th} text-left">Nhà xe</th>${DASH_MATRIX_COLS.map(c => `<th class="${th}">${c[1]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDashJourney() {
    const body = document.getElementById('dash-journey-body');
    if (!body) return;
    ['trips', 'alert', 'pending'].forEach(t => {
        const c = document.getElementById('dash-jtab-count-' + t);
        const d = dashJourneyState.data[t];
        if (c) c.innerText = d && !d.denied && !d.error ? String(d.total) : '';
    });
    const tab = dashJourneyState.tab;
    const summary = document.getElementById('dash-journey-summary');

    // Hai tab tự dựng giao diện riêng (chỉ dựng lại khi đổi tab hoặc bấm Làm mới)
    if (tab === 'journey' || tab === 'lookup') {
        if (summary) summary.innerText = '';
        if (dashJourneyState.mounted === tab) return;
        dashJourneyState.mounted = tab;
        if (tab === 'lookup') { dashRenderLookupShell(body); return; }
        body.innerHTML = '';
        if (window.GSSApp && typeof GSSApp.fleetTimeline === 'function') {
            const host = document.createElement('div');
            host.className = 'gss-scope p-2';
            body.appendChild(host);
            GSSApp.fleetTimeline(host);
        } else {
            body.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">Chưa tải được bản Theo dõi hành trình.</div>';
        }
        return;
    }

    const d = dashJourneyState.data[tab];
    const msg = (icon, text) => `<div class="text-center py-10 text-slate-400 text-xs"><i class="ph-bold ${icon} text-2xl block mb-1 text-slate-300"></i>${text}</div>`;
    if (!d) { body.innerHTML = msg('ph-spinner animate-spin', 'Đang tải...'); return; }
    if (d.denied) { body.innerHTML = msg('ph-lock-key', 'Vai trò của bạn không có quyền xem danh sách chuyến điều vận.'); if (summary) summary.innerText = ''; return; }
    if (d.error) { body.innerHTML = msg('ph-warning-circle', 'Không tải được dữ liệu. Bấm Làm mới để thử lại.'); if (summary) summary.innerText = ''; return; }
    if (tab === 'matrix') {
        body.innerHTML = d.rows.length ? dashMatrixTable(d) : msg('ph-tray', 'Chưa chia cont cho nhà xe nào. Vào Booking, chọn Chia cont cho nhà xe.');
        if (summary) summary.innerText = 'Bấm vào một con số để xem đúng danh sách cont đó.';
        return;
    }
    const q = (document.getElementById('dash-journey-search')?.value || '').trim().toLowerCase();
    let rows = d.rows;
    if (q) {
        rows = tab === 'pending'
            ? rows.filter(r => `${r.booking_code} ${r.vendor}`.toLowerCase().includes(q))
            : rows.filter(t => dashTripMatches(t, q));
    }
    if (!rows.length) {
        const empty = { trips: 'Chưa có chuyến nào trong bộ lọc này.', alert: 'Không có cont nào sắp hoặc quá hạn DEM/DET.', pending: 'Mọi cont đã chia đều đã nhập xe/tài.' }[tab];
        body.innerHTML = msg(tab === 'alert' ? 'ph-seal-check' : 'ph-tray', q ? 'Không có kết quả khớp từ khóa.' : empty);
    } else {
        body.innerHTML = tab === 'pending' ? dashPendingTable(rows) : dashJourneyTable(rows, tab);
    }
    if (summary) summary.innerText = `Hiển thị ${rows.length}/${d.total}${d.truncated ? ' (danh sách bị giới hạn, mở Bàn điều xe để xem đủ)' : ''}`;
}
window.renderDashJourney = renderDashJourney;
