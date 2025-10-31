/**
 * 勤務時間変更申請画面モジュール
 */
(function (global) {
const WORK_PATTERN_DAY_KEYS = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
    'HOLIDAY'
];
const DEFAULT_WORK_PATTERN_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

class WorkPatternScreen {
    constructor() {
        this.form = null;
        this.currentSummaryContainer = null;
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
        this.holidayButtons = [];
        this.dayHelpText = null;
        this.selectedDays = new Set();
        this.isSubmitting = false;
        this.initialized = false;
        this.listenersBound = false;
        this.summaryLoaded = false;
        this.lastSummarySignature = '';
        this.lastSummaryData = null;
        this.summaryPollIntervalMs = 10000;
        this.summaryPollTimer = null;
        this.summaryPollFn = null;
        this.summaryVisibilityHandler = null;
        this.summaryPollingInProgress = false;
        this.latestRequestCache = [];
        this.lastRequestsSignature = '';
        this.requestsLoading = false;
        this.screenCard = null;
        this.summaryInitialLoadComplete = false;
    }

    async init() {
        const navigationPrefill = typeof window.consumeNavigationPrefill === 'function'
            ? window.consumeNavigationPrefill('/work-pattern')
            : null;
        const pathPrefill = this.extractDateFromPath();
        const hasNavigationPrefill = Boolean(navigationPrefill && (navigationPrefill.startDate || navigationPrefill.date));
        const hasPathPrefill = Boolean(pathPrefill);

        if (this.initialized) {
            this.setLoadingState(true);
            try {
                if (hasNavigationPrefill) {
                    this.applyNavigationPrefill(navigationPrefill);
                } else if (hasPathPrefill) {
                    this.applyPathPrefill(pathPrefill);
                } else {
                    this.setDefaultValues();
                }
                this.updateDaySelectionVisibility();
                this.updateDaySelectionAvailability();
                this.updateHolidayButtons();
                this.updateWorkingPreview();
                await this.refreshRequests();
            } finally {
                this.setLoadingState(false);
            }
            this.startSummaryPolling(true);
            return;
        }

        this.initializeElements();
        this.setupEventListeners();
        this.setLoadingState(true);
        try {
            this.setDefaultValues();
            if (hasNavigationPrefill) {
                this.applyNavigationPrefill(navigationPrefill);
            } else if (hasPathPrefill) {
                this.applyPathPrefill(pathPrefill);
            }
            this.updateDaySelectionVisibility();
            await this.refreshRequests();
        } finally {
            this.setLoadingState(false);
        }
        this.startSummaryPolling();
        this.initialized = true;
        
        // ブラウザの初期化完了後に再度空白を確実に設定
        setTimeout(() => {
            if (!(hasNavigationPrefill || hasPathPrefill)) {
                this.setDefaultValues();
            }
        }, 100);
    }

    initializeElements() {
        this.form = document.getElementById('workPatternForm');
        this.currentSummaryContainer = document.getElementById('workPatternCurrentSummary');
        if (this.currentSummaryContainer) {
            this.renderDefaultSummary();
            this.setSummaryMessage('勤務時間を読み込み中です...', false, { hideSummary: true });
        }
        this.screenCard = document.querySelector('#workPatternScreen .card');
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
        this.holidayButtons = Array.from(document.querySelectorAll('.work-pattern-holiday-btn'));
        this.dayHelpText = document.getElementById('workPatternDayHelp');
        this.daySelectionContainer = document.getElementById('workPatternDaySelectionContainer');

        // 要素が取得できた直後に空白を設定（ブラウザのデフォルト値を上書き）
        if (this.startDateInput) {
            this.startDateInput.value = '';
        }
        if (this.endDateInput) {
            this.endDateInput.value = '';
        }
        if (this.startTimeInput) {
            this.startTimeInput.value = '';
        }
        if (this.endTimeInput) {
            this.endTimeInput.value = '';
        }
        if (this.breakTimeInput) {
            this.breakTimeInput.value = '';
        }
        if (this.reasonInput) {
            this.reasonInput.value = '';
        }
    }

    setLoadingState(isLoading) {
        if (!this.screenCard) {
            return;
        }
        if (isLoading) {
            this.screenCard.style.display = 'none';
        } else {
            this.screenCard.style.display = '';
        }
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
            this.form.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') {
                    return;
                }
                if (event.isComposing) {
                    return;
                }
                const target = event.target;
                if (target && target.tagName === 'TEXTAREA') {
                    return;
                }
                event.preventDefault();
            });
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.setDefaultValues());
        }
        if (this.refreshButton && !this.refreshButton.dataset.bound) {
            this.refreshButton.addEventListener('click', async () => {
                const success = await this.handleRefreshButton(this.refreshButton, () => this.refreshRequests());
                if (!success) {
                    this.showAlert('更新に失敗しました', 'danger');
                }
            });
            this.refreshButton.dataset.bound = 'true';
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
            this.breakTimeInput.addEventListener('input', () => {
                this.setValidity(this.breakTimeInput, true);
                this.updateWorkingPreview();
            });
        }
        if (Array.isArray(this.dayButtons) && this.dayButtons.length > 0) {
            this.dayButtons.forEach((button) => {
                button.addEventListener('click', () => this.toggleDaySelection(button));
            });
        }
        const resetValidity = (input) => {
            if (!input) return;
            const handler = () => this.setValidity(input, true);
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        };
        resetValidity(this.startDateInput);
        resetValidity(this.endDateInput);
        resetValidity(this.startTimeInput);
        resetValidity(this.endTimeInput);
        resetValidity(this.breakTimeInput);
        resetValidity(this.reasonInput);
        this.listenersBound = true;
    }

    /**
     * 更新ボタンの共通ハンドリング
     * @param {HTMLButtonElement} button
     * @param {() => Promise<{success?: boolean}|boolean|void>} taskFn
     * @returns {Promise<boolean>}
     */
    async handleRefreshButton(button, taskFn) {
        if (!button || typeof taskFn !== 'function') {
            return false;
        }

        const originalHtml = button.dataset.originalHtml || button.innerHTML;
        button.dataset.originalHtml = originalHtml;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>更新中...';

        let success = true;
        let caughtError = null;

        try {
            const result = await taskFn();
            if (result === false || (result && typeof result === 'object' && result.success === false)) {
                success = false;
            }
        } catch (error) {
            success = false;
            caughtError = error;
            console.error('更新処理でエラーが発生しました:', error);
        }

        if (success) {
            button.innerHTML = '<i class="fas fa-check me-1"></i>更新完了';
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.disabled = false;
            }, 1000);
        } else {
            button.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>更新失敗';
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.disabled = false;
            }, 2000);
        }

        if (caughtError == null && success === false) {
            console.warn('更新処理は失敗として扱われました');
        }

        return success;
    }

    setDefaultValues() {
        if (this.startDateInput) {
            this.startDateInput.value = '';
        }
        if (this.endDateInput) {
            this.endDateInput.value = '';
        }
        if (this.startTimeInput) {
            this.startTimeInput.value = '';
        }
        if (this.endTimeInput) {
            this.endTimeInput.value = '';
        }
        if (this.breakTimeInput) {
            this.breakTimeInput.value = '';
        }
        if (this.reasonInput) {
            this.reasonInput.value = '';
        }
        this.setValidity(this.startDateInput, true);
        this.setValidity(this.endDateInput, true);
        this.setValidity(this.startTimeInput, true);
        this.setValidity(this.endTimeInput, true);
        this.setValidity(this.breakTimeInput, true);
        this.setValidity(this.reasonInput, true);
        this.setDaySelection(DEFAULT_WORK_PATTERN_DAYS);
        this.updateDaySelectionVisibility();
        this.updateWorkingPreview();
        this.updateDaySelectionAvailability();
    }

    extractDateFromPath() {
        try {
            if (window.router && typeof window.router.getCurrentRouteParams === 'function') {
                const params = window.router.getCurrentRouteParams();
                const candidate = params && params.date ? params.date : '';
                if (candidate) {
                    return candidate;
                }
            }
            const path = window.location?.pathname || '';
            const match = path.match(/^\/work-pattern\/(\d{4}-\d{2}-\d{2})$/);
            if (match && match[1]) {
                return match[1];
            }
        } catch (error) {
            console.warn('Failed to extract work pattern date from path:', error);
        }
        return '';
    }

    applyPathPrefill(dateString) {
        const normalized = typeof dateString === 'string' ? dateString.trim() : '';
        if (!normalized) {
            return;
        }
        if (this.startDateInput) {
            this.startDateInput.value = normalized;
            this.setValidity(this.startDateInput, true);
            this.startDateInput.dispatchEvent(new Event('change'));
        }
        if (this.endDateInput) {
            this.endDateInput.value = '';
            this.setValidity(this.endDateInput, true);
        }
    }

    applyNavigationPrefill(prefill = {}) {
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

        const start = normalizeDate(prefill.startDate || prefill.date);
        if (!start) {
            return;
        }

        if (this.startDateInput) {
            this.startDateInput.value = start;
            this.setValidity(this.startDateInput, true);
        }
        if (this.endDateInput) {
            const end = normalizeDate(prefill.endDate);
            if (end) {
                this.endDateInput.value = end;
                this.setValidity(this.endDateInput, true);
            } else {
                this.endDateInput.value = '';
                this.setValidity(this.endDateInput, true);
            }
        }

        this.updateDaySelectionVisibility();
        this.updateDaySelectionAvailability();
        this.handleDateChange();
        this.updateWorkingPreview();
        if (typeof this.updateHolidayButtons === 'function') {
            this.updateHolidayButtons();
        }
    }

    async handleFormSubmit() {
        if (this.isSubmitting) {
            return;
        }
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDを取得できません。再度ログインしてください。', 'danger');
            return;
        }

        const startDate = this.startDateInput?.value || '';
        const endDate = this.endDateInput?.value || '';
        const startTime = this.startTimeInput?.value || '';
        const endTime = this.endTimeInput?.value || '';
        const reasonRaw = this.reasonInput?.value || '';
        const reason = reasonRaw.trim();

        const requiredChecks = [
            { input: this.startDateInput, ok: !!startDate },
            { input: this.endDateInput, ok: !!endDate },
            { input: this.startTimeInput, ok: !!startTime },
            { input: this.endTimeInput, ok: !!endTime },
            { input: this.reasonInput, ok: reason.length > 0 }
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
            firstInvalid.focus?.();
            return;
        }

        if (endDate < startDate) {
            this.showAlert('終了日は開始日以降を指定してください', 'danger');
            this.setValidity(this.endDateInput, false, '終了日は開始日以降を指定してください');
            this.endDateInput?.focus();
            return;
        }
        this.setValidity(this.endDateInput, true);

        // 申請期間が7日以上の場合のみ勤務日の選択を必須とする
        const periodLength = this.getRequestedPeriodLength();
        if (periodLength >= 7) {
            if (!this.selectedDays || this.selectedDays.size === 0) {
                this.showAlert('勤務日を少なくとも1つ選択してください', 'warning');
                return;
            }
            if (this.selectedDays.size !== 5) {
                this.showAlert('勤務日は5日選択してください', 'warning');
                return;
            }
        }

        const totalMinutes = this.calculateTotalMinutes();
        if (totalMinutes === null) {
            this.showAlert('有効な勤務時間を入力してください', 'danger');
            this.setValidity(this.startTimeInput, false, '有効な勤務時間を入力してください');
            this.setValidity(this.endTimeInput, false, '有効な勤務時間を入力してください');
            return;
        }
        if (totalMinutes <= 0) {
            this.showAlert('勤務時間が0分以下です', 'danger');
            this.setValidity(this.endTimeInput, false, '勤務時間が0分以下です');
            return;
        }
        this.setValidity(this.startTimeInput, true);
        this.setValidity(this.endTimeInput, true);

        let breakMinutes = this.parseBreakInputMinutes();
        if (breakMinutes === null) {
            breakMinutes = Math.min(
                Math.max(TimeUtils.calculateRequiredBreakMinutes(totalMinutes), 0),
                totalMinutes
            );
        }
        breakMinutes = Math.min(Math.max(breakMinutes, 0), totalMinutes);

        const workingMinutes = Math.max(totalMinutes - breakMinutes, 0);

        // 実働時間に応じた最小休憩時間の検証
        // 実働6時間以上8時間未満：45分以上の休憩が必要
        if (workingMinutes >= 360 && workingMinutes < 480 && breakMinutes < 45) {
            this.showAlert('実働6時間以上8時間未満の場合、休憩時間は45分以上必要です', 'danger');
            this.setValidity(this.breakTimeInput, false, '45分以上の休憩が必要です');
            this.breakTimeInput?.focus();
            return;
        }
        // 実働8時間以上：60分以上の休憩が必要
        if (workingMinutes >= 480 && breakMinutes < 60) {
            this.showAlert('実働8時間以上の場合、休憩時間は60分以上必要です', 'danger');
            this.setValidity(this.breakTimeInput, false, '60分以上の休憩が必要です');
            this.breakTimeInput?.focus();
            return;
        }
        this.setValidity(this.breakTimeInput, true);

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
            reason: reason,
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
                this.showAlert('勤務時間変更を申請しました', 'success');
                this.resetFormAfterSubmit();
                await this.refreshRequests();
            } else {
                const message = response?.message || '勤務時間変更の申請に失敗しました';
                this.showAlert(message, 'danger', false);
            }
        } catch (error) {
            console.error('勤務時間変更申請エラー:', error);
            this.showAlert('勤務時間変更の申請に失敗しました', 'danger', false);
        } finally {
            this.isSubmitting = false;
            this.toggleFormDisabled(false);
        }
    }

    resolveEffectiveSummary(summary) {
        const fallback = this.buildSummaryFromEntries(this.latestRequestCache);
        if (fallback) {
            if (
                !summary ||
                !summary.hasApprovedRequest ||
                (summary.upcoming === true && fallback.upcoming === false)
            ) {
                return { summary: fallback, usedFallback: true };
            }
        }
        if (summary) {
            return { summary, usedFallback: false };
        }
        if (fallback) {
            return { summary: fallback, usedFallback: true };
        }
        return { summary: null, usedFallback: false };
    }

    buildSummaryFromEntries(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return null;
        }
        const approved = entries.filter((entry) => {
            const status = (entry.status || '').toString().toUpperCase();
            return status === 'APPROVED';
        });
        if (approved.length === 0) {
            return null;
        }
        const today = this.parseDate(this.getToday());
        if (!today) {
            return null;
        }

        const current = approved.find((entry) => this.isDateWithin(today, entry.startDate, entry.endDate));
        if (current) {
            return this.transformEntryToSummary(current, false);
        }

        const upcoming = approved
            .map((entry) => ({ entry, startDate: this.parseDate(entry.startDate) }))
            .filter(({ startDate }) => startDate && startDate > today)
            .sort((a, b) => a.startDate - b.startDate)
            .map(({ entry }) => entry)
            .shift();

        if (upcoming) {
            return this.transformEntryToSummary(upcoming, true);
        }
        return null;
    }

    transformEntryToSummary(entry, upcoming) {
        if (!entry) {
            return null;
        }
        const breakMinutes = this.normalizeMinutesField(entry.breakMinutes);
        const workingMinutes = this.normalizeMinutesField(entry.workingMinutes);
        return {
            startTime: entry.startTime,
            endTime: entry.endTime,
            breakMinutes: Number.isFinite(breakMinutes) ? breakMinutes : 0,
            workingMinutes: Number.isFinite(workingMinutes) ? workingMinutes : 0,
            patternStartDate: entry.startDate,
            patternEndDate: entry.endDate,
            workingDays: this.extractDayLabelsFromEntry(entry, true),
            holidayDays: this.extractDayLabelsFromEntry(entry, false),
            hasApprovedRequest: true,
            upcoming: Boolean(upcoming)
        };
    }

    extractDayLabelsFromEntry(entry, working) {
        const mapping = [
            { key: 'applyMonday', label: '月' },
            { key: 'applyTuesday', label: '火' },
            { key: 'applyWednesday', label: '水' },
            { key: 'applyThursday', label: '木' },
            { key: 'applyFriday', label: '金' },
            { key: 'applySaturday', label: '土' },
            { key: 'applySunday', label: '日' },
            { key: 'applyHoliday', label: '祝' }
        ];
        const labels = [];
        mapping.forEach(({ key, label }) => {
            const applied = this.isTruthy(entry[key]);
            if ((applied && working) || (!applied && !working)) {
                labels.push(label);
            }
        });
        return labels;
    }

    isTruthy(value) {
        if (value === true || value === 1 || value === '1') {
            return true;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        return Boolean(value);
    }

    parseDate(value) {
        if (!value) {
            return null;
        }
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }
        if (typeof value === 'string') {
            const normalized = value.includes('T') ? value : `${value}T00:00:00`;
            const parsed = new Date(normalized);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        try {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        } catch (error) {
            return null;
        }
    }

    isDateWithin(target, start, end) {
        const targetDate = target instanceof Date ? target : this.parseDate(target);
        const startDate = this.parseDate(start);
        const endDate = this.parseDate(end);
        if (!targetDate || !startDate || !endDate) {
            return false;
        }
        return targetDate >= startDate && targetDate <= endDate;
    }

    normalizeMinutesField(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                const numeric = Number(trimmed);
                if (Number.isFinite(numeric)) {
                    return numeric;
                }
            }
            if (/^-?\d{1,2}:[0-5]\d$/.test(trimmed)) {
                return TimeUtils.timeStringToMinutes(trimmed);
            }
        }
        return Number.NaN;
    }

    buildRequestsSignature(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return '[]';
        }
        const sorted = entries
            .slice()
            .sort((a, b) => {
                const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
                return timeB - timeA;
            });
        const normalized = sorted.map((entry) => {
            const breakMinutes = this.normalizeMinutesField(entry.breakMinutes);
            const workingMinutes = this.normalizeMinutesField(entry.workingMinutes);
            return {
                id: entry.requestId ?? entry.id ?? null,
                startDate: entry.startDate ?? '',
                endDate: entry.endDate ?? '',
                startTime: entry.startTime ?? '',
                endTime: entry.endTime ?? '',
                breakMinutes: Number.isFinite(breakMinutes) ? breakMinutes : null,
                workingMinutes: Number.isFinite(workingMinutes) ? workingMinutes : null,
                status: (entry.status || '').toString().toUpperCase(),
                reason: entry.reason ?? '',
                rejectionComment: entry.rejectionComment ?? '',
                applyMonday: this.isTruthy(entry.applyMonday),
                applyTuesday: this.isTruthy(entry.applyTuesday),
                applyWednesday: this.isTruthy(entry.applyWednesday),
                applyThursday: this.isTruthy(entry.applyThursday),
                applyFriday: this.isTruthy(entry.applyFriday),
                applySaturday: this.isTruthy(entry.applySaturday),
                applySunday: this.isTruthy(entry.applySunday),
                applyHoliday: this.isTruthy(entry.applyHoliday),
                createdAt: entry.createdAt ?? entry.created_at ?? '',
                updatedAt: entry.updatedAt ?? entry.updated_at ?? ''
            };
        });
        try {
            return JSON.stringify(normalized);
        } catch (error) {
            console.warn('勤務時間変更申請シグネチャ生成失敗:', error);
            return String(Date.now());
        }
    }

    startSummaryPolling(immediate = false) {
        if (typeof window === 'undefined') {
            return;
        }
        if (!this.summaryPollFn) {
            this.summaryPollFn = async (force = false) => {
                if (this.summaryPollingInProgress) {
                    return;
                }
                if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                    return;
                }
                if (!window.currentEmployeeId) {
                    return;
                }
                this.summaryPollingInProgress = true;
                try {
                    const silentMode = !force;
                    await this.refreshRequests({
                        silent: silentMode,
                        updateSummary: false,
                        forceRender: force
                    });
                    await this.loadCurrentSummary({
                        silent: silentMode,
                        force
                    });
                } catch (error) {
                    console.error('勤務パターン自動更新エラー:', error);
                } finally {
                    this.summaryPollingInProgress = false;
                }
            };
        }
        if (this.summaryPollTimer === null) {
            const interval = Math.max(Number(this.summaryPollIntervalMs) || 0, 5000);
            this.summaryPollTimer = window.setInterval(() => {
                if (this.summaryPollFn) {
                    this.summaryPollFn(false);
                }
            }, interval);
            if (typeof document !== 'undefined' && !this.summaryVisibilityHandler) {
                this.summaryVisibilityHandler = () => {
                    if (document.visibilityState === 'visible' && this.summaryPollFn) {
                        this.summaryPollFn(true);
                    }
                };
                document.addEventListener('visibilitychange', this.summaryVisibilityHandler);
            }
        }
        if (immediate && this.summaryPollFn) {
            this.summaryPollFn(true);
        }
    }

    stopSummaryPolling() {
        if (this.summaryPollTimer !== null) {
            clearInterval(this.summaryPollTimer);
            this.summaryPollTimer = null;
        }
        if (typeof document !== 'undefined' && this.summaryVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.summaryVisibilityHandler);
            this.summaryVisibilityHandler = null;
        }
        this.summaryPollFn = null;
        this.summaryPollingInProgress = false;
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

        // 申請期間が7日以内かを判定（終了日を含む）
        const diffDays = (() => {
            try {
                const s = new Date(startDate);
                const e = new Date(endDate);
                if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
                    return 0;
                }
                return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            } catch (_) {
                return 0;
            }
        })();
        const hideDaysRow = diffDays <= 7;

        const plainLines = [
            `適用期間 ${dateRange}`,
            `勤務時間 ${timeRange}`,
            `休憩 ${breakDisplay}`,
            `実働 ${workingDisplay}`
        ];
        if (!hideDaysRow) {
            plainLines.push(`勤務日 ${daysDisplay}`);
        }
        plainLines.push(`理由 ${reasonDisplay}`, '申請してよろしいですか？');
        const plainMessage = plainLines.join('\n');

        const htmlMessage = `
            <div class="text-start small">
                <dl class="row g-1 mb-3 align-items-center">
                    <dt class="col-4 text-muted text-nowrap mb-0">適用期間</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(dateRange)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">勤務時間</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(timeRange)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">休憩</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(breakDisplay)}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">実働</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(workingDisplay)}</dd>
                    ${hideDaysRow ? '' : `
                    <dt class="col-4 text-muted text-nowrap mb-0">勤務日</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${this.escapeHtml(daysDisplay)}</dd>
                    `}
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
        this.setDefaultValues();
    }

    toggleDaySelection(button) {
        if (!button) {
            return;
        }
        if (button.disabled) {
            return;
        }
        const dayKey = (button.dataset.day || '').toUpperCase();
        if (!dayKey || !WORK_PATTERN_DAY_KEYS.includes(dayKey)) {
            return;
        }
        if (this.selectedDays.has(dayKey)) {
            this.selectedDays.delete(dayKey);
            this.updateDayButtonState(button, false);
        } else {
            if (this.selectedDays.size >= 5) {
                this.showAlert('勤務日は5日まで選択できます', 'danger');
                return;
            }
            this.selectedDays.add(dayKey);
            this.updateDayButtonState(button, true);
        }
        this.updateHolidayButtons();
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
                    if (this.selectedDays.size >= 5) {
                        return;
                    }
                    const key = day.trim().toUpperCase();
                    if (WORK_PATTERN_DAY_KEYS.includes(key)) {
                        this.selectedDays.add(key);
                    }
                }
            });
        }

        if (Array.isArray(this.dayButtons)) {
            this.dayButtons.forEach((button) => {
                const key = (button.dataset.day || '').toUpperCase();
                this.updateDayButtonState(button, this.selectedDays.has(key));
            });
        }
        this.updateHolidayButtons();
    }

    updateHolidayButtons() {
        if (!Array.isArray(this.holidayButtons)) {
            return;
        }
        this.holidayButtons.forEach((button) => {
            if (!button) {
                return;
            }
            const key = (button.dataset.day || '').toUpperCase();
            if (!key || !WORK_PATTERN_DAY_KEYS.includes(key)) {
                return;
            }
            const isHoliday = !this.selectedDays.has(key);
            button.classList.toggle('active', isHoliday);
            button.classList.toggle('btn-outline-danger', isHoliday);
            button.classList.toggle('btn-outline-secondary', !isHoliday);
            button.setAttribute('aria-pressed', isHoliday ? 'true' : 'false');
        });
    }

    updateDaySelectionVisibility() {
        // 開始日と終了日の両方が入力されているかチェック
        const hasBothDates = this.startDateInput?.value && this.endDateInput?.value;
        
        if (!this.daySelectionContainer) {
            return;
        }
        
        if (!hasBothDates) {
            // 開始日・終了日のいずれかが未入力の場合は非表示
            this.daySelectionContainer.style.display = 'none';
        } else {
            // 両方入力されている場合、申請期間が7日以上の場合のみ表示
            const periodLength = this.getRequestedPeriodLength();
            const shouldShow = periodLength >= 7;
            this.daySelectionContainer.style.display = shouldShow ? 'block' : 'none';
        }
    }

    updateDaySelectionAvailability() {
        if (this.selectedDays.size > 5) {
            const trimmed = Array.from(this.selectedDays).slice(0, 5);
            this.setDaySelection(trimmed);
        }
        const selectable = this.getRequestedPeriodLength() >= 7;
        if (Array.isArray(this.dayButtons)) {
            this.dayButtons.forEach((button) => {
                if (!button) {
                    return;
                }
                button.disabled = !selectable;
                button.classList.toggle('disabled', !selectable);
                button.setAttribute('aria-disabled', selectable ? 'false' : 'true');
                button.tabIndex = selectable ? 0 : -1;
            });
        }
        if (!selectable) {
            this.setDaySelection(DEFAULT_WORK_PATTERN_DAYS);
        } else {
            this.updateHolidayButtons();
        }
        this.updateDaySelectionMessage(selectable);
    }

    updateDaySelectionMessage(selectable) {
        if (!this.dayHelpText) {
            return;
        }
        if (selectable) {
            this.dayHelpText.textContent = '勤務日は5日選択してください。';
        } else {
            this.dayHelpText.textContent = '勤務日は5日選択してください。';
        }
    }

    getRequestedPeriodLength() {
        if (!this.startDateInput || !this.endDateInput) {
            return 0;
        }
        const startValue = this.startDateInput.value;
        const endValue = this.endDateInput.value;
        if (!startValue || !endValue) {
            return 0;
        }
        const start = new Date(startValue);
        const end = new Date(endValue);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 0;
        }
        if (end < start) {
            return 0;
        }
        const diff = end.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
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
        this.updateDaySelectionVisibility();
        this.updateDaySelectionAvailability();
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

    async refreshRequests(options = {}) {
        const {
            silent = false,
            updateSummary = true,
            forceRender = false
        } = typeof options === 'object' && options !== null ? options : {};

        if (!window.currentEmployeeId || !this.tableBody) {
            let summary = null;
            if (updateSummary) {
                summary = await this.loadCurrentSummary({ silent });
            }
            return { updated: false, summary, success: true };
        }

        if (silent && this.requestsLoading) {
            return { updated: false, summary: null, success: true };
        }

        if (!silent) {
            this.setTableState('データを読み込み中...', 'text-muted');
        }

        let updated = false;
        let summary = null;
        let success = true;
        try {
            this.requestsLoading = true;
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/work-pattern-change/requests/${window.currentEmployeeId}`),
                '勤務時間変更申請の取得に失敗しました'
            );
            const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
            this.latestRequestCache = Array.isArray(list) ? list.slice() : [];
            const signature = this.buildRequestsSignature(this.latestRequestCache);
            const shouldRender = forceRender || !silent || signature !== this.lastRequestsSignature;
            if (shouldRender) {
                this.renderRequests(this.latestRequestCache);
                this.lastRequestsSignature = signature;
                updated = true;
            }
        } catch (error) {
            console.error('勤務時間変更申請取得エラー:', error);
            if (!silent) {
                this.setTableState('勤務時間変更申請の取得に失敗しました', 'text-danger');
            }
            this.latestRequestCache = [];
            this.lastRequestsSignature = '';
            success = false;
        } finally {
            this.requestsLoading = false;
        }

        if (updateSummary) {
            summary = await this.loadCurrentSummary({ silent });
        }

        return { updated, summary, success };
    }

    renderRequests(entries) {
        if (!this.tableBody) {
            return;
        }
        this.tableBody.innerHTML = '';
        if (!Array.isArray(entries) || entries.length === 0) {
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
            <td colspan="7" class="text-center ${textClass}">${message}</td>
        `;
        this.tableBody.appendChild(row);
    }

    async loadCurrentSummary(options = {}) {
        const { silent = false, force = false } = typeof options === 'object' && options !== null ? options : {};
        if (!this.currentSummaryContainer) {
            return null;
        }
        if (!window.currentEmployeeId) {
            this.renderDefaultSummary();
            this.setSummaryMessage('');
            return this.lastSummaryData;
        }
        const shouldShowLoading = !silent && !this.summaryInitialLoadComplete;
        if (shouldShowLoading) {
            this.setSummaryMessage('勤務時間を読み込み中です...', false, { hideSummary: true });
        }
        try {
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/work-pattern-change/current/${window.currentEmployeeId}`),
                '勤務時間の取得に失敗しました'
            );
            const apiSummary = response?.data ?? (response?.success === undefined ? response : null);
            const { summary: effectiveSummary } = this.resolveEffectiveSummary(apiSummary);

            if (!effectiveSummary) {
                if (!silent) {
                    this.renderDefaultSummary();
                    this.setSummaryMessage('', false);
                }
                return null;
            }

            // 適用前の情報は表示しない（upcoming が true の場合はスキップ）
            if (effectiveSummary.upcoming) {
                if (!silent) {
                    this.renderDefaultSummary();
                    this.setSummaryMessage('', false);
                }
                return null;
            }

            const signature = this.generateSummarySignature(effectiveSummary);
            if (force || this.lastSummarySignature !== signature) {
                this.renderCurrentSummary(effectiveSummary, { isFetched: true });
                this.setSummaryMessage('', false);
            } else if (!silent) {
                this.setSummaryMessage('', false);
            }
            this.lastSummaryData = effectiveSummary;
            return effectiveSummary;
        } catch (error) {
            console.error('勤務パターン概要取得エラー:', error);
            const fallback = this.buildSummaryFromEntries(this.latestRequestCache);
            if (fallback) {
                // 適用前の情報は表示しない（upcoming が true の場合はスキップ）
                if (fallback.upcoming) {
                    if (!silent) {
                        this.renderDefaultSummary();
                        this.setSummaryMessage('', false);
                    }
                    return null;
                }

                const signature = this.generateSummarySignature(fallback);
                if (force || this.lastSummarySignature !== signature) {
                    this.renderCurrentSummary(fallback, { isFetched: true });
                    this.setSummaryMessage('', false);
                } else if (!silent) {
                    this.setSummaryMessage('', false);
                }
                this.lastSummaryData = fallback;
                return fallback;
            }
            if (!silent && !this.summaryLoaded) {
                this.renderDefaultSummary();
            }
            if (!silent) {
                this.setSummaryMessage('勤務時間を取得できませんでした。', true);
            }
            return null;
        } finally {
            if (!silent) {
                this.summaryInitialLoadComplete = true;
            }
        }
    }

    setSummaryMessage(message, isError = false, options = {}) {
        if (!this.currentSummaryContainer) {
            return;
        }
        let statusElement = this.currentSummaryContainer.querySelector('[data-summary-status]');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.dataset.summaryStatus = 'true';
            statusElement.className = 'mt-2 small text-nowrap';
            this.currentSummaryContainer.appendChild(statusElement);
        }
        const text = typeof message === 'string' ? message.trim() : '';
        statusElement.textContent = text;
        statusElement.hidden = text.length === 0;
        statusElement.classList.toggle('text-danger', Boolean(isError) && text.length > 0);
        statusElement.classList.toggle('text-muted', !Boolean(isError) && text.length > 0);
        if (text.length === 0) {
            statusElement.classList.remove('text-danger');
            statusElement.classList.add('text-muted');
        }
        const hideSummary = Boolean(options && options.hideSummary && text.length > 0);
        this.toggleSummaryContentVisibility(!hideSummary);
    }

    toggleSummaryContentVisibility(shouldShow) {
        if (!this.currentSummaryContainer) {
            return;
        }
        Array.from(this.currentSummaryContainer.children).forEach((child) => {
            if (child.dataset && child.dataset.summaryStatus === 'true') {
                return;
            }
            child.hidden = !shouldShow;
        });
    }

    renderCurrentSummary(summary, options = {}) {
        if (!this.currentSummaryContainer) {
            return false;
        }
        const startTimeText = this.formatTime(summary.startTime);
        const endTimeText = this.formatTime(summary.endTime);
        const breakText = TimeUtils.formatMinutesToTime(summary.breakMinutes ?? 0);
        const workingText = TimeUtils.formatMinutesToTime(summary.workingMinutes ?? 0);
        const workingDaysText = this.joinDayLabels(summary.workingDays);
        const holidayDaysText = this.joinDayLabels(summary.holidayDays);
        const periodText = summary.hasApprovedRequest
            ? this.formatDateRange(summary.patternStartDate, summary.patternEndDate)
            : '指定なし';
        const headline = '現在の勤務時間';

        // 7日未満の申請（承認済み）の場合は、勤務日・休日表示を非表示
        const hideDaysRow = Boolean(summary.hasApprovedRequest) && this.isPeriodLessThanWeek(
            summary.patternStartDate,
            summary.patternEndDate
        );
        const daysRowHtml = hideDaysRow
            ? ''
            : `<div>勤務日: <span class="text-body text-success fw-semibold">${this.escapeHtml(workingDaysText)}</span> / 休日: <span class="text-body text-danger fw-semibold">${this.escapeHtml(holidayDaysText)}</span></div>`;

        this.currentSummaryContainer.innerHTML = `
            <div class="fw-semibold text-body">${this.escapeHtml(headline)}</div>
            <div class="mt-1">定時: <span class="fw-semibold text-body">${this.escapeHtml(startTimeText)} 〜 ${this.escapeHtml(endTimeText)}</span> / 休憩: <span class="fw-semibold text-body">${this.escapeHtml(breakText)}</span> / 実働: <span class="fw-semibold text-body">${this.escapeHtml(workingText)}</span></div>
            ${daysRowHtml}
            <div class="mt-1">適用期間: <span class="text-body">${this.escapeHtml(periodText)}</span></div>
            <div class="mt-2 small text-muted" data-summary-status hidden></div>
        `.trim();
        if (options && Object.prototype.hasOwnProperty.call(options, 'isFetched') && options.isFetched) {
            this.summaryLoaded = true;
        }
        this.lastSummarySignature = this.generateSummarySignature(summary);
        this.lastSummaryData = summary;
        if (!options || !options.preserveStatus) {
            this.setSummaryMessage('');
        }
        return Boolean(summary.upcoming);
    }

    renderDefaultSummary() {
        const defaultSummary = this.buildDefaultSummary();
        this.renderCurrentSummary(defaultSummary, { preserveStatus: true, isFetched: false });
    }

    buildDefaultSummary() {
        return {
            startTime: '09:00',
            endTime: '18:00',
            breakMinutes: 60,
            workingMinutes: 480,
            workingDays: ['月', '火', '水', '木', '金'],
            holidayDays: ['土', '日', '祝'],
            hasApprovedRequest: false,
            upcoming: false,
            patternStartDate: null,
            patternEndDate: null
        };
    }

    generateSummarySignature(summary) {
        if (!summary) {
            return '';
        }
        const normalizeArray = (value) => {
            if (!Array.isArray(value) || value.length === 0) {
                return '';
            }
            return value.join('|');
        };
        const normalized = {
            startTime: this.formatTime(summary.startTime),
            endTime: this.formatTime(summary.endTime),
            breakDisplay: TimeUtils.formatMinutesToTime(summary.breakMinutes ?? 0),
            workingDisplay: TimeUtils.formatMinutesToTime(summary.workingMinutes ?? 0),
            workingDays: normalizeArray(summary.workingDays),
            holidayDays: normalizeArray(summary.holidayDays),
            periodStart: this.formatDate(summary.patternStartDate),
            periodEnd: this.formatDate(summary.patternEndDate),
            hasApprovedRequest: Boolean(summary.hasApprovedRequest),
            upcoming: Boolean(summary.upcoming)
        };
        try {
            return JSON.stringify(normalized);
        } catch (error) {
            console.warn('勤務パターンシグネチャ生成失敗:', error);
            return '';
        }
    }

    joinDayLabels(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return 'なし';
        }
        return list.join('・');
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

    isPeriodLessThanWeek(startDate, endDate) {
        if (!startDate || !endDate) {
            return false;
        }
        
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return false;
            }
            
            // 終了日が開始日より前の場合は無効
            if (end < start) {
                return false;
            }
            
            // 日数の差を計算（終了日も含めるため+1）
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            return diffDays < 7;
        } catch (error) {
            console.warn('期間の計算に失敗:', error);
            return false;
        }
    }

    formatSelectedDays(entry) {
        if (!entry) {
            return '-';
        }
        
        // 1週間未満の申請の場合は曜日を空白で表示
        if (this.isPeriodLessThanWeek(entry.startDate, entry.endDate)) {
            return '';
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
        const normalized = this.normalizeMinutesField(minutes);
        if (!Number.isFinite(normalized)) {
            return '-';
        }
        return TimeUtils.formatMinutesToTime(normalized);
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
