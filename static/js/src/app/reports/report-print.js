// -------------------------------------------------------------
// IN ẤN BÁO CÁO QUẢN TRỊ DOANH NGHIỆP (GSS TMS BI REPORTS)
// -------------------------------------------------------------
const REPORT_PRINT_METADATA = {
    'report-1': {
        title: 'BÁO CÁO KẾT QUẢ KINH DOANH & HIỆU SUẤT ĐỘI XE',
        code: 'TMS-BI-01',
        authorRole: 'Phòng Vận Tải & Kế Toán'
    },
    'report-2': {
        title: 'BÁO CÁO THEO DÕI VỎ CONTAINER & CẢNH BÁO DEM/DET',
        code: 'TMS-BI-02',
        authorRole: 'Phòng Khai Thác Cảng & Điều Vận'
    },
    'report-3': {
        title: 'BÁO CÁO CHẤT LƯỢNG DỊCH VỤ & ĐÚNG GIỜ GIAO NHẬN (OTP)',
        code: 'TMS-BI-03',
        authorRole: 'Phòng Quản Lý Chất Lượng & CS'
    },
    'report-4': {
        title: 'BÁO CÁO TỔNG HỢP CHI PHÍ TUYẾN & TIỀN CHI HỘ',
        code: 'TMS-BI-04',
        authorRole: 'Kế Toán Chi Phí & Điều Vận'
    },
    'report-5': {
        title: 'BÁO CÁO THEO DÕI CẮT KÉO & LƯU XE QUA ĐÊM (LAYOVER)',
        code: 'TMS-BI-05',
        authorRole: 'Đội Trưởng Đội Xe & Điều Vận'
    },
    'report-6': {
        title: 'BÁO CÁO TỔNG HỢP SỰ CỐ VẬN TẢI & NGOẠI LỆ (OS&D)',
        code: 'TMS-BI-06',
        authorRole: 'Bộ Phận An Toàn & Bảo Hiểm'
    },
    'report-7': {
        title: 'BÁO CÁO DOANH THU KHÁCH HÀNG & SẢN LƯỢNG TEU',
        code: 'TMS-BI-07',
        authorRole: 'Phòng Kinh Doanh / Sales & Kế Toán'
    },
    'report-8': {
        title: 'BẢNG ĐỐI SOÁT & QUYẾT TOÁN CƯỚC XE THẦU PHỤ 3PL',
        code: 'TMS-BI-08',
        authorRole: 'Kế Toán Thanh Toán 3PL'
    },
    'report-9': {
        title: 'BẢNG TỔNG HỢP LƯƠNG CHUYẾN & THU NHẬP TÀI XẾ',
        code: 'TMS-BI-09',
        authorRole: 'Kế Toán Tiền Lương & Đội Xe'
    },
    'report-10': {
        title: 'BÁO CÁO THEO DÕI QUỸ TẠM ỨNG & THU CHI ĐIỀU VẬN',
        code: 'TMS-BI-10',
        authorRole: 'Thủ Quỹ & Kế Toán Theo Dõi Quỹ'
    },
    'report-11': {
        title: 'BẢNG TỔNG HỢP TẠM ỨNG & CHI PHÍ DỌC ĐƯỜNG TÀI XẾ',
        code: 'TMS-BI-11',
        authorRole: 'Điều Vận & Kế Toán Tạm Ứng'
    },
    'report-12': {
        title: 'BÁO CÁO TIẾN ĐỘ QUYẾT TOÁN CHUYẾN & TỒN ĐỌNG (BACKLOG)',
        code: 'TMS-BI-12',
        authorRole: 'Kế Toán Quyết Toán Chuyến'
    },
    'report-13': {
        title: 'BÁO CÁO CÔNG NỢ PHẢI THU KHÁCH HÀNG (ACCOUNTS RECEIVABLE)',
        code: 'TMS-BI-13',
        authorRole: 'Kế Toán Công Nợ Phải Thu'
    },
    'report-14': {
        title: 'BÁO CÁO PHÂN TÍCH TUỔI ĐƠN HÀNG TỒN ĐỌNG CHƯA CHỐT',
        code: 'TMS-BI-14',
        authorRole: 'Kiểm Soát Vận Hành & Điều Vận'
    }
};

