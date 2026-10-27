// Quản lý danh sách Người liên quan (Theo dõi chung) trong modal tạo việc (Hỗ trợ Multi-Select)
let createTaskFollowersList = []; // Mảng chứa các user_id đã chọn

async function ensureOfficeDirectoryLoaded() {
    if (officeDirectoryUsers && officeDirectoryUsers.length > 0) {
        return officeDirectoryUsers;
    }
    // Ưu tiên nạp tức thì từ window.PRELOADED_OFFICE_USERS (Zero latency)
    if (window.PRELOADED_OFFICE_USERS && Array.isArray(window.PRELOADED_OFFICE_USERS) && window.PRELOADED_OFFICE_USERS.length > 0) {
        officeDirectoryUsers = window.PRELOADED_OFFICE_USERS;
        return officeDirectoryUsers;
    }
    // Fallback nạp từ API bất đồng bộ
    try {
        const res = await authFetch('/api/collaboration/tasks/directory/', {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success && json.office_users) {
            officeDirectoryUsers = json.office_users || [];
            collaborationUserPerms = json.current_user_permission || null;
            return officeDirectoryUsers;
        }
    } catch (e) {
        console.error('Error fetching office directory:', e);
    }
    return officeDirectoryUsers || [];
}
window.ensureOfficeDirectoryLoaded = ensureOfficeDirectoryLoaded;

function toggleFollowersDropdown(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('task-followers-dropdown-panel');
    const chevron = document.getElementById('task-followers-chevron');
    if (!panel) return;

    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
        renderFollowersMultiSelectOptions();
        const searchInput = document.getElementById('task-followers-search');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 50);
        }
    } else {
        closeFollowersDropdown();
    }
}
window.toggleFollowersDropdown = toggleFollowersDropdown;

function closeFollowersDropdown() {
    const panel = document.getElementById('task-followers-dropdown-panel');
    const chevron = document.getElementById('task-followers-chevron');
    if (panel) panel.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
}
window.closeFollowersDropdown = closeFollowersDropdown;

