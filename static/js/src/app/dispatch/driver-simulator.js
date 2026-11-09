// Đồng bộ dữ liệu hiện trường sang Mobile Driver Sync (Simulator Chuẩn GSS)
function renderDriverMobileApp(trip) {
    if (!trip) return;

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

    // 1. Header Simulator
    const appTripCode = document.getElementById('app-trip-code');
    if (appTripCode) appTripCode.innerText = trip.id || 'GSS-XXX';

    const appDriver = document.getElementById('app-driver-name');
    if (appDriver) appDriver.innerText = `Tài xế: ${trip.driver || 'Chưa gán'}`;

    const appPlate = document.getElementById('app-vehicle-plate');
    if (appPlate) appPlate.innerText = trip.vehicle || 'Chưa gán';

    const statusBadge = document.getElementById('app-status-badge');
    if (statusBadge) {
        statusBadge.innerText = trip.status_label || trip.status || 'MỚI';
        if (trip.status === 'COMPLETED') {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase';
        } else if (trip.status === 'DELIVERED') {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-teal-500 text-white uppercase';
        } else if (['IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY', 'CONTAINER_PICKED', 'ACCEPTED'].includes(trip.status)) {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 uppercase';
        } else {
            statusBadge.className = 'text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white uppercase';
        }
    }

    // 2. Nút Vận Đơn & Container Summary
    const appCont = document.getElementById('app-cont-no');
    if (appCont) appCont.innerText = trip.container || 'Chưa gán';

    const appBooking = document.getElementById('app-booking-no');
    if (appBooking) appBooking.innerText = trip.booking_or_bill || trip.booking || '-';

    const appCustomsDot = document.getElementById('app-customs-dot');
    if (appCustomsDot) {
        if (trip.customs_declaration) {
            appCustomsDot.classList.remove('hidden');
        } else {
            appCustomsDot.classList.add('hidden');
        }
    }

    // 3. Lộ Trình 3 Điểm & 3 Nút Chỉ Đường Thông Minh
    const pLoc = trip.pickup_depot || trip.pickup || 'Cảng / Bãi lấy cont';
    const wLoc = trip.delivery_warehouse || trip.warehouse || 'Kho đóng/trả hàng';
    const dLoc = trip.dropoff_depot || trip.dropoff || 'Cảng / Bãi hạ cont';

    const leg1Name = document.getElementById('sim-leg1-name');
    if (leg1Name) leg1Name.innerText = pLoc;
    const leg2Name = document.getElementById('sim-leg2-name');
    if (leg2Name) leg2Name.innerText = wLoc;
    const leg3Name = document.getElementById('sim-leg3-name');
    if (leg3Name) leg3Name.innerText = dLoc;

    const leg2Time = document.getElementById('sim-leg2-time');
    if (leg2Time) {
        let tStr = '';
        if (trip.loading_time) tStr += `Hẹn: ${trip.loading_time}`;
        if (trip.warehouse_dock) tStr += (tStr ? ' | ' : '') + `Dock: ${trip.warehouse_dock}`;
        leg2Time.innerText = tStr;
    }

    const mapBase = 'https://www.google.com/maps/dir/?api=1&destination=';
    const map1 = document.getElementById('sim-leg1-map');
    if (map1) map1.href = `${mapBase}${encodeURIComponent(pLoc)}`;
    const map2 = document.getElementById('sim-leg2-map');
    if (map2) map2.href = `${mapBase}${encodeURIComponent(wLoc)}`;
    const map3 = document.getElementById('sim-leg3-map');
    if (map3) map3.href = `${mapBase}${encodeURIComponent(dLoc)}`;

    // Modal Route Elements
    const mLeg1Name = document.getElementById('sim-modal-leg1-name');
    if (mLeg1Name) mLeg1Name.innerText = pLoc;
    const mLeg2Name = document.getElementById('sim-modal-leg2-name');
    if (mLeg2Name) mLeg2Name.innerText = wLoc;
    const mLeg3Name = document.getElementById('sim-modal-leg3-name');
    if (mLeg3Name) mLeg3Name.innerText = dLoc;

    const mLeg1Map = document.getElementById('sim-modal-leg1-map');
    if (mLeg1Map) mLeg1Map.href = `${mapBase}${encodeURIComponent(pLoc)}`;
    const mLeg2Map = document.getElementById('sim-modal-leg2-map');
    if (mLeg2Map) mLeg2Map.href = `${mapBase}${encodeURIComponent(wLoc)}`;
    const mLeg3Map = document.getElementById('sim-modal-leg3-map');
    if (mLeg3Map) mLeg3Map.href = `${mapBase}${encodeURIComponent(dLoc)}`;

    const st = trip.status || 'DRAFT';

    // Đang đến
    let curDest = pLoc || 'Bãi lấy cont';
    if (st === 'RETURNING_EMPTY') {
        curDest = dLoc || 'Bãi hạ cont';
    } else if (['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED'].includes(st)) {
        curDest = wLoc || 'Kho đóng/trả hàng';
    } else if (st === 'COMPLETED') {
        curDest = 'Đã hoàn tất toàn tuyến';
    }
    const curDestEl = document.getElementById('sim-current-dest');
    if (curDestEl) curDestEl.innerText = `Đang đến: ${curDest}`;

    // Trạng thái Lộ trình 3 điểm (Style đồng bộ Driver Portal)
    const leg1Card = document.getElementById('sim-leg1-card') || document.getElementById('sim-modal-leg1-card');
    const leg1Icon = document.getElementById('sim-leg1-icon') || document.getElementById('sim-modal-leg1-icon');
    const leg1Badge = document.getElementById('sim-leg1-badge') || document.getElementById('sim-modal-leg1-badge');

    const leg2Card = document.getElementById('sim-leg2-card') || document.getElementById('sim-modal-leg2-card');
    const leg2Icon = document.getElementById('sim-leg2-icon') || document.getElementById('sim-modal-leg2-icon');
    const leg2Badge = document.getElementById('sim-leg2-badge') || document.getElementById('sim-modal-leg2-badge');

    const leg3Card = document.getElementById('sim-leg3-card') || document.getElementById('sim-modal-leg3-card');
    const leg3Icon = document.getElementById('sim-leg3-icon') || document.getElementById('sim-modal-leg3-icon');
    const leg3Badge = document.getElementById('sim-leg3-badge') || document.getElementById('sim-modal-leg3-badge');

    // Reset styles
    const setLegStyle = (card, icon, badge, mode, stepNum, titleText) => {
        if (!card) return;
        if (mode === 'DONE') {
            card.className = 'p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-300 text-emerald-950';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 bg-emerald-700 text-white';
                icon.innerHTML = '<i class="ph-bold ph-check text-xs"></i>';
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 text-emerald-800';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span><span class="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-[8.5px]">ĐÃ XONG</span>`;
            }
        } else if (mode === 'ACTIVE') {
            card.className = 'p-3 rounded-xl border-2 bg-teal-50 border-teal-600 text-teal-950 shadow-2xs';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-black text-xs mt-0.5 shrink-0 bg-teal-700 text-white ring-2 ring-teal-200';
                icon.innerHTML = `${stepNum}`;
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 text-teal-800';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span><span class="px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full text-[9px] font-black animate-pulse">⚡ ĐANG ĐẾN</span>`;
            }
        } else {
            // PENDING
            card.className = 'p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-400';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 bg-slate-200 text-slate-500';
                icon.innerHTML = `${stepNum}`;
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-bold uppercase tracking-wider text-slate-500';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span>`;
            }
        }
    };

    if (st === 'COMPLETED') {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'DONE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'DONE', 3, 'Bãi Hạ Vỏ Cont');
    } else if (st === 'RETURNING_EMPTY') {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'DONE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'ACTIVE', 3, 'Bãi Hạ Vỏ Cont');
    } else if (['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED'].includes(st)) {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'ACTIVE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'PENDING', 3, 'Bãi Hạ Vỏ Cont');
    } else {
        // DRAFT, DISPATCHED, ACCEPTED
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'ACTIVE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'PENDING', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'PENDING', 3, 'Bãi Hạ Vỏ Cont');
    }

    // 4. SMART NEXT-ACTION HERO CARD (Tương tác 1-chạm)
    const nextStepLabel = document.getElementById('sim-next-step-label');
    const nextActionTitle = document.getElementById('sim-next-action-title');
    const nextActionDesc = document.getElementById('sim-next-action-desc');
    const nextActionBtns = document.getElementById('sim-next-action-btns');

    if (nextActionBtns) {
        if (st === 'DRAFT' || st === 'DISPATCHED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 1-2/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Lệnh điều xe mới phát';
            if (nextActionDesc) nextActionDesc.innerText = 'Tài xế bấm nhận chuyến để bắt đầu hoặc từ chối để điều độ phân xe lại.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="driverReportMilestone('DECLINED_TRIP')" class="py-2.5 rounded-xl border border-rose-500/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 hover:bg-rose-950/50 active:scale-95 transition-all">
                        <i class="ph-bold ph-x-circle"></i> Từ Chối
                    </button>
                    <button type="button" onclick="driverReportMilestone('ACCEPTED_TRIP')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-check-circle"></i> Nhận Chuyến
                    </button>
                </div>
            `;
        } else if (st === 'ACCEPTED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 3/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đã nhận lệnh — Chuẩn bị xuất phát';
            if (nextActionDesc) nextActionDesc.innerText = 'Chụp ảnh giám định vỏ cont tại bãi lấy cont trước khi xuất phát.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="py-2.5 rounded-xl border border-slate-500 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-800 active:scale-95 transition-all">
                        <i class="ph-bold ph-camera"></i> Chụp Vỏ Cont
                    </button>
                    <button type="button" onclick="driverReportMilestone('DEPARTED')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-paper-plane-tilt"></i> Xuất Phát Đi
                    </button>
                </div>
            `;
        } else if (st === 'CONTAINER_PICKED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 4-5/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang trên đường đến kho khách hàng';
            if (nextActionDesc) nextActionDesc.innerText = 'Báo trước 30 phút cho thủ kho hoặc bấm Check-in ngay khi đến cổng kho.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="driverReportMilestone('APPROACHING_WAREHOUSE')" class="py-2.5 rounded-xl border border-teal-400 text-teal-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-teal-950/50 active:scale-95 transition-all">
                        <i class="ph-bold ph-bell-ringing"></i> Báo Sắp Đến
                    </button>
                    <button type="button" onclick="driverReportMilestone('ARRIVED_WAREHOUSE')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-map-pin"></i> Đến Cổng Kho
                    </button>
                </div>
            `;
        } else if (st === 'IN_TRANSIT') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 5/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Sắp đến cổng kho — Chuẩn bị Check-in';
            if (nextActionDesc) nextActionDesc.innerText = 'Vào đến cổng kho khách hàng, bấm Check-in ngay để ghi nhận giờ chờ bốc hàng.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('ARRIVED_WAREHOUSE')" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-map-pin text-base"></i>
                    <span>ĐÃ ĐẾN CỔNG KHO — CHECK-IN</span>
                </button>
            `;
        } else if (st === 'AT_WAREHOUSE') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 6/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang chờ tại cổng kho';
            if (nextActionDesc) nextActionDesc.innerText = 'Khi bảo vệ/thủ kho gọi xe vào dock, bấm nút để bắt đầu đóng/dỡ hàng.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('START_UNLOADING')" class="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-package text-base"></i>
                    <span>VÀO DOCK — BẮT ĐẦU ĐÓNG / DỠ HÀNG</span>
                </button>
            `;
        } else if (st === 'UNLOADING') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 7/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang đóng/dỡ hàng tại Dock';
            if (nextActionDesc) nextActionDesc.innerText = 'Sau khi xếp hàng xong, chụp biên bản giao nhận có chữ ký (POD).';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="py-2.5 rounded-xl border border-teal-400 text-teal-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-teal-950 active:scale-95 transition-all">
                        <i class="ph-bold ph-camera"></i> Chụp POD
                    </button>
                    <button type="button" onclick="driverReportMilestone('FINISHED_UNLOADING')" class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-check-circle"></i> Đóng Xong
                    </button>
                </div>
            `;
        } else if (st === 'DELIVERED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 8/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Hoàn tất giao hàng — Ra khỏi cổng kho';
            if (nextActionDesc) nextActionDesc.innerText = 'Kéo cont rời kho để vận chuyển về bãi cảng hạ cont.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DEPART_TO_DROPOFF')" class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-truck text-base"></i>
                    <span>KÉO CONT RỜI KHO — VỀ BÃI HẠ</span>
                </button>
            `;
        } else if (st === 'RETURNING_EMPTY') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 9/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang vận chuyển về bãi hạ';
            if (nextActionDesc) nextActionDesc.innerText = 'Đến bãi hạ, cẩu cont xuống và nhận Phiếu EIR hạ cont.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DROPOFF_COMPLETED')" class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-anchor text-base"></i>
                    <span>ĐÃ HẠ CONT — LẤY PHIẾU EIR</span>
                </button>
            `;
        } else {
            // COMPLETED
            if (nextStepLabel) nextStepLabel.innerText = 'Hoàn Tất 10/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Chuyến xe đã hoàn thành 100%';
            if (nextActionDesc) nextActionDesc.innerText = 'Toàn bộ chứng từ và chi phí đã chuyển cho Điều Độ và Kế Toán đối soát.';
            nextActionBtns.innerHTML = `
                <div class="py-2 px-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-center text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5">
                    <i class="ph-bold ph-check-fat text-emerald-400"></i>
                    <span>CHUYẾN XE ĐÃ HOÀN TẤT</span>
                </div>
            `;
        }
    }

    // 4.5. DYNAMICALLY RENDER & LOCK QUICK MILESTONES (ZERO JUMP & COMPLETED LOCK)
    
    // Sync with Dispatcher Smart Action Bar (Enterprise B2B Button Styling)
    const dNextStep = document.getElementById('dispatcher-next-step-label');
    const dNextTitle = document.getElementById('dispatcher-next-action-title');
    const dNextDesc = document.getElementById('dispatcher-next-action-desc');
    const dNextBtns = document.getElementById('dispatcher-next-action-btns');

    if (dNextStep && nextStepLabel) dNextStep.innerText = nextStepLabel.innerText;
    if (dNextTitle && nextActionTitle) dNextTitle.innerText = nextActionTitle.innerText;
    if (dNextDesc && nextActionDesc) dNextDesc.innerText = nextActionDesc.innerText;

    if (dNextBtns) {
        if (st === 'DRAFT' || st === 'DISPATCHED') {
            dNextBtns.innerHTML = `
                <div class="flex items-center gap-2">
                    <button type="button" onclick="driverReportMilestone('DECLINED_TRIP')" class="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                        <i class="ph-bold ph-x-circle text-base"></i> Từ Chối
                    </button>
                    <button type="button" onclick="driverReportMilestone('ACCEPTED_TRIP')" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                        <i class="ph-bold ph-check-circle text-base"></i> Nhận Chuyến (Thay TX)
                    </button>
                </div>
            `;
        } else if (st === 'ACCEPTED') {
            dNextBtns.innerHTML = `
                <div class="flex items-center gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                        <i class="ph-bold ph-camera text-base text-teal-600"></i> Chụp Vỏ Cont
                    </button>
                    <button type="button" onclick="driverReportMilestone('DEPARTED')" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                        <i class="ph-bold ph-paper-plane-tilt text-base"></i> Xuất Phát Đi
                    </button>
                </div>
            `;
        } else if (st === 'CONTAINER_PICKED') {
            dNextBtns.innerHTML = `
                <div class="flex items-center gap-2">
                    <button type="button" onclick="driverReportMilestone('APPROACHING_WAREHOUSE')" class="px-3.5 py-2 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                        <i class="ph-bold ph-bell-ringing text-base text-teal-600"></i> Báo Sắp Đến
                    </button>
                    <button type="button" onclick="driverReportMilestone('ARRIVED_WAREHOUSE')" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                        <i class="ph-bold ph-map-pin text-base"></i> Đến Cổng Kho
                    </button>
                </div>
            `;
        } else if (st === 'IN_TRANSIT' || st === 'AT_WAREHOUSE') {
            dNextBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('START_UNLOADING')" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                    <i class="ph-bold ph-package text-base"></i>
                    <span>BẮT ĐẦU ĐÓNG / DỠ HÀNG</span>
                </button>
            `;
        } else if (st === 'UNLOADING') {
            dNextBtns.innerHTML = `
                <div class="flex items-center gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                        <i class="ph-bold ph-camera text-base text-teal-600"></i> Chụp POD
                    </button>
                    <button type="button" onclick="driverReportMilestone('FINISHED_UNLOADING')" class="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                        <i class="ph-bold ph-check-circle text-base"></i> Đóng Xong
                    </button>
                </div>
            `;
        } else if (st === 'DELIVERED') {
            dNextBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DEPART_TO_DROPOFF')" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                    <i class="ph-bold ph-truck text-base"></i>
                    <span>KÉO CONT RỜI KHO — VỀ BÃI HẠ</span>
                </button>
            `;
        } else if (st === 'RETURNING_EMPTY') {
            dNextBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DROPOFF_COMPLETED')" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                    <i class="ph-bold ph-anchor text-base"></i>
                    <span>ĐÃ HẠ CONT — LẤY PHIẾU EIR</span>
                </button>
            `;
        } else {
            dNextBtns.innerHTML = `
                <div class="py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                    <i class="ph-bold ph-check-fat text-emerald-600"></i>
                    <span>Chuyến Xe Đã Hoàn Tất</span>
                </div>
            `;
        }
    }

    renderSimQuickMilestones(trip.status, !!trip.is_overnight_detention);

    // 5. Accordion Timeline Mini List
    const timelineMiniList = document.getElementById('sim-timeline-mini-list');
    if (timelineMiniList) {
        timelineMiniList.innerHTML = '';
        const tList = trip.timeline || [];
        if (tList.length === 0) {
            timelineMiniList.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-1 italic">Chưa có mốc tiến độ</p>`;
        } else {
            tList.forEach(item => {
                let dotClass = 'bg-slate-300 text-slate-600';
                let textClass = 'text-slate-500';
                let timeClass = 'text-slate-400';
                let iconContent = item.step;

                if (item.active) {
                    dotClass = 'bg-teal-600 text-white ring-2 ring-teal-200 animate-pulse';
                    textClass = 'text-teal-950 font-bold';
                    timeClass = 'text-teal-700 font-bold';
                } else if (item.done) {
                    dotClass = 'bg-emerald-600 text-white';
                    textClass = 'text-slate-800 font-medium';
                    timeClass = 'text-slate-500';
                    iconContent = '✓';
                }

                timelineMiniList.innerHTML += `
                    <div class="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0 text-[10.5px]">
                        <div class="flex items-center gap-1.5 overflow-hidden">
                            <span class="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${dotClass}">${iconContent}</span>
                            <span class="truncate ${textClass}">${item.title}</span>
                        </div>
                        <span class="font-mono text-[10px] shrink-0 pl-1 ${timeClass}">${item.time || '—'}</span>
                    </div>
                `;
            });
        }
    }

    // 6. Accordion Chi Phí Đã Kê
    const totalDriverExpense = (trip.expenses || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalDriverExpense);

    const listEl = document.getElementById('app-expenses-list');
    if (listEl) {
        listEl.innerHTML = '';
        if (!trip.expenses || trip.expenses.length === 0) {
            listEl.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-2 italic">Chưa có khoản chi phí nào</p>`;
        } else {
            trip.expenses.forEach(exp => {
                let actionButtons = '';
                if (exp.status === 'PENDING') {
                    actionButtons = `
                        <div class="flex items-center space-x-1 mt-1">
                            <button onclick="driverEditExpense(${exp.id})" class="px-1.5 py-0.2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[9.5px] font-bold border border-amber-200 flex items-center">
                                <i class="ph ph-pencil mr-0.5"></i> Sửa
                            </button>
                            <button onclick="driverDeleteExpense(${exp.id})" class="px-1.5 py-0.2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[9.5px] font-bold border border-rose-200 flex items-center">
                                <i class="ph ph-trash mr-0.5"></i> Xóa
                            </button>
                        </div>
                    `;
                } else if (exp.status === 'SETTLED') {
                    actionButtons = `
                        <span class="inline-flex items-center text-[9px] font-bold text-purple-700 mt-1">
                            <i class="ph-bold ph-lock mr-0.5"></i> Đã chốt sổ
                        </span>
                    `;
                } else {
                    actionButtons = `
                        <span class="inline-flex items-center text-[9px] font-bold text-emerald-700 mt-1">
                            <i class="ph-bold ph-lock mr-0.5"></i> Đã duyệt
                        </span>
                    `;
                }

                listEl.innerHTML += `
                    <div class="p-1.5 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col space-y-0.5">
                        <div class="flex justify-between items-start">
                            <div class="overflow-hidden">
                                <p class="text-[11px] font-bold text-slate-800 truncate">${exp.category_name}</p>
                                <p class="text-[9.5px] text-slate-400 font-mono truncate">${exp.invoice_number ? 'HĐ: ' + exp.invoice_number : (exp.notes || exp.time)}</p>
                            </div>
                            <span class="text-[11px] font-black text-rose-600 tabular-nums shrink-0 pl-1">${formatMoney(exp.amount)}</span>
                        </div>
                        <div class="flex justify-between items-center pt-0.5 border-t border-slate-200/50">
                            <span class="text-[8.5px] px-1.5 py-0.2 rounded font-bold ${
                                exp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }">
                                ${exp.status_label || (exp.status === 'SETTLED' ? 'Đã chốt sổ' : (exp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                            </span>
                            ${actionButtons}
                        </div>
                    </div>
                `;
            });
        }
    }
}

