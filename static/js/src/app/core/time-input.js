function formatAndValidate24hTimeInput(inputEl) {
    if (!inputEl) return;
    const raw = inputEl.value.trim();
    if (!raw) return;
    const formatted = formatTimeString(raw);
    if (formatted && /^([01]\d|2[0-3]):[0-5]\d$/.test(formatted)) {
        inputEl.value = formatted;
    }
}

function handle24hTimeInputMask(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d:]/g, '');
    if (val.length === 2 && !val.includes(':') && e.inputType !== 'deleteContentBackward') {
        val = val + ':';
    }
    if (val.length > 5) {
        val = val.slice(0, 5);
    }
    input.value = val;
}

function attach24hTimeInput(inputEl) {
    if (!inputEl || inputEl.dataset.has24hTimeMask) return;
    inputEl.dataset.has24hTimeMask = 'true';
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('inputmode', 'numeric');
    inputEl.setAttribute('maxlength', '5');

    inputEl.addEventListener('input', handle24hTimeInputMask);
    inputEl.addEventListener('blur', function() {
        const prev = this.value;
        formatAndValidate24hTimeInput(this);
        if (this.value !== prev) {
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

function initAll24hTimeInputs() {
    document.querySelectorAll('input[data-time-24h="true"]').forEach(attach24hTimeInput);
}

document.addEventListener('DOMContentLoaded', () => {
    initAll24hTimeInputs();
});
function setTripLoadTime(timeStr) {
    const el = document.getElementById('inp-load-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setBookingLoadingTime(timeStr) {
    const el = document.getElementById('booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setFullpageBookingLoadingTime(timeStr) {
    const el = document.getElementById('fullpage-booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setFullpageBookingClosingTime(timeStr) {
    const el = document.getElementById('fullpage-booking-closing-time-val');
    if (el) {
        el.value = timeStr;
        if (typeof syncFullpageBookingClosingTime === 'function') syncFullpageBookingClosingTime();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setFullpageBookingSiTime(timeStr) {
    const el = document.getElementById('fullpage-booking-si-time-val');
    if (el) {
        el.value = timeStr;
        if (typeof syncFullpageBookingSiTime === 'function') syncFullpageBookingSiTime();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
