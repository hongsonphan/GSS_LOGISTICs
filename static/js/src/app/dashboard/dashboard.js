// Biến lưu trữ biểu đồ và dữ liệu Dashboard
let bgdRevenueChart = null;
let bgdDonutChart = null;
let currentDonutType = 'fleet';
let bgdDataCache = null;
let previousActiveTab = 'dashboard';
let currentDashboardPeriod = '10_days';
let currentDashboardCustomStart = null;
let currentDashboardCustomEnd = null;

function getDateRangeForPeriod(period, customStart, customEnd) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth(); // 0-indexed
    
    const fmt = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    if (period === 'today') {
        const tStr = fmt(now);
        return { fromDate: tStr, toDate: tStr };
    }
    if (period === '10_days' || period === '7_days') {
        const past = new Date(now);
        const daysAgo = (period === '7_days') ? 6 : 9;
        past.setDate(now.getDate() - daysAgo);
        return { fromDate: fmt(past), toDate: fmt(now) };
    }
    if (period === 'this_month') {
        const first = new Date(yyyy, mm, 1);
        const last = new Date(yyyy, mm + 1, 0);
        return { fromDate: fmt(first), toDate: fmt(last) };
    }
    if (period === 'this_quarter') {
        const qStartMonth = Math.floor(mm / 3) * 3;
        const first = new Date(yyyy, qStartMonth, 1);
        const last = new Date(yyyy, qStartMonth + 3, 0);
        return { fromDate: fmt(first), toDate: fmt(last) };
    }
    if (period === 'this_year') {
        return { fromDate: `${yyyy}-01-01`, toDate: `${yyyy}-12-31` };
    }
    if (period === 'custom' && customStart && customEnd) {
        return { fromDate: customStart, toDate: customEnd };
    }
    const past = new Date(now);
    past.setDate(now.getDate() - 9);
    return { fromDate: fmt(past), toDate: fmt(now) };
}
window.getDateRangeForPeriod = getDateRangeForPeriod;

function toggleDashboardPeriodDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('topbar-period-menu');
    if (menu) menu.classList.toggle('hidden');
}
window.toggleDashboardPeriodDropdown = toggleDashboardPeriodDropdown;

function setDashboardPeriod(period, label) {
    currentDashboardPeriod = period;
    const labelEl = document.getElementById('topbar-period-label');
    if (labelEl) labelEl.innerText = label;

    // Update active style on menu items
    document.querySelectorAll('#topbar-period-menu .period-item').forEach(item => {
        const itemPeriod = item.getAttribute('data-period');
        if (itemPeriod === period) {
            item.className = 'w-full text-left px-3 py-2 hover:bg-teal-50 hover:text-teal-900 flex items-center justify-between font-bold text-teal-800 bg-teal-50/60 period-item';
            item.innerHTML = `<span>${label}</span><i class="ph-bold ph-check text-teal-600"></i>`;
        } else {
            const itemLabel = item.querySelector('span')?.innerText || item.innerText.trim();
            item.className = 'w-full text-left px-3 py-2 hover:bg-teal-50 hover:text-teal-900 flex items-center justify-between period-item';
            item.innerHTML = `<span>${itemLabel}</span>`;
        }
    });

    const menu = document.getElementById('topbar-period-menu');
    if (menu) menu.classList.add('hidden');

    const dateRange = getDateRangeForPeriod(period, currentDashboardCustomStart, currentDashboardCustomEnd);

    // Đồng bộ vào các input ngày của Quyết toán nếu có
    const settleFrom = document.getElementById('settle-from-date');
    const settleTo = document.getElementById('settle-to-date');
    if (settleFrom) settleFrom.value = dateRange.fromDate;
    if (settleTo) settleTo.value = dateRange.toDate;

    // Đồng bộ vào các input ngày của Kế toán nếu có
    const acctFrom = document.getElementById('acct-rep-from-date');
    const acctTo = document.getElementById('acct-rep-to-date');
    if (acctFrom) acctFrom.value = dateRange.fromDate;
    if (acctTo) acctTo.value = dateRange.toDate;

    // Nhận diện view hiện tại và tải dữ liệu tương ứng
    const activeView = document.querySelector('.view:not(.hidden-view)');
    const currentTab = activeView ? activeView.id.replace('view-', '') : 'dashboard';

    if (currentTab === 'dashboard') {
        loadDashboardData(period);
    } else if (currentTab === 'quyet-toan') {
        loadSettlementData();
    } else if (currentTab === 'ke-toan') {
        switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook');
    } else if (currentTab === 'bao-cao') {
        const reportPeriodMap = {
            'today': 'today',
            '10_days': 'week',
            '7_days': 'week',
            'this_month': 'month',
            'this_quarter': 'quarter',
            'this_year': 'all',
            'custom': 'month'
        };
        const rPeriod = reportPeriodMap[period] || 'week';
        if (typeof changeReportPeriod === 'function') {
            changeReportPeriod(rPeriod);
        } else {
            loadReportsData();
        }
    } else if (currentTab === 'dieu-van') {
        loadTripsData();
    } else if (currentTab === 'kinh-doanh') {
        loadSalesData();
    } else if (currentTab === 'hai-quan') {
        fetchCustomsDeclarations();
    } else if (currentTab === 'xe-bai') {
        loadFleetData();
    } else if (currentTab === 'nhan-su') {
        loadHRData();
    } else if (currentTab === 'cai-dat') {
        loadMasterData();
    } else {
        loadDashboardData(period);
    }
}
window.setDashboardPeriod = setDashboardPeriod;

function openDashboardCustomDatePicker(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('topbar-period-menu');
    if (menu) menu.classList.add('hidden');
    
    const popover = document.getElementById('topbar-custom-date-popover');
    if (popover) {
        popover.classList.remove('hidden');
        const startInput = document.getElementById('topbar-custom-start-date');
        const endInput = document.getElementById('topbar-custom-end-date');
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        if (startInput && !startInput.value) {
            startInput.value = currentDashboardCustomStart || `${yyyy}-${mm}-01`;
        }
        if (endInput && !endInput.value) {
            endInput.value = currentDashboardCustomEnd || todayStr;
        }
    }
}
window.openDashboardCustomDatePicker = openDashboardCustomDatePicker;

function closeDashboardCustomDatePicker() {
    const popover = document.getElementById('topbar-custom-date-popover');
    if (popover) popover.classList.add('hidden');
}
window.closeDashboardCustomDatePicker = closeDashboardCustomDatePicker;

