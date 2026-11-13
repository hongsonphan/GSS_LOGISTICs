// =========================================================================
// QUẢN LÝ DANH SÁCH CONTAINER CHO BOOKING / B/L (GSS TMS CONTAINER ENGINE)
// HỖ TRỢ: NHẬP EXCEL, TẢI MẪU CHUẨN, THÊM DÒNG TRỰC TIẾP & LƯU CSDL
// =========================================================================

let stagedBookingContainers = [];
window.stagedBookingContainers = stagedBookingContainers;
let currentBookingContainers = [];
let selectedBookingContIds = new Set();
let bookingCarriersList = [];
let stagedParsedExcelRows = [];
let activeTargetBookingId = null;
window.activeTargetBookingId = null;
let editingSavedContId = null;
window.editingSavedContId = null;
let selectedStagedContIndices = new Set();
let isContTableFullscreen = false;
window.isContTableFullscreen = false;

let contTableFilterState = {
    search: '',
    vendorStatus: 'ALL',
    sortKey: 'line_no',
    sortOrder: 'asc'
};
let filteredBookingContainers = [];
window.contTableFilterState = contTableFilterState;
window.filteredBookingContainers = filteredBookingContainers;

function handleContSearchInput(val) {
    contTableFilterState.search = val || '';
    const clearBtn = document.getElementById('cont-table-search-clear');
    if (clearBtn) {
        if (contTableFilterState.search.trim()) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
    refreshCurrentContainersView();
}
window.handleContSearchInput = handleContSearchInput;

function clearContSearchInput() {
    const inp = document.getElementById('cont-table-search-input');
    if (inp) inp.value = '';
    handleContSearchInput('');
}
window.clearContSearchInput = clearContSearchInput;

function handleContVendorFilter(val) {
    contTableFilterState.vendorStatus = val || 'ALL';
    refreshCurrentContainersView();
}
window.handleContVendorFilter = handleContVendorFilter;

function handleContSortSelect(val) {
    if (!val) return;
    if (val === 'unassigned-first') {
        contTableFilterState.sortKey = 'unassigned-first';
        contTableFilterState.sortOrder = 'asc';
    } else if (val === 'assigned-first') {
        contTableFilterState.sortKey = 'assigned-first';
        contTableFilterState.sortOrder = 'asc';
    } else {
        const parts = val.split('-');
        contTableFilterState.sortKey = parts[0] || 'line_no';
        contTableFilterState.sortOrder = parts[1] || 'asc';
    }
    updateContTableSortIcons();
    refreshCurrentContainersView();
}
window.handleContSortSelect = handleContSortSelect;

function sortContTableBy(key) {
    if (contTableFilterState.sortKey === key) {
        contTableFilterState.sortOrder = contTableFilterState.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        contTableFilterState.sortKey = key;
        contTableFilterState.sortOrder = 'asc';
    }
    
    const sortSelect = document.getElementById('cont-table-sort-select');
    if (sortSelect) {
        const optVal = `${contTableFilterState.sortKey}-${contTableFilterState.sortOrder}`;
        if (sortSelect.querySelector(`option[value="${optVal}"]`)) {
            sortSelect.value = optVal;
        } else {
            sortSelect.value = 'line_no-asc';
        }
    }
    
    updateContTableSortIcons();
    refreshCurrentContainersView();
}
window.sortContTableBy = sortContTableBy;

function updateContTableSortIcons() {
    const sortCols = [
        'line_no', 'container_number', 'container_type', 'seal_number',
        'gross_weight_kg', 'delivery_address', 'dropoff_loc', 'dem_expiry',
        'vendor', 'tractor_plate', 'driver_name', 'status'
    ];
    
    sortCols.forEach(col => {
        const icon = document.getElementById(`sort-icon-${col}`);
        if (!icon) return;
        if (contTableFilterState.sortKey === col) {
            icon.className = contTableFilterState.sortOrder === 'asc'
                ? 'ph-bold ph-caret-up text-[11px] text-teal-700 font-bold'
                : 'ph-bold ph-caret-down text-[11px] text-teal-700 font-bold';
        } else {
            icon.className = 'ph-bold ph-arrows-down-up text-[10px] text-slate-400';
        }
    });
}
window.updateContTableSortIcons = updateContTableSortIcons;

function resetContTableFilters() {
    contTableFilterState.search = '';
    contTableFilterState.vendorStatus = 'ALL';
    contTableFilterState.sortKey = 'line_no';
    contTableFilterState.sortOrder = 'asc';
    
    const searchInp = document.getElementById('cont-table-search-input');
    if (searchInp) searchInp.value = '';
    const clearBtn = document.getElementById('cont-table-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');
    
    const vendorSelect = document.getElementById('cont-table-filter-vendor');
    if (vendorSelect) vendorSelect.value = 'ALL';
    
    const sortSelect = document.getElementById('cont-table-sort-select');
    if (sortSelect) sortSelect.value = 'line_no-asc';
    
    updateContTableSortIcons();
    refreshCurrentContainersView();
}
window.resetContTableFilters = resetContTableFilters;

function refreshCurrentContainersView() {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    if (bookingId) {
        renderSavedBookingContainers();
    } else {
        renderStagedBookingContainers();
    }
}
window.refreshCurrentContainersView = refreshCurrentContainersView;

function getFilteredAndSortedContainers(conts) {
    if (!conts || !Array.isArray(conts)) return [];
    let result = [...conts];
    
    // 1. Search text
    const term = (contTableFilterState.search || '').trim().toLowerCase();
    if (term) {
        result = result.filter(c => {
            const no = (c.container_number || '').toLowerCase();
            const type = (c.container_type || '').toLowerCase();
            const seal = (c.seal_number || '').toLowerCase();
            const vgm = String(c.gross_weight_kg || '').toLowerCase();
            const deliv = (c.delivery_address || c.delivery_loc || c.delivery_loc_name || '').toLowerCase();
            const drop = (c.dropoff_loc || c.dropoff_loc_name || '').toLowerCase();
            const vendor = (c.vendor || c.subcontractor_name || '').toLowerCase();
            const vendorCode = (c.vendor_code || '').toLowerCase();
            const truck = (c.tractor_plate || c.truck_plate || '').toLowerCase();
            const driver = (c.driver_name || '').toLowerCase();
            const trip = (c.trip_code || '').toLowerCase();
            const notes = (c.notes || '').toLowerCase();
            
            return no.includes(term) ||
                seal.includes(term) ||
                type.includes(term) ||
                vgm.includes(term) ||
                deliv.includes(term) ||
                drop.includes(term) ||
                vendor.includes(term) ||
                vendorCode.includes(term) ||
                truck.includes(term) ||
                driver.includes(term) ||
                trip.includes(term) ||
                notes.includes(term);
        });
    }
    
    // 2. Filter theo 10 trạng thái chuẩn của Container
    const stFilter = contTableFilterState.vendorStatus;
    if (stFilter && stFilter !== 'ALL') {
        const inTransitSteps = ['ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY'];
        result = result.filter(c => {
            const st = (c.dispatch_status || c.step_status || '').toUpperCase();
            const hasVendor = !!(c.vendor || c.subcontractor_name || c.subcontractor_id || c.vendor_id);
            const hasTrip = !!c.trip_code;
            if (stFilter === 'UNASSIGNED') return !hasVendor && !hasTrip;
            if (stFilter === 'ASSIGNED') return hasVendor && !hasTrip && st !== 'CANCELLED';
            if (stFilter === 'READY') return st === 'READY' || (hasTrip && !inTransitSteps.includes(st) && st !== 'EMPTY_RETURNED' && st !== 'CANCELLED');
            if (stFilter === 'IN_TRANSIT') return inTransitSteps.includes(st);
            return st === stFilter;
        });
    }
    
    // 3. Sorting
    const key = contTableFilterState.sortKey || 'line_no';
    const order = contTableFilterState.sortOrder === 'desc' ? -1 : 1;
    
    result.sort((a, b) => {
        if (key === 'unassigned-first') {
            const aAssigned = !!(a.vendor || a.subcontractor_name || a.subcontractor_id || a.vendor_id);
            const bAssigned = !!(b.vendor || b.subcontractor_name || b.subcontractor_id || b.vendor_id);
            if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
            return ((a.line_no || 0) - (b.line_no || 0));
        }
        if (key === 'assigned-first') {
            const aAssigned = !!(a.vendor || a.subcontractor_name || a.subcontractor_id || a.vendor_id);
            const bAssigned = !!(b.vendor || b.subcontractor_name || b.subcontractor_id || b.vendor_id);
            if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
            return ((a.line_no || 0) - (b.line_no || 0));
        }
        
        let valA, valB;
        if (key === 'line_no') {
            valA = Number(a.line_no || 0);
            valB = Number(b.line_no || 0);
            return (valA - valB) * order;
        }
        if (key === 'gross_weight_kg') {
            valA = Number(a.gross_weight_kg || 0);
            valB = Number(b.gross_weight_kg || 0);
            return (valA - valB) * order;
        }
        if (key === 'dem_expiry') {
            valA = String(a.dem_expiry || a.dem_expiry_override || '9999');
            valB = String(b.dem_expiry || b.dem_expiry_override || '9999');
            return valA.localeCompare(valB) * order;
        }
        if (key === 'vendor') {
            valA = (a.vendor || a.subcontractor_name || '').toLowerCase();
            valB = (b.vendor || b.subcontractor_name || '').toLowerCase();
            if (!valA && valB) return 1;
            if (valA && !valB) return -1;
            return valA.localeCompare(valB) * order;
        }
        if (key === 'tractor_plate') {
            valA = (a.tractor_plate || a.truck_plate || '').toLowerCase();
            valB = (b.tractor_plate || b.truck_plate || '').toLowerCase();
            return valA.localeCompare(valB) * order;
        }
        if (key === 'driver_name') {
            valA = (a.driver_name || '').toLowerCase();
            valB = (b.driver_name || '').toLowerCase();
            return valA.localeCompare(valB) * order;
        }
        if (key === 'status') {
            valA = (a.trip_code || '').toLowerCase();
            valB = (b.trip_code || '').toLowerCase();
            return valA.localeCompare(valB) * order;
        }
        if (key === 'delivery_address') {
            valA = (a.delivery_address || a.delivery_loc || a.delivery_loc_name || '').toLowerCase();
            valB = (b.delivery_address || b.delivery_loc || b.delivery_loc_name || '').toLowerCase();
            return valA.localeCompare(valB) * order;
        }
        if (key === 'dropoff_loc') {
            valA = (a.dropoff_loc || a.dropoff_loc_name || '').toLowerCase();
            valB = (b.dropoff_loc || b.dropoff_loc_name || '').toLowerCase();
            return valA.localeCompare(valB) * order;
        }
        
        valA = String(a[key] || '').toLowerCase();
        valB = String(b[key] || '').toLowerCase();
        return valA.localeCompare(valB) * order;
    });
    
    return result;
}
window.getFilteredAndSortedContainers = getFilteredAndSortedContainers;


function openImportContainersModal(targetBookingId = null) {
    const modal = document.getElementById('modal-import-containers');
    if (!modal) return;

    activeTargetBookingId = targetBookingId || document.getElementById('fullpage-booking-id')?.value || null;
    window.activeTargetBookingId = activeTargetBookingId;
    const isNew = !activeTargetBookingId;

    // Loại bỏ cả hidden và hidden-view để modal luôn hiển thị tin cậy
    modal.classList.remove('hidden', 'hidden-view');
    switchImportContTab('excel');

    const txt = document.getElementById('import-containers-text');
    if (txt) txt.value = '';
    const fileInp = document.getElementById('import-containers-file');
    if (fileInp) fileInp.value = '';
    const fileLbl = document.getElementById('import-cont-filename');
    if (fileLbl) fileLbl.innerText = '';
    const prev = document.getElementById('import-containers-preview');
    if (prev) {
        prev.classList.add('hidden');
        prev.innerHTML = '';
    }
    stagedParsedExcelRows = [];

    const subDesc = modal.querySelector('p.text-teal-100');
    if (subDesc) {
        subDesc.innerText = isNew 
            ? 'Chế độ Tạo Mới: Dữ liệu nạp từ Excel sẽ được đưa lên bảng và tự động lưu cùng Đơn hàng'
            : 'Hỗ trợ tải tệp Excel danh sách 100 cont hoặc dán văn bản trực tiếp';
    }
}
window.openImportContainersModal = openImportContainersModal;

function closeImportContainersModal() {
    const modal = document.getElementById('modal-import-containers');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('hidden-view');
    }
}
window.closeImportContainersModal = closeImportContainersModal;

