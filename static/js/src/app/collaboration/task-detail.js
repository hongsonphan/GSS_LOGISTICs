let currentTaskDetailData = null;
let isTaskDetailInEditMode = false;

function setTaskDetailEditMode(isEdit) {
    isTaskDetailInEditMode = !!isEdit;
    const viewHeader = document.getElementById('task-drawer-view-header');
    const editHeader = document.getElementById('task-drawer-edit-header');
    const viewMeta = document.getElementById('task-drawer-view-meta');
    const editMeta = document.getElementById('task-drawer-edit-meta');
    const editBtn = document.getElementById('btn-task-edit-bottom');
    const saveBtn = document.getElementById('btn-task-save-bottom');

    if (isTaskDetailInEditMode) {
        if (viewHeader) viewHeader.classList.add('hidden');
        if (editHeader) editHeader.classList.remove('hidden');
        if (viewMeta) viewMeta.classList.add('hidden');
        if (editMeta) editMeta.classList.remove('hidden');

        if (editBtn) {
            editBtn.className = "px-5 py-2.5 bg-transparent border border-slate-400 text-slate-700 hover:bg-slate-200 rounded-xl font-bold font-heading text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer";
            editBtn.innerHTML = '<i class="ph-bold ph-x text-base"></i><span>Hủy sửa</span>';
        }
        if (saveBtn) {
            saveBtn.classList.remove('opacity-50', 'pointer-events-none');
            saveBtn.classList.add('hover:bg-teal-700', 'shadow-sm');
        }
    } else {
        if (viewHeader) viewHeader.classList.remove('hidden');
        if (editHeader) editHeader.classList.add('hidden');
        if (viewMeta) viewMeta.classList.remove('hidden');
        if (editMeta) editMeta.classList.add('hidden');

        if (editBtn) {
            editBtn.className = "px-5 py-2.5 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl font-bold font-heading text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer";
            editBtn.innerHTML = '<i class="ph-bold ph-pencil-simple text-base"></i><span>Sửa</span>';
        }
        if (saveBtn) {
            saveBtn.classList.add('opacity-50', 'pointer-events-none');
            saveBtn.classList.remove('hover:bg-teal-700', 'shadow-sm');
        }
    }
}
window.setTaskDetailEditMode = setTaskDetailEditMode;

function toggleEditCurrentTask() {
    setTaskDetailEditMode(!isTaskDetailInEditMode);
}
window.toggleEditCurrentTask = toggleEditCurrentTask;

async function populateTaskDetailAssigneeSelect(targetDepartment = null, selectedAssigneeId = null) {
    const select = document.getElementById('task-drawer-edit-assignee');
    if (!select) return;

    await ensureOfficeDirectoryLoaded();

    const deptSelect = document.getElementById('task-drawer-edit-department');
    const selectedDept = targetDepartment || deptSelect?.value || 'DISPATCH';
    const deptName = deptSelect?.options[deptSelect.selectedIndex]?.text || selectedDept;

    select.innerHTML = `<option value="">-- Chọn người phụ trách (${deptName}) --</option>`;

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
            opt.textContent = `${cleanPersonName(u.full_name)} — ${u.role || u.position || ''}`;
            select.appendChild(opt);
        });
    } else {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = "";
        emptyOpt.disabled = true;
        emptyOpt.textContent = `(Chưa có nhân sự trong ${deptName})`;
        select.appendChild(emptyOpt);
    }

    if (selectedAssigneeId && select.querySelector(`option[value="${selectedAssigneeId}"]`)) {
        select.value = selectedAssigneeId;
    } else if (deptUsers.length > 0) {
        select.value = deptUsers[0].user_id;
    } else {
        select.value = "";
    }
}
window.populateTaskDetailAssigneeSelect = populateTaskDetailAssigneeSelect;

