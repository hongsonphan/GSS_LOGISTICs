/**
 * ==========================================================================
 * BIM LOGISTICS — COLLABORATION MODULE (NEWS, TASKS, IN-APP TEAM CHAT)
 * Kế thừa chuẩn quốc tế từ Bim Ecosystem (Bim_Consulting & Bim_ERP-Solutions)
 * Áp dụng riêng cho Ban Giám Đốc, Quản lý và Cán bộ Nhân viên Văn phòng
 * ==========================================================================
 */

// Global State
let currentNewsList = [];
let currentViewingNewsId = null;
let currentTaskViewMode = 'kanban'; // 'kanban' | 'list'
let currentTaskScope = 'all'; // 'all' | 'my_tasks' | 'assigned_by_me'
let currentTasksData = [];
let currentViewingTaskId = null;
let officeDirectoryUsers = [];
let collaborationUserPerms = null;

// Chat State
let chatActiveRoomId = null;
let chatLatestMessageId = 0;
let chatPollTimer = null;
let chatSelectedFiles = [];

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

async function authFetch(url, options = {}) {
    if (typeof fetchWithAuth === 'function') {
        return await fetchWithAuth(url, options);
    }
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders(options.headers || {}) : (options.headers || {});
    return await fetch(url, { ...options, headers });
}

// ==========================================================================
// 1. PHÂN HỆ: BẢN TIN CÔNG TY & THÔNG BÁO NỘI BỘ
// ==========================================================================

