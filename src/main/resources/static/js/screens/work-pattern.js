/**
 * 勤務時間変更申請画面モジュール
 */
(function (global) {
class WorkPatternScreen {
    constructor() {
        this.form = null;
        this.startDateInput = null;
        this.endDateInput = null;
        this.startTimeInput = null;
        this.endTimeInput = null;
        this.breakTimeInput = null;
        this.workingPreviewInput = null;
        this.reasonInput = null;
        this.submitButton = null;
        this.resetButton = null;
        this.refreshButton = null;
        this.tableBody = null;
        this.dayButtons = [];
        this.selectedDays = new Set();
        this.isSubmitting = false;
        this.initialized = false;
        this.listenersBound = false;
    }

    init() {
        if (this.initialized) {
            this.updateWorkingPreview();
            this.refreshRequests();
            return;
        }

        this.initializeElements();
        this.setupEventListeners();
        this.setDefaultValues();
        this.refreshRequests();
        this.initialized = true;
    }

    initializeElements() {
        this.form = document.getElementById('workPatternForm');
        this.startDateInput = document.getElementById('workPatternStartDate');
        this.endDateInput = document.getElementById('workPatternEndDate');
        this.startTimeInput = document.getElementById('workPatternStartTime');
        this.endTimeInput = document.getElementById('workPatternEndTime');
        this.breakTimeInput = document.getElementById('workPatternBreakTime');
        this.workingPreviewInput = document.getElementById('workPatternWorkingPreview');
        this.reasonInput = document.getElementById('workPatternReason');
        this.submitButton = document.getElementById('workPatternSubmitBtn');
        this.resetButton = document.getElementById('workPatternResetBtn');
        this.refreshButton = document.getElementById('workPatternRefreshBtn');
        this.tableBody = document.getElementById('workPatternRequestTableBody');
        this.dayButtons = Array.from(document.querySelectorAll('.work-pattern-day-btn'));
    }

    setupEventListeners() {
        if (this.listenersBound) {
            return;
        }
        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmit();
            });
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.setDefaultValues());
        }
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.refreshRequests());
        }
        if (this.startDateInput) {
            this.startDateInput.addEventListener('change', () => this.handleDateChange());
        }
        if (this.endDateInput) {
            this.endDateInput.addEventListener('change', () => this.handleDateChange());
        }
        if (this.startTimeInput) {
            this.startTimeInput.addEventListener('change', () => this.handleTimeChange());
        }
        if (this.endTimeInput) {
            this.endTimeInput.addEventListener('change', () => this.handleTimeChange());
        }
        if (this.breakTimeInput) {
            this.breakTimeInput.addEventListener('input', () => this.updateWorkingPreview());
        }
        if (Array.isArray(this.dayButtons) && this.dayButtons.length > 0) {
            this.dayButtons.forEach((button) => {
                button.addEventListener('click', () => this.toggleDaySelection(button));
            });
        }
        this.listenersBound = true;
    }

    setDefaultValues() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (this.startDateInput) {
            this.startDateInput.value = this.startDateInput.value || todayStr;
        }
        if (this.endDateInput) {
            this.endDateInput.value = this.endDateInput.value || todayStr;
        }
        if (this.startTimeInput) {
            this.startTimeInput.value = this.startTimeInput.value || '09:00';
        }
        if (this.endTimeInput) {
            this.endTimeInput.value = this.endTimeInput.value || '18:00';
        }
        if (this.breakTimeInput) {
            const totalMinutes = this.calculateTotalMinutes();
            if (totalMinutes != null) {
                const autoBreak = Math.min(
                    Math.max(TimeUtils.calculateRequiredBreakMinutes(totalMinutes), 0),
                    totalMinutes
                );
                this.breakTimeInput.value = TimeUtils.formatMinutesToTime(autoBreak);
            } else {
                this.breakTimeInput.value = '1:00';
            }
        }
        if (this.reasonInput) {
            this.reasonInput.value = '';
        }
        this.setDaySelection(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
        this.updateWorkingPreview();
    }

    async handleFormSubmit() {
        if (this.isSubmitting) {
            return;
        }
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDを取得できません。再度ログインしてください。', 'danger');
            return;
        }

        const startDate = this.startDateInput?.value;
        const endDate = this.endDateInput?.value;
        const startTime = this.startTimeInput?.value;
        const endTime = this.endTimeInput?.value;

        if (!startDate || !endDate || !startTime || !endTime) {
            this.showAlert('必須項目を入力してください。', 'warning');
            return;
        }

        if (endDate < startDate) {
            this.showAlert('終了日は開始日以降を指定してください。', 'warning');
            this.endDateInput?.focus();
            return;
        }

        if (!this.selectedDays || this.selectedDays.size === 0) {
            this.showAlert('勤務日を少なくとも1つ選択してください。', 'warning');
            return;
        }

        const totalMinutes = this.calculateTotalMinutes();
        if (totalMinutes === null) {
            this.showAlert('有効な勤務時間を入力してください。', 'warning');
            return;
        }
        if (totalMinutes <= 0) {
            this.showAlert('勤務時間が0分以下です。', 'warning');
            return;
        }

        let breakMinutes = this.parseBreakInputMinutes();
        if (breakMinutes === null) {
            breakMinutes = Math.min(
                Math.max(TimeUtils.calculateRequiredBreakMinutes(totalMinutes), 0),
                totalMinutes
            );
        }
        breakMinutes = Math.min(Math.max(breakMinutes, 0), totalMinutes);

        const workingMinutes = Math.max(totalMinutes - breakMinutes, 0);
        const reason = this.reasonInput?.value?.trim() || '';
        const selectedDaysDisplay = this.formatSelectedDays(this.buildSelectedDaysEntry());

        const confirmed = await this.confirmSubmission({
            startDate,
            endDate,
            startTime,
            endTime,
            breakMinutes,
            workingMinutes,
            reason,
            selectedDaysDisplay
        });

        if (!confirmed) {
            return;
        }

        const payload = {
            employeeId: window.currentEmployeeId,
            startDate,
            endDate,
            startTime,
            endTime,
            breakMinutes,
            reason: reason || null,
            activeDays: Array.from(this.selectedDays)
        };

        try {
            this.isSubmitting = true;
            this.toggleFormDisabled(true);
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/work-pattern-change/requests', payload),
                '勤務時間変更の申請に失敗しました'
            );

            if (response?.success) {
                this.showAlert('勤務時間変更を申請しました。', 'success');
                this.resetFormAfterSubmit();
                await this.refreshRequests();
            } else {
                const message = response?.message || '勤務時間変更の申請に失敗しました';
                this.showAlert(message, 'danger', false);
            }
        } catch (error) {
            console.error('勤務時間変更申請エラー:', error);
            this.showAlert('勤務時間変更の申請に失敗しました。', 'danger', false);
        } finally {
            this.isSubmitting = false;
            this.toggleFormDisabled(false);
        }
    }

    buildSelectedDaysEntry() {
        return {
            applyMonday: this.selectedDays.has('MONDAY'),
            applyTuesday: this.selectedDays.has('TUESDAY'),
            applyWednesday: this.selectedDays.has('WEDNESDAY'),
            applyThursday: this.selectedDays.has('THURSDAY'),
            applyFriday: this.selectedDays.has('FRIDAY'),
            applySaturday: this.selectedDays.has('SATURDAY'),
            applySunday: this.selectedDays.has('SUNDAY'),
            applyHoliday: this.selectedDays.has('HOLIDAY')
        };
    }

    async confirmSubmission({ startDate, endDate, startTime, endTime, breakMinutes, workingMinutes, reason, selectedDaysDisplay }) {
        const confirmHandler = window.employeeDialog?.confirm;
        const dateRange = this.formatDateRange(startDate, endDate);
        const timeRange = this.formatTimeRange(startTime, endTime);
        const breakDisplay = TimeUtils.formatMinutesToTime(breakMinutes);
        const workingDisplay = TimeUtils.formatMinutesToTime(workingMinutes);
        const reasonDisplay = reason ? reason : '（記載なし）';
        const daysDisplay = selectedDaysDisplay && selectedDaysDisplay !== '-' ? selectedDaysDisplay : '（選択なし）';

        const plainMessage = [
            '勤務時間変更申請の内容を確認してください。',
            `適用期間 ${dateRange}`,
            `勤務時間 ${timeRange}`,
            `休憩 ${breakDisplay}`,
            `実働 ${workingDisplay}`,
            `勤務日 ${daysDisplay}`,
            `理由 ${reasonDisplay}`,
            '申請してよろしいですか？'
        ].join('\n');

        const htmlMessage = `
            <div class="text-start small">
                <p class="mb-2">勤務時間変更申請の内容を確認してください。</p>
                <dl class="row g-1 mb-3 align-items-center">
                    <dt class="col-4 text-muted text-nowrap mb-0">適用期間</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(dateRange)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">勤務時間</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(timeRange)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">休憩</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(breakDisplay)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">実働</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(workingDisplay)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">勤務日</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(daysDisplay)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">理由</dt>
                    <dd class="col-8 text-end mb-0">${this.escapeHtml(reasonDisplay)}</dd>
                </dl>
                <p class="mb-0">申請してよろしいですか？</p>
            </div>
        `.trim();

        if (confirmHandler) {
            const { confirmed } = await confirmHandler({
                title: '勤務時間変更申請',
                message: htmlMessage,
                confirmLabel: '申請する',
                cancelLabel: 'キャンセル'
            });
            return confirmed;
        }

        return window.confirm(plainMessage);
    }

    resetFormAfterSubmit() {
        if (!this.form) {
            return;
        }
        this.form.reset();
        if (this.startDateInput) {
            this.startDateInput.value = this.startDateInput.value || this.getToday();
        }
        if (this.endDateInput) {
            this.endDateInput.value = this.startDateInput?.value || this.getToday();
        }
        this.setDefaultValues();
    }

    toggleDaySelection(button) {
        if (!button) {
            return;
        }
        const dayKey = (button.dataset.day || '').toUpperCase();
        if (!dayKey) {
            return;
        }
        if (this.selectedDays.has(dayKey)) {
            this.selectedDays.delete(dayKey);
            this.updateDayButtonState(button, false);
        } else {
            this.selectedDays.add(dayKey);
            this.updateDayButtonState(button, true);
        }
    }

    updateDayButtonState(button, selected) {
        if (!button) {
            return;
        }
        button.classList.toggle('active', selected);
        button.classList.toggle('btn-primary', selected);
        button.classList.toggle('btn-outline-secondary', !selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }

    setDaySelection(days) {
        this.selectedDays.clear();
        if (Array.isArray(days)) {
            days.forEach((day) => {
                if (typeof day === 'string' && day.trim()) {
                    this.selectedDays.add(day.trim().toUpperCase());
                }
            });
        }

        if (Array.isArray(this.dayButtons)) {
            this.dayButtons.forEach((button) => {
                const key = (button.dataset.day || '').toUpperCase();
                this.updateDayButtonState(button, this.selectedDays.has(key));
            });
        }
    }

    toggleFormDisabled(disabled) {
        if (this.submitButton) {
            this.submitButton.disabled = Boolean(disabled);
        }
        if (this.resetButton) {
            this.resetButton.disabled = Boolean(disabled);
        }
        if (this.refreshButton) {
            this.refreshButton.disabled = Boolean(disabled);
        }
    }

    handleDateChange() {
        if (!this.startDateInput || !this.endDateInput) {
            return;
        }
        if (this.endDateInput.value && this.startDateInput.value && this.endDateInput.value < this.startDateInput.value) {
            this.endDateInput.value = this.startDateInput.value;
        }
        this.updateWorkingPreview();
    }

    handleTimeChange() {
        const totalMinutes = this.calculateTotalMinutes();
        if (totalMinutes === null) {
            this.updateWorkingPreview();
            return;
        }

        let breakMinutes = this.parseBreakInputMinutes();
        if (breakMinutes === null) {
            breakMinutes = Math.min(
                Math.max(TimeUtils.calculateRequiredBreakMinutes(totalMinutes), 0),
                totalMinutes
            );
            if (this.breakTimeInput) {
                this.breakTimeInput.value = TimeUtils.formatMinutesToTime(breakMinutes);
            }
        }
        this.updateWorkingPreview();
    }

    calculateTotalMinutes() {
        const startDate = this.startDateInput?.value;
        const endDate = this.endDateInput?.value;
        const startTime = this.startTimeInput?.value;
        const endTime = this.endTimeInput?.value;

        if (!startDate || !startTime || !endTime) {
            return null;
        }

        const start = new Date(`${startDate}T${startTime}:00`);
        const end = new Date(`${startDate}T${endTime}:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return null;
        }

        return Math.floor((end - start) / (1000 * 60));
    }

    parseBreakInputMinutes() {
        if (!this.breakTimeInput) {
            return null;
        }
        const value = this.breakTimeInput.value ? this.breakTimeInput.value.trim() : '';
        if (!value) {
            return null;
        }
        const pattern = /^\d{1,2}:[0-5]\d$/;
        if (!pattern.test(value)) {
            return null;
        }
        return TimeUtils.timeStringToMinutes(value);
    }

    updateWorkingPreview() {
        if (!this.workingPreviewInput) {
            return;
        }
        const totalMinutes = this.calculateTotalMinutes();
        if (totalMinutes === null) {
            this.workingPreviewInput.value = '0:00';
            return;
        }
        let breakMinutes = this.parseBreakInputMinutes();
        if (breakMinutes === null) {
            breakMinutes = Math.min(
                Math.max(TimeUtils.calculateRequiredBreakMinutes(totalMinutes), 0),
                totalMinutes
            );
        }
        breakMinutes = Math.min(Math.max(breakMinutes, 0), totalMinutes);
        const workingMinutes = Math.max(totalMinutes - breakMinutes, 0);
        this.workingPreviewInput.value = TimeUtils.formatMinutesToTime(workingMinutes);
    }

    async refreshRequests() {
        if (!window.currentEmployeeId || !this.tableBody) {
            return;
        }
        this.setTableState('データを読み込み中...', 'text-muted');
        try {
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/work-pattern-change/requests/${window.currentEmployeeId}`),
                '勤務時間変更申請の取得に失敗しました'
            );
            const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
            this.renderRequests(list);
        } catch (error) {
            console.error('勤務時間変更申請取得エラー:', error);
            this.setTableState('勤務時間変更申請の取得に失敗しました', 'text-danger');
        }
    }

    renderRequests(entries) {
        if (!this.tableBody) {
            return;
        }
        this.tableBody.innerHTML = '';
        if (!Array.isArray(entries) || entries.length === 0) {
            this.setTableState('申請履歴はありません', 'text-muted');
            return;
        }

        entries
            .slice()
            .sort((a, b) => {
                const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
                return timeB - timeA;
            })
            .forEach((entry) => {
                const row = document.createElement('tr');
                const status = (entry.status || '').toString().toUpperCase();
                if (status === 'APPROVED') {
                    row.classList.add('table-success');
                } else if (status === 'REJECTED') {
                    row.classList.add('table-secondary');
                }

                const reasonSegments = [];
                if (entry.reason) {
                    reasonSegments.push(this.escapeHtml(entry.reason));
                }
                if (status === 'REJECTED' && entry.rejectionComment) {
                    reasonSegments.push(`<span class="text-danger small">却下理由: ${this.escapeHtml(entry.rejectionComment)}</span>`);
                }
                const reasonText = reasonSegments.length > 0 ? reasonSegments.join('<br>') : '-';
                const workDayDisplay = this.formatSelectedDays(entry);

                row.innerHTML = `
                    <td class="text-start">${this.formatDateRange(entry.startDate, entry.endDate)}</td>
                    <td class="text-start">${this.formatTimeRange(entry.startTime, entry.endTime)}</td>
                    <td class="text-start">${this.formatMinutes(entry.breakMinutes)}</td>
                    <td class="text-start">${this.formatMinutes(entry.workingMinutes)}</td>
                    <td class="text-start">${workDayDisplay}</td>
                    <td class="text-start">${reasonText}</td>
                    <td class="text-start">${this.translateStatus(status)}</td>
                    <td class="text-start">${this.formatDateTime(entry.createdAt)}</td>
                `;
                this.tableBody.appendChild(row);
            });
    }

    setTableState(message, textClass) {
        if (!this.tableBody) {
            return;
        }
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center ${textClass}">${message}</td>
        `;
        this.tableBody.appendChild(row);
    }

    translateStatus(status) {
        switch (status) {
            case 'PENDING':
                return '申請中';
            case 'APPROVED':
                return '承認済';
            case 'REJECTED':
                return '却下';
            default:
                return status || '-';
        }
    }

    formatDateRange(start, end) {
        const formattedStart = this.formatDate(start);
        const formattedEnd = this.formatDate(end);
        if (!start || !end || formattedStart === formattedEnd) {
            return formattedStart;
        }
        return `${formattedStart} 〜 ${formattedEnd}`;
    }

    formatDate(value) {
        if (!value) {
            return '-';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            // fallback for yyyy-MM-dd
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value.replace(/-/g, '/');
            }
            return '-';
        }
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd}`;
    }

    formatTimeRange(start, end) {
        const startText = this.formatTime(start);
        const endText = this.formatTime(end);
        if (!startText && !endText) {
            return '-';
        }
        return `${startText} 〜 ${endText}`;
    }

    formatSelectedDays(entry) {
        if (!entry) {
            return '-';
        }
        const mapping = [
            { key: 'applyMonday', label: '月' },
            { key: 'applyTuesday', label: '火' },
            { key: 'applyWednesday', label: '水' },
            { key: 'applyThursday', label: '木' },
            { key: 'applyFriday', label: '金' },
            { key: 'applySaturday', label: '土' },
            { key: 'applySunday', label: '日' }
        ];
        const selected = [];
        mapping.forEach(({ key, label }) => {
            const value = entry[key];
            if (value === true || value === 'true' || value === 1) {
                selected.push(label);
            }
        });
        const holidayValue = entry.applyHoliday;
        if (holidayValue === true || holidayValue === 'true' || holidayValue === 1) {
            selected.push('祝');
        }
        return selected.length > 0 ? selected.join('・') : '-';
    }

    formatTime(value) {
        if (!value) {
            return '--:--';
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
                return trimmed.slice(0, 5);
            }
        }
        try {
            const date = new Date(`1970-01-01T${value}`);
            if (!Number.isNaN(date.getTime())) {
                return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
            }
        } catch (error) {
            console.warn('時刻フォーマット失敗:', value, error);
        }
        return '--:--';
    }

    formatMinutes(minutes) {
        if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
            return '-';
        }
        return TimeUtils.formatMinutesToTime(minutes);
    }

    formatDateTime(value) {
        if (!value) {
            return '-';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getToday() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    showAlert(message, type = 'info', clearExisting = true) {
        if (typeof global.showAlert === 'function') {
            global.showAlert(message, type, clearExisting);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

global.workPatternScreen = new WorkPatternScreen();
})(window);