function applyDashboardCustomDate() {
    const startInput = document.getElementById('topbar-custom-start-date');
    const endInput = document.getElementById('topbar-custom-end-date');
    
    if (!startInput || !endInput || !startInput.value || !endInput.value) {
        showToast('warning', 'Vui lòng chọn đầy đủ Từ ngày và Đến ngày', 'Cảnh báo');
        return;
    }
    
    currentDashboardCustomStart = startInput.value;
    currentDashboardCustomEnd = endInput.value;
    
    closeDashboardCustomDatePicker();
    
    const startDateObj = new Date(currentDashboardCustomStart);
    const endDateObj = new Date(currentDashboardCustomEnd);
    const sStr = `${String(startDateObj.getDate()).padStart(2, '0')}/${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;
    const eStr = `${String(endDateObj.getDate()).padStart(2, '0')}/${String(endDateObj.getMonth() + 1).padStart(2, '0')}`;
    const customLabel = `${sStr} - ${eStr}`;
    
    setDashboardPeriod('custom', customLabel);
}
window.applyDashboardCustomDate = applyDashboardCustomDate;

function refreshCurrentView() {
    const activeView = document.querySelector('.view:not(.hidden-view)');
    const currentTab = activeView ? activeView.id.replace('view-', '') : 'dashboard';

    if (currentTab === 'dashboard') {
        loadDashboardData();
    } else if (currentTab === 'dieu-van') {
        loadTripsData();
    } else if (currentTab === 'kinh-doanh') {
        loadSalesData();
    } else if (currentTab === 'ke-toan') {
        if (currentAccountingSubTab === 'acct-reports') {
            loadAccountingReportData();
        } else {
            switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook');
        }
    } else if (currentTab === 'quyet-toan') {
        loadSettlementData();
    } else if (currentTab === 'hai-quan') {
        fetchCustomsDeclarations();
    } else if (currentTab === 'bao-cao') {
        loadReportsData();
    } else if (currentTab === 'xe-bai') {
        loadFleetData();
    } else if (currentTab === 'nhan-su') {
        loadHRData();
    } else if (currentTab === 'cai-dat') {
        loadMasterData();
    } else if (currentTab === 'trip-detail' && currentActiveTripCode) {
        viewTripDetail(currentActiveTripCode, false);
    } else {
        loadDashboardData();
    }

    if (typeof showToast === 'function') {
        showToast('success', 'Đã làm mới dữ liệu mới nhất từ máy chủ!', 'Đồng Bộ Dữ Liệu');
    }
}
window.refreshCurrentView = refreshCurrentView;

// --- 1. TẢI DỮ LIỆU DASHBOARD ĐA VAI TRÒ (CHUẨN QUỐC TẾ TMS, WMS & FLEET) ---
let currentDashboardRoleView = '';

function changeDashboardRoleView(role) {
    currentDashboardRoleView = role;
    currentActiveRole = role;
    if (bgdDataCache && bgdDataCache.role_charts) {
        renderRoleCharts(role);
    }
    loadDashboardData();
}
window.changeDashboardRoleView = changeDashboardRoleView;

function renderRoleKpiCards(cards) {
    const container = document.getElementById('dashboard-row-pillars');
    if (!container || !Array.isArray(cards) || cards.length === 0) return;

    // Cân chỉnh lưới grid tự động theo số lượng thẻ: 5 thẻ -> xl:grid-cols-5, 4 thẻ -> xl:grid-cols-4
    if (cards.length === 5) {
        container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 2xl:gap-3.5 shrink-0 transition-all duration-300';
    } else {
        container.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 2xl:gap-3.5 shrink-0 transition-all duration-300';
    }

    const themeColors = {
        emerald: { border: 'border-l-emerald-500', badge: 'text-emerald-800 bg-emerald-100/70 border-emerald-200', icon: 'bg-emerald-100/80 text-emerald-700', val: 'text-emerald-600', link: 'text-emerald-700' },
        teal: { border: 'border-l-teal-500', badge: 'text-teal-800 bg-teal-100/70 border-teal-200', icon: 'bg-teal-100/80 text-teal-700', val: 'text-teal-700', link: 'text-teal-700' },
        indigo: { border: 'border-l-indigo-500', badge: 'text-indigo-800 bg-indigo-100/70 border-indigo-200', icon: 'bg-indigo-100/80 text-indigo-700', val: 'text-indigo-700', link: 'text-indigo-700' },
        amber: { border: 'border-l-amber-500', badge: 'text-amber-800 bg-amber-100/70 border-amber-200', icon: 'bg-amber-100/80 text-amber-700', val: 'text-amber-700', link: 'text-amber-700' },
        blue: { border: 'border-l-blue-500', badge: 'text-blue-800 bg-blue-100/70 border-blue-200', icon: 'bg-blue-100/80 text-blue-700', val: 'text-blue-700', link: 'text-blue-700' },
        rose: { border: 'border-l-rose-500', badge: 'text-rose-800 bg-rose-100/70 border-rose-200', icon: 'bg-rose-100/80 text-rose-700', val: 'text-rose-600', link: 'text-rose-700' },
    };

    let html = '';
    cards.forEach(card => {
        const t = themeColors[card.theme] || themeColors.teal;
        html += `
        <div onclick="switchTab('${card.target_tab || 'dashboard'}')" class="bg-white p-3 2xl:p-4 rounded-xl border border-slate-200/90 shadow-xs border-l-[4px] ${t.border} cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden flex flex-col justify-between" title="Bấm vào để xem ${card.action_label || 'chi tiết'}">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[11px] 2xl:text-xs font-black uppercase tracking-wider ${t.badge} px-2 py-0.5 rounded border font-heading">
                        ${card.badge_title || card.title}
                    </span>
                    <div class="w-6 h-6 2xl:w-7 2xl:h-7 rounded-lg ${t.icon} flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i class="ph ${card.icon || 'ph-chart-bar'} text-sm 2xl:text-base font-bold"></i>
                    </div>
                </div>
                <p class="text-[11px] 2xl:text-xs font-semibold text-slate-500">${card.metric_label || 'Chỉ số'}</p>
                <p class="text-xl 2xl:text-2xl font-black ${card.metric_color || t.val} tabular-nums font-heading mt-0.5">${card.metric_value || '0'}</p>
            </div>
            
            <div class="space-y-1 mt-2 pt-2 border-t border-slate-100">
                <div class="flex items-center justify-between text-[11px] 2xl:text-xs font-semibold text-slate-600 gap-1 truncate">
                    <span class="truncate">${card.line_1 || ''}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] 2xl:text-[11.5px] text-slate-600 font-semibold pt-1 border-t border-slate-100/60">
                    <span class="truncate">${card.line_2 || ''}</span>
                    <span class="${t.link} font-black group-hover:translate-x-0.5 transition-transform flex items-center font-heading shrink-0 ml-1">
                        ${card.action_label || 'Xem'} <i class="ph ph-arrow-right ml-0.5 font-bold text-[11px]"></i>
                    </span>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

