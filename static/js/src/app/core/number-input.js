function attachAutoNumberFormat(inputEl, onChangeCallback) {
    if (!inputEl || inputEl.dataset.hasNumberFormatter) return;
    inputEl.dataset.hasNumberFormatter = 'true';

    // Định dạng sẵn giá trị hiện tại nếu có
    if (inputEl.value) {
        const clean = String(inputEl.value).replace(/\D/g, '');
        if (clean) {
            inputEl.value = new Intl.NumberFormat('vi-VN').format(parseInt(clean, 10));
        }
    }

    // Xử lý phím Backspace khi đứng ngay sau dấu chấm phân cách hàng ngàn
    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace') {
            const pos = this.selectionStart;
            if (pos > 0 && this.selectionStart === this.selectionEnd && this.value[pos - 1] === '.') {
                e.preventDefault();
                const val = this.value;
                this.value = val.slice(0, pos - 2) + val.slice(pos - 1);
                this.setSelectionRange(pos - 1, pos - 1);
                this.dispatchEvent(new Event('input'));
            }
        }
    });

    // Tự động thêm dấu chấm phân cách hàng ngàn theo thời gian thực và duy trì vị trí con trỏ chuột
    inputEl.addEventListener('input', function(e) {
        const rawValue = this.value;
        const cursorPosition = this.selectionStart || 0;
        const digitsOnly = rawValue.replace(/\D/g, '');

        if (!digitsOnly) {
            this.value = '';
            if (onChangeCallback) onChangeCallback(0);
            return;
        }

        const formatted = new Intl.NumberFormat('vi-VN').format(parseInt(digitsOnly, 10));
        this.value = formatted;

        // Định vị lại con trỏ tương ứng với số chữ số trước con trỏ cũ
        const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, '').length;
        let newCursor = formatted.length;
        if (digitsBeforeCursor === 0) {
            newCursor = 0;
        } else {
            let digitsCounted = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) {
                    digitsCounted++;
                }
                if (digitsCounted === digitsBeforeCursor) {
                    newCursor = i + 1;
                    break;
                }
            }
        }
        this.setSelectionRange(newCursor, newCursor);

        if (onChangeCallback) onChangeCallback(parseInt(digitsOnly, 10));
    });
}

function initAllNumberInputs() {
    document.querySelectorAll('.input-number-vn, [data-format="number"]').forEach(el => {
        const cb = (el.id === 'quote-unit-price' || el.id === 'quote-monthly-trips') 
            ? calculateQuoteExpectedRevenue 
            : null;
        attachAutoNumberFormat(el, cb);
    });
}