async function loadCompanyNews() {
    const gridEl = document.getElementById('news-posts-grid');
    const pinnedEl = document.getElementById('news-pinned-container');
    const totalBadge = document.getElementById('news-total-badge');
    const catFilter = document.getElementById('news-category-filter');
    const searchInput = document.getElementById('news-search-input');

    if (!gridEl) return;

    gridEl.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 text-xs"><i class="ph ph-spinner ph-spin text-xl mb-2 block"></i>Đang tải bản tin công ty...</div>';
    if (pinnedEl) pinnedEl.innerHTML = '';

    // Load categories nếu filter chưa có
    if (catFilter && catFilter.options.length <= 1) {
        try {
            const catRes = await authFetch('/api/collaboration/news/categories/', {
                headers: getAuthHeaders()
            });
            const catJson = await catRes.json();
            if (catJson.success && catJson.data) {
                catFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
                const createCatSelect = document.getElementById('create-news-category');
                if (createCatSelect) createCatSelect.innerHTML = '';

                catJson.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    catFilter.appendChild(opt);

                    if (createCatSelect) {
                        const opt2 = document.createElement('option');
                        opt2.value = c.id;
                        opt2.textContent = c.name;
                        createCatSelect.appendChild(opt2);
                    }
                });
            }
        } catch (e) {
            console.error('Error loading news categories:', e);
        }
    }

    // Build URL params
    const params = new URLSearchParams();
    if (catFilter && catFilter.value) params.append('category_id', catFilter.value);
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());

    try {
        const res = await authFetch(`/api/collaboration/news/posts/?${params.toString()}`, {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success || !json.data) {
            gridEl.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 text-xs">Không có dữ liệu bản tin.</div>';
            return;
        }

        currentNewsList = json.data;
        if (totalBadge) totalBadge.textContent = `${json.data.length} tin`;

        // Kiểm soát hiển thị nút Đăng Bản Tin Mới theo phân quyền
        const createBtn = document.getElementById('btn-open-create-news');
        if (createBtn) {
            if (json.can_create_post === false) {
                createBtn.classList.add('hidden');
            } else {
                createBtn.classList.remove('hidden');
            }
        }

        const canCreatePost = json.can_create_post !== false;

        // 1. Render Pinned & Urgent Banner (nếu có bài ghim hoặc khẩn cấp)
        const bannerPosts = json.data.filter(p => p.is_pinned || p.is_urgent);
        if (pinnedEl) {
            if (bannerPosts.length > 0) {
                pinnedEl.innerHTML = bannerPosts.map(p => `
                    <div onclick="openNewsDetailPage(${p.id}, event)" class="p-4 rounded-2xl border ${p.is_urgent ? 'bg-rose-50/90 border-rose-300 shadow-rose-100' : 'bg-amber-50/80 border-amber-300 shadow-amber-100'} shadow-sm flex items-start justify-between gap-4 cursor-pointer hover:shadow-md transition-all group" title="Bấm để mở trang chi tiết & xem trước tài liệu đính kèm (PDF/Word/Excel)">
                        <div class="flex items-start gap-3.5">
                            <div class="w-10 h-10 rounded-xl ${p.is_urgent ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'} flex items-center justify-center shrink-0 shadow-xs">
                                <i class="${p.is_urgent ? 'ph-bold ph-warning-octagon' : 'ph-bold ph-push-pin'} text-xl"></i>
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${p.is_urgent ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'}">
                                        ${p.is_urgent ? 'Thông Báo Khẩn Cấp' : 'Được Ghim Lên Đầu'}
                                    </span>
                                    <span class="text-xs text-slate-500 font-medium">${p.author_name} • ${formatDateTime(p.created_at)}</span>
                                </div>
                                <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">
                                    ${escapeHtml(p.title)}
                                </h4>
                                <p class="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                    ${escapeHtml(p.summary || '')}
                                </p>
                            </div>
                        </div>
                        <span class="text-xs font-bold ${p.is_urgent ? 'text-rose-700' : 'text-amber-700'} shrink-0 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            Mở xem trang mới <i class="ph-bold ph-arrow-square-out"></i>
                        </span>
                    </div>
                `).join('');
            } else {
                pinnedEl.innerHTML = '';
            }
        }

        // 2. Render Toàn Bộ Lưới Bản Tin Chính (Bài ghim ĐƯỢC ĐƯA LÊN ĐẦU TIÊN của grid!)
        if (json.data.length === 0) {
            gridEl.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400 text-xs">Chưa có thông báo nào được đăng tải.</div>';
            return;
        }

        gridEl.innerHTML = json.data.map(p => `
            <div onclick="openNewsDetailPage(${p.id}, event)" class="bg-white rounded-2xl border ${p.is_pinned ? 'border-amber-300 ring-2 ring-amber-300/40 bg-gradient-to-b from-amber-50/25 to-white shadow-xs' : 'border-slate-200 shadow-xs hover:border-slate-300'} hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden group relative" title="Bấm để mở trang chi tiết & xem trước tài liệu đính kèm (PDF/Word/Excel)">
                ${p.cover_image ? `
                    <div class="h-44 w-full bg-slate-100 overflow-hidden relative">
                        <img src="${p.cover_image}" alt="Ảnh bài viết" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        ${p.is_pinned ? `
                            <div class="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                                <i class="ph-bold ph-push-pin text-xs"></i> Đã ghim
                            </div>
                        ` : ''}
                        ${p.is_urgent ? `
                            <div class="absolute top-3 ${p.is_pinned ? 'left-24' : 'left-3'} flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                                <i class="ph-bold ph-warning-octagon text-xs"></i> Khẩn cấp
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="h-28 w-full ${p.is_pinned ? 'bg-gradient-to-br from-amber-700 via-teal-800 to-slate-900' : 'bg-gradient-to-br from-teal-700 to-slate-800'} p-4 flex flex-col justify-between text-white relative">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            ${p.is_pinned ? `
                                <span class="px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                    <i class="ph-bold ph-push-pin text-[11px]"></i> Đã ghim
                                </span>
                            ` : ''}
                            ${p.is_urgent ? `
                                <span class="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                    <i class="ph-bold ph-warning-octagon text-[11px]"></i> Khẩn cấp
                                </span>
                            ` : ''}
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-200">${escapeHtml(p.category_info?.name || 'Thông báo chung')}</span>
                        </div>
                        <i class="ph ph-newspaper text-3xl opacity-20 absolute right-3 bottom-3"></i>
                    </div>
                `}
                <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-medium">
                            <span class="font-semibold text-slate-600 flex items-center gap-1">
                                <i class="ph-bold ph-user-circle text-teal-600 text-sm"></i>
                                ${p.author_name}
                            </span>
                            <span>${formatDateTime(p.created_at)}</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
                            ${escapeHtml(p.title)}
                        </h4>
                        <p class="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                            ${escapeHtml(p.summary || '')}
                        </p>
                    </div>

                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div class="flex items-center gap-3">
                            <span class="flex items-center gap-1" title="Lượt xem"><i class="ph ph-eye text-sm"></i> ${p.view_count || 0}</span>
                            <span class="flex items-center gap-1" title="Bình luận"><i class="ph ph-chat-centered-text text-sm"></i> ${p.comments_count || 0}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${canCreatePost ? `
                                <button type="button" onclick="quickTogglePinNews(${p.id}, event)" class="p-1 rounded-md ${p.is_pinned ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-transparent'} transition-colors" title="${p.is_pinned ? 'Bỏ ghim khỏi đầu trang' : 'Ghim bài lên đầu trang'}">
                                    <i class="ph-bold ph-push-pin text-xs"></i>
                                </button>
                            ` : ''}
                            <span class="text-teal-700 font-bold group-hover:underline text-[11px]">Đọc tiếp</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error('Error loading company news:', e);
        gridEl.innerHTML = '<div class="col-span-full text-center py-12 text-rose-500 text-xs">Lỗi tải dữ liệu bản tin.</div>';
    }
}

function openNewsDetailPage(postId, event) {
    if (event) {
        event.stopPropagation();
    }
    window.open(`/news/${postId}/`, '_blank');
}

async function openNewsDetailModal(postId) {
    currentViewingNewsId = postId;
    const modal = document.getElementById('modal-news-detail');
    if (!modal) return;

    modal.classList.remove('hidden');

    try {
        const res = await authFetch(`/api/collaboration/news/posts/${postId}/`, {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success || !json.data) {
            showToast('error', 'Không thể tải chi tiết bản tin.');
            return;
        }

        const p = json.data;
        document.getElementById('news-modal-title').textContent = p.title;
        document.getElementById('news-modal-author').textContent = p.author_info?.full_name || p.author_name;
        document.getElementById('news-modal-date').textContent = formatDateTime(p.created_at);
        document.getElementById('news-modal-views').textContent = `${p.view_count} lượt xem`;
        document.getElementById('news-modal-content').textContent = p.content;

        // Category Badge
        const catBadge = document.getElementById('news-modal-category-badge');
        if (catBadge) {
            catBadge.textContent = p.category_info?.name || 'Bản tin nội bộ';
            catBadge.style.backgroundColor = (p.category_info?.color || '#0d9488') + '20';
            catBadge.style.color = p.category_info?.color || '#0d9488';
        }

        // Urgent Badge
        const urgentBadge = document.getElementById('news-modal-urgent-badge');
        if (urgentBadge) {
            if (p.is_urgent) urgentBadge.classList.remove('hidden');
            else urgentBadge.classList.add('hidden');
        }

        // Pin button icon & tooltip
        const pinBtn = document.getElementById('news-modal-pin-btn');
        if (pinBtn) {
            if (p.is_pinned) {
                pinBtn.className = "p-1.5 rounded-lg border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors shadow-2xs cursor-pointer";
                pinBtn.title = "Bỏ ghim khỏi đầu trang";
            } else {
                pinBtn.className = "p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer";
                pinBtn.title = "Ghim lên đầu trang";
            }
        }

        // Cover
        const coverWrapper = document.getElementById('news-modal-cover-wrapper');
        const coverImg = document.getElementById('news-modal-cover');
        if (coverWrapper && coverImg) {
            if (p.cover_image) {
                coverImg.src = p.cover_image;
                coverWrapper.classList.remove('hidden');
            } else {
                coverWrapper.classList.add('hidden');
            }
        }

        // Attachments
        const attWrapper = document.getElementById('news-modal-attachments-wrapper');
        const attList = document.getElementById('news-modal-attachments-list');
        if (attWrapper && attList) {
            if (p.attachments && p.attachments.length > 0) {
                attWrapper.classList.remove('hidden');
                attList.innerHTML = p.attachments.map(att => `
                    <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                        <span class="flex items-center gap-2 font-medium text-slate-800 truncate">
                            <i class="ph-bold ph-file-text text-teal-600 text-base"></i>
                            ${escapeHtml(att.file_name)}
                        </span>
                        <a href="${att.file}" target="_blank" download class="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded font-bold text-[11px] transition-colors shrink-0">
                            Tải về
                        </a>
                    </div>
                `).join('');
            } else {
                attWrapper.classList.add('hidden');
            }
        }

        // Comments
        renderNewsComments(p.comments || []);

    } catch (e) {
        console.error('Error fetching news detail:', e);
    }
}

function renderNewsComments(comments) {
    const listEl = document.getElementById('news-modal-comments-list');
    const countEl = document.getElementById('news-modal-comments-count');
    if (countEl) countEl.textContent = comments.length;
    if (!listEl) return;

    if (comments.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 italic py-2">Chưa có bình luận nào. Hãy là người đầu tiên đóng góp ý kiến!</div>';
        return;
    }

    listEl.innerHTML = comments.map(c => `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <div class="flex items-center justify-between font-bold text-slate-700">
                <span class="flex items-center gap-1.5 text-teal-800">
                    <i class="ph-bold ph-user-circle text-sm"></i>
                    ${escapeHtml(c.author_info?.full_name || c.author_name)}
                </span>
                <span class="text-[10px] text-slate-400 font-normal">${formatDateTime(c.created_at)}</span>
            </div>
            <p class="text-slate-600 leading-relaxed whitespace-pre-line">${escapeHtml(c.content)}</p>
        </div>
    `).join('');
}

async function submitNewsComment() {
    if (!currentViewingNewsId) return;
    const input = document.getElementById('news-comment-input');
    if (!input || !input.value.trim()) return;

    const content = input.value.trim();
    try {
        const res = await authFetch(`/api/collaboration/news/posts/${currentViewingNewsId}/comments/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ content })
        });
        const json = await res.json();
        if (json.success && json.data) {
            input.value = '';
            // Reload news detail modal comments
            openNewsDetailModal(currentViewingNewsId);
        } else {
            showToast('error', json.message || 'Không thể gửi bình luận.');
        }
    } catch (e) {
        console.error('Error submitting comment:', e);
    }
}

async function togglePinCurrentNews() {
    if (!currentViewingNewsId) return;
    try {
        const res = await authFetch(`/api/collaboration/news/posts/${currentViewingNewsId}/pin/`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', json.message);
            // Cập nhật ngay visual state của nút ghim trong modal mà không đóng modal đột ngột
            const pinBtn = document.getElementById('news-modal-pin-btn');
            if (pinBtn) {
                if (json.is_pinned) {
                    pinBtn.className = "p-1.5 rounded-lg border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors shadow-2xs cursor-pointer";
                    pinBtn.title = "Bỏ ghim khỏi đầu trang";
                } else {
                    pinBtn.className = "p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer";
                    pinBtn.title = "Ghim lên đầu trang";
                }
            }
            // Làm mới danh sách bài viết phân hệ Bản tin để bài ghim lập tức nhảy lên đầu
            if (typeof loadCompanyNews === 'function') loadCompanyNews();
            // Đồng bộ widget Bản tin trên Dashboard
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast('error', json.message || 'Không thể thực hiện thao tác.');
        }
    } catch (e) {
        console.error('Error pinning post:', e);
        showToast('error', 'Lỗi kết nối khi ghim bài viết.');
    }
}

async function quickTogglePinNews(postId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    try {
        const res = await authFetch(`/api/collaboration/news/posts/${postId}/pin/`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', json.message);
            if (typeof loadCompanyNews === 'function') loadCompanyNews();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast('error', json.message || 'Không thể thực hiện thao tác.');
        }
    } catch (e) {
        console.error('Error quick pinning post:', e);
        showToast('error', 'Lỗi kết nối khi ghim bài viết.');
    }
}

function closeNewsDetailModal() {
    const modal = document.getElementById('modal-news-detail');
    if (modal) modal.classList.add('hidden');
    currentViewingNewsId = null;
}

function openCreateNewsModal() {
    const modal = document.getElementById('modal-create-news');
    if (modal) modal.classList.remove('hidden');
}

function closeCreateNewsModal() {
    const modal = document.getElementById('modal-create-news');
    if (modal) modal.classList.add('hidden');
}

async function handleCreateNewsSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('create-news-title').value.trim();
    const content = document.getElementById('create-news-content').value.trim();
    const catId = document.getElementById('create-news-category').value;
    const dept = document.getElementById('create-news-department').value;
    const summary = document.getElementById('create-news-summary').value.trim();
    const isPinned = document.getElementById('create-news-pinned').checked;
    const isUrgent = document.getElementById('create-news-urgent').checked;
    const coverFile = document.getElementById('create-news-cover').files[0];
    const files = document.getElementById('create-news-files').files;

    if (!title || !content) {
        showToast('warning', 'Vui lòng điền đầy đủ tiêu đề và nội dung.');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (catId) formData.append('category_id', catId);
    formData.append('target_department', dept);
    formData.append('summary', summary);
    formData.append('is_pinned', isPinned ? '1' : '0');
    formData.append('is_urgent', isUrgent ? '1' : '0');
    if (coverFile) formData.append('cover_image', coverFile);
    for (let i = 0; i < files.length; i++) {
        formData.append('attachments', files[i]);
    }

    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // Let browser set boundary
        const res = await authFetch('/api/collaboration/news/posts/', {
            method: 'POST',
            headers,
            body: formData
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', 'Đã đăng bản tin thành công!');
            closeCreateNewsModal();
            document.getElementById('create-news-form').reset();
            loadCompanyNews();
        } else {
            showToast('error', json.message || 'Không thể đăng bản tin.');
        }
    } catch (e) {
        console.error('Error creating news:', e);
        showToast('error', 'Lỗi hệ thống khi đăng bản tin.');
    }
}


// ==========================================================================
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
    ['all', 'my_tasks', 'assigned_by_me'].forEach(s => {
        const btn = document.getElementById(`scope-${s.replace('_', '-')}`);
        if (btn) {
            if (s === scope) {
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

            return `
            <div id="task-card-${t.id}" draggable="true" ondragstart="handleDragStart(event, ${t.id})" onclick="openTaskDetailDrawer(${t.id})" class="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group space-y-2.5 select-none">
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

    tbody.innerHTML = tasks.map(t => `
        <tr onclick="openTaskDetailDrawer(${t.id})" class="hover:bg-slate-50 cursor-pointer transition-colors">
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
    `).join('');
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

    const deptUsers = officeDirectoryUsers.filter(u => (u.department === selectedDept || u.department_code === selectedDept));
    const otherUsers = officeDirectoryUsers.filter(u => !(u.department === selectedDept || u.department_code === selectedDept));

    if (deptUsers.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = `Nhân sự ${deptName} (${deptUsers.length})`;
        deptUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id;
            opt.textContent = `${cleanPersonName(u.full_name)} — ${u.role || u.position || ''}`;
            grp.appendChild(opt);
        });
        select.appendChild(grp);
    }

    if (otherUsers.length > 0) {
        const grpOther = document.createElement('optgroup');
        grpOther.label = 'Nhân sự phòng ban khác';
        otherUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id;
            opt.textContent = `${cleanPersonName(u.full_name)} (${u.department_name}) — ${u.role || ''}`;
            grpOther.appendChild(opt);
        });
        select.appendChild(grpOther);
    }

    if (selectedAssigneeId) {
        select.value = selectedAssigneeId;
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
async function openTaskDetailDrawer(taskId) {
    currentViewingTaskId = taskId;
    const drawer = document.getElementById('drawer-task-detail');
    if (!drawer) return;

    drawer.classList.remove('hidden');
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

        if (extForm) extForm.classList.add('hidden');

        const myUserId = window.CURRENT_USER?.id;
        const isSuper = Boolean(window.CURRENT_USER?.is_superuser);
        const isReporter = (myUserId && (t.reporter === myUserId || t.reporter_info?.id === myUserId)) || isSuper;
        const isAssignee = (myUserId && (t.assignee === myUserId || t.assignee_info?.id === myUserId)) || isSuper;
        const isCompleted = ['DONE', 'CANCELLED'].includes(t.status);

        if (t.extension_status === 'PENDING') {
            if (extBanner) {
                extBanner.classList.remove('hidden');
                const oldDueEl = document.getElementById('ext-banner-old-due');
                if (oldDueEl) oldDueEl.textContent = t.due_date ? formatDateDMY(t.due_date) : 'Không có';
                const newDueEl = document.getElementById('ext-banner-new-due');
                if (newDueEl) newDueEl.textContent = t.requested_deadline ? formatDateDMY(t.requested_deadline) : '';
                const reasonEl = document.getElementById('ext-banner-reason');
                if (reasonEl) reasonEl.textContent = t.extension_reason || 'Không có lý do chi tiết.';
                const byEl = document.getElementById('ext-banner-by');
                if (byEl) byEl.textContent = cleanPersonName(t.extension_requested_by_info?.full_name) || 'Người phụ trách';
                const atEl = document.getElementById('ext-banner-at');
                if (atEl) atEl.textContent = t.extension_requested_at ? formatDateTimeDMY(t.extension_requested_at) : '';
            }
            if (btnOpenExt) btnOpenExt.classList.add('hidden');

            if (extActionsReporter) {
                if (isReporter) extActionsReporter.classList.remove('hidden');
                else extActionsReporter.classList.add('hidden');
            }
            if (extActionsAssignee) {
                if (isAssignee && !isReporter) extActionsAssignee.classList.remove('hidden');
                else extActionsAssignee.classList.add('hidden');
            }
        } else {
            if (extBanner) extBanner.classList.add('hidden');
            if (btnOpenExt) {
                if (isAssignee && !isCompleted) {
                    btnOpenExt.classList.remove('hidden');
                    btnOpenExt.classList.add('inline-flex');
                } else {
                    btnOpenExt.classList.add('hidden');
                    btnOpenExt.classList.remove('inline-flex');
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
    if (drawer) drawer.classList.add('hidden');
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

// Quản lý danh sách Người liên quan (Theo dõi chung) trong modal tạo việc (Hỗ trợ Multi-Select)
let createTaskFollowersList = []; // Mảng chứa các user_id đã chọn

async function ensureOfficeDirectoryLoaded() {
    if (officeDirectoryUsers && officeDirectoryUsers.length > 0) {
        return;
    }
    // Ưu tiên nạp tức thì từ window.PRELOADED_OFFICE_USERS (Zero latency)
    if (window.PRELOADED_OFFICE_USERS && Array.isArray(window.PRELOADED_OFFICE_USERS) && window.PRELOADED_OFFICE_USERS.length > 0) {
        officeDirectoryUsers = window.PRELOADED_OFFICE_USERS;
        return;
    }
    // Fallback nạp từ API bất đồng bộ
    try {
        const res = await authFetch('/api/collaboration/tasks/directory/', {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            officeDirectoryUsers = json.office_users || [];
            collaborationUserPerms = json.current_user_permission || null;
        }
    } catch (e) {
        console.error('Error fetching office directory:', e);
    }
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
    const canAssignOthers = collaborationUserPerms ? collaborationUserPerms.can_assign_others : true;

    // Phân loại: nhân sự thuộc phòng ban đã chọn & nhân sự phòng ban khác
    const deptUsers = (officeDirectoryUsers || []).filter(u => (u.department === selectedDept || u.department_code === selectedDept));
    const otherUsers = (officeDirectoryUsers || []).filter(u => !(u.department === selectedDept || u.department_code === selectedDept));

    if (deptUsers.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = `Nhân sự ${deptName} (${deptUsers.length})`;
        deptUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id;
            const isMe = u.user_id === myId;
            if (isMe) {
                opt.textContent = `${cleanPersonName(u.full_name)} — [Chính bạn - Việc cá nhân]`;
                grp.appendChild(opt);
            } else if (u.can_assign) {
                opt.textContent = `${cleanPersonName(u.full_name)} — ${u.role || u.position || ''}`;
                grp.appendChild(opt);
            } else {
                opt.textContent = `${cleanPersonName(u.full_name)} — [Cấp trên / Ngoài thẩm quyền]`;
                opt.disabled = true;
                opt.className = 'text-slate-400 bg-slate-50';
                grp.appendChild(opt);
            }
        });
        select.appendChild(grp);
    } else {
        const emptyOpt = document.createElement('option');
        emptyOpt.disabled = true;
        emptyOpt.textContent = `(Chưa có nhân sự thuộc ${deptName})`;
        select.appendChild(emptyOpt);
    }

    // Nhóm nhân sự phòng ban khác
    if (otherUsers.length > 0 && canAssignOthers) {
        const grpOther = document.createElement('optgroup');
        grpOther.label = 'Nhân sự các phòng ban khác';
        otherUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id;
            const isMe = u.user_id === myId;
            if (isMe) {
                opt.textContent = `${cleanPersonName(u.full_name)} (${u.department_name}) — [Chính bạn]`;
                grpOther.appendChild(opt);
            } else if (u.can_assign) {
                opt.textContent = `${cleanPersonName(u.full_name)} (${u.department_name}) — ${u.role || ''}`;
                grpOther.appendChild(opt);
            }
        });
        select.appendChild(grpOther);
    }

    // Khôi phục giá trị cũ nếu hợp lệ
    if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
    } else if (deptUsers.length > 0) {
        // Tự động chọn nhân sự đầu tiên hợp lệ trong phòng ban
        const firstAssignable = deptUsers.find(u => u.can_assign || u.user_id === myId);
        if (firstAssignable) {
            select.value = firstAssignable.user_id;
        }
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

function addCreateTaskInitialFile(file) {
    if (!file) return;
    createTaskInitialFiles.push(file);
    renderCreateTaskInitialFiles();
}
window.addCreateTaskInitialFile = addCreateTaskInitialFile;

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


// ==========================================================================
// 3. PHÂN HỆ: CHAT BUBBLE & FLOATING TEAM CHAT (IN-APP MESSAGING)
// ==========================================================================

function syncMobileChatViewport() {
    const win = document.getElementById('chat-floating-window');
    if (!win || win.classList.contains('hidden')) return;

    if (window.innerWidth < 1024) {
        const vv = window.visualViewport;
        const height = vv ? Math.round(vv.height) : window.innerHeight;
        const offsetTop = vv ? Math.round(vv.offsetTop) : 0;
        win.style.setProperty('--chat-vv-top', `${offsetTop}px`);
        win.style.setProperty('--chat-vv-height', `${height}px`);

        const scrollEl = document.getElementById('chat-messages-scroll');
        if (scrollEl && !document.getElementById('chat-messages-view')?.classList.contains('hidden')) {
            scrollEl.scrollTop = scrollEl.scrollHeight;
        }
    } else {
        win.style.removeProperty('--chat-vv-top');
        win.style.removeProperty('--chat-vv-height');
    }
}
window.syncMobileChatViewport = syncMobileChatViewport;

function autoResizeChatInput(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
}
window.autoResizeChatInput = autoResizeChatInput;

function formatChatTimestamp(isoStr) {
    if (!isoStr) return '';
    const d = parseDateFlexible(isoStr);
    if (!d) return formatTimeOnly(isoStr);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
}

function formatChatMessageContent(rawText, isMe) {
    if (!rawText) return '';
    let text = escapeHtml(rawText);

    // 1. Format URL link
    const linkClass = isMe
        ? 'underline break-all text-white hover:text-teal-100 font-medium'
        : 'underline break-all text-[#00897b] hover:text-teal-800 font-medium';
    text = text.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${url}</a>`;
    });

    // 2. Format @ Tag Tên nhân sự: chỉ highlight khác màu, không bọc badge
    const userMentionClass = isMe
        ? 'font-bold text-teal-100 underline decoration-teal-300/60'
        : 'font-bold text-teal-700 hover:underline';
    text = text.replace(/@([A-ZÀ-Ỹa-zà-ỹ0-9_.\s]+?)(?=[.,!?\s]|$)/g, (match, name) => {
        if (name.trim().length >= 2) {
            return `<span class="${userMentionClass}">@${name.trim()}</span>`;
        }
        return match;
    });

    // 3. Format # Mã công việc: chỉ highlight khác màu, không bọc badge
    const taskMentionClass = isMe
        ? 'font-bold text-sky-200 underline cursor-pointer'
        : 'font-bold text-indigo-600 hover:underline cursor-pointer';
    text = text.replace(/#(CV-[0-9.]+)(\s*\[.*?\])?/g, (match, code) => {
        return `<span class="${taskMentionClass}" onclick="openOfficeTaskFromChat('${code}')">${match}</span>`;
    });

    return text;
}

function initCollaborationChat() {
    // Đếm tin nhắn chưa đọc định kỳ mỗi 30s
    checkChatUnreadCount();
    setInterval(checkChatUnreadCount, 30000);

    // Lắng nghe sự kiện bàn phím ảo (visualViewport) trên thiết bị di động
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', syncMobileChatViewport);
        window.visualViewport.addEventListener('scroll', syncMobileChatViewport);
    }
    window.addEventListener('resize', syncMobileChatViewport);

    const chatInput = document.getElementById('chat-message-input');
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            setTimeout(syncMobileChatViewport, 100);
            setTimeout(syncMobileChatViewport, 300);
        });
        chatInput.addEventListener('blur', () => {
            setTimeout(syncMobileChatViewport, 100);
        });
    }
}

async function checkChatUnreadCount() {
    try {
        const res = await authFetch('/api/collaboration/chat/rooms/', {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            const badge = document.getElementById('chat-unread-badge');
            if (badge) {
                if (json.total_unread > 0) {
                    badge.textContent = json.total_unread > 99 ? '99+' : json.total_unread;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (e) {
        // Silent fail
    }
}

async function ensureOfficeDirectoryLoaded() {
    if (officeDirectoryUsers && officeDirectoryUsers.length > 0) {
        return officeDirectoryUsers;
    }
    try {
        const dirRes = await authFetch('/api/collaboration/tasks/directory/', {
            headers: getAuthHeaders()
        });
        const dirJson = await dirRes.json();
        if (dirJson.success && dirJson.office_users) {
            officeDirectoryUsers = dirJson.office_users;
            collaborationUserPerms = dirJson.current_user_permission || null;
            return officeDirectoryUsers;
        }
    } catch (e) {
        console.error('Error loading office directory:', e);
    }
    return [];
}

function toggleChatWindow() {
    const win = document.getElementById('chat-floating-window');
    const container = document.getElementById('chat-bubble-container');
    if (!win) return;

    if (win.classList.contains('hidden')) {
        win.classList.remove('hidden');
        if (container) container.classList.add('chat-is-open');
        syncMobileChatViewport();

        if (chatActiveRoomId) {
            const input = document.getElementById('chat-message-input');
            if (input && window.innerWidth >= 1024) setTimeout(() => input.focus(), 150);
            const scrollEl = document.getElementById('chat-messages-scroll');
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
            startChatPolling();
        } else {
            loadChatRooms();
        }
        // Pre-fetch directory users for fast direct messaging
        ensureOfficeDirectoryLoaded();
    } else {
        win.classList.add('hidden');
        if (container) container.classList.remove('chat-is-open');
        const input = document.getElementById('chat-message-input');
        if (input) input.blur();
        stopChatPolling();
    }
}

async function loadChatRooms() {
    const listEl = document.getElementById('chat-rooms-list');
    if (!listEl) return;

    try {
        const res = await authFetch('/api/collaboration/chat/rooms/', {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success || !json.data) return;

        if (json.data.length === 0) {
            listEl.innerHTML = '<div class="text-center py-8 text-xs text-slate-400">Không có phòng trò chuyện nào.</div>';
            return;
        }

        listEl.innerHTML = json.data.map(r => `
            <div onclick="openChatRoom(${r.id}, '${escapeHtml(r.name)}')" class="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-teal-400 hover:bg-teal-50/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-9 h-9 rounded-xl ${r.room_type === 'COMPANY' ? 'bg-teal-700 text-white' : (r.room_type === 'DEPARTMENT' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-white')} flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs">
                        <i class="${r.room_type === 'COMPANY' ? 'ph-bold ph-buildings' : (r.room_type === 'DEPARTMENT' ? 'ph-bold ph-users-three' : 'ph-bold ph-chat-teardrop-text')}"></i>
                    </div>
                    <div class="overflow-hidden">
                        <h5 class="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">${escapeHtml(r.name)}</h5>
                        <p class="text-[11px] text-slate-400 truncate mt-0.5">
                            ${r.last_message ? `${escapeHtml(r.last_message.sender_name)}: ${escapeHtml(r.last_message.content || '[Tệp tin]')}` : 'Chưa có tin nhắn'}
                        </p>
                    </div>
                </div>

                ${r.unread_count > 0 ? `
                    <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shrink-0">
                        ${r.unread_count}
                    </span>
                ` : ''}
            </div>
        `).join('');

    } catch (e) {
        console.error('Error loading chat rooms:', e);
    }
}

function showChatRoomsList() {
    stopChatPolling();
    chatActiveRoomId = null;

    document.getElementById('chat-rooms-view').classList.remove('hidden');
    document.getElementById('chat-messages-view').classList.add('hidden');
    document.getElementById('chat-btn-back-rooms').classList.add('hidden');

    document.getElementById('chat-header-title').textContent = 'Trò Chuyện Nội Bộ';
    document.getElementById('chat-header-subtitle').textContent = 'Văn phòng Triền Võ Logistics';

    loadChatRooms();
}

async function openChatRoom(roomId, roomTitle) {
    chatActiveRoomId = roomId;
    chatLatestMessageId = 0;

    document.getElementById('chat-rooms-view').classList.add('hidden');
    document.getElementById('chat-messages-view').classList.remove('hidden');
    document.getElementById('chat-btn-back-rooms').classList.remove('hidden');

    document.getElementById('chat-header-title').textContent = roomTitle;
    document.getElementById('chat-header-subtitle').textContent = 'Đang trực tuyến';

    const scrollEl = document.getElementById('chat-messages-scroll');
    scrollEl.innerHTML = '<div class="text-center py-4 text-xs text-slate-400"><i class="ph ph-spinner ph-spin text-base mr-1"></i>Đang tải tin nhắn...</div>';

    // Đánh dấu đã đọc
    fetch(`/api/collaboration/chat/rooms/${roomId}/mark-read/`, {
        method: 'POST',
        headers: getAuthHeaders()
    });

    // Tải tin nhắn ban đầu
    await pollChatMessages(false);
    syncMobileChatViewport();

    // Kích hoạt Polling định kỳ mỗi 3s (Tối ưu cache backend)
    startChatPolling();
}

async function pollChatMessages(isPeriodic = true) {
    if (!chatActiveRoomId) return;

    try {
        const url = `/api/collaboration/chat/rooms/${chatActiveRoomId}/messages/?after_id=${chatLatestMessageId}`;
        const res = await authFetch(url, { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) return;

        const scrollEl = document.getElementById('chat-messages-scroll');
        if (!isPeriodic) {
            scrollEl.innerHTML = '';
        }

        // Cập nhật trạng thái 2 check (đã đọc) cho các tin nhắn trước đó của tôi nếu đối phương đã đọc
        if (json.max_other_read_id) {
            document.querySelectorAll('#chat-messages-scroll [data-my-msg-id]').forEach(el => {
                const msgId = parseInt(el.getAttribute('data-my-msg-id'), 10);
                if (msgId <= json.max_other_read_id) {
                    const statusEl = el.querySelector('.chat-status-icon');
                    if (statusEl && !statusEl.classList.contains('text-teal-600')) {
                        statusEl.className = 'chat-status-icon text-teal-600 inline-flex items-center ml-1';
                        statusEl.setAttribute('title', 'Đã đọc');
                        statusEl.innerHTML = '<i class="ph-bold ph-checks text-[12px]"></i>';
                    }
                }
            });
        }

        if (json.messages && json.messages.length > 0) {
            const currentUserId = window.CURRENT_USER?.id;
            json.messages.forEach(msg => {
                const isMe = currentUserId && msg.sender === currentUserId;
                const msgEl = document.createElement('div');
                msgEl.id = `chat-msg-${msg.id}`;
                msgEl.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`;
                if (isMe) {
                    msgEl.setAttribute('data-my-msg-id', msg.id);
                }

                const timeStr = formatTimeOnly(msg.created_at);
                const checkIconHtml = isMe ? (
                    msg.is_read ?
                    `<span class="chat-status-icon text-teal-600 inline-flex items-center ml-1" title="Đã đọc"><i class="ph-bold ph-checks text-[12px]"></i></span>` :
                    `<span class="chat-status-icon text-slate-400 inline-flex items-center ml-1" title="Đã gửi (Chưa đọc)"><i class="ph-bold ph-check text-[10.5px]"></i></span>`
                ) : '';

                msgEl.innerHTML = `
                    ${!isMe ? `<span class="text-[10px] font-bold text-slate-500 px-1">${escapeHtml(msg.sender_info?.full_name || msg.sender_name)}</span>` : ''}
                    <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${isMe ? 'bg-teal-700 text-white rounded-br-xs' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'}">
                        ${msg.reply_to_snippet ? `
                            <div class="mb-1 pb-1 border-b border-white/20 text-[10px] opacity-80">
                                <strong>${escapeHtml(msg.reply_to_snippet.sender_name)}:</strong> ${escapeHtml(msg.reply_to_snippet.snippet)}
                            </div>
                        ` : ''}
                        <div class="whitespace-pre-line break-words">${formatChatMessageContent(msg.content, isMe)}</div>
                        ${msg.attachments && msg.attachments.length > 0 ? `
                            <div class="mt-2 space-y-1.5 pt-1.5 border-t ${isMe ? 'border-teal-600' : 'border-slate-100'}">
                                ${msg.attachments.map(att => {
                                    const isImg = att.file && /\.(png|jpe?g|gif|webp)$/i.test(att.original_name || att.file);
                                    if (isImg) {
                                        return `
                                            <div class="rounded-lg overflow-hidden border ${isMe ? 'border-teal-600/80' : 'border-slate-200'} max-w-[240px]">
                                                <a href="${att.file}" target="_blank" rel="noopener noreferrer">
                                                    <img src="${att.file}" alt="${escapeHtml(att.original_name)}" class="w-full max-h-56 object-cover hover:scale-102 transition-transform duration-200 rounded-lg cursor-pointer" loading="lazy" />
                                                </a>
                                            </div>
                                        `;
                                    }
                                    return `
                                        <a href="${att.file}" target="_blank" download class="flex items-center gap-1.5 text-[10.5px] ${isMe ? 'text-teal-100 hover:text-white' : 'text-teal-700 hover:underline'}">
                                            <i class="ph-bold ph-paperclip"></i> ${escapeHtml(att.original_name)}
                                        </a>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex items-center text-[9px] text-slate-400 px-1">
                        <span>${timeStr}</span>
                        ${checkIconHtml}
                    </div>
                `;
                scrollEl.appendChild(msgEl);
            });

            chatLatestMessageId = json.latest_id;
            scrollEl.scrollTop = scrollEl.scrollHeight;
        } else if (!isPeriodic && (!json.messages || json.messages.length === 0)) {
            scrollEl.innerHTML = '<div class="text-center py-12 text-xs text-slate-400">Bắt đầu cuộc trò chuyện...</div>';
        }

    } catch (e) {
        console.error('Error polling messages:', e);
    }
}

function startChatPolling() {
    stopChatPolling();
    chatPollTimer = setInterval(() => {
        pollChatMessages(true);
    }, 3000);
}

function stopChatPolling() {
    if (chatPollTimer) {
        clearInterval(chatPollTimer);
        chatPollTimer = null;
    }
}

function handleChatInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

let chatMentionCurrentTab = 'users';
let chatMentionFilterKeyword = '';
let chatCachedTasksList = null;
let chatCurrentRelatedTaskId = null;

function renderChatPendingFilesPreview() {
    const preview = document.getElementById('chat-pending-files-preview');
    const content = document.getElementById('chat-pending-files-content');
    if (!preview || !content) return;

    if (!chatSelectedFiles || chatSelectedFiles.length === 0) {
        preview.classList.add('hidden');
        content.innerHTML = '';
        return;
    }

    preview.classList.remove('hidden');
    content.innerHTML = chatSelectedFiles.map((file, idx) => {
        const isImg = file.type && file.type.startsWith('image/');
        const url = isImg ? URL.createObjectURL(file) : null;
        return `
            <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0 shadow-2xs max-w-[200px]">
                ${isImg ? `
                    <img src="${url}" class="w-8 h-8 rounded-md object-cover shrink-0 border border-slate-100" />
                ` : `
                    <i class="ph-bold ph-file text-base text-slate-500 shrink-0"></i>
                `}
                <div class="min-w-0 flex-1">
                    <p class="text-[11px] font-bold text-slate-700 truncate" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
                    <p class="text-[9px] text-slate-400 font-mono">${(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onclick="removeChatSelectedFile(${idx})" class="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0" title="Bỏ ảnh này">
                    <i class="ph-bold ph-x text-xs"></i>
                </button>
            </div>
        `;
    }).join('');
}

function removeChatSelectedFile(idx) {
    if (chatSelectedFiles && chatSelectedFiles[idx]) {
        chatSelectedFiles.splice(idx, 1);
        renderChatPendingFilesPreview();
    }
}
window.removeChatSelectedFile = removeChatSelectedFile;
window.renderChatPendingFilesPreview = renderChatPendingFilesPreview;

async function sendChatMessage() {
    if (!chatActiveRoomId) return;
    const input = document.getElementById('chat-message-input');
    const content = input.value.trim();

    if (!content && chatSelectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('content', content);
    if (chatCurrentRelatedTaskId) {
        formData.append('related_task_id', chatCurrentRelatedTaskId);
        chatCurrentRelatedTaskId = null;
    }

    for (let i = 0; i < chatSelectedFiles.length; i++) {
        formData.append('files', chatSelectedFiles[i]);
    }

    input.value = '';
    input.style.height = 'auto';
    clearPendingChatFiles();
    closeChatMentionDropdown();

    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type'];
        const res = await authFetch(`/api/collaboration/chat/rooms/${chatActiveRoomId}/messages/`, {
            method: 'POST',
            headers,
            body: formData
        });
        const json = await res.json();
        if (json.success) {
            pollChatMessages(true);
        }
    } catch (e) {
        console.error('Error sending chat message:', e);
    }
}

function handleChatFilesSelected(e) {
    if (e.target.files && e.target.files.length > 0) {
        Array.from(e.target.files).forEach(f => chatSelectedFiles.push(f));
        renderChatPendingFilesPreview();
    }
}

function clearPendingChatFiles() {
    chatSelectedFiles = [];
    const fileInput = document.getElementById('chat-file-input');
    if (fileInput) fileInput.value = '';
    renderChatPendingFilesPreview();
}

function addChatSelectedFile(file) {
    if (!file) return;
    chatSelectedFiles.push(file);
    renderChatPendingFilesPreview();
}
window.addChatSelectedFile = addChatSelectedFile;

async function captureScreenForChat() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            showToast('info', 'Trình duyệt chưa hỗ trợ chụp trực tiếp qua API. Bạn vui lòng nhấn phím Win + Shift + S (hoặc PrintScreen) rồi nhấn Ctrl + V để dán ảnh vào chat.', 'Chụp Màn Hình');
            return;
        }

        showToast('info', 'Vui lòng chọn cửa sổ hoặc màn hình bạn muốn chụp...', 'Chụp Ảnh Màn Hình');
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'monitor', cursor: 'always' }
        });

        const track = stream.getVideoTracks()[0];
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();

        await new Promise(r => setTimeout(r, 200));

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        track.stop();
        stream.getTracks().forEach(t => t.stop());

        canvas.toBlob((blob) => {
            if (blob) {
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                const file = new File([blob], `capture_${timeStr}.png`, { type: 'image/png' });
                addChatSelectedFile(file);
                showToast('success', `Đã chụp và đính kèm ảnh "${file.name}" vào tin nhắn`, 'Chụp Ảnh Thành Công');
            }
        }, 'image/png');
    } catch (err) {
        if (err.name !== 'NotAllowedError') {
            console.warn('Lỗi khi chụp màn hình:', err);
            showToast('warning', 'Không thể chụp tự động. Hãy dùng phím Win + Shift + S rồi nhấn Ctrl + V.', 'Hướng Dẫn');
        }
    }
}
window.captureScreenForChat = captureScreenForChat;