function renderDashboardNews(announcements) {
    const listEl = document.getElementById('dashboard-news-list');
    const badgeEl = document.getElementById('dash-news-badge');
    if (!listEl) return;

    if (!Array.isArray(announcements) || announcements.length === 0) {
        if (badgeEl) badgeEl.innerText = '0 bài';
        listEl.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs">
                <i class="ph-bold ph-newspaper-clipping text-2xl mb-1 text-slate-300 block"></i>
                Chưa có bản tin nội bộ nào trong phân hệ này.
            </div>
        `;
        return;
    }

    if (badgeEl) badgeEl.innerText = `${announcements.length} bài mới`;

    let html = '';
    announcements.forEach(p => {
        const pinnedBadge = p.is_pinned ? `<span class="inline-flex items-center text-[10px] font-black text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200 mr-1"><i class="ph-bold ph-push-pin text-[10px] mr-0.5"></i>Ghim</span>` : '';
        const urgentBadge = p.is_urgent ? `<span class="inline-flex items-center text-[10px] font-black text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded border border-rose-200 mr-1"><i class="ph-bold ph-warning-circle text-[10px] mr-0.5"></i>Khẩn</span>` : '';
        
        html += `
        <div onclick="window.location.href = '/news/' + ('${p.hashid || p.id}') + '/';" title="Bấm để mở trang chi tiết & xem trước tài liệu đính kèm (PDF/Word/Excel)"
            class="p-2.5 rounded-lg border ${p.is_pinned ? 'border-amber-300 ring-1 ring-amber-200/60 bg-amber-50/25' : 'border-slate-100 hover:border-teal-300 hover:bg-teal-50/30'} transition-all cursor-pointer group flex flex-col justify-between space-y-1">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center space-x-1.5 flex-wrap">
                    ${pinnedBadge}
                    ${urgentBadge}
                    <span class="text-[10px] font-bold px-1.5 py-0.2 rounded text-slate-700 border" style="background-color: ${p.category_color}15; border-color: ${p.category_color}40; color: ${p.category_color};">
                        ${p.category_name}
                    </span>
                </div>
                <span class="text-[10.5px] font-medium text-slate-400 whitespace-nowrap">${p.created_at || ''}</span>
            </div>
            <h4 class="text-xs font-bold text-slate-800 group-hover:text-teal-800 transition-colors line-clamp-1 font-heading">
                ${p.title}
            </h4>
            <p class="text-[11px] text-slate-500 line-clamp-1 font-normal">
                ${p.summary}
            </p>
            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-50">
                <span>Người đăng: <strong class="text-slate-600 font-semibold">${p.author_name}</strong></span>
                <span class="text-teal-700 font-bold group-hover:underline flex items-center">
                    Đọc tiếp <i class="ph ph-caret-right ml-0.5"></i>
                </span>
            </div>
        </div>
        `;
    });

    listEl.innerHTML = html;
}

let cachedDashboardTasks = [];
let currentDashboardTaskViewMode = localStorage.getItem('bim_dashboard_task_view_mode') || 'list';
let currentDashboardTaskScope = localStorage.getItem('bim_dashboard_task_scope') || 'all';

function setDashboardTaskScope(scope) {
    currentDashboardTaskScope = scope;
    localStorage.setItem('bim_dashboard_task_scope', scope);

    const scopes = ['all', 'assigned_by_me', 'assigned_to_me', 'related'];
    scopes.forEach(s => {
        const btnId = `btn-dash-scope-${s.replace(/_/g, '-')}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            if (s === scope) {
                btn.className = 'px-2 py-0.5 rounded bg-white text-indigo-800 shadow-2xs flex items-center gap-1 transition-all';
            } else {
                btn.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all';
            }
        }
    });

    renderDashboardTasksView();
}
window.setDashboardTaskScope = setDashboardTaskScope;

function goToTasksFromDashboard() {
    if (typeof currentDashboardTaskScope !== 'undefined' && typeof setTaskScope === 'function') {
        setTaskScope(currentDashboardTaskScope);
    }
    switchTab('giao-viec');
}
window.goToTasksFromDashboard = goToTasksFromDashboard;

function setDashboardTaskViewMode(mode) {
    currentDashboardTaskViewMode = mode;
    localStorage.setItem('bim_dashboard_task_view_mode', mode);

    const btnList = document.getElementById('btn-task-view-list');
    const btnKanban = document.getElementById('btn-task-view-kanban');

    if (mode === 'kanban') {
        if (btnKanban) {
            btnKanban.className = 'px-2 py-0.5 rounded bg-white text-indigo-800 shadow-2xs flex items-center gap-1 transition-all';
        }
        if (btnList) {
            btnList.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all';
        }
    } else {
        if (btnList) {
            btnList.className = 'px-2 py-0.5 rounded bg-white text-indigo-800 shadow-2xs flex items-center gap-1 transition-all';
        }
        if (btnKanban) {
            btnKanban.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all';
        }
    }

    renderDashboardTasksView();
}
window.setDashboardTaskViewMode = setDashboardTaskViewMode;

function formatTaskCode(code) {
    if (!code) return '';
    const match = String(code).match(/^TSK[-.](\d{6})[-.]0*(\d+)$/i);
    if (match) {
        return `TSK.${match[1]}.${String(parseInt(match[2], 10)).padStart(3, '0')}`;
    }
    return code;
}
window.formatTaskCode = formatTaskCode;

function cleanPersonName(name) {
    if (!name) return '';
    return String(name).replace(/\s*\([^)]*\)/g, '').trim() || name;
}
window.cleanPersonName = cleanPersonName;

