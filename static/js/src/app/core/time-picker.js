// ==========================================
// GSS 24-HOUR INTERACTIVE TIME PICKER SYSTEM
// ==========================================
let currentBim24hTarget = null;
let currentBim24hHour = '17';
let currentBim24hMinute = '00';

function initBim24hTimePickerDOM() {
    const hContainer = document.getElementById('bim-tp-hours-list');
    if (hContainer && hContainer.children.length === 0) {
        let htmlH = '';
        for (let i = 0; i <= 23; i++) {
            const val = String(i).padStart(2, '0');
            htmlH += '<button type="button" data-val="' + val + '" onclick="selectBim24hHour(\'' + val + '\')" class="w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-800 transition-colors">' + val + '</button>';
        }
        hContainer.innerHTML = htmlH;
    }

    const mContainer = document.getElementById('bim-tp-minutes-list');
    if (mContainer && mContainer.children.length === 0) {
        let htmlM = '';
        for (let i = 0; i < 60; i += 5) {
            const val = String(i).padStart(2, '0');
            htmlM += '<button type="button" data-val="' + val + '" onclick="selectBim24hMinute(\'' + val + '\')" class="w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-800 transition-colors">' + val + '</button>';
        }
        htmlM += '<button type="button" data-val="59" onclick="selectBim24hMinute(\'59\')" class="w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-800 transition-colors">59</button>';
        mContainer.innerHTML = htmlM;
    }
}

function openBim24hTimePicker(targetInput, event) {
    if (event) {
        event.stopPropagation();
    }
    if (!targetInput) return;
    currentBim24hTarget = targetInput;

    const popover = document.getElementById('bim-24h-timepicker-popover');
    if (!popover) return;

    initBim24hTimePickerDOM();

    let val = targetInput.value ? targetInput.value.trim() : '17:00';
    const match = val.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        currentBim24hHour = String(parseInt(match[1], 10)).padStart(2, '0');
        currentBim24hMinute = String(parseInt(match[2], 10)).padStart(2, '0');
    } else {
        currentBim24hHour = '17';
        currentBim24hMinute = '00';
    }

    updateBim24hPickerActiveState();

    const rect = targetInput.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 330;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight) {
        top = Math.max(10, rect.top - popoverHeight - 6);
    }

    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
    popover.classList.remove('hidden');

    setTimeout(() => {
        const activeH = document.querySelector('#bim-tp-hours-list button[data-val="' + currentBim24hHour + '"]');
        if (activeH) activeH.scrollIntoView({ block: 'center', behavior: 'auto' });
        const activeM = document.querySelector('#bim-tp-minutes-list button[data-val="' + currentBim24hMinute + '"]');
        if (activeM) activeM.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 50);
}

function selectBim24hHour(hourStr) {
    currentBim24hHour = hourStr;
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(false);
}

function selectBim24hMinute(minuteStr) {
    currentBim24hMinute = minuteStr;
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(false);
}

function setBim24hPickerTime(hourStr, minuteStr) {
    currentBim24hHour = hourStr;
    currentBim24hMinute = minuteStr;
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(true);
}

function setBim24hPickerNow() {
    const now = new Date();
    currentBim24hHour = String(now.getHours()).padStart(2, '0');
    currentBim24hMinute = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(false);
}

function updateBim24hPickerActiveState() {
    const display = document.getElementById('bim-tp-display');
    if (display) display.textContent = currentBim24hHour + ':' + currentBim24hMinute;

    document.querySelectorAll('#bim-tp-hours-list button').forEach(b => {
        if (b.dataset.val === currentBim24hHour) {
            b.className = 'w-full py-1 text-xs font-mono font-bold rounded-lg bg-teal-700 text-white shadow-xs';
        } else {
            b.className = 'w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-slate-100 text-slate-700 transition-colors';
        }
    });

    document.querySelectorAll('#bim-tp-minutes-list button').forEach(b => {
        if (b.dataset.val === currentBim24hMinute) {
            b.className = 'w-full py-1 text-xs font-mono font-bold rounded-lg bg-teal-700 text-white shadow-xs';
        } else {
            b.className = 'w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-slate-100 text-slate-700 transition-colors';
        }
    });
}

function applyCurrentBim24hTimeToTarget(autoClose = false) {
    if (currentBim24hTarget) {
        currentBim24hTarget.value = currentBim24hHour + ':' + currentBim24hMinute;
        currentBim24hTarget.dispatchEvent(new Event('input', { bubbles: true }));
        currentBim24hTarget.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (autoClose) {
        closeBim24hTimePicker();
    }
}

function confirmBim24hTimePicker() {
    applyCurrentBim24hTimeToTarget(true);
}

function closeBim24hTimePicker() {
    const popover = document.getElementById('bim-24h-timepicker-popover');
    if (popover) popover.classList.add('hidden');
    currentBim24hTarget = null;
}

// Global click outside listener for Time Picker popover
document.addEventListener('click', (e) => {
    const popover = document.getElementById('bim-24h-timepicker-popover');
    if (popover && !popover.classList.contains('hidden')) {
        if (!popover.contains(e.target) && !e.target.closest('[data-time-picker-24h="true"]') && !e.target.closest('button[onclick*="openBim24hTimePicker"]')) {
            closeBim24hTimePicker();
        }
    }
});

// ESC key to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBim24hTimePicker();
    }
});


window.openBim24hTimePicker = openBim24hTimePicker;
window.closeBim24hTimePicker = closeBim24hTimePicker;
window.selectBim24hHour = selectBim24hHour;
window.selectBim24hMinute = selectBim24hMinute;
window.setBim24hPickerTime = setBim24hPickerTime;
window.setBim24hPickerNow = setBim24hPickerNow;
window.confirmBim24hTimePicker = confirmBim24hTimePicker;
