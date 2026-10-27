// 2. PHÂN HỆ: QUẢN LÝ CÔNG VIỆC & GIAO VIỆC VĂN PHÒNG (JIRA/ASANA STANDARD)
// ==========================================================================

async function loadOfficeTasks() {
    const kanbanContainer = document.getElementById('tasks-kanban-container');
    const listTbody = document.getElementById('tasks-list-tbody');
    const totalBadge = document.getElementById('tasks-total-badge');
    const deptFilter = document.getElementById('tasks-dept-filter');
    const searchInput = document.getElementById('tasks-search-input');

    // Build URL query params
    const params = new URLSearchParams();
    params.append('view', currentTaskViewMode);
    params.append('scope', currentTaskScope);
    if (deptFilter && deptFilter.value) params.append('department', deptFilter.value);
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());

    // Nạp directory nếu chưa có
    if (officeDirectoryUsers.length === 0) {
        try {
            const dirRes = await authFetch('/api/collaboration/tasks/directory/', {
                headers: getAuthHeaders()
            });
            const dirJson = await dirRes.json();
            if (dirJson.success && dirJson.office_users) {
                officeDirectoryUsers = dirJson.office_users;
                populateAssigneeSelect();
            }
        } catch (e) {
            console.error('Error loading task directory:', e);
        }
    }

    try {
        const res = await authFetch(`/api/collaboration/tasks/?${params.toString()}`, {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success) return;

        if (totalBadge) totalBadge.textContent = `${json.counts?.total || json.total || 0} việc`;

        if (currentTaskViewMode === 'kanban') {
            renderKanbanColumns(json.columns || {});
            updateKanbanBadgeCounts(json.counts || {});
        } else {
            renderTasksListTable(json.data || []);
        }

    } catch (e) {
        console.error('Error loading tasks:', e);
    }
}

function switchTaskView(mode) {
    currentTaskViewMode = mode;
    const btnKanban = document.getElementById('btn-view-kanban');
    const btnList = document.getElementById('btn-view-list');
    const kanbanContainer = document.getElementById('tasks-kanban-container');
    const listContainer = document.getElementById('tasks-list-container');

    if (mode === 'kanban') {
        btnKanban.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-teal-800 shadow-xs';
        btnList.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900';
        kanbanContainer.classList.remove('hidden');
        listContainer.classList.add('hidden');
    } else {
        btnList.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-teal-800 shadow-xs';
        btnKanban.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900';
        kanbanContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
    }
    loadOfficeTasks();
}

function setTaskScope(scope) {
    currentTaskScope = scope;
    ['all', 'assigned_by_me', 'assigned_to_me', 'related', 'my_tasks'].forEach(s => {
        const btn = document.getElementById(`scope-${s.replace(/_/g, '-')}`);
        if (btn) {
            if (s === scope || (scope === 'assigned_to_me' && s === 'my_tasks')) {
                btn.className = 'px-2.5 py-1 rounded-lg bg-white text-teal-800 shadow-xs transition-colors';
            } else {
                btn.className = 'px-2.5 py-1 rounded-lg hover:text-teal-800 transition-colors';
            }
        }
    });
    loadOfficeTasks();
}

