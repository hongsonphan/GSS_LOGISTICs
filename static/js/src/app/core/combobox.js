// =========================================================================
// UNIVERSAL SEARCHABLE DROPDOWN / COMBOBOX COMPONENT (BIM TMS STANDARD)
// Chuẩn Tìm Kiếm Dropdown: Dòng đầu tiên có kính lúp để tìm kiếm + Cho phép
// gõ trực tiếp từ khóa vào ô để lọc nhanh thời gian thực.
// =========================================================================

function removeVietnameseAccents(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

function closeAllSearchableComboboxes(exceptWrapper = null) {
    document.querySelectorAll('.bim-combobox-wrapper.bim-combobox-open').forEach(w => {
        if (!exceptWrapper || w !== exceptWrapper) {
            const targetId = w.getAttribute('data-target-id');
            const targetSelect = document.getElementById(targetId);
            if (targetSelect && targetSelect._bimCombobox) {
                targetSelect._bimCombobox.close();
            }
        }
    });
}

function makeSearchableSelect(selectEl, customOptions = {}) {
    if (!selectEl) return null;
    if (typeof selectEl === 'string') {
        selectEl = document.getElementById(selectEl);
    }
    if (!selectEl || selectEl.tagName !== 'SELECT') return null;

    // Nếu đã khởi tạo rồi, chỉ cần đồng bộ lại options và giá trị hiển thị
    if (selectEl._bimCombobox) {
        selectEl._bimCombobox.sync();
        return selectEl._bimCombobox;
    }

    const selectId = selectEl.id || ('bim-select-' + Math.random().toString(36).substr(2, 9));
    const isUppercase = selectEl.classList.contains('uppercase') || customOptions.uppercase;
    const baseHeight = selectEl.classList.contains('h-9') ? 'h-9' : (selectEl.classList.contains('h-9.5') ? 'h-9.5' : 'h-8.5');
    const baseFontSize = 'text-xs';
    const fontWeight = selectEl.classList.contains('font-black') ? 'font-black' : (selectEl.classList.contains('font-bold') ? 'font-bold' : 'font-semibold');
    const textColor = selectEl.classList.contains('text-teal-900') ? 'text-teal-900' : (selectEl.classList.contains('text-amber-900') ? 'text-amber-900' : (selectEl.classList.contains('text-emerald-900') ? 'text-emerald-900' : 'text-slate-800'));
    const rounded = selectEl.classList.contains('rounded-xl') ? 'rounded-xl' : 'rounded-lg';

    // 1. Tạo Wrapper Container
    const wrapper = document.createElement('div');
    wrapper.className = 'bim-combobox-wrapper relative w-full inline-block text-left';
    wrapper.setAttribute('data-target-id', selectId);

    // 2. Ô hiển thị & nhập chính (1 Ô TÌM KIẾM DUY NHẤT CÓ KÍNH LÚP & GÕ FREE-TEXT - KHÔNG BỊ DOUBLE)
    const triggerContainer = document.createElement('div');
    triggerContainer.className = 'relative flex items-center w-full';

    // Biểu tượng kính lúp cố định ở ô tìm kiếm chính
    const searchIcon = document.createElement('i');
    searchIcon.className = 'ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-teal-600 text-xs pointer-events-none z-10';

    const mainInput = document.createElement('input');
    mainInput.type = 'text';
    mainInput.autocomplete = 'off';
    mainInput.spellcheck = false;
    mainInput.className = `bim-combobox-main-input form-input ${baseHeight} ${baseFontSize} ${fontWeight} ${textColor} ${isUppercase ? 'uppercase' : ''} ${rounded} w-full py-1 bg-white border border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs transition-all cursor-text`;
    mainInput.style.paddingLeft = '38px';
    mainInput.style.paddingRight = '56px';
    mainInput.setAttribute('role', 'combobox');
    mainInput.setAttribute('aria-expanded', 'false');

    // Nút Clear (Xóa lựa chọn)
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.tabIndex = -1;
    clearBtn.title = 'Xóa lựa chọn';
    clearBtn.className = 'bim-combobox-clear absolute right-7 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 rounded-full transition-colors hidden cursor-pointer';
    clearBtn.innerHTML = '<i class="ph-bold ph-x text-[10px]"></i>';

    // Nút Mũi tên Caret
    const caretBtn = document.createElement('button');
    caretBtn.type = 'button';
    caretBtn.tabIndex = -1;
    caretBtn.title = 'Mở danh sách';
    caretBtn.className = 'bim-combobox-caret absolute right-0 inset-y-0 px-2 flex items-center justify-center text-slate-400 hover:text-teal-700 transition-colors cursor-pointer';
    caretBtn.innerHTML = '<i class="ph-bold ph-caret-down text-xs transition-transform duration-200"></i>';

    triggerContainer.appendChild(searchIcon);
    triggerContainer.appendChild(mainInput);
    triggerContainer.appendChild(clearBtn);
    triggerContainer.appendChild(caretBtn);

    // 3. Dropdown Menu (Chỉ chứa danh sách kết quả optionsList, loại bỏ hoàn toàn ô searchHeader thừa để không bị double)
    const dropdown = document.createElement('div');
    dropdown.className = 'bim-combobox-dropdown absolute left-0 right-0 mt-1 max-h-72 flex flex-col bg-white border border-teal-300 rounded-xl shadow-2xl z-[9999] hidden text-xs overflow-hidden';

    // Container chứa danh sách options có scroll
    const optionsList = document.createElement('div');
    optionsList.className = 'bim-combobox-options-list flex-1 overflow-y-auto divide-y divide-slate-50 py-1 max-h-60';

    dropdown.appendChild(optionsList);

    wrapper.appendChild(triggerContainer);
    wrapper.appendChild(dropdown);

    // Ẩn select gốc nhưng giữ nguyên trong DOM để bảo toàn 100% logic form
    selectEl.style.setProperty('display', 'none', 'important');
    selectEl.setAttribute('tabindex', '-1');
    selectEl.setAttribute('aria-hidden', 'true');
    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

    let currentHighlightedIndex = -1;
    let visibleOptions = [];

    // Nếu có label trỏ tới selectId, khi click label thì focus vào ô tìm kiếm
    const labels = document.querySelectorAll(`label[for="${selectId}"]`);
    labels.forEach(lbl => {
        lbl.addEventListener('click', (e) => {
            e.preventDefault();
            mainInput.focus();
            openDropdown();
        });
    });

    // Lấy danh sách options từ select gốc
    function getOptionsData() {
        const opts = [];
        for (let i = 0; i < selectEl.options.length; i++) {
            const opt = selectEl.options[i];
            opts.push({
                index: i,
                value: opt.value,
                text: opt.text,
                disabled: opt.disabled,
                isPlaceholder: opt.value === '',
                selected: opt.selected
            });
        }
        return opts;
    }

    // Cập nhật Placeholder & Text hiển thị ban đầu
    function syncDisplay() {
        const selectedOpt = selectEl.options[selectEl.selectedIndex];
        const placeholderOpt = selectEl.options[0];
        const placeholderText = (placeholderOpt && placeholderOpt.value === '') ? placeholderOpt.text : (customOptions.placeholder || selectEl.getAttribute('placeholder') || '-- Chọn --');
        mainInput.placeholder = placeholderText;

        if (selectedOpt && selectedOpt.value !== '') {
            mainInput.value = selectedOpt.text;
            clearBtn.classList.remove('hidden');
        } else {
            mainInput.value = '';
            clearBtn.classList.add('hidden');
        }

        // Đồng bộ lỗi viền đỏ nếu có
        if (selectEl.classList.contains('input-error')) {
            mainInput.classList.add('input-error');
        } else {
            mainInput.classList.remove('input-error');
        }
    }

    // Định vị thông minh: mở lên trên nếu gần đáy màn hình
    function updatePosition() {
        const rect = mainInput.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 260 && spaceAbove > spaceBelow) {
            dropdown.style.bottom = 'calc(100% + 4px)';
            dropdown.style.top = 'auto';
            dropdown.style.marginTop = '0';
            dropdown.style.marginBottom = '4px';
        } else {
            dropdown.style.top = 'calc(100% + 4px)';
            dropdown.style.bottom = 'auto';
            dropdown.style.marginTop = '4px';
            dropdown.style.marginBottom = '0';
        }
    }

    function openDropdown(query = '') {
        closeAllSearchableComboboxes(wrapper);
        updatePosition();
        renderOptions(query);
        dropdown.classList.remove('hidden');
        caretBtn.querySelector('i')?.classList.add('rotate-180', 'text-teal-700');
        wrapper.classList.add('bim-combobox-open');
        mainInput.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        dropdown.classList.add('hidden');
        caretBtn.querySelector('i')?.classList.remove('rotate-180', 'text-teal-700');
        wrapper.classList.remove('bim-combobox-open');
        mainInput.setAttribute('aria-expanded', 'false');
        currentHighlightedIndex = -1;
    }

    function isOpen() {
        return !dropdown.classList.contains('hidden');
    }

    function renderOptions(query = '') {
        const allOpts = getOptionsData();
        optionsList.innerHTML = '';
        currentHighlightedIndex = -1;

        const cleanQuery = removeVietnameseAccents(query);
        const terms = cleanQuery.split(/\s+/).filter(Boolean);

        visibleOptions = allOpts.filter(opt => {
            // Loại bỏ hoàn toàn dòng placeholder (-- Chọn ... --) khỏi danh sách options
            if (opt.isPlaceholder || !opt.value) return false;
            if (!terms.length) return true;
            const cleanText = removeVietnameseAccents(opt.text);
            const cleanVal = removeVietnameseAccents(opt.value);
            return terms.every(term => cleanText.includes(term) || cleanVal.includes(term));
        });

        if (visibleOptions.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'px-4 py-4 text-center text-slate-400 italic text-[11px] flex flex-col items-center gap-1.5';
            emptyEl.innerHTML = `<i class="ph-bold ph-magnifying-glass text-xl text-slate-300"></i><span>Không tìm thấy "<b>${escapeHtml(query)}</b>"</span><span class="text-[10px] text-slate-400">Thử gõ từ khóa khác hoặc nhấn ESC để đóng</span>`;
            optionsList.appendChild(emptyEl);
            return;
        }

        visibleOptions.forEach((opt, idx) => {
            const itemEl = document.createElement('div');
            const isSelected = (selectEl.value === opt.value && opt.value !== '');
            itemEl.className = `bim-combobox-item px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                isSelected ? 'bg-teal-50 text-teal-900 font-bold border-l-3 border-teal-600' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`;
            itemEl.setAttribute('data-index', idx);
            itemEl.setAttribute('data-value', opt.value);

            // Trình bày định dạng phẳng không gán badge: [Tên] | [Phòng Ban] hoặc Text chuẩn
            let mainLabel = opt.text;
            let tagBadge = '';
            if (customOptions.showBadge && !opt.isPlaceholder) {
                const matchTag = opt.text.match(/^(.*?)\s*(\([^\)]+\)|\[[^\]]+\])$/);
                if (matchTag) {
                    mainLabel = matchTag[1].trim();
                    const tagContent = matchTag[2].slice(1, -1).trim();
                    tagBadge = `<span class="text-[9.5px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80 ml-2 shrink-0">${escapeHtml(tagContent)}</span>`;
                }
            }

            let contentHtml = '';
            if (mainLabel.includes(' | ') && !opt.isPlaceholder) {
                const parts = mainLabel.split(' | ');
                let leftPart = escapeHtml(parts[0].trim());
                let rightPart = escapeHtml(parts.slice(1).join(' | ').trim());

                if (terms.length > 0) {
                    terms.forEach(term => {
                        if (!term) return;
                        const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(${safeTerm})`, 'gi');
                        leftPart = leftPart.replace(regex, '<mark class="bg-amber-100 text-teal-950 font-bold px-0.5 rounded">$1</mark>');
                        rightPart = rightPart.replace(regex, '<mark class="bg-amber-100 text-teal-950 font-bold px-0.5 rounded">$1</mark>');
                    });
                }
                contentHtml = `<span class="font-medium text-slate-800">${leftPart}</span><span class="text-slate-300 font-light mx-1.5">|</span><span class="text-slate-500 font-normal text-xs">${rightPart}</span>`;
            } else {
                let highlightedLabel = escapeHtml(mainLabel);
                if (terms.length > 0 && !opt.isPlaceholder) {
                    terms.forEach(term => {
                        if (!term) return;
                        const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(${safeTerm})`, 'gi');
                        highlightedLabel = highlightedLabel.replace(regex, '<mark class="bg-amber-100 text-teal-950 font-bold px-0.5 rounded">$1</mark>');
                    });
                }
                contentHtml = `<span class="truncate ${opt.isPlaceholder ? 'italic text-slate-400 font-normal' : ''}">${highlightedLabel}</span>`;
            }

            itemEl.innerHTML = `
                <div class="flex items-center justify-between w-full min-w-0 pr-1">
                    <div class="min-w-0 truncate">${contentHtml}</div>
                    ${tagBadge}
                </div>
                ${isSelected ? '<i class="ph-bold ph-check text-teal-600 text-xs shrink-0 ml-1"></i>' : ''}
            `;

            itemEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectOption(opt);
            });

            optionsList.appendChild(itemEl);
        });
    }

    function selectOption(opt) {
        selectEl.value = opt.value;
        syncDisplay();
        closeDropdown();
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof selectEl.onchange === 'function') {
            selectEl.onchange();
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function updateHighlight() {
        const items = optionsList.querySelectorAll('.bim-combobox-item');
        items.forEach((it, idx) => {
            if (idx === currentHighlightedIndex) {
                it.classList.add('bg-teal-100', 'text-teal-950');
                it.scrollIntoView({ block: 'nearest' });
            } else {
                it.classList.remove('bg-teal-100', 'text-teal-950');
            }
        });
    }

    // --- SỰ KIỆN TƯƠNG TÁC ---

    // Click hoặc Focus vào ô chính -> Mở dropdown
    mainInput.addEventListener('click', () => {
        if (!isOpen()) {
            openDropdown(mainInput.value.trim());
        }
    });

    mainInput.addEventListener('focus', () => {
        if (!isOpen()) {
            const selectedOpt = selectEl.options[selectEl.selectedIndex];
            if (!selectedOpt || !selectedOpt.value) {
                openDropdown('');
            } else {
                openDropdown(mainInput.value.trim());
            }
        }
    });

    // Cho phép gõ free-text trực tiếp trong ô chính ("trong ô đó luôn")
    mainInput.addEventListener('input', () => {
        if (!isOpen()) {
            openDropdown(mainInput.value);
        } else {
            renderOptions(mainInput.value);
        }
        clearBtn.classList.toggle('hidden', !mainInput.value);
    });

    // Phím điều hướng từ ô chính
    const handleKeyNav = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen()) {
                openDropdown(mainInput.value);
                return;
            }
            if (visibleOptions.length > 0) {
                currentHighlightedIndex = (currentHighlightedIndex + 1) % visibleOptions.length;
                updateHighlight();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen()) {
                openDropdown(mainInput.value);
                return;
            }
            if (visibleOptions.length > 0) {
                currentHighlightedIndex = (currentHighlightedIndex - 1 + visibleOptions.length) % visibleOptions.length;
                updateHighlight();
            }
        } else if (e.key === 'Enter') {
            if (!isOpen()) return;
            e.preventDefault();
            e.stopPropagation();
            if (currentHighlightedIndex >= 0 && visibleOptions[currentHighlightedIndex]) {
                selectOption(visibleOptions[currentHighlightedIndex]);
            } else if (visibleOptions.length === 1) {
                selectOption(visibleOptions[0]);
            } else if (visibleOptions.length > 1) {
                const cleanInp = removeVietnameseAccents(mainInput.value);
                const exactMatch = visibleOptions.find(o => removeVietnameseAccents(o.text) === cleanInp || removeVietnameseAccents(o.value) === cleanInp);
                if (exactMatch) {
                    selectOption(exactMatch);
                } else {
                    selectOption(visibleOptions[0]);
                }
            }
        } else if (e.key === 'Escape' || e.key === 'Tab') {
            if (isOpen()) {
                closeDropdown();
                syncDisplay();
            }
        }
    };

    mainInput.addEventListener('keydown', handleKeyNav);

    // Click nút Mũi tên Caret
    caretBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen()) {
            closeDropdown();
        } else {
            mainInput.focus();
            openDropdown();
        }
    });

    // Click nút Clear (X) ở ô chính
    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectEl.value = '';
        mainInput.value = '';
        clearBtn.classList.add('hidden');
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof selectEl.onchange === 'function') {
            selectEl.onchange();
        }
        mainInput.focus();
        openDropdown('');
    });

    // Click ra ngoài -> Đóng dropdown và khôi phục text hợp lệ
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            if (isOpen()) {
                closeDropdown();
                syncDisplay();
            }
        }
    });

    // Đồng bộ khi select gốc thay đổi từ bên ngoài (Code JS)
    selectEl.addEventListener('change', () => {
        syncDisplay();
    });

    // Forward focus từ select gốc sang mainInput
    selectEl.focus = () => {
        mainInput.focus();
    };

    // Theo dõi class input-error trên selectEl
    if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
            if (selectEl.classList.contains('input-error')) {
                mainInput.classList.add('input-error');
            } else {
                mainInput.classList.remove('input-error');
            }
        });
        observer.observe(selectEl, { attributes: true, attributeFilter: ['class'] });
    }

    const api = {
        wrapper,
        mainInput,
        selectEl,
        open: openDropdown,
        close: closeDropdown,
        sync: () => {
            syncDisplay();
            if (isOpen()) renderOptions(mainInput.value.trim());
        },
        destroy: () => {
            wrapper.remove();
            selectEl.style.display = '';
            delete selectEl._bimCombobox;
        }
    };

    selectEl._bimCombobox = api;
    syncDisplay();
    return api;
}

