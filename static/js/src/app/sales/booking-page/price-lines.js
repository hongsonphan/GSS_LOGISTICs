/* Giá Booking nhiều dòng: mỗi loại cont một đơn giá (tối đa 4 dòng, loại lấy từ ô Size).
 * Dòng 1 giữ id `fullpage-booking-price` để gợi ý báo giá và phần đọc giá cũ vẫn dùng được. */
const BOOKING_PRICE_MAX_LINES = 4;

function bookingPriceTypes() {
    return String(document.getElementById('fullpage-booking-container-size')?.value || '')
        .split(/[,;/]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
}

function _priceTypeOptions(selected) {
    // Đủ danh mục Quy cách Cont; loại đã tick ở ô Size lên đầu cho dễ chọn
    const ticked = bookingPriceTypes();
    const sel = String(selected || '').toUpperCase();
    const all = (typeof contTypeList === 'function' ? contTypeList() : []).map(t => t.code);
    const ordered = [...ticked.filter(t => all.includes(t)), ...all.filter(t => !ticked.includes(t))];
    if (sel && !ordered.includes(sel)) ordered.push(sel);
    return '<option value="">-- Loại cont --</option>' + ordered.map(t =>
        `<option value="${escapeHtml(t)}"${t === sel ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('');
}

function _priceLineRow(i, line) {
    const priceId = i === 0 ? 'fullpage-booking-price' : `fullpage-booking-price-${i}`;
    const val = line.unit_price ? formatNumberVN(line.unit_price) : '';
    return `<div class="grid grid-cols-12 gap-2 items-center" data-price-line="${i}">
        <select class="col-span-3 h-10 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-600"
            data-price-type aria-label="Loại cont dòng giá ${i + 1}" onfocus="refreshBookingPriceTypes()">${_priceTypeOptions(line.container_type || '')}</select>
        <div class="relative col-span-4">
            <input type="text" inputmode="numeric" id="${priceId}" data-price-value value="${val}" placeholder="VD: 4.000.000"
                oninput="this.classList.remove('border-rose-500','bg-rose-50'); const h=document.getElementById('fullpage-booking-price-hint'); if(h&&${i}===0) h.classList.add('hidden');"
                class="input-number-vn w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono font-bold text-teal-800 text-xs tabular-nums pr-12">
            <span class="absolute right-3 top-2.5 text-slate-400 font-bold text-[11px] pointer-events-none">VNĐ</span>
        </div>
        <input type="text" data-price-note maxlength="200" value="${escapeHtml(line.note || '')}" placeholder="Ghi chú giá"
            class="col-span-4 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800">
        ${i === 0 ? '<span class="col-span-1"></span>' : `<button type="button" onclick="removeBookingPriceLine(${i})" title="Bỏ dòng giá này" aria-label="Bỏ dòng giá ${i + 1}"
            class="col-span-1 h-10 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"><i class="ph-bold ph-x"></i></button>`}
    </div>`;
}

function readBookingPriceLines() {
    const rows = document.querySelectorAll('#fullpage-booking-price-lines [data-price-line]');
    return Array.from(rows).map(r => ({
        container_type: r.querySelector('[data-price-type]')?.value || '',
        unit_price: parseNumberVN(r.querySelector('[data-price-value]')?.value) || 0,
        note: r.querySelector('[data-price-note]')?.value?.trim() || '',
    }));
}

function renderBookingPriceLines(lines) {
    const box = document.getElementById('fullpage-booking-price-lines');
    if (!box) return;
    const list = (lines && lines.length ? lines : [{}]).slice(0, BOOKING_PRICE_MAX_LINES);
    const head = '<div class="grid grid-cols-12 gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">'
        + '<span class="col-span-3">Loại Cont</span><span class="col-span-4">Đơn giá (VNĐ)</span><span class="col-span-4">Ghi chú giá</span><span class="col-span-1"></span></div>';
    box.innerHTML = head + list.map((l, i) => _priceLineRow(i, l)).join('');
    if (typeof initAllNumberInputs === 'function') initAllNumberInputs();
    const add = document.getElementById('fullpage-booking-price-add');
    if (add) add.classList.toggle('hidden', list.length >= BOOKING_PRICE_MAX_LINES);
}

function addBookingPriceLine() {
    const lines = readBookingPriceLines();
    if (lines.length >= BOOKING_PRICE_MAX_LINES) return;
    const used = lines.map(l => l.container_type);
    const next = bookingPriceTypes().find(t => !used.includes(t)) || '';
    lines.push({ container_type: next });
    renderBookingPriceLines(lines);
}

function removeBookingPriceLine(i) {
    const lines = readBookingPriceLines();
    lines.splice(i, 1);
    renderBookingPriceLines(lines);
}

/** Cập nhật danh sách loại ở mọi dòng khi ô Size đổi, giữ nguyên lựa chọn đang có. */
function refreshBookingPriceTypes() {
    document.querySelectorAll('#fullpage-booking-price-lines [data-price-type]').forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = _priceTypeOptions(cur);
        sel.value = cur;
    });
}

/** Chuỗi JSON các dòng giá (bỏ dòng trống) để gửi lên máy chủ. */
function bookingPriceLinesPayload() {
    return JSON.stringify(readBookingPriceLines().filter(l => l.unit_price > 0 || l.container_type));
}

window.renderBookingPriceLines = renderBookingPriceLines;
window.addBookingPriceLine = addBookingPriceLine;
window.removeBookingPriceLine = removeBookingPriceLine;
window.refreshBookingPriceTypes = refreshBookingPriceTypes;
window.readBookingPriceLines = readBookingPriceLines;
window.bookingPriceLinesPayload = bookingPriceLinesPayload;
