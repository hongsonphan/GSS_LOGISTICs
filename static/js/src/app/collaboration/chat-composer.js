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
            const currentUserId = window.CURRENT_USER?.id;
            users.forEach(u => {
                if (u.user_id !== currentUserId) {
                    const opt = document.createElement('option');
                    opt.value = u.user_id;
                    const dept = u.department_name ? u.department_name : 'Văn phòng';
                    opt.textContent = `${u.full_name} | ${dept}`;
                    select.appendChild(opt);
                }
            });
        }

        // Kích hoạt Universal Searchable Combobox có kính lúp dòng đầu & gõ search trực tiếp
        if (typeof makeSearchableSelect === 'function') {
            if (select._bimCombobox) {
                select._bimCombobox.sync();
            } else {
                makeSearchableSelect(select, { uppercase: false });
            }
            // Tự động focus sẵn sàng gõ từ khóa tìm kiếm
            setTimeout(() => {
                const wrapper = select.nextElementSibling;
                const mainInput = wrapper?.querySelector('.bim-combobox-main-input');
                if (mainInput) {
                    mainInput.focus();
                }
            }, 60);
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
            const dropdown = document.getElementById('chat-directory-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
            
            // Reset giá trị select & combobox
            const select = document.getElementById('chat-select-colleague');
            if (select) {
                select.value = '';
                if (select._bimCombobox) {
                    select._bimCombobox.sync();
                }
            }

            openChatRoom(json.data.id, json.data.name);
        } else {
            showToast('error', json.message || 'Không thể tạo cuộc trò chuyện.');
        }
    } catch (e) {
        console.error('Error starting direct chat:', e);
    }
}