// Dynamic quick milestones renderer with strict state machine and mistake rollback logic
function renderSimQuickMilestones(tripStatus, isOvernight) {
    const grid = document.getElementById('sim-quick-milestones-grid');
    if (!grid) return;

    if (tripStatus === 'COMPLETED') {
        grid.innerHTML = `
            <div class="col-span-2 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center space-y-1">
                <div class="text-[11px] font-black text-slate-700 flex items-center justify-center gap-1.5 font-heading">
                    <i class="ph-bold ph-lock-key text-teal-700"></i>
                    <span>Chuyến xe đã hoàn tất (Đã khóa)</span>
                </div>
                <p class="text-[9.5px] text-slate-500">Mọi mốc tiến độ đã hoàn thành và được chốt cố định.</p>
            </div>
        `;
        return;
    }

    // Step order mapping (0: DISPATCHED, 1: ACCEPTED, 2: CONTAINER_PICKED, 3: IN_TRANSIT, 4: AT_WAREHOUSE, 5: UNLOADING, 6: DELIVERED, 7: RETURNING_EMPTY, 8: COMPLETED)
    const stepOrder = {
        'DRAFT': 0, 'DISPATCHED': 0,
        'ACCEPTED': 1,
        'CONTAINER_PICKED': 2,
        'IN_TRANSIT': 3,
        'AT_WAREHOUSE': 4,
        'UNLOADING': 5,
        'DELIVERED': 6,
        'RETURNING_EMPTY': 7,
        'COMPLETED': 8
    };

    const currentStep = stepOrder[tripStatus] !== undefined ? stepOrder[tripStatus] : 0;

    const quickBtns = [
        {
            code: 'APPROACHING_WAREHOUSE',
            title: 'Sắp đến kho',
            desc: 'Báo trước 30p',
            icon: 'ph-bell-ringing',
            targetStep: 3,
            color: 'teal'
        },
        {
            code: 'ARRIVED_WAREHOUSE',
            title: 'Đến cổng kho',
            desc: 'Check-in kho',
            icon: 'ph-map-pin',
            targetStep: 4,
            color: 'blue'
        },
        {
            code: 'START_UNLOADING',
            title: 'Đang dỡ/đóng',
            desc: 'Bắt đầu hàng',
            icon: 'ph-package',
            targetStep: 5,
            color: 'amber'
        },
        {
            code: 'FINISHED_UNLOADING',
            title: 'Đóng xong',
            desc: 'Chuẩn bị hạ',
            icon: 'ph-check-circle',
            targetStep: 6,
            color: 'emerald'
        },
        {
            code: 'OVERNIGHT_WAIT',
            title: 'Chờ sau 0h',
            desc: isOvernight ? 'Đã báo lưu xe' : 'Kho yêu cầu',
            icon: 'ph-moon',
            targetStep: null,
            color: 'amber'
        },
        {
            code: 'DROPOFF_COMPLETED',
            title: 'Đã hạ cont',
            desc: 'Phiếu EIR',
            icon: 'ph-anchor',
            targetStep: 8,
            color: 'teal'
        }
    ];

    let html = '';
    quickBtns.forEach(btn => {
        let isEnabled = false;
        let btnBadge = '';
        let btnStyle = '';

        if (btn.code === 'OVERNIGHT_WAIT') {
            if (currentStep >= 4 && currentStep <= 7 && !isOvernight) {
                isEnabled = true;
                btnBadge = 'Sau 0h';
                btnStyle = 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-900 active:scale-95 cursor-pointer';
            } else if (isOvernight) {
                isEnabled = false;
                btnBadge = '✓ Đã báo';
                btnStyle = 'bg-amber-100/70 border-amber-300 text-amber-900 opacity-60 cursor-not-allowed';
            } else {
                isEnabled = false;
                btnBadge = 'Chưa đến';
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-35 cursor-not-allowed';
            }
        } else {
            const target = btn.targetStep;
            const isNext = (target === currentStep + 1) || (currentStep === 2 && target === 4);
            const isPrev1 = (target === currentStep - 1) || (currentStep === 4 && target === 3) || (currentStep === 7 && target === 6);
            const isPast = target < currentStep && !isPrev1;

            if (isNext) {
                isEnabled = true;
                btnBadge = 'Tiếp theo';
                btnStyle = `bg-${btn.color}-50 hover:bg-${btn.color}-100 border-${btn.color}-500 text-${btn.color}-950 ring-2 ring-${btn.color}-200/60 font-bold active:scale-95 cursor-pointer shadow-2xs`;
            } else if (isPrev1) {
                isEnabled = true;
                btnBadge = '↩ Sửa lại nếu nhầm';
                btnStyle = 'bg-amber-50/80 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold active:scale-95 cursor-pointer';
            } else if (isPast || target === currentStep) {
                isEnabled = false;
                btnBadge = '✓ Đã qua';
                btnStyle = 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-45 cursor-not-allowed';
            } else {
                isEnabled = false;
                btnBadge = 'Chưa đến';
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-35 cursor-not-allowed';
            }
        }

        const disabledAttr = isEnabled ? '' : 'disabled';
        const clickHandler = isEnabled ? `onclick="driverReportMilestone('${btn.code}')"` : '';

        html += `
            <button type="button" ${disabledAttr} ${clickHandler}
                class="p-1.5 rounded-lg border text-left transition-all ${btnStyle}">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold flex items-center gap-1">
                        <i class="ph-bold ${btn.icon}"></i> ${btn.title}
                    </span>
                    <span class="text-[8px] font-semibold px-1 py-0.2 rounded ${isEnabled ? 'bg-white/80 border border-slate-200 text-slate-800' : 'text-slate-400'}">${btnBadge}</span>
                </div>
                <span class="text-[8.5px] opacity-75 block mt-0.5">${btn.desc}</span>
            </button>
        `;
    });

    grid.innerHTML = html;
}