// --- TỰ ĐỘNG PHÂN LOẠI KHỔ GIẤY A4 NGANG (LANDSCAPE) / DỌC (PORTRAIT) TỐI ƯU ---
const DEFAULT_REPORT_ORIENTATION = {
    'report-1': 'landscape', // P&L Hiệu Suất Đội Xe: 11 Cột
    'report-2': 'portrait',  // Vỏ Cont & DEM/DET Hãng Tàu: 6 Cột
    'report-3': 'portrait',  // Đúng Giờ & Chất Lượng OTP: 6 Cột
    'report-4': 'landscape', // Chi Phí Tuyến & Chi Hộ: 8 Cột
    'report-5': 'landscape', // Bàn Giao Cắt Kéo & Lưu Xe 0H: 13 Cột
    'report-6': 'portrait',  // Biên Bản Sự Cố OS&D: Dạng biên bản
    'report-7': 'landscape', // Doanh Thu Khách & Sản Lượng TEU: 11 Cột
    'report-8': 'landscape', // Quyết Toán Xe Thầu Phụ 3PL: 9-11 Cột
    'report-9': 'landscape', // Lương Chuyến & Thu Nhập Lái Xe: 10 Cột
    'report-10': 'portrait', // Sổ Quỹ Tiền Mặt & Tạm Ứng Điều Vận: 6 Cột
    'report-11': 'portrait', // Tạm Ứng & Chi Phí Dọc Đường: 6 Cột
    'report-12': 'landscape',// Tiến Độ Quyết Toán & Backlog: 10 Cột
    'report-13': 'landscape',// Công Nợ Phải Thu AR Aging: 8 Cột
    'report-14': 'landscape' // Tuổi Đơn Hàng Tồn Đọng: 8 Cột
};

let currentReportPrintOrientation = 'landscape';

function setReportPrintOrientation(orientation = 'landscape') {
    currentReportPrintOrientation = orientation;
    const printArea = document.getElementById('report-printable-area');
    const modalDialog = document.getElementById('report-print-modal-dialog');
    const btnPortrait = document.getElementById('btn-rep-orient-portrait');
    const btnLandscape = document.getElementById('btn-rep-orient-landscape');

    if (printArea) {
        if (orientation === 'landscape') {
            printArea.classList.add('is-landscape');
            printArea.classList.remove('is-portrait');
        } else {
            printArea.classList.add('is-portrait');
            printArea.classList.remove('is-landscape');
        }
    }

    if (modalDialog) {
        if (orientation === 'landscape') {
            modalDialog.classList.add('max-w-6xl');
            modalDialog.classList.remove('max-w-4xl');
        } else {
            modalDialog.classList.add('max-w-4xl');
            modalDialog.classList.remove('max-w-6xl');
        }
    }

    if (btnPortrait && btnLandscape) {
        if (orientation === 'landscape') {
            btnLandscape.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnPortrait.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer';
        } else {
            btnPortrait.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnLandscape.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer';
        }
    }

    // Dynamic @page size setting
    if (typeof setDynamicPrintPageStyle === 'function') {
        if (orientation === 'landscape') {
            setDynamicPrintPageStyle('@page { size: A4 landscape; margin: 8mm 10mm; }');
        } else {
            setDynamicPrintPageStyle('@page { size: A4 portrait; margin: 10mm 12mm; }');
        }
    }
}

