// ==============================================================================
// 9.7. SUBTAB 7: ĐỐI SOÁT VÉ CẦU ĐƯỜNG BOT / ETC (BOT AUDIT CONTROLLER)
// ==============================================================================
async function loadBotAuditData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/accounting/bot-audit/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Không thể tải đối soát vé BOT');
        const data = await res.json();

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTrips = document.getElementById('bot-stat-trips');
            if (elTrips) elTrips.innerText = `${kp.total_trips_with_toll} chuyến`;

            const elActual = document.getElementById('bot-stat-actual');
            if (elActual) elActual.innerText = formatMoneyVND(kp.total_actual_toll);

            const elStd = document.getElementById('bot-stat-standard');
            if (elStd) elStd.innerText = formatMoneyVND(kp.total_standard_toll);

            const elVar = document.getElementById('bot-stat-variance');
            if (elVar) elVar.innerText = `${kp.variance_count} chuyến`;
        }

        renderBotAuditTable(data.items || []);
    } catch (err) {
        console.error('Lỗi tải đối soát BOT:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải đối soát vé BOT', 'Lỗi Đối Soát BOT');
    }
}

function renderBotAuditTable(list) {
    const tbody = document.getElementById('acct-bot-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu vé cầu đường BOT nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        let badge = '<span class="text-xs font-semibold text-slate-600 uppercase">Bình thường</span>';
        if (item.warning_level === 'HIGH') {
            badge = `<span class="text-xs font-bold text-rose-700 uppercase">⚠️ Vượt (+${item.variance_percent}%)</span>`;
        } else if (item.warning_level === 'SAVING') {
            badge = `<span class="text-xs font-bold text-emerald-700 uppercase">✅ Tiết kiệm (${item.variance_percent}%)</span>`;
        } else if (item.warning_level === 'NO_STANDARD') {
            badge = '<span class="text-xs text-slate-400 italic">Chưa có định mức</span>';
        }

        const diffClass = item.variance_amount > 0 ? 'text-rose-600' : (item.variance_amount < 0 ? 'text-emerald-600' : 'text-slate-600');
        const diffSign = item.variance_amount > 0 ? '+' : '';

        // Tóm tắt các vé
        const ticketsDesc = (item.tickets_detail || []).map(tk => 
            `<span class="text-[11px] text-slate-700 font-mono mr-1.5" title="${escapeHtml(tk.invoice_issuer || '')}">${formatMoneyVND(tk.amount)}</span>`
        ).join('· ');

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">${index + 1}</td>
                <td>
                    <div class="font-bold text-slate-900 font-heading">[${escapeHtml(item.trip_code)}]</div>
                </td>
                <td>
                    <div class="font-bold text-slate-900 font-mono text-xs">${escapeHtml(item.vehicle_plate)}</div>
                </td>
                <td>
                    <div class="font-semibold text-slate-800">${escapeHtml(item.driver_name)}</div>
                </td>
                <td>
                    <div class="font-medium text-slate-700 text-xs">${escapeHtml(item.route_name)}</div>
                </td>
                <td class="text-center font-bold text-slate-800">${item.tickets_count} vé</td>
                <td class="text-right font-black text-rose-700 tabular-nums font-heading">
                    ${formatMoneyVND(item.actual_toll)}
                </td>
                <td class="text-right font-bold text-indigo-700 tabular-nums">
                    ${item.standard_toll > 0 ? formatMoneyVND(item.standard_toll) : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-right font-black tabular-nums ${diffClass}">
                    ${item.standard_toll > 0 ? `${diffSign}${formatMoneyVND(item.variance_amount)}` : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-center">${badge}</td>
                <td>
                    <div class="flex flex-wrap gap-1 items-center">
                        ${ticketsDesc || '<span class="text-slate-400">-</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalTickets = list.reduce((sum, i) => sum + (Number(i.tickets_count) || 0), 0);
        const totalActual = list.reduce((sum, i) => sum + (Number(i.actual_toll) || 0), 0);
        const totalStandard = list.reduce((sum, i) => sum + (Number(i.standard_toll) || 0), 0);
        const totalDiff = totalActual - totalStandard;
        window.BimTableFooter.render('accounting-bot-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${list.length} chuyến đối soát BOT`, colspan: 4 },
                { html: `<span class="text-slate-800 font-bold tabular-nums font-mono">${totalTickets} vé</span>`, align: 'center' },
                { html: `<span class="text-rose-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalActual)}</span>`, align: 'right' },
                { html: `<span class="text-indigo-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalStandard)}</span>`, align: 'right' },
                { html: `<span class="${totalDiff > 0 ? 'text-rose-600' : 'text-emerald-600'} font-black tabular-nums font-mono">${totalDiff > 0 ? '+' : ''}${formatMoneyVND(totalDiff)}</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 2 }
            ]
        });
    }
}

function exportBotAuditToExcel() {
    exportAccountingToExcel();
}

// applyDispatcherFundsFilter is defined above

function applyBotAuditFilter() {
    const q = (document.getElementById('bot-search')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#acct-bot-tbody tr');
    rows.forEach(r => {
        if (!q) { r.style.display = ''; return; }
        r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}