function onTaskDetailDepartmentChanged() {
    const deptSelect = document.getElementById('task-drawer-edit-department');
    if (deptSelect) {
        populateTaskDetailAssigneeSelect(deptSelect.value);
    }
}
window.onTaskDetailDepartmentChanged = onTaskDetailDepartmentChanged;

async function saveCurrentTaskEdits() {
    if (!currentViewingTaskId) return;

    const titleInput = document.getElementById('task-drawer-edit-title');
    const descInput = document.getElementById('task-drawer-edit-desc');
    const deptSelect = document.getElementById('task-drawer-edit-department');
    const assigneeSelect = document.getElementById('task-drawer-edit-assignee');
    const dueInput = document.getElementById('task-drawer-edit-due');

    const title = titleInput?.value.trim();
    if (!title) {
        showToast('warning', 'Vui lòng nhập tiêu đề công việc.');
        return;
    }

    const payload = {
        title: title,
        description: descInput?.value.trim() || '',
        department: deptSelect?.value || 'DISPATCH',
        assignee_id: assigneeSelect?.value ? parseInt(assigneeSelect.value) : null,
        due_date: dueInput?.value || null
    };

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/`, {
            method: 'PUT',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', json.message || 'Cập nhật công việc thành công.');
            setTaskDetailEditMode(false);
            await openTaskDetailDrawer(currentViewingTaskId);
            loadOfficeTasks();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast('error', json.message || 'Không thể lưu thay đổi.');
        }
    } catch (e) {
        console.error('Error saving task edits:', e);
        showToast('error', 'Có lỗi xảy ra khi lưu thay đổi.');
    }
}
window.saveCurrentTaskEdits = saveCurrentTaskEdits;

function printCurrentTaskSlip() {
    if (!currentTaskDetailData) {
        showToast('warning', 'Chưa có thông tin công việc để in.');
        return;
    }
    const t = currentTaskDetailData;
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
        window.print();
        return;
    }

    const checklistsHtml = (t.checklists || []).map((c, i) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 10px; text-align: center; width: 40px; font-weight: 700;">${i + 1}</td>
            <td style="padding: 6px 10px; width: 45px; text-align: center; font-size: 16px;">${c.is_completed ? '☑' : '☐'}</td>
            <td style="padding: 6px 10px; ${c.is_completed ? 'text-decoration: line-through; color: #64748b;' : 'font-weight: 600;'}">${escapeHtml(c.title)}</td>
        </tr>
    `).join('');

    const attachmentsHtml = (t.attachments || []).map((a, i) => `
        <li style="margin-bottom: 4px;">${i + 1}. ${escapeHtml(a.original_name)}</li>
    `).join('');

    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Phiếu Giao Việc - ${formatTaskCode(t.code)}</title>
            <style>
                @page { size: A4 portrait; margin: 15mm 20mm; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
                .header-table { width: 100%; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
                .company-title { font-size: 16px; font-weight: 900; color: #0f766e; text-transform: uppercase; }
                .doc-title { font-size: 20px; font-weight: 900; text-align: center; text-transform: uppercase; margin: 16px 0 6px 0; color: #0f172a; }
                .doc-code { text-align: center; font-family: monospace; font-weight: 700; color: #0f766e; margin-bottom: 20px; font-size: 13px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f8fafc; border: 1px solid #cbd5e1; }
                .info-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; }
                .info-label { font-weight: 700; color: #475569; width: 22%; background: #f1f5f9; text-transform: uppercase; font-size: 11px; }
                .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f766e; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 16px 0 8px 0; }
                .task-desc { padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-line; margin-bottom: 16px; }
                .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .checklist-table th { background: #0f766e; color: #fff; padding: 6px 10px; font-size: 11px; text-transform: uppercase; text-align: left; }
                .signatures-table { width: 100%; margin-top: 40px; text-align: center; border-collapse: collapse; }
                .signatures-table td { width: 50%; vertical-align: top; padding: 10px; }
                .sig-title { font-weight: 800; text-transform: uppercase; font-size: 12px; margin-bottom: 70px; }
                .sig-name { font-weight: 700; font-size: 13px; }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td>
                        <div class="company-title">CÔNG TY TNHH VẬN TẢI & LOGISTICS TRIỀN VÕ</div>
                        <div style="font-size: 11px; color: #64748b;">Hệ sinh thái Quản trị Vận tải & Chuỗi cung ứng BIM Logistics</div>
                    </td>
                    <td style="text-align: right; font-size: 11px; color: #64748b;">
                        Ngày in: ${new Date().toLocaleDateString('vi-VN')}
                    </td>
                </tr>
            </table>

            <div class="doc-title">PHIẾU BÀN GIAO & THEO DÕI NHIỆM VỤ NỘI BỘ</div>
            <div class="doc-code">Mã nhiệm vụ: ${formatTaskCode(t.code)} • Tiến độ: ${t.progress_percent || 0}%</div>

            <table class="info-table">
                <tr>
                    <td class="info-label">Người giao việc</td>
                    <td><strong>${escapeHtml(cleanPersonName(t.reporter_info?.full_name) || 'Hệ thống')}</strong></td>
                    <td class="info-label">Phòng ban</td>
                    <td><strong>${escapeHtml(t.department || 'Văn Phòng')}</strong></td>
                </tr>
                <tr>
                    <td class="info-label">Người phụ trách</td>
                    <td><strong>${escapeHtml(cleanPersonName(t.assignee_info?.full_name) || 'Chưa gán')}</strong></td>
                    <td class="info-label">Hạn hoàn thành</td>
                    <td><strong>${t.due_date ? formatDateDMY(t.due_date) : 'Không có'}</strong></td>
                </tr>
                <tr>
                    <td class="info-label">Mức độ ưu tiên</td>
                    <td><strong>${getPriorityText(t.priority)}</strong></td>
                    <td class="info-label">Trạng thái hiện tại</td>
                    <td><strong>${getStatusText(t.status)}</strong></td>
                </tr>
            </table>

            <div class="section-title">Tiêu đề & Nội dung công việc</div>
            <div style="font-size: 14px; font-weight: 800; margin-bottom: 6px; color: #0f172a;">${escapeHtml(t.title)}</div>
            <div class="task-desc">${escapeHtml(t.description || 'Không có mô tả chi tiết.')}</div>

            ${(t.checklists && t.checklists.length > 0) ? `
                <div class="section-title">Checklist các tiêu chí bàn giao & kiểm tra</div>
                <table class="checklist-table">
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 40px;">STT</th>
                            <th style="text-align: center; width: 45px;">Đạt</th>
                            <th>Nội dung bước kiểm tra</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${checklistsHtml}
                    </tbody>
                </table>
            ` : ''}

            ${(t.attachments && t.attachments.length > 0) ? `
                <div class="section-title">Tài liệu & Hồ sơ đính kèm</div>
                <ul style="padding-left: 20px; font-size: 12px; color: #475569; margin: 4px 0 16px 0;">
                    ${attachmentsHtml}
                </ul>
            ` : ''}

            <table class="signatures-table">
                <tr>
                    <td>
                        <div class="sig-title">Người phụ trách thực hiện</div>
                        <div class="sig-name">${escapeHtml(cleanPersonName(t.assignee_info?.full_name) || '')}</div>
                    </td>
                    <td>
                        <div class="sig-title">Người giao việc / Quản lý</div>
                        <div class="sig-name">${escapeHtml(cleanPersonName(t.reporter_info?.full_name) || '')}</div>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 400);
}
window.printCurrentTaskSlip = printCurrentTaskSlip;

// Modal Xem và Sửa chi tiết công việc (Hộp thoại Trung tâm, chuẩn SaaS Bộ 4 nút)
function resetTaskExtensionUI() {
    const extBanner = document.getElementById('task-drawer-extension-banner');
    if (extBanner) {
        extBanner.classList.add('hidden');
        extBanner.style.display = 'none';
        const oldDueEl = document.getElementById('ext-banner-old-due');
        if (oldDueEl) oldDueEl.textContent = '';
        const newDueEl = document.getElementById('ext-banner-new-due');
        if (newDueEl) newDueEl.textContent = '';
        const reasonEl = document.getElementById('ext-banner-reason');
        if (reasonEl) reasonEl.textContent = '';
        const byEl = document.getElementById('ext-banner-by');
        if (byEl) byEl.textContent = '';
        const atEl = document.getElementById('ext-banner-at');
        if (atEl) atEl.textContent = '';
    }

    const extActionsReporter = document.getElementById('ext-banner-actions-reporter');
    if (extActionsReporter) {
        extActionsReporter.classList.add('hidden');
        extActionsReporter.style.display = 'none';
    }

    const extActionsAssignee = document.getElementById('ext-banner-actions-assignee');
    if (extActionsAssignee) {
        extActionsAssignee.classList.add('hidden');
        extActionsAssignee.style.display = 'none';
    }

    const rejectBox = document.getElementById('ext-reject-reason-box');
    if (rejectBox) {
        rejectBox.classList.add('hidden');
        rejectBox.style.display = 'none';
        const rejectInput = document.getElementById('ext-reject-reason-input');
        if (rejectInput) rejectInput.value = '';
    }

    const extHist = document.getElementById('task-drawer-extension-history');
    if (extHist) {
        extHist.classList.add('hidden');
        extHist.style.display = 'none';
        extHist.innerHTML = '';
    }

    const extForm = document.getElementById('task-drawer-request-extension-form');
    if (extForm) {
        extForm.classList.add('hidden');
        extForm.style.display = 'none';
        const inputReason = document.getElementById('ext-input-reason');
        if (inputReason) inputReason.value = '';
    }

    const btnOpenExt = document.getElementById('btn-open-request-extension');
    if (btnOpenExt) {
        btnOpenExt.classList.add('hidden');
        btnOpenExt.style.display = 'none';
    }
}
window.resetTaskExtensionUI = resetTaskExtensionUI;

async function openTaskDetailDrawer(taskId) {
    currentViewingTaskId = taskId;
    resetTaskExtensionUI();
    const drawer = document.getElementById('drawer-task-detail');
    if (!drawer) return;

    drawer.classList.remove('hidden');
    drawer.style.display = '';
    setTaskDetailEditMode(false);

    try {
        const res = await authFetch(`/api/collaboration/tasks/${taskId}/`, {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success || !json.data) return;

        const t = json.data;
        currentTaskDetailData = t;

        // View Mode Population
        const codeEl = document.getElementById('task-drawer-code');
        if (codeEl) codeEl.textContent = formatTaskCode(t.code);
        const titleEl = document.getElementById('task-drawer-title');
        if (titleEl) titleEl.textContent = t.title;
        const descEl = document.getElementById('task-drawer-desc');
        if (descEl) descEl.textContent = t.description || 'Không có mô tả chi tiết.';
        const assigneeEl = document.getElementById('task-drawer-assignee');
        if (assigneeEl) assigneeEl.textContent = cleanPersonName(t.assignee_info?.full_name) || 'Chưa gán';
        const reporterEl = document.getElementById('task-drawer-reporter');
        if (reporterEl) reporterEl.textContent = cleanPersonName(t.reporter_info?.full_name) || 'Hệ thống';
        const dueEl = document.getElementById('task-drawer-due');
        if (dueEl) dueEl.textContent = t.due_date ? formatDateDMY(t.due_date) : 'Không có';
        const deptEl = document.getElementById('task-drawer-department');
        if (deptEl) deptEl.textContent = t.department;

        // Edit Mode Population
        const editTitleEl = document.getElementById('task-drawer-edit-title');
        if (editTitleEl) editTitleEl.value = t.title || '';
        const editDescEl = document.getElementById('task-drawer-edit-desc');
        if (editDescEl) editDescEl.value = t.description || '';
        const editReporterEl = document.getElementById('task-drawer-edit-reporter');
        if (editReporterEl) editReporterEl.textContent = cleanPersonName(t.reporter_info?.full_name) || 'Hệ thống';
        const editDeptEl = document.getElementById('task-drawer-edit-department');
        if (editDeptEl) editDeptEl.value = t.department || 'DISPATCH';
        const editDueEl = document.getElementById('task-drawer-edit-due');
        if (editDueEl) editDueEl.value = t.due_date || '';

        await populateTaskDetailAssigneeSelect(t.department, t.assignee_id);

        // Status & Priority Badge
        const stBadge = document.getElementById('task-drawer-status-badge');
        if (stBadge) {
            stBadge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeClass(t.status)}`;
            stBadge.textContent = getStatusText(t.status);
        }

        const prBadge = document.getElementById('task-drawer-priority-badge');
        if (prBadge) {
            prBadge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getPriorityBadgeClass(t.priority)}`;
            prBadge.textContent = getPriorityText(t.priority);
        }

        // Context Trip
        const ctxWrapper = document.getElementById('task-drawer-context-wrapper');
        const ctxTrip = document.getElementById('task-drawer-context-trip');
        if (ctxWrapper && ctxTrip) {
            if (t.related_trip_code) {
                ctxTrip.textContent = t.related_trip_code;
                ctxWrapper.classList.remove('hidden');
            } else {
                ctxWrapper.classList.add('hidden');
            }
        }

        // Followers (Người theo dõi / liên quan) trong Drawer
        const followersListEl = document.getElementById('task-drawer-followers-list');
        if (followersListEl) {
            const followers = t.followers_info || [];
            if (followers.length > 0) {
                followersListEl.innerHTML = followers.map(f => `
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs">
                        <i class="ph-bold ph-user-circle text-teal-600"></i>
                        <span>${escapeHtml(cleanPersonName(f.full_name))} <span class="text-[10px] text-teal-600/70 font-normal">(${escapeHtml(f.department || '')})</span></span>
                    </span>
                `).join('');
            } else {
                followersListEl.innerHTML = '<span class="text-slate-400 text-[11px] italic">Không có người theo dõi</span>';
            }
        }

        // Progress & Checklist
        updateDrawerProgress(t.progress_percent || 0);
        renderDrawerChecklists(t.checklists || []);

        // Attachments
        renderDrawerAttachments(t.attachments || []);

        // Comments
        renderDrawerComments(t.comments || []);

        // Activities
        renderDrawerActivities(t.activities || []);

        // --- XỬ LÝ BANNER ĐỀ XUẤT GIA HẠN & BẬT TẮT NÚT HÀNH ĐỘNG ---
        const extBanner = document.getElementById('task-drawer-extension-banner');
        const extForm = document.getElementById('task-drawer-request-extension-form');
        const btnOpenExt = document.getElementById('btn-open-request-extension');
        const extActionsReporter = document.getElementById('ext-banner-actions-reporter');
        const extActionsAssignee = document.getElementById('ext-banner-actions-assignee');
        const extHist = document.getElementById('task-drawer-extension-history');
        const rejectBox = document.getElementById('ext-reject-reason-box');

        if (extForm) {
            extForm.classList.add('hidden');
            extForm.style.display = 'none';
        }
        if (rejectBox) {
            rejectBox.classList.add('hidden');
            rejectBox.style.display = 'none';
        }

        const myUserId = window.CURRENT_USER?.id ? Number(window.CURRENT_USER.id) : null;
        const isSuper = Boolean(
            window.CURRENT_USER?.is_superuser === true || 
            window.CURRENT_USER?.is_staff === true || 
            (Number(window.CURRENT_USER?.hierarchy_level) >= 100) || 
            window.CURRENT_USER?.role === 'DIRECTOR' ||
            window.CURRENT_USER?.role === 'ADMIN' ||
            (window.hasUserPermission && window.hasUserPermission('collaboration.change_officetask'))
        );

        const reporterId = Number(t.reporter || t.reporter_id || t.reporter_info?.id);
        const assigneeId = Number(t.assignee || t.assignee_id || t.assignee_info?.id);

        // Người giao việc: người tạo task HOẶC Admin/Ban Giám Đốc quản trị
        const isReporter = Boolean((myUserId && reporterId && myUserId === reporterId) || isSuper);

        // Người phụ trách: đúng người được giao task
        const isAssignee = Boolean((myUserId && assigneeId && myUserId === assigneeId) || (isSuper && !assigneeId));
        const isCompleted = ['DONE', 'CANCELLED'].includes(t.status);

        if (t.extension_status === 'PENDING') {
            // Task đang có đề xuất gia hạn chờ duyệt
            if (extBanner) {
                extBanner.classList.remove('hidden');
                extBanner.style.display = 'block';
                const oldDueEl = document.getElementById('ext-banner-old-due');
                if (oldDueEl) oldDueEl.textContent = t.due_date ? formatDateDMY(t.due_date) : 'Không có';
                const newDueEl = document.getElementById('ext-banner-new-due');
                if (newDueEl) newDueEl.textContent = t.requested_deadline ? formatDateDMY(t.requested_deadline) : '';
                const reasonEl = document.getElementById('ext-banner-reason');
                if (reasonEl) reasonEl.textContent = t.extension_reason || 'Không có lý do chi tiết.';
                const byEl = document.getElementById('ext-banner-by');
                if (byEl) byEl.textContent = cleanPersonName(t.extension_requested_by_info?.full_name) || 'Người phụ trách';
                const atEl = document.getElementById('ext-banner-at');
                if (atEl) atEl.textContent = t.extension_requested_at ? (typeof formatDateTime === 'function' ? formatDateTime(t.extension_requested_at) : t.extension_requested_at) : '';
            }

            if (btnOpenExt) {
                btnOpenExt.classList.add('hidden');
                btnOpenExt.style.display = 'none';
            }
            if (extHist) {
                extHist.classList.add('hidden');
                extHist.style.display = 'none';
            }

            // Hiển thị nút Duyệt cho Người giao việc hoặc Quản lý / Ban Giám Đốc
            if (extActionsReporter) {
                if (isReporter) {
                    extActionsReporter.classList.remove('hidden');
                    extActionsReporter.style.display = 'flex';
                } else {
                    extActionsReporter.classList.add('hidden');
                    extActionsReporter.style.display = 'none';
                }
            }

            // Hiển thị trạng thái & nút Thu hồi cho Người phụ trách
            if (extActionsAssignee) {
                if (isAssignee) {
                    extActionsAssignee.classList.remove('hidden');
                    extActionsAssignee.style.display = 'flex';
                } else {
                    extActionsAssignee.classList.add('hidden');
                    extActionsAssignee.style.display = 'none';
                }
            }
        } else {
            // Task KHÔNG có đề xuất gia hạn chờ duyệt: Ẩn triệt để banner
            if (extBanner) {
                extBanner.classList.add('hidden');
                extBanner.style.display = 'none';
            }
            if (extActionsReporter) {
                extActionsReporter.classList.add('hidden');
                extActionsReporter.style.display = 'none';
            }
            if (extActionsAssignee) {
                extActionsAssignee.classList.add('hidden');
                extActionsAssignee.style.display = 'none';
            }

            // Nút "Đề xuất gia hạn": Chỉ Người phụ trách mới được gửi khi task chưa xong
            if (btnOpenExt) {
                if (isAssignee && !isCompleted) {
                    btnOpenExt.classList.remove('hidden');
                    btnOpenExt.style.display = 'inline-flex';
                } else {
                    btnOpenExt.classList.add('hidden');
                    btnOpenExt.style.display = 'none';
                }
            }

            // Hiển thị kết quả duyệt / từ chối trước đó nếu có
            if (extHist) {
                if (t.extension_status === 'APPROVED') {
                    extHist.className = 'p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs text-emerald-950 flex items-center justify-between gap-2 shadow-2xs';
                    const noteStr = t.extension_review_note ? `<span class="text-emerald-700 italic">(${escapeHtml(t.extension_review_note)})</span>` : '';
                    extHist.innerHTML = `<span class="flex items-center gap-1.5 font-bold"><i class="ph-bold ph-check-circle text-emerald-600 text-sm"></i> Hạn chót đã được người giao duyệt dời sang <strong>${formatDateDMY(t.due_date)}</strong></span> ${noteStr}`;
                    extHist.classList.remove('hidden');
                    extHist.style.display = 'flex';
                } else if (t.extension_status === 'REJECTED') {
                    extHist.className = 'p-3 rounded-xl border border-rose-300 bg-rose-50/70 text-xs text-rose-950 flex items-center justify-between gap-2 shadow-2xs';
                    const noteStr = t.extension_review_note ? `<span class="text-rose-700 font-medium italic">Lý do: ${escapeHtml(t.extension_review_note)}</span>` : '';
                    extHist.innerHTML = `<span class="flex items-center gap-1.5 font-bold"><i class="ph-bold ph-x-circle text-rose-600 text-sm"></i> Đề xuất gia hạn đã bị từ chối</span> ${noteStr}`;
                    extHist.classList.remove('hidden');
                    extHist.style.display = 'flex';
                } else {
                    extHist.classList.add('hidden');
                    extHist.style.display = 'none';
                }
            }
        }

    } catch (e) {
        console.error('Error fetching task detail:', e);
    }
}

function updateDrawerProgress(percent) {
    const textEl = document.getElementById('task-drawer-progress-text');
    const barEl = document.getElementById('task-drawer-progress-bar');
    if (textEl) textEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;
}

function renderDrawerChecklists(checklists) {
    const listEl = document.getElementById('task-drawer-checklists');
    if (!listEl) return;

    if (checklists.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 italic py-1">Chưa có bước kiểm tra nào</div>';
        return;
    }

    listEl.innerHTML = checklists.map(c => `
        <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition-colors">
            <label class="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                <input type="checkbox" onchange="toggleChecklistItem(${c.id})" ${c.is_completed ? 'checked' : ''} class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500">
                <span class="text-xs font-semibold ${c.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}">
                    ${escapeHtml(c.title)}
                </span>
            </label>
            <button type="button" onclick="deleteChecklistItem(${c.id})" class="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                <i class="ph ph-trash text-xs"></i>
            </button>
        </div>
    `).join('');
}

async function addChecklistItem() {
    if (!currentViewingTaskId) return;
    const input = document.getElementById('task-new-checklist-input');
    if (!input || !input.value.trim()) return;

    const title = input.value.trim();
    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/checklists/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ title })
        });
        const json = await res.json();
        if (json.success) {
            input.value = '';
            openTaskDetailDrawer(currentViewingTaskId);
            loadOfficeTasks();
        }
    } catch (e) {
        console.error('Error adding checklist item:', e);
    }
}