function renderKanbanColumns(columns) {
    const colStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

    colStatuses.forEach(st => {
        const colEl = document.getElementById(`kanban-col-${st}`);
        if (!colEl) return;

        const tasks = columns[st] || [];
        if (tasks.length === 0) {
            colEl.innerHTML = '<div class="text-center py-8 text-slate-400 text-[11px] italic">Không có công việc nào</div>';
            return;
        }

        colEl.innerHTML = tasks.map(t => {
            // Xác định màu deadline: chỉ highlight khác màu text, không bọc badge to
            let deadlineColorClass = 'text-slate-400';
            let deadlineText = t.due_date ? formatDateDMY(t.due_date) : '';
            if (t.is_overdue || (t.days_remaining !== null && t.days_remaining < 0)) {
                deadlineColorClass = 'text-rose-600 font-bold';
            } else if (t.days_remaining === 0) {
                deadlineColorClass = 'text-amber-600 font-bold';
                if (deadlineText) deadlineText = `Hôm nay (${deadlineText})`;
            } else if (t.extension_status === 'PENDING') {
                deadlineColorClass = 'text-purple-600 font-bold';
                if (deadlineText) deadlineText += ' (Chờ gia hạn)';
            }

            // Line bọc (border) trùng màu trạng thái để nổi bật trực quan
            let cardBorderClass = 'border-slate-200/90 hover:border-teal-400';
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
            <div id="task-card-${t.id}" draggable="true" ondragstart="handleDragStart(event, ${t.id})" onclick="openTaskDetailDrawer(${t.id})" class="bg-white rounded-xl p-3.5 border ${cardBorderClass} shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2.5 select-none">
                <!-- Priority & Code -->
                <div class="flex items-center justify-between text-[10px]">
                    <span class="font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">${formatTaskCode(t.code)}</span>
                    <span class="px-2 py-0.5 rounded font-extrabold uppercase tracking-wide ${getPriorityBadgeClass(t.priority)}">
                        ${getPriorityText(t.priority)}
                    </span>
                </div>

                <!-- Title -->
                <h4 class="text-xs font-extrabold text-slate-800 group-hover:text-teal-700 transition-colors leading-snug">
                    ${escapeHtml(t.title)}
                </h4>

                <!-- Meta row: Checklist & Comments & Progress -->
                <div class="flex items-center gap-3 text-[11px] text-slate-400">
                    ${t.checklists_count?.total > 0 ? `
                        <span class="flex items-center gap-1 font-semibold ${t.checklists_count.done === t.checklists_count.total ? 'text-emerald-600' : 'text-slate-600'}">
                            <i class="ph-bold ph-list-checks text-xs"></i>
                            ${t.checklists_count.done}/${t.checklists_count.total}
                        </span>
                    ` : ''}
                    ${t.comments_count > 0 ? `
                        <span class="flex items-center gap-1 font-semibold text-slate-600">
                            <i class="ph-bold ph-chat-circle-dots text-xs"></i>
                            ${t.comments_count}
                        </span>
                    ` : ''}
                    ${(t.progress_percent !== undefined && t.progress_percent !== null) ? `
                        <span class="font-mono font-bold ${t.progress_percent === 100 ? 'text-emerald-600' : 'text-teal-700'}">${t.progress_percent}%</span>
                    ` : ''}
                    <span class="text-[10px] text-slate-400 ml-auto font-medium">${t.department}</span>
                </div>

                <!-- Footer: 3 Icon: Người giao | Người phụ trách | Người liên quan + Hạn chót -->
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] select-none gap-1">
                    <div class="flex items-center gap-1.5 truncate min-w-0 text-slate-500">
                        <!-- 1. Người giao -->
                        <span class="flex items-center gap-1 truncate shrink min-w-0" title="Người giao: ${escapeHtml(cleanPersonName(t.reporter_info?.full_name) || 'Hệ thống')}">
                            <i class="ph-bold ph-paper-plane-tilt text-slate-400 shrink-0 text-[11px]"></i>
                            <span class="truncate font-medium">${escapeHtml(cleanPersonName(t.reporter_info?.full_name) || 'Hệ thống')}</span>
                        </span>

                        <span class="text-slate-300 shrink-0 font-light">|</span>

                        <!-- 2. Người phụ trách -->
                        <span class="flex items-center gap-1 truncate shrink min-w-0 font-semibold text-teal-900" title="Người phụ trách: ${escapeHtml(cleanPersonName(t.assignee_info?.full_name) || 'Chưa gán')}">
                            <i class="ph-bold ph-user-check text-teal-600 shrink-0 text-[11px]"></i>
                            <span class="truncate">${escapeHtml(cleanPersonName(t.assignee_info?.full_name) || 'Chưa gán')}</span>
                        </span>

                        ${(t.followers_info && t.followers_info.length > 0) ? `
                        <span class="text-slate-300 shrink-0 font-light">|</span>
                        <!-- 3. Người liên quan -->
                        <span class="flex items-center gap-1 text-teal-700 shrink-0 font-bold bg-teal-50 px-1 py-0.2 rounded border border-teal-200/80" title="Người liên quan / theo dõi: ${escapeHtml(t.followers_info.map(f => cleanPersonName(f.full_name)).join(', '))}">
                            <i class="ph-bold ph-users text-teal-600 shrink-0 text-[11px]"></i>
                            <span>${t.followers_info.length}</span>
                        </span>
                        ` : ''}
                    </div>

                    ${deadlineText ? `
                        <span class="text-[9.5px] font-semibold shrink-0 ml-1 ${deadlineColorClass}">
                            ${deadlineText}
                        </span>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
    });
}

function updateKanbanBadgeCounts(counts) {
    const bTodo = document.getElementById('badge-count-todo');
    const bInp = document.getElementById('badge-count-in_progress');
    const bRev = document.getElementById('badge-count-review');
    const bDone = document.getElementById('badge-count-done');

    if (bTodo) bTodo.textContent = counts.todo || 0;
    if (bInp) bInp.textContent = counts.in_progress || 0;
    if (bRev) bRev.textContent = counts.review || 0;
    if (bDone) bDone.textContent = counts.done || 0;
}

function renderTasksListTable(tasks) {
    const tbody = document.getElementById('tasks-list-tbody');
    if (!tbody) return;

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-12 text-slate-400">Không có công việc nào</td></tr>';
        return;
    }

    tbody.innerHTML = tasks.map(t => {
        let rowBorderClass = 'border-l-2 border-transparent';
        if (t.status === 'DONE') {
            rowBorderClass = 'border-l-4 border-l-emerald-400';
        } else if (t.extension_status === 'PENDING') {
            rowBorderClass = 'border-l-4 border-l-purple-500 bg-purple-50/15';
        } else if (t.is_overdue || (t.days_remaining !== null && t.days_remaining < 0)) {
            rowBorderClass = 'border-l-4 border-l-rose-500 bg-rose-50/15';
        } else if (t.days_remaining === 0) {
            rowBorderClass = 'border-l-4 border-l-amber-500 bg-amber-50/15';
        }

        return `
        <tr onclick="openTaskDetailDrawer(${t.id})" class="hover:bg-slate-50 cursor-pointer transition-colors ${rowBorderClass}">
            <td class="py-3 px-4 font-mono font-bold text-teal-800">${formatTaskCode(t.code)}</td>
            <td class="py-3 px-4 font-bold text-slate-800">${escapeHtml(t.title)}</td>
            <td class="py-3 px-4 text-slate-600 font-medium">${t.department}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getPriorityBadgeClass(t.priority)}">
                    ${getPriorityText(t.priority)}
                </span>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-700">${escapeHtml(cleanPersonName(t.assignee_info?.full_name) || 'Chưa gán')}</td>
            <td class="py-3 px-4">
                <span class="${t.is_overdue ? 'text-rose-600 font-bold' : (t.days_remaining === 0 ? 'text-amber-600 font-bold' : (t.extension_status === 'PENDING' ? 'text-purple-600 font-bold' : 'text-slate-600 font-medium'))}">
                    ${t.due_date ? formatDateDMY(t.due_date) : '-'}${t.extension_status === 'PENDING' ? ' (Chờ gia hạn)' : ''}
                </span>
            </td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-slate-700">${t.progress_percent || 0}%</span>
                    <div class="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-teal-600 h-full rounded-full transition-all" style="width: ${t.progress_percent || 0}%"></div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(t.status)}">
                    ${getStatusText(t.status)}
                </span>
            </td>
            <td class="py-3 px-4 text-center">
                <button type="button" class="text-teal-700 hover:text-teal-900 font-bold">Xem</button>
            </td>
        </tr>
        `;
    }).join('');
}

// Drag & Drop handlers for Kanban
let draggedTaskId = null;
function handleDragStart(e, taskId) {
    draggedTaskId = taskId;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e, targetStatus) {
    e.preventDefault();
    if (!draggedTaskId) return;

    try {
        const res = await authFetch(`/api/collaboration/tasks/${draggedTaskId}/status/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status: targetStatus })
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', json.message);
            loadOfficeTasks();
        }
    } catch (e) {
        console.error('Error changing task status:', e);
    } finally {
        draggedTaskId = null;
    }
}
