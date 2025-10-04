/**
 * 有給申請画面モジュール
 */
class VacationScreen {
    constructor() {
        this.vacationForm = null;
        this.vacationStartDate = null;
        this.vacationEndDate = null;
        this.vacationReason = null;
        this.remainingVacationDays = null;
        this.prefillCancelButton = null;
        this.formTitle = null;
        this.listenersBound = false;
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadRemainingVacationDays();
        this.clearPrefillState();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.vacationForm = document.getElementById('vacationForm');
        this.vacationStartDate = document.getElementById('vacationStartDate');
        this.vacationEndDate = document.getElementById('vacationEndDate');
        this.vacationReason = document.getElementById('vacationReason');
        this.remainingVacationDays = document.getElementById('remainingVacationDays');
        this.prefillCancelButton = document.getElementById('vacationFormCancel');
        this.formTitle = document.getElementById('vacationFormTitle');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.listenersBound) return;
        if (this.vacationForm) {
            this.vacationForm.addEventListener('submit', (e) => this.handleVacationSubmit(e));
        }

        // 日付変更時のバリデーション
        if (this.vacationStartDate) {
            this.vacationStartDate.addEventListener('change', () => this.validateDateRange());
        }

        if (this.vacationEndDate) {
            this.vacationEndDate.addEventListener('change', () => this.validateDateRange());
        }
        this.listenersBound = true;
    }

    clearPrefillState() {
        if (this.formTitle) {
            this.formTitle.textContent = '有給申請';
        }
        if (this.prefillCancelButton) {
            this.prefillCancelButton.style.display = 'none';
            this.prefillCancelButton.onclick = null;
        }
    }

    prefillForm({ startDate, endDate, reason }) {
        if (!this.vacationForm) {
            this.init();
        }

        this.clearPrefillState();

        if (startDate && this.vacationStartDate) {
            const parsed = new Date(startDate);
            if (!Number.isNaN(parsed.getTime())) {
                const yyyy = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                this.vacationStartDate.value = `${yyyy}-${mm}-${dd}`;
            } else {
                this.vacationStartDate.value = startDate;
            }
        }

        if (endDate && this.vacationEndDate) {
            const parsed = new Date(endDate);
            if (!Number.isNaN(parsed.getTime())) {
                const yyyy = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                this.vacationEndDate.value = `${yyyy}-${mm}-${dd}`;
            } else {
                this.vacationEndDate.value = endDate;
            }
        }

        if (this.vacationReason) {
            this.vacationReason.value = reason || '';
        }

        if (this.formTitle) {
            this.formTitle.textContent = '有給申請の再申請';
        }

        if (this.prefillCancelButton) {
            this.prefillCancelButton.style.display = 'inline-block';
            this.prefillCancelButton.onclick = () => {
                this.vacationForm?.reset();
                this.clearPrefillState();
            };
        }
    }

    /**
     * 残有給日数読み込み
     */
    async loadRemainingVacationDays() {
        if (!window.currentEmployeeId) {
            // 管理者など従業員IDが紐付かないセッションでは何もしない
            return;
        }

        if (!this.remainingVacationDays) {
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/vacation/remaining/${window.currentEmployeeId}`),
                '残有給日数の取得に失敗しました'
            );

            if (data.success) {
                const parsed = Number(data.remainingDays);
                const remaining = Number.isFinite(parsed) ? parsed : 0;
                this.remainingVacationDays.textContent = `${remaining}日`;
                this.remainingVacationDays.dataset.remainingDays = String(remaining);
            } else {
                this.remainingVacationDays.textContent = '--日';
                delete this.remainingVacationDays.dataset.remainingDays;
            }
        } catch (error) {
            console.error('残有給日数読み込みエラー:', error);
            this.remainingVacationDays.textContent = '--日';
            delete this.remainingVacationDays.dataset.remainingDays;
        }
    }

    /**
     * 有給申請送信
     * @param {Event} e - イベント
     */
    async handleVacationSubmit(e) {
        e.preventDefault();

        const startDate = this.vacationStartDate.value;
        const endDate = this.vacationEndDate && this.vacationEndDate.value ? this.vacationEndDate.value : '';
        const reason = this.vacationReason.value;

        if (!startDate || !endDate || !reason) {
            this.showAlert('すべての項目（開始日: *、終了日: *、理由: *）を入力してください', 'warning');
            return;
        }

        // 日付の妥当性チェック
        if (!this.validateDateRange()) {
            return;
        }

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const requestDates = this.expandDateRange(startDate, endDate);
        try {
            const conflicts = await this.getActiveAdjustmentConflicts(requestDates);
            if (conflicts.length > 0) {
                const displayDates = conflicts.map((date) => this.formatDateForDisplay(date)).filter(Boolean);
                const dateLabel = displayDates.length > 0 ? `対象日（${displayDates.join(', ')}）` : '対象日';
                this.showAlert(`${dateLabel}には打刻修正申請が存在します。有給申請するには、打刻修正申請を取消してください。`, 'warning');
                return;
            }
        } catch (error) {
            console.error('打刻修正申請状況の確認に失敗しました:', error);
            this.showAlert('打刻修正申請状況の確認に失敗しました。時間をおいて再度お試しください。', 'danger');
            return;
        }

        // 事前確認
        const formatConfirmDate = (value) => {
            if (!value) {
                return '';
            }
            if (typeof value === 'string') {
                const trimmed = value.length >= 10 ? value.slice(0, 10) : value;
                if (trimmed.includes('-')) {
                    return trimmed.replace(/-/g, '/');
                }
                return trimmed;
            }
            try {
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) {
                    return '';
                }
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}/${mm}/${dd}`;
            } catch (error) {
                console.warn('日付のフォーマットに失敗しました:', error, value);
                return '';
            }
        };

        const displayStart = formatConfirmDate(startDate);
        const displayEnd = formatConfirmDate(endDate);
        const rangeText = startDate === endDate || displayStart === displayEnd
            ? displayStart
            : `${displayStart} 〜 ${displayEnd}`;
        const confirmHandler = window.employeeDialog?.confirm;
        if (confirmHandler) {
            const { confirmed } = await confirmHandler({
                title: '有給申請の送信',
                message: `有給申請（${rangeText}）を送信します。よろしいですか？`,
                confirmLabel: '申請する',
                cancelLabel: 'キャンセル'
            });
            if (!confirmed) {
                return;
            }
        } else {
            const confirmed = window.confirm(`有給申請（${rangeText}）を送信します。よろしいですか？`);
            if (!confirmed) {
                return;
            }
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/vacation/request', {
                    employeeId: window.currentEmployeeId,
                    startDate: startDate,
                    endDate: endDate,
                    reason: reason
                }),
                '有給申請に失敗しました'
            );

            this.showAlert(data.message, 'success');
            this.vacationForm.reset();
            this.clearPrefillState();
            
            // 残有給日数を再読み込み
            await this.loadRemainingVacationDays();
            
            // 履歴カレンダーを即時反映（存在する場合）
            await this.refreshAllScreens();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 日付範囲のバリデーション
     * @returns {boolean} - バリデーション結果
     */
    validateDateRange() {
        const startDate = this.vacationStartDate.value;
        const endDate = this.vacationEndDate && this.vacationEndDate.value ? this.vacationEndDate.value : '';

        if (!startDate || !endDate) {
            return true; // まだ入力中
        }

        const start = this.parseLocalDate(startDate);
        const end = this.parseLocalDate(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            this.showAlert('有効な日付を入力してください', 'warning');
            return false;
        }

        // 終了日は開始日以降である必要がある
        if (end < start) {
            this.showAlert('終了日は開始日以降の日付を選択してください', 'warning');
            this.vacationEndDate.focus();
            return false;
        }

        const businessDayCount = this.countBusinessDaysInclusive(start, end);
        if (businessDayCount === 0) {
            this.showAlert('申請期間に平日が含まれていません', 'warning');
            return false;
        }

        // 申請日数が残有給日数を超えていないかチェック
        const remainingDays = this.getRemainingDays();
        if (businessDayCount > remainingDays) {
            this.showAlert(`申請日数（${businessDayCount}日）が残有給日数（${remainingDays}日）を超えています`, 'warning');
            return false;
        }

        return true;
    }

    parseLocalDate(value) {
        if (!value) return new Date(NaN);
        const [yearStr, monthStr, dayStr] = value.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
            return new Date(NaN);
        }
        return new Date(year, month - 1, day);
    }

    isBusinessDay(date) {
        if (typeof BusinessDayUtils !== 'undefined' && BusinessDayUtils) {
            return BusinessDayUtils.isBusinessDay(date);
        }
        const day = date.getDay();
        return day !== 0 && day !== 6;
    }

    countBusinessDaysInclusive(start, end) {
        let count = 0;
        const cursor = new Date(start);
        while (cursor <= end) {
            if (this.isBusinessDay(cursor)) {
                count++;
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return count;
    }

    getRemainingDays() {
        if (!this.remainingVacationDays) return 0;
        const datasetValue = this.remainingVacationDays.dataset?.remainingDays;
        if (datasetValue !== undefined) {
            const parsed = parseInt(datasetValue, 10);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        const rawText = this.remainingVacationDays.textContent || '';
        const match = rawText.match(/-?\d+/);
        if (match) {
            const parsed = parseInt(match[0], 10);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        return 0;
    }


    /**
     * 全画面を更新（リアルタイム反映）
     */
    async refreshAllScreens() {
        try {
            console.log('有給申請後の画面更新を開始します');
            
            // 履歴カレンダーを即時反映（存在する場合）
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
            
            // 旧カレンダー画面にも反映（存在する場合）
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
            
            // ダッシュボード画面の更新
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
            
            console.log('有給申請後の画面更新が完了しました');
        } catch (error) {
            console.warn('有給申請後の画面更新に失敗しました:', error);
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

        // 5秒後に自動削除
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

    async getActiveAdjustmentConflicts(dateStrings) {
        if (!Array.isArray(dateStrings) || dateStrings.length === 0) {
            return [];
        }
        if (!window.currentEmployeeId) {
            return [];
        }

        const response = await fetchWithAuth.handleApiCall(
            () => fetchWithAuth.get(`/api/attendance/adjustment/${window.currentEmployeeId}`),
            '打刻修正申請の取得に失敗しました'
        );

        let list = [];
        if (response && response.success && Array.isArray(response.data)) {
            list = response.data;
        } else if (Array.isArray(response)) {
            list = response;
        } else if (response && Array.isArray(response.adjustmentRequests)) {
            list = response.adjustmentRequests;
        }

        const dateSet = new Set(dateStrings);
        const conflicts = new Set();
        list.forEach((req) => {
            const status = (req?.status || '').toString().toUpperCase();
            if (!['PENDING', 'APPROVED'].includes(status)) {
                return;
            }

            this.collectAdjustmentDates(req).forEach((date) => {
                if (dateSet.has(date)) {
                    conflicts.add(date);
                }
            });
        });

        return Array.from(conflicts).sort();
    }

    collectAdjustmentDates(request) {
        const dates = new Set();
        const add = (value) => {
            const normalized = this.normalizeDateString(value);
            if (normalized) {
                dates.add(normalized);
            }
        };

        add(request?.targetDate);
        add(request?.date);
        add(request?.attendanceDate);
        add(request?.clockInDate);
        add(request?.clockOutDate);
        add(request?.startDate);
        add(request?.endDate);
        add(request?.originalClockIn);
        add(request?.originalClockOut);
        add(request?.newClockIn);
        add(request?.newClockOut);

        if (request?.targetDateStart && request?.targetDateEnd) {
            this.expandDateRange(request.targetDateStart, request.targetDateEnd)
                .forEach((date) => dates.add(date));
        }

        return Array.from(dates);
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
window.vacationScreen = new VacationScreen();