async function toggleChecklistItem(itemId) {
    if (!currentViewingTaskId) return;
    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/checklists/`, {
            method: 'PATCH',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ item_id: itemId })
        });
        const json = await res.json();
        if (json.success) {
            updateDrawerProgress(json.progress_percent || 0);
            openTaskDetailDrawer(currentViewingTaskId);
            loadOfficeTasks();
        }
    } catch (e) {
        console.error('Error toggling checklist:', e);
    }
}

async function deleteChecklistItem(itemId) {
    if (!currentViewingTaskId) return;
    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/checklists/?item_id=${itemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            openTaskDetailDrawer(currentViewingTaskId);
            loadOfficeTasks();
        }
    } catch (e) {
        console.error('Error deleting checklist item:', e);
    }
}

function renderDrawerAttachments(attachments) {
    const listEl = document.getElementById('task-drawer-attachments');
    if (!listEl) return;

    if (attachments.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 italic py-1">Không có tệp đính kèm</div>';
        return;
    }

    listEl.innerHTML = attachments.map(att => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span class="flex items-center gap-1.5 font-medium text-slate-800 truncate">
                <i class="ph-bold ph-paperclip text-teal-600"></i>
                ${escapeHtml(att.original_name)}
            </span>
            <a href="${att.file}" target="_blank" download class="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded font-bold text-[11px] transition-colors shrink-0">
                Tải
            </a>
        </div>
    `).join('');
}

