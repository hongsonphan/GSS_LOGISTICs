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
    const deptFilter = document.getElementById('news-department-filter');
    if (deptFilter && deptFilter.value) params.append('department', deptFilter.value);
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

        // 1. Dọn dẹp pinned container để tránh trùng lặp bài viết
        if (pinnedEl) {
            pinnedEl.innerHTML = '';
            pinnedEl.classList.add('hidden');
        }

        // 2. Render Toàn Bộ Bản Tin Theo Định Dạng Dòng/Đoạn Thống Nhất (Chuẩn Thẻ Số 1, Tinh Gọn Không Thẻ Bọc Thô)
        if (json.data.length === 0) {
            gridEl.innerHTML = `
                <div class="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <i class="ph ph-newspaper text-2xl"></i>
                    </div>
                    <p class="text-slate-600 font-bold text-xs">Chưa có thông báo nào được đăng tải.</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Các thông báo điều hành và văn bản chỉ đạo sẽ hiển thị tại đây.</p>
                </div>
            `;
            return;
        }

        gridEl.innerHTML = json.data.map(p => {
            const urgentBadge = p.is_urgent ? `
                <span class="inline-flex items-center text-[10px] font-black text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-200 mr-1.5 shrink-0 gap-1">
                    <i class="ph-bold ph-warning-circle text-[10.5px]"></i>Khẩn
                </span>
            ` : '';

            const pinnedBadge = p.is_pinned ? `
                <span class="inline-flex items-center text-[10px] font-black text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200 mr-1.5 shrink-0 gap-1">
                    <i class="ph-bold ph-push-pin text-[10.5px]"></i>Ghim
                </span>
            ` : '';

            const catName = p.category_info?.name || 'Thông báo chung';
            const catColor = p.category_info?.color || '#0d9488';
            const catBadge = `
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mr-1.5" style="background-color: ${catColor}15; border-color: ${catColor}40; color: ${catColor};">
                    ${escapeHtml(catName)}
                </span>
            `;

            const deptDisplay = p.target_department_display || (p.target_department === 'ALL' ? '' : p.target_department);
            const deptBadge = (deptDisplay && p.target_department !== 'ALL') ? `
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 mr-1.5 shrink-0">
                    Phòng: ${escapeHtml(deptDisplay)}
                </span>
            ` : '';

            let cardClasses = 'bg-white border-slate-200/90 hover:border-teal-400 hover:bg-teal-50/20 shadow-2xs hover:shadow-xs';
            if (p.is_urgent) {
                cardClasses = 'bg-rose-50/20 border-rose-200 hover:border-rose-400 shadow-2xs hover:shadow-xs';
            } else if (p.is_pinned) {
                cardClasses = 'bg-amber-50/25 border-amber-300 ring-1 ring-amber-200/60 hover:border-amber-400 shadow-2xs hover:shadow-xs';
            }

            const dateStr = formatNewsDate(p.published_at || p.created_at);
            const authorName = p.author_name || 'Ban Giám Đốc';

            return `
                <div onclick="openNewsDetailPage('${p.hashid || p.id}', event)" 
                    class="p-3 sm:p-3.5 rounded-xl border ${cardClasses} transition-all cursor-pointer group flex flex-col justify-between space-y-1.5"
                    title="Bấm để mở trang chi tiết & xem trước tài liệu đính kèm (PDF/Word/Excel)">
                    
                    <!-- Hàng 1: Badges bên trái + Ngày bên phải (Chuẩn Hình 3 & 4) -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center flex-wrap gap-y-1">
                            ${urgentBadge}
                            ${pinnedBadge}
                            ${catBadge}
                            ${deptBadge}
                        </div>
                        <span class="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0">${escapeHtml(dateStr)}</span>
                    </div>

                    <!-- Hàng 2: Tiêu đề bản tin (Chuẩn Hình 3 & 4) -->
                    <h4 class="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-teal-800 transition-colors line-clamp-1 sm:line-clamp-2 font-heading leading-snug">
                        ${escapeHtml(p.title)}
                    </h4>

                    <!-- Hàng 3: Tóm tắt nội dung (Chuẩn Hình 3 & 4) -->
                    <p class="text-[11px] sm:text-xs text-slate-500 font-normal line-clamp-2 leading-relaxed">
                        ${escapeHtml(p.summary || '')}
                    </p>

                    <!-- Hàng 4: Người đăng bên trái + Đọc tiếp > bên phải (Chuẩn Hình 3 & 4) -->
                    <div class="flex items-center justify-between text-[10.5px] sm:text-[11px] text-slate-400 pt-1.5 border-t border-slate-100/90">
                        <div class="flex items-center gap-3">
                            <span>Người đăng: <strong class="text-slate-600 font-semibold">${escapeHtml(authorName)}</strong></span>
                            ${p.attachments_count > 0 ? `
                                <span class="inline-flex items-center text-teal-700 font-semibold gap-1 text-[10.5px]">
                                    <i class="ph-bold ph-paperclip text-[11px]"></i>${p.attachments_count} tệp
                                </span>
                            ` : ''}
                            ${p.view_count > 0 ? `
                                <span class="inline-flex items-center text-slate-400 gap-1 text-[10.5px]">
                                    <i class="ph ph-eye text-[11px]"></i>${p.view_count}
                                </span>
                            ` : ''}
                        </div>

                        <div class="flex items-center gap-1.5">
                            ${(p.author_id === window.CURRENT_USER?.id || window.CURRENT_USER?.is_superuser || (window.CURRENT_USER?.hierarchy_level >= 80) || (window.CURRENT_USER?.role === 'DIRECTOR')) ? `
                                <button type="button" onclick="openEditNewsModalFromFeed(${p.id}, event)" 
                                    class="p-1 rounded-md text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors" 
                                    title="Chỉnh sửa bản tin này">
                                    <i class="ph-bold ph-pencil-simple text-xs"></i>
                                </button>
                                <button type="button" onclick="deleteNewsFromFeed(${p.id}, event)" 
                                    class="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" 
                                    title="Xóa bản tin này">
                                    <i class="ph-bold ph-trash text-xs"></i>
                                </button>
                            ` : ''}
                            ${canCreatePost ? `
                                <button type="button" onclick="quickTogglePinNews(${p.id}, event)" 
                                    class="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" 
                                    title="${p.is_pinned ? 'Bỏ ghim khỏi đầu trang' : 'Ghim bài lên đầu trang'}">
                                    <i class="ph-${p.is_pinned ? 'fill text-amber-600' : 'bold'} ph-push-pin text-xs"></i>
                                </button>
                            ` : ''}
                            <span class="text-teal-700 font-bold group-hover:underline flex items-center text-xs ml-1">
                                Đọc tiếp <i class="ph ph-caret-right ml-0.5 text-xs"></i>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Error loading company news:', e);
        gridEl.innerHTML = '<div class="col-span-full text-center py-12 text-rose-500 text-xs">Lỗi tải dữ liệu bản tin.</div>';
    }
}

let currentViewingNewsHashid = null;

function openNewsDetailPage(postIdentifier, event) {
    if (event) {
        event.stopPropagation();
    }
    const target = postIdentifier || currentViewingNewsHashid || currentViewingNewsId;
    if (target) {
        window.location.href = `/news/${target}/`;
    }
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
        currentViewingNewsHashid = p.hashid || p.id;
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

        // Phân quyền hiển thị nút Sửa & Xóa trong Modal
        const currentUserId = window.CURRENT_USER?.id;
        const isManager = window.CURRENT_USER?.is_superuser || (window.CURRENT_USER?.hierarchy_level >= 80) || (window.CURRENT_USER?.role === 'DIRECTOR');
        const canEditThisPost = (p.author_id === currentUserId) || isManager;

        const editBtn = document.getElementById('news-modal-edit-btn');
        if (editBtn) {
            if (canEditThisPost) editBtn.classList.remove('hidden');
            else editBtn.classList.add('hidden');
        }
        const delBtn = document.getElementById('news-modal-delete-btn');
        if (delBtn) {
            if (canEditThisPost) delBtn.classList.remove('hidden');
            else delBtn.classList.add('hidden');
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

// ==========================================================================
// TÍNH NĂNG CHỈNH SỬA & XÓA BẢN TIN TRÊN TRANG FEED (DANH SÁCH)
// ==========================================================================

let feedDeletedAttachmentIds = [];

async function openEditNewsModalFromFeed(postId, event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('modal-edit-news-feed');
    if (!modal) return;

    feedDeletedAttachmentIds = [];
    document.getElementById('edit-feed-post-id').value = postId;

    // Load categories vào select nếu chưa có
    const catSelect = document.getElementById('edit-feed-category');
    const mainCatSelect = document.getElementById('news-category-filter');
    if (catSelect && mainCatSelect) {
        catSelect.innerHTML = '';
        for (let i = 0; i < mainCatSelect.options.length; i++) {
            const opt = mainCatSelect.options[i];
            if (opt.value) {
                const newOpt = document.createElement('option');
                newOpt.value = opt.value;
                newOpt.textContent = opt.textContent;
                catSelect.appendChild(newOpt);
            }
        }
    }

    try {
        const res = await authFetch(`/api/collaboration/news/posts/${postId}/`, {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success || !json.data) {
            showToast('error', 'Không thể tải thông tin bản tin để chỉnh sửa.');
            return;
        }
        const p = json.data;
        document.getElementById('edit-feed-title').value = p.title || '';
        document.getElementById('edit-feed-summary').value = p.summary || '';
        document.getElementById('edit-feed-content').value = p.content || '';
        if (catSelect) catSelect.value = p.category || '';
        const deptSelect = document.getElementById('edit-feed-department');
        if (deptSelect) deptSelect.value = p.target_department || 'ALL';
        document.getElementById('edit-feed-pinned').checked = !!p.is_pinned;
        document.getElementById('edit-feed-urgent').checked = !!p.is_urgent;

        // Render attachments hiện tại
        const attWrapper = document.getElementById('edit-feed-attachments-wrapper');
        const attList = document.getElementById('edit-feed-attachments-list');
        if (attWrapper && attList) {
            if (p.attachments && p.attachments.length > 0) {
                attList.innerHTML = p.attachments.map(att => `
                    <div class="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-slate-200" id="feed-att-row-${att.id}">
                        <span class="truncate max-w-sm text-slate-700 font-medium">
                            <i class="ph-bold ph-paperclip text-teal-600 mr-1"></i>
                            ${escapeHtml(att.file_name)}
                        </span>
                        <button type="button" onclick="toggleMarkDeleteFeedAttachment(${att.id})" id="btn-del-feed-att-${att.id}" class="px-2.5 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer">
                            Xóa
                        </button>
                    </div>
                `).join('');
                attWrapper.classList.remove('hidden');
            } else {
                attList.innerHTML = '';
                attWrapper.classList.add('hidden');
            }
        }

        modal.classList.remove('hidden');
    } catch (err) {
        console.error('Error fetching news for edit:', err);
        showToast('error', 'Lỗi khi tải dữ liệu bài viết.');
    }
}

function closeEditNewsFeedModal() {
    const modal = document.getElementById('modal-edit-news-feed');
    if (modal) modal.classList.add('hidden');
}

function toggleMarkDeleteFeedAttachment(attId) {
    const row = document.getElementById(`feed-att-row-${attId}`);
    const btn = document.getElementById(`btn-del-feed-att-${attId}`);
    const idx = feedDeletedAttachmentIds.indexOf(attId);
    if (idx === -1) {
        feedDeletedAttachmentIds.push(attId);
        if (row) row.classList.add('opacity-40', 'line-through', 'bg-rose-50');
        if (btn) {
            btn.textContent = 'Hoàn tác';
            btn.className = 'px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 rounded text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer';
        }
    } else {
        feedDeletedAttachmentIds.splice(idx, 1);
        if (row) row.classList.remove('opacity-40', 'line-through', 'bg-rose-50');
        if (btn) {
            btn.textContent = 'Xóa';
            btn.className = 'px-2.5 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer';
        }
    }
}

async function handleEditNewsFeedSubmit(e) {
    e.preventDefault();
    const postId = document.getElementById('edit-feed-post-id').value;
    const title = document.getElementById('edit-feed-title').value.trim();
    const content = document.getElementById('edit-feed-content').value.trim();
    const catId = document.getElementById('edit-feed-category')?.value;
    const dept = document.getElementById('edit-feed-department')?.value;
    const summary = document.getElementById('edit-feed-summary')?.value.trim();
    const isPinned = document.getElementById('edit-feed-pinned')?.checked;
    const isUrgent = document.getElementById('edit-feed-urgent')?.checked;
    const files = document.getElementById('edit-feed-files')?.files;

    if (!postId || !title || !content) {
        showToast('warning', 'Vui lòng điền đầy đủ tiêu đề và nội dung.');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (catId) formData.append('category_id', catId);
    if (dept) formData.append('target_department', dept);
    formData.append('summary', summary || '');
    formData.append('is_pinned', isPinned ? '1' : '0');
    formData.append('is_urgent', isUrgent ? '1' : '0');
    if (feedDeletedAttachmentIds.length > 0) {
        formData.append('deleted_attachment_ids', feedDeletedAttachmentIds.join(','));
    }
    if (files) {
        for (let i = 0; i < files.length; i++) {
            formData.append('attachments', files[i]);
        }
    }

    const saveBtn = document.getElementById('btn-save-edit-feed');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Đang lưu...';
    }

    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type'];
        const res = await authFetch(`/api/collaboration/news/posts/${postId}/`, {
            method: 'PATCH',
            headers,
            body: formData
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', 'Đã cập nhật bản tin thành công!');
            closeEditNewsFeedModal();
            loadCompanyNews();
        } else {
            showToast('error', json.message || 'Không thể cập nhật bản tin.');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Lưu thay đổi';
            }
        }
    } catch (err) {
        console.error('Error updating news from feed:', err);
        showToast('error', 'Lỗi hệ thống khi cập nhật bản tin.');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Lưu thay đổi';
        }
    }
}

function openEditNewsFromModal() {
    if (currentViewingNewsId) {
        const id = currentViewingNewsId;
        closeNewsDetailModal();
        openEditNewsModalFromFeed(id);
    }
}

async function deleteNewsFromModal() {
    if (!currentViewingNewsId) return;
    deleteNewsFromFeed(currentViewingNewsId);
}

async function deleteNewsFromFeed(postId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa bản tin này không? Sau khi xóa, bài viết sẽ không còn hiển thị.')) return;
    try {
        const res = await authFetch(`/api/collaboration/news/posts/${postId}/`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', 'Đã xóa bản tin thành công.');
            closeNewsDetailModal();
            loadCompanyNews();
        } else {
            showToast('error', json.message || 'Không thể xóa bản tin.');
        }
    } catch (e) {
        console.error('Error deleting news:', e);
        showToast('error', 'Lỗi khi xóa bản tin.');
    }
}
