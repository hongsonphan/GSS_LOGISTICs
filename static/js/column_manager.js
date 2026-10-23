/**
 * =========================================================================================
 * BIM LOGISTICS — UNIVERSAL TABLE COLUMN MANAGER (QUẢN LÝ CỘT BẢNG DỮ LIỆU TOÀN DIỆN)
 * =========================================================================================
 * Chuẩn mực UI/UX SaaS Quốc Tế (Notion / Salesforce / SAP Data Management Standard)
 * - Tùy biến Ẩn / Hiện cột (Column Visibility Toggle)
 * - Tùy biến Thứ tự cột (Column Reordering via Drag & Drop / Up & Down Arrows)
 * - Tự động ghi nhớ cấu hình vào localStorage theo từng bảng và người dùng
 * - Tự động đồng bộ ngay lập tức khi bảng tải lại dữ liệu mới (MutationObserver)
 * - Nút Khôi Phục Mặc Định (1-Click Reset to Default)
 * =========================================================================================
 */

(function(window, document) {
    'use strict';

    const BimTableColumnManager = {
        instances: {},
        activeTableId: null,

        /**
         * Đăng ký một bảng vào hệ thống quản lý cột
         */
        register: function(tableId, options) {
            if (!tableId) return null;
            const table = document.getElementById(tableId);
            if (!table) return null;

            if (this.instances[tableId]) {
                return this.instances[tableId];
            }

            const mgr = new TableColumnInstance(table, options || {});
            this.instances[tableId] = mgr;
            return mgr;
        },

        /**
         * Mở Modal Tùy chỉnh cột cho bảng cụ thể
         */
        open: function(tableId) {
            let mgr = this.instances[tableId];
            if (!mgr) {
                mgr = this.register(tableId);
            }
            if (!mgr) {
                console.warn(`[BimColumnManager] Không tìm thấy bảng #${tableId}`);
                return;
            }

            // Đồng bộ lại thead mới nhất từ DOM nếu bảng có dynamic thead (như md-main-table)
            if (typeof mgr.refreshColumnsFromDOM === 'function') {
                mgr.refreshColumnsFromDOM();
            }

            this.activeTableId = tableId;
            mgr.buildModalUI();

            const modal = document.getElementById('bim-column-customizer-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },

        /**
         * Đóng Modal Tùy chỉnh cột
         */
        close: function() {
            const modal = document.getElementById('bim-column-customizer-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            this.activeTableId = null;
        },

        /**
         * Áp dụng cấu hình cho bảng hiện tại hoặc tất cả bảng
         */
        apply: function(tableId) {
            if (tableId && this.instances[tableId]) {
                this.instances[tableId].apply();
            } else {
                Object.values(this.instances).forEach(function(inst) {
                    inst.apply();
                });
            }
        },

        /**
         * Tự động quét và đăng ký tất cả bảng có id hoặc có class .erp-table
         */
        autoInit: function() {
            const tables = document.querySelectorAll('table[id]');
            tables.forEach(function(tbl) {
                if (tbl.querySelector('thead th') && !tbl.hasAttribute('data-no-col-manager')) {
                    BimTableColumnManager.register(tbl.id);
                }
                BimTableSorter.initTable(tbl);
                if (window.BimTableResizable) {
                    BimTableResizable.initTable(tbl);
                }
            });
        }
    };

    /**
     * Class quản lý cột cho từng bảng riêng biệt
     */
    function TableColumnInstance(table, options) {
        this.table = table;
        this.tableId = table.id;
        this.options = Object.assign({
            tableName: table.getAttribute('data-table-title') || this.detectTableName(),
            storagePrefix: 'bim_table_cols_',
            lockedKeys: ['actions', 'thao_tac', 'action', 'stt', 'check', 'select']
        }, options);

        this.storageKey = this.getStorageKey();
        this.tableName = this.getTableName();
        this.columns = [];         // Cấu hình hiện tại [{ key, label, visible, locked, origIdx }]
        this.defaultColumns = [];  // Cấu hình mặc định ban đầu
        this.isApplying = false;

        this.init();
    }

    TableColumnInstance.prototype.detectTableName = function() {
        // Tìm tiêu đề bảng từ thẻ h2, h3, h4 gần nhất
        const container = this.table.closest('.bg-white') || this.table.parentElement;
        if (container) {
            const heading = container.querySelector('h2, h3, h4, .font-heading');
            if (heading) {
                return heading.textContent.trim().replace(/\s+/g, ' ');
            }
        }
        return 'Bảng Dữ Liệu';
    };

    TableColumnInstance.prototype.getStorageKey = function() {
        let key = this.options.storagePrefix + this.tableId;
        if (this.tableId === 'md-main-table') {
            const subtab = (typeof window.currentMasterDataTab !== 'undefined' ? window.currentMasterDataTab : (this.table.getAttribute('data-subtab') || '')).trim();
            if (subtab) {
                key += '_' + subtab;
            }
        }
        return key;
    };

    TableColumnInstance.prototype.getTableName = function() {
        let name = this.options.tableName || this.detectTableName();
        if (this.tableId === 'md-main-table' && typeof window.currentMasterDataTab !== 'undefined') {
            const tabNames = {
                'company': 'Khai Báo Doanh Nghiệp',
                'roles_permissions': 'Vai Trò & Quyền Hạn',
                'opening_balance': 'Số Dư Đầu Kỳ Kế Toán',
                'driver_tariffs': 'Lương Chuyến Tài Xế',
                'allowances': 'Phụ Cấp & Phí Kiểm Hóa',
                'locations': 'Cảng & Kho Bãi',
                'tariffs': 'Biểu Cước Khách Hàng',
                'customers': 'Danh Mục Khách Hàng',
                'expenses': 'Khoản Mục Chi Phí',
                'containers': 'Quy Cách Cont & Xe',
                'vehicles': 'Đầu Kéo & Xe Tải',
                'trailers': 'Rơ-Moóc Container',
                'shipping_lines': 'Hãng Tàu Biển',
                'subcontractors': 'Đội Xe Thầu Phụ'
            };
            const subName = tabNames[window.currentMasterDataTab];
            if (subName) {
                name = `Hệ Thống Danh Mục (${subName})`;
            }
        }
        return name;
    };

    TableColumnInstance.prototype.init = function() {
        this.refreshColumnsFromDOM();

        // Lắng nghe thay đổi của tbody để tự động áp dụng khi có dữ liệu mới render
        this.setupMutationObserver();
    };

    TableColumnInstance.prototype.refreshColumnsFromDOM = function() {
        this.storageKey = this.getStorageKey();
        this.tableName = this.getTableName();

        const thead = this.table.querySelector('thead');
        if (!thead) return;

        const ths = thead.querySelectorAll('tr:first-child > th');
        if (!ths || ths.length === 0) return;

        this.defaultColumns = [];
        const self = this;

        ths.forEach(function(th, idx) {
            let key = th.getAttribute('data-col-key');
            if (!key) {
                // Tạo key từ id hoặc text nội dung
                const rawText = th.innerText || th.textContent || '';
                key = th.id ? th.id.replace(/^th[-_]/, '') : self.slugify(rawText) || ('col_' + idx);
                th.setAttribute('data-col-key', key);
            }

            let label = th.getAttribute('data-col-name');
            if (!label) {
                // Lấy text hiển thị, loại bỏ text icon nếu có
                const clone = th.cloneNode(true);
                clone.querySelectorAll('i, svg, button, input, .sort-icon').forEach(function(el) {
                    el.remove();
                });
                label = clone.textContent.trim().replace(/\s+/g, ' ') || ('Cột ' + (idx + 1));
                th.setAttribute('data-col-name', label);
            }

            const isLocked = th.getAttribute('data-col-locked') === 'true' || 
                             self.options.lockedKeys.includes(key.toLowerCase());

            const colObj = {
                key: key,
                label: label,
                visible: true,
                locked: isLocked,
                origIdx: idx
            };

            self.defaultColumns.push(colObj);
        });

        // Đọc cấu hình từ localStorage nếu đã lưu
        this.loadSavedConfig();

        // Áp dụng cấu hình ngay lập tức lên DOM
        this.apply();
    };

    TableColumnInstance.prototype.slugify = function(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    };

    TableColumnInstance.prototype.loadSavedConfig = function() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                const saved = JSON.parse(raw);
                if (Array.isArray(saved) && saved.length > 0) {
                    // Ghép nối cấu hình đã lưu với các cột mặc định (đề phòng backend thêm cột mới)
                    const merged = [];
                    const defaultMap = {};
                    this.defaultColumns.forEach(function(c) { defaultMap[c.key] = c; });

                    saved.forEach(function(s) {
                        if (defaultMap[s.key]) {
                            merged.push({
                                key: s.key,
                                label: defaultMap[s.key].label,
                                visible: s.visible !== false,
                                locked: defaultMap[s.key].locked,
                                origIdx: defaultMap[s.key].origIdx
                            });
                            delete defaultMap[s.key];
                        }
                    });

                    // Thêm bất kỳ cột mới nào chưa có trong cache theo thứ tự origIdx
                    const remainingCols = Object.values(defaultMap).sort(function(a, b) {
                        return a.origIdx - b.origIdx;
                    });
                    remainingCols.forEach(function(c) {
                        if (c.key === 'stt' || c.origIdx === 0) {
                            merged.unshift(Object.assign({}, c));
                        } else {
                            const targetIdx = Math.min(c.origIdx, merged.length);
                            merged.splice(targetIdx, 0, Object.assign({}, c));
                        }
                    });

                    // Đảm bảo cột STT luôn luôn ghim ở vị trí đầu tiên (index 0)
                    const sttIdx = merged.findIndex(function(c) { return c.key === 'stt' || (c.locked && c.origIdx === 0); });
                    if (sttIdx > 0) {
                        const sttCol = merged.splice(sttIdx, 1)[0];
                        merged.unshift(sttCol);
                    }

                    // Đảm bảo không bao giờ toàn bộ các cột bị ẩn do cache cũ
                    const visibleCols = merged.filter(function(c) { return c.visible; });
                    if (visibleCols.length === 0) {
                        merged.forEach(function(c) { c.visible = true; });
                    }

                    this.columns = merged;
                    return;
                }
            }
        } catch (e) {
            console.warn('[BimColumnManager] Lỗi đọc localStorage:', e);
        }

        // Mặc định sao chép từ defaultColumns
        this.columns = this.defaultColumns.map(function(c) {
            return Object.assign({}, c);
        });
    };

    TableColumnInstance.prototype.saveConfig = function() {
        try {
            const toSave = this.columns.map(function(c) {
                return {
                    key: c.key,
                    visible: c.visible,
                    origIdx: c.origIdx
                };
            });
            localStorage.setItem(this.storageKey, JSON.stringify(toSave));
        } catch (e) {
            console.warn('[BimColumnManager] Lỗi ghi localStorage:', e);
        }
    };

    TableColumnInstance.prototype.resetToDefault = function() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem('bim_col_widths_' + this.tableId);
        } catch (e) {}

        this.columns = this.defaultColumns.map(function(c) {
            return Object.assign({}, c);
        });

        const ths = this.table.querySelectorAll('thead th');
        ths.forEach(function(th) {
            th.style.width = '';
            th.style.minWidth = '';
            th.style.maxWidth = '';
        });

        const tds = this.table.querySelectorAll('tbody td');
        tds.forEach(function(td) {
            td.style.width = '';
            td.style.minWidth = '';
            td.style.maxWidth = '';
        });

        this.apply();
        this.buildModalUI();
        if (window.showToast) {
            window.showToast('info', 'Đã khôi phục thứ tự và trạng thái cột mặc định', 'Khôi phục cột');
        }
    };

    /**
     * Áp dụng thứ tự và trạng thái ẩn/hiện cột trực tiếp vào cây DOM của bảng
     */
    TableColumnInstance.prototype.apply = function() {
        if (this.isApplying) return;
        this.isApplying = true;

        try {
            const thead = this.table.querySelector('thead');
            const tbody = this.table.querySelector('tbody');
            if (!thead) return;

            const colMap = {};
            this.columns.forEach(function(c, i) {
                colMap[c.key] = { col: c, order: i };
            });

            // 1. Đồng bộ thead th elements
            const trHead = thead.querySelector('tr:first-child');
            if (trHead) {
                const thElements = Array.from(trHead.children);
                
                // Gán key cho từng th nếu chưa có
                thElements.forEach(function(th, idx) {
                    let k = th.getAttribute('data-col-key');
                    if (!k && idx < this.defaultColumns.length) {
                        k = this.defaultColumns[idx].key;
                        th.setAttribute('data-col-key', k);
                    }
                }, this);

                // Sắp xếp lại th theo thứ tự columns
                const sortedThs = [];
                this.columns.forEach(function(c) {
                    const found = thElements.find(function(th) {
                        return th.getAttribute('data-col-key') === c.key;
                    });
                    if (found) {
                        found.style.display = c.visible ? '' : 'none';
                        sortedThs.push(found);
                    }
                });

                // Gắn lại vào thead tr
                sortedThs.forEach(function(th) {
                    trHead.appendChild(th);
                });
            }

            // 2. Đồng bộ tbody td elements
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                const defaultCols = this.defaultColumns;
                const columns = this.columns;

                rows.forEach(function(tr) {
                    // Bỏ qua các hàng thông báo hoặc hàng colspan
                    if (tr.classList.contains('no-col-reorder') || tr.children.length <= 1) {
                        return;
                    }

                    const tds = Array.from(tr.children);
                    if (tds.length === defaultCols.length) {
                        // Gán data-col-key cho td dựa theo vị trí gốc ban đầu
                        tds.forEach(function(td, idx) {
                            if (!td.getAttribute('data-col-key')) {
                                td.setAttribute('data-col-key', defaultCols[idx].key);
                            }
                        });
                    }

                    // Sắp xếp lại td theo thứ tự columns hiện tại
                    const sortedTds = [];
                    columns.forEach(function(c) {
                        const found = tds.find(function(td) {
                            return td.getAttribute('data-col-key') === c.key;
                        });
                        if (found) {
                            found.style.display = c.visible ? '' : 'none';
                            sortedTds.push(found);
                        }
                    });

                    // Gắn lại vào tr
                    if (sortedTds.length > 0) {
                        sortedTds.forEach(function(td) {
                            tr.appendChild(td);
                        });
                    }
                });

                if (window.BimTableResizable && typeof window.BimTableResizable.applyWidthsToBody === 'function') {
                    window.BimTableResizable.applyWidthsToBody(this.table, window.BimTableResizable.loadSavedWidths(this.tableId));
                }
            }

            // 3. Đồng bộ tfoot td elements đảm bảo các ô tổng cộng luôn khớp 100% cột
            const tfoot = this.table.querySelector('tfoot');
            if (tfoot) {
                const footRows = tfoot.querySelectorAll('tr');
                const defaultCols = this.defaultColumns;
                const columns = this.columns;

                footRows.forEach(function(tr) {
                    if (tr.classList.contains('no-col-reorder')) return;
                    const tds = Array.from(tr.children);
                    if (tds.length === defaultCols.length) {
                        tds.forEach(function(td, idx) {
                            if (!td.getAttribute('data-col-key')) {
                                td.setAttribute('data-col-key', defaultCols[idx].key);
                            }
                        });
                    }

                    const sortedTds = [];
                    columns.forEach(function(c) {
                        const found = tds.find(function(td) {
                            return td.getAttribute('data-col-key') === c.key;
                        });
                        if (found) {
                            found.style.display = c.visible ? '' : 'none';
                            sortedTds.push(found);
                        }
                    });

                    if (sortedTds.length > 0) {
                        sortedTds.forEach(function(td) {
                            tr.appendChild(td);
                        });
                    }
                });
            }
        } catch (err) {
            console.error('[BimColumnManager] Lỗi áp dụng cấu hình cột:', err);
        } finally {
            this.isApplying = false;
        }
    };

    /**
     * Thiết lập MutationObserver để tự động định dạng lại khi tbody được render lại
     */
    TableColumnInstance.prototype.setupMutationObserver = function() {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;

        const self = this;
        let debounceTimer = null;

        const observer = new MutationObserver(function(mutations) {
            if (self.isApplying) return;
            
            // Kiểm tra xem có node con mới được thêm vào không
            let hasAddedNodes = false;
            mutations.forEach(function(m) {
                if (m.addedNodes && m.addedNodes.length > 0) {
                    hasAddedNodes = true;
                }
            });

            if (hasAddedNodes) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function() {
                    self.apply();
                }, 10);
            }
        });

        observer.observe(tbody, {
            childList: true,
            subtree: false
        });
    };

    /**
     * Dựng giao diện Modal Tùy chỉnh cột
     */
    TableColumnInstance.prototype.buildModalUI = function() {
        const titleEl = document.getElementById('bim-col-modal-title');
        const listEl = document.getElementById('bim-col-modal-list');
        const countEl = document.getElementById('bim-col-modal-visible-count');

        if (titleEl) {
            titleEl.textContent = this.tableName;
        }

        if (!listEl) return;
        listEl.innerHTML = '';

        const self = this;
        let visibleCount = 0;

        this.columns.forEach(function(col, idx) {
            if (col.visible) visibleCount++;

            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all select-none group';
            item.draggable = true;
            item.dataset.index = idx;
            item.dataset.key = col.key;

            const isFirst = (idx === 0);
            const isLast = (idx === self.columns.length - 1);

            item.innerHTML = `
                <div class="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                    <!-- Drag Handle -->
                    <span class="cursor-grab active:cursor-grabbing text-slate-400 hover:text-teal-700 p-1 rounded hover:bg-slate-200/60 transition-colors" title="Kéo thả để đổi thứ tự">
                        <i class="ph-bold ph-dots-six-vertical text-base"></i>
                    </span>
                    
                    <!-- Checkbox Ẩn / Hiện -->
                    <label class="flex items-center gap-2 cursor-pointer truncate">
                        <input type="checkbox" 
                            class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 transition-all cursor-pointer ${col.locked ? 'opacity-60 cursor-not-allowed' : ''}" 
                            ${col.visible ? 'checked' : ''} 
                            ${col.locked ? 'disabled' : ''}
                            data-col-toggle="${col.key}">
                        <span class="text-xs font-bold text-slate-800 font-heading truncate ${!col.visible ? 'line-through text-slate-400' : ''}">
                            ${col.label}
                        </span>
                    </label>

                    ${col.locked ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">Cố định</span>' : ''}
                </div>

                <!-- Điều khiển Mũi tên Lên / Xuống -->
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" 
                        class="p-1 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors" 
                        title="Di chuyển lên trước"
                        ${isFirst ? 'disabled' : ''}
                        onclick="window.BimColumnManager_moveCol('${self.tableId}', ${idx}, -1)">
                        <i class="ph-bold ph-caret-up text-xs"></i>
                    </button>
                    <button type="button" 
                        class="p-1 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors" 
                        title="Di chuyển xuống sau"
                        ${isLast ? 'disabled' : ''}
                        onclick="window.BimColumnManager_moveCol('${self.tableId}', ${idx}, 1)">
                        <i class="ph-bold ph-caret-down text-xs"></i>
                    </button>
                </div>
            `;

            // Lắng nghe sự kiện Checkbox
            const checkbox = item.querySelector(`[data-col-toggle="${col.key}"]`);
            if (checkbox && !col.locked) {
                checkbox.addEventListener('change', function(e) {
                    col.visible = e.target.checked;
                    self.saveConfig();
                    self.apply();
                    self.buildModalUI();
                });
            }

            // Kéo thả HTML5 Drag & Drop
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', idx);
                item.classList.add('opacity-40', 'border-teal-400');
            });

            item.addEventListener('dragend', function() {
                item.classList.remove('opacity-40', 'border-teal-400');
            });

            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                item.classList.add('bg-teal-50/70', 'border-teal-500');
            });

            item.addEventListener('dragleave', function() {
                item.classList.remove('bg-teal-50/70', 'border-teal-500');
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                item.classList.remove('bg-teal-50/70', 'border-teal-500');
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const toIdx = idx;
                if (!isNaN(fromIdx) && fromIdx !== toIdx) {
                    const movedItem = self.columns.splice(fromIdx, 1)[0];
                    self.columns.splice(toIdx, 0, movedItem);
                    self.saveConfig();
                    self.apply();
                    self.buildModalUI();
                }
            });

            listEl.appendChild(item);
        });

        if (countEl) {
            countEl.textContent = `${visibleCount}/${this.columns.length}`;
        }
    };

    /**
     * Di chuyển vị trí cột lên/xuống
     */
    TableColumnInstance.prototype.moveColumn = function(fromIndex, delta) {
        const toIndex = fromIndex + delta;
        if (toIndex < 0 || toIndex >= this.columns.length) return;

        const moved = this.columns.splice(fromIndex, 1)[0];
        this.columns.splice(toIndex, 0, moved);

        this.saveConfig();
        this.apply();
        this.buildModalUI();
    };

    // Helper toàn cục cho các hàm inline onclick
    window.BimColumnManager_moveCol = function(tableId, fromIdx, delta) {
        const mgr = BimTableColumnManager.instances[tableId];
        if (mgr) {
            mgr.moveColumn(fromIdx, delta);
        }
    };

    window.BimColumnManager_reset = function() {
        if (BimTableColumnManager.activeTableId) {
            const mgr = BimTableColumnManager.instances[BimTableColumnManager.activeTableId];
            if (mgr) {
                mgr.resetToDefault();
            }
        }
    };

    window.openColumnCustomizer = function(tableId) {
        BimTableColumnManager.open(tableId);
    };

    window.closeColumnCustomizer = function() {
        BimTableColumnManager.close();
    };


    // =========================================================================
    // BIM LOGISTICS — UNIVERSAL CLIENT-SIDE TABLE SORTER (SẮP XẾP BẢNG TOÀN CỤC)
    // =========================================================================
    const BimTableSorter = {
        sortStates: {},

        initTable: function(table) {
            if (!table) return;
            const thead = table.querySelector('thead');
            if (!thead) return;

            const headers = thead.querySelectorAll('th');
            headers.forEach((th, idx) => {
                const text = th.innerText.trim().toLowerCase();
                if (th.hasAttribute('data-no-sort') || text === 'thao tác' || text === '' || th.querySelector('input[type="checkbox"]')) {
                    return;
                }

                if (!th.classList.contains('cursor-pointer')) {
                    th.classList.add('cursor-pointer', 'select-none', 'hover:bg-slate-100', 'transition-colors');
                }

                let icon = th.querySelector('.sort-indicator-icon');
                if (!icon && !th.querySelector('i[class*="ph-arrows"], i[class*="ph-caret"]')) {
                    const iconEl = document.createElement('i');
                    iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs ml-1 inline-block sort-indicator-icon';
                    th.appendChild(iconEl);
                }

                if (!th.hasAttribute('data-sort-bound')) {
                    th.setAttribute('data-sort-bound', 'true');
                    th.addEventListener('click', function(e) {
                        if (e.target.closest('button, a, input, select')) return;
                        if (th.hasAttribute('onclick') && th.getAttribute('onclick').includes('toggle')) {
                            return;
                        }
                        BimTableSorter.toggleSort(table, idx);
                    });
                }
            });
        },

        toggleSort: function(table, colIdx) {
            const tableId = table.id || ('table_' + Math.random().toString(36).substr(2, 9));
            const curState = this.sortStates[tableId] || { colIndex: -1, isAsc: true };
            const isAsc = (curState.colIndex === colIdx) ? !curState.isAsc : true;
            this.sortStates[tableId] = { colIndex: colIdx, isAsc: isAsc };

            this.sortTable(table, colIdx, isAsc);
        },

        sortTable: function(table, colIdx, isAsc) {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr'));
            if (rows.length <= 1) return;
            if (rows.length === 1 && rows[0].querySelector('td[colspan]')) return;

            const thead = table.querySelector('thead');
            if (thead) {
                const headers = thead.querySelectorAll('th');
                headers.forEach((th, idx) => {
                    const icon = th.querySelector('.sort-indicator-icon') || th.querySelector('i[id*="sort-icon"]');
                    if (icon) {
                        if (idx === colIdx) {
                            icon.className = isAsc ? 'ph-bold ph-caret-up text-teal-700 text-xs ml-1 inline-block' : 'ph-bold ph-caret-down text-teal-700 text-xs ml-1 inline-block';
                        } else {
                            icon.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs ml-1 inline-block sort-indicator-icon';
                        }
                    }
                });
            }

            rows.sort((rowA, rowB) => {
                const cellA = rowA.children[colIdx];
                const cellB = rowB.children[colIdx];
                if (!cellA || !cellB) return 0;

                const textA = (cellA.innerText || cellA.textContent || '').trim();
                const textB = (cellB.innerText || cellB.textContent || '').trim();

                const numA = this.parseNumeric(textA);
                const numB = this.parseNumeric(textB);
                if (numA !== null && numB !== null) {
                    return isAsc ? numA - numB : numB - numA;
                }

                const dateA = this.parseDate(textA);
                const dateB = this.parseDate(textB);
                if (dateA !== null && dateB !== null) {
                    return isAsc ? dateA - dateB : dateB - dateA;
                }

                return isAsc ? textA.localeCompare(textB, 'vi') : textB.localeCompare(textA, 'vi');
            });

            rows.forEach(row => tbody.appendChild(row));
            this.reindexSTT(table);
        },

        parseNumeric: function(str) {
            if (!str) return null;
            const cleaned = str.replace(/[đvn₫%\s]/gi, '').replace(/\./g, '').replace(',', '.');
            if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
                return parseFloat(cleaned);
            }
            return null;
        },

        parseDate: function(str) {
            if (!str) return null;
            const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (dmy) {
                return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])).getTime();
            }
            const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
            if (ymd) {
                return new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3])).getTime();
            }
            return null;
        },

        reindexSTT: function(table) {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, idx) => {
                const firstCell = row.children[0];
                if (firstCell && (firstCell.classList.contains('font-mono') || /^\d+$/.test(firstCell.innerText.trim()))) {
                    firstCell.innerText = String(idx + 1);
                }
            });
        },

        autoInit: function() {
            const tables = document.querySelectorAll('table.erp-table, table[id]');
            tables.forEach(tbl => BimTableSorter.initTable(tbl));
        }
    };

    // =========================================================================
    // BIM LOGISTICS — UNIVERSAL TABLE FOOTER TOTALS (DÒNG TỔNG CỘNG BẢNG DỮ LIỆU)
    // =========================================================================
    const BimTableFooter = {
        render: function(tableId, config) {
            const table = document.getElementById(tableId);
            if (!table) return;

            let tfoot = table.querySelector('tfoot');
            if (!tfoot) {
                tfoot = document.createElement('tfoot');
                table.appendChild(tfoot);
            }
            tfoot.className = 'bg-slate-100/95 border-t-2 border-slate-300 font-bold text-slate-800 text-xs shadow-2xs sticky bottom-0 z-10';

            const thead = table.querySelector('thead');
            const colCount = thead ? thead.querySelectorAll('th').length : (config.cells ? config.cells.length : 10);

            let trHtml = '<tr class="no-col-reorder border-b border-slate-300/80 bg-slate-100 hover:bg-slate-200/60 transition-colors">';
            
            if (Array.isArray(config.cells)) {
                config.cells.forEach(cell => {
                    const colspan = cell.colspan ? `colspan="${cell.colspan}"` : '';
                    const align = cell.align ? `text-${cell.align}` : 'text-left';
                    const cls = cell.class || '';
                    let content = cell.html || cell.text || '';
                    if (typeof content === 'string') {
                        content = content.replace(/(?:đ\s*đ|đ\s*VNĐ|VNĐ\s*đ|VNĐ\s*VNĐ)/gi, 'đ');
                    }
                    trHtml += `<td ${colspan} class="px-3 py-2.5 ${align} ${cls} font-heading font-bold">${content}</td>`;
                });
            } else {
                trHtml += `<td class="px-3 py-2.5 text-center font-black text-slate-900 font-heading">TỔNG</td>`;
                let summary = config.summary || '';
                if (typeof summary === 'string') {
                    summary = summary.replace(/(?:đ\s*đ|đ\s*VNĐ|VNĐ\s*đ|VNĐ\s*VNĐ)/gi, 'đ');
                }
                trHtml += `<td colspan="${colCount - 1}" class="px-3 py-2.5 text-slate-700 font-bold">${summary}</td>`;
            }
            trHtml += '</tr>';

            tfoot.innerHTML = trHtml;
            if (window.BimTableSorter) {
                window.BimTableSorter.initTable(table);
            }
        }
    };

    /**
     * =========================================================================
     * BIM TABLE RESIZABLE (KÉO THẢ THAY ĐỔI CHIỀU RỘNG CỘT TRỰC TIẾP TRÊN BẢNG)
     * =========================================================================
     * - Rê chuột vào mép giữa 2 cột: con trỏ chuyển thành col-resize (kéo qua lại).
     * - Thanh chỉ dẫn Guide Line màu xanh Teal (#0d9488) chạy dọc bảng khi kéo.
     * - Tự động ghi nhớ kích thước vào localStorage (bim_col_widths_{tableId}).
     * - Nhấp đúp (Double-click) vào mép cột để tự động căn vừa khít nội dung chữ.
     * - Tự động mở rộng text, không làm cắt mất chữ khi kéo rộng cột.
     */
    const BimTableResizable = {
        guideLine: null,
        currentTh: null,
        currentTable: null,
        startX: 0,
        startWidth: 0,
        storagePrefix: 'bim_col_widths_',
        isStylesInjected: false,

        injectStyles: function() {
            if (this.isStylesInjected) return;
            this.isStylesInjected = true;
            if (document.getElementById('bim-table-resizable-styles')) return;

            const style = document.createElement('style');
            style.id = 'bim-table-resizable-styles';
            style.textContent = `
                .bim-col-resizer {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 7px;
                    height: 100%;
                    cursor: col-resize;
                    user-select: none;
                    z-index: 25;
                    background: transparent;
                    transition: background 0.15s ease;
                }
                .bim-col-resizer::after {
                    content: '';
                    position: absolute;
                    top: 25%;
                    bottom: 25%;
                    right: 1px;
                    width: 2px;
                    background: #cbd5e1;
                    border-radius: 1px;
                    opacity: 0;
                    transition: opacity 0.15s ease, background 0.15s ease;
                }
                th:hover .bim-col-resizer::after {
                    opacity: 0.8;
                }
                .bim-col-resizer:hover::after,
                .bim-col-resizer.is-resizing::after {
                    opacity: 1;
                    background: #0d9488 !important;
                    width: 3px;
                    top: 10%;
                    bottom: 10%;
                }
                body.bim-col-resizing {
                    cursor: col-resize !important;
                    user-select: none !important;
                }
                body.bim-col-resizing * {
                    user-select: none !important;
                }
                .erp-table th {
                    position: relative;
                    box-sizing: border-box;
                }
                .erp-table td {
                    box-sizing: border-box;
                }
                /* Cho phép nội dung bung rộng linh hoạt theo chiều rộng cột, không bị kẹp mất chữ */
                .erp-table td[data-col-key] .truncate,
                .erp-table td[data-col-key] [class*="max-w-"] {
                    max-width: 100% !important;
                }
            `;
            document.head.appendChild(style);
        },

        createGuideLine: function() {
            if (this.guideLine) return;
            let el = document.getElementById('bim-table-resizer-line');
            if (!el) {
                el = document.createElement('div');
                el.id = 'bim-table-resizer-line';
                el.style.cssText = 'position:fixed;top:0;bottom:0;width:2px;background:#0d9488;z-index:99999;pointer-events:none;display:none;box-shadow:0 0 8px rgba(13,148,136,0.6);';
                document.body.appendChild(el);
            }
            this.guideLine = el;
        },

        init: function() {
            this.injectStyles();
            this.createGuideLine();
            this.bindGlobalEvents();
        },

        initTable: function(table) {
            if (!table || table.hasAttribute('data-no-resizable')) return;
            this.injectStyles();
            this.createGuideLine();

            const thead = table.querySelector('thead');
            if (!thead) return;

            const tableId = table.id;
            const savedWidths = this.loadSavedWidths(tableId);

            const trHead = thead.querySelector('tr:first-child');
            if (!trHead) return;
            const ths = Array.from(trHead.children);

            const self = this;
            ths.forEach(function(th, idx) {
                // Không gắn resizer cho cột cuối cùng
                if (idx === ths.length - 1) return;

                th.style.position = 'relative';

                // Áp dụng độ rộng đã lưu nếu có
                const colKey = th.getAttribute('data-col-key') || ('col_' + idx);
                if (savedWidths && savedWidths[colKey]) {
                    const w = savedWidths[colKey];
                    th.style.width = w + 'px';
                    th.style.minWidth = w + 'px';
                    th.style.maxWidth = w + 'px';
                }

                // Gắn resizer handle nếu chưa có
                let resizer = th.querySelector('.bim-col-resizer');
                if (!resizer) {
                    resizer = document.createElement('div');
                    resizer.className = 'bim-col-resizer';
                    resizer.setAttribute('title', 'Kéo sang trái/phải để chỉnh độ rộng cột • Nhấp đúp để tự vừa khít chữ');
                    th.appendChild(resizer);

                    resizer.addEventListener('mousedown', function(e) {
                        self.onMouseDown(e, th, table);
                    });

                    resizer.addEventListener('dblclick', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        self.autoFitColumn(th, table);
                    });
                }
            });

            // Đồng bộ độ rộng xuống tbody nếu đã có cấu hình đã lưu
            if (savedWidths && Object.keys(savedWidths).length > 0) {
                this.applyWidthsToBody(table, savedWidths);
            }
        },

        loadSavedWidths: function(tableId) {
            if (!tableId) return {};
            try {
                const raw = localStorage.getItem(this.storagePrefix + tableId);
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        },

        saveWidths: function(tableId, widths) {
            if (!tableId) return;
            try {
                localStorage.setItem(this.storagePrefix + tableId, JSON.stringify(widths));
            } catch (e) {}
        },

        onMouseDown: function(e, th, table) {
            e.preventDefault();
            e.stopPropagation();

            this.currentTh = th;
            this.currentTable = table;
            this.startX = e.pageX;
            this.startWidth = th.getBoundingClientRect().width;

            const resizer = th.querySelector('.bim-col-resizer');
            if (resizer) resizer.classList.add('is-resizing');

            if (this.guideLine) {
                this.guideLine.style.left = e.pageX + 'px';
                this.guideLine.style.display = 'block';
            }

            document.body.classList.add('bim-col-resizing');
        },

        bindGlobalEvents: function() {
            if (this.eventsBound) return;
            this.eventsBound = true;
            const self = this;

            window.addEventListener('mousemove', function(e) {
                if (!self.currentTh) return;
                const deltaX = e.pageX - self.startX;
                const newWidth = Math.max(Math.round(self.startWidth + deltaX), 48);

                if (self.guideLine) {
                    self.guideLine.style.left = e.pageX + 'px';
                }

                // Cập nhật real-time độ rộng th
                self.currentTh.style.width = newWidth + 'px';
                self.currentTh.style.minWidth = newWidth + 'px';
                self.currentTh.style.maxWidth = newWidth + 'px';

                // Đồng bộ real-time các td tương ứng trong tbody
                const colKey = self.currentTh.getAttribute('data-col-key');
                if (colKey && self.currentTable) {
                    const tds = self.currentTable.querySelectorAll(`tbody td[data-col-key="${colKey}"]`);
                    tds.forEach(function(td) {
                        td.style.width = newWidth + 'px';
                        td.style.minWidth = newWidth + 'px';
                        td.style.maxWidth = newWidth + 'px';
                    });
                }
            });

            window.addEventListener('mouseup', function(e) {
                if (!self.currentTh) return;
                const th = self.currentTh;
                const table = self.currentTable;

                const resizer = th.querySelector('.bim-col-resizer');
                if (resizer) resizer.classList.remove('is-resizing');

                self.currentTh = null;
                self.currentTable = null;

                if (self.guideLine) {
                    self.guideLine.style.display = 'none';
                }
                document.body.classList.remove('bim-col-resizing');

                if (table && table.id) {
                    const finalWidth = Math.round(th.getBoundingClientRect().width);
                    th.style.width = finalWidth + 'px';
                    th.style.minWidth = finalWidth + 'px';
                    th.style.maxWidth = finalWidth + 'px';

                    const colKey = th.getAttribute('data-col-key') || '';
                    if (colKey) {
                        const widths = self.loadSavedWidths(table.id);
                        widths[colKey] = finalWidth;
                        self.saveWidths(table.id, widths);
                    }

                    // Đồng bộ xuống tbody
                    self.applyWidthsToBody(table, self.loadSavedWidths(table.id));
                }
            });
        },

        autoFitColumn: function(th, table) {
            if (!th || !table) return;
            const colKey = th.getAttribute('data-col-key');
            if (!colKey) return;

            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            let maxContentWidth = th.scrollWidth;
            const cells = tbody.querySelectorAll(`td[data-col-key="${colKey}"]`);
            cells.forEach(function(td) {
                let cellW = td.scrollWidth;
                const children = td.children;
                for (let i = 0; i < children.length; i++) {
                    cellW = Math.max(cellW, children[i].scrollWidth || 0);
                }
                maxContentWidth = Math.max(maxContentWidth, cellW);
            });

            const targetWidth = Math.min(Math.max(maxContentWidth + 28, 64), 700);
            th.style.width = targetWidth + 'px';
            th.style.minWidth = targetWidth + 'px';
            th.style.maxWidth = targetWidth + 'px';

            if (table.id) {
                const widths = this.loadSavedWidths(table.id);
                widths[colKey] = targetWidth;
                this.saveWidths(table.id, widths);
                this.applyWidthsToBody(table, widths);
            }

            if (window.showToast) {
                const colName = th.getAttribute('data-col-name') || 'cột';
                window.showToast('info', `Đã tự động căn vừa chiều rộng cột: ${colName} (${targetWidth}px)`, 'Tự căn cột');
            }
        },

        applyWidthsToBody: function(table, widths) {
            if (!table || !widths) return;
            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            Object.keys(widths).forEach(function(key) {
                const w = widths[key];
                const tds = tbody.querySelectorAll(`td[data-col-key="${key}"]`);
                tds.forEach(function(td) {
                    td.style.width = w + 'px';
                    td.style.minWidth = w + 'px';
                    td.style.maxWidth = w + 'px';
                });
            });
        }
    };

    // Khởi tạo BimTableResizable
    BimTableResizable.init();
    window.BimTableResizable = BimTableResizable;

    // Export module
    window.BimTableSorter = BimTableSorter;
    window.BimTableFooter = BimTableFooter;
    // Export module
    window.BimTableColumnManager = BimTableColumnManager;

    // Tự động khởi chạy khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            BimTableColumnManager.autoInit();
        });
    } else {
        BimTableColumnManager.autoInit();
    }

})(window, document);