// Tài xế báo nhanh mốc thời gian kho 1 chạm (Bước 6 SOP)
async function driverReportMilestone(milestoneCode) {
    if (!currentActiveTripCode) return;
    if (currentActiveTripData && currentActiveTripData.status === 'COMPLETED') {
        showToast('warning', 'Chuyến xe đã hoàn tất! Toàn bộ mốc thời gian đã được chốt và khóa cố định.');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({ milestone: milestoneCode })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Cập nhật tiến độ');
            // Tức thì reload lại màn hình để cập nhật thông tin luôn, không cần chờ
            window.location.reload();
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể cập nhật mốc');
        }
    } catch (err) {
        console.error('Error reporting milestone:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- CÁC HÀM ĐIỀU KHIỂN GIAO DIỆN SIMULATOR TÀI XẾ ---
function openSimRouteDetailsModal() {
    const modal = document.getElementById('modal-sim-route-details');
    if (modal) modal.classList.remove('hidden-view');
}

function closeSimRouteDetailsModal() {
    const modal = document.getElementById('modal-sim-route-details');
    if (modal) modal.classList.add('hidden-view');
}

function toggleDriverPhoneDrawer(forceState) {
    const drawer = document.getElementById('driver-phone-drawer');
    const btn = document.getElementById('btn-toggle-driver-phone');
    const btnLabel = document.getElementById('btn-toggle-driver-phone-label');
    if (!drawer) return;

    let shouldOpen = forceState !== undefined ? forceState : drawer.classList.contains('hidden');
    if (shouldOpen) {
        drawer.classList.remove('hidden');
        if (btn) {
            btn.classList.add('bg-teal-700', 'ring-2', 'ring-teal-400');
        }
        if (btnLabel) btnLabel.innerText = 'Ẩn Giả Lập';
        if (window.currentTripDetail) {
            renderDriverMobileApp(window.currentTripDetail);
        }
    } else {
        drawer.classList.add('hidden');
        if (btn) {
            btn.classList.remove('bg-teal-700', 'ring-2', 'ring-teal-400');
        }
        if (btnLabel) btnLabel.innerText = 'Màn Hình Tài Xế';
    }
}
window.toggleDriverPhoneDrawer = toggleDriverPhoneDrawer;

function toggleSimTimelineAccordion() {
    const body = document.getElementById('sim-timeline-body');
    const caret = document.getElementById('sim-timeline-caret');
    if (!body) return;
    body.classList.toggle('hidden');
    if (caret) {
        caret.classList.toggle('rotate-180');
    }
}

function toggleSimExpenseAccordion() {
    const body = document.getElementById('sim-expense-body');
    const caret = document.getElementById('sim-expense-caret');
    if (!body) return;
    body.classList.toggle('hidden');
    if (caret) {
        caret.classList.toggle('rotate-180');
    }
}

function openSimTripDetailsModal() {
    if (!currentActiveTripData) return;
    const t = currentActiveTripData;
    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

    const modal = document.getElementById('modal-sim-trip-details');
    if (!modal) return;

    const setT = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = (val !== undefined && val !== null && val !== '') ? val : '-';
    };

    setT('sim-modal-trip-code', `Lệnh: ${t.id || 'GSS-XXX'}`);
    setT('sim-modal-cont-type', t.container_type || '40HC');
    setT('sim-modal-cont-no', t.container || 'Chưa gán');
    setT('sim-modal-seal-no', t.seal || '-');
    setT('sim-modal-booking', t.booking_or_bill || t.booking || '-');
    setT('sim-modal-shipping-line', t.shipping_line || '-');
    setT('sim-modal-customer', t.customer || '-');
    setT('sim-modal-dock', t.warehouse_dock || 'Chưa gán');
    setT('sim-modal-det', t.det_free_days ? `${t.det_free_days} ngày` : (t.dem_det_countdown || '-'));
    setT('sim-modal-customs', t.customs_declaration || 'Chưa có');
    setT('sim-modal-advance', formatMoney(t.driver_advance_amount || 0));

    modal.classList.remove('hidden-view');
}

function closeSimTripDetailsModal() {
    const modal = document.getElementById('modal-sim-trip-details');
    if (modal) modal.classList.add('hidden-view');
}

function editTripFromSimModal() {
    closeSimTripDetailsModal();
    if (typeof openModalEditTrip === 'function') {
        openModalEditTrip(currentActiveTripCode);
    }
}
window.editTripFromSimModal = editTripFromSimModal;

function openSimIncidentModal() {
    const modal = document.getElementById('modal-sim-incident');
    if (modal) modal.classList.remove('hidden-view');
}

function closeSimIncidentModal() {
    const modal = document.getElementById('modal-sim-incident');
    if (modal) modal.classList.add('hidden-view');
}

async function submitSimIncident(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const incType = document.getElementById('sim-inc-type')?.value;
    const incDesc = document.getElementById('sim-inc-desc')?.value;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({
                milestone: 'INCIDENT_REPORTED',
                notes: `[SỰ CỐ: ${incType}] ${incDesc}`
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeSimIncidentModal();
            showToast('warning', 'Đã ghi nhận cảnh báo sự cố khẩn cấp và gửi thông báo tới Điều Độ!', 'Báo Sự Cố Thành Công');
            await viewTripDetail(currentActiveTripCode);
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.message || data.error || 'Không thể gửi báo cáo sự cố');
        }
    } catch (err) {
        console.error('Error submitting incident:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function openSimContactModal(type) {
    if (type === 'consignee') {
        const cName = currentActiveTripData?.customer || 'Thủ kho / Người nhận';
        alert(`LIÊN HỆ GIAO NHẬN HÀNG:\n\n• Người nhận / Khách hàng: ${cName}\n• Hotline: 0908.123.456\n• Điểm đến: ${currentActiveTripData?.warehouse_location || currentActiveTripData?.warehouse || 'Kho nhận hàng'}`);
    } else {
        const dispName = currentActiveTripData?.dispatcher || 'Điều độ trực';
        alert(`HOTLINE ĐIỀU ĐỘ PHỤ TRÁCH:\n\n• Điều độ: ${dispName} (0908.123.456 - Trực 24/7)\n• Mã chuyến xe: ${currentActiveTripCode || 'GSS-XXX'}`);
    }
}