function switchImportContTab(tab) {
    const pPanel = document.getElementById('tab-panel-paste-containers');
    const ePanel = document.getElementById('tab-panel-excel-containers');
    const pBtn = document.getElementById('tab-btn-paste-containers');
    const eBtn = document.getElementById('tab-btn-excel-containers');

    if (tab === 'paste') {
        if (pPanel) pPanel.classList.remove('hidden');
        if (ePanel) ePanel.classList.add('hidden');
        if (pBtn) {
            pBtn.className = 'pb-2 text-xs font-bold font-heading border-b-2 border-teal-600 text-teal-700 flex items-center gap-1.5 cursor-pointer';
        }
        if (eBtn) {
            eBtn.className = 'pb-2 text-xs font-bold font-heading border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        }
    } else {
        if (pPanel) pPanel.classList.add('hidden');
        if (ePanel) ePanel.classList.remove('hidden');
        if (pBtn) {
            pBtn.className = 'pb-2 text-xs font-bold font-heading border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        }
        if (eBtn) {
            eBtn.className = 'pb-2 text-xs font-bold font-heading border-b-2 border-teal-600 text-teal-700 flex items-center gap-1.5 cursor-pointer';
        }
    }
}
window.switchImportContTab = switchImportContTab;

function parseRawContainerTextLines(rawText) {
    if (!rawText) return [];
    const lines = rawText.split('\n');
    const results = [];
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const parts = line.split(/[\t,;]+|\s{2,}|\s+/).filter(Boolean);
        if (parts.length === 0) continue;
        const contNum = (parts[0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!contNum || contNum.length < 4) continue;

        let contType = '40HC';
        let sealNum = '';
        let vgm = null;
        let deliv = '';
        let drop = '';

        for (let i = 1; i < parts.length; i++) {
            const p = parts[i].trim().toUpperCase();
            if (/^(20|40|45)[A-Z0-9]+$/.test(p)) {
                contType = p;
            } else if (/^[0-9]+([.,][0-9]+)?$/.test(p) && Number(p.replace(',', '.')) > 500) {
                vgm = Number(p.replace(',', '.'));
            } else if (!sealNum && p.length >= 3) {
                sealNum = p;
            } else if (!deliv) {
                deliv = parts[i].trim();
            } else if (!drop) {
                drop = parts[i].trim();
            }
        }

        results.push({
            container_number: contNum,
            container_type: contType,
            seal_number: sealNum,
            gross_weight_kg: vgm,
            delivery_loc: deliv,
            dropoff_loc: drop,
            is_inline_input: true
        });
    }
    return results;
}
window.parseRawContainerTextLines = parseRawContainerTextLines;

function handleContExcelSelected(input) {
    const lbl = document.getElementById('import-cont-filename');
    const prev = document.getElementById('import-containers-preview');
    stagedParsedExcelRows = [];

    if (!input.files || !input.files[0]) {
        if (lbl) lbl.innerText = '';
        if (prev) prev.classList.add('hidden');
        return;
    }

    const file = input.files[0];
    if (lbl) lbl.innerText = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    if (typeof XLSX === 'undefined') {
        if (prev) {
            prev.classList.remove('hidden');
            prev.innerHTML = `<span class="text-amber-700 font-bold"><i class="ph-bold ph-check"></i> Đã chọn file Excel. Hệ thống sẽ gửi file lên máy chủ khi bạn xác nhận.</span>`;
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (!rows || rows.length < 2) {
                if (prev) {
                    prev.classList.remove('hidden');
                    prev.innerHTML = `<span class="text-rose-600 font-bold"><i class="ph-bold ph-warning"></i> File không có đủ dữ liệu (tối thiểu 1 dòng tiêu đề và 1 dòng dữ liệu).</span>`;
                }
                return;
            }

            // Tìm hàng tiêu đề để nhận dạng cột thông minh
            let headerIdx = -1;
            let colCont = -1, colType = -1, colSeal = -1, colVGM = -1, colDeliv = -1, colDrop = -1, colDem = -1, colTruck = -1, colDriver = -1, colNotes = -1;

            for (let r = 0; r < Math.min(rows.length, 5); r++) {
                const row = rows[r].map(c => String(c).toLowerCase().trim());
                let foundCont = false;
                for (let c = 0; c < row.length; c++) {
                    const val = row[c];
                    if (val.includes('container') || val.includes('số cont') || val.includes('so cont') || val === 'cont') {
                        colCont = c;
                        foundCont = true;
                    } else if (val.includes('loại') || val.includes('loai') || val.includes('size') || val.includes('type')) {
                        colType = c;
                    } else if (val.includes('seal') || val.includes('chì') || val.includes('chi') || val.includes('niêm')) {
                        colSeal = c;
                    } else if (val.includes('vgm') || val.includes('trọng lượng') || val.includes('trong luong') || val.includes('weight') || val.includes('kg')) {
                        colVGM = c;
                    } else if (val.includes('giao') || val.includes('đóng') || val.includes('rút') || val.includes('kho')) {
                        colDeliv = c;
                    } else if (val.includes('trả') || val.includes('tra') || val.includes('rỗng') || val.includes('rong') || val.includes('depot')) {
                        colDrop = c;
                    } else if (val.includes('dem') || val.includes('det') || val.includes('hạn') || val.includes('han')) {
                        colDem = c;
                    } else if (val.includes('đầu kéo') || val.includes('dau keo') || val.includes('biển số') || val.includes('bien so') || val.includes('số xe') || val.includes('so xe') || val.includes('truck') || val.includes('plate')) {
                        colTruck = c;
                    } else if (val.includes('tài xế') || val.includes('tai xe') || val.includes('lái xe') || val.includes('lai xe') || val.includes('driver') || val === 'tài' || val === 'tai') {
                        colDriver = c;
                    } else if (val.includes('ghi chú') || val.includes('ghi chu') || val.includes('note')) {
                        colNotes = c;
                    }
                }
                if (foundCont || colCont !== -1) {
                    headerIdx = r;
                    break;
                }
            }

            // Nếu không tìm thấy cột bằng header: nếu cột 0 là STT 1,2,3 thì cont là 1, ngược lại là 0
            const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
            if (colCont === -1) {
                if (startRow < rows.length && String(rows[startRow][0] || '').trim().match(/^\d+$/)) {
                    colCont = 1; colType = 2; colSeal = 3; colVGM = 4; colDeliv = 5; colDrop = 6; colDem = 7; colTruck = 8; colDriver = 9;
                } else {
                    colCont = 0; colType = 1; colSeal = 2; colVGM = 3; colDeliv = 4; colDrop = 5; colDem = 6; colTruck = 7; colDriver = 8;
                }
            }

            const parsed = [];
            for (let r = startRow; r < rows.length; r++) {
                const row = rows[r];
                if (!row || !row.length) continue;

                let contVal = colCont !== -1 ? String(row[colCont] || '') : String(row[0] || row[1] || '');
                contVal = contVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
                if (!contVal || contVal.length < 4) continue;

                let typeVal = colType !== -1 ? String(row[colType] || '').trim().toUpperCase() : '40HC';
                if (!typeVal || !/^\d{2}[A-Z0-9]+$/.test(typeVal)) typeVal = '40HC';

                let sealVal = colSeal !== -1 ? String(row[colSeal] || '').trim().toUpperCase() : '';
                let vgmVal = null;
                if (colVGM !== -1) {
                    const rawV = Number(String(row[colVGM] || '').replace(/[^0-9.]/g, ''));
                    if (rawV > 0) vgmVal = rawV;
                }

                let delivVal = colDeliv !== -1 ? String(row[colDeliv] || '').trim() : '';
                let dropVal = colDrop !== -1 ? String(row[colDrop] || '').trim() : '';
                let rawDem = colDem !== -1 ? row[colDem] : '';
                let demVal = '';
                if (rawDem instanceof Date) {
                    const dd = rawDem.getDate().toString().padStart(2, '0');
                    const mm = (rawDem.getMonth() + 1).toString().padStart(2, '0');
                    const yyyy = rawDem.getFullYear();
                    demVal = `${dd}/${mm}/${yyyy}`;
                } else if (rawDem) {
                    demVal = String(rawDem).trim();
                }
                let truckVal = colTruck !== -1 ? String(row[colTruck] || '').trim().toUpperCase() : '';
                let driverVal = colDriver !== -1 ? String(row[colDriver] || '').trim() : '';

                parsed.push({
                    container_number: contVal,
                    container_type: typeVal,
                    seal_number: sealVal,
                    gross_weight_kg: vgmVal,
                    delivery_loc: delivVal,
                    dropoff_loc: dropVal,
                    dem_det: demVal,
                    tractor_plate: truckVal,
                    driver_name: driverVal,
                    vendor_id: '',
                    is_inline_input: true
                });
            }

            stagedParsedExcelRows = parsed;

            if (prev) {
                prev.classList.remove('hidden');
                if (parsed.length > 0) {
                    prev.innerHTML = `<span class="text-emerald-700 font-bold"><i class="ph-bold ph-check-circle"></i> Đã nhận diện thành công <strong>${parsed.length} container</strong> từ tệp Excel! Bấm <em>"Xác Nhận Nạp Danh Sách Cont"</em> để đưa vào bảng.</span>`;
                } else {
                    prev.innerHTML = `<span class="text-amber-700 font-bold"><i class="ph-bold ph-warning"></i> Không tìm thấy số container hợp lệ trong file Excel. Vui lòng kiểm tra lại cột số container.</span>`;
                }
            }

        } catch (err) {
            console.error('Lỗi đọc file Excel SheetJS:', err);
            if (prev) {
                prev.classList.remove('hidden');
                prev.innerHTML = `<span class="text-rose-600 font-bold"><i class="ph-bold ph-warning"></i> Lỗi khi đọc file Excel: ${err.message}</span>`;
            }
        }
    };
    reader.readAsArrayBuffer(file);
}
window.handleContExcelSelected = handleContExcelSelected;

function collectContainersFromTable() {
    const tbody = document.getElementById('fullpage-booking-containers-tbody');
    if (!tbody) return stagedBookingContainers || [];

    const rows = tbody.querySelectorAll('tr');
    const conts = [];

    rows.forEach((tr, idx) => {
        const contInp = tr.querySelector('input[data-field="container_number"]') || tr.querySelector('input.cont-number-input');
        const typeSel = tr.querySelector('select[data-field="container_type"]') || tr.querySelector('select.cont-type-select');
        const sealInp = tr.querySelector('input[data-field="seal_number"]') || tr.querySelector('input.cont-seal-input');
        const vgmInp = tr.querySelector('input[data-field="gross_weight_kg"]') || tr.querySelector('input.cont-vgm-input');
        const delivInp = tr.querySelector('input[data-field="delivery_loc"]') || tr.querySelector('input.cont-delivery-input');
        const dropInp = tr.querySelector('input[data-field="dropoff_loc"]') || tr.querySelector('input.cont-dropoff-input');
        const demInp = tr.querySelector('input[data-field="dem_det"]') || tr.querySelector('input.cont-demdet-input');
        const vendorSel = tr.querySelector('select[data-field="vendor_id"]') || tr.querySelector('select.cont-vendor-select');
        const truckInp = tr.querySelector('input[data-field="tractor_plate"]') || tr.querySelector('input.cont-truck-input');
        const driverInp = tr.querySelector('input[data-field="driver_name"]') || tr.querySelector('input.cont-driver-input');

        if (contInp) {
            const num = (contInp.value || '').trim().toUpperCase();
            if (num) {
                conts.push({
                    container_number: num,
                    container_type: typeSel ? typeSel.value : '40HC',
                    seal_number: sealInp ? (sealInp.value || '').trim().toUpperCase() : '',
                    gross_weight_kg: vgmInp && vgmInp.value ? Number(vgmInp.value) : null,
                    delivery_loc: delivInp ? delivInp.value.trim() : '',
                    dropoff_loc: dropInp ? dropInp.value.trim() : '',
                    dem_det: demInp ? demInp.value.trim() : '',
                    vendor_id: vendorSel ? vendorSel.value : '',
                    tractor_plate: truckInp ? (truckInp.value || '').trim().toUpperCase() : '',
                    driver_name: driverInp ? (driverInp.value || '').trim() : '',
                    is_inline_input: true
                });
            }
        }
    });

    return conts;
}
window.collectContainersFromTable = collectContainersFromTable;

function updateStagedContField(idx, field, val) {
    if (idx >= 0 && idx < stagedBookingContainers.length) {
        if (field === 'gross_weight_kg') {
            const num = Number(val);
            stagedBookingContainers[idx][field] = num > 0 ? num : null;
        } else if (field === 'container_number' || field === 'seal_number') {
            stagedBookingContainers[idx][field] = String(val || '').trim().toUpperCase();
        } else {
            stagedBookingContainers[idx][field] = val;
        }
        window.stagedBookingContainers = stagedBookingContainers;
    }
}
window.updateStagedContField = updateStagedContField;

function addNewContainerRow() {
    const deliveryLocText = document.getElementById('fullpage-booking-delivery')?.selectedOptions?.[0]?.text?.replace(/^--.*--$/, '') || '';
    const dropoffLocText = document.getElementById('fullpage-booking-dropoff')?.selectedOptions?.[0]?.text?.replace(/^--.*--$/, '') || '';

    // Thu thập dữ liệu hiện có trên các ô input
    const tableConts = collectContainersFromTable();
    if (tableConts.length > 0) {
        stagedBookingContainers = tableConts;
    }

    // Thêm 1 dòng mới với đầy đủ các trường
    stagedBookingContainers.push({
        container_number: '',
        container_type: '40HC',
        seal_number: '',
        gross_weight_kg: null,
        delivery_loc: deliveryLocText,
        dropoff_loc: dropoffLocText,
        dem_det: '',
        vendor_id: '',
        is_inline_input: true
    });

    window.stagedBookingContainers = stagedBookingContainers;
    renderStagedBookingContainers();

    // Tự động focus vào ô Số Container vừa thêm
    setTimeout(() => {
        const inputs = document.querySelectorAll('#fullpage-booking-containers-tbody input[data-field="container_number"]');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }, 60);
}
window.addNewContainerRow = addNewContainerRow;

function renderStagedBookingContainers() {
    const tbody = document.getElementById('fullpage-booking-containers-tbody');
    const badge = document.getElementById('fullpage-cont-badge');
    const progressEl = document.getElementById('fullpage-cont-progress');
    const totalInp = document.getElementById('fullpage-booking-total-containers');

    const total = stagedBookingContainers.length;
    if (totalInp) {
        totalInp.value = formatNumberVN(total);
    }
    if (badge) {
        badge.innerText = `${total} Container (Chờ Lưu)`;
    }
    if (progressEl) {
        progressEl.innerHTML = `<span class="text-teal-700 font-bold"><i class="ph-bold ph-cloud-arrow-up"></i> Đã nạp tạm ${total} container. Danh sách sẽ được tự động lưu vào cơ sở dữ liệu khi bạn bấm "Lưu".</span>`;
    }

    if (!tbody) return;
    if (total === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="p-8 text-center text-slate-400 italic">
                    <i class="ph-bold ph-tray text-2xl mb-1 block"></i>
                    Chưa có danh sách container cho B/L này. Bấm nút <strong>"+ Thêm Dòng"</strong> hoặc <strong>"Nhập Từ Excel"</strong> để nạp danh sách container.
                </td>
            </tr>
        `;
        return;
    }

    const deliveryLocDefault = document.getElementById('fullpage-booking-delivery')?.selectedOptions?.[0]?.text?.replace(/^--.*--$/, '') || 'Theo Kho Giao';
    const dropoffLocDefault = document.getElementById('fullpage-booking-dropoff')?.selectedOptions?.[0]?.text?.replace(/^--.*--$/, '') || 'Theo Depot';

    // Xây dựng danh sách vendor options
    let vendorOptionsHtml = '<option value="">-- Chưa phân bổ --</option>';
    if (bookingCarriersList && bookingCarriersList.length > 0) {
        bookingCarriersList.forEach(s => {
            const label = (s.code ? s.code + ' · ' : '') + (s.short_name || s.name);
            vendorOptionsHtml += `<option value="${s.id}">${escapeHtml(label)}</option>`;
        });
    }

    tbody.innerHTML = stagedBookingContainers.map((c, idx) => {
        const delivVal = c.delivery_loc !== undefined && c.delivery_loc !== '' ? c.delivery_loc : deliveryLocDefault;
        const dropVal = c.dropoff_loc !== undefined && c.dropoff_loc !== '' ? c.dropoff_loc : dropoffLocDefault;
        const demVal = c.dem_det || 'Theo B/L';

        return `
            <tr class="bg-teal-50/40 hover:bg-teal-50/80 transition-colors">
                <td class="p-2 text-center text-teal-700">
                    <input type="checkbox" value="${idx}" ${selectedStagedContIndices.has(idx) ? 'checked' : ''} onchange="toggleSelectStagedContRow(${idx}, this.checked)" class="rounded cursor-pointer">
                </td>
                <td class="p-2 text-center font-bold text-teal-800 text-xs">${idx + 1}</td>
                
                <!-- 1. Số Container (Cho phép gõ trực tiếp) -->
                <td class="p-1.5 min-w-[140px]">
                    <input type="text" data-field="container_number" 
                        placeholder="VD: MSCU1234567" 
                        value="${escapeHtml(c.container_number || '')}" 
                        oninput="this.value = this.value.toUpperCase(); updateStagedContField(${idx}, 'container_number', this.value);"
                        class="cont-number-input w-full h-8 px-2 uppercase font-mono font-bold text-teal-900 border border-teal-400 rounded-lg text-xs bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-500 shadow-2xs">
                </td>

                <!-- 2. Loại Cont (Dropdown) -->
                <td class="p-1.5 min-w-[100px]">
                    <select data-field="container_type" 
                        onchange="updateStagedContField(${idx}, 'container_type', this.value);" 
                        class="cont-type-select w-full h-8 px-1.5 font-bold text-slate-700 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                        <option value="40HC" ${(!c.container_type || c.container_type === '40HC') ? 'selected' : ''}>40HC</option>
                        <option value="20GP" ${c.container_type === '20GP' ? 'selected' : ''}>20GP</option>
                        <option value="45HC" ${c.container_type === '45HC' ? 'selected' : ''}>45HC</option>
                        <option value="40GP" ${c.container_type === '40GP' ? 'selected' : ''}>40GP</option>
                        <option value="20RF" ${c.container_type === '20RF' ? 'selected' : ''}>20RF</option>
                        <option value="40RF" ${c.container_type === '40RF' ? 'selected' : ''}>40RF</option>
                    </select>
                </td>

                <!-- 3. Số Chì / Seal (Cho phép gõ) -->
                <td class="p-1.5 min-w-[120px]">
                    <input type="text" data-field="seal_number" 
                        placeholder="Số seal" 
                        value="${escapeHtml(c.seal_number || '')}" 
                        oninput="this.value = this.value.toUpperCase(); updateStagedContField(${idx}, 'seal_number', this.value);"
                        class="cont-seal-input w-full h-8 px-2 font-mono text-slate-800 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 4. Trọng Lượng VGM (Cho phép gõ số) -->
                <td class="p-1.5 min-w-[100px]">
                    <input type="number" data-field="gross_weight_kg" 
                        placeholder="VGM (kg)" 
                        value="${c.gross_weight_kg ? String(c.gross_weight_kg).replace(/\.00$/, '').replace(/\.0$/, '') : ''}" 
                        oninput="updateStagedContField(${idx}, 'gross_weight_kg', this.value);"
                        class="cont-vgm-input w-full h-8 px-2 text-right font-mono font-bold text-slate-800 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 5. Nơi Giao Hàng (Cho phép gõ) -->
                <td class="p-1.5 min-w-[150px]">
                    <input type="text" data-field="delivery_loc" 
                        placeholder="Kho khách hàng" 
                        value="${escapeHtml(delivVal)}" 
                        oninput="updateStagedContField(${idx}, 'delivery_loc', this.value);"
                        class="cont-delivery-input w-full h-8 px-2 text-slate-700 font-medium border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 6. Nơi Trả Rỗng (Cho phép gõ) -->
                <td class="p-1.5 min-w-[150px]">
                    <input type="text" data-field="dropoff_loc" 
                        placeholder="Depot hạ vỏ" 
                        value="${escapeHtml(dropVal)}" 
                        oninput="updateStagedContField(${idx}, 'dropoff_loc', this.value);"
                        class="cont-dropoff-input w-full h-8 px-2 text-slate-700 font-medium border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 7. Hạn Lệnh DEM/DET (Cho phép gõ) -->
                <td class="p-1.5 min-w-[130px]">
                    <input type="text" data-field="dem_det" 
                        placeholder="Hạn DEM/DET" 
                        value="${escapeHtml(demVal)}" 
                        oninput="updateStagedContField(${idx}, 'dem_det', this.value);"
                        class="cont-demdet-input w-full h-8 px-2 text-slate-700 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 8. Nhà Xe / Vendor (Dropdown) -->
                <td class="p-1.5 min-w-[160px]">
                    <select data-field="vendor_id" 
                        onchange="updateStagedContField(${idx}, 'vendor_id', this.value);"
                        class="cont-vendor-select w-full h-8 px-1.5 text-slate-700 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                        ${vendorOptionsHtml}
                    </select>
                </td>

                <!-- 9. Số Đầu Kéo (Tách riêng cho dễ xem & sửa) -->
                <td class="p-1.5 min-w-[130px]">
                    <input type="text" data-field="tractor_plate" 
                        placeholder="VD: 51C-123.45" 
                        value="${escapeHtml(c.tractor_plate || '')}" 
                        oninput="this.value = this.value.toUpperCase(); updateStagedContField(${idx}, 'tractor_plate', this.value);"
                        class="cont-truck-input w-full h-8 px-2 font-mono uppercase text-slate-800 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 10. Tài Xế (Tách riêng cho dễ xem & sửa) -->
                <td class="p-1.5 min-w-[150px]">
                    <input type="text" data-field="driver_name" 
                        placeholder="Tên tài xế & SĐT" 
                        value="${escapeHtml(c.driver_name || '')}" 
                        oninput="updateStagedContField(${idx}, 'driver_name', this.value);"
                        class="cont-driver-input w-full h-8 px-2 text-slate-800 border border-slate-300 rounded-lg text-xs bg-white focus:border-teal-600 shadow-2xs">
                </td>

                <!-- 11. Trạng Thái -->
                <td class="p-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Chờ lưu</span>
                </td>

                <!-- 11. Thao Tác (Xóa dòng) -->
                <td class="p-1.5 text-center">
                    <button type="button" onclick="removeStagedContainer(${idx})" class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer" title="Xóa dòng cont này">
                        <i class="ph-bold ph-trash text-base"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}
window.renderStagedBookingContainers = renderStagedBookingContainers;

function removeStagedContainer(index) {
    if (index >= 0 && index < stagedBookingContainers.length) {
        stagedBookingContainers.splice(index, 1);
        window.stagedBookingContainers = stagedBookingContainers;
        renderStagedBookingContainers();
    }
}
window.removeStagedContainer = removeStagedContainer;

async function submitImportContainers() {
    const bookingId = window.activeTargetBookingId || document.getElementById('fullpage-booking-id')?.value;
    const isNew = !bookingId;

    const pPanel = document.getElementById('tab-panel-paste-containers');
    const isPaste = pPanel && !pPanel.classList.contains('hidden');
    const btn = document.getElementById('btn-submit-import-containers');
    const origHtml = btn ? btn.innerHTML : '';

    let contList = [];
    if (isPaste) {
        const rawText = document.getElementById('import-containers-text')?.value?.trim();
        if (!rawText) {
            showToast('warning', 'Vui lòng dán danh sách số container vào khung văn bản.');
            return;
        }
        contList = parseRawContainerTextLines(rawText);
    } else {
        if (stagedParsedExcelRows && stagedParsedExcelRows.length > 0) {
            contList = stagedParsedExcelRows;
        } else {
            showToast('warning', 'Vui lòng chọn file Excel danh sách container.');
            return;
        }
    }

    if (!contList || contList.length === 0) {
        showToast('warning', 'Không nhận diện được số container nào hợp lệ từ dữ liệu nhập.');
        return;
    }

    if (isNew) {
        // CHẾ ĐỘ TẠO MỚI BOOKING: Lưu vào stagedBookingContainers và hiển thị ngay trên bảng
        stagedBookingContainers = contList;
        window.stagedBookingContainers = stagedBookingContainers;
        
        const totalInp = document.getElementById('fullpage-booking-total-containers');
        if (totalInp) {
            totalInp.value = formatNumberVN(contList.length);
        }

        renderStagedBookingContainers();
        closeImportContainersModal();
        showToast('success', `Đã nạp thành công ${contList.length} container từ Excel vào bảng! Bấm "Lưu" để hoàn tất.`, 'Đã Nạp Excel');
        return;
    }

    // CHẾ ĐỘ SỬA BOOKING ĐÃ CÓ ID: Gửi API lưu trực tiếp vào CSDL
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Đang nạp danh sách...';
    }

    try {
        const rowsPayload = contList.map((c, idx) => ({
            source_line: idx + 1,
            raw: c.container_number,
            container_number: c.container_number,
            container_type: c.container_type || '40HC',
            seal_number: c.seal_number || '',
            gross_weight_kg: c.gross_weight_kg || null,
            delivery_address: c.delivery_loc || '',
            dropoff_loc: c.dropoff_loc || '',
            dem_det: c.dem_det || '',
            tractor_plate: c.tractor_plate || '',
            driver_name: c.driver_name || ''
        }));

        const res = await fetchWithAuth(`/api/gss/bookings/${bookingId}/containers/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: rowsPayload, skip_invalid: true, commit: 1 })
        });

        const data = await res.json();
        if (res.ok && data.success !== false) {
            showToast('success', data.message || `Đã nạp thành công ${contList.length} container vào đơn hàng!`, 'Thành Công');
            closeImportContainersModal();
            if (typeof loadBookingContainersList === 'function') {
                await loadBookingContainersList(bookingId);
            }
        } else {
            showToast('error', data.message || 'Không thể nạp danh sách container.', 'Lỗi Dữ Liệu');
            const prev = document.getElementById('import-containers-preview');
            if (prev) {
                prev.classList.remove('hidden');
                prev.innerHTML = `<span class="text-rose-600 font-bold"><i class="ph-bold ph-warning"></i> ${data.message || 'Lỗi nạp container'}</span>`;
            }
        }
    } catch (e) {
        console.error('Lỗi nạp container:', e);
        showToast('error', 'Đã xảy ra lỗi khi kết nối server: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}
window.submitImportContainers = submitImportContainers;

function downloadSampleContainerExcel() {
    // Tải file Excel mẫu chuẩn 10 trường chuyên nghiệp từ API backend GSS
    // Định dạng: Header màu Teal #0F766E, font Calibri 12pt, border mỏng, số format chuẩn
    try {
        window.location.href = '/api/gss/containers/sample-excel/';
        if (typeof showToast === 'function') {
            showToast('success', 'Đang tải tệp Excel mẫu danh sách 10 trường chuẩn TMS (màu Teal, font Calibri)...');
        }
    } catch (e) {
        console.error('Lỗi tải tệp mẫu Excel:', e);
        if (typeof showToast === 'function') {
            showToast('error', 'Không thể kết nối đến máy chủ để tải file mẫu Excel.');
        }
    }
}
window.downloadSampleContainerExcel = downloadSampleContainerExcel;

async function loadBookingCarriers() {
    if (bookingCarriersList && bookingCarriersList.length > 0) return bookingCarriersList;
    try {
        const res = await fetchWithAuth('/api/master-data/subcontractors/');
        if (res.ok) {
            const data = await res.json();
            bookingCarriersList = (data.results || data || []).filter(s => s.is_active !== false);
            populateBulkCarrierSelect();
        }
    } catch (e) {
        console.warn('Lỗi tải danh mục nhà xe:', e);
    }
    return bookingCarriersList;
}

function populateBulkCarrierSelect() {
    const sel = document.getElementById('fullpage-select-bulk-vendor');
    if (!sel) return;
    let html = '<option value="">-- Chọn Nhà xe đối tác (Vendor) --</option>';
    bookingCarriersList.forEach(s => {
        const label = (s.code ? s.code + ' · ' : '') + (s.short_name || s.name);
        html += `<option value="${s.id}">${label}</option>`;
    });
    sel.innerHTML = html;
}

async function loadBookingContainersList(bookingId) {
    if (!bookingId) return;
    const badge = document.getElementById('fullpage-cont-badge');
    const progressEl = document.getElementById('fullpage-cont-progress');
    const exportTplBtn = document.getElementById('btn-export-alloc-template');

    if (exportTplBtn) {
        exportTplBtn.href = `/api/gss/bookings/${bookingId}/allocation-template/`;
    }

    await loadBookingCarriers();

    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${bookingId}/containers/`);
        if (!res.ok) return;
        const out = await res.json();
        const d = out.data || {};
        const conts = d.containers || [];
        const p = d.progress || {};

        currentBookingContainers = conts;
        selectedBookingContIds.clear();
        updateSelectedContsCount();
        updateContTableSortIcons();

        if (badge) {
            badge.innerText = `${conts.length} Container`;
        }
        if (progressEl && p) {
            progressEl.innerHTML = `Đã phân bổ: <strong class="text-teal-700">${p.allocated || 0}</strong> · Có xe/tài: <strong class="text-indigo-700">${p.assigned_truck || 0}</strong> · Đang chạy: <strong class="text-blue-700">${p.running || 0}</strong> · Đã giao: <strong class="text-amber-700">${p.delivered || 0}</strong> · Hoàn tất: <strong class="text-emerald-700">${p.done || 0}</strong>`;
        }

        // Cập nhật tổng số cont trên form
        const totalInp = document.getElementById('fullpage-booking-total-containers');
        if (totalInp && conts.length > 0) {
            totalInp.value = formatNumberVN(conts.length);
        }

        renderSavedBookingContainers();

    } catch (e) {
        console.error('Lỗi tải danh sách container B/L:', e);
    }
}
window.loadBookingContainersList = loadBookingContainersList;

function renderSavedBookingContainers() {
    const tbody = document.getElementById('fullpage-booking-containers-tbody');
    if (!tbody) return;

    const countBadge = document.getElementById('cont-table-filter-count');
    const masterCheckbox = document.getElementById('check-all-booking-conts');
    const totalConts = (currentBookingContainers || []).length;

    filteredBookingContainers = getFilteredAndSortedContainers(currentBookingContainers || []);

    if (countBadge) {
        countBadge.innerText = `Hiển thị: ${filteredBookingContainers.length}/${totalConts}`;
        if (filteredBookingContainers.length < totalConts) {
            countBadge.className = 'px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold whitespace-nowrap shadow-2xs';
        } else {
            countBadge.className = 'px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold whitespace-nowrap';
        }
    }

    if (masterCheckbox) {
        if (filteredBookingContainers.length > 0 && filteredBookingContainers.every(c => selectedBookingContIds.has(c.id))) {
            masterCheckbox.checked = true;
        } else {
            masterCheckbox.checked = false;
        }
    }

    if (totalConts === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="p-10 text-center text-slate-400 italic">
                    <i class="ph-bold ph-tray text-3xl mb-2 block text-slate-300"></i>
                    Chưa có danh sách container cho B/L này. Bấm nút <strong>"Nhập Từ Excel"</strong> hoặc <strong>"+ Thêm Dòng"</strong> ở trên để nạp danh sách container.
                </td>
            </tr>
        `;
        return;
    }

    if (filteredBookingContainers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="p-10 text-center text-slate-400 italic">
                    <i class="ph-bold ph-funnel-x text-3xl mb-2 block text-slate-300"></i>
                    Không tìm thấy container nào phù hợp với bộ lọc tìm kiếm.
                    <button type="button" onclick="resetContTableFilters()" class="ml-2 text-teal-700 hover:text-teal-900 underline font-bold cursor-pointer">
                        Đặt lại bộ lọc
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    const dropoffLocName = document.getElementById('fullpage-booking-dropoff')?.selectedOptions?.[0]?.text?.replace(/^--.*--$/, '') || '-';
    const deliveryLocName = document.getElementById('fullpage-booking-delivery')?.selectedOptions?.[0]?.text?.replace(/^--.*--$/, '') || '-';

    tbody.innerHTML = filteredBookingContainers.map((c, idx) => {
        const isChecked = selectedBookingContIds.has(c.id);
        const isEditing = editingSavedContId === c.id;
        const hasVendor = Boolean(c.vendor || c.subcontractor_name);
        const hasTrip = Boolean(c.trip_code);
        let vendorName = '<span class="text-slate-400 italic text-xs">Chưa gán</span>';
        let tripDisplay = '<span class="text-slate-400 italic text-xs">Chưa điều độ</span>';

        if (hasVendor) {
            const vLabel = (c.vendor_code ? escapeHtml(c.vendor_code) + ' · ' : '') + escapeHtml(c.vendor || c.subcontractor_name);
            if (hasTrip) {
                vendorName = `<span class="font-bold text-teal-800 text-xs">${vLabel}</span>`;
                const stepCode = (c.step_status || c.dispatch_status || 'READY').toUpperCase();
                const stepLbl = (c.step_label && c.step_label !== 'Sẵn sàng') ? c.step_label : 'Đã Phát lệnh Điều độ';
                const stepColor = stepCode === 'CANCELLED' ? 'text-rose-700' : (stepCode === 'EMPTY_RETURNED' ? 'text-emerald-700' : (stepCode === 'READY' ? 'text-teal-700' : 'text-sky-700'));
                const stepIcon = stepCode === 'CANCELLED' ? 'ph-x-circle' : (stepCode === 'EMPTY_RETURNED' ? 'ph-check-circle' : (stepCode === 'READY' ? 'ph-file-text' : 'ph-truck'));
                tripDisplay = `<span class="font-bold text-slate-800 font-mono text-xs">${escapeHtml(c.trip_code)}</span> · <span class="inline-flex items-center gap-1 text-xs font-bold ${stepColor}"><i class="ph-bold ${stepIcon}"></i>${escapeHtml(stepLbl)}</span>`;
            } else {
                vendorName = `<span class="font-bold text-amber-800 text-xs">${vLabel}</span>`;
                const stText = c.dispatch_status === 'ASSIGNED' ? 'Đã giao cho Nhà xe' : 'Gán dự kiến (Chờ phát lệnh)';
                const stIcon = c.dispatch_status === 'ASSIGNED' ? 'ph-user-check' : 'ph-clock';
                tripDisplay = `<span class="inline-flex items-center gap-1 text-xs font-bold text-amber-700" title="${stText}"><i class="ph-bold ${stIcon}"></i>${stText}</span>`;
            }
        }
        
        let demDet = '-';
        if (c.dem_expiry || c.det_expiry) {
            const demStr = c.dem_expiry ? formatDateVN(c.dem_expiry) : '';
            const detStr = c.det_expiry ? formatDateVN(c.det_expiry) : '';
            if (demStr && detStr && demStr === detStr) {
                demDet = `<span class="font-medium text-slate-700">${demStr}</span>`;
            } else if (demStr && detStr) {
                demDet = `<span class="font-medium text-slate-700">DEM: ${demStr}</span> · <span class="font-medium text-slate-700">DET: ${detStr}</span>`;
            } else {
                demDet = `<span class="font-medium text-slate-700">${demStr || detStr}</span>`;
            }
        } else if (c.dem_expiry_override) {
            demDet = `<span class="font-medium text-slate-700">${formatDateVN(c.dem_expiry_override)}</span>`;
        } else if (c.notes && c.notes.toLowerCase().includes('hạn:')) {
            const match = c.notes.match(/hạn:\s*([^|]+)/i);
            if (match) demDet = `<span class="font-medium text-slate-700">${escapeHtml(match[1].trim())}</span>`;
        }

        const deliveryCol = c.delivery_address || c.delivery_loc || c.delivery_loc_name || deliveryLocName || '-';
        const dropoffCol = c.dropoff_loc || c.dropoff_loc_name || dropoffLocName || '-';

        if (isEditing) {
            return `
                <tr class="bg-amber-50/70 border-2 border-amber-400">
                    <td class="p-2 text-center text-amber-700">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </td>
                    <td class="p-2 text-center font-bold text-amber-900 text-xs">${c.line_no || (idx + 1)}</td>
                    <td class="p-1 min-w-[130px]">
                        <input type="text" id="inline-edit-cont-number-${c.id}" 
                            value="${escapeHtml(c.container_number || '')}" 
                            oninput="this.value = this.value.toUpperCase();"
                            class="w-full h-8 px-2 font-mono font-bold text-teal-900 border border-amber-500 rounded-lg text-xs bg-white focus:ring-1 focus:ring-amber-500 shadow-2xs">
                    </td>
                    <td class="p-1 min-w-[95px]">
                        <select id="inline-edit-cont-type-${c.id}" 
                            class="w-full h-8 px-1.5 font-bold text-slate-700 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                            <option value="40HC" ${(!c.container_type || c.container_type === '40HC') ? 'selected' : ''}>40HC</option>
                            <option value="20GP" ${c.container_type === '20GP' ? 'selected' : ''}>20GP</option>
                            <option value="45HC" ${c.container_type === '45HC' ? 'selected' : ''}>45HC</option>
                            <option value="40GP" ${c.container_type === '40GP' ? 'selected' : ''}>40GP</option>
                            <option value="20RF" ${c.container_type === '20RF' ? 'selected' : ''}>20RF</option>
                            <option value="40RF" ${c.container_type === '40RF' ? 'selected' : ''}>40RF</option>
                        </select>
                    </td>
                    <td class="p-1 min-w-[110px]">
                        <input type="text" id="inline-edit-seal-${c.id}" 
                            value="${escapeHtml(c.seal_number || '')}" 
                            oninput="this.value = this.value.toUpperCase();"
                            placeholder="Số seal"
                            class="w-full h-8 px-2 font-mono text-slate-800 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                    </td>
                    <td class="p-1 min-w-[95px]">
                        <input type="number" id="inline-edit-vgm-${c.id}" 
                            value="${c.gross_weight_kg ? String(c.gross_weight_kg).replace(/\.00$/, '').replace(/\.0$/, '') : ''}" 
                            placeholder="kg"
                            class="w-full h-8 px-2 text-right font-mono font-bold text-slate-800 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                    </td>
                    <td class="p-1 min-w-[140px]">
                        <input type="text" id="inline-edit-delivery-${c.id}" 
                            value="${escapeHtml(c.delivery_address || c.delivery_loc_name || '')}" 
                            placeholder="Địa chỉ giao"
                            class="w-full h-8 px-2 text-slate-800 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                    </td>
                    <td class="p-2 text-slate-600 text-xs truncate max-w-[120px]" title="${escapeHtml(dropoffCol)}">
                        ${escapeHtml(dropoffCol)}
                    </td>
                    <td class="p-1 min-w-[130px]">
                        <input type="date" id="inline-edit-dem-${c.id}" 
                            value="${c.dem_expiry ? c.dem_expiry.slice(0, 10) : ''}" 
                            class="w-full h-8 px-1.5 text-slate-800 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                    </td>
                    <td class="p-2 text-slate-700 text-xs">${vendorName}</td>
                    <td class="p-1 min-w-[130px]">
                        <input type="text" id="inline-edit-truck-${c.id}" 
                            value="${escapeHtml(c.tractor_plate || c.truck_plate || '')}" 
                            oninput="this.value = this.value.toUpperCase();"
                            placeholder="Biển số xe"
                            class="w-full h-8 px-2 font-mono uppercase text-slate-800 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                    </td>
                    <td class="p-1 min-w-[150px]">
                        <input type="text" id="inline-edit-driver-${c.id}" 
                            value="${escapeHtml(c.driver_name || '')}" 
                            placeholder="Tài xế & SĐT"
                            class="w-full h-8 px-2 text-slate-800 border border-amber-500 rounded-lg text-xs bg-white shadow-2xs">
                    </td>
                    <td class="p-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Đang sửa</span>
                    </td>
                    <td class="p-1.5 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="saveSavedContainerRow(${c.id})" 
                                class="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer" title="Lưu thay đổi dòng này">
                                <i class="ph-bold ph-check text-xs"></i> <span>Lưu</span>
                            </button>
                            <button type="button" onclick="cancelSavedContainerRow()" 
                                class="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer" title="Hủy bỏ">
                                <i class="ph-bold ph-x text-xs"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        return `
            <tr class="hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-teal-50/40' : ''}">
                <td class="p-2.5 text-center">
                    <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="toggleSelectContRow(${c.id}, this.checked)" class="rounded w-4 h-4 cursor-pointer text-teal-600">
                </td>
                <td class="p-2.5 text-center font-bold text-slate-400 text-xs">${c.line_no || (idx + 1)}</td>
                <td class="p-2.5">
                    <span class="font-black font-mono text-teal-900 text-xs tracking-wide">${c.container_number}</span>
                    ${c.iso_valid === false ? '<span class="text-[10px] text-amber-600 font-bold ml-1">(Sai ISO)</span>' : ''}
                </td>
                <td class="p-2.5 font-bold text-slate-600">${c.container_type || '40HC'}</td>
                <td class="p-2.5 font-mono text-slate-700 font-medium">${c.seal_number || '-'}</td>
                <td class="p-2.5 text-right font-mono font-bold text-slate-800">${c.gross_weight_kg ? formatVgmKg(c.gross_weight_kg) : '-'}</td>
                <td class="p-2.5 text-slate-700 font-medium truncate max-w-[120px]" title="${escapeHtml(deliveryCol)}">${escapeHtml(deliveryCol)}</td>
                <td class="p-2.5 text-slate-700 font-medium truncate max-w-[120px]" title="${escapeHtml(dropoffCol)}">${escapeHtml(dropoffCol)}</td>
                <td class="p-2.5 text-[11px]">${demDet}</td>
                <td class="p-2.5 font-bold text-slate-800">${vendorName}</td>
                <td class="p-2.5 font-mono text-slate-800 font-bold text-xs">${escapeHtml(c.tractor_plate || c.truck_plate || '-')}</td>
                <td class="p-2.5 text-slate-700 text-xs">${escapeHtml(c.driver_name || '-')}</td>
                <td class="p-2.5">${tripDisplay}</td>
                <td class="p-2.5 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="editSavedContainerRow(${c.id})" 
                            class="p-1.5 rounded-lg text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors cursor-pointer" title="Sửa dòng container này">
                            <i class="ph-bold ph-pencil-simple text-sm"></i>
                        </button>
                        <button type="button" onclick="deleteSavedContainerRow(${c.id}, '${escapeHtml(c.container_number)}')" 
                            class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer" title="Xóa container này khỏi đơn hàng">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                        ${c.trip_code ? `
                            <button type="button" onclick="if(window.viewTripDetail)viewTripDetail('${c.trip_code}')" class="p-1 rounded text-teal-700 hover:bg-teal-100" title="Xem chuyến">
                                <i class="ph-bold ph-arrow-square-out text-sm"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
window.renderSavedBookingContainers = renderSavedBookingContainers;

function toggleSelectContRow(id, checked) {
    if (checked) {
        selectedBookingContIds.add(id);
    } else {
        selectedBookingContIds.delete(id);
    }
    
    // Đồng bộ master checkbox
    const master = document.getElementById('check-all-booking-conts');
    if (master && filteredBookingContainers.length > 0) {
        master.checked = filteredBookingContainers.every(c => selectedBookingContIds.has(c.id));
    }
    updateSelectedContsCount();
}
window.toggleSelectContRow = toggleSelectContRow;

function toggleSelectStagedContRow(idx, checked) {
    if (checked) {
        selectedStagedContIndices.add(idx);
    } else {
        selectedStagedContIndices.delete(idx);
    }
    updateSelectedContsCount();
}
window.toggleSelectStagedContRow = toggleSelectStagedContRow;

function toggleSelectAllBookingConts(master) {
    const isChecked = master.checked;
    const bookingId = document.getElementById('fullpage-booking-id')?.value;

    if (!bookingId) {
        // Chế độ tạm (staged)
        selectedStagedContIndices.clear();
        const targetList = (filteredBookingContainers.length > 0) ? filteredBookingContainers : stagedBookingContainers;
        if (isChecked && targetList) {
            targetList.forEach((_, i) => selectedStagedContIndices.add(i));
        }
    } else {
        // Chế độ đã lưu (saved): Chọn / bỏ chọn trên danh sách filteredBookingContainers đang hiển thị
        const targetList = (filteredBookingContainers.length > 0) ? filteredBookingContainers : (currentBookingContainers || []);
        if (isChecked) {
            targetList.forEach(c => selectedBookingContIds.add(c.id));
        } else {
            targetList.forEach(c => selectedBookingContIds.delete(c.id));
        }
    }

    const tbody = document.getElementById('fullpage-booking-containers-tbody');
    if (tbody) {
        tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
    }
    updateSelectedContsCount();
}
window.toggleSelectAllBookingConts = toggleSelectAllBookingConts;

function updateSelectedContsCount() {
    const lbl = document.getElementById('fullpage-cont-selected-count');
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    const count = !bookingId ? selectedStagedContIndices.size : selectedBookingContIds.size;
    if (lbl) {
        lbl.innerText = `Đã chọn: ${count} cont`;
    }
}
window.updateSelectedContsCount = updateSelectedContsCount;

async function doAssignBulkContainers() {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    const vendorId = document.getElementById('fullpage-select-bulk-vendor')?.value;

    if (!vendorId) {
        showToast('warning', 'Vui lòng chọn Nhà xe đối tác trong danh sách trước khi bấm Giao.');
        return;
    }

    if (!bookingId) {
        // CHẾ ĐỘ TẠO MỚI (STAGED):
        if (!stagedBookingContainers || stagedBookingContainers.length === 0) {
            showToast('warning', 'Chưa có container nào trong bảng. Bấm "+ Thêm Dòng" hoặc "Nhập Từ Excel" trước.');
            return;
        }

        const targetIndices = selectedStagedContIndices.size > 0 
            ? Array.from(selectedStagedContIndices) 
            : stagedBookingContainers.map((_, i) => i);

        targetIndices.forEach(idx => {
            if (stagedBookingContainers[idx]) {
                stagedBookingContainers[idx].vendor_id = vendorId;
            }
        });

        window.stagedBookingContainers = stagedBookingContainers;
        renderStagedBookingContainers();
        showToast('success', `Đã gán tạm Nhà xe (dự kiến) cho ${targetIndices.length} cont! Bấm "Lưu" để lưu. Điều độ viên sẽ duyệt và phát lệnh.`, 'Gán Tạm Thành Công');
        return;
    }

    // CHẾ ĐỘ ĐƠN HÀNG ĐÃ LƯU:
    const list = Array.from(selectedBookingContIds);
    if (!list.length) {
        showToast('warning', 'Vui lòng tích chọn ít nhất 1 container trên bảng để gán Nhà xe.');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${bookingId}/containers/assign/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_ids: list,
                subcontractor_id: Number(vendorId)
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || `Đã gán tạm ${list.length} container cho Nhà xe (Dự kiến). Điều độ viên sẽ lập lệnh và phát lệnh chính thức.`, 'Gán Tạm Thành Công');
            await loadBookingContainersList(bookingId);
        } else {
            showToast('error', data.message || 'Lỗi khi phân bổ container cho nhà xe.');
        }
    } catch (e) {
        console.error('Lỗi phân bổ cont:', e);
        showToast('error', 'Lỗi kết nối khi phân bổ container: ' + e.message);
    }
}
window.doAssignBulkContainers = doAssignBulkContainers;

async function doUnassignBulkContainers() {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;

    if (!bookingId) {
        // CHẾ ĐỘ TẠO MỚI: Bỏ phân bổ cho các cont staged
        if (!stagedBookingContainers || stagedBookingContainers.length === 0) return;
        const targetIndices = selectedStagedContIndices.size > 0 
            ? Array.from(selectedStagedContIndices) 
            : stagedBookingContainers.map((_, i) => i);

        targetIndices.forEach(idx => {
            if (stagedBookingContainers[idx]) {
                stagedBookingContainers[idx].vendor_id = '';
            }
        });
        window.stagedBookingContainers = stagedBookingContainers;
        renderStagedBookingContainers();
        showToast('success', `Đã hủy gán tạm cho ${targetIndices.length} cont!`, 'Thành Công');
        return;
    }

    const list = Array.from(selectedBookingContIds);
    if (!list.length) {
        showToast('warning', 'Vui lòng tích chọn container cần bỏ phân bổ.');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${bookingId}/containers/assign/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_ids: list,
                subcontractor_id: null
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', 'Đã hủy phân bổ các container đã chọn.', 'Thành Công');
            await loadBookingContainersList(bookingId);
        } else {
            showToast('error', data.message || 'Lỗi khi bỏ phân bổ.');
        }
    } catch (e) {
        showToast('error', 'Lỗi kết nối khi bỏ phân bổ container.');
    }
}
window.doUnassignBulkContainers = doUnassignBulkContainers;

// =========================================================================
// CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN) CHO BẢNG CONTAINER (HỖ TRỢ 100+ CONT)
// =========================================================================
function toggleFullscreenContainersTable() {
    const section = document.getElementById('fullpage-booking-containers-section');
    const btnIcon = document.getElementById('btn-fullscreen-containers-icon');
    const btnText = document.getElementById('btn-fullscreen-containers-text');
    const tableWrap = document.getElementById('fullpage-booking-containers-table-wrap');
    if (!section) return;

    isContTableFullscreen = !isContTableFullscreen;
    window.isContTableFullscreen = isContTableFullscreen;

    if (isContTableFullscreen) {
        section.classList.add('fixed', 'inset-0', 'z-[80]', 'bg-white', 'p-6', 'overflow-hidden', 'flex', 'flex-col', 'm-0', 'rounded-none', 'shadow-2xl');
        section.style.height = '100vh';
        section.style.maxHeight = '100vh';
        document.body.classList.add('overflow-hidden');
        if (btnIcon) btnIcon.className = 'ph-bold ph-corners-in text-sm text-teal-700';
        if (btnText) btnText.innerText = 'Thu Gọn (Esc)';
        if (tableWrap) {
            tableWrap.classList.remove('max-h-[640px]');
            tableWrap.classList.add('flex-1', 'overflow-y-auto', 'max-h-[calc(100vh-210px)]');
        }
        showToast('info', 'Đã mở rộng toàn màn hình. Nhấn phím Esc hoặc nút Thu Gọn để trở lại.');
    } else {
        section.classList.remove('fixed', 'inset-0', 'z-[80]', 'z-50', 'bg-white', 'p-6', 'overflow-hidden', 'm-0', 'rounded-none', 'shadow-2xl');
        section.style.height = '';
        section.style.maxHeight = '';
        document.body.classList.remove('overflow-hidden');
        if (btnIcon) btnIcon.className = 'ph-bold ph-corners-out text-sm text-teal-600';
        if (btnText) btnText.innerText = 'Toàn Màn Hình';
        if (tableWrap) {
            tableWrap.classList.remove('flex-1', 'max-h-[calc(100vh-210px)]');
            tableWrap.classList.add('max-h-[640px]');
        }
    }
}
window.toggleFullscreenContainersTable = toggleFullscreenContainersTable;

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isContTableFullscreen) {
        toggleFullscreenContainersTable();
    }
});

