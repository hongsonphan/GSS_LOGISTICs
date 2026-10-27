/**
 * ==========================================================================
 * BIM LOGISTICS — FRONTEND APPLICATION LOGIC (TMS & FLEET)
 * Triết lý: Graceful Notification, Defensive UI & Bim Enterprise Table Standard
 * Kế thừa từ Bim_ERP-Solutions
 * ==========================================================================
 */

let currentActiveTripCode = null;
let currentActiveTripData = null;
let currentOcrMode = 'phi-ton';

// --- 3. XEM CHI TIẾT CHUYẾN XE & BẢNG KÊ CHI PHÍ TRIỀN VÕ ---
async function viewTripDetail(tripCode, updateHistory = true) {
    currentActiveTripCode = tripCode;
    try {
        const res = await fetchWithAuth(`/api/trips/${tripCode}/`);
        if (!res.ok) {
            let errorMsg = 'Không tìm thấy chuyến xe.';
            try {
                const errData = await res.json();
                errorMsg = errData.error || errData.detail || `Lỗi máy chủ (${res.status})`;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        const trip = await res.json();
        currentActiveTripData = trip;
        const tripHash = trip.hashid || trip.id;
        currentActiveTripCode = trip.id; // Luôn dùng trip_code gốc cho các API con

        // Cập nhật URL chuẩn Semantic Path kèm HashID bảo mật: /dispatch/trips/<hashid>
        if (updateHistory && window.history && window.history.pushState) {
            const tripPath = `/dispatch/trips/${tripHash}`;
            if (window.location.pathname !== tripPath) {
                window.history.pushState({ view: 'trip-detail', tripIdentifier: tripHash }, '', tripPath);
            }
        }

        // Lưu vết tab trước đó để nút Quay lại hoạt động chuẩn xác
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-trip-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-trip-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        // Cập nhật Tiêu đề Phân hệ & Breadcrumb trên Topbar
        const originPrefix = (previousActiveTab === 'ke-toan' ? 'Tài chính & Kế toán' : 'Điều Vận');
        setTopbarFullpageMode({
            backFn: backToTrips,
            prefix: originPrefix,
            title: `Chi tiết chuyến ${trip.id || trip.trip_code || ''}`
        });

        const tripBackLabel = document.getElementById('trip-detail-back-label');
        if (tripBackLabel) tripBackLabel.innerText = `Quay Lại ${originPrefix}`;

        window.currentTripDetail = trip;

        // Helper gán text an toàn chống crash DOM
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = (val !== undefined && val !== null) ? val : '-';
        };

        // Thông tin chung
        setText('detail-id', trip.id);
        setText('detail-type', trip.type);
        setText('detail-customer', trip.customer);
        setText('detail-driver', trip.driver);
        setText('detail-vehicle-plate', trip.vehicle);

        // Phân loại nguồn xe
        const ownerBadge = document.getElementById('detail-ownership-badge');
        if (ownerBadge) {
            if (trip.vehicle_ownership_code === 'OWNED') {
                ownerBadge.innerText = 'Xe Nhà';
                ownerBadge.className = 'text-xs font-bold uppercase text-teal-700';
            } else {
                ownerBadge.innerText = 'Xe Bạn';
                ownerBadge.className = 'text-xs font-bold uppercase text-slate-600';
            }
        }

        // Cấu hình Chặng & Xe hạ (Nghiệp vụ Cắt Kéo)
        const dropoffVehEl = document.getElementById('detail-dropoff-vehicle-info');
        if (dropoffVehEl) {
            if (trip.is_split_trip) {
                dropoffVehEl.innerHTML = `
                    <div class="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                        <div class="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200 pb-1">
                            <span class="flex items-center gap-1">
                                <i class="ph-bold ph-arrows-split text-amber-700"></i>
                                Chế độ Cắt Kéo (Drop & Hook)
                            </span>
                            <span class="text-[10.5px] bg-amber-200/80 px-1.5 py-0.2 rounded font-black">2 Chặng</span>
                        </div>
                        <p class="pt-0.5">• <strong>Chặng 1 (Lấy Cont):</strong> ${trip.driver} (Xe: ${trip.vehicle}) · Chia lương: ${trip.driver_split_ratio}%</p>
                        <p>• <strong>Chặng 2 (Hạ Bãi):</strong> ${trip.dropoff_driver ? `${trip.dropoff_driver} (Xe: ${trip.dropoff_vehicle || '-'})` : '<span class="text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded border border-amber-300">Chưa gán tài xế</span> <button type="button" onclick="openModalEditTrip()" class="ml-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer shadow-2xs transition-all"><i class="ph-bold ph-user-plus mr-0.5"></i> Gán Tài 2 Ngay</button>'} · Chia lương: ${100 - (trip.driver_split_ratio || 50)}%</p>
                    </div>
                `;
                dropoffVehEl.classList.remove('hidden');
            } else if (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle) {
                dropoffVehEl.innerText = `Xe hạ: ${trip.dropoff_vehicle}`;
                dropoffVehEl.classList.remove('hidden');
            } else {
                dropoffVehEl.innerText = '';
                dropoffVehEl.classList.add('hidden');
            }
        }
        
        setText('detail-cont', trip.container);
        const contTypeEl = document.getElementById('detail-cont-type');
        if (contTypeEl) {
            if (trip.is_twin_container) {
                contTypeEl.innerText = 'Chế độ: Ghép 2x20ft';
            } else if (trip.vgm_weight && trip.vgm_weight !== '-') {
                contTypeEl.innerText = `Loại: ${trip.container_type || 'Cont 40'} | VGM: ${trip.vgm_weight}`;
            } else {
                contTypeEl.innerText = `Loại: ${trip.container_type || 'Cont 40'}`;
            }
        }

        // Cập nhật Box Ghép 2 Cont 20ft
        const twinCard = document.getElementById('detail-twin-container-card');
        if (twinCard) {
            if (trip.is_twin_container) {
                twinCard.classList.remove('hidden');
                setText('detail-cont-1-no', trip.container || '-');
                setText('detail-cont-1-seal', trip.seal || '-');
                setText('detail-cont-1-booking', trip.booking || '-');
                const vgm1El = document.getElementById('detail-cont-1-vgm');
                if (vgm1El) vgm1El.innerText = trip.vgm_weight && trip.vgm_weight !== '-' ? `VGM: ${trip.vgm_weight}` : 'VGM: -';

                setText('detail-cont-2-no', trip.container_2 || 'Chưa cập nhật');
                setText('detail-cont-2-seal', trip.seal_2 || '-');
                setText('detail-cont-2-booking', trip.booking_2 || trip.booking || '-');
                const vgm2El = document.getElementById('detail-cont-2-vgm');
                if (vgm2El) vgm2El.innerText = trip.vgm_weight_2 ? `VGM: ${trip.vgm_weight_2}` : 'VGM: -';
                setText('detail-cont-2-notes', trip.cargo_notes_2 || 'Không có ghi chú riêng');
            } else {
                twinCard.classList.add('hidden');
            }
        }

        // Cập nhật Box Quản lý DEM/DET & Giám định Vỏ Cont (EIR)
        setText('detail-det-days', `${trip.det_free_days || 3} ngày`);
        setText('detail-det-expiry', trip.det_expiry_date || 'Chưa thiết lập');
        setText('detail-dem-days', `${trip.dem_free_days || 3} ngày`);
        setText('detail-dem-expiry', trip.dem_expiry_date || 'Chưa thiết lập');
        setText('detail-condition-label', trip.container_condition_label || 'Nguyên Vẹn / Đạt Chuẩn');
        setText('detail-damage-desc', trip.damage_description || (trip.container_condition === 'GOOD' ? 'Vỏ cont sạch sẽ, nguyên vẹn, không hư hỏng' : 'Không có ghi chú thêm'));

        const condBadge = document.getElementById('detail-condition-badge');
        if (condBadge) {
            if (trip.container_condition === 'DAMAGED') {
                condBadge.className = 'text-xs font-bold uppercase text-rose-700';
                condBadge.innerText = 'Hư hỏng (EIR)';
            } else if (trip.container_condition === 'CLEANING_REQUIRED') {
                condBadge.className = 'text-xs font-bold uppercase text-amber-700';
                condBadge.innerText = 'Cần vệ sinh';
            } else {
                condBadge.className = 'text-xs font-bold uppercase text-emerald-700';
                condBadge.innerText = 'Đạt chuẩn';
            }
        }

        const detBadgeEl = document.getElementById('detail-det-status-badge');
        const detCountdownEl = document.getElementById('detail-det-countdown');
        if (trip.det_status) {
            const ds = trip.det_status;
            if (detBadgeEl) {
                if (ds.status === 'OVERDUE') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-heading bg-rose-100 text-rose-800 border border-rose-300 animate-pulse';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-warning-circle mr-1"></i> Quá Hạn Phạt Tiền (${Math.abs(ds.days_remaining)} ngày)`;
                } else if (ds.status === 'TODAY') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-heading bg-rose-50 text-rose-700 border border-rose-300';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-clock mr-1"></i> Hạn Chót Hôm Nay`;
                } else if (ds.status === 'WARNING') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-amber-100 text-amber-800 border border-amber-300';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-hourglass mr-1"></i> Sắp Hết Hạn (1 ngày)`;
                } else if (ds.status === 'ATTENTION') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-amber-50 text-amber-700 border border-amber-200';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-hourglass-low mr-1"></i> Còn 2 ngày Free DET`;
                } else {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-emerald-100 text-emerald-800 border border-emerald-200';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-check-circle mr-1"></i> Trong Hạn Free-time (${ds.days_remaining} ngày)`;
                }
            }
            if (detCountdownEl) {
                if (ds.status === 'OVERDUE') {
                    detCountdownEl.innerText = `Cảnh báo: Đã vượt quá hạn mượn vỏ ${Math.abs(ds.days_remaining)} ngày! Đang phát sinh phí lưu vỏ của hãng tàu.`;
                    detCountdownEl.className = 'text-[11px] text-rose-700 mt-1 font-bold';
                } else if (ds.status === 'TODAY') {
                    detCountdownEl.innerText = `Lưu ý: Hạn trả rỗng hạ bãi là ngày hôm nay. Cần ưu tiên xếp xe hạ cont trước 17H.`;
                    detCountdownEl.className = 'text-[11px] text-rose-700 mt-1 font-bold';
                } else {
                    detCountdownEl.innerText = `Thời gian mượn vỏ còn lại: ${ds.days_remaining} ngày an toàn.`;
                    detCountdownEl.className = 'text-[11px] text-amber-800 mt-1 font-medium';
                }
            }
        }

        // Vị trí cont
        const contLocBadge = document.getElementById('detail-cont-location-badge');
        if (contLocBadge) contLocBadge.innerText = trip.cont_location_type || 'Nhà máy';

        setText('detail-booking', trip.booking !== '-' ? `B/L: ${trip.booking}` : 'B/L: Chưa có');
        setText('detail-seal', trip.seal !== '-' ? `Seal: ${trip.seal}` : 'Seal: Chưa cập nhật');
        
        // Commercial Invoice & Dock
        const invoiceEl = document.getElementById('detail-invoice');
        if (invoiceEl) invoiceEl.innerText = trip.commercial_invoice || '-';
        const dockEl = document.getElementById('detail-dock');
        if (dockEl) dockEl.innerText = trip.warehouse_dock && trip.warehouse_dock !== '-' ? `DOCK: ${trip.warehouse_dock}` : 'DOCK: Chưa chỉ định';

        // 5 Mốc thời gian tại kho khách hàng
        const etaEl = document.getElementById('detail-eta-time');
        if (etaEl) etaEl.innerText = trip.eta_warehouse_time || '-';
        const callInEl = document.getElementById('detail-call-in-time');
        if (callInEl) callInEl.innerText = trip.warehouse_call_in_time || '-';
        const actualInEl = document.getElementById('detail-actual-in-time');
        if (actualInEl) actualInEl.innerText = trip.actual_gate_in_time || '-';
        const callOutEl = document.getElementById('detail-call-out-time');
        if (callOutEl) callOutEl.innerText = trip.warehouse_call_out_time || '-';
        const actualOutEl = document.getElementById('detail-actual-out-time');
        if (actualOutEl) actualOutEl.innerText = trip.actual_gate_out_time || '-';

        // 2 Mốc bổ sung thực tiễn: Hẹn hạ sau 0h & Hạ bãi thực tế
        const dropoffAppointEl = document.getElementById('detail-dropoff-appointment-time');
        if (dropoffAppointEl) dropoffAppointEl.innerText = trip.dropoff_appointment_time || '-';
        const actualDropoffEl = document.getElementById('detail-actual-dropoff-time');
        if (actualDropoffEl) actualDropoffEl.innerText = trip.actual_dropoff_time || '-';

        // Cập nhật Cảnh báo Neo Xe & Lưu Cont Qua Đêm
        const overnightBadge = document.getElementById('detail-overnight-badge');
        const detentionBadgeStatus = document.getElementById('detail-detention-badge-status');
        const detentionInfoText = document.getElementById('detail-detention-info-text');
        const gateoutSummary = document.getElementById('detail-gateout-summary');

        if (gateoutSummary) gateoutSummary.innerText = trip.actual_gate_out_time && trip.actual_gate_out_time !== '-' ? trip.actual_gate_out_time : 'chưa xác nhận';

        if (trip.is_overnight_detention || (trip.dropoff_appointment_time && trip.dropoff_appointment_time.toLowerCase().includes('00:00'))) {
            if (overnightBadge) overnightBadge.classList.remove('hidden');
            if (detentionBadgeStatus) {
                detentionBadgeStatus.className = 'px-2 py-0.2 rounded font-black text-[10.5px] bg-amber-200 text-amber-950 uppercase border border-amber-300';
                detentionBadgeStatus.innerText = `Lưu Xe Qua Đêm (${trip.overnight_wait_hours || 'Chờ sau 0h'})`;
            }
            if (detentionInfoText) {
                const feeCustStr = trip.detention_fee_customer > 0 ? `Thu KH: ${new Intl.NumberFormat('vi-VN').format(trip.detention_fee_customer)} đ` : 'Chưa định giá';
                const allowDrvStr = trip.detention_driver_allowance > 0 ? `Chi TX: ${new Intl.NumberFormat('vi-VN').format(trip.detention_driver_allowance)} đ` : 'Chưa tính phụ cấp';
                detentionInfoText.innerHTML = `Lý do: <strong>${trip.detention_reason || 'Kho yêu cầu chờ sau 0h mới hạ bãi'}</strong>. Mốc hẹn: <strong class="text-amber-950 font-mono">${trip.dropoff_appointment_time}</strong>. Đã hạch toán: <strong class="text-teal-900">${feeCustStr}</strong> | <strong class="text-indigo-900">${allowDrvStr}</strong>.`;
            }
        } else {
            if (overnightBadge) overnightBadge.classList.add('hidden');
            if (detentionBadgeStatus) {
                detentionBadgeStatus.className = 'px-2 py-0.2 rounded font-bold text-[10.5px] bg-slate-100 text-slate-700';
                detentionBadgeStatus.innerText = 'Bình thường';
            }
            if (detentionInfoText) {
                detentionInfoText.innerHTML = `Xe kéo cont ra khỏi kho lúc <strong>${trip.actual_gate_out_time || '-'}</strong>. Nếu kho yêu cầu chờ sau 0h mới hạ bãi, vui lòng bấm cập nhật để tự động tính phụ phí.`;
            }
        }

        // Lịch đóng hàng & Cắt máng
        const loadSchedEl = document.getElementById('detail-loading-schedule');
        if (loadSchedEl) loadSchedEl.innerText = `${trip.loading_date} (Giờ: ${trip.loading_time || '08:00'})`;
        const cutoffEl = document.getElementById('detail-cutoff');
        if (cutoffEl) cutoffEl.innerText = trip.cutoff || '-';
        const notesEl = document.getElementById('detail-cargo-notes');
        if (notesEl) notesEl.innerText = trip.cargo_notes || 'Không có lưu ý đặc biệt';

        // Hành trình 3 điểm
        setText('detail-pickup', trip.pickup);
        setText('detail-warehouse', trip.warehouse);
        setText('detail-dropoff', trip.dropoff || 'Hạ bãi rỗng');

        // Link Zalo và Màn hình Tài xế Mobile
        const driverToken = trip.driver_hashid || trip.hashid || trip.trip_code;
        const driverPortalUrl = `${window.location.origin}/driver/${driverToken}/`;
        const driverPortalBtn = document.getElementById('driver-portal-btn');
        if (driverPortalBtn) {
            driverPortalBtn.href = driverPortalUrl;
        }
        const phoneOpenTabBtn = document.getElementById('driver-phone-open-tab');
        if (phoneOpenTabBtn) {
            phoneOpenTabBtn.href = driverPortalUrl;
        }

        const zaloLink = document.getElementById('zalo-driver-link');
        if (zaloLink) {
            zaloLink.href = trip.driver_phone ? `https://zalo.me/${trip.driver_phone}` : '#';
        }

        // Status Badge
        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const badge = document.getElementById('detail-status-badge');
        if (badge) {
            badge.className = `px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ${statusCls}`;
            badge.innerText = trip.status_label || trip.status_display || STATUS_NAME_MAP[trip.status] || trip.status || 'Chưa xác định';
        }

        // Cập nhật Cảnh báo SLA & Từ chối Chuyến Xe
        const slaBanner = document.getElementById('trip-sla-warning-banner');
        if (slaBanner) {
            if (trip.acceptance_sla_status === 'DECLINED' || trip.declined_at) {
                slaBanner.className = 'p-4 rounded-2xl border bg-rose-100 border-rose-400 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `❌ TÀI XẾ ${trip.driver} ĐÃ TỪ CHỐI CHUYẾN!`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerHTML = `Lý do từ chối: <strong class="text-rose-900">${escapeHtml(trip.decline_reason || 'Không nêu lý do')}</strong> (${trip.minutes_since_dispatch} phút trước). Vui lòng phân lại tài xế / xe khác ngay để đảm bảo tiến độ!`;
                slaBanner.classList.remove('hidden');
            } else if (trip.status === 'DISPATCHED' && trip.acceptance_sla_status === 'OVERDUE') {
                slaBanner.className = 'p-4 rounded-2xl border bg-rose-50 border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `⚠️ CẢNH BÁO: TÀI XẾ QUÁ HẠN XÁC NHẬN (${trip.minutes_since_dispatch} PHÚT)`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerText = `Bác tài ${trip.driver} (${trip.driver_phone || 'Chưa có SĐT'}) chưa nhận chuyến sau hơn 60 phút phát lệnh. Vui lòng gọi điện xác nhận hoặc phân xe/tài xế khác ngay!`;
                slaBanner.classList.remove('hidden');
            } else if (trip.status === 'DISPATCHED' && trip.acceptance_sla_status === 'WARNING') {
                slaBanner.className = 'p-4 rounded-2xl border bg-amber-50 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `ĐANG CHỜ BÁC TÀI XÁC NHẬN (${trip.minutes_since_dispatch} PHÚT)`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerText = `Lệnh điều xe đã gửi tới bác tài ${trip.driver}. Hệ thống sẽ cảnh báo đỏ nếu quá 60 phút không phản hồi.`;
                slaBanner.classList.remove('hidden');
            } else {
                slaBanner.classList.add('hidden');
            }
        }

        // Trạng thái Chốt Sổ Kế Toán (Settlement Controls)
        const settleCont = document.getElementById('settlement-status-container');
        const btnAddTbl = document.getElementById('btn-add-expense-table');
        const banner = document.getElementById('cost-sheet-settled-banner');

        if (trip.is_expenses_settled) {
            if (settleCont) {
                settleCont.innerHTML = `
                    <span class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 flex items-center shadow-2xs font-heading" title="Chốt bởi ${trip.settled_by || 'Kế toán'} lúc ${trip.settled_at}">
                        <i class="ph-bold ph-lock-key mr-1.5 text-purple-600 text-sm"></i> Đã Chốt Sổ (Kế Toán)
                    </span>
                `;
            }
            if (btnAddTbl) btnAddTbl.classList.add('hidden');
            if (banner) {
                banner.classList.remove('hidden');
                const desc = document.getElementById('cost-sheet-settled-desc');
                if (desc) desc.innerText = `Chốt bởi ${trip.settled_by || 'Kế toán viên'} vào lúc ${trip.settled_at || 'gần đây'}. Dữ liệu chi phí đã khóa cứng đối soát.`;
            }
        } else {
            if (settleCont) {
                settleCont.innerHTML = '';
            }
            if (btnAddTbl) btnAddTbl.classList.remove('hidden');
            if (banner) banner.classList.add('hidden');
        }

        // P&L Summary Cards
        const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
        if (document.getElementById('pnl-revenue')) document.getElementById('pnl-revenue').innerText = formatMoney(trip.financials.revenue);
        if (document.getElementById('pnl-expense')) document.getElementById('pnl-expense').innerText = formatMoney(trip.financials.expense);
        if (document.getElementById('pnl-profit')) {
            const profitEl = document.getElementById('pnl-profit');
            profitEl.innerText = `${formatMoney(trip.financials.profit)} (${trip.financials.margin_percent}%)`;
        }

        // --- RENDER BẢNG KÊ CHI PHÍ (8 MỤC CHUẨN TRIỀN VÕ) ---
        renderCostSheetTable(trip);

        // --- RENDER MOBILE SIMULATOR DATA ---
        renderDriverMobileApp(trip);

        // --- RENDER TIẾN ĐỘ THỰC HIỆN (QUY TRÌNH 10 BƯỚC) DẠNG LƯỚI BẢNG CHUẨN ---
        const tContainer = document.getElementById('detail-timeline');
        if (tContainer) {
            const timelineList = trip.timeline || [];
            if (timelineList.length === 0) {
                if (tContainer.tagName === 'TBODY') {
                    tContainer.innerHTML = `
                        <tr>
                            <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                                <i class="ph ph-clock-counter-clockwise text-2xl text-slate-300 block mb-1"></i>
                                Đang khởi tạo các mốc tiến độ điều vận...
                            </td>
                        </tr>
                    `;
                } else {
                    tContainer.innerHTML = `
                        <div class="py-8 text-center text-slate-400 text-xs italic">
                            <i class="ph ph-clock-counter-clockwise text-2xl text-slate-300 block mb-1"></i>
                            Đang khởi tạo các mốc tiến độ điều vận...
                        </div>
                    `;
                }
            } else {
                let rowsHtml = '';
                timelineList.forEach(item => {
                    let rowClass = 'hover:bg-slate-50/60 transition-colors opacity-60';
                    let iconHtml = `<div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[11px] font-normal mx-auto">${item.step}</div>`;
                    let textClass = 'text-slate-400 font-normal text-[13px]';
                    let actorTextClass = 'text-slate-400 font-normal text-[13px]';
                    let actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                    let badgeHtml = (item.time === 'Chờ chốt sổ' || (item.step === 11 && !item.done))
                        ? '<span class="text-xs font-normal text-slate-400 uppercase whitespace-nowrap">Chờ chốt sổ</span>'
                        : '<span class="text-xs font-normal text-slate-400 uppercase">Chưa thực hiện</span>';
                    
                    if (item.active) {
                        rowClass = 'bg-teal-50/40 hover:bg-teal-50/70 transition-colors border-l-4 border-l-teal-600';
                        iconHtml = '<div class="w-6 h-6 rounded-full bg-teal-600 text-white ring-4 ring-teal-100 flex items-center justify-center font-bold text-xs animate-pulse mx-auto"><div class="w-2 h-2 rounded-full bg-white"></div></div>';
                        textClass = 'text-teal-950 font-bold text-[13.5px]';
                        actorTextClass = 'text-teal-900 font-bold text-[13px]';
                        actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                        badgeHtml = '<span class="text-xs font-bold text-teal-700 uppercase whitespace-nowrap animate-pulse">ĐANG THỰC HIỆN</span>';
                    } else if (item.done) {
                        rowClass = 'hover:bg-slate-50/80 transition-colors';
                        iconHtml = '<div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto"><i class="ph-bold ph-check text-xs"></i></div>';
                        textClass = 'text-slate-800 font-medium text-[13px]';
                        actorTextClass = 'text-slate-700 font-medium text-[13px]';
                        actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                        badgeHtml = '<span class="text-xs font-bold text-emerald-700 uppercase whitespace-nowrap">Hoàn thành</span>';
                    }

                    // Chứng từ đính kèm (Chỉ hiển thị khi có chứng từ thật đính kèm)
                    let docsHtml = '';
                    if (item.docs && item.docs.length > 0) {
                        const validDocs = item.docs.filter(doc => (typeof doc === 'object' && doc.url && doc.url.trim() !== ''));
                        if (validDocs.length > 0) {
                            const formattedDocs = validDocs.map(doc => {
                                const docName = doc.name || 'Chứng từ';
                                const docUrl = doc.url;
                                return `<a href="${docUrl}" target="_blank" rel="noopener noreferrer" class="text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2 inline-flex items-center gap-0.5 transition-colors" title="Bấm xem tài liệu / ảnh gốc"><i class="ph ph-file-text text-xs text-teal-600"></i><span>${docName}</span><i class="ph-bold ph-arrow-square-out text-[9px] text-teal-500"></i></a>`;
                            }).join('<span class="text-slate-300 mx-1.5 font-normal">;</span>');
                            docsHtml = formattedDocs;
                        }
                    }

                    rowsHtml += `
                        <tr class="${rowClass}">
                            <td class="py-3 px-3 text-center align-top">
                                ${iconHtml}
                            </td>
                            <td class="py-3 px-3 align-top">
                                <div class="${textClass} leading-snug">${item.title}</div>
                                ${item.time ? `
                                    <div class="text-[11px] mt-0.5 font-mono ${item.active ? 'text-teal-800 font-bold' : (item.done ? 'text-slate-500 font-medium' : 'text-slate-400')} flex items-center gap-1">
                                        <i class="ph ph-clock text-xs ${item.active ? 'text-teal-600' : 'text-slate-400'}"></i>
                                        <span>${item.time}</span>
                                    </div>
                                ` : ''}
                                ${docsHtml ? `
                                    <div class="text-[11.5px] mt-1.5 text-slate-600 leading-relaxed bg-slate-50/80 px-2 py-1 rounded-md border border-slate-200/60 inline-block">
                                        <span class="text-slate-400 font-medium mr-1"><i class="ph ph-paperclip mr-0.5 text-slate-400"></i>Chứng từ:</span>
                                        ${docsHtml}
                                    </div>
                                ` : ''}
                            </td>
                            <td class="py-3 px-3 text-center align-top whitespace-nowrap">
                                ${badgeHtml}
                            </td>
                            <td class="py-3 px-3 align-top whitespace-nowrap">
                                <span class="${actorTextClass}">${actorDisplay}</span>
                            </td>
                        </tr>
                    `;
                });

                if (tContainer.tagName === 'TBODY') {
                    tContainer.innerHTML = rowsHtml;
                } else {
                    tContainer.innerHTML = `
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-y border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-heading">
                                    <th class="py-2.5 px-3 w-14 text-center">Bước</th>
                                    <th class="py-2.5 px-3 min-w-[260px]">Nội Dung & Chứng Từ Đính Kèm</th>
                                    <th class="py-2.5 px-3 w-36 text-center">Trạng Thái</th>
                                    <th class="py-2.5 px-3 min-w-[170px]">Bộ Phận / Người Xử Lý</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs font-sans">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    `;
                }
            }
        }

        // --- RENDER DANH SÁCH CHỨNG TỪ GỐC & HÓA ĐƠN ĐIỆN TỬ ---
        const docContainer = document.getElementById('detail-documents');
        if (docContainer) {
            docContainer.innerHTML = '';
            const docList = trip.documents || [];
            if (docList.length === 0) {
                docContainer.innerHTML = `
                    <div class="py-4 text-center text-slate-400 text-xs italic md:col-span-2">
                        <i class="ph ph-file-dashed text-xl text-slate-300 block mb-1"></i>
                        Chưa có chứng từ đính kèm cho chuyến xe này.
                    </div>
                `;
            } else {
                docList.forEach(doc => {
                    // Xác định icon, màu sắc và danh mục chứng từ
                    let iconClass = 'ph-bold ph-file-text text-teal-600';
                    let iconBg = 'bg-teal-50 border-teal-200';
                    let tagLabel = doc.type_label || 'Chứng từ';

                    if (doc.type === 'BOOKING_NOTE') {
                        iconClass = 'ph-bold ph-file-pdf text-rose-600';
                        iconBg = 'bg-rose-50 border-rose-200';
                        tagLabel = 'Lệnh Booking / Cấp Rỗng';
                    } else if (doc.type === 'EIR_PICKUP') {
                        iconClass = 'ph-bold ph-truck text-blue-600';
                        iconBg = 'bg-blue-50 border-blue-200';
                        tagLabel = 'Phiếu EIR Lấy Cont';
                    } else if (doc.type === 'EIR_DROPOFF') {
                        iconClass = 'ph-bold ph-arrow-down-left text-indigo-600';
                        iconBg = 'bg-indigo-50 border-indigo-200';
                        tagLabel = 'Phiếu EIR Hạ Cont';
                    } else if (doc.type === 'POD') {
                        iconClass = 'ph-bold ph-signature text-emerald-600';
                        iconBg = 'bg-emerald-50 border-emerald-200';
                        tagLabel = 'Biên bản POD';
                    } else if (doc.type === 'INVOICE') {
                        iconClass = 'ph-bold ph-receipt text-amber-600';
                        iconBg = 'bg-amber-50 border-amber-200';
                        tagLabel = 'Hóa đơn / Biên nhận';
                    } else if (doc.type === 'WEIGHT_TICKET') {
                        iconClass = 'ph-bold ph-scales text-purple-600';
                        iconBg = 'bg-purple-50 border-purple-200';
                        tagLabel = 'Phiếu cân';
                    } else if (doc.type === 'CONTAINER_CHECK') {
                        iconClass = 'ph-bold ph-shield-check text-cyan-600';
                        iconBg = 'bg-cyan-50 border-cyan-200';
                        tagLabel = 'Giám định vỏ cont';
                    }

                    docContainer.innerHTML += `
                        <div class="flex items-center p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 transition-all shadow-2xs">
                            <div class="w-10 h-10 rounded-lg ${iconBg} border flex items-center justify-center mr-3 shrink-0">
                                <i class="${iconClass} text-xl"></i>
                            </div>
                            <div class="flex-1 min-w-0 pr-2">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                    <span class="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-heading">${tagLabel}</span>
                                    <p class="text-[13px] font-bold text-slate-900 truncate" title="${doc.name}">${doc.name}</p>
                                </div>
                                <p class="text-[11px] font-medium text-slate-600 truncate mt-0.5">${doc.details}</p>
                                <p class="text-[10px] text-slate-400 mt-0.5 flex items-center font-mono">
                                    <i class="ph ph-clock mr-1 text-[10px]"></i>${doc.time}
                                </p>
                            </div>
                            <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                                <span class="text-[10px] px-2 py-0.5 ${doc.is_verified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border rounded-md font-bold font-heading">
                                    ${doc.is_verified ? 'Đã Nghiệm Thu' : 'Chờ Đối Chiếu'}
                                </span>
                                ${doc.file_url ? `
                                    <a href="${doc.file_url}" target="_blank" rel="noopener noreferrer" 
                                       class="px-2 py-0.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 flex items-center gap-1 transition-colors" title="Xem / Tải chứng từ">
                                        <i class="ph-bold ph-eye"></i> Xem
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
        }

    } catch (err) {
        console.error('Error fetching trip detail:', err);
        showToast('danger', err.message || 'Không thể mở chi tiết chuyến xe.', 'Lỗi');
    }
}

// Hàm render Bảng Kê Chi Phí 8 Mục chuẩn theo 5 ảnh thực tế của Triền Võ
function renderCostSheetTable(trip) {
    const tbody = document.getElementById('cost-sheet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

    const costItems = [
        {
            stt: 1,
            title: 'HĐ điện tử',
            key: 'fee_einvoice',
            sub: 'Thông tin hóa đơn điện tử Cảng / Depot tra cứu',
            getVal: (t) => {
                const invExpenses = (t.expenses || []).filter(e => e.invoice_number);
                if (invExpenses.length === 0) return { text: 'Chưa có HĐĐT', hasInv: false };
                return {
                    text: invExpenses.map(e => `Số HĐ: ${e.invoice_number} (Mã: ${e.invoice_lookup_code || 'N/A'})`).join('; '),
                    hasInv: true,
                    lookup_url: invExpenses[0].invoice_lookup_url
                };
            }
        },
        { stt: 2, title: 'Nâng', code: 'LIFT_ON', key: 'fee_lift_on' },
        { stt: 3, title: 'Hạ', code: 'LIFT_OFF', key: 'fee_lift_off' },
        { stt: 4, title: 'Cược cont', code: 'CONTAINER_DEPOSIT', key: 'fee_deposit' },
        { stt: 5, title: 'Cân xe', code: 'WEIGHING', key: 'fee_weighing' },
        { stt: 6, title: 'Bốc xếp', code: 'LABOR_STEVEDORING', key: 'fee_labor' },
        { stt: 7, title: 'Vé cầu đường', code: 'TOLL_FEE', key: 'fee_toll' },
        { stt: 8, title: 'Chi phí khác', code: 'OTHER', key: 'fee_other' },
    ];

    let totalCalculated = 0;

    function renderExpenseDriverLegBadge(exp, t) {
        if (!exp) return '<span class="text-slate-300 text-xs">-</span>';
        const leg = exp.trip_leg || 'ENTIRE';
        if (leg === 'LEG_1') {
            const dName = exp.driver_name || t.driver || 'Tài xế 1';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Xe 1';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center text-[11px] font-bold text-teal-700 uppercase shrink-0">
                        <i class="ph-bold ph-arrow-circle-right mr-1"></i>Chặng 1
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'LEG_2') {
            const dName = exp.driver_name || t.dropoff_driver || 'Tài xế 2';
            const vPlate = exp.vehicle_plate || t.dropoff_vehicle || 'Xe 2';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center text-[11px] font-bold text-indigo-700 uppercase shrink-0">
                        <i class="ph-bold ph-arrow-circle-down mr-1"></i>Chặng 2
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'COMPANY') {
            return `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <i class="ph ph-buildings mr-1 text-slate-500"></i>Công ty chi chung
                </span>
            `;
        } else {
            const dName = exp.driver_name || t.driver || 'Tài xế';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Đầu kéo';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        }
    }

    costItems.forEach(item => {
        if (item.key === 'fee_einvoice') {
            const einvInfo = item.getVal(trip);
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70">
                    <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        <p class="text-[11.5px] text-slate-400 mt-0.5">${item.sub}</p>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70 text-slate-400 text-xs italic">
                        Cảng / Depot
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-400 font-medium border-r border-slate-200/70">-</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70" colspan="2">
                        ${einvInfo.hasInv ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-[11.5px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    ${einvInfo.text}
                                </span>
                                ${einvInfo.lookup_url ? `
                                    <a href="${einvInfo.lookup_url}" target="_blank" class="text-[11.5px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded">
                                        <i class="ph ph-arrow-square-out mr-1"></i> Tra cứu online
                                    </a>
                                ` : ''}
                            </div>
                        ` : `
                            <span class="text-[11.5px] text-slate-400 italic">Chưa phát sinh hóa đơn</span>
                        `}
                    </td>
                    <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                        ${einvInfo.hasInv 
                            ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800">Đã Liên Kết</span>`
                            : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-500">Trống</span>`}
                    </td>
                    <td class="py-1.5 px-3 text-center text-slate-300">-</td>
                </tr>
            `;
        } else {
            // Lấy các bản ghi expense khớp với category này
            const matchedExps = (trip.expenses || []).filter(e => {
                if (item.code === 'LIFT_ON') return e.category_code === 'LIFT_ON' || e.category_code === 'LIFT_ON_OFF';
                if (item.code === 'LIFT_OFF') return e.category_code === 'LIFT_OFF';
                if (item.code === 'TOLL_FEE') return e.category_code === 'TOLL_FEE' || e.category_code === 'BOT_TOLL';
                if (item.code === 'CONTAINER_DEPOSIT') return e.category_code === 'CONTAINER_DEPOSIT';
                if (item.code === 'WEIGHING') return e.category_code === 'WEIGHING';
                if (item.code === 'LABOR_STEVEDORING') return e.category_code === 'LABOR_STEVEDORING' || e.category_code === 'STEVEDORING';
                if (item.code === 'OTHER') return e.category_code === 'OTHER' || e.category_code === 'PORT_STORAGE' || e.category_code === 'REPAIR_TIRE';
                return false;
            });

            const amountSum = matchedExps.reduce((acc, curr) => acc + Number(curr.amount), 0);
            totalCalculated += amountSum;

            if (matchedExps.length > 1) {
                // TRƯỜNG HỢP CÓ TỪ 2 KHOẢN CHI TRỞ LÊN: HỖ TRỢ BẤM VÀO ĐỂ XỔ XUỐNG XEM CHI TIẾT TỪNG DÒNG
                const summaryInvText = matchedExps.map(e => e.invoice_number ? e.invoice_number : '').filter(Boolean).join(', ');
                const hasLeg1 = matchedExps.some(e => e.trip_leg === 'LEG_1');
                const hasLeg2 = matchedExps.some(e => e.trip_leg === 'LEG_2');
                const legSummaryBadge = (hasLeg1 && hasLeg2)
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300"><i class="ph-bold ph-arrows-split mr-1 text-amber-700"></i>Chặng 1 & 2</span>`
                    : (hasLeg1 ? `<span class="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Chặng 1</span>` : (hasLeg2 ? `<span class="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Chặng 2</span>` : `<span class="text-xs font-bold text-slate-700">${trip.driver || '-'}</span>`));
                
                tbody.innerHTML += `
                    <!-- DÒNG TỔNG GỘP (Clickable Accordion) -->
                    <tr onclick="toggleExpenseDetail('${item.code}')" class="hover:bg-teal-50/50 cursor-pointer transition-colors bg-slate-50/40 border-b border-slate-200/80">
                        <td class="py-2 px-3 text-center text-teal-800 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                                <span class="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-teal-100 text-teal-900 text-[10.5px] font-bold font-heading hover:bg-teal-200 transition-colors">
                                    <i class="ph-bold ph-list-numbers"></i>
                                    <span>${matchedExps.length} khoản chi</span>
                                    <i id="icon-toggle-${item.code}" class="ph ph-caret-down text-xs transition-transform duration-200"></i>
                                </span>
                            </div>
                            <p class="text-[11.5px] text-teal-700 font-semibold mt-0.5 flex items-center">
                                <i class="ph ph-hand-pointing mr-1"></i> Bấm để xem/ẩn chi tiết từng vé (${matchedExps.length} dòng con)
                            </p>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            ${legSummaryBadge}
                        </td>
                        <td class="py-2 px-3 text-right font-black text-[13px] tabular-nums text-rose-600 font-mono border-r border-slate-200/70">
                            <span class="border-b-2 border-dotted border-rose-400 pb-0.5" title="Tổng cộng ${matchedExps.length} khoản">
                                ${formatMoney(amountSum)}
                            </span>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <span class="text-[11.5px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                ${summaryInvText ? `Gồm các HĐ: ${summaryInvText}` : `Tổng hợp ${matchedExps.length} chứng từ`}
                            </span>
                        </td>
                        <td class="py-2 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <span class="text-teal-800 font-semibold">Xem chi tiết các khoản bên dưới</span>
                        </td>
                        <td class="py-2 px-3 text-center border-r border-slate-200/70">
                            <button type="button" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center space-x-1 shadow-sm font-heading">
                                <span>Chi tiết</span>
                                <i class="ph ph-caret-down text-xs"></i>
                            </button>
                        </td>
                        <td class="py-2 px-3 text-center text-slate-400 text-[11px] font-semibold">
                            Tập hợp
                        </td>
                    </tr>

                    <!-- CÁC DÒNG CON CHI TIẾT (Sub-rows) -->
                    ${matchedExps.map((subExp, sIdx) => `
                        <tr class="sub-row-${item.code} hidden bg-teal-50/30 border-l-4 border-l-teal-600 border-b border-slate-100 transition-all text-xs">
                            <td class="py-1.5 px-2.5 text-center text-teal-800 font-mono font-bold text-[11.5px] border-r border-slate-200/70">${item.stt}.${sIdx + 1}</td>
                            <td class="py-1.5 px-2.5 pl-6 border-r border-slate-200/70">
                                <div class="flex items-center space-x-2">
                                    <i class="ph ph-arrow-elbow-down-right text-teal-700 font-black text-sm"></i>
                                    <span class="font-bold text-slate-900 text-[12.5px]">${subExp.notes || (item.title + ' #' + (sIdx + 1))}</span>
                                </div>
                                ${subExp.time ? `<p class="text-[11px] text-slate-400 pl-5 font-normal mt-0.5">${subExp.time}</p>` : ''}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${renderExpenseDriverLegBadge(subExp, trip)}
                            </td>
                            <td class="py-1.5 px-2.5 text-right font-black text-rose-600 tabular-nums font-mono text-[13px] border-r border-slate-200/70">
                                ${formatMoney(subExp.amount)}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${subExp.invoice_number ? `
                                    <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                                        <span>HĐ: ${subExp.invoice_number}${subExp.invoice_lookup_code ? ' / ' + subExp.invoice_lookup_code : ''}</span>
                                        ${subExp.invoice_lookup_url ? `
                                            <a href="${subExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                                <i class="ph ph-arrow-square-out text-xs"></i>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : '<span class="text-slate-400 text-[11.5px]">Vé trạm / Biên nhận</span>'}
                            </td>
                            <td class="py-1.5 px-2.5 text-slate-700 text-[11.5px] font-medium border-r border-slate-200/70">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span>${subExp.invoice_issuer || subExp.notes || '<span class="text-slate-400">-</span>'}</span>
                                    ${(subExp.expense_payer_type === 'TVL_OBH' || (subExp.is_on_behalf_of_customer && !subExp.reimburse_to_subcontractor)) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>TVL CHI HỘ
                                        </span>
                                    ` : ((subExp.expense_payer_type === 'SUB_OBH' || subExp.reimburse_to_subcontractor) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-truck mr-0.5 text-[10px]"></i>3PL CHI HỘ
                                        </span>
                                    ` : `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                                            🏢 TVL
                                        </span>
                                    `)}
                                </div>
                            </td>
                            <td class="py-1.5 px-2.5 text-center border-r border-slate-200/70">
                                <span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    subExp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                    subExp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }">
                                    ${subExp.status_label || (subExp.status === 'SETTLED' ? 'Đã chốt sổ' : (subExp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                                </span>
                            </td>
                            <td class="py-1.5 px-2.5 text-center">
                                ${trip.is_expenses_settled || !subExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="event.stopPropagation(); editExpensePrompt(${subExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); deleteExpensePrompt(${subExp.id}, '${subExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                `;
            } else {
                // TRƯỜNG HỢP CÓ 0 HOẶC 1 KHOẢN CHI: HIỂN THỊ DÒNG ĐƠN BÌNH THƯỜNG
                const singleExp = matchedExps[0] || null;
                const invNoText = singleExp && singleExp.invoice_number 
                    ? `HĐ: ${singleExp.invoice_number}${singleExp.invoice_lookup_code ? ' / ' + singleExp.invoice_lookup_code : ''}` 
                    : '';
                const issuerText = singleExp ? (singleExp.invoice_issuer || singleExp.notes) : '';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70 ${amountSum > 0 ? 'bg-amber-50/20' : ''}">
                        <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${singleExp ? renderExpenseDriverLegBadge(singleExp, trip) : '<span class="text-slate-300 text-xs">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-right font-black text-[13px] tabular-nums font-mono border-r border-slate-200/70 ${amountSum > 0 ? 'text-rose-600' : 'text-slate-400'}">
                            ${amountSum > 0 ? formatMoney(amountSum) : '-'}
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${invNoText ? `
                                <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <span>${invNoText}</span>
                                    ${singleExp.invoice_lookup_url ? `
                                        <a href="${singleExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                            <i class="ph ph-arrow-square-out text-xs"></i>
                                        </a>
                                    ` : ''}
                                </div>
                            ` : '<span class="text-slate-400 text-[11.5px]">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span>${issuerText || '<span class="text-slate-400">-</span>'}</span>
                                ${singleExp ? (
                                    (singleExp.expense_payer_type === 'TVL_OBH' || (singleExp.is_on_behalf_of_customer && !singleExp.reimburse_to_subcontractor)) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>TVL CHI HỘ
                                        </span>
                                    ` : ((singleExp.expense_payer_type === 'SUB_OBH' || singleExp.reimburse_to_subcontractor) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-truck mr-0.5 text-[10px]"></i>3PL CHI HỘ
                                        </span>
                                    ` : `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                                            🏢 TVL
                                        </span>
                                    `)
                                ) : ''}
                            </div>
                        </td>
                        <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                            ${amountSum > 0 
                                ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    (singleExp && singleExp.status === 'SETTLED') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                }">${(singleExp && singleExp.status_label) || 'Đã Ghi Nhận'}</span>` 
                                : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-400">-</span>`}
                        </td>
                        <td class="py-1.5 px-3 text-center">
                            ${singleExp ? (
                                trip.is_expenses_settled || !singleExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="editExpensePrompt(${singleExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="deleteExpensePrompt(${singleExp.id}, '${singleExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `
                            ) : '<span class="text-slate-300">-</span>'}
                        </td>
                    </tr>
                `;
            }
        }
    });

    const totalEl = document.getElementById('cost-sheet-total');
    if (totalEl) totalEl.innerText = formatMoney(totalCalculated);

    // Hiển thị dòng Tổng Chi Hộ KH nếu có (cất riêng khỏi chi phí vận hành)
    const reimbursableTotal = trip.cost_sheet?.total_reimbursable || 0;
    const reimbursableItems = trip.cost_sheet?.reimbursable_items || [];
    const reimbursableRow = document.getElementById('cost-sheet-reimbursable-row');
    const reimbursableTotalEl = document.getElementById('cost-sheet-reimbursable-total');
    if (reimbursableRow) {
        reimbursableRow.style.display = reimbursableTotal > 0 ? '' : 'none';
    }
    if (reimbursableTotalEl) {
        const itemsText = reimbursableItems.map(it => `${it.category}: ${formatMoney(it.amount)}`).join(' · ');
        reimbursableTotalEl.innerHTML = `
            <td colspan="2" class="p-3 text-right text-xs font-bold text-amber-800">
                <i class="ph-bold ph-arrow-up-right mr-1"></i>Tổng Khoản Chi Hộ Khách Hàng
                <p class="text-[10px] font-normal text-amber-600 mt-0.5">${itemsText || 'Công ty ứng chi trước, thu lại khi quyết toán với KH'}</p>
            </td>
            <td class="p-3 text-right font-black text-amber-700 tabular-nums">${formatMoney(reimbursableTotal)}</td>
            <td colspan="4" class="p-3 text-xs text-amber-600">
                <span class="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold text-amber-800 text-[10px]">Không tính vào chi phí công ty</span>
            </td>
        `;
    }

    // ĐỒNG BỘ TUYỆT ĐỐI VỚI BOX P&L VÀ APP MOBILE (SINGLE SOURCE OF TRUTH)
    const pnlExpenseEl = document.getElementById('pnl-expense');
    if (pnlExpenseEl) pnlExpenseEl.innerText = formatMoney(totalCalculated);

    const rev = Number(trip.financials?.revenue || 0);
    const actualProfit = rev - totalCalculated;
    const actualMargin = rev > 0 ? ((actualProfit / rev) * 100).toFixed(1) : 0;
    const profitEl = document.getElementById('pnl-profit');
    if (profitEl) {
        profitEl.innerText = `${formatMoney(actualProfit)} (${actualMargin}%)`;
    }

    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalCalculated);
}

// Xây dựng nội dung tin nhắn Lệnh điều xe gửi Zalo chuẩn hóa
function buildDriverZaloMessage(trip) {
    if (!trip) return '';
    const driverToken = trip.driver_hashid || trip.hashid || trip.id || trip.trip_code;
    const portalUrl = `${window.location.origin}/driver/${driverToken}/`;
    const tripCode = trip.id || trip.trip_code || trip.code || 'TVL-XXX';
    const vehicle = trip.vehicle || trip.truck || '-';
    const trailer = trip.trailer || '-';
    const cont = trip.container || trip.container_number || 'CHƯA CÓ CONT';
    const contType = trip.container_type ? ` (${trip.container_type})` : '';
    const seal = trip.seal || trip.seal_number || '-';
    const pickup = trip.pickup || trip.pickup_location || '-';
    const warehouse = trip.warehouse || trip.warehouse_location || '-';
    const dropoff = trip.dropoff || trip.dropoff_location || '-';
    const loadingTimeStr = trip.loading_time ? `\n⏰ Giờ hẹn đóng hàng: ${trip.loading_time}` : '';

    return `🚚 LỆNH ĐIỀU XE BIM LOGISTICS:
• Chuyến: ${tripCode}
• Xe: ${vehicle} | Mooc: ${trailer}
• Cont: ${cont}${contType} | Seal: ${seal}
• Điểm 1 (Lấy cont): ${pickup}
• Điểm 2 (Giao kho): ${warehouse}
• Điểm 3 (Hạ cont): ${dropoff}${loadingTimeStr}
⚠️ LƯU Ý: Vui lòng mở link bên dưới xác nhận nhận chuyến trong vòng 60 phút.

👉 Mở link mobile báo mốc & kê chi phí:
${portalUrl}`;
}
window.buildDriverZaloMessage = buildDriverZaloMessage;

// Sao chép Lệnh điều xe kèm link Mobile Driver Portal gửi tài xế qua Zalo/SMS
window.copyDriverPortalLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chi tiết chuyến xe để sao chép!');
        return;
    }
    const message = buildDriverZaloMessage(trip);
    const portalUrl = `${window.location.origin}/driver/${trip.driver_hashid || trip.hashid || trip.id}/`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép Lệnh điều xe kèm link Mobile Driver Portal vào bộ nhớ tạm!\nBạn có thể dán (Ctrl+V) ngay vào Zalo gửi cho tài xế.', 'Đã Sao Chép Lệnh Xe');
        }).catch(err => {
            prompt('Sao chép liên kết gửi tài xế:', portalUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi tài xế:', portalUrl);
    }
};

window.openZaloDriverChat = function() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const message = buildDriverZaloMessage(trip);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
    }
    const phone = trip.driver_phone ? String(trip.driver_phone).replace(/\D/g, '') : '';
    if (phone) {
        window.open(`https://zalo.me/${phone}`, '_blank');
        showToast('success', `Đã sao chép Lệnh điều xe vào bộ nhớ tạm & Mở Zalo tài xế (${phone})! Hãy dán (Ctrl+V) để gửi.`, 'Mở Zalo Thành Công');
    } else {
        showToast('warning', 'Tài xế chưa có số điện thoại đăng ký Zalo trong hồ sơ.', 'Thiếu SĐT Tài Xế');
    }
};

window.copyCustomerTrackingLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chuyến xe để sao chép!');
        return;
    }
    const trackingToken = trip.tracking_hashid || trip.hashid || trip.trip_code;
    const trackingUrl = `${window.location.origin}/tracking/${trackingToken}/`;
    const destWarehouse = trip.delivery_warehouse || trip.warehouse || 'Kho Khách Hàng';
    const message = `THÔNG TIN TRA CỨU VẬN ĐƠN CONTAINER - BIM LOGISTICS:\nChuyến: ${trip.trip_code || trip.code || trip.id}\nContainer: ${trip.container || '-'} (${trip.container_type || '40HC'})\nSố Chì (Seal): ${trip.seal || 'Chưa bấm'}\nKho Giao Hàng: ${destWarehouse}\n- Quý khách có thể theo dõi tiến độ chuyến xe thời gian thực tại: ${trackingUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép liên kết tra cứu tiến độ chuyến xe dành cho khách hàng!\nBạn có thể dán (Ctrl+V) gửi qua Zalo / Email cho chủ hàng.', 'Đã Sao Chép Tracking Link');
        }).catch(err => {
            prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
    }
};

// Hàm mở / đóng chi tiết các dòng chi phí con khi người dùng click
function toggleExpenseDetail(code) {
    const subRows = document.querySelectorAll(`.sub-row-${code}`);
    const icon = document.getElementById(`icon-toggle-${code}`);
    subRows.forEach(row => {
        row.classList.toggle('hidden');
    });
    if (icon) {
        icon.classList.toggle('rotate-180');
    }
}