async function uploadTaskAttachment(e) {
    if (!currentViewingTaskId || !e.target.files || e.target.files.length === 0) return;
    const files = e.target.files;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type'];
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/attachments/`, {
            method: 'POST',
            headers,
            body: formData
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', 'Đã tải tệp lên thành công');
            openTaskDetailDrawer(currentViewingTaskId);
        }
    } catch (err) {
        console.error('Error uploading attachment:', err);
    }
}

function renderDrawerComments(comments) {
    const listEl = document.getElementById('task-drawer-comments');
    if (!listEl) return;

    if (comments.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 italic py-1">Chưa có trao đổi nào</div>';
        return;
    }

    listEl.innerHTML = comments.map(c => `
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <div class="flex items-center justify-between font-bold text-slate-700">
                <span class="text-teal-800 flex items-center gap-1">
                    <i class="ph-bold ph-user-circle"></i>
                    ${escapeHtml(c.author_info?.full_name || 'Đồng nghiệp')}
                </span>
                <span class="text-[10px] text-slate-400 font-normal">${formatDateTime(c.created_at)}</span>
            </div>
            <p class="text-slate-600 leading-relaxed whitespace-pre-line">${escapeHtml(c.content)}</p>
        </div>
    `).join('');
}

async function submitTaskComment() {
    if (!currentViewingTaskId) return;
    const input = document.getElementById('task-new-comment-input');
    if (!input || !input.value.trim()) return;

    const content = input.value.trim();
    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/comments/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ content })
        });
        const json = await res.json();
        if (json.success) {
            input.value = '';
            openTaskDetailDrawer(currentViewingTaskId);
        }
    } catch (e) {
        console.error('Error sending task comment:', e);
    }
}

function renderDrawerActivities(activities) {
    const listEl = document.getElementById('task-drawer-activities');
    if (!listEl) return;

    if (activities.length === 0) {
        listEl.innerHTML = '<div>Chưa có nhật ký hoạt động</div>';
        return;
    }

    listEl.innerHTML = activities.slice(0, 8).map(a => `
        <div class="flex items-start gap-1.5 py-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></span>
            <span><strong>${escapeHtml(a.user_name)}</strong>: ${escapeHtml(a.description)} <span class="text-slate-400">(${formatDateTime(a.created_at)})</span></span>
        </div>
    `).join('');
}

function closeTaskDetailDrawer() {
    const drawer = document.getElementById('drawer-task-detail');
    if (drawer) {
        drawer.classList.add('hidden');
        drawer.style.display = 'none';
    }
    resetTaskExtensionUI();
    currentViewingTaskId = null;
}

async function deleteCurrentTask() {
    if (!currentViewingTaskId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này không?')) return;

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', json.message);
            closeTaskDetailDrawer();
            loadOfficeTasks();
        }
    } catch (e) {
        console.error('Error deleting task:', e);
    }
}