function openReportPrintModal(targetReportType = null) {
    const reportKey = targetReportType || currentActiveReportSubtab || 'report-1';
    const cleanKey = reportKey.startsWith('report-') ? reportKey : `report-${reportKey}`;
    
    const selector = document.getElementById('report-print-type-selector');
    if (selector) selector.value = cleanKey;

    renderReportPrintContent(cleanKey);

    const modal = document.getElementById('modal-report-print');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function onReportPrintTypeChanged(newType) {
    renderReportPrintContent(newType);
}

// Khoảng ngày của kỳ báo cáo, khớp với apps/dispatch/reports_api.py (tuần bắt đầu thứ Hai)
function getReportPeriodRangeText(period) {
    const today = new Date();
    const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    let start = null;
    if (period === 'today') start = new Date(today);
    else if (period === '10_days') { start = new Date(today); start.setDate(today.getDate() - 9); }
    else if (period === 'week') { start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); }
    else if (period === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (period === 'quarter') start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    else if (period === 'year' || period === 'this_year') start = new Date(today.getFullYear(), 0, 1);
    if (!start) return '';
    return ` (từ ngày ${fmt(start)} đến ngày ${fmt(today)})`;
}

function renderReportPrintContent(reportKey) {
    const meta = REPORT_PRINT_METADATA[reportKey] || {
        title: 'BÁO CÁO QUẢN TRỊ VẬN HÀNH DOANH NGHIỆP',
        code: 'TMS-BI-REPORT',
        authorRole: 'Bộ Phận Vận Hành & Kế Toán'
    };

    // Tự động chọn khổ giấy tối ưu cho báo cáo này
    const autoOrientation = DEFAULT_REPORT_ORIENTATION[reportKey] || 'landscape';
    setReportPrintOrientation(autoOrientation);

    const titleEl = document.getElementById('print-rep-main-title');
    if (titleEl) titleEl.innerText = meta.title;

    const moduleEl = document.getElementById('print-rep-module-code');
    if (moduleEl) moduleEl.innerText = meta.code;

    // Kỳ báo cáo
    const periodMap = {
        today: 'Hôm nay',
        '10_days': '10 ngày qua',
        week: 'Tuần này',
        month: 'Tháng này',
        quarter: 'Quý này',
        year: 'Năm nay',
        this_year: 'Năm nay',
        all: 'Tất cả thời gian'
    };
    // Chuẩn báo cáo: ghi rõ "Từ ngày ... đến ngày ..." (cùng cách tính kỳ với API báo cáo)
    const periodLabel = (periodMap[currentReportPeriod] || currentReportPeriod) + getReportPeriodRangeText(currentReportPeriod);
    const badgePeriod = document.getElementById('report-print-badge-period');
    if (badgePeriod) badgePeriod.innerText = periodLabel;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const exportDateEl = document.getElementById('print-rep-export-date');
    if (exportDateEl) exportDateEl.innerText = `Ngày in: ${dateStr} ${timeStr}`;

    const subtitleEl = document.getElementById('print-rep-period-subtitle');
    if (subtitleEl) subtitleEl.innerText = `Kỳ báo cáo: ${periodLabel} • Đơn vị tiền tệ: VNĐ • Xuất tự động từ Hệ thống GSS Logistics`;

    const authorEl = document.getElementById('print-rep-sign-author');
    if (authorEl) {
        const userName = window.CURRENT_USER?.full_name || window.CURRENT_USER?.username || meta.authorRole;
        authorEl.innerText = userName;
    }

    // Đồng bộ thông tin công ty hệ thống lên báo cáo
    syncCompanyProfileToPrintForms();

    // 1. Trích xuất KPIs từ subtab tương ứng
    const subtabContent = document.getElementById(`subtab-${reportKey}`);
    const kpisContainer = document.getElementById('print-rep-kpis-container');
    if (kpisContainer) {
        kpisContainer.innerHTML = '';
        if (subtabContent) {
            const cards = subtabContent.querySelectorAll('.grid > div');
            if (cards && cards.length > 0) {
                // Lấy tối đa 4 card đầu tiên
                Array.from(cards).slice(0, 4).forEach(card => {
                    const label = card.querySelector('span')?.innerText?.trim() || '';
                    const value = card.querySelector('p.text-3xl, p.text-2xl, p.font-black')?.innerText?.trim() || '';
                    const note = card.querySelectorAll('p')[1]?.innerText?.trim() || '';
                    if (label || value) {
                        const div = document.createElement('div');
                        div.className = 'p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left';
                        div.innerHTML = `
                            <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">${escapeHtml(label)}</span>
                            <p class="text-base sm:text-lg font-black text-slate-900 font-heading tabular-nums mt-0.5">${escapeHtml(value)}</p>
                            ${note ? `<p class="text-[9.5px] text-slate-500 truncate mt-0.5">${escapeHtml(note)}</p>` : ''}
                        `;
                        kpisContainer.appendChild(div);
                    }
                });
            }
        }
    }

    // 2. Trích xuất Bảng dữ liệu chi tiết
    const theadEl = document.getElementById('print-rep-table-thead');
    const tbodyEl = document.getElementById('print-rep-table-tbody');
    const tfootEl = document.getElementById('print-rep-table-tfoot');
    const wordsBox = document.getElementById('print-rep-words-box');
    const wordsText = document.getElementById('print-rep-amount-words');

    if (theadEl) theadEl.innerHTML = '';
    if (tbodyEl) tbodyEl.innerHTML = '';
    if (tfootEl) tfootEl.innerHTML = '';
    if (wordsBox) wordsBox.classList.add('hidden');

    if (subtabContent) {
        const sourceTable = subtabContent.querySelector('table');
        if (sourceTable) {
            // Clone thead (loại bỏ cột thao tác nếu có)
            const srcThead = sourceTable.querySelector('thead');
            if (srcThead && theadEl) {
                const headerRow = document.createElement('tr');
                const ths = srcThead.querySelectorAll('th');
                ths.forEach(th => {
                    const thText = th.innerText.trim();
                    if (thText !== 'Thao Tác' && thText !== 'Hành Động' && !th.dataset.colKey?.includes('action')) {
                        const newTh = document.createElement('th');
                        newTh.className = 'border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100 ' + (th.className.includes('text-right') ? 'text-right' : th.className.includes('text-center') ? 'text-center' : 'text-left');
                        newTh.innerText = thText;
                        headerRow.appendChild(newTh);
                    }
                });
                theadEl.appendChild(headerRow);
            }

            // Clone tbody
            const srcTbody = sourceTable.querySelector('tbody');
            let sumAmount = 0;
            if (srcTbody && tbodyEl) {
                const trs = srcTbody.querySelectorAll('tr');
                if (trs.length === 0 || trs[0].querySelector('td[colspan]')) {
                    tbodyEl.innerHTML = `<tr><td colspan="12" class="text-center py-6 text-slate-400 italic">Không có dữ liệu phát sinh trong kỳ báo cáo này</td></tr>`;
                } else {
                    trs.forEach((tr, index) => {
                        const newTr = document.createElement('tr');
                        newTr.className = 'hover:bg-slate-50 transition-colors';
                        const tds = tr.querySelectorAll('td');
                        tds.forEach((td, tdIdx) => {
                            // Bỏ qua cột thao tác / nút bấm
                            if (!td.querySelector('button') || tdIdx < tds.length - 1) {
                                const newTd = document.createElement('td');
                                newTd.className = 'border border-slate-300 p-1.5 ' + (td.className.includes('text-right') ? 'text-right font-mono' : td.className.includes('text-center') ? 'text-center' : 'text-left');
                                newTd.innerText = td.innerText.trim();
                                newTr.appendChild(newTd);

                                // Thu thập số tiền nếu có
                                const textVal = td.innerText.replace(/[^\d]/g, '');
                                if (textVal && td.className.includes('text-right') && tdIdx === tds.length - 2) {
                                    sumAmount += Number(textVal) || 0;
                                }
                            }
                        });
                        tbodyEl.appendChild(newTr);
                    });
                }
            }

            // Dòng Tổng Cộng tfoot
            const srcTfoot = sourceTable.querySelector('tfoot');
            if (srcTfoot && tfootEl && srcTfoot.innerHTML.trim()) {
                tfootEl.innerHTML = srcTfoot.innerHTML;
                tfootEl.querySelectorAll('td, th').forEach(cell => {
                    cell.className = 'border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 ' + (cell.className.includes('text-right') ? 'text-right' : 'text-left');
                });
            }

            if (sumAmount > 0 && typeof numberToWordsVN === 'function' && wordsBox && wordsText) {
                wordsBox.classList.remove('hidden');
                wordsText.innerText = numberToWordsVN(sumAmount);
            }
        }
    }
}

function executePrintReportDocument() {
    document.body.classList.add('is-printing-report');
    document.body.classList.remove('is-printing-quotation', 'is-printing-voucher');
    window.print();
}

// Tự động gán cờ in ấn nếu người dùng bấm phím tắt Ctrl+P khi modal đang mở
window.addEventListener('beforeprint', () => {
    const voucherModal = document.getElementById('modal-cash-voucher-print');
    const quoteModal = document.getElementById('modal-quotation-print');
    const reportModal = document.getElementById('modal-report-print');
    if (voucherModal && !voucherModal.classList.contains('hidden')) {
        document.body.classList.add('is-printing-voucher');
        document.body.classList.remove('is-printing-quotation', 'is-printing-report');
    } else if (quoteModal && !quoteModal.classList.contains('hidden')) {
        document.body.classList.add('is-printing-quotation');
        document.body.classList.remove('is-printing-voucher', 'is-printing-report');
    } else if (reportModal && !reportModal.classList.contains('hidden')) {
        document.body.classList.add('is-printing-report');
        document.body.classList.remove('is-printing-voucher', 'is-printing-quotation');
    }
});

// Tự động gỡ bỏ cờ in ấn sau khi đóng hộp thoại In của trình duyệt
window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-printing-quotation', 'is-printing-voucher', 'is-printing-report');
});

function closeReportPrintModal() {
    const modal = document.getElementById('modal-report-print');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function printReportDocument() {
    openReportPrintModal(currentActiveReportSubtab);
}

window.openReportPrintModal = openReportPrintModal;
window.closeReportPrintModal = closeReportPrintModal;
window.printReportDocument = printReportDocument;
window.executePrintReportDocument = executePrintReportDocument;
window.setReportPrintOrientation = setReportPrintOrientation;
window.onReportPrintTypeChanged = onReportPrintTypeChanged;
