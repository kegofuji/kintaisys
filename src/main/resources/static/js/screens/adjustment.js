/**
 * 打刻修正申請画面モジュール
 */
class AdjustmentScreen {
    constructor() {
        this.adjustmentForm = null;
        this.clockInDateInput = null;
        this.clockInTimeInput = null;
        this.clockOutDateInput = null;
        this.clockOutTimeInput = null;
        this.breakTimeInput = null;
        this.workingPreviewInput = null;
        this.adjustmentReason = null;
        this.formTitle = null;
        this.cancelPrefillButton = null;
        this.listenersBound = false;
        this.breakManuallyEdited = false;
        this.autoCalculatedBreakMinutes = 0;
        // 選択日の打刻情報表示用
        this.summaryContainer = null;
        this.summaryClockInEl = null;
        this.summaryClockOutEl = null;
        this.summaryStatusEl = null;
        this.lastFetchedYearMonth = null; // 'YYYY-MM'
        this.monthCache = new Map();
    }

    prefillForm({ clockInDate, clockInTime, clockOutDate, clockOutTime, clockIn, clockOut, date, reason, breakMinutes }) {
        if (!this.adjustmentForm) {
            this.init();
        }

        this.clearPrefillState();

        const normalizeDate = (value) => {
            if (!value) return '';
            if (value instanceof Date) {
                if (Number.isNaN(value.getTime())) return '';
                const yyyy = value.getFullYear();
                const mm = String(value.getMonth() + 1).padStart(2, '0');
                const dd = String(value.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
            if (typeof value === 'string') {
                if (value.includes('T')) {
                    return value.split('T')[0];
                }
                return value;
            }
            return '';
        };

        const normalizeTime = (value) => {
            if (!value) return '';
            if (value instanceof Date) {
                if (Number.isNaN(value.getTime())) return '';
                const hh = String(value.getHours()).padStart(2, '0');
                const mm = String(value.getMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            }
            if (typeof value === 'string') {
                if (value.includes('T')) {
                    const timePart = value.split('T')[1] || '';
                    return timePart.slice(0, 5);
                }
                return value.slice(0, 5);
            }
            return '';
        };

        const resolvedClockInDate = clockInDate || normalizeDate(clockIn) || normalizeDate(date);
        const resolvedClockOutDate = clockOutDate || normalizeDate(clockOut) || normalizeDate(date);
        const resolvedClockInTime = clockInTime || normalizeTime(clockIn);
        const resolvedClockOutTime = clockOutTime || normalizeTime(clockOut);

        if (this.clockInDateInput && resolvedClockInDate) {
            this.clockInDateInput.value = resolvedClockInDate;
        }
        if (this.clockOutDateInput && resolvedClockOutDate) {
            this.clockOutDateInput.value = resolvedClockOutDate;
        }
        if (this.clockInTimeInput && resolvedClockInTime) {
            this.clockInTimeInput.value = resolvedClockInTime;
        }
        if (this.clockOutTimeInput && resolvedClockOutTime) {
            this.clockOutTimeInput.value = resolvedClockOutTime;
        }

        if (this.adjustmentReason) {
            this.adjustmentReason.value = reason || '';
        }

        this.setValidity(this.clockInDateInput, true);
        this.setValidity(this.clockOutDateInput, true);
        this.setValidity(this.clockInTimeInput, true);
        this.setValidity(this.clockOutTimeInput, true);
        this.setValidity(this.breakTimeInput, true);
        this.setValidity(this.adjustmentReason, true);

        this.breakManuallyEdited = false;
        if (this.breakTimeInput) {
            if (typeof breakMinutes === 'number' && !Number.isNaN(breakMinutes)) {
                this.breakTimeInput.value = TimeUtils.formatMinutesToTime(Math.max(breakMinutes, 0));
            } else {
                this.autoCalculateBreak();
            }
        }

        this.updateWorkingPreview();

        if (this.formTitle) {
            this.formTitle.textContent = '打刻修正の再申請';
        }
        if (this.cancelPrefillButton) {
            this.cancelPrefillButton.style.display = 'inline-block';
            this.cancelPrefillButton.onclick = () => {
                this.adjustmentForm?.reset();
                this.setDefaultDate();
                this.clearPrefillState();
            };
        }
        // 選択日の打刻情報を更新
        this.updateSelectedDaySummaryFromInputs();
    }

    /**
     * 初期化
     */
    async init() {
        this.initializeElements();
        this.setupEventListeners();
        const navigationPrefill = typeof window.consumeNavigationPrefill === 'function'
            ? window.consumeNavigationPrefill('/adjustment')
            : null;
        const pathPrefill = this.extractDateFromPath();
        const hasNavigationPrefill = Boolean(navigationPrefill && (navigationPrefill.clockInDate || navigationPrefill.date));
        const hasPathPrefill = Boolean(pathPrefill);

        this.setDefaultDate();
        this.clearPrefillState();

        if (hasNavigationPrefill) {
            await this.applyNavigationPrefill(navigationPrefill);
        } else if (hasPathPrefill) {
            await this.applyPathPrefill(pathPrefill);
        }
        
        // ブラウザの初期化完了後に再度空白を確実に設定（ナビゲーションプレフィル時は保持）
        setTimeout(() => {
            if (!(hasNavigationPrefill || hasPathPrefill)) {
                this.setDefaultDate();
            }
        }, 100);
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.adjustmentForm = document.getElementById('adjustmentForm');
        this.clockInDateInput = document.getElementById('adjustmentClockInDate');
        this.clockInTimeInput = document.getElementById('adjustmentClockInTime');
        this.clockOutDateInput = document.getElementById('adjustmentClockOutDate');
        this.clockOutTimeInput = document.getElementById('adjustmentClockOutTime');
        this.breakTimeInput = document.getElementById('adjustmentBreakTime');
        this.workingPreviewInput = document.getElementById('adjustmentWorkingPreview');
        this.adjustmentReason = document.getElementById('adjustmentReason');
        this.formTitle = document.getElementById('adjustmentFormTitle');
        this.cancelPrefillButton = document.getElementById('adjustmentFormCancel');
        this.resetButton = document.getElementById('adjustmentFormResetBtn');

        // サマリー用要素
        this.summaryContainer = document.getElementById('adjustmentSelectedDaySummary');
        if (this.summaryContainer) {
            this.summaryClockInEl = this.summaryContainer.querySelector('[data-adj-sum-clock-in]');
            this.summaryClockOutEl = this.summaryContainer.querySelector('[data-adj-sum-clock-out]');
            this.summaryStatusEl = this.summaryContainer.querySelector('[data-adj-sum-status]');
            this.renderSelectedDaySummary('', '');
            this.setSummaryStatus('');
        }

        // 要素が取得できた直後に空白を設定（ブラウザのデフォルト値を上書き）
        if (this.clockInDateInput) {
            this.clockInDateInput.value = '';
        }
        if (this.clockOutDateInput) {
            this.clockOutDateInput.value = '';
        }
        if (this.clockInTimeInput) {
            this.clockInTimeInput.value = '';
        }
        if (this.clockOutTimeInput) {
            this.clockOutTimeInput.value = '';
        }
        if (this.breakTimeInput) {
            this.breakTimeInput.value = '';
        }
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.listenersBound) return;
        if (this.adjustmentForm) {
            this.adjustmentForm.addEventListener('submit', (e) => this.handleAdjustmentSubmit(e));
        }

        if (this.clockInDateInput) {
            this.clockInDateInput.addEventListener('change', () => {
                this.validateDateFields();
                this.onTimeFieldUpdated();
                this.updateSelectedDaySummaryFromInputs();
            });
        }
        if (this.clockOutDateInput) {
            this.clockOutDateInput.addEventListener('change', () => {
                this.validateTimeRange();
                this.onTimeFieldUpdated();
            });
        }
        if (this.clockInTimeInput) {
            this.clockInTimeInput.addEventListener('change', () => {
                this.validateTimeRange();
                this.onTimeFieldUpdated();
            });
        }
        if (this.clockOutTimeInput) {
            this.clockOutTimeInput.addEventListener('change', () => {
                this.validateTimeRange();
                this.onTimeFieldUpdated();
            });
        }
        if (this.breakTimeInput) {
            this.breakTimeInput.addEventListener('input', () => {
                this.breakManuallyEdited = true;
                this.setValidity(this.breakTimeInput, true);
                this.updateWorkingPreview();
            });
        }

        const resetValidity = (input) => {
            if (!input) return;
            const handler = () => this.setValidity(input, true);
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        };
        resetValidity(this.clockInDateInput);
        resetValidity(this.clockOutDateInput);
        resetValidity(this.clockInTimeInput);
        resetValidity(this.clockOutTimeInput);
        resetValidity(this.breakTimeInput);
        resetValidity(this.adjustmentReason);

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetForm());
        }

        this.listenersBound = true;
    }