async function handleAllocExcelUpload(input) {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    if (!bookingId || !input.files || !input.files[0]) return;

    const fd = new FormData();
    fd.append('file', input.files[0]);

    try {
        showToast('info', 'Đang tải lên và xử lý file phân bổ...');
        const res = await fetchWithAuth(`/api/gss/bookings/${bookingId}/allocation-import/`, {
            method: 'POST',
            body: fd
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã import phân bổ container thành công!', 'Thành Công');
            loadBookingContainersList(bookingId);
        } else {
            showToast('error', data.message || 'Lỗi khi import file phân bổ Excel.');
        }
    } catch (e) {
        showToast('error', 'Lỗi kết nối khi import Excel.');
    } finally {
        input.value = '';
    }
}
window.handleAllocExcelUpload = handleAllocExcelUpload;

function printDispatchOrderSlip(bookingId = null, vendorId = null) {
    const bId = bookingId 
        || (typeof mdoCurrentBooking !== 'undefined' && mdoCurrentBooking?.id) 
        || (typeof currentActiveFullpageBooking !== 'undefined' && currentActiveFullpageBooking?.id)
        || document.getElementById('fullpage-booking-id')?.value
        || document.getElementById('mdo-booking-select')?.value;
    if (!bId) {
        showToast('warning', 'Vui lòng chọn hoặc lưu booking trước khi in lệnh.');
        return;
    }
    let url = `/api/gss/bookings/${bId}/dispatch-order/`;
    if (vendorId) {
        url += `?vendor=${encodeURIComponent(vendorId)}`;
    }
    window.open(url, '_blank', 'noopener');
}
window.printDispatchOrderSlip = printDispatchOrderSlip;

function editSavedContainerRow(contId) {
    editingSavedContId = contId;
    window.editingSavedContId = contId;
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    if (bookingId && typeof loadBookingContainersList === 'function') {
        loadBookingContainersList(bookingId);
    }
}
window.editSavedContainerRow = editSavedContainerRow;

function cancelSavedContainerRow() {
    editingSavedContId = null;
    window.editingSavedContId = null;
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    if (bookingId && typeof loadBookingContainersList === 'function') {
        loadBookingContainersList(bookingId);
    }
}
window.cancelSavedContainerRow = cancelSavedContainerRow;

async function saveSavedContainerRow(contId) {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    const contNumInp = document.getElementById(`inline-edit-cont-number-${contId}`);
    const typeSel = document.getElementById(`inline-edit-cont-type-${contId}`);
    const sealInp = document.getElementById(`inline-edit-seal-${contId}`);
    const vgmInp = document.getElementById(`inline-edit-vgm-${contId}`);
    const delivInp = document.getElementById(`inline-edit-delivery-${contId}`);
    const demInp = document.getElementById(`inline-edit-dem-${contId}`);
    const truckInp = document.getElementById(`inline-edit-truck-${contId}`);
    const driverInp = document.getElementById(`inline-edit-driver-${contId}`);

    const payload = {};
    if (truckInp) {
        payload.tractor_plate = truckInp.value.trim().toUpperCase();
    }
    if (driverInp) {
        payload.driver_name = driverInp.value.trim();
    }
    if (contNumInp && contNumInp.value) {
        payload.container_number = contNumInp.value.trim().toUpperCase();
    }
    if (typeSel) payload.container_type = typeSel.value;
    if (sealInp) payload.seal_number = sealInp.value.trim().toUpperCase();
    if (vgmInp && vgmInp.value) {
        payload.gross_weight_kg = Number(vgmInp.value);
    }
    if (delivInp) payload.delivery_address = delivInp.value.trim();
    if (demInp && demInp.value) {
        payload.dem_expiry_override = demInp.value;
    }

    try {
        const res = await fetchWithAuth(`/api/gss/containers/${contId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success !== false) {
            showToast('success', data.message || 'Đã lưu cập nhật container thành công!', 'Đã Lưu');
            editingSavedContId = null;
            window.editingSavedContId = null;
            if (bookingId && typeof loadBookingContainersList === 'function') {
                await loadBookingContainersList(bookingId);
            }
        } else {
            showToast('error', data.message || 'Không thể lưu thay đổi container.', 'Lỗi Lưu');
        }
    } catch (e) {
        console.error('Lỗi lưu container:', e);
        showToast('error', 'Lỗi khi lưu container: ' + e.message);
    }
}
window.saveSavedContainerRow = saveSavedContainerRow;

async function deleteSavedContainerRow(contId, contNumber) {
    const targetCont = (window.loadedBookingContainers || []).find(c => String(c.id) === String(contId));
    if (targetCont && targetCont.step_status && !['READY', 'CANCELLED', ''].includes(targetCont.step_status)) {
        showToast('error', `Container "${contNumber}" đã phát sinh hành trình chạy thực tế, không thể xóa khỏi đơn hàng!`);
        return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa container "${contNumber || ''}" khỏi đơn hàng này?`)) return;
    const bookingId = document.getElementById('fullpage-booking-id')?.value;

    try {
        const res = await fetchWithAuth(`/api/gss/containers/${contId}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Người dùng xóa từ bảng danh sách container' })
        });
        const data = await res.json();
        if (res.ok && data.success !== false) {
            showToast('success', data.message || `Đã xóa container ${contNumber} thành công!`, 'Đã Xóa');
            if (bookingId && typeof loadBookingContainersList === 'function') {
                await loadBookingContainersList(bookingId);
            }
        } else {
            showToast('error', data.message || 'Không thể xóa container này.');
        }
    } catch (e) {
        console.error('Lỗi xóa container:', e);
        showToast('error', 'Lỗi khi xóa container: ' + e.message);
    }
}
window.deleteSavedContainerRow = deleteSavedContainerRow;
