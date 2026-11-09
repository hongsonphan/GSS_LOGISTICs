// Đồng bộ tức thời dữ liệu nghiệp vụ: mỗi 5 giây hỏi phiên bản theo chủ đề (điều vận, kinh doanh, kế toán, ...).
// Chủ đề của màn hình đang mở thay đổi (do người khác lưu) -> tự tải lại danh sách, giữ nguyên bộ lọc đang chọn.
// Không làm mới khi người dùng đang mở cửa sổ nhập / đang gõ, mà chờ nhịp kế tiếp để không mất dữ liệu đang nhập.
const LIVE_SYNC_INTERVAL_MS = 5000;
const LIVE_SYNC_MIN_GAP_MS = 3000;
const LIVE_SYNC_VIEWS = {
    'view-dieu-van': { topics: ['dispatch', 'fleet'], refresh: () => loadTripsData() },
    'view-kinh-doanh': { topics: ['sales'], refresh: () => loadSalesData() },
    'view-ke-toan': { topics: ['accounting', 'dispatch'], refresh: () => switchAccountingSubTab(currentAccountingSubTab) },
    'view-dashboard': { topics: ['dispatch', 'accounting', 'sales'], refresh: () => loadDashboardData() },
    'view-hai-quan': { topics: ['customs'], refresh: () => fetchCustomsDeclarations() },
    'view-nhan-su': { topics: ['hr'], refresh: () => loadHRData() },
    'view-xe-bai': { topics: ['fleet', 'dispatch'], refresh: () => loadFleetData() },
};
let liveSyncVersions = null;
let liveSyncPending = new Set();
let liveSyncBusy = false;
let liveSyncLastRun = 0;

function liveSyncUserIsBusy() {
    if (document.querySelector('[id^="modal-"].fixed.inset-0:not(.hidden):not(.hidden-view)')) return true;
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const tag = el.tagName;
    const typing = tag === 'TEXTAREA' || (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type));
    return typing && !el.matches('[type="search"], [id*="search"], [id*="filter"]');
}

async function liveSyncTick() {
    if (liveSyncBusy || document.visibilityState !== 'visible') return;
    liveSyncBusy = true;
    try {
        const res = await fetchWithAuth('/api/master-data/sync/');
        if (!res.ok) return;
        const topics = (await res.json()).topics || {};
        if (liveSyncVersions) {
            Object.keys(topics).forEach(t => { if (topics[t] !== liveSyncVersions[t]) liveSyncPending.add(t); });
        }
        liveSyncVersions = topics;

        const active = document.querySelector('#main-views > .view:not(.hidden-view)');
        const cfg = active && LIVE_SYNC_VIEWS[active.id];
        if (!cfg) { liveSyncPending.clear(); return; }   // màn hình khác tự tải dữ liệu mới khi được mở
        if (!cfg.topics.some(t => liveSyncPending.has(t))) return;
        if (liveSyncUserIsBusy() || Date.now() - liveSyncLastRun < LIVE_SYNC_MIN_GAP_MS) return;   // thử lại ở nhịp sau

        cfg.topics.forEach(t => liveSyncPending.delete(t));
        liveSyncLastRun = Date.now();
        await cfg.refresh();
    } catch (e) {
        // mất mạng tạm thời: bỏ qua, nhịp sau thử lại
    } finally {
        liveSyncBusy = false;
    }
}

if (typeof window !== 'undefined') {
    setInterval(liveSyncTick, LIVE_SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') liveSyncTick(); });
    window.liveSyncTick = liveSyncTick;
}