function renderFollowersMultiSelectOptions(searchQuery = '') {
    const container = document.getElementById('task-followers-options-list');
    if (!container) return;

    const q = searchQuery.trim().toLowerCase();
    const users = (officeDirectoryUsers || []).filter(u => {
        if (!q) return true;
        const name = (u.full_name || '').toLowerCase();
        const dept = (u.department_name || u.department || '').toLowerCase();
        const role = (u.role || u.position || '').toLowerCase();
        const code = (u.employee_code || '').toLowerCase();
        return name.includes(q) || dept.includes(q) || role.includes(q) || code.includes(q);
    });

    if (users.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs italic">Không tìm thấy nhân sự phù hợp</div>';
        return;
    }

    let html = '';
    users.forEach(u => {
        const isChecked = createTaskFollowersList.includes(u.user_id);
        const initial = (u.full_name || 'U').charAt(0).toUpperCase();
        const dept = u.department_name || u.department || 'Văn Phòng';
        const role = u.role || u.position || u.employee_code || 'Nhân viên';

        html += `
            <div onclick="toggleFollowerSelection(${u.user_id})" class="grid grid-cols-12 items-center gap-2 px-3 py-2 rounded-xl hover:bg-teal-50/70 cursor-pointer select-none transition-all border ${isChecked ? 'bg-teal-50/70 border-teal-200 font-semibold shadow-2xs' : 'border-slate-100 hover:border-teal-200'}">
                <!-- Cột 1: Checkbox & Phòng ban (4 cols) -->
                <div class="col-span-4 flex items-center gap-2 min-w-0">
                    <input type="checkbox" id="chk-follower-${u.user_id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleFollowerSelection(${u.user_id});" class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0">
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 truncate" title="${escapeHtml(dept)}">
                        ${escapeHtml(dept)}
                    </span>
                </div>
                <!-- Cột 2: Tên người (Avatar + Họ tên) (5 cols) -->
                <div class="col-span-5 flex items-center gap-2 min-w-0">
                    <div class="w-6 h-6 rounded-full bg-teal-700 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                        ${initial}
                    </div>
                    <span class="text-xs text-slate-900 font-bold truncate" title="${escapeHtml(u.full_name)}">
                        ${escapeHtml(cleanPersonName(u.full_name))}
                    </span>
                </div>
                <!-- Cột 3: Chức vụ (3 cols) -->
                <div class="col-span-3 text-right truncate">
                    <span class="text-[11px] text-slate-500 font-normal" title="${escapeHtml(role)}">
                        ${escapeHtml(role)}
                    </span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateFollowersCounterUI();
}
window.renderFollowersMultiSelectOptions = renderFollowersMultiSelectOptions;

function toggleFollowerSelection(userId) {
    userId = parseInt(userId);
    if (!userId) return;

    const idx = createTaskFollowersList.indexOf(userId);
    if (idx > -1) {
        createTaskFollowersList.splice(idx, 1);
    } else {
        createTaskFollowersList.push(userId);
    }

    // Update checkbox & class nếu panel đang mở
    const chk = document.getElementById(`chk-follower-${userId}`);
    if (chk) chk.checked = createTaskFollowersList.includes(userId);

    renderCreateTaskFollowersChips();
    updateFollowersCounterUI();
}
window.toggleFollowerSelection = toggleFollowerSelection;

function selectAllFollowers() {
    const searchInput = document.getElementById('task-followers-search');
    const q = (searchInput?.value || '').trim().toLowerCase();
    
    // Nếu có tìm kiếm thì chỉ chọn những người đang hiển thị trong search
    const visibleUsers = (officeDirectoryUsers || []).filter(u => {
        if (!q) return true;
        const name = (u.full_name || '').toLowerCase();
        const dept = (u.department_name || '').toLowerCase();
        return name.includes(q) || dept.includes(q);
    });

    visibleUsers.forEach(u => {
        if (!createTaskFollowersList.includes(u.user_id)) {
            createTaskFollowersList.push(u.user_id);
        }
    });

    renderFollowersMultiSelectOptions(q);
    renderCreateTaskFollowersChips();
    updateFollowersCounterUI();
}
window.selectAllFollowers = selectAllFollowers;

function clearAllFollowers() {
    createTaskFollowersList = [];
    const searchInput = document.getElementById('task-followers-search');
    renderFollowersMultiSelectOptions(searchInput?.value || '');
    renderCreateTaskFollowersChips();
    updateFollowersCounterUI();
}
window.clearAllFollowers = clearAllFollowers;

function filterFollowersDropdown(val) {
    renderFollowersMultiSelectOptions(val);
}
window.filterFollowersDropdown = filterFollowersDropdown;

function removeCreateTaskFollower(userId) {
    userId = parseInt(userId);
    createTaskFollowersList = createTaskFollowersList.filter(id => id !== userId);
    
    // Cập nhật checkbox trong dropdown nếu đang mở
    const chk = document.getElementById(`chk-follower-${userId}`);
    if (chk) chk.checked = false;

    renderCreateTaskFollowersChips();
    updateFollowersCounterUI();
}
window.removeCreateTaskFollower = removeCreateTaskFollower;

function updateFollowersCounterUI() {
    const count = createTaskFollowersList.length;
    const badge = document.getElementById('task-followers-count-badge');
    const summaryCount = document.getElementById('task-followers-summary-count');

    if (badge) {
        if (count > 0) {
            badge.textContent = `${count} người`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (summaryCount) {
        summaryCount.textContent = count;
    }
}

function renderCreateTaskFollowersChips() {
    const container = document.getElementById('create-task-followers-chips');
    if (!container) return;

    if (createTaskFollowersList.length === 0) {
        container.innerHTML = `
            <span id="create-task-followers-placeholder" class="text-xs text-slate-400 select-none">
                -- Bấm để chọn người liên quan (chọn nhiều) --
            </span>
        `;
        return;
    }

    const selectedUsers = officeDirectoryUsers.filter(u => createTaskFollowersList.includes(u.user_id));

    container.innerHTML = selectedUsers.map(u => `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/90 shadow-2xs animate-fade-in select-none">
            <i class="ph-bold ph-user-circle text-teal-600 text-sm"></i>
            <span>${escapeHtml(u.full_name)} <span class="text-[10px] text-teal-600/80 font-normal">(${escapeHtml(u.department_name)})</span></span>
            <button type="button" onclick="event.stopPropagation(); removeCreateTaskFollower(${u.user_id});" class="ml-0.5 text-teal-600 hover:text-rose-600 hover:bg-rose-50 rounded p-0.5 transition-colors" title="Bỏ chọn">
                <i class="ph-bold ph-x text-[11px]"></i>
            </button>
        </span>
    `).join('');
}
window.renderCreateTaskFollowersChips = renderCreateTaskFollowersChips;

// Lắng nghe click bên ngoài để đóng dropdown panel
document.addEventListener('click', (e) => {
    const multiselect = document.getElementById('task-followers-multiselect-container');
    if (multiselect && !multiselect.contains(e.target)) {
        closeFollowersDropdown();
    }
});

async function populateAssigneeSelect(targetDepartment = null) {
    const select = document.getElementById('create-task-assignee');
    if (!select) return;

    await ensureOfficeDirectoryLoaded();

    const currentVal = select.value;
    const deptSelect = document.getElementById('create-task-department');
    const selectedDept = targetDepartment || deptSelect?.value || 'DISPATCH';
    const deptName = deptSelect?.options[deptSelect.selectedIndex]?.text || selectedDept;

    select.innerHTML = `<option value="">-- Chọn người phụ trách (${deptName}) --</option>`;
    const myId = window.CURRENT_USER?.id;

    // CHỈ LẤY DUY NHẤT NHÂN SỰ THUỘC ĐÚNG PHÒNG BAN ĐÃ CHỌN ĐỂ LỌC DỄ DÀNG
    const deptUsers = (officeDirectoryUsers || []).filter(u => {
        const userDept = String(u.department || u.department_code || '').trim().toUpperCase();
        const targetDept = String(selectedDept || '').trim().toUpperCase();
        return userDept === targetDept;
    });

    if (deptUsers.length > 0) {
        deptUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id;
            const isMe = u.user_id === myId;
            if (isMe) {
                opt.textContent = `${cleanPersonName(u.full_name)} — [Chính bạn - Việc cá nhân]`;
                select.appendChild(opt);
            } else if (u.can_assign !== false) {
                opt.textContent = `${cleanPersonName(u.full_name)} — ${u.role || u.position || ''}`;
                select.appendChild(opt);
            } else {
                opt.textContent = `${cleanPersonName(u.full_name)} — [Cấp trên / Ngoài thẩm quyền]`;
                opt.disabled = true;
                opt.className = 'text-slate-400 bg-slate-50';
                select.appendChild(opt);
            }
        });
    } else {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = "";
        emptyOpt.disabled = true;
        emptyOpt.textContent = `(Chưa có nhân sự trong ${deptName})`;
        select.appendChild(emptyOpt);
    }

    // Nếu giá trị hiện tại vẫn thuộc đúng phòng ban mới này thì giữ nguyên
    if (currentVal && select.querySelector(`option[value="${currentVal}"]:not([disabled])`)) {
        select.value = currentVal;
    } else if (deptUsers.length > 0) {
        // Tự động chọn nhân sự đầu tiên hợp lệ trong phòng ban
        const firstAssignable = deptUsers.find(u => u.can_assign !== false || u.user_id === myId);
        if (firstAssignable) {
            select.value = firstAssignable.user_id;
        } else {
            select.value = "";
        }
    } else {
        select.value = "";
    }
}
window.populateAssigneeSelect = populateAssigneeSelect;

function onTaskDepartmentChanged() {
    const deptSelect = document.getElementById('create-task-department');
    if (deptSelect) {
        populateAssigneeSelect(deptSelect.value);
    }
}
window.onTaskDepartmentChanged = onTaskDepartmentChanged;

// Quản lý Checklist và Tệp đính kèm khởi tạo trong trang con Tạo việc
let createTaskInitialChecklists = [];
let createTaskInitialFiles = [];

function addInitialChecklistItem() {
    const input = document.getElementById('create-task-new-checklist-input');
    if (!input || !input.value.trim()) return;

    const val = input.value.trim();
    createTaskInitialChecklists.push(val);
    input.value = '';
    renderCreateTaskInitialChecklists();
}
window.addInitialChecklistItem = addInitialChecklistItem;

function removeInitialChecklistItem(idx) {
    if (idx >= 0 && idx < createTaskInitialChecklists.length) {
        createTaskInitialChecklists.splice(idx, 1);
        renderCreateTaskInitialChecklists();
    }
}
window.removeInitialChecklistItem = removeInitialChecklistItem;

function renderCreateTaskInitialChecklists() {
    const listEl = document.getElementById('create-task-checklists-list');
    const countEl = document.getElementById('create-task-checklists-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = `${createTaskInitialChecklists.length} mục`;

    if (createTaskInitialChecklists.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 italic py-1" id="create-task-checklists-empty">Chưa có bước kiểm tra nào được thêm</div>';
        return;
    }

    listEl.innerHTML = createTaskInitialChecklists.map((title, idx) => `
        <div class="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors">
            <span class="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
                <span class="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0">${idx + 1}</span>
                <span class="truncate">${escapeHtml(title)}</span>
            </span>
            <button type="button" onclick="removeInitialChecklistItem(${idx})" class="text-slate-400 hover:text-rose-600 p-1 transition-colors" title="Xóa bước này">
                <i class="ph ph-trash text-xs"></i>
            </button>
        </div>
    `).join('');
}
window.renderCreateTaskInitialChecklists = renderCreateTaskInitialChecklists;

function handleInitialFilesSelected(input) {
    if (!input || !input.files) return;
    for (let i = 0; i < input.files.length; i++) {
        createTaskInitialFiles.push(input.files[i]);
    }
    input.value = '';
    renderCreateTaskInitialFiles();
}
window.handleInitialFilesSelected = handleInitialFilesSelected;

function removeInitialFile(idx) {
    if (idx >= 0 && idx < createTaskInitialFiles.length) {
        createTaskInitialFiles.splice(idx, 1);
        renderCreateTaskInitialFiles();
    }
}
window.removeInitialFile = removeInitialFile;

function renderCreateTaskInitialFiles() {
    const previewEl = document.getElementById('create-task-files-preview');
    if (!previewEl) return;

    if (createTaskInitialFiles.length === 0) {
        previewEl.innerHTML = '<div class="text-xs text-slate-400 italic py-1" id="create-task-files-empty">Chưa có tệp đính kèm nào</div>';
        return;
    }

    previewEl.innerHTML = createTaskInitialFiles.map((file, idx) => `
        <div class="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs">
            <span class="flex items-center gap-2 truncate text-slate-700 min-w-0">
                <i class="ph-bold ph-file-text text-teal-600 text-sm shrink-0"></i>
                <span class="truncate font-medium">${escapeHtml(file.name)}</span>
                <span class="text-[10px] text-slate-400 shrink-0 font-normal">(${Math.round(file.size / 1024)} KB)</span>
            </span>
            <button type="button" onclick="removeInitialFile(${idx})" class="text-slate-400 hover:text-rose-600 p-1 transition-colors" title="Bỏ tệp này">
                <i class="ph ph-x text-xs"></i>
            </button>
        </div>
    `).join('');
}
window.renderCreateTaskInitialFiles = renderCreateTaskInitialFiles;


function setCreateTaskDueDateOffset(days) {
    const dueInput = document.getElementById('create-task-due');
    if (!dueInput) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    dueInput.value = `${yyyy}-${mm}-${dd}`;

    updateDueDateQuickPills(days);
}
window.setCreateTaskDueDateOffset = setCreateTaskDueDateOffset;

function updateDueDateQuickPills(activeDays) {
    const dueInput = document.getElementById('create-task-due');
    if (!dueInput) return;

    if (activeDays === undefined && dueInput.value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parts = dueInput.value.split('-');
        if (parts.length === 3) {
            const selected = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            selected.setHours(0, 0, 0, 0);
            const diffTime = selected.getTime() - today.getTime();
            activeDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        }
    }

    [1, 3, 7].forEach(d => {
        const btn = document.getElementById(`btn-due-offset-${d}`);
        if (!btn) return;
        if (d === activeDays) {
            btn.className = "px-1.5 py-0.5 rounded text-[10.5px] font-extrabold bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs cursor-pointer";
        } else {
            btn.className = "px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-teal-50 hover:text-teal-800 transition-colors cursor-pointer";
        }
    });
}
window.updateDueDateQuickPills = updateDueDateQuickPills;

async function openCreateTaskModal() {
    const modal = document.getElementById('modal-create-task');
    if (modal) {
        createTaskFollowersList = [];
        createTaskInitialChecklists = [];
        createTaskInitialFiles = [];
        renderCreateTaskFollowersChips();
        renderCreateTaskInitialChecklists();
        renderCreateTaskInitialFiles();

        const reporterDisplay = document.getElementById('create-task-reporter-display');
        if (reporterDisplay && window.CURRENT_USER) {
            reporterDisplay.innerHTML = `
                <i class="ph-bold ph-user-circle text-teal-600 text-sm"></i>
                <span class="truncate">${escapeHtml(window.CURRENT_USER.full_name || window.CURRENT_USER.username)}</span>
            `;
        }

        // Mặc định hạn hoàn thành là ngày mai (+1 ngày) và kích hoạt nút +1d
        setCreateTaskDueDateOffset(1);

        // Đồng bộ phòng ban mặc định và nạp danh sách người phụ trách thuộc phòng ban đó
        const deptSelect = document.getElementById('create-task-department');
        const defaultDept = deptSelect?.value || 'DISPATCH';
        await populateAssigneeSelect(defaultDept);
        modal.classList.remove('hidden');
    }
}

function closeCreateTaskModal() {
    const modal = document.getElementById('modal-create-task');
    if (modal) {
        modal.classList.add('hidden');
        createTaskFollowersList = [];
        createTaskInitialChecklists = [];
        createTaskInitialFiles = [];
        renderCreateTaskFollowersChips();
        renderCreateTaskInitialChecklists();
        renderCreateTaskInitialFiles();
    }
}

// ESC key to close create task modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-create-task');
        if (modal && !modal.classList.contains('hidden')) {
            closeCreateTaskModal();
        }
    }
});

async function handleCreateTaskSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('create-task-title').value.trim();
    const department = document.getElementById('create-task-department').value;
    const priority = document.getElementById('create-task-priority').value;
    const assigneeId = document.getElementById('create-task-assignee').value || null;
    const dueDate = document.getElementById('create-task-due').value || null;
    const description = document.getElementById('create-task-description').value.trim();
    const followersIds = createTaskFollowersList.map(item => (typeof item === 'object' && item !== null) ? item.user_id : parseInt(item)).filter(id => !isNaN(id) && id > 0);

    if (!title) {
        showToast('warning', 'Vui lòng nhập tên công việc.');
        return;
    }

    try {
        const res = await authFetch('/api/collaboration/tasks/', {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                title,
                department,
                priority,
                assignee_id: assigneeId,
                followers_ids: followersIds,
                due_date: dueDate,
                description,
                checklists: createTaskInitialChecklists
            })
        });
        const json = await res.json();
        if (json.success) {
            const newTaskId = json.data?.id;

            // Nếu có tệp đính kèm ban đầu, tải lên ngay lập tức
            if (newTaskId && createTaskInitialFiles.length > 0) {
                try {
                    const formData = new FormData();
                    createTaskInitialFiles.forEach(f => formData.append('files', f));
                    const uploadHeaders = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
                    delete uploadHeaders['Content-Type']; // Để browser tự động set multipart boundary
                    await fetch(`/api/collaboration/tasks/${newTaskId}/attachments/`, {
                        method: 'POST',
                        headers: uploadHeaders,
                        body: formData
                    });
                } catch (errUpload) {
                    console.error('Error uploading initial attachments:', errUpload);
                }
            }

            showToast('success', json.message);
            closeCreateTaskModal();
            document.getElementById('create-task-form').reset();
            createTaskFollowersList = [];
            createTaskInitialChecklists = [];
            createTaskInitialFiles = [];
            renderCreateTaskFollowersChips();
            renderCreateTaskInitialChecklists();
            renderCreateTaskInitialFiles();
            loadOfficeTasks();
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            showToast('error', json.message || 'Không thể tạo công việc.');
        }
    } catch (e) {
        console.error('Error creating task:', e);
    }
}