    /**
     * フォームリセット
     */
    resetForm() {
        if (this.adjustmentForm) {
            this.adjustmentForm.reset();
        }
        this.setDefaultDate();
    }

    /**
     * デフォルト日付設定（今日の日付）
     */
    setDefaultDate() {
        if (this.clockInDateInput) {
            this.clockInDateInput.value = '';
        }
        if (this.clockOutDateInput) {
            this.clockOutDateInput.value = '';
        }
        if (this.clockInTimeInput) {
            this.clockInTimeInput.value = '';
        }
        if (this.clockOutTimeInput) {
            this.clockOutTimeInput.value = '';
        }
        if (this.breakTimeInput) {
            this.breakTimeInput.value = '';
            this.setValidity(this.breakTimeInput, true);
        }
        this.setValidity(this.clockInDateInput, true);
        this.setValidity(this.clockOutDateInput, true);
        this.setValidity(this.clockInTimeInput, true);
        this.setValidity(this.clockOutTimeInput, true);
        this.setValidity(this.adjustmentReason, true);
        this.breakManuallyEdited = false;
        this.autoCalculatedBreakMinutes = 0;
        this.updateWorkingPreview();
        this.renderSelectedDaySummary('', '');
        this.setSummaryStatus('');
    }

    clearPrefillState() {
        if (this.formTitle) {
            this.formTitle.textContent = '打刻修正申請';
        }
        if (this.cancelPrefillButton) {
            this.cancelPrefillButton.style.display = 'none';
            this.cancelPrefillButton.onclick = null;
        }
        this.breakManuallyEdited = false;
        this.autoCalculatedBreakMinutes = 0;
        this.renderSelectedDaySummary('', '');
        this.setSummaryStatus('');
        this.setValidity(this.clockInDateInput, true);
        this.setValidity(this.clockOutDateInput, true);
        this.setValidity(this.clockInTimeInput, true);
        this.setValidity(this.clockOutTimeInput, true);
        this.setValidity(this.breakTimeInput, true);
        this.setValidity(this.adjustmentReason, true);
    }

