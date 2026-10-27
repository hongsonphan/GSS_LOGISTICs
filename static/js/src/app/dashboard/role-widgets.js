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
