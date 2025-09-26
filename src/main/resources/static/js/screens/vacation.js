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
        this.listenersBound = false;
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadRemainingVacationDays();
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

    /**
     * 残有給日数読み込み
     */
    async loadRemainingVacationDays() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/vacation/remaining/${window.currentEmployeeId}`),
                '残有給日数の取得に失敗しました'
            );

            if (data.success) {
                this.remainingVacationDays.textContent = `${data.remainingDays}日`;
            } else {
                // APIが失敗した場合はデフォルト値を表示
                this.remainingVacationDays.textContent = '10日';
            }
        } catch (error) {
            console.error('残有給日数読み込みエラー:', error);
            // エラーの場合はデフォルト値を表示
            this.remainingVacationDays.textContent = '10日';
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

        // 事前確認
        const rangeText = startDate === endDate ? startDate : `${startDate} 〜 ${endDate}`;
        const confirmed = window.confirm(`有給申請（${rangeText}）を送信します。よろしいですか？`);
        if (!confirmed) return;

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
            
            // 残有給日数を再読み込み
            await this.loadRemainingVacationDays();
            

            // 履歴カレンダーを即時反映（存在する場合）
            try {
                if (window.historyScreen && typeof window.historyScreen.loadCalendarData === 'function') {
                    await window.historyScreen.loadCalendarData();
                    if (typeof window.historyScreen.generateCalendar === 'function') {
                        window.historyScreen.generateCalendar();
                    }
                }
                // 旧カレンダー画面にも反映（存在する場合）
                if (window.calendarScreen && typeof window.calendarScreen.loadCalendarData === 'function') {
                    await window.calendarScreen.loadCalendarData();
                    if (typeof window.calendarScreen.generateCalendar === 'function') {
                        window.calendarScreen.generateCalendar();
                    }
                }
            } catch (_) { /* no-op */ }
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

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 過去の日付は選択不可
        if (start < today) {
            this.showAlert('開始日は今日以降の日付を選択してください', 'warning');
            this.vacationStartDate.focus();
            return false;
        }

        // 終了日は開始日以降である必要がある
        if (end < start) {
            this.showAlert('終了日は開始日以降の日付を選択してください', 'warning');
            this.vacationEndDate.focus();
            return false;
        }

        // 申請日数が残有給日数を超えていないかチェック
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const remainingDays = parseInt(this.remainingVacationDays.textContent) || 0;
        
        if (daysDiff > remainingDays) {
            this.showAlert(`申請日数（${daysDiff}日）が残有給日数（${remainingDays}日）を超えています`, 'warning');
            return false;
        }

        return true;
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
}

// グローバルインスタンスを作成
window.vacationScreen = new VacationScreen();