    extractDateFromPath() {
        try {
            if (window.router && typeof window.router.getCurrentRouteParams === 'function') {
                const params = window.router.getCurrentRouteParams();
                const candidate = params && params.date ? this.normalizePathDate(params.date) : '';
                if (candidate) {
                    return candidate;
                }
            }
            const path = window.location?.pathname || '';
            const match = path.match(/^\/adjustment\/(\d{4}-\d{2}-\d{2})$/);
            if (match && match[1]) {
                return this.normalizePathDate(match[1]);
            }
        } catch (error) {
            console.warn('Failed to extract adjustment date from path:', error);
        }
        return '';
    }

    normalizePathDate(value) {
        if (!value) {
            return '';
        }
        if (value instanceof Date) {
            if (Number.isNaN(value.getTime())) {
                return '';
            }
            const yyyy = value.getFullYear();
            const mm = String(value.getMonth() + 1).padStart(2, '0');
            const dd = String(value.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return '';
            }
            if (trimmed.includes('T')) {
                return trimmed.split('T')[0];
            }
            return trimmed.replace(/\//g, '-');
        }
        return '';
    }

    formatTimeForInput(value) {
        if (!value) {
            return '';
        }
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            const hh = String(value.getHours()).padStart(2, '0');
            const mm = String(value.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return '';
            }
            if (trimmed.includes('T')) {
                const timePart = trimmed.split('T')[1] || '';
                return timePart.slice(0, 5);
            }
            if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
                return trimmed.slice(0, 5);
            }
        }
        return '';
    }

    async applyPathPrefill(dateString) {
        const normalized = this.normalizePathDate(dateString);
        if (!normalized) {
            return;
        }

        if (this.clockInDateInput) {
            this.clockInDateInput.value = normalized;
            this.setValidity(this.clockInDateInput, true);
        }
        if (this.clockOutDateInput) {
            this.clockOutDateInput.value = normalized;
            this.setValidity(this.clockOutDateInput, true);
        }

        await this.prefillAttendanceFields(normalized);
        this.updateSelectedDaySummaryFromInputs();
    }

    async prefillAttendanceFields(dateStr) {
        const record = await this.fetchAttendanceRecord(dateStr);

        const clockInInput = this.clockInTimeInput;
        const clockOutInput = this.clockOutTimeInput;

        const applyTimeValue = (input, value) => {
            if (!input) {
                return;
            }
            const formatted = this.formatTimeForInput(value);
            if (formatted) {
                input.value = formatted;
                this.setValidity(input, true);
            } else {
                input.value = '';
                this.setValidity(input, true);
            }
        };

        if (!record) {
            applyTimeValue(clockInInput, '');
            applyTimeValue(clockOutInput, '');
            if (this.breakTimeInput) {
                this.breakTimeInput.value = '';
                this.setValidity(this.breakTimeInput, true);
            }
            this.breakManuallyEdited = false;
            this.autoCalculatedBreakMinutes = 0;
            this.autoCalculateBreak();
            this.updateWorkingPreview();
            return null;
        }

        applyTimeValue(clockInInput, record.clockInTime);
        applyTimeValue(clockOutInput, record.clockOutTime);

        if (this.breakTimeInput) {
            if (typeof record.breakMinutes === 'number' && Number.isFinite(record.breakMinutes)) {
                const minutes = Math.max(0, record.breakMinutes);
                this.breakTimeInput.value = TimeUtils.formatMinutesToTime(minutes);
                this.autoCalculatedBreakMinutes = minutes;
                this.breakManuallyEdited = false;
                this.setValidity(this.breakTimeInput, true);
            } else {
                this.breakManuallyEdited = false;
                this.autoCalculatedBreakMinutes = 0;
                this.autoCalculateBreak();
            }
        }

        this.updateWorkingPreview();
        return record;
    }

    async fetchAttendanceRecord(dateStr) {
        if (!window.currentEmployeeId || !dateStr) {
            return null;
        }
        try {
            const encodedDate = encodeURIComponent(dateStr);
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/history/${window.currentEmployeeId}/${encodedDate}`),
                '指定日の勤怠情報の取得に失敗しました'
            );
            const data = response?.data ?? (response?.success === undefined ? response : null);
            if (data && typeof data === 'object') {
                return data;
            }
        } catch (error) {
            console.warn('Failed to fetch attendance record for adjustment prefill:', error);
        }
        return null;
    }

    async applyNavigationPrefill(prefill = {}) {
        const normalizeDate = (value) => {
            if (!value) return '';
            if (value instanceof Date) {
                if (Number.isNaN(value.getTime())) return '';
                const yyyy = value.getFullYear();
                const mm = String(value.getMonth() + 1).padStart(2, '0');
                const dd = String(value.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return '';
                if (trimmed.includes('T')) {
                    return trimmed.split('T')[0];
                }
                return trimmed.replace(/\//g, '-');
            }
            return '';
        };

        const isoDate = normalizeDate(prefill.clockInDate || prefill.date);
        if (!isoDate) {
            return;
        }

        if (this.clockInDateInput) {
            this.clockInDateInput.value = isoDate;
            this.setValidity(this.clockInDateInput, true);
        }
        if (this.clockOutDateInput) {
            const outDate = normalizeDate(prefill.clockOutDate || prefill.clockOut) || isoDate;
            this.clockOutDateInput.value = outDate;
            this.setValidity(this.clockOutDateInput, true);
        }

        const normalizedClockIn = this.formatTimeForInput(prefill.clockInTime || prefill.clockIn);
        const normalizedClockOut = this.formatTimeForInput(prefill.clockOutTime || prefill.clockOut);

        if (this.clockInTimeInput) {
            this.clockInTimeInput.value = normalizedClockIn || '';
            this.setValidity(this.clockInTimeInput, true);
        }
        if (this.clockOutTimeInput) {
            this.clockOutTimeInput.value = normalizedClockOut || '';
            this.setValidity(this.clockOutTimeInput, true);
        }

        const hasPrefillBreak = typeof prefill.breakMinutes === 'number' && Number.isFinite(prefill.breakMinutes);
        let prefillBreakMinutes = null;
        if (this.breakTimeInput) {
            if (hasPrefillBreak) {
                prefillBreakMinutes = Math.max(0, prefill.breakMinutes);
                this.breakTimeInput.value = TimeUtils.formatMinutesToTime(prefillBreakMinutes);
                this.autoCalculatedBreakMinutes = prefillBreakMinutes;
                this.breakManuallyEdited = false;
            } else {
                this.breakTimeInput.value = '';
                this.autoCalculatedBreakMinutes = 0;
            }
            this.setValidity(this.breakTimeInput, true);
        }

        if (this.adjustmentReason) {
            this.adjustmentReason.value = '';
            this.setValidity(this.adjustmentReason, true);
        }

        this.breakManuallyEdited = false;

        const shouldFetchAttendance = Boolean(isoDate) && (!normalizedClockIn || !normalizedClockOut);

        if (shouldFetchAttendance) {
            const record = await this.prefillAttendanceFields(isoDate);
            if (!record) {
                if (this.clockInTimeInput) {
                    this.clockInTimeInput.value = normalizedClockIn || '';
                }
                if (this.clockOutTimeInput) {
                    this.clockOutTimeInput.value = normalizedClockOut || '';
                }
                if (this.breakTimeInput) {
                    if (hasPrefillBreak && prefillBreakMinutes !== null) {
                        this.breakTimeInput.value = TimeUtils.formatMinutesToTime(prefillBreakMinutes);
                        this.autoCalculatedBreakMinutes = prefillBreakMinutes;
                    } else if (normalizedClockIn && normalizedClockOut) {
                        this.autoCalculateBreak();
                    } else {
                        this.breakTimeInput.value = '';
                        this.autoCalculatedBreakMinutes = 0;
                    }
                }
                this.updateWorkingPreview();
            }
        } else {
            if (this.breakTimeInput) {
                if (!hasPrefillBreak && normalizedClockIn && normalizedClockOut) {
                    this.autoCalculateBreak();
                }
            }
            this.updateWorkingPreview();
        }

        this.updateSelectedDaySummaryFromInputs();
        this.setSummaryStatus('');
    }

    /**
     * 打刻修正申請送信
     * @param {Event} e - イベント
     */
    async handleAdjustmentSubmit(e) {
        e.preventDefault();

        const clockInDate = this.clockInDateInput?.value || '';
        const clockInTime = this.clockInTimeInput?.value || '';
        const clockOutDate = this.clockOutDateInput?.value || '';
        const clockOutTime = this.clockOutTimeInput?.value || '';
        const reasonRaw = this.adjustmentReason?.value || '';
        const reason = reasonRaw.trim();
        const breakTimeValueRaw = this.breakTimeInput?.value || '';
        const breakTimeValue = breakTimeValueRaw.trim();

        const requiredChecks = [
            { input: this.clockInDateInput, ok: !!clockInDate },
            { input: this.clockOutDateInput, ok: !!clockOutDate },
            { input: this.clockInTimeInput, ok: !!clockInTime },
            { input: this.clockOutTimeInput, ok: !!clockOutTime },
            { input: this.adjustmentReason, ok: reason.length > 0 }
        ];

        let firstInvalid = null;
        requiredChecks.forEach(({ input, ok }) => {
            this.setValidity(input, ok, '必須項目を入力してください');
            if (!ok && !firstInvalid) {
                firstInvalid = input;
            }
        });

        if (firstInvalid) {
            this.showAlert('必須項目を入力してください', 'warning');
            firstInvalid?.focus();
            return;
        }

        if (!this.validateDateFields()) {
            return;
        }

        if (!this.validateTimeRange()) {
            return;
        }

        // 休憩時間が入力されている場合のみバリデーション
        if (breakTimeValue.length > 0) {
            const breakPattern = /^\d{1,2}:[0-5]\d$/;
            if (!breakPattern.test(breakTimeValue)) {
                this.showAlert('休憩時間はHH:MM形式で入力してください', 'danger');
                this.setValidity(this.breakTimeInput, false, '休憩時間はHH:MM形式で入力してください');
                this.breakTimeInput?.focus();
                return;
            }
        }

        const breakMinutes = TimeUtils.timeStringToMinutes(breakTimeValue);
        this.setValidity(this.breakTimeInput, true);
        const totalMinutes = this.calculateTotalMinutes(clockInDate, clockInTime, clockOutDate, clockOutTime);
        if (totalMinutes === null) {
            this.showAlert('有効な勤務時間を入力してください', 'danger');
            this.setValidity(this.clockInTimeInput, false, '有効な勤務時間を入力してください');
            this.setValidity(this.clockOutTimeInput, false, '有効な勤務時間を入力してください');
            return;
        }

        if (breakMinutes > totalMinutes) {
            this.showAlert('休憩時間が勤務時間を超えています', 'danger');
            this.setValidity(this.breakTimeInput, false, '休憩時間が勤務時間を超えています');
            this.breakTimeInput?.focus();
            return;
        }

        const workingMinutes = Math.max(totalMinutes - breakMinutes, 0);

        // 実働時間に応じた最小休憩時間の検証
        // 実働6時間以上8時間未満：45分以上の休憩が必要
        // 実働8時間以上：60分以上の休憩が必要
        if (workingMinutes >= 360 && workingMinutes < 480 && breakMinutes < 45) {
            this.showAlert('実働6時間以上8時間未満の場合、休憩時間は45分以上必要です', 'danger');
            this.setValidity(this.breakTimeInput, false, '45分以上の休憩が必要です');
            this.breakTimeInput?.focus();
            return;
        } else if (workingMinutes >= 480 && breakMinutes < 60) {
            this.showAlert('実働8時間以上の場合、休憩時間は60分以上必要です', 'danger');
            this.setValidity(this.breakTimeInput, false, '60分以上の休憩が必要です');
            this.breakTimeInput?.focus();
            return;
        }

        this.setValidity(this.clockInDateInput, true);
        this.setValidity(this.clockOutDateInput, true);
        this.setValidity(this.clockInTimeInput, true);
        this.setValidity(this.clockOutTimeInput, true);
        this.setValidity(this.breakTimeInput, true);
        this.setValidity(this.adjustmentReason, true);

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const targetDates = this.expandDateRange(clockInDate, clockOutDate);
        try {
            const conflicts = await this.getActiveVacationConflicts(targetDates);
            if (conflicts.length > 0) {
                const displayDates = conflicts.map((date) => this.formatDateForDisplay(date)).filter(Boolean);
                const dateLabel = displayDates.length > 0 ? `対象日（${displayDates.join(', ')}）` : '対象日';
                this.showAlert(`${dateLabel}には有給申請が存在します。打刻修正するには、有給申請を取消してください。`, 'danger');
                return;
            }
        } catch (error) {
            console.error('有給申請状況の確認に失敗しました:', error);
            this.showAlert('有給申請状況の確認に失敗しました。時間をおいて再度お試しください。', 'danger');
            return;
        }

        const confirmHandler = window.employeeDialog?.confirm;
        const formatDateForDialog = (value) => {
            if (!value) {
                return '';
            }
            return value.replace(/-/g, '/');
        };

        const readableBreak = TimeUtils.formatMinutesToTime(breakMinutes);
        const readableWork = TimeUtils.formatMinutesToTime(workingMinutes);
        const reasonDisplay = reason || '記載なし';
        const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const modalMessageText = [
            `出勤 ${formatDateForDialog(clockInDate)} ${clockInTime}`,
            `退勤 ${formatDateForDialog(clockOutDate)} ${clockOutTime}`,
            `休憩 ${readableBreak}`,
            `勤務 ${readableWork}`,
            `理由 ${reasonDisplay}`,
            '申請してよろしいですか？'
        ].join('\n');
        const modalMessageHtml = `
            <div class="text-start small">
                <dl class="row g-1 mb-3 align-items-center">
                    <dt class="col-4 text-muted text-nowrap mb-0">出勤</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${formatDateForDialog(clockInDate)} ${clockInTime}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">退勤</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${formatDateForDialog(clockOutDate)} ${clockOutTime}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">休憩</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${readableBreak}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">勤務</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${readableWork}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">理由</dt>
                    <dd class="col-8 text-end mb-0">${escapeHtml(reasonDisplay)}</dd>
                </dl>
                <p class="mb-0">申請してよろしいですか？</p>
            </div>
        `.trim();
        if (confirmHandler) {
            const { confirmed } = await confirmHandler({
                title: '打刻修正申請の送信',
                message: modalMessageHtml,
                confirmLabel: '申請する',
                cancelLabel: 'キャンセル'
            });
            if (!confirmed) {
                return;
            }
        } else {
            const confirmed = window.confirm(modalMessageText);
            if (!confirmed) {
                return;
            }
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/adjustment-request', {
                    employeeId: window.currentEmployeeId,
                    date: clockInDate,
                    clockInDate: clockInDate,
                    clockInTime: clockInTime,
                    clockOutDate: clockOutDate,
                    clockOutTime: clockOutTime,
                    reason: reason,
                    breakMinutes: breakMinutes,
                    breakTime: breakTimeValue
                }),
                '打刻修正申請に失敗しました'
            );

            this.showAlert(data.message, 'success');
            this.adjustmentForm.reset();
            this.setDefaultDate();
            this.clearPrefillState();

            await this.refreshAllScreens();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 出勤日のバリデーション
     * @returns {boolean}
     */
    validateDateFields() {
        if (!this.clockInDateInput && !this.clockOutDateInput) {
            return true;
        }

        if (this.clockInDateInput) {
            const dateStr = (this.clockInDateInput.value || '').trim();
            if (dateStr) {
                const selectedDate = new Date(`${dateStr}T00:00:00`);
                if (Number.isNaN(selectedDate.getTime())) {
                    this.setValidity(this.clockInDateInput, false, '有効な出勤日を入力してください');
                    this.showAlert('有効な出勤日を入力してください', 'danger');
                    this.clockInDateInput.focus();
                    return false;
                }
                this.setValidity(this.clockInDateInput, true);
            }
        }

        if (this.clockOutDateInput) {
            const dateStr = (this.clockOutDateInput.value || '').trim();
            if (dateStr) {
                const selectedDate = new Date(`${dateStr}T00:00:00`);
                if (Number.isNaN(selectedDate.getTime())) {
                    this.setValidity(this.clockOutDateInput, false, '有効な退勤日を入力してください');
                    this.showAlert('有効な退勤日を入力してください', 'danger');
                    this.clockOutDateInput.focus();
                    return false;
                }
                this.setValidity(this.clockOutDateInput, true);
            }
        }

        return true;
    }

    /**
     * 時刻範囲のバリデーション
     * @returns {boolean}
     */
    validateTimeRange() {
        if (!this.clockInDateInput || !this.clockOutDateInput || !this.clockInTimeInput || !this.clockOutTimeInput) {
            return true;
        }

        const clockInDate = this.clockInDateInput.value;
        const clockOutDate = this.clockOutDateInput.value;
        const clockInTime = this.clockInTimeInput.value;
        const clockOutTime = this.clockOutTimeInput.value;

        if (!clockInDate || !clockOutDate || !clockInTime || !clockOutTime) {
            return true;
        }

        this.setValidity(this.clockInTimeInput, true);
        this.setValidity(this.clockOutTimeInput, true);

        const start = new Date(`${clockInDate}T${clockInTime}:00`);
        const end = new Date(`${clockOutDate}T${clockOutTime}:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            this.showAlert('有効な出勤・退勤日時を入力してください', 'danger');
            if (Number.isNaN(start.getTime())) {
                this.setValidity(this.clockInTimeInput, false, '有効な出勤時刻を入力してください');
            }
            if (Number.isNaN(end.getTime())) {
                this.setValidity(this.clockOutTimeInput, false, '有効な退勤時刻を入力してください');
            }
            return false;
        }

        if (end <= start) {
            this.showAlert('退勤日時は出勤日時より後に設定してください', 'danger');
            this.setValidity(this.clockOutTimeInput, false, '退勤時刻は出勤後に設定してください');
            this.clockOutTimeInput.focus();
            return false;
        }

        const workHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (workHours > 36) {
            this.showAlert('勤務時間が長すぎます（36時間以内で入力してください）', 'danger');
            this.setValidity(this.clockOutTimeInput, false, '勤務時間は36時間以内で入力してください');
            return false;
        }

        return true;
    }

    onTimeFieldUpdated() {
        this.breakManuallyEdited = false;
        this.autoCalculateBreak();
        this.updateWorkingPreview();
    }

    autoCalculateBreak() {
        if (!this.breakTimeInput) {
            return;
        }

        const totalMinutes = this.calculateTotalMinutes();
        if (totalMinutes === null) {
            return;
        }

        const breakMinutes = Math.min(
            Math.max(TimeUtils.calculateRequiredBreakMinutes(totalMinutes), 0),
            totalMinutes
        );

        this.autoCalculatedBreakMinutes = breakMinutes;
        this.breakManuallyEdited = false;
        this.breakTimeInput.value = TimeUtils.formatMinutesToTime(breakMinutes);
        this.breakTimeInput.classList.remove('is-invalid');
        this.breakTimeInput.removeAttribute('aria-invalid');
    }

    calculateTotalMinutes(startDateStr, startTimeStr, endDateStr, endTimeStr) {
        const clockInDate = startDateStr ?? this.clockInDateInput?.value;
        const clockInTime = startTimeStr ?? this.clockInTimeInput?.value;
        const clockOutDate = endDateStr ?? this.clockOutDateInput?.value;
        const clockOutTime = endTimeStr ?? this.clockOutTimeInput?.value;

        if (!clockInDate || !clockInTime || !clockOutDate || !clockOutTime) {
            return null;
        }

        const start = new Date(`${clockInDate}T${clockInTime}:00`);
        const end = new Date(`${clockOutDate}T${clockOutTime}:00`);
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

    // ===== 選択日の打刻情報（サマリー） =====
    renderSelectedDaySummary(clockInText, clockOutText) {
        if (!this.summaryContainer) {
            return;
        }
        const inText = typeof clockInText === 'string' ? clockInText : '';
        const outText = typeof clockOutText === 'string' ? clockOutText : '';
        if (this.summaryClockInEl) this.summaryClockInEl.textContent = inText;
        if (this.summaryClockOutEl) this.summaryClockOutEl.textContent = outText;
    }

    setSummaryStatus(message, isError = false) {
        if (!this.summaryStatusEl) return;
        const text = (message || '').trim();
        this.summaryStatusEl.textContent = text;
        this.summaryStatusEl.hidden = text.length === 0;
        this.summaryStatusEl.classList.toggle('text-danger', Boolean(isError) && text.length > 0);
        this.summaryStatusEl.classList.toggle('text-muted', !Boolean(isError) && text.length > 0);
    }

    updateSelectedDaySummaryFromInputs() {
        const dateStr = this.clockInDateInput?.value || '';
        this.updateSelectedDaySummary(dateStr);
    }

    async updateSelectedDaySummary(dateStr) {
        if (!this.summaryContainer) {
            return;
        }
        const normalized = (dateStr || '').trim();
        if (!normalized) {
            this.renderSelectedDaySummary('', '');
            this.setSummaryStatus('');
            return;
        }
        if (!window.currentEmployeeId) {
            this.renderSelectedDaySummary('', '');
            this.setSummaryStatus('従業員情報の取得に失敗しました', true);
            return;
        }

        // 今日の場合は最新の状態を都度取得
        try {
            const todayStr = this.formatDateString(new Date());
            if (normalized === todayStr) {
                this.setSummaryStatus('選択日の打刻情報を読み込み中です...', false);
                const respToday = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.get(`/api/attendance/today/${window.currentEmployeeId}`),
                    '今日の打刻情報の取得に失敗しました'
                );
                const dataToday = respToday?.data ?? (respToday?.success === undefined ? respToday : null);
                if (dataToday) {
                    const inTextToday = dataToday.clockInTime ? new Date(dataToday.clockInTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '打刻なし';
                    const outTextToday = dataToday.clockOutTime ? new Date(dataToday.clockOutTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '打刻なし';
                    this.renderSelectedDaySummary(inTextToday, outTextToday);
                    this.setSummaryStatus('');
                    // 月次キャッシュも更新しておく（同日の要素を入れ替え／追加）
                    const yyyy = todayStr.slice(0, 4);
                    const mm = todayStr.slice(5, 7);
                    const ymKeyTmp = `${yyyy}-${mm}`;
                    const arr = Array.isArray(this.monthCache.get(ymKeyTmp)) ? this.monthCache.get(ymKeyTmp).slice() : [];
                    const idx = arr.findIndex(r => (r?.attendanceDate || '').slice(0, 10) === todayStr);
                    const merged = {
                        attendanceDate: dataToday.attendanceDate || todayStr,
                        clockInTime: dataToday.clockInTime || null,
                        clockOutTime: dataToday.clockOutTime || null,
                        breakMinutes: dataToday.breakMinutes ?? null
                    };
                    if (idx >= 0) arr[idx] = { ...arr[idx], ...merged }; else arr.push(merged);
                    this.monthCache.set(ymKeyTmp, arr);
                    return; // ここで終了
                }
            }
        } catch (e) {
            console.warn('今日の打刻情報取得で警告:', e);
            // 続行して月次データでフォールバック
        }

        // 月別取得 -> 対象日を抽出（今日以外、または今日取得が失敗した場合）
        let yyyy = '', mm = '';
        try {
            const d = new Date(normalized);
            if (Number.isNaN(d.getTime())) {
                this.renderSelectedDaySummary('', '');
                this.setSummaryStatus('');
                return;
            }
            yyyy = String(d.getFullYear());
            mm = String(d.getMonth() + 1).padStart(2, '0');
        } catch (_) {
            this.renderSelectedDaySummary('', '');
            this.setSummaryStatus('');
            return;
        }

        const ymKey = `${yyyy}-${mm}`;
        let monthData = this.monthCache.get(ymKey);
        if (!monthData) {
            try {
                this.setSummaryStatus('選択日の打刻情報を読み込み中です...', false);
                const resp = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.get(`/api/attendance/history/${window.currentEmployeeId}?year=${yyyy}&month=${mm}`),
                    '勤怠履歴の取得に失敗しました'
                );
                monthData = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
                this.monthCache.set(ymKey, monthData);
                this.lastFetchedYearMonth = ymKey;
            } catch (error) {
                console.error('選択日打刻情報の読み込み失敗:', error);
                this.renderSelectedDaySummary('', '');
                this.setSummaryStatus('選択日の打刻情報の取得に失敗しました', true);
                return;
            }
        }

        const record = Array.isArray(monthData)
            ? monthData.find(r => (r?.attendanceDate || '').slice(0, 10) === normalized)
            : null;

        const formatTime = (value) => {
            if (!value) return '';
            try {
                const t = new Date(value);
                if (!Number.isNaN(t.getTime())) {
                    return t.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (_) {}
            if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
                return value.slice(0, 5);
            }
            return '';
        };

        const inText = record?.clockInTime ? formatTime(record.clockInTime) : '打刻なし';
        const outText = record?.clockOutTime ? formatTime(record.clockOutTime) : '打刻なし';
        this.renderSelectedDaySummary(inText, outText);
        this.setSummaryStatus('');
    }

    /**
     * 全画面を更新（リアルタイム反映）
     */
    async refreshAllScreens() {
        try {
            console.log('打刻修正申請後の画面更新を開始します');
            
            if (window.historyScreen) {
                console.log('勤怠履歴画面を更新中...');
                try {
                    if (typeof window.historyScreen.loadCalendarData === 'function') {
                        await window.historyScreen.loadCalendarData();
                    }
                    if (typeof window.historyScreen.generateCalendar === 'function') {
                        window.historyScreen.generateCalendar();
                    }
                    console.log('勤怠履歴画面の更新完了');
                } catch (error) {
                    console.warn('勤怠履歴画面の更新に失敗:', error);
                }
            }
            
            if (window.calendarScreen) {
                console.log('カレンダー画面を更新中...');
                try {
                    if (typeof window.calendarScreen.loadCalendarData === 'function') {
                        await window.calendarScreen.loadCalendarData();
                    }
                    if (typeof window.calendarScreen.generateCalendar === 'function') {
                        window.calendarScreen.generateCalendar();
                    }
                    console.log('カレンダー画面の更新完了');
                } catch (error) {
                    console.warn('カレンダー画面の更新に失敗:', error);
                }
            }
            
            if (window.dashboardScreen) {
                console.log('ダッシュボード画面を更新中...');
                try {
                    if (typeof window.dashboardScreen.loadTodayAttendance === 'function') {
                        await window.dashboardScreen.loadTodayAttendance();
                    }
                    console.log('ダッシュボード画面の更新完了');
                } catch (error) {
                    console.warn('ダッシュボード画面の更新に失敗:', error);
                }
            }
            
            console.log('打刻修正申請後の画面更新が完了しました');
        } catch (error) {
            console.warn('打刻修正申請後の画面更新に失敗しました:', error);
        }
    }

    /**
     * アラート表示
     * @param {string} message - メッセージ
     * @param {string} type - アラートタイプ
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    setValidity(input, ok, message) {
        if (!input) return;
        if (ok) {
            if (typeof input.setCustomValidity === 'function') {
                input.setCustomValidity('');
            }
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
        } else {
            if (typeof input.setCustomValidity === 'function') {
                input.setCustomValidity(message || '無効な値です');
            }
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
        }
    }

    expandDateRange(startStr, endStr) {
        const start = this.parseDate(startStr);
        const end = this.parseDate(endStr || startStr);
        if (!start || !end) {
            return [];
        }
        const dates = [];
        const cursor = new Date(start.getTime());
        while (cursor.getTime() <= end.getTime()) {
            dates.push(this.formatDateString(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return dates;
    }

    async getActiveVacationConflicts(dateStrings) {
        if (!Array.isArray(dateStrings) || dateStrings.length === 0) {
            return [];
        }
        if (!window.currentEmployeeId) {
            return [];
        }

        const response = await fetchWithAuth.handleApiCall(
            () => fetchWithAuth.get(`/api/leave/requests/${window.currentEmployeeId}`),
            '休暇申請の取得に失敗しました'
        );

        let list = [];
        if (response && response.success && Array.isArray(response.data)) {
            list = response.data;
        } else if (Array.isArray(response)) {
            list = response;
        } else if (response && Array.isArray(response.requests)) {
            list = response.requests;
        }

        const dateSet = new Set(dateStrings);
        const conflicts = new Set();
        list.forEach((req) => {
            const status = (req?.status || '').toString().toUpperCase();
            if (!['PENDING', 'APPROVED'].includes(status)) {
                return;
            }

            // 半休申請（HALF_AMまたはHALF_PM）の場合は競合として扱わない
            const timeUnit = req?.timeUnit || '';
            if (timeUnit === 'HALF_AM' || timeUnit === 'HALF_PM') {
                return;
            }

            const startDate = this.parseDate(req.startDate || req.date);
            const endDate = this.parseDate(req.endDate || req.date || req.startDate);
            if (!startDate || !endDate) {
                return;
            }

            const range = this.expandDateRange(
                this.formatDateString(startDate),
                this.formatDateString(endDate)
            );
            range.forEach((date) => {
                if (dateSet.has(date)) {
                    conflicts.add(date);
                }
            });
        });

        return Array.from(conflicts).sort();
    }

    parseDate(value) {
        const normalized = this.normalizeDateString(value);
        if (!normalized) {
            return null;
        }
        const [yearStr, monthStr, dayStr] = normalized.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
            return null;
        }
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    normalizeDateString(value) {
        if (!value) {
            return '';
        }
        if (value instanceof Date) {
            return this.formatDateString(value);
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return '';
            }
            if (trimmed.includes('T')) {
                return trimmed.split('T')[0];
            }
            return trimmed;
        }
        return '';
    }

    formatDateString(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateForDisplay(dateStr) {
        const normalized = this.normalizeDateString(dateStr);
        if (!normalized) {
            return '';
        }
        return normalized.replace(/-/g, '/');
    }
}

// グローバルインスタンスを作成
window.adjustmentScreen = new AdjustmentScreen();