function initAllSearchableComboboxes(container = document) {
    if (!container) return;
    const targetIds = [
        'inp-customer', 'inp-pickup', 'inp-warehouse', 'inp-dropoff', 'inp-subcontractor',
        'inp-driver', 'inp-vehicle', 'inp-trailer', 'inp-driver-leg1', 'inp-dropoff-driver',
        'inp-vehicle-leg1', 'inp-dropoff-vehicle',
        'edit-inp-customer', 'edit-inp-driver', 'edit-inp-vehicle', 'edit-inp-trailer',
        'booking-customer', 'booking-pickup', 'booking-delivery', 'booking-dropoff',
        'fullpage-booking-customer', 'fullpage-booking-pickup', 'fullpage-booking-delivery', 'fullpage-booking-dropoff',
        'quote-customer', 'fullpage-quote-customer', 'quote-route-preset',
        'adv-inp-trip', 'adv-inp-driver', 'adv-inp-fund'
    ];
    targetIds.forEach(id => {
        const els = container.querySelectorAll('#' + id);
        els.forEach(el => {
            if (el && el.tagName === 'SELECT') {
                makeSearchableSelect(el);
            }
        });
    });
    // Khởi tạo thêm các select có data-searchable="true"
    container.querySelectorAll('select[data-searchable="true"]').forEach(el => {
        makeSearchableSelect(el);
    });
}


