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

        this.storageKey = this.options.storagePrefix + this.tableId;
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

    TableColumnInstance.prototype.init = function() {
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

        // Lắng nghe thay đổi của tbody để tự động áp dụng khi có dữ liệu mới render
        this.setupMutationObserver();
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

                    // Thêm bất kỳ cột mới nào chưa có trong cache
                    Object.values(defaultMap).forEach(function(c) {
                        merged.push(Object.assign({}, c));
                    });

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
        } catch (e) {}

        this.columns = this.defaultColumns.map(function(c) {
            return Object.assign({}, c);
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
