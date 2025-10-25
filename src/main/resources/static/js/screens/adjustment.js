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
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.setDefaultDate();
        this.clearPrefillState();
        
        // ブラウザの初期化完了後に再度空白を確実に設定
        setTimeout(() => {
            this.setDefaultDate();
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
                this.breakTimeInput.classList.remove('is-invalid');
                this.breakTimeInput.removeAttribute('aria-invalid');
                this.updateWorkingPreview();
            });
        }

        this.listenersBound = true;
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
            this.breakTimeInput.classList.remove('is-invalid');
            this.breakTimeInput.removeAttribute('aria-invalid');
        }
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
        const reason = this.adjustmentReason?.value || '';
        const breakTimeValue = this.breakTimeInput?.value || '';

        if (!clockInDate || !clockOutDate || !reason) {
            this.showAlert('出勤日・退勤日・理由は必須です', 'warning');
            return;
        }

        if (!this.validateDateFields()) {
            return;
        }

        if (!clockInTime || !clockOutTime) {
            this.showAlert('出勤時刻と退勤時刻は両方入力してください', 'warning');
            return;
        }

        if (!this.validateTimeRange()) {
            return;
        }

        if (!breakTimeValue) {
            this.showAlert('休憩時間を入力してください', 'warning');
            this.breakTimeInput?.focus();
            return;
        }

        const breakPattern = /^\d{1,2}:[0-5]\d$/;
        if (!breakPattern.test(breakTimeValue)) {
            this.showAlert('休憩時間はHH:MM形式で入力してください', 'danger');
            this.breakTimeInput?.classList.add('is-invalid');
            this.breakTimeInput?.setAttribute('aria-invalid', 'true');
            this.breakTimeInput?.focus();
            return;
        }

        const breakMinutes = TimeUtils.timeStringToMinutes(breakTimeValue);
        if (this.breakTimeInput) {
            this.breakTimeInput.classList.remove('is-invalid');
            this.breakTimeInput.removeAttribute('aria-invalid');
        }
        const totalMinutes = this.calculateTotalMinutes(clockInDate, clockInTime, clockOutDate, clockOutTime);
        if (totalMinutes === null) {
            this.showAlert('有効な勤務時間を入力してください', 'danger');
            return;
        }

        if (breakMinutes > totalMinutes) {
            this.showAlert('休憩時間が勤務時間を超えています', 'danger');
            this.breakTimeInput?.focus();
            return;
        }

        const workingMinutes = Math.max(totalMinutes - breakMinutes, 0);

        // 実働時間に応じた最小休憩時間の検証
        // 実働6時間以上8時間未満：45分以上の休憩が必要
        // 実働8時間以上：60分以上の休憩が必要
        if (workingMinutes >= 360 && workingMinutes < 480 && breakMinutes < 45) {
            this.showAlert('実働6時間以上8時間未満の場合、休憩時間は45分以上必要です', 'danger');
            this.breakTimeInput?.focus();
            return;
        } else if (workingMinutes >= 480 && breakMinutes < 60) {
            this.showAlert('実働8時間以上の場合、休憩時間は60分以上必要です', 'danger');
            this.breakTimeInput?.focus();
            return;
        }

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
        const reasonDisplay = (reason || '').trim() || '記載なし';
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
        if (!this.clockInDateInput) {
            return true;
        }

        const dateStr = this.clockInDateInput.value;
        if (!dateStr) {
            return true;
        }

        const selectedDate = new Date(`${dateStr}T00:00:00`);
        if (Number.isNaN(selectedDate.getTime())) {
            this.showAlert('有効な出勤日を入力してください', 'danger');
            this.clockInDateInput.focus();
            return false;
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

        const start = new Date(`${clockInDate}T${clockInTime}:00`);
        const end = new Date(`${clockOutDate}T${clockOutTime}:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            this.showAlert('有効な出勤・退勤日時を入力してください', 'danger');
            return false;
        }

        if (end <= start) {
            this.showAlert('退勤日時は出勤日時より後に設定してください', 'danger');
            this.clockOutTimeInput.focus();
            return false;
        }

        const workHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (workHours > 36) {
            this.showAlert('勤務時間が長すぎます（36時間以内で入力してください）', 'danger');
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