function renderDashboardTasks(tasks) {
    cachedDashboardTasks = Array.isArray(tasks) ? tasks : [];

    // Đồng bộ nút scope active theo local storage
    const scopes = ['all', 'assigned_by_me', 'assigned_to_me', 'related'];
    scopes.forEach(s => {
        const btnId = `btn-dash-scope-${s.replace(/_/g, '-')}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            if (s === currentDashboardTaskScope) {
                btn.className = 'px-2 py-0.5 rounded bg-white text-indigo-800 shadow-2xs flex items-center gap-1 transition-all';
            } else {
                btn.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all';
            }
        }
    });

    // Đồng bộ nút view active theo local storage
    const btnList = document.getElementById('btn-task-view-list');
    const btnKanban = document.getElementById('btn-task-view-kanban');
    if (currentDashboardTaskViewMode === 'kanban') {
        if (btnKanban) btnKanban.className = 'px-2 py-0.5 rounded bg-white text-indigo-800 shadow-2xs flex items-center gap-1 transition-all';
        if (btnList) btnList.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all';
    } else {
        if (btnList) btnList.className = 'px-2 py-0.5 rounded bg-white text-indigo-800 shadow-2xs flex items-center gap-1 transition-all';
        if (btnKanban) btnKanban.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all';
    }

    renderDashboardTasksView();
}

/**
 * Tính toán và tạo Badge Hạn (Deadline Alert) chuẩn trực quan theo màu sắc:
 * - Quá hạn: Đỏ rực rỡ (Rose), icon cảnh báo nhấp nháy, kèm số ngày trễ
 * - Đến hạn hôm nay: Cam cháy (Amber), icon đồng hồ cát nhắc nhở xử lý ngay
 * - Sắp đến hạn (còn 1-2 ngày): Xanh dương sáng (Sky/Blue)
 * - Còn nhiều thời gian: Xanh ngọc dịu (Teal/Slate)
 * - Đang chờ duyệt gia hạn: Tím nổi bật (Purple)
 */
function getTaskDeadlineBadgeHtml(t) {
    if (!t.due_date || t.due_date === 'Không có hạn') {
        return '';
    }

    const isPendingExt = (t.extension_status === 'PENDING');
    let extText = isPendingExt ? ' <span class="text-purple-600 font-bold">(Chờ gia hạn)</span>' : '';

    if (t.is_overdue || (t.days_remaining !== null && t.days_remaining < 0)) {
        return `<span class="text-[10px] text-rose-600 font-bold flex items-center gap-1"><i class="ph-bold ph-calendar text-rose-600 text-[11px]"></i> Hạn: ${t.due_date} (Quá hạn)${extText}</span>`;
    }
    if (t.days_remaining === 0) {
        return `<span class="text-[10px] text-amber-600 font-bold flex items-center gap-1"><i class="ph-bold ph-alarm text-amber-600 text-[11px]"></i> Hạn: Hôm nay${extText}</span>`;
    }
    if (isPendingExt) {
        return `<span class="text-[10px] text-purple-600 font-bold flex items-center gap-1"><i class="ph-bold ph-hourglass text-purple-600 text-[11px]"></i> Hạn: ${t.due_date}${extText}</span>`;
    }
    return `<span class="text-[10px] text-slate-400 font-medium flex items-center gap-1"><i class="ph ph-calendar text-slate-400 text-[11px]"></i> ${t.due_date}</span>`;
}
window.getTaskDeadlineBadgeHtml = getTaskDeadlineBadgeHtml;

/**
 * Tạo khối hiển thị % Tiến độ & Thanh Progress Bar dày dặn, trực quan:
 * - 0%: Nền xám nhạt, "Chưa bắt đầu"
 * - 1-49%: Nền hổ phách, "Đang làm"
 * - 50-79%: Nền xanh dương, "Đang tiến triển"
 * - 80-99%: Nền teal ngọc, "Sắp hoàn tất"
 * - 100%: Nền xanh lá đậm, "Hoàn thành"
 */
function getTaskProgressHtml(percent, checklistsDone, checklistsTotal) {
    const p = Math.max(0, Math.min(100, parseInt(percent, 10) || 0));
    const chkHtml = (checklistsTotal > 0)
        ? `<span class="text-[10px] text-slate-400 font-medium">${checklistsDone}/${checklistsTotal}</span>`
        : '';

    return `
        <div class="pt-1 space-y-1">
            <div class="flex items-center justify-between text-[10px] text-slate-500">
                <span class="font-mono font-bold ${p === 100 ? 'text-emerald-600' : 'text-slate-700'}">${p}%</span>
                ${chkHtml}
            </div>
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: ${p}%;"></div>
            </div>
        </div>
    `;
}
window.getTaskProgressHtml = getTaskProgressHtml;

function renderDashboardTasksView() {
    const listEl = document.getElementById('dashboard-tasks-list');
    const kanbanEl = document.getElementById('dashboard-tasks-kanban');
    if (!listEl || !kanbanEl) return;

    const myUserId = window.CURRENT_USER?.id ? Number(window.CURRENT_USER.id) : null;

    // Lọc theo scope đã chọn (Tất cả | Đã giao | Được giao | Liên quan)
    let filteredTasks = cachedDashboardTasks;
    if (currentDashboardTaskScope === 'assigned_by_me') {
        filteredTasks = cachedDashboardTasks.filter(t => t.is_reporter || (myUserId && Number(t.reporter_id) === myUserId));
    } else if (currentDashboardTaskScope === 'assigned_to_me') {
        filteredTasks = cachedDashboardTasks.filter(t => t.is_assignee || (myUserId && Number(t.assignee_id) === myUserId));
    } else if (currentDashboardTaskScope === 'related') {
        filteredTasks = cachedDashboardTasks.filter(t => t.is_follower || (myUserId && Array.isArray(t.follower_ids) && t.follower_ids.map(Number).includes(myUserId)));
    }

    const badgeEl = document.getElementById('dash-tasks-badge');
    if (badgeEl) {
        badgeEl.innerText = `${filteredTasks.length} việc`;
    }

    if (filteredTasks.length === 0) {
        listEl.classList.remove('hidden');
        kanbanEl.classList.add('hidden');
        let emptyMsg = 'Tuyệt vời! Hiện tại bạn không có công việc tồn đọng cần xử lý.';
        if (currentDashboardTaskScope === 'assigned_by_me') emptyMsg = 'Bạn chưa giao công việc nào đang chờ xử lý.';
        else if (currentDashboardTaskScope === 'assigned_to_me') emptyMsg = 'Hiện tại bạn không có công việc được giao cần xử lý.';
        else if (currentDashboardTaskScope === 'related') emptyMsg = 'Không có công việc liên quan nào đang chờ xử lý.';

        listEl.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs">
                <i class="ph-bold ph-check-circle text-2xl mb-1 text-emerald-400 block"></i>
                ${emptyMsg}
            </div>
        `;
        return;
    }

    const priorityBadges = {
        URGENT: '<span class="px-2 py-0.5 text-[10px] font-black rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-heading shrink-0 shadow-2xs flex items-center gap-1"><i class="ph-fill ph-fire text-rose-600"></i> Khẩn cấp</span>',
        HIGH: '<span class="px-2 py-0.5 text-[10px] font-black rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-heading shrink-0 shadow-2xs">Ưu tiên cao</span>',
        MEDIUM: '<span class="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-heading shrink-0">Bình thường</span>',
        LOW: '<span class="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-heading shrink-0">Thấp</span>',
    };

    if (currentDashboardTaskViewMode === 'kanban') {
        // --- CHẾ ĐỘ XEM KANBAN MINI ---
        listEl.classList.add('hidden');
        kanbanEl.classList.remove('hidden');

        const todoTasks = filteredTasks.filter(t => t.status === 'TODO');
        const progressTasks = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
        const reviewTasks = filteredTasks.filter(t => !['TODO', 'IN_PROGRESS'].includes(t.status));

        // Cập nhật số đếm các cột
        const cntTodo = document.getElementById('kanban-col-count-todo');
        if (cntTodo) cntTodo.innerText = todoTasks.length;
        const cntProg = document.getElementById('kanban-col-count-progress');
        if (cntProg) cntProg.innerText = progressTasks.length;
        const cntRev = document.getElementById('kanban-col-count-review');
        if (cntRev) cntRev.innerText = reviewTasks.length;

        const renderKanbanCards = (tasks) => {
            if (!tasks || tasks.length === 0) {
                return '<div class="py-6 text-center text-[11px] text-slate-400 font-medium">Trống</div>';
            }
            return tasks.map(t => {
                const prioBadge = priorityBadges[t.priority] || priorityBadges.MEDIUM;
                const reporterClean = cleanPersonName(t.reporter_name) || 'Hệ thống';
                const assigneeClean = cleanPersonName(t.assignee_name) || 'Chưa gán';
                const followersClean = (t.followers_list || []).map(cleanPersonName);
                const deadlineBadge = getTaskDeadlineBadgeHtml(t);
                const progressHtml = getTaskProgressHtml(t.progress_percent, t.checklists_done, t.checklists_total);

                let cardBorderClass = 'border-slate-200/80 hover:border-indigo-400';
                if (t.status === 'DONE') {
                    cardBorderClass = 'border-emerald-300 hover:border-emerald-400';
                } else if (t.extension_status === 'PENDING') {
                    cardBorderClass = 'border-2 border-purple-400 hover:border-purple-500 shadow-purple-500/10';
                } else if (t.is_overdue || (t.days_remaining !== null && t.days_remaining < 0)) {
                    cardBorderClass = 'border-2 border-rose-400 hover:border-rose-500 shadow-rose-500/10';
                } else if (t.days_remaining === 0) {
                    cardBorderClass = 'border-2 border-amber-400 hover:border-amber-500 shadow-amber-500/10';
                }

                return `
                <div onclick="if(typeof openTaskDetailDrawer==='function') openTaskDetailDrawer(${t.id});" 
                    class="p-2.5 bg-white rounded-lg border ${cardBorderClass} shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-1.5">
                    
                    <!-- Header thẻ Kanban: Mã, Hạn, Ưu tiên -->
                    <div class="flex items-center justify-between gap-1">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-[9.5px] font-mono font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">${formatTaskCode(t.code)}</span>
                            ${deadlineBadge}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            ${prioBadge}
                        </div>
                    </div>

                    <!-- Tiêu đề công việc -->
                    <h5 class="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-2 leading-snug font-heading">
                        ${escapeHtml(t.title)}
                    </h5>

                    <!-- 3 Icon theo thứ tự trên 1 hàng: Người giao | Người phụ trách | Người liên quan -->
                    <div class="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10px] 2xl:text-[10.5px] text-slate-500 overflow-hidden select-none">
                        <span class="flex items-center gap-1 truncate text-slate-500 shrink min-w-0" title="Người giao: ${escapeHtml(reporterClean)}">
                            <i class="ph-bold ph-paper-plane-tilt text-slate-400 shrink-0 text-xs"></i>
                            <span class="truncate font-medium">${escapeHtml(reporterClean)}</span>
                        </span>
                        <span class="text-slate-300 shrink-0 font-light">|</span>
                        <span class="flex items-center gap-1 truncate text-indigo-900 shrink min-w-0 font-bold" title="Người phụ trách: ${escapeHtml(assigneeClean)}">
                            <i class="ph-bold ph-user-check text-indigo-600 shrink-0 text-xs"></i>
                            <span class="truncate">${escapeHtml(assigneeClean)}</span>
                        </span>
                        ${followersClean.length > 0 ? `
                        <span class="text-slate-300 shrink-0 font-light">|</span>
                        <span class="flex items-center gap-1 text-teal-700 shrink-0 font-bold bg-teal-50/80 px-1 py-0.2 rounded border border-teal-200/60" title="Người liên quan: ${escapeHtml(followersClean.join(', '))}">
                            <i class="ph-bold ph-users text-teal-600 shrink-0 text-xs"></i>
                            <span>${followersClean.length}</span>
                        </span>
                        ` : ''}
                    </div>

                    <!-- Khối tiến độ % to rõ -->
                    ${progressHtml}
                </div>
                `;
            }).join('');
        };

        const colTodo = document.getElementById('kanban-col-items-todo');
        if (colTodo) colTodo.innerHTML = renderKanbanCards(todoTasks);
        const colProg = document.getElementById('kanban-col-items-progress');
        if (colProg) colProg.innerHTML = renderKanbanCards(progressTasks);
        const colRev = document.getElementById('kanban-col-items-review');
        if (colRev) colRev.innerHTML = renderKanbanCards(reviewTasks);

    } else {
        // --- CHẾ ĐỘ XEM DANH SÁCH CHI TIẾT (LIST VIEW) ---
        listEl.classList.remove('hidden');
        kanbanEl.classList.add('hidden');

        let html = '';
        filteredTasks.forEach(t => {
            const prioBadge = priorityBadges[t.priority] || priorityBadges.MEDIUM;
            const reporterClean = cleanPersonName(t.reporter_name) || 'Hệ thống';
            const assigneeClean = cleanPersonName(t.assignee_name) || 'Chưa gán';
            const followersClean = (t.followers_list || []).map(cleanPersonName);
            const isMyTask = (myUserId && t.assignee_id === myUserId);
            const myTaskBadge = isMyTask ? `<span class="px-2 py-0.5 text-[10px] font-black rounded-md bg-indigo-600 text-white font-heading shadow-2xs shrink-0 flex items-center gap-1"><i class="ph-fill ph-user text-[10px]"></i> Việc của bạn</span>` : '';

            const deadlineBadge = getTaskDeadlineBadgeHtml(t);
            const progressHtml = getTaskProgressHtml(t.progress_percent, t.checklists_done, t.checklists_total);

            let cardBorderClass = 'border-slate-200/80 hover:border-indigo-300';
            if (t.status === 'DONE') {
                cardBorderClass = 'border-emerald-300 hover:border-emerald-400';
            } else if (t.extension_status === 'PENDING') {
                cardBorderClass = 'border-2 border-purple-400 hover:border-purple-500 shadow-purple-500/10';
            } else if (t.is_overdue || (t.days_remaining !== null && t.days_remaining < 0)) {
                cardBorderClass = 'border-2 border-rose-400 hover:border-rose-500 shadow-rose-500/10';
            } else if (t.days_remaining === 0) {
                cardBorderClass = 'border-2 border-amber-400 hover:border-amber-500 shadow-amber-500/10';
            }

            html += `
            <div onclick="if(typeof openTaskDetailDrawer==='function') openTaskDetailDrawer(${t.id});" 
                class="p-2.5 rounded-xl border ${cardBorderClass} hover:bg-indigo-50/20 transition-all cursor-pointer group flex flex-col justify-between space-y-1.5 shadow-2xs">
                
                <!-- Hàng 1: Mã, Ưu tiên, Deadline -->
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center space-x-1.5">
                        <span class="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">${formatTaskCode(t.code)}</span>
                        ${prioBadge}
                    </div>
                    ${deadlineBadge}
                </div>
                
                <!-- Hàng 2: Tiêu đề công việc -->
                <h4 class="text-xs 2xl:text-[13.5px] font-bold text-slate-800 group-hover:text-indigo-800 transition-colors line-clamp-1 font-heading">
                    ${escapeHtml(t.title)}
                </h4>

                <!-- Hàng 3: 3 Icon: Người Giao | Người Phụ Trách | Người Liên Quan -->
                <div class="flex items-center gap-2 text-[10.5px] 2xl:text-[11px] text-slate-500 flex-wrap py-0.5">
                    <span class="inline-flex items-center bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70" title="Người giao việc">
                        <i class="ph-bold ph-paper-plane-tilt text-slate-400 mr-1 text-xs shrink-0"></i>
                        <span>Giao: <strong class="text-slate-700 font-semibold">${escapeHtml(reporterClean)}</strong></span>
                    </span>
                    <span class="text-slate-300 font-light">|</span>
                    <span class="inline-flex items-center bg-indigo-50/90 px-2 py-0.5 rounded-md border border-indigo-200/80" title="Người phụ trách chính">
                        <i class="ph-bold ph-user-check text-indigo-600 mr-1 text-xs shrink-0"></i>
                        <span>Phụ trách: <strong class="text-indigo-950 font-bold">${escapeHtml(assigneeClean)}</strong></span>
                    </span>
                    ${followersClean.length > 0 ? `
                    <span class="text-slate-300 font-light">|</span>
                    <span class="inline-flex items-center text-teal-700 bg-teal-50/80 px-2 py-0.5 rounded-md border border-teal-200/70" title="Người liên quan / theo dõi: ${escapeHtml(followersClean.join(', '))}">
                        <i class="ph-bold ph-users text-teal-600 mr-1 text-xs shrink-0"></i>
                        <span>Liên quan: <strong class="text-teal-900 font-semibold">${escapeHtml(followersClean.join(', '))}</strong></span>
                    </span>
                    ` : ''}
                </div>

                <!-- Hàng 4: Khối % Tiến độ to rõ & Thanh Progress Bar dày dặn -->
                ${progressHtml}
            </div>
            `;
        });

        listEl.innerHTML = html;
    }
}

async function loadDashboardData(periodOverride) {
    const period = periodOverride || currentDashboardPeriod || '7_days';
    let url = `/api/dashboard/?period=${period}`;
    if (currentDashboardRoleView) {
        url += `&view_as=${currentDashboardRoleView}`;
    }
    if (period === 'custom' && currentDashboardCustomStart && currentDashboardCustomEnd) {
        url += `&start_date=${currentDashboardCustomStart}&end_date=${currentDashboardCustomEnd}`;
    }
    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
        const data = await res.json();
        bgdDataCache = data;

        // 0. Cập nhật Role Header Bar
        const userNameEl = document.getElementById('dash-user-name');
        if (userNameEl) {
            userNameEl.innerText = window.CURRENT_USER?.full_name || 'Quý nhân sự';
        }
        const roleBadgeEl = document.getElementById('dash-role-badge');
        if (roleBadgeEl && data.role_name) {
            roleBadgeEl.innerText = data.role_name;
            if (data.role_badge) {
                roleBadgeEl.className = `px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border font-heading ${data.role_badge}`;
            }
        }
        const roleDescEl = document.getElementById('dash-role-desc');
        if (roleDescEl && data.role_description) {
            roleDescEl.innerText = data.role_description;
        }

        // Dropdown đổi góc nhìn dành cho Giám đốc / Superuser
        const viewAsContainer = document.getElementById('dash-view-as-container');
        const viewAsSelect = document.getElementById('dash-view-as-select');
        if (viewAsContainer && viewAsSelect) {
            if (data.can_switch_view) {
                viewAsContainer.classList.remove('hidden');
                viewAsContainer.classList.add('flex');
                viewAsSelect.value = data.role || 'DIRECTOR';
            } else {
                viewAsContainer.classList.add('hidden');
                viewAsContainer.classList.remove('flex');
            }
        }

        // 1. Cập nhật 4 Trụ cột KPI Điều hành (Động theo Role)
        if (data.kpi_cards && data.kpi_cards.length > 0) {
            renderRoleKpiCards(data.kpi_cards);
        } else {
            // Fallback backward compatibility
            const fin = data.financial || {};
            const prod = data.productivity || {};
            const fleet = data.fleet || {};
            const pers = data.personnel || {};
            const comm = data.commercial_customs || {};

            const grossProfitEl = document.getElementById('bgd-gross-profit');
            if (grossProfitEl) grossProfitEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_gross_profit || 0) + ' đ';
            const monthlyRevEl = document.getElementById('bgd-monthly-rev');
            if (monthlyRevEl) monthlyRevEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_revenue || 0) + ' đ';
            const monthlyExpEl = document.getElementById('bgd-monthly-exp');
            if (monthlyExpEl) monthlyExpEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_expense || 0) + ' đ';
            const cashEl = document.getElementById('bgd-cash-val');
            if (cashEl) cashEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.cash_on_hand ?? 0) + ' đ';
            const bankEl = document.getElementById('bgd-bank-val');
            if (bankEl) bankEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.bank_balance ?? 0) + ' đ';

            const todayTripsEl = document.getElementById('bgd-today-trips');
            if (todayTripsEl) todayTripsEl.innerText = prod.today_active ?? 0;
            const totalTripsEl = document.getElementById('bgd-total-trips');
            if (totalTripsEl) totalTripsEl.innerText = prod.total_trips ?? 0;
            const yesterdayTripsEl = document.getElementById('bgd-yesterday-trips');
            if (yesterdayTripsEl) yesterdayTripsEl.innerText = `${prod.completed_yesterday ?? 0} chuyến`;
            const otdRateEl = document.getElementById('bgd-otd-rate');
            if (otdRateEl) otdRateEl.innerText = `${prod.ontime_delivery_rate ?? 0}% OTD`;

            const utilizationEl = document.getElementById('bgd-fleet-utilization');
            if (utilizationEl) utilizationEl.innerText = `${fleet.utilization_rate ?? 0}%`;
            const fleetActiveEl = document.getElementById('bgd-fleet-active');
            if (fleetActiveEl) fleetActiveEl.innerText = fleet.active ?? 0;
            const fleetTotalEl = document.getElementById('bgd-fleet-total');
            if (fleetTotalEl) fleetTotalEl.innerText = fleet.total ?? 0;
            const fleetIdleEl = document.getElementById('bgd-fleet-idle');
            if (fleetIdleEl) fleetIdleEl.innerText = fleet.idle ?? 0;
            const fleetMaintEl = document.getElementById('bgd-fleet-maint');
            if (fleetMaintEl) fleetMaintEl.innerText = fleet.maintenance ?? 0;
            const hrActiveEl = document.getElementById('bgd-hr-active');
            if (hrActiveEl) hrActiveEl.innerText = `${pers.active ?? 0}/${fleet.total_drivers || pers.total || 0} TX`;

            const customsGreenEl = document.getElementById('bgd-customs-green');
            if (customsGreenEl) customsGreenEl.innerText = comm.customs_green ?? 0;
            const pendingBookingsEl = document.getElementById('bgd-pending-bookings');
            if (pendingBookingsEl) pendingBookingsEl.innerText = `${comm.pending_bookings ?? 0} đơn`;
        }

        // Cập nhật 3 Thẻ Mini Dưới Biểu Đồ Doanh Thu & Subtitle
        const fin = data.financial || {};
        const avgRevEl = document.getElementById('bgd-avg-rev');
        if (avgRevEl) avgRevEl.innerText = '~' + new Intl.NumberFormat('vi-VN').format(fin.avg_revenue || 0) + ' đ';
        const avgExpEl = document.getElementById('bgd-avg-exp');
        if (avgExpEl) avgExpEl.innerText = '~' + new Intl.NumberFormat('vi-VN').format(fin.avg_expense || 0) + ' đ';
        const avgMarginEl = document.getElementById('bgd-avg-margin');
        if (avgMarginEl) avgMarginEl.innerText = `${fin.profit_margin || 0}%`;

        const avgRevLbl = document.getElementById('bgd-avg-rev-label');
        if (avgRevLbl && fin.avg_revenue_label) avgRevLbl.innerText = fin.avg_revenue_label;
        const avgExpLbl = document.getElementById('bgd-avg-exp-label');
        if (avgExpLbl && fin.avg_expense_label) avgExpLbl.innerText = fin.avg_expense_label;
        const avgMarginLbl = document.getElementById('bgd-avg-margin-label');
        if (avgMarginLbl && fin.avg_margin_label) avgMarginLbl.innerText = fin.avg_margin_label;

        const chartSubEl = document.getElementById('bgd-chart-subtitle');
        if (chartSubEl && fin.chart_subtitle) chartSubEl.innerText = fin.chart_subtitle;

        // 2. Khởi tạo Biểu đồ Chart.js Đa Vai Trò nếu có thư viện
        if (typeof Chart !== 'undefined') {
            if (data.role_charts) {
                renderRoleCharts(data.active_role || currentDashboardRoleView || 'DIRECTOR');
            } else if (data.charts) {
                renderBgdRevenueChart(data.charts.daily_trend);
                renderBgdDonutChart(currentDonutType);
            }
            initChartResizer();
        }

        // 3. Render 2 Widget Tương Tác Cốt Lõi: Bản Tin & Quản Lý Công Việc
        renderDashboardNews(data.announcements || []);
        renderDashboardTasks(data.my_tasks || []);
        initWidgetResizer();

        // 4. Render Bảng P&L Chuyến Xe Hỗ Trợ Click Mở Chi Tiết Chuyến, Lọc & Sắp Xếp
        rawDashboardTripsPnl = data.trips_pnl || [];
        applyDashboardPnlFilters();
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        showToast('warning', 'Không thể tải dữ liệu Dashboard. Vui lòng kiểm tra lại kết nối.', 'Cảnh báo');
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG P&L CHUYẾN XE DASHBOARD ---
let rawDashboardTripsPnl = [];
let dashboardPnlSortColumn = null;
let dashboardPnlSortDirection = 'asc';