async function toggleChatMentionMenu(e, defaultTab = null) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('chat-mention-dropdown');
    if (!dropdown) return;

    if (dropdown.classList.contains('hidden') || defaultTab) {
        dropdown.classList.remove('hidden');
        if (defaultTab) chatMentionCurrentTab = defaultTab;
        const searchInput = document.getElementById('chat-mention-search-input');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 60);
        }
        await switchChatMentionTab(chatMentionCurrentTab);
    } else {
        dropdown.classList.add('hidden');
    }
}
window.toggleChatMentionMenu = toggleChatMentionMenu;

function closeChatMentionDropdown() {
    const dropdown = document.getElementById('chat-mention-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
}
window.closeChatMentionDropdown = closeChatMentionDropdown;

async function switchChatMentionTab(tab) {
    chatMentionCurrentTab = tab;
    const tabUsers = document.getElementById('chat-mention-tab-users');
    const tabTasks = document.getElementById('chat-mention-tab-tasks');
    const searchInput = document.getElementById('chat-mention-search-input');

    if (tab === 'users') {
        if (tabUsers) tabUsers.className = 'py-1 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 bg-white text-teal-800 shadow-xs border border-slate-200/80 cursor-pointer transition-all';
        if (tabTasks) tabTasks.className = 'py-1 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer transition-all';
        if (searchInput) searchInput.placeholder = 'Tìm tên hoặc phòng ban nhân sự...';
        await renderChatMentionUsers(chatMentionFilterKeyword);
    } else {
        if (tabUsers) tabUsers.className = 'py-1 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer transition-all';
        if (tabTasks) tabTasks.className = 'py-1 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 bg-white text-indigo-800 shadow-xs border border-slate-200/80 cursor-pointer transition-all';
        if (searchInput) searchInput.placeholder = 'Tìm mã hoặc tên mục việc...';
        await renderChatMentionTasks(chatMentionFilterKeyword);
    }
}
window.switchChatMentionTab = switchChatMentionTab;

async function renderChatMentionUsers(keyword = '') {
    const listEl = document.getElementById('chat-mention-items-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs"><i class="ph ph-spinner ph-spin mr-1"></i>Đang tải nhân sự...</div>';

    const users = await ensureOfficeDirectoryLoaded();
    const cleanKw = (keyword || '').toLowerCase().trim();

    const filtered = (users || []).filter(u => {
        if (!cleanKw) return true;
        const name = (u.full_name || '').toLowerCase();
        const dept = (u.department_name || '').toLowerCase();
        const role = (u.role_name || '').toLowerCase();
        return name.includes(cleanKw) || dept.includes(cleanKw) || role.includes(cleanKw);
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs">Không tìm thấy nhân sự phù hợp.</div>';
        return;
    }

    listEl.innerHTML = filtered.map(u => {
        const initials = (u.full_name || 'U').split(' ').map(n => n[0]).slice(-2).join('').toUpperCase();
        return `
            <div onclick="selectChatMentionUser('${escapeHtml(u.full_name)}', ${u.user_id})" class="flex items-center gap-2 p-2 hover:bg-teal-50/80 rounded-xl cursor-pointer transition-colors group">
                <div class="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-teal-200 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    ${initials}
                </div>
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 text-xs group-hover:text-teal-900 truncate">@${escapeHtml(u.full_name)}</p>
                    <p class="text-[10.5px] text-slate-400 truncate">${escapeHtml(u.department_name || 'Văn phòng')} ${u.role_name ? `• ${escapeHtml(u.role_name)}` : ''}</p>
                </div>
            </div>
        `;
    }).join('');
}
window.renderChatMentionUsers = renderChatMentionUsers;

async function renderChatMentionTasks(keyword = '') {
    const listEl = document.getElementById('chat-mention-items-list');
    if (!listEl) return;

    if (!chatCachedTasksList) {
        listEl.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs"><i class="ph ph-spinner ph-spin mr-1"></i>Đang tải danh sách mục việc...</div>';
        try {
            const res = await authFetch('/api/collaboration/tasks/?limit=30', { headers: getAuthHeaders() });
            const json = await res.json();
            if (json.success && json.data) {
                chatCachedTasksList = json.data;
            } else {
                chatCachedTasksList = [];
            }
        } catch (e) {
            console.warn('Lỗi nạp nhiệm vụ chat mention:', e);
            chatCachedTasksList = [];
        }
    }

    const cleanKw = (keyword || '').toLowerCase().trim();
    const filtered = (chatCachedTasksList || []).filter(t => {
        if (!cleanKw) return true;
        const code = (t.code || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        return code.includes(cleanKw) || title.includes(cleanKw);
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs">Không tìm thấy mục việc phù hợp.</div>';
        return;
    }

    listEl.innerHTML = filtered.map(t => {
        return `
            <div onclick="selectChatMentionTask('${escapeHtml(t.code)}', '${escapeHtml(t.title)}', ${t.id})" class="flex items-start gap-2 p-2 hover:bg-indigo-50/80 rounded-xl cursor-pointer transition-colors group">
                <span class="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0 mt-0.5">
                    ${escapeHtml(t.code)}
                </span>
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 text-xs group-hover:text-indigo-900 truncate">${escapeHtml(t.title)}</p>
                    <p class="text-[10px] text-slate-400 truncate">Hạn: ${t.due_date ? normalizeDateToISO(t.due_date) : 'Không hạn'} • Tiến độ: ${t.progress_percent || 0}%</p>
                </div>
            </div>
        `;
    }).join('');
}
window.renderChatMentionTasks = renderChatMentionTasks;

function filterChatMentionList(keyword) {
    chatMentionFilterKeyword = keyword;
    if (chatMentionCurrentTab === 'users') {
        renderChatMentionUsers(keyword);
    } else {
        renderChatMentionTasks(keyword);
    }
}
window.filterChatMentionList = filterChatMentionList;

function selectChatMentionUser(fullName, userId) {
    const input = document.getElementById('chat-message-input');
    if (!input) return;

    const mentionText = `@${fullName} `;
    insertTextAtCursor(input, mentionText);
    closeChatMentionDropdown();
    input.focus();
}
window.selectChatMentionUser = selectChatMentionUser;

function selectChatMentionTask(code, title, taskId) {
    const input = document.getElementById('chat-message-input');
    if (!input) return;

    chatCurrentRelatedTaskId = taskId;
    const mentionText = `#${code} [${title}] `;
    insertTextAtCursor(input, mentionText);
    closeChatMentionDropdown();
    input.focus();
}
window.selectChatMentionTask = selectChatMentionTask;

function insertTextAtCursor(textarea, text) {
    const val = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = val.substring(0, start);
    const after = val.substring(end);

    const match = before.match(/([@#])[^@#\s]*$/);
    if (match) {
        const replaceStart = match.index;
        textarea.value = val.substring(0, replaceStart) + text + after;
        textarea.selectionStart = textarea.selectionEnd = replaceStart + text.length;
    } else {
        textarea.value = before + text + after;
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function handleChatInputTyping(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';

    const val = textarea.value;
    const cursor = textarea.selectionStart;
    const before = val.substring(0, cursor);

    const matchUser = before.match(/@([^@#\s]*)$/);
    const matchTask = before.match(/#([^@#\s]*)$/);

    if (matchUser) {
        const query = matchUser[1];
        chatMentionFilterKeyword = query;
        toggleChatMentionMenu(null, 'users');
        renderChatMentionUsers(query);
    } else if (matchTask) {
        const query = matchTask[1];
        chatMentionFilterKeyword = query;
        toggleChatMentionMenu(null, 'tasks');
        renderChatMentionTasks(query);
    } else {
        closeChatMentionDropdown();
    }
}
window.handleChatInputTyping = handleChatInputTyping;

function openOfficeTaskFromChat(taskCode) {
    if (!taskCode) return;
    if (chatCachedTasksList) {
        const found = chatCachedTasksList.find(t => t.code === taskCode);
        if (found && typeof openTaskDetailDrawer === 'function') {
            openTaskDetailDrawer(found.id);
            return;
        }
    }
    authFetch(`/api/collaboration/tasks/?q=${encodeURIComponent(taskCode)}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(json => {
            if (json.success && json.data && json.data.length > 0) {
                if (typeof openTaskDetailDrawer === 'function') {
                    openTaskDetailDrawer(json.data[0].id);
                }
            } else {
                showToast('info', `Không tìm thấy thông tin mục việc ${taskCode}`);
            }
        }).catch(e => console.warn('Lỗi mở nhiệm vụ từ chat:', e));
}
window.openOfficeTaskFromChat = openOfficeTaskFromChat;

// Bắt sự kiện dán ảnh Clipboard (Ctrl + V) trên ô chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-message-input');
    if (chatInput) {
        chatInput.addEventListener('paste', (e) => {
            if (typeof window.extractImageFromClipboardEvent === 'function') {
                const file = window.extractImageFromClipboardEvent(e);
                if (file) {
                    e.preventDefault();
                    addChatSelectedFile(file);
                    showToast('success', `Đã dán ảnh "${file.name}" vào tin nhắn`, 'Dán Ảnh Thành Công');
                }
            }
        });
    }
});

async function toggleChatDirectoryDropdown() {
    const dropdown = document.getElementById('chat-directory-dropdown');
    const select = document.getElementById('chat-select-colleague');
    if (!dropdown || !select) return;

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        select.innerHTML = '<option value="">-- Đang tải nhân sự văn phòng... --</option>';
        const users = await ensureOfficeDirectoryLoaded();
        select.innerHTML = '<option value="">-- Chọn đồng nghiệp văn phòng --</option>';
        if (users && users.length > 0) {
            users.forEach(u => {
                if (u.user_id !== window.CURRENT_USER?.id) {
                    const opt = document.createElement('option');
                    opt.value = u.user_id;
                    opt.textContent = `${u.full_name} (${u.department_name})`;
                    select.appendChild(opt);
                }
            });
        }
    } else {
        dropdown.classList.add('hidden');
    }
}

async function startDirectChat(targetUserId) {
    if (!targetUserId) return;
    try {
        const res = await authFetch('/api/collaboration/chat/rooms/', {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ target_user_id: targetUserId })
        });
        const json = await res.json();
        if (json.success && json.data) {
            document.getElementById('chat-directory-dropdown').classList.add('hidden');
            openChatRoom(json.data.id, json.data.name);
        } else {
            showToast('error', json.message || 'Không thể tạo cuộc trò chuyện.');
        }
    } catch (e) {
        console.error('Error starting direct chat:', e);
    }
}


// ==========================================================================
// 4. HELPER UTILITIES
// ==========================================================================

function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'URGENT': return 'bg-rose-100 text-rose-800 border border-rose-200';
        case 'HIGH': return 'bg-orange-100 text-orange-800 border border-orange-200';
        case 'MEDIUM': return 'bg-sky-100 text-sky-800 border border-sky-200';
        case 'LOW': return 'bg-slate-100 text-slate-700 border border-slate-200';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 'URGENT': return 'Khẩn cấp';
        case 'HIGH': return 'Cao';
        case 'MEDIUM': return 'Bình thường';
        case 'LOW': return 'Thấp';
        default: return priority;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'DONE': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        case 'REVIEW': return 'bg-amber-100 text-amber-800 border border-amber-200';
        case 'IN_PROGRESS': return 'bg-sky-100 text-sky-800 border border-sky-200';
        case 'TODO': return 'bg-slate-100 text-slate-700 border border-slate-200';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'DONE': return 'Hoàn thành';
        case 'REVIEW': return 'Chờ nghiệm thu';
        case 'IN_PROGRESS': return 'Đang làm';
        case 'TODO': return 'Cần làm';
        case 'CANCELLED': return 'Đã hủy';
        default: return status;
    }
}

function formatDateDMY(dStr) {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
}

function parseDateFlexible(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    if (typeof dateStr === 'string') {
        const str = dateStr.trim();
        // Kiểm tra định dạng DD/MM/YYYY HH:mm[:ss] hoặc DD/MM/YYYY
        const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const year = parseInt(dmyMatch[3], 10);
            const hour = parseInt(dmyMatch[4] || 0, 10);
            const minute = parseInt(dmyMatch[5] || 0, 10);
            const second = parseInt(dmyMatch[6] || 0, 10);
            const parsed = new Date(year, month, day, hour, minute, second);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        // Thử parse Date thông thường (hỗ trợ ISO YYYY-MM-DDTHH:mm:ssZ)
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

function formatDateTime(isoStr) {
    if (!isoStr) return '';
    const d = parseDateFlexible(isoStr);
    if (!d) return isoStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeOnly(isoStr) {
    if (!isoStr) return '';
    // Nếu là string có dạng time HH:mm
    if (typeof isoStr === 'string') {
        const timeMatch = isoStr.match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/);
        if (timeMatch) {
            return timeMatch[1];
        }
    }
    const d = parseDateFlexible(isoStr);
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeAgo(isoStr) {
    if (!isoStr) return '';
    const d = parseDateFlexible(isoStr);
    if (!d) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}


// ==========================================================================
// 5. PHÂN HỆ: CHUÔNG THÔNG BÁO NỘI BỘ (IN-APP BELL NOTIFICATIONS)
// ==========================================================================

let currentNotificationFilter = 'all'; // 'all' | 'unread'
let currentNotificationsList = [];

function initBellNotifications() {
    checkNotificationUnreadCount();
    // Định kỳ kiểm tra thông báo chuông mỗi 30s
    setInterval(checkNotificationUnreadCount, 30000);

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function(e) {
        const container = document.getElementById('topbar-notification-container');
        const menu = document.getElementById('notification-dropdown-menu');
        if (container && menu && !container.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
}

async function checkNotificationUnreadCount() {
    try {
        const res = await authFetch('/api/collaboration/notifications/?limit=1', {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            updateNotificationBadge(json.total_unread);
        }
    } catch (e) {
        // Silent fail
    }
}

function updateNotificationBadge(unreadCount) {
    const badge = document.getElementById('notification-unread-badge');
    const pill = document.getElementById('notification-count-pill');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    if (pill) {
        pill.textContent = `${unreadCount} mới`;
    }
}

function toggleNotificationDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('notification-dropdown-menu');
    if (!menu) return;

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        loadNotifications(currentNotificationFilter);
    } else {
        menu.classList.add('hidden');
    }
}

function filterNotifications(filterMode) {
    currentNotificationFilter = filterMode;
    const tabAll = document.getElementById('notif-tab-all');
    const tabUnread = document.getElementById('notif-tab-unread');

    if (filterMode === 'all') {
        if (tabAll) {
            tabAll.className = 'px-3 py-1.5 border-b-2 border-teal-600 text-teal-800 font-bold transition-colors';
        }
        if (tabUnread) {
            tabUnread.className = 'px-3 py-1.5 border-b-2 border-transparent text-slate-600 hover:text-teal-800 transition-colors';
        }
    } else {
        if (tabAll) {
            tabAll.className = 'px-3 py-1.5 border-b-2 border-transparent text-slate-600 hover:text-teal-800 transition-colors';
        }
        if (tabUnread) {
            tabUnread.className = 'px-3 py-1.5 border-b-2 border-teal-600 text-teal-800 font-bold transition-colors';
        }
    }
    loadNotifications(filterMode);
}

async function loadNotifications(filterMode = 'all') {
    const listEl = document.getElementById('notification-items-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-400"><i class="ph ph-spinner ph-spin text-lg mb-1 block"></i>Đang tải thông báo...</div>';

    try {
        const url = filterMode === 'unread' ? '/api/collaboration/notifications/?unread=1' : '/api/collaboration/notifications/';
        const res = await authFetch(url, { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success || !json.data) {
            listEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">Không thể tải thông báo.</div>';
            return;
        }

        updateNotificationBadge(json.total_unread);
        currentNotificationsList = json.data;

        if (json.data.length === 0) {
            listEl.innerHTML = `
                <div class="p-8 text-center text-xs text-slate-400">
                    <i class="ph ph-bell-simple-slash text-2xl mb-1.5 text-slate-300 block"></i>
                    ${filterMode === 'unread' ? 'Không có thông báo chưa đọc nào.' : 'Chưa có thông báo nào gửi đến bạn.'}
                </div>
            `;
            return;
        }

        listEl.innerHTML = json.data.map(item => {
            let iconClass = 'ph-bold ph-bell bg-slate-100 text-slate-600';
            if (item.notification_type === 'TASK_ASSIGNED') {
                iconClass = 'ph-bold ph-check-square-offset bg-amber-50 text-amber-700 border border-amber-200';
            } else if (item.notification_type === 'TASK_STATUS_CHANGED') {
                iconClass = 'ph-bold ph-arrows-clockwise bg-sky-50 text-sky-700 border border-sky-200';
            } else if (item.notification_type === 'NEWS_URGENT') {
                iconClass = 'ph-bold ph-warning-octagon bg-rose-50 text-rose-700 border border-rose-200';
            } else if (item.notification_type === 'NEWS_NEW') {
                iconClass = 'ph-bold ph-newspaper bg-teal-50 text-teal-700 border border-teal-200';
            } else if (item.notification_type === 'CHAT_MENTION') {
                iconClass = 'ph-bold ph-at bg-indigo-50 text-indigo-700 border border-indigo-200';
            }

            return `
                <div onclick="handleNotificationClick(${item.id}, '${item.target_type}', ${item.target_id || 'null'}, '${escapeHtml(item.link_url || '')}')" 
                    class="p-3.5 flex items-start gap-3 hover:bg-teal-50/50 cursor-pointer transition-colors relative group ${item.is_read ? 'bg-white opacity-85' : 'bg-slate-50/80 font-medium'}">
                    
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-2xs ${iconClass}">
                        <i class="${iconClass.split(' ')[0]} ${iconClass.split(' ')[1]}"></i>
                    </div>

                    <div class="flex-1 min-w-0 pr-4">
                        <div class="flex items-center justify-between gap-2 mb-0.5">
                            <span class="text-[10px] font-bold uppercase tracking-wider ${item.is_read ? 'text-slate-400' : 'text-teal-800'}">
                                ${escapeHtml(item.type_display || 'Thông báo')}
                            </span>
                            <span class="text-[10px] text-slate-400 shrink-0 font-normal">
                                ${formatTimeAgo(item.created_at)}
                            </span>
                        </div>
                        <h5 class="text-xs font-bold ${item.is_read ? 'text-slate-700' : 'text-slate-900'} leading-snug truncate">
                            ${escapeHtml(item.title)}
                        </h5>
                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            ${escapeHtml(item.message)}
                        </p>
                    </div>

                    ${!item.is_read ? `
                        <span class="w-2 h-2 rounded-full bg-teal-600 shrink-0 absolute right-3 top-4 shadow-2xs" title="Chưa đọc"></span>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Error loading notifications:', e);
        listEl.innerHTML = '<div class="p-6 text-center text-xs text-rose-500">Lỗi kết nối máy chủ.</div>';
    }
}

async function handleNotificationClick(notifId, targetType, targetId, linkUrl) {
    // 1. Đánh dấu đã đọc
    try {
        await authFetch(`/api/collaboration/notifications/${notifId}/mark-read/`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        checkNotificationUnreadCount();
    } catch (e) {
        console.error('Error marking read:', e);
    }

    // 2. Đóng dropdown chuông
    const menu = document.getElementById('notification-dropdown-menu');
    if (menu) menu.classList.add('hidden');

    // 3. Điều hướng thông minh
    if (targetType === 'NEWS' && targetId) {
        if (typeof showView === 'function') {
            showView('view-ban-tin');
            if (typeof openNewsDetailModal === 'function') {
                openNewsDetailModal(targetId);
            }
        }
    } else if (targetType === 'TASK' && targetId) {
        if (typeof showView === 'function') {
            showView('view-giao-viec');
            if (typeof openTaskDetailDrawer === 'function') {
                openTaskDetailDrawer(targetId);
            }
        }
    } else if (targetType === 'CHAT') {
        toggleChatWindow();
    } else if (linkUrl) {
        if (linkUrl.startsWith('#')) {
            const viewId = linkUrl.substring(1);
            if (typeof showView === 'function') {
                showView(viewId === 'tasks' ? 'view-giao-viec' : (viewId === 'news' ? 'view-ban-tin' : viewId));
            }
        }
    }
}

async function markAllNotificationsAsRead() {
    try {
        const res = await authFetch('/api/collaboration/notifications/mark-all-read/', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            updateNotificationBadge(0);
            loadNotifications(currentNotificationFilter);
            if (typeof showToast === 'function') {
                showToast('success', 'Đã đánh dấu tất cả thông báo là đã đọc.');
            }
        }
    } catch (e) {
        console.error('Error marking all read:', e);
    }
}


// Khởi chạy module Collaboration khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', function() {
    initCollaborationChat();
    initBellNotifications();
});


// ==========================================
// THAO TÁC ĐỀ XUẤT GIA HẠN & PHÊ DUYỆT GIA HẠN CÔNG VIỆC
// ==========================================

function openRequestExtensionInline() {
    const form = document.getElementById('task-drawer-request-extension-form');
    if (!form) return;
    form.classList.remove('hidden');

    const inputDate = document.getElementById('ext-input-new-deadline');
    const inputReason = document.getElementById('ext-input-reason');

    if (inputReason) inputReason.value = '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];

    if (inputDate) {
        inputDate.min = minDateStr;
        if (currentTaskDetailData && currentTaskDetailData.due_date) {
            try {
                const cur = new Date(currentTaskDetailData.due_date);
                cur.setDate(cur.getDate() + 3);
                inputDate.value = cur.toISOString().split('T')[0];
            } catch(e) {
                inputDate.value = minDateStr;
            }
        } else {
            inputDate.value = minDateStr;
        }
        inputDate.focus();
    }
}
window.openRequestExtensionInline = openRequestExtensionInline;

function closeRequestExtensionInline() {
    const form = document.getElementById('task-drawer-request-extension-form');
    if (form) form.classList.add('hidden');
}
window.closeRequestExtensionInline = closeRequestExtensionInline;

async function submitTaskExtensionRequest() {
    if (!currentViewingTaskId) return;
    const inputDate = document.getElementById('ext-input-new-deadline');
    const inputReason = document.getElementById('ext-input-reason');

    const requested_deadline = inputDate?.value;
    const reason = inputReason?.value?.trim();

    if (!requested_deadline) {
        showToast('Vui lòng chọn hạn hoàn thành mới đề xuất.', 'warning');
        if (inputDate) inputDate.focus();
        return;
    }
    if (!reason) {
        showToast('Vui lòng nhập lý do đề xuất dời hạn để người giao việc duyệt.', 'warning');
        if (inputReason) inputReason.focus();
        return;
    }

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/extension/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                action: 'request',
                requested_deadline,
                reason
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Đã gửi đề xuất gia hạn thành công!', 'success');
            closeRequestExtensionInline();
            await openTaskDetailDrawer(currentViewingTaskId);
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast(json.message || 'Không thể gửi đề xuất gia hạn.', 'error');
        }
    } catch (e) {
        console.error('Error requesting task extension:', e);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}
window.submitTaskExtensionRequest = submitTaskExtensionRequest;

async function reviewTaskExtension(action) {
    if (!currentViewingTaskId) return;
    let note = '';

    if (action === 'approve') {
        const ok = confirm('XÁC NHẬN DUYỆT GIA HẠN:\nBạn có chắc chắn muốn phê duyệt dời hạn hoàn thành công việc này sang ngày mới?');
        if (!ok) return;
    } else if (action === 'reject') {
        const reason = prompt('Lý do từ chối đề xuất gia hạn (tùy chọn):');
        if (reason === null) return;
        note = reason.trim();
    }

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/extension/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                action,
                note
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Đã cập nhật trạng thái gia hạn!', 'success');
            await openTaskDetailDrawer(currentViewingTaskId);
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast(json.message || 'Thao tác không thành công.', 'error');
        }
    } catch (e) {
        console.error('Error reviewing task extension:', e);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}
window.reviewTaskExtension = reviewTaskExtension;

async function cancelTaskExtension() {
    if (!currentViewingTaskId) return;
    const ok = confirm('Bạn có chắc chắn muốn thu hồi yêu cầu đề xuất gia hạn này?');
    if (!ok) return;

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/extension/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ action: 'cancel' })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Đã thu hồi đề xuất gia hạn.', 'info');
            await openTaskDetailDrawer(currentViewingTaskId);
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast(json.message || 'Thao tác không thành công.', 'error');
        }
    } catch (e) {
        console.error('Error cancelling task extension:', e);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}
window.cancelTaskExtension = cancelTaskExtension;
