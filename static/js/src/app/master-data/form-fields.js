function injectMasterDataModalFields(data) {
    const container = document.getElementById('md-modal-fields-container');
    if (!container) return;

    const d = data || {};

    if (currentMasterDataTab === 'company') {
        container.innerHTML = `
            <div class="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl mb-3 flex items-center space-x-2.5 text-xs text-teal-900 font-medium">
                <i class="ph-bold ph-info text-base text-teal-700 shrink-0"></i>
                <span>Thông tin Khai Báo Hệ Thống sẽ được sử dụng trên toàn bộ Báo giá, Đơn đặt hàng, Biên bản giao nhận POD và Hóa đơn quyết toán.</span>
            </div>

            <!-- Group 1: Pháp lý & Định danh -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pb-1 border-b border-slate-200">1. Pháp Lý & Định Danh Doanh Nghiệp</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Pháp Nhân Đầy Đủ <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-name" value="${escapeHtml(d.company_name || '')}" placeholder="VD: CÔNG TY TNHH VẬN TẢI TRIỀN VÕ" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Thương Hiệu / Viết Tắt</label>
                    </div>
                    <input type="text" id="mdf-cp-short-name" value="${escapeHtml(d.short_name || '')}" placeholder="VD: TRIỀN VÕ LOGISTICS" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-700 w-full">
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-tax-code" value="${escapeHtml(d.tax_code || '')}" placeholder="VD: 0312345678" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Giấy Phép KD Vận Tải</label>
                    </div>
                    <input type="text" id="mdf-cp-license" value="${escapeHtml(d.operating_license || '')}" placeholder="VD: GP-VT-2024/TPHCM" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Đại Diện & Chức Vụ</label>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <input type="text" id="mdf-cp-rep-name" value="${escapeHtml(d.representative_name || '')}" placeholder="Họ tên" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-2/3">
                        <input type="text" id="mdf-cp-rep-role" value="${escapeHtml(d.representative_role || 'Giám Đốc')}" placeholder="Chức vụ" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-1/3">
                    </div>
                </div>
            </div>

            <!-- Group 2: Trụ sở & Liên hệ -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">2. Trụ Sở & Thông Tin Liên Hệ</div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Trụ Sở Chính (Đăng ký KD) <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-cp-address" value="${escapeHtml(d.address || '')}" placeholder="VD: Số 123 Đường Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7, TP. HCM" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full" required>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline / Điện Thoại <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-phone" value="${escapeHtml(d.phone || '')}" placeholder="VD: 0903.123.456" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-emerald-700 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Liên Hệ</label>
                    </div>
                    <input type="email" id="mdf-cp-email" value="${escapeHtml(d.email || '')}" placeholder="VD: contact@trienvo.com" class="form-input h-8.5 px-2.5 py-1 text-xs text-blue-700 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Website Công Ty</label>
                    </div>
                    <input type="text" id="mdf-cp-website" value="${escapeHtml(d.website || '')}" placeholder="VD: https://trienvo.com" class="form-input h-8.5 px-2.5 py-1 text-xs text-teal-700 w-full">
                </div>
            </div>

            <!-- Group 3: Chi nhánh & Văn phòng -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">3. Chi Nhánh & Văn Phòng Đại Diện</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Chi Nhánh / Văn Phòng Đại Diện</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-name" value="${escapeHtml(d.branch_name || '')}" placeholder="VD: Chi Nhánh Hải Phòng / Văn Phòng Kho Sóng Thần" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Điện Thoại Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-phone" value="${escapeHtml(d.branch_phone || '')}" placeholder="VD: 0225.3123.456" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-12">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-address" value="${escapeHtml(d.branch_address || '')}" placeholder="VD: Lô CN-02, KCN Đình Vũ, P. Đông Hải 2, Q. Hải An, Hải Phòng" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 4: Bãi xe & Trạm điều phối -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">4. Bãi Đỗ Xe & Trạm Điều Phối Đầu Kéo</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Bãi Xe / Depot Tập Kết</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-name" value="${escapeHtml(d.fleet_yard_name || '')}" placeholder="VD: Bãi Xe Trung Tâm Sóng Thần - Dĩ An" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline Điều Phối Trực Bãi</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-hotline" value="${escapeHtml(d.fleet_yard_hotline || '')}" placeholder="VD: 0918.888.999" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 w-full">
                </div>
                <div class="md:col-span-12">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Bãi Đỗ & Trạm Điều Phối</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-address" value="${escapeHtml(d.fleet_yard_address || '')}" placeholder="VD: Đường ĐT743, KCN Sóng Thần 1, Dĩ An, Bình Dương" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 5: Ngân hàng -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">5. Tài Khoản Ngân Hàng Giao Dịch</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-acc" value="${escapeHtml(d.bank_account_number || '')}" placeholder="VD: 19030000000001" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-name" value="${escapeHtml(d.bank_name || '')}" placeholder="VD: Ngân hàng Techcombank" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-branch" value="${escapeHtml(d.bank_branch || '')}" placeholder="VD: Chi nhánh Nam Sài Gòn" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 6: Tham số hệ thống -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">6. Tham Số Vận Hành & Tính Cước Mặc Định</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Thuế VAT Mặc Định (%)</label>
                    </div>
                    <input type="number" id="mdf-cp-vat" value="${d.default_vat_rate || 8}" step="0.1" min="0" max="100" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Giá Dầu Tham Chiếu (VNĐ/Lít)</label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-cp-fuel-price" value="${d.fuel_reference_price ? formatNumberVN(d.fuel_reference_price) : '21.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 text-right w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mẫu Số Quy Đổi CBM</label>
                    </div>
                    <input type="number" id="mdf-cp-cbm-divisor" value="${d.cbm_formula_divisor || 5000}" step="100" min="1000" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 text-center w-full">
                </div>
            </div>

            <!-- Group 7: Ghi chú & Chính sách -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">7. Ghi Chú & Chính Sách Vận Hành Toàn Hệ Thống</div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Vận Hành / Tiêu Chuẩn Phục Vụ</label>
                </div>
                <textarea id="mdf-cp-notes" rows="2" placeholder="VD: Áp dụng phụ phí nâng hạ ngoài giờ sau 18h; Quy định kiểm tra seal nguyên vẹn trước khi kéo..." class="form-input px-2.5 py-1.5 text-xs text-slate-800 w-full">${escapeHtml(d.notes || '')}</textarea>
            </div>
        `;
    } else if (currentMasterDataTab === 'driver_tariffs') {
        const areas = ['Khu Vực Củ Chi', 'Khu Vực Long An', 'Khu Vực Tây Ninh', 'Khu Vực Bình Dương', 'Khu Vực Đồng Nai', 'Khu Vực TP.HCM', 'Khu Vực Vũng Tàu', 'Tuyến Đặc Thù'];
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Khu Vực Kho <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-area-group" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        ${areas.map(a => `<option value="${a}" ${d.area_group === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Tuyến / KCN / Nhà Máy <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-route-name" value="${d.route_name || ''}" placeholder="VD: KCN Phước Đông, KCN Bàu Bàng..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Trục Lấy / Hạ Cont Chuẩn</label>
                </div>
                <input type="text" id="mdf-pickup-drop" value="${d.pickup_drop_area || 'Cát Lái, SPITC, Thủ Đức, Tân Vạn, Sóng Thần, VICT, Q4, Q7'}" placeholder="Cát Lái, SPITC, Thủ Đức..." class="form-input h-8.5 px-2.5 py-1 text-xs font-medium text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Cự Ly Ước Tính (km)</label>
                        <span class="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Bước 10km</span>
                    </div>
                    <input type="number" id="mdf-estimated-km" value="${d.estimated_km || 30}" step="10" min="0" onchange="roundEstimatedKmInput(this)" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                    <div class="flex items-center gap-1 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span class="text-[10px] text-slate-400 font-semibold">Nhanh:</span>
                        <button type="button" onclick="setTariffKm(20)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">20k</button>
                        <button type="button" onclick="setTariffKm(30)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">30k</button>
                        <button type="button" onclick="setTariffKm(50)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">50k</button>
                        <button type="button" onclick="setTariffKm(70)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">70k</button>
                        <button type="button" onclick="setTariffKm(100)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">100k</button>
                    </div>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mức Lương Chuyến (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-salary-rate" value="${d.salary_rate ? formatNumberVN(d.salary_rate) : '600.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 text-right w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy/hạ Cát Lái + 50k..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động / áp dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'allowances') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Phụ Cấp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CANG_HIEP_PHUOC" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại</label>
                    </div>
                    <select id="mdf-category" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="PORT" ${d.category === 'PORT' ? 'selected' : ''}>Phụ Thêm Cảng Xa</option>
                        <option value="INSPECTION" ${d.category === 'INSPECTION' ? 'selected' : ''}>Phụ Thu Kiểm Hóa</option>
                        <option value="OPERATION" ${d.category === 'OPERATION' ? 'selected' : ''}>Phụ Cấp Tác Nghiệp Đặc Thù</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Phụ Cấp / Tác Nghiệp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phụ thêm Cảng Cái Mép..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tiền Phụ Cấp (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-amount" value="${d.amount ? formatNumberVN(d.amount) : '500.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy hoặc hạ cont tại Cảng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động / áp dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'locations') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Địa Điểm <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CAT_LAI, KHO_WCA..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại</label>
                    </div>
                    <select id="mdf-location-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="PORT" ${d.location_type === 'PORT' ? 'selected' : ''}>Cảng Biển</option>
                        <option value="ICD" ${d.location_type === 'ICD' ? 'selected' : ''}>Cảng Cạn (ICD)</option>
                        <option value="DEPOT" ${d.location_type === 'DEPOT' ? 'selected' : ''}>Bãi Rỗng / Depot</option>
                        <option value="WAREHOUSE" ${d.location_type === 'WAREHOUSE' ? 'selected' : ''}>Kho Hàng / Nhà Máy</option>
                        <option value="YARD" ${d.location_type === 'YARD' ? 'selected' : ''}>Bãi Đỗ Xe Công Ty</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Địa Điểm <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Cảng Cát Lái, Kho WCA Tân Vạn..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tỉnh / Thành Phố</label>
                    </div>
                    <input type="text" id="mdf-province" value="${d.province || 'TP. Hồ Chí Minh'}" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Chi Tiết</label>
                    </div>
                    <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Số nhà, đường, phường, quận/huyện..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Liên Hệ</label>
                    </div>
                    <input type="text" id="mdf-contact-phone" value="${d.contact_phone || ''}" placeholder="SĐT điều độ..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Phụ Trách / Đầu Mối</label>
                    </div>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự phụ trách..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Vận Hành</label>
                    </div>
                    <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Giờ làm việc kho, quy định vào cổng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'customers') {
        const group = d.customer_group || 'COMMERCIAL_TRADING';
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Khách Hàng</label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="Tự sinh nếu để trống" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST)</label>
                    </div>
                    <input type="text" id="mdf-tax-code" value="${d.tax_code || ''}" placeholder="MST doanh nghiệp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nhóm Khách Hàng <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-customer-group" class="form-select h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                        <option value="COMMERCIAL_TRADING" ${group === 'COMMERCIAL_TRADING' ? 'selected' : ''}>Thương mại / XNK</option>
                        <option value="FDI_ENTERPRISE" ${group === 'FDI_ENTERPRISE' ? 'selected' : ''}>Doanh nghiệp FDI / Nhà máy</option>
                        <option value="FORWARDER_LOGISTICS" ${group === 'FORWARDER_LOGISTICS' ? 'selected' : ''}>Đại lý 3PL / Forwarder</option>
                        <option value="DOMESTIC_FACTORY" ${group === 'DOMESTIC_FACTORY' ? 'selected' : ''}>Nhà máy nội địa</option>
                        <option value="WALK_IN_RETAIL" ${group === 'WALK_IN_RETAIL' ? 'selected' : ''}>Khách lẻ / Vãng lai</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Khách Hàng / Doanh Nghiệp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="Tên đầy đủ theo giấy phép ĐKKD..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Viết Tắt</label>
                    </div>
                    <input type="text" id="mdf-short-name" value="${d.short_name || ''}" placeholder="VD: ABC, OASIS..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50/40 border border-teal-300 rounded-md w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Xuất Hóa Đơn / Văn Phòng <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Địa chỉ đăng ký kinh doanh..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Công Ty (Nhận HĐĐT / Công Nợ)</label>
                    </div>
                    <input type="email" id="mdf-company-email" value="${d.company_email || ''}" placeholder="ketoan@company.com..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-3">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Phụ Trách</label>
                    </div>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-3">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chức Vụ</label>
                    </div>
                    <input type="text" id="mdf-contact-title" value="${d.contact_title || ''}" placeholder="VD: Trưởng phòng XNK..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Liên Hệ</label>
                    </div>
                    <input type="text" id="mdf-phone" value="${d.phone || ''}" placeholder="SĐT liên hệ..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Người Liên Hệ (Vận Hành / Booking)</label>
                    </div>
                    <input type="email" id="mdf-contact-email" value="${d.contact_email || ''}" placeholder="ops@company.com..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-bank-acc" value="${d.bank_account_number || ''}" placeholder="Số tài khoản..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-bank-name" value="${d.bank_name || ''}" placeholder="VD: Vietcombank, ACB..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chi Nhánh Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-bank-branch" value="${d.bank_branch || ''}" placeholder="VD: CN Tân Bình..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Chủ Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-bank-holder" value="${d.bank_account_holder || ''}" placeholder="Tên in hoa trên thẻ..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Kỳ Hạn Thanh Toán (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-payment-term" value="${d.payment_term_days || 30}" min="0" step="1" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Mức Nợ Tối Đa (VNĐ)</label>
                    </div>
                    <input type="text" id="mdf-credit-limit" value="${d.credit_limit ? formatNumberVN(d.credit_limit) : '0'}" placeholder="0 = Không giới hạn" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú & Điều Kiện Vận Hành / Hợp Đồng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Chính sách công nợ, quy định giao nhận, an toàn kho..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
        `;
    } else if (currentMasterDataTab === 'tariffs') {
        const customers = masterDataFormOptionsCache?.customers || masterDataCache['customers'] || [];
        const pickupOpts = masterDataFormOptionsCache?.locations?.pickup_options || masterDataCache['locations'] || [];
        const warehouseOpts = masterDataFormOptionsCache?.locations?.warehouse_options || masterDataCache['locations'] || [];
        const dropoffOpts = masterDataFormOptionsCache?.locations?.dropoff_options || masterDataCache['locations'] || [];
        const contSizes = ['40HC', '20DC', '45G1', '40GP', '20RF', '40RF', 'XE_TAI_10T', 'XE_TAI_2T'];
        container.innerHTML = `
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Khách Hàng Áp Dụng <span class="text-rose-500">*</span></label>
                </div>
                <select id="mdf-customer-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                    <option value="">-- Chọn Khách Hàng --</option>
                    ${customers.map(c => `<option value="${c.id}" ${d.customer_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate flex items-center gap-1">
                            <i class="ph-bold ph-map-pin text-teal-600"></i>
                            1. Khu Vực Đi / Lấy Cont
                        </label>
                    </div>
                    <input type="text" id="mdf-origin-zone" list="mdf-origin-zones-list" value="${d.origin_zone || ''}" placeholder="VD: Cát Lái, Cái Mép, Hiệp Phước..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-900 w-full">
                    <datalist id="mdf-origin-zones-list">
                        <option value="Cát Lái (TP.HCM)">
                        <option value="Cái Mép (Vũng Tàu)">
                        <option value="Hiệp Phước (Nhà Bè)">
                        <option value="SPITC / Phú Hữu">
                        <option value="Sóng Thần / Dĩ An">
                        <option value="Bãi Triền Võ (TVL)">
                    </datalist>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate flex items-center gap-1">
                            <i class="ph-bold ph-flag-pennant text-teal-600"></i>
                            2. Khu Vực Đến / Giao Hàng
                        </label>
                    </div>
                    <input type="text" id="mdf-dest-zone" list="mdf-dest-zones-list" value="${d.destination_zone || ''}" placeholder="VD: VSIP, Bàu Bàng, Trảng Bàng, Bến Lức..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-900 w-full">
                    <datalist id="mdf-dest-zones-list">
                        <option value="Bình Dương (VSIP/Bàu Bàng/Mỹ Phước)">
                        <option value="Đồng Nai (Biên Hòa/Nhơn Trạch/Long Thành)">
                        <option value="Tây Ninh (Trảng Bàng/Phước Đông)">
                        <option value="Long An (Bến Lức/Đức Hòa/Tân An)">
                        <option value="Củ Chi / Hóc Môn / TP.HCM">
                        <option value="Vũng Tàu / Phú Mỹ">
                    </datalist>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nơi Lấy (Cảng / ICD) <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-pickup" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-teal-900 w-full" required>
                        <option value="">-- Chọn Nơi Lấy --</option>
                        ${pickupOpts.map(l => `<option value="${l.name}" ${d.pickup_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Kho Nhận (Nhà Máy / Kho) <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-delivery" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-amber-900 w-full" required>
                        <option value="">-- Chọn Kho Nhận --</option>
                        ${warehouseOpts.map(l => `<option value="${l.name}" ${d.delivery_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nơi Hạ Cont (Bãi / Cảng)</label>
                    </div>
                    <select id="mdf-dropoff" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-emerald-900 w-full">
                        <option value="">-- Chọn Nơi Hạ --</option>
                        ${dropoffOpts.map(l => `<option value="${l.name}" ${d.dropoff_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Quy Cách Cont / Phương Tiện</label>
                    </div>
                    <select id="mdf-container-size" class="form-select h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full">
                        ${contSizes.map(s => `<option value="${s}" ${(d.container_size || '40HC') === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Cự Ly Ước Tính (km)</label>
                        <span class="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Bước 10km</span>
                    </div>
                    <input type="text" id="mdf-estimated-km" value="${d.estimated_km || 30}" onchange="roundEstimatedKmInput(this)" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center input-number-vn w-full" placeholder="VD: 30">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Đơn Giá Cước (HĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-price" value="${d.freight_price ? formatNumberVN(d.freight_price) : '4.000.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" placeholder="VD: 4.000.000" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Lương Chuyến Tài Xế <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-pay" value="${d.driver_trip_pay ? formatNumberVN(d.driver_trip_pay) : '600.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 text-right input-number-vn w-full" placeholder="VD: 600.000" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Vé BOT / Cầu Đường Chuẩn</label>
                    </div>
                    <input type="text" id="mdf-toll" value="${d.toll_standard_fee ? formatNumberVN(d.toll_standard_fee) : '0'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 text-right input-number-vn w-full" placeholder="VD: 150.000">
                </div>
            </div>
        `;
        if (d.pickup_location) setSelectValueCaseInsensitive(document.getElementById('mdf-pickup'), d.pickup_location);
        if (d.delivery_location) setSelectValueCaseInsensitive(document.getElementById('mdf-delivery'), d.delivery_location);
        if (d.dropoff_location) setSelectValueCaseInsensitive(document.getElementById('mdf-dropoff'), d.dropoff_location);
    } else if (currentMasterDataTab === 'expenses') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Khoản Chi <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: LIFT_ON, TOLL_FEE..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nhóm Chi Phí</label>
                    </div>
                    <select id="mdf-group-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="TOLL" ${d.group_type === 'TOLL' ? 'selected' : ''}>Vé Cầu Đường / BOT</option>
                        <option value="LIFT_ON" ${d.group_type === 'LIFT_ON' ? 'selected' : ''}>Nâng Cont</option>
                        <option value="LIFT_OFF" ${d.group_type === 'LIFT_OFF' ? 'selected' : ''}>Hạ Cont</option>
                        <option value="DEPOSIT" ${d.group_type === 'DEPOSIT' ? 'selected' : ''}>Cược Container</option>
                        <option value="WEIGHING" ${d.group_type === 'WEIGHING' ? 'selected' : ''}>Cân Xe</option>
                        <option value="LABOR" ${d.group_type === 'LABOR' ? 'selected' : ''}>Bốc Xếp / Bồi Dưỡng</option>
                        <option value="EINVOICE" ${d.group_type === 'EINVOICE' ? 'selected' : ''}>Hóa Đơn Điện Tử Cảng</option>
                        <option value="OTHER" ${d.group_type === 'OTHER' ? 'selected' : ''}>Chi Phí Khác</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Khoản Mục Chi Phí <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phí nâng cont, Vé BOT..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Định Mức Tiền Ngầm Định (VNĐ)</label>
                    </div>
                    <input type="text" id="mdf-default-amount" value="${d.default_amount ? formatNumberVN(d.default_amount) : '0'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" placeholder="VD: 100.000">
                </div>
                <div class="md:col-span-6 flex items-center pt-6 space-x-2">
                    <input type="checkbox" id="mdf-requires-invoice" ${d.requires_invoice ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                    <label for="mdf-requires-invoice" class="text-xs font-bold text-slate-700 cursor-pointer">Bắt buộc có HĐĐT / Mã tra cứu</label>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú & Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Quy định thanh toán, chứng từ thanh toán..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang sử dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'containers') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Quy Cách <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: 40HC, 20DC, TAI_10T..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại Phương Tiện / Thùng</label>
                    </div>
                    <select id="mdf-category" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="CONTAINER" ${d.category === 'CONTAINER' ? 'selected' : ''}>Container Đường Biển</option>
                        <option value="TRUCK" ${d.category === 'TRUCK' ? 'selected' : ''}>Xe Tải Thùng / Đường Bộ</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Quy Cách / Tên Loại Thùng <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Container 40ft Cao (40HC)..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hệ Số TEU</label>
                    </div>
                    <input type="number" id="mdf-teu" value="${d.teu_factor !== undefined ? d.teu_factor : 2.0}" step="0.25" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-payload" value="${d.max_payload_kg ? formatNumberVN(d.max_payload_kg) : '30.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 30.000">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Thể Tích Chứa (CBM)</label>
                    </div>
                    <input type="number" id="mdf-cbm" value="${d.cbm_capacity || 67}" step="0.5" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'vehicles') {
        const drivers = masterDataFormOptionsCache?.drivers || [];
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Biển Số Xe <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-license-plate" value="${d.license_plate || ''}" placeholder="VD: 51H-123.45..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nguồn Sở Hữu</label>
                    </div>
                    <select id="mdf-ownership" onchange="toggleVehicleSubcontractorField(this.value)" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="OWNED" ${d.ownership_type === 'OWNED' ? 'selected' : ''}>Xe Nhà (Đội Xe Công Ty)</option>
                        <option value="SUBCONTRACTOR" ${d.ownership_type === 'SUBCONTRACTOR' ? 'selected' : ''}>Xe Bạn (Thuê Ngoài / 3PL)</option>
                    </select>
                </div>
            </div>
            <!-- Khối chọn Nhà Xe Thầu Phụ nếu là Xe Bạn -->
            <div id="div-mdf-subcontractor" class="${d.ownership_type === 'SUBCONTRACTOR' ? '' : 'hidden-view'} p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-amber-900 text-xs truncate">
                        <i class="ph-bold ph-handshake mr-1"></i> Nhà Cung Cấp / Đối Tác 3PL Sở Hữu <span class="text-rose-500">*</span>
                    </label>
                </div>
                <select id="mdf-subcontractor-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-amber-950 border-amber-300 w-full bg-white">
                    <option value="">-- Chọn Nhà Cung Cấp / Đối Tác 3PL Sở Hữu --</option>
                    ${(masterDataFormOptionsCache?.subcontractors || []).map(sc => `<option value="${sc.id}" ${d.subcontractor_id === sc.id ? 'selected' : ''}>[${sc.short_name || sc.code}] ${sc.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Loại Phương Tiện</label>
                    </div>
                    <select id="mdf-vehicle-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="TRACTOR" ${d.vehicle_type === 'TRACTOR' ? 'selected' : ''}>Đầu kéo Container</option>
                        <option value="TRUCK_10T" ${d.vehicle_type === 'TRUCK_10T' ? 'selected' : ''}>Xe tải 10 Tấn</option>
                        <option value="TRUCK_2T" ${d.vehicle_type === 'TRUCK_2T' ? 'selected' : ''}>Xe tải 2 Tấn</option>
                        <option value="VAN" ${d.vehicle_type === 'VAN' ? 'selected' : ''}>Xe tải nhỏ / Van</option>
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hãng Sản Xuất / Dòng Xe</label>
                    </div>
                    <input type="text" id="mdf-brand" value="${d.brand || 'Freightliner'}" placeholder="VD: Freightliner, Hino, Isuzu..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tài Xế Mặc Định Gắn Xe</label>
                    </div>
                    <select id="mdf-driver-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                        <option value="">-- Chưa gán tài xế --</option>
                        ${drivers.map(dr => `<option value="${dr.id}" ${d.current_driver_id === dr.id ? 'selected' : ''}>${dr.label || dr.nickname || dr.full_name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng TK / Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-payload" value="${(() => {
                        const disp = (d.payload_display || '').trim().replace(/[-—]+$/, '').trim();
                        if (disp && disp !== '—' && disp !== '-') return disp;
                        if (d.payload_capacity_kg && d.payload_capacity_kg > 0) return formatNumberVN(d.payload_capacity_kg);
                        return d.id ? '' : '30.000/27.360';
                    })()}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right w-full" placeholder="VD: 30000/27360 hoặc 30000">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Đăng Kiểm</label>
                    </div>
                    <input type="date" id="mdf-reg-expiry" value="${d.registration_expiry ? (d.registration_expiry.includes('/') ? d.registration_expiry.split('/').reverse().join('-') : d.registration_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Bảo Hiểm</label>
                    </div>
                    <input type="date" id="mdf-ins-expiry" value="${d.insurance_expiry ? (d.insurance_expiry.includes('/') ? d.insurance_expiry.split('/').reverse().join('-') : d.insurance_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Bảo Trì Kế Tiếp</label>
                    </div>
                    <input type="date" id="mdf-maint-date" value="${d.next_maintenance_date ? (d.next_maintenance_date.includes('/') ? d.next_maintenance_date.split('/').reverse().join('-') : d.next_maintenance_date) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Trạng Thái Phương Tiện</label>
                </div>
                <select id="mdf-vehicle-status" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                    <option value="IDLE" ${d.status === 'IDLE' ? 'selected' : ''}>Nằm bãi (Chờ việc)</option>
                    <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>Đang chạy (Có hàng)</option>
                    <option value="MAINTENANCE" ${d.status === 'MAINTENANCE' ? 'selected' : ''}>Hư hỏng / Bảo trì</option>
                    <option value="DECOMMISSIONED" ${d.status === 'DECOMMISSIONED' ? 'selected' : ''}>Ngừng sử dụng</option>
                </select>
            </div>
        `;
    } else if (currentMasterDataTab === 'trailers') {
        const standardTrailerTypes = [
            'Moóc Xương 40ft (3 Trục)',
            'Moóc Cổ Cò 40ft (Chở Cont Lạnh/HC)',
            'Moóc Xương 20ft (3 Trục)',
            'Moóc Sàn 40ft',
            'Moóc Sàn 45ft',
            'Moóc Lùn / Chuyên Dụng',
            'Moóc Ben (Tự đổ)',
            'Moóc Bồn (Xitéc)',
            'Moóc Rút (Siêu trường siêu trọng)',
            'Moóc Lồng / Khung mui',
            'Moóc Xương 45ft',
            'Moóc Xương 2 Trục'
        ];
        const legacyTrailerMap = {
            'mooc_xuong_40': 'Moóc Xương 40ft (3 Trục)',
            'mooc_co_co_40': 'Moóc Cổ Cò 40ft (Chở Cont Lạnh/HC)',
            'mooc_xuong_20': 'Moóc Xương 20ft (3 Trục)',
            'mooc_san_40': 'Moóc Sàn 40ft',
            'mooc_san_45': 'Moóc Sàn 45ft',
            'mooc_lun': 'Moóc Lùn / Chuyên Dụng',
            'mooc_ben': 'Moóc Ben (Tự đổ)',
            'mooc_bon': 'Moóc Bồn (Xitéc)',
            'mooc_rut': 'Moóc Rút (Siêu trường siêu trọng)',
            'mooc_long': 'Moóc Lồng / Khung mui',
            'mooc_xuong_45': 'Moóc Xương 45ft',
            'mooc_xuong_2_truc': 'Moóc Xương 2 Trục'
        };

        const currentType = (d.trailer_type || '').trim();
        let selectedTrailerType = 'Moóc Xương 40ft (3 Trục)';
        let isCustomTrailerType = false;

        if (currentType) {
            const lowerCurrent = currentType.toLowerCase();
            const matchedStd = standardTrailerTypes.find(t => t.toLowerCase() === lowerCurrent);
            if (matchedStd) {
                selectedTrailerType = matchedStd;
            } else if (legacyTrailerMap[lowerCurrent]) {
                selectedTrailerType = legacyTrailerMap[lowerCurrent];
            } else {
                selectedTrailerType = '__OTHER__';
                isCustomTrailerType = true;
            }
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Biển Số Rơ-Moóc <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-trailer-plate" value="${d.license_plate || ''}" placeholder="VD: 51R-123.45" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Loại Rơ-Moóc <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-trailer-type" onchange="toggleCustomTrailerType(this)" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                        ${standardTrailerTypes.map(t => `<option value="${escapeHtml(t)}" ${selectedTrailerType === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                        <option value="__OTHER__" ${isCustomTrailerType ? 'selected' : ''}>➕ Loại khác (Tự nhập tay)...</option>
                    </select>
                    <div id="mdf-trailer-type-custom-wrap" class="mt-1.5 ${isCustomTrailerType ? '' : 'hidden'}">
                        <input type="text" id="mdf-trailer-type-custom" value="${isCustomTrailerType ? escapeHtml(currentType) : ''}" placeholder="Nhập tên loại moóc đặc thù..." class="form-input h-8 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full border-dashed border-teal-500 bg-teal-50/30">
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hãng Sản Xuất</label>
                    </div>
                    <input type="text" id="mdf-trailer-brand" value="${d.brand || 'Tân Thanh'}" placeholder="VD: Tân Thanh, CIMC, Doosung..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng TK / Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-trailer-payload" value="${(() => {
                        const disp = (d.payload_display || '').trim().replace(/[-—]+$/, '').trim();
                        if (disp && disp !== '—' && disp !== '-') return disp;
                        if (d.payload_capacity_kg && d.payload_capacity_kg > 0) return formatNumberVN(d.payload_capacity_kg);
                        return d.id ? '' : '30.000/27.360';
                    })()}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right w-full" placeholder="VD: 30000/27360 hoặc 32000">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Đăng Kiểm Định Kỳ</label>
                    </div>
                    <input type="date" id="mdf-trailer-expiry" value="${d.registration_expiry ? (d.registration_expiry.includes('/') ? d.registration_expiry.split('/').reverse().join('-') : d.registration_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Trạng Thái Hoạt Động</label>
                    </div>
                    <select id="mdf-trailer-status" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="IDLE" ${d.status === 'IDLE' ? 'selected' : ''}>Nằm bãi (Chờ kéo)</option>
                        <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>Đang gắn xe kéo</option>
                        <option value="MAINTENANCE" ${d.status === 'MAINTENANCE' ? 'selected' : ''}>Bảo trì / Sửa chữa</option>
                    </select>
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'shipping_lines') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Hãng Tàu <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sl-code" value="${d.code || ''}" placeholder="VD: MAEU, ONE, COSCO..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Hãng Tàu / Đơn Vị Vận Chuyển <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sl-name" value="${d.name || ''}" placeholder="VD: Ocean Network Express..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline CSKH / Cấp Vỏ</label>
                    </div>
                    <input type="text" id="mdf-sl-phone" value="${d.contact_phone || ''}" placeholder="VD: 028-3827-0100" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Tiếp Nhận e-DO</label>
                    </div>
                    <input type="email" id="mdf-sl-email" value="${d.contact_email || ''}" placeholder="cs@shipping.com" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Website Lấy e-DO / Tra Cứu Container</label>
                </div>
                <input type="url" id="mdf-sl-web" value="${d.website || ''}" placeholder="https://..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Free DEM Chuẩn (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-sl-dem" value="${d.free_dem_days || 7}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center text-teal-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Free DET Chuẩn (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-sl-det" value="${d.free_det_days || 5}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center text-amber-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Quy Định Cấp Vỏ / Hạ Rỗng</label>
                </div>
                <input type="text" id="mdf-sl-notes" value="${d.notes || ''}" placeholder="Depot chỉ định hạ rỗng, lưu ý hãng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'subcontractors') {
        const contactVal = (d.contact_person && d.contact_person !== 'null') ? d.contact_person : '';
        const partnerTypeVal = d.partner_type || 'CARRIER';
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate">Loại Đối Tác <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-sc-partner-type" onchange="toggleSubcontractorTypePanels(this.value)" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-teal-950 border-teal-300 bg-teal-50/40 w-full rounded">
                        <option value="CARRIER" ${partnerTypeVal === 'CARRIER' ? 'selected' : ''}>🏢 Nhà xe vận tải (3PL)</option>
                        <option value="GARAGE" ${partnerTypeVal === 'GARAGE' ? 'selected' : ''}>🔧 Gara sửa chữa / Bảo dưỡng</option>
                        <option value="SUPPLIER" ${partnerTypeVal === 'SUPPLIER' ? 'selected' : ''}>📦 Nhà cung cấp vật tư / Dịch vụ</option>
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-amber-900 text-xs truncate">Tên Viết Tắt <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-short-name" value="${escapeHtml(d.short_name || d.code || '')}" placeholder="VD: 3S, HOANGNAM..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold text-amber-950 border-amber-300 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Đối Tác / Nhà Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-code" value="${escapeHtml(d.code || '')}" placeholder="Tự sinh theo loại: 3PL001, GAR001, SPL001..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" ${d.code ? 'readonly' : ''}>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Doanh Nghiệp / Đơn Vị <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-name" value="${escapeHtml(d.name || '')}" placeholder="VD: CÔNG TY TNHH 3S LOGISTICS..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST)</label>
                    </div>
                    <input type="text" id="mdf-sc-tax" value="${escapeHtml(d.tax_code || '')}" placeholder="MST doanh nghiệp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-full">
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Điều Hành Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-person" value="${escapeHtml(contactVal)}" placeholder="Tên điều độ / chủ xe..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Điều Xe <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-phone" value="${escapeHtml(d.phone || '')}" placeholder="SĐT liên hệ gấp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 w-full" required>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Công Ty</label>
                    </div>
                    <input type="text" id="mdf-sc-address" value="${escapeHtml(d.address || '')}" placeholder="Trụ sở, số nhà, đường, quận/huyện..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Kho / Bãi Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-yard-address" value="${escapeHtml(d.yard_address || '')}" placeholder="Vị trí bãi xe, kho tập kết hàng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-sc-acc" value="${escapeHtml(d.bank_account_number || '')}" placeholder="Số TK..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-sc-bank" value="${escapeHtml(d.bank_name || '')}" placeholder="VD: VCB, MB..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chủ Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-sc-holder" value="${escapeHtml(d.bank_account_holder || '')}" placeholder="Tên in hoa..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi chú</label>
                </div>
                <input type="text" id="mdf-sc-notes" value="${escapeHtml(d.notes || '')}" placeholder="Ghi chú thêm..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hợp tác</label>
            </div>

            ${d.id ? `
            <!-- KHỐI 1: QUẢN LÝ ĐỘI XE THUỘC NHÀ XE (3PL) -->
            <div class="mt-4 pt-3 border-t border-slate-200" id="section-subcontractor-vehicles-mgmt">
                <div class="flex items-center justify-between mb-2">
                    <label class="block font-bold text-amber-950 text-xs flex items-center gap-1.5 font-heading uppercase tracking-wider">
                        <i class="ph-bold ph-truck text-amber-700 text-sm"></i> Đội Xe / Phương Tiện Thuộc Nhà Xe (3PL)
                    </label>
                    <button type="button" onclick="showAddSubVehicleInline()" class="btn-bim-primary px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-plus text-[10px]"></i> Thêm mới
                    </button>
                </div>

                <!-- Form Thêm Nhanh Xe 3PL Inline -->
                <div id="sub-vehicle-add-row" class="hidden-view p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl mb-2.5 space-y-2">
                    <div class="text-[11px] font-bold text-amber-900 uppercase">Khai Báo Xe Mới Gán Cho Nhà Xe</div>
                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div class="sm:col-span-4">
                            <input type="text" id="new-subveh-plate" placeholder="Biển số xe (51H-123.45) *" class="form-input h-8 px-2 py-1 text-xs uppercase font-mono font-bold text-slate-800 border-amber-300 w-full rounded">
                        </div>
                        <div class="sm:col-span-3">
                            <select id="new-subveh-type" class="form-select h-8 px-2 py-1 text-xs font-semibold border-amber-300 w-full rounded">
                                <option value="TRACTOR">Đầu kéo</option>
                                <option value="TRUCK_10T">Xe tải 10 Tấn</option>
                                <option value="TRUCK_2T">Xe tải 2 Tấn</option>
                                <option value="VAN">Xe tải nhỏ / Van</option>
                            </select>
                        </div>
                        <div class="sm:col-span-2">
                            <input type="text" id="new-subveh-payload" placeholder="VD: 30000/27360" value="30.000/27.360" class="form-input h-8 px-2 py-1 text-xs font-mono text-right border-amber-300 w-full rounded">
                        </div>
                        <div class="sm:col-span-3">
                            <input type="text" id="new-subveh-brand" placeholder="Hãng/Dòng xe (Hino...)" class="form-input h-8 px-2 py-1 text-xs border-amber-300 w-full rounded">
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onclick="hideAddSubVehicleInline()" class="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded font-semibold cursor-pointer">Hủy</button>
                        <button type="button" onclick="saveNewSubVehicleInline(${d.id})" class="btn-bim-primary px-3.5 py-1 text-xs font-bold shadow-xs cursor-pointer">Lưu Phương Tiện</button>
                    </div>
                </div>

                <!-- Bảng Danh Sách Xe Thuộc Nhà Xe -->
                <div class="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto bg-white shadow-2xs mb-3">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                            <tr>
                                <th class="py-2 px-3">Biển Số Xe</th>
                                <th class="py-2 px-3">Loại Xe</th>
                                <th class="py-2 px-3 text-right">Tải Trọng Cho Phép</th>
                                <th class="py-2 px-3">Hãng / Dòng Xe</th>
                                <th class="py-2 px-2.5 text-center w-24">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody id="sub-vehicles-tbody" class="divide-y divide-slate-100">
                            <tr><td colspan="5" class="text-center py-3 text-slate-400"><i class="ph ph-spinner animate-spin mr-1"></i> Đang tải danh sách xe...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- KHỐI 2: QUẢN LÝ DANH BẠ TÀI XẾ THUỘC NHÀ XE (3PL) -->
            <div class="mt-3 pt-3 border-t border-slate-200" id="section-subcontractor-drivers-mgmt">
                <div class="flex items-center justify-between mb-2">
                    <label class="block font-bold text-amber-950 text-xs flex items-center gap-1.5 font-heading uppercase tracking-wider">
                        <i class="ph-bold ph-steering-wheel text-amber-700 text-sm"></i> Danh Bạ Tài Xế Thuộc Nhà Xe (3PL)
                    </label>
                    <button type="button" onclick="showAddSubDriverInline()" class="btn-bim-primary px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-plus text-[10px]"></i> Thêm mới
                    </button>
                </div>

                <!-- Form Thêm Nhanh Tài Xế 3PL Inline -->
                <div id="sub-driver-add-row" class="hidden-view p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl mb-2.5 space-y-2">
                    <div class="text-[11px] font-bold text-amber-900 uppercase">Khai Báo Bác Tài Mới Trực Thuộc Nhà Xe</div>
                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div class="sm:col-span-5">
                            <input type="text" id="new-subdrv-name" placeholder="Họ và tên tài xế *" class="form-input h-8 px-2 py-1 text-xs font-bold text-slate-800 border-amber-300 w-full rounded">
                        </div>
                        <div class="sm:col-span-4">
                            <input type="tel" id="new-subdrv-phone" placeholder="Số điện thoại *" class="form-input h-8 px-2 py-1 text-xs font-mono font-bold text-teal-800 border-amber-300 w-full rounded">
                        </div>
                        <div class="sm:col-span-3">
                            <input type="text" id="new-subdrv-license" placeholder="Số GPLX (Tùy chọn)" class="form-input h-8 px-2 py-1 text-xs font-mono border-amber-300 w-full rounded">
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onclick="hideAddSubDriverInline()" class="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded font-semibold cursor-pointer">Hủy</button>
                        <button type="button" onclick="saveNewSubDriverInline(${d.id})" class="btn-bim-primary px-3.5 py-1 text-xs font-bold shadow-xs cursor-pointer">Lưu Bác Tài</button>
                    </div>
                </div>

                <!-- Bảng Danh Sách Tài Xế Thuộc Nhà Xe -->
                <div class="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto bg-white shadow-2xs">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                            <tr>
                                <th class="py-2 px-3">Họ & Tên Tài Xế</th>
                                <th class="py-2 px-3">Số Điện Thoại</th>
                                <th class="py-2 px-3">Số GPLX</th>
                                <th class="py-2 px-2.5 text-center w-24">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody id="sub-drivers-tbody" class="divide-y divide-slate-100">
                            <tr><td colspan="4" class="text-center py-3 text-slate-400"><i class="ph ph-spinner animate-spin mr-1"></i> Đang tải danh sách tài xế...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
        `;
        if (d.id) {
            setTimeout(() => {
                loadSubcontractorVehiclesInModal(d.id);
                loadSubcontractorDriversInModal(d.id);
            }, 50);
        }
        toggleSubcontractorTypePanels(d.partner_type || 'CARRIER');
    } else if (currentMasterDataTab === 'opening_balance') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tài Khoản Kế Toán <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-ob-account" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                        <option value="1111" ${d.account_code === '1111' ? 'selected' : ''}>1111 - Tiền Mặt Tại Quỹ</option>
                        <option value="1121" ${d.account_code === '1121' ? 'selected' : ''}>1121 - Tiền Gửi Ngân Hàng MB Bank</option>
                        <option value="1122" ${d.account_code === '1122' ? 'selected' : ''}>1122 - Tiền Gửi Ngân Hàng Vietcombank</option>
                        <option value="131" ${d.account_code === '131' ? 'selected' : ''}>131 - Phải Thu Khách Hàng</option>
                        <option value="141" ${d.account_code === '141' ? 'selected' : ''}>141 - Tạm Ứng Nhân Viên / Tài Xế</option>
                        <option value="331" ${d.account_code === '331' ? 'selected' : ''}>331 - Phải Trả Nhà Cung Cấp / Thầu Phụ</option>
                        <option value="334" ${d.account_code === '334' ? 'selected' : ''}>334 - Phải Trả Người Lao Động (Lương Tài Xế)</option>
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Ngày Chốt Số Dư Đầu Kỳ <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="date" id="mdf-ob-date" value="${d.opening_date || d.balance_date || '2026-01-01'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full" required>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Đối Tượng / Quỹ / Tài Khoản <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-ob-name" value="${escapeHtml(d.entity_name || '')}" placeholder="VD: Quỹ tiền mặt Triền Võ, KH Công ty ABC, Tài xế Nguyễn Văn A..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Đối Tượng / Biển Số / Mã NV</label>
                    </div>
                    <input type="text" id="mdf-ob-code" value="${escapeHtml(d.entity_code || '')}" placeholder="Mã KH, Mã TX..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tính Chất Số Dư <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-ob-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="debit" ${(d.debit_amount > 0 || d.is_debit !== false) ? 'selected' : ''}>Dư Nợ (Tiền, Tài sản, Phải thu)</option>
                        <option value="credit" ${(d.credit_amount > 0 && !d.debit_amount) ? 'selected' : ''}>Dư Có (Phải trả, Nợ phải thanh toán)</option>
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tiền (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-ob-amount" value="${formatNumberVN(d.debit_amount > 0 ? d.debit_amount : (d.credit_amount > 0 ? d.credit_amount : (d.amount || 0)))}" placeholder="VD: 50.000.000" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản NH (Nếu có)</label>
                    </div>
                    <input type="text" id="mdf-ob-bank-acc" value="${escapeHtml(d.bank_account_number || '')}" placeholder="Số TK ngân hàng..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú / Căn Cứ Chứng Từ</label>
                </div>
                <input type="text" id="mdf-ob-notes" value="${escapeHtml(d.notes || '')}" placeholder="Căn cứ biên bản đối chiếu công nợ, sao kê ngân hàng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
        `;
    }

    // Tự động khởi tạo format hàng ngàn cho tất cả input tiền tệ / số trong modal
    if (typeof initAllNumberInputs === 'function') {
        initAllNumberInputs();
    }
}
