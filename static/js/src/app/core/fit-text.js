/**
 * Tự co chữ số liệu KPI cho vừa khung (không rớt dòng, không bị cắt).
 * Chỉ giảm cỡ chữ khi số không vừa; số ngắn giữ nguyên cỡ thiết kế. Tự canh lại khi đổi kích thước
 * cửa sổ hoặc khi số liệu được cập nhật. Thêm thuộc tính data-fit-text để áp cho phần tử khác.
 */
(function () {
    const SELECTOR = 'p.text-3xl.tabular-nums, p.text-2xl.tabular-nums, p.text-xl.tabular-nums.font-black, [data-fit-text]';
    const MIN_PX = 15;

    function fit(el) {
        if (!el || !el.isConnected) return;
        el.style.whiteSpace = 'nowrap';
        el.style.fontSize = '';
        if (!el.clientWidth) return;
        let size = parseFloat(getComputedStyle(el).fontSize);
        let guard = 30;
        while (el.scrollWidth > el.clientWidth + 1 && size > MIN_PX && guard-- > 0) {
            size -= 1;
            el.style.fontSize = size + 'px';
        }
    }

    const resizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(entries => entries.forEach(entry => fit(entry.target)))
        : null;
    const watched = new WeakSet();

    function watch(el) {
        if (watched.has(el)) return;
        watched.add(el);
        if (resizeObserver) resizeObserver.observe(el);
        fit(el);
    }

    function scan(root) {
        if (root.matches && root.matches(SELECTOR)) watch(root);
        if (root.querySelectorAll) root.querySelectorAll(SELECTOR).forEach(watch);
    }

    function start() {
        scan(document);
        if (typeof MutationObserver !== 'function') return;
        new MutationObserver(mutations => {
            for (const m of mutations) {
                const node = m.target.nodeType === 3 ? m.target.parentElement : m.target;
                if (!node || !node.closest) continue;
                const host = node.closest(SELECTOR);
                if (host) { watched.has(host) ? fit(host) : watch(host); }
                m.addedNodes && m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); });
            }
        }).observe(document.body, { subtree: true, childList: true, characterData: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