function clearDashboardPnlSearch() {
    const input = document.getElementById('dashboard-pnl-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyDashboardPnlFilters();
}

function resetDashboardPnlFilters() {
    const status = document.getElementById('dashboard-pnl-filter-status');
    if (status) status.value = '';
    const search = document.getElementById('dashboard-pnl-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    dashboardPnlSortColumn = null;
    dashboardPnlSortDirection = 'asc';
    applyDashboardPnlFilters();
}

function toggleDashboardPnlSort(col) {
    if (dashboardPnlSortColumn === col) {
        dashboardPnlSortDirection = dashboardPnlSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        dashboardPnlSortColumn = col;
        dashboardPnlSortDirection = 'asc';
    }
    applyDashboardPnlFilters();
}

function applyDashboardPnlFilters() {
    if (!rawDashboardTripsPnl || !Array.isArray(rawDashboardTripsPnl)) return;
    const pnlTbody = document.getElementById('bgd-pnl-tbody');
    if (!pnlTbody) return;

    const filterStatus = document.getElementById('dashboard-pnl-filter-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('dashboard-pnl-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawDashboardTripsPnl.filter(item => {
        if (filterStatus) {
            if (filterStatus === 'COMPLETED' && item.status !== 'COMPLETED') return false;
            if (filterStatus === 'TRANSIT') {
                if (!['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                item.trip_code,
                item.customer_name,
                item.route,
                item.driver_name,
                item.license_plate,
                item.container_number,
                item.status_label
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('dashboard-pnl-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('dashboard-pnl-total-count');
    if (totalCountEl) totalCountEl.innerText = rawDashboardTripsPnl.length;

    // Sắp xếp
    if (dashboardPnlSortColumn) {
        list.sort((a, b) => {
            let valA = a[dashboardPnlSortColumn];
            let valB = b[dashboardPnlSortColumn];

            if (dashboardPnlSortColumn === 'loading_date') {
                const timeA = a.loading_date_iso ? new Date(a.loading_date_iso).getTime() || 0 : 0;
                const timeB = b.loading_date_iso ? new Date(b.loading_date_iso).getTime() || 0 : 0;
                return dashboardPnlSortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            if (['revenue', 'expense', 'profit', 'margin_percent'].includes(dashboardPnlSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return dashboardPnlSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return dashboardPnlSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['trip_code', 'loading_date', 'customer_name', 'driver_name', 'container_number', 'revenue', 'expense', 'profit', 'margin_percent', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-pnl-${col}`);
        if (iconEl) {
            if (dashboardPnlSortColumn === col) {
                iconEl.className = dashboardPnlSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderDashboardPnlTable(list);
}

function renderDashboardPnlTable(trips) {
    const pnlTbody = document.getElementById('bgd-pnl-tbody');
    if (!pnlTbody) return;
    pnlTbody.innerHTML = '';

    if (!trips || trips.length === 0) {
        pnlTbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-8 text-slate-400">
                    <p class="font-medium text-xs text-slate-500">Không tìm thấy chuyến xe nào phù hợp</p>
                </td>
            </tr>
        `;
        return;
    }

    trips.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/70';
        tr.title = `Bấm để xem chi tiết hồ sơ chuyến [${item.trip_code}]`;
        tr.onclick = () => {
            viewTripDetail(item.trip_code);
        };

        let statusBadge = `<span class="text-xs font-semibold text-slate-600">${escapeHtml(item.status_label || item.status)}</span>`;
        if (item.status === 'COMPLETED') {
            statusBadge = `<span class="text-xs font-semibold text-emerald-700">Đã hoàn tất</span>`;
        } else if (['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) {
            statusBadge = `<span class="text-xs font-semibold text-amber-700">Đang vận hành</span>`;
        }

        const marginVal = item.margin_percent || 0;
        const barColor = marginVal >= 50 ? 'bg-emerald-500' : (marginVal >= 25 ? 'bg-amber-500' : 'bg-rose-500');

        tr.innerHTML = `
            <td class="py-1.5 px-3 border-r border-slate-200/70 font-black text-teal-800 font-mono text-[13px] whitespace-nowrap">
                <div class="flex items-center space-x-1">
                    <span>${escapeHtml(formatCodeCompact(item.trip_code))}</span>
                    <i class="ph ph-arrow-square-out text-slate-400 group-hover:text-teal-600 transition-colors text-xs"></i>
                </div>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 whitespace-nowrap text-center text-xs font-semibold text-slate-700">
                ${escapeHtml(item.loading_date || '-')}
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-tight">${escapeHtml(item.customer_name)}</p>
                <p class="text-[11.5px] text-slate-500 font-medium truncate max-w-xs mt-0.5 leading-tight">${escapeHtml(item.route)}</p>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-tight">${escapeHtml(item.driver_name)}</p>
                <p class="text-[11.5px] text-teal-700 font-mono font-bold mt-0.5 leading-tight">${escapeHtml(item.license_plate)}</p>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 font-mono text-slate-800 font-bold text-[12.5px]">${escapeHtml(item.container_number)}</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-bold text-slate-900 tabular-nums font-mono text-[13px]">${new Intl.NumberFormat('vi-VN').format(item.revenue)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-medium text-amber-700 tabular-nums font-mono text-[13px]">-${new Intl.NumberFormat('vi-VN').format(item.expense)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-bold text-emerald-700 tabular-nums font-mono text-[13px] font-heading">${new Intl.NumberFormat('vi-VN').format(item.profit)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <span class="text-[11.5px] font-bold text-slate-700 w-9 text-right tabular-nums">${marginVal}%</span>
                    <div class="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full ${barColor}" style="width: ${Math.min(100, Math.max(0, marginVal))}%"></div>
                    </div>
                </div>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-center">${statusBadge}</td>
            <td class="py-1.5 px-3 text-center" onclick="event.stopPropagation();">
                <button onclick="viewTripDetail('${item.trip_code}')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-700 font-heading border border-teal-200 transition-colors shadow-2xs">
                    Chi Tiết
                </button>
            </td>
        `;
        pnlTbody.appendChild(tr);
    });
}

// --- HỆ THỐNG BIỂU ĐỒ PHÂN TÍCH ĐA CHIỀU THEO VAI TRÒ (ROLE-BASED CHARTS) ---
let currentActiveRole = 'DIRECTOR';
let currentDonutOption = 1;

function renderRoleTrendChart(role) {
    if (!bgdDataCache || !bgdDataCache.role_charts) return;
    const roleChartConfig = bgdDataCache.role_charts[role] || bgdDataCache.role_charts['DIRECTOR'];
    if (!roleChartConfig || !roleChartConfig.trend) return;

    const trend = roleChartConfig.trend;
    const titleEl = document.getElementById('bgd-chart-title');
    if (titleEl) titleEl.innerText = trend.title;
    const subEl = document.getElementById('bgd-chart-subtitle');
    if (subEl) subEl.innerText = trend.subtitle;

    // Render Chú Thích (Legend)
    const legendEl = document.getElementById('bgd-chart-legend');
    if (legendEl && Array.isArray(trend.datasets)) {
        let legHtml = '';
        trend.datasets.forEach(ds => {
            if (ds.type === 'line') {
                legHtml += `<span class="inline-flex items-center text-slate-700 mr-2"><span class="w-2.5 h-0.5 mr-1" style="background-color: ${ds.borderColor || '#10b981'};"></span> ${ds.label}</span>`;
            } else {
                legHtml += `<span class="inline-flex items-center text-slate-700 mr-2"><span class="w-2 h-2 rounded mr-1" style="background-color: ${ds.backgroundColor};"></span> ${ds.label}</span>`;
            }
        });
        legendEl.innerHTML = legHtml;
    }

    // Render 3 Ô Tóm Tắt Dưới Đáy Biểu Đồ
    const sumEl = document.getElementById('bgd-chart-metrics-summary');
    if (sumEl && Array.isArray(trend.summary)) {
        const themeClasses = {
            teal: 'text-teal-800 bg-slate-50 border-slate-100',
            amber: 'text-amber-700 bg-slate-50 border-slate-100',
            emerald: 'text-emerald-700 bg-emerald-50/60 border-emerald-100',
            blue: 'text-blue-700 bg-slate-50 border-slate-100',
            indigo: 'text-indigo-700 bg-indigo-50/60 border-indigo-100',
        };
        let sumHtml = '';
        trend.summary.forEach(s => {
            const cls = themeClasses[s.theme] || themeClasses.teal;
            sumHtml += `
                <div class="p-1.5 2xl:p-2 rounded-lg border ${cls}">
                    <p class="text-[10px] 2xl:text-[10.5px] text-slate-500 font-medium">${s.label}</p>
                    <p class="text-xs 2xl:text-[13px] font-black font-heading mt-0.5 tabular-nums">${s.value}</p>
                </div>
            `;
        });
        sumEl.innerHTML = sumHtml;
    }

    // Ẩn nút khôi phục mặc định biểu đồ 1
    const resetBtn1 = document.getElementById('btn-reset-chart-1');
    if (resetBtn1) {
        resetBtn1.classList.remove('inline-flex');
        resetBtn1.classList.add('hidden');
    }

    // Khởi tạo Canvas Trend Chart
    renderBgdTrendChart(trend);
}
window.renderRoleTrendChart = renderRoleTrendChart;

function renderRoleCharts(role) {
    if (!role) role = currentActiveRole || 'DIRECTOR';
    currentActiveRole = role;

    // 1. KIỂM TRA TÙY BIẾN BIỂU ĐỒ 1 (SLOT 1)
    let hasCustom1 = false;
    const savedCustom1 = localStorage.getItem('bim_custom_chart_1') || localStorage.getItem('bim_custom_pivot_chart');
    if (savedCustom1) {
        try {
            const parsed = JSON.parse(savedCustom1);
            if (parsed && parsed.data) {
                renderCustomChartOnSlot(1, parsed.data);
                hasCustom1 = true;
            }
        } catch (e) {
            console.error('Error parsing custom chart 1 from localStorage:', e);
        }
    }
    if (!hasCustom1) {
        renderRoleTrendChart(role);
    }

    // 2. KIỂM TRA TÙY BIẾN BIỂU ĐỒ 2 (SLOT 2)
    let hasCustom2 = false;
    const savedCustom2 = localStorage.getItem('bim_custom_chart_2');
    if (savedCustom2) {
        try {
            const parsed = JSON.parse(savedCustom2);
            if (parsed && parsed.data) {
                renderCustomChartOnSlot(2, parsed.data);
                hasCustom2 = true;
            }
        } catch (e) {
            console.error('Error parsing custom chart 2 from localStorage:', e);
        }
    }
    if (!hasCustom2) {
        renderRoleDonut(role, currentDonutOption);
    }
    updateDataLabelsButtonState(2, localStorage.getItem('bim_chart_datalabels_2') === 'true');
}
window.renderRoleCharts = renderRoleCharts;
