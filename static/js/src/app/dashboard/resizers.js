// =========================================================================
// THANH KÉO ĐIỀU CHỈNH KÍCH THƯỚC (CHART SPLITTER / RESIZER)
// =========================================================================
let chartResizerInitialized = false;

function initChartResizer() {
    if (chartResizerInitialized) return;
    const resizer = document.getElementById('dash-chart-resizer');
    const card1 = document.getElementById('dash-chart-card-1');
    const card2 = document.getElementById('dash-chart-card-2');
    const container = document.getElementById('dashboard-row-charts');
    if (!resizer || !card1 || !card2 || !container) return;

    chartResizerInitialized = true;

    // Nạp lại tỷ lệ đã lưu trong localStorage (mặc định 65%)
    const savedRatio = localStorage.getItem('bim_chart_split_ratio');
    if (savedRatio) {
        const r = parseFloat(savedRatio);
        if (!isNaN(r) && r >= 20 && r <= 80) {
            applyChartRatio(r);
        }
    }

    let isDragging = false;

    resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(ev) {
            if (!isDragging) return;
            const rect = container.getBoundingClientRect();
            const offsetX = ev.clientX - rect.left;
            let ratio = (offsetX / rect.width) * 100;
            if (ratio < 20) ratio = 20;
            if (ratio > 80) ratio = 80;
            applyChartRatio(ratio);
        }

        function onMouseUp() {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                // Lưu tỷ lệ vào localStorage
                const rect = container.getBoundingClientRect();
                const card1Rect = card1.getBoundingClientRect();
                if (rect.width > 0) {
                    const ratio = ((card1Rect.width / rect.width) * 100).toFixed(1);
                    localStorage.setItem('bim_chart_split_ratio', ratio);
                }

                // Gọi resize trên cả 2 Chart canvas để hình ảnh sắc nét
                if (typeof bgdRevenueChart !== 'undefined' && bgdRevenueChart) {
                    bgdRevenueChart.resize();
                }
                if (typeof bgdDonutChart !== 'undefined' && bgdDonutChart) {
                    bgdDonutChart.resize();
                }
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth < 1024) {
            card1.style.width = '100%';
            card2.style.width = '100%';
        } else {
            const saved = localStorage.getItem('bim_chart_split_ratio');
            const r = saved ? parseFloat(saved) : 65;
            applyChartRatio(r);
        }
        if (typeof bgdRevenueChart !== 'undefined' && bgdRevenueChart) bgdRevenueChart.resize();
        if (typeof bgdDonutChart !== 'undefined' && bgdDonutChart) bgdDonutChart.resize();
    });
}
window.initChartResizer = initChartResizer;

function applyChartRatio(ratio) {
    const card1 = document.getElementById('dash-chart-card-1');
    const card2 = document.getElementById('dash-chart-card-2');
    if (!card1 || !card2) return;

    if (window.innerWidth >= 1024) {
        card1.style.width = `calc(${ratio}% - 8px)`;
        card2.style.width = `calc(${100 - ratio}% - 8px)`;
    } else {
        card1.style.width = '100%';
        card2.style.width = '100%';
    }
}
window.applyChartRatio = applyChartRatio;

// =========================================================================
// THANH KÉO ĐIỀU CHỈNH KÍCH THƯỚC WIDGET CÔNG VIỆC & BẢN TIN (WIDGET SPLITTER / RESIZER)
// =========================================================================
let widgetResizerInitialized = false;

function initWidgetResizer() {
    if (widgetResizerInitialized) return;
    const resizer = document.getElementById('dash-widget-resizer');
    const tasksCard = document.getElementById('dash-widget-tasks-card');
    const newsCard = document.getElementById('dash-widget-news-card');
    const container = document.getElementById('dashboard-row-widgets');
    if (!resizer || !tasksCard || !newsCard || !container) return;

    widgetResizerInitialized = true;

    // Nạp lại tỷ lệ đã lưu trong localStorage (mặc định 62%)
    const savedRatio = localStorage.getItem('bim_widget_split_ratio');
    if (savedRatio) {
        const r = parseFloat(savedRatio);
        if (!isNaN(r) && r >= 25 && r <= 75) {
            applyWidgetRatio(r);
        }
    }

    let isDragging = false;

    resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(ev) {
            if (!isDragging) return;
            const rect = container.getBoundingClientRect();
            const offsetX = ev.clientX - rect.left;
            let ratio = (offsetX / rect.width) * 100;
            if (ratio < 25) ratio = 25;
            if (ratio > 75) ratio = 75;
            applyWidgetRatio(ratio);
        }

        function onMouseUp() {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                // Lưu tỷ lệ vào localStorage
                const rect = container.getBoundingClientRect();
                const tasksRect = tasksCard.getBoundingClientRect();
                if (rect.width > 0) {
                    const ratio = ((tasksRect.width / rect.width) * 100).toFixed(1);
                    localStorage.setItem('bim_widget_split_ratio', ratio);
                }
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth < 1024) {
            tasksCard.style.width = '100%';
            newsCard.style.width = '100%';
        } else {
            const saved = localStorage.getItem('bim_widget_split_ratio');
            const r = saved ? parseFloat(saved) : 62;
            applyWidgetRatio(r);
        }
    });
}
window.initWidgetResizer = initWidgetResizer;

function applyWidgetRatio(ratio) {
    const tasksCard = document.getElementById('dash-widget-tasks-card');
    const newsCard = document.getElementById('dash-widget-news-card');
    if (!tasksCard || !newsCard) return;

    if (window.innerWidth >= 1024) {
        tasksCard.style.width = `calc(${ratio}% - 8px)`;
        newsCard.style.width = `calc(${100 - ratio}% - 8px)`;
    } else {
        tasksCard.style.width = '100%';
        newsCard.style.width = '100%';
    }
}
window.applyWidgetRatio = applyWidgetRatio;