function cleanupTransportTypeOptions(selectEl) {
    if (!selectEl || !selectEl.options) return;
    for (let i = selectEl.options.length - 1; i >= 0; i--) {
        const optVal = (selectEl.options[i].value || '').trim();
        const optTxt = (selectEl.options[i].text || '').trim();
        const vUpper = optVal.toUpperCase();
        const tUpper = optTxt.toUpperCase();
        if (vUpper === 'HÀNG NHẬP' || vUpper === 'HÀNG XUẤT' || vUpper === 'HANG NHAP' || vUpper === 'HANG XUAT' ||
            tUpper === 'HÀNG NHẬP' || tUpper === 'HÀNG XUẤT' || tUpper === 'HANG NHAP' || tUpper === 'HANG XUAT') {
            selectEl.remove(i);
        }
    }
    if (selectEl._bimCombobox && typeof selectEl._bimCombobox.sync === 'function') {
        selectEl._bimCombobox.sync();
    }
}

function setSelectValueCaseInsensitive(selectEl, value, label = null) {
    if (!selectEl || value === undefined || value === null) return;
    const strVal = String(value).trim();
    if (!strVal) {
        selectEl.value = '';
        if (selectEl._bimCombobox) selectEl._bimCombobox.sync();
        return;
    }

    // Đặc thù loại hình vận chuyển: luôn giữ đúng 3 dòng cũ (Nhập, Xuất, Nội địa), tuyệt đối không tự thêm
    const isTransportTypeSelect = selectEl.id === 'inp-type' || selectEl.id === 'edit-inp-type' || selectEl.dataset.noAutoAdd === 'true';
    if (isTransportTypeSelect) {
        cleanupTransportTypeOptions(selectEl);

        const upper = strVal.toUpperCase();
        let targetCanonical = 'Xuất';
        if (upper.includes('NHẬP') || upper.includes('IMPORT') || upper.includes('NHAP')) {
            targetCanonical = 'Nhập';
        } else if (upper.includes('XUẤT') || upper.includes('EXPORT') || upper.includes('XUAT')) {
            targetCanonical = 'Xuất';
        } else if (upper.includes('NỘI ĐỊA') || upper.includes('DOMESTIC') || upper.includes('NOI DIA')) {
            targetCanonical = 'Nội địa';
        } else {
            targetCanonical = strVal;
        }

        for (let i = 0; i < selectEl.options.length; i++) {
            const optVal = selectEl.options[i].value.toLowerCase();
            const optTxt = selectEl.options[i].text.toLowerCase();
            const targetLower = targetCanonical.toLowerCase();
            if (optVal === targetLower || optTxt.includes(targetLower)) {
                selectEl.selectedIndex = i;
                if (selectEl._bimCombobox) selectEl._bimCombobox.sync();
                return;
            }
        }
        // Tuyệt đối không tự thêm option mới vào select loại hình vận chuyển
        return;
    }

    for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value.toLowerCase() === strVal.toLowerCase() ||
            selectEl.options[i].text.toLowerCase() === strVal.toLowerCase()) {
            selectEl.selectedIndex = i;
            if (selectEl._bimCombobox) selectEl._bimCombobox.sync();
            return;
        }
    }

    // Không tự thêm nếu select có data-no-auto-add="true" hoặc class no-auto-add
    if (selectEl.dataset.noAutoAdd === 'true' || selectEl.classList.contains('no-auto-add')) {
        return;
    }

    const opt = document.createElement('option');
    opt.value = strVal;
    opt.innerText = label || strVal;
    selectEl.appendChild(opt);
    selectEl.value = strVal;
    if (selectEl._bimCombobox) selectEl._bimCombobox.sync();
}

// Tự động dọn sạch các option "HÀNG NHẬP", "HÀNG XUẤT" thừa trên toàn trang khi tải DOM
if (typeof document !== 'undefined') {
    const runCleanupAllTransportSelects = () => {
        ['inp-type', 'edit-inp-type'].forEach(id => {
            const el = document.getElementById(id);
            if (el) cleanupTransportTypeOptions(el);
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runCleanupAllTransportSelects);
    } else {
        runCleanupAllTransportSelects();
    }
}
