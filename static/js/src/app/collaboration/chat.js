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

// ensureOfficeDirectoryLoaded defined above

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
