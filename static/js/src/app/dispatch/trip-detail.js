/**
 * ==========================================================================
 * GSS LOGISTICS — FRONTEND APPLICATION LOGIC (TMS & FLEET)
 * Triết lý: Graceful Notification, Defensive UI & GSS Enterprise Table Standard
 * Kế thừa từ GSS
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

        // Quy cách cont & Chế độ vận hành
        const contLocBadge = document.getElementById('detail-cont-location-badge');
        if (contLocBadge) {
            if (trip.is_split_trip) {
                contLocBadge.innerText = 'Cắt Kéo / Drop & Hook';
                contLocBadge.className = 'text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800';
            } else {
                contLocBadge.innerText = trip.container_type || 'Cont Tiêu Chuẩn';
                contLocBadge.className = 'text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-800';
            }
        }

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

        // Hành trình 3 điểm chuẩn hóa: Nơi Lấy Cont | Kho Đóng/ Trả Hàng | Nơi Trả Cont
        setText('detail-pickup', trip.pickup || '-');
        setText('detail-warehouse', trip.warehouse || '-');
        setText('detail-dropoff', trip.dropoff || 'Hạ bãi rỗng');

        // Phân loại bản chất luồng vận chuyển theo Loại Hình Hàng Hóa
        const rawType = ((trip.type_raw || trip.type || '') + '').toUpperCase();
        const isImport = rawType.includes('IMPORT') || rawType.includes('NHẬP') || rawType.includes('NHAP');
        const isExport = rawType.includes('EXPORT') || rawType.includes('XUẤT') || rawType.includes('XUAT');

        const natureBadge = document.getElementById('detail-route-nature-badge');
        const pickupSub = document.getElementById('detail-pickup-sub');
        const warehouseSub = document.getElementById('detail-warehouse-sub');
        const dropoffSub = document.getElementById('detail-dropoff-sub');

        if (isExport) {
            if (natureBadge) {
                natureBadge.textContent = 'Hàng Xuất (Lấy Rỗng ➔ Đóng Hàng ➔ Hạ Xuất)';
                natureBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-heading bg-emerald-100 text-emerald-800 border border-emerald-300';
            }
            if (pickupSub) { pickupSub.textContent = 'Lấy Vỏ Rỗng'; pickupSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 font-heading uppercase'; }
            if (warehouseSub) { warehouseSub.textContent = 'Đóng Hàng'; warehouseSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-heading uppercase'; }
            if (dropoffSub) { dropoffSub.textContent = 'Hạ Cont Hàng (Cảng Xuất)'; dropoffSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-heading uppercase'; }
        } else if (isImport) {
            if (natureBadge) {
                natureBadge.textContent = 'Hàng Nhập (Lấy Cont Hàng ➔ Rút Hàng ➔ Trả Rỗng)';
                natureBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-heading bg-blue-100 text-blue-800 border border-blue-300';
            }
            if (pickupSub) { pickupSub.textContent = 'Cảng Lấy Cont Hàng'; pickupSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-heading uppercase'; }
            if (warehouseSub) { warehouseSub.textContent = 'Dỡ / Rút Hàng Khách'; warehouseSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-heading uppercase'; }
            if (dropoffSub) { dropoffSub.textContent = 'Depot Hạ Trả Vỏ Rỗng'; dropoffSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-heading uppercase'; }
        } else {
            if (natureBadge) {
                natureBadge.textContent = 'Nội Địa (Nhận Hàng ➔ Giao Hàng ➔ Trả Cont)';
                natureBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-heading bg-purple-100 text-purple-800 border border-purple-300';
            }
            if (pickupSub) { pickupSub.textContent = 'Điểm Nhận Hàng'; pickupSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 font-heading uppercase'; }
            if (warehouseSub) { warehouseSub.textContent = 'Kho Giao / Nhận'; warehouseSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-heading uppercase'; }
            if (dropoffSub) { dropoffSub.textContent = 'Bãi Hạ / Điểm Trả'; dropoffSub.className = 'text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-heading uppercase'; }
        }

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
