/**
 * 打刻修正申請画面モジュール
 */
class AdjustmentScreen {
    constructor() {
        this.adjustmentForm = null;
        this.adjustmentDate = null;
        this.adjustmentClockIn = null;
        this.adjustmentClockOut = null;
        this.adjustmentReason = null;
        this.listenersBound = false;
    }

    prefillForm({ date, clockIn, clockOut, reason }) {
        if (!this.adjustmentForm) {
            this.init();
        }

        this.clearPrefillState();

        if (date && this.adjustmentDate) {
            const parsed = new Date(date);
            if (!Number.isNaN(parsed.getTime())) {
                const yyyy = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                this.adjustmentDate.value = `${yyyy}-${mm}-${dd}`;
            } else {
                this.adjustmentDate.value = date;
            }
        }

        if (clockIn && this.adjustmentClockIn) {
            const time = new Date(clockIn);
            if (!Number.isNaN(time.getTime())) {
                const hh = String(time.getHours()).padStart(2, '0');
                const mm = String(time.getMinutes()).padStart(2, '0');
                this.adjustmentClockIn.value = `${hh}:${mm}`;
            } else {
                this.adjustmentClockIn.value = clockIn;
            }
        }

        if (clockOut && this.adjustmentClockOut) {
            const time = new Date(clockOut);
            if (!Number.isNaN(time.getTime())) {
                const hh = String(time.getHours()).padStart(2, '0');
                const mm = String(time.getMinutes()).padStart(2, '0');
                this.adjustmentClockOut.value = `${hh}:${mm}`;
            } else {
                this.adjustmentClockOut.value = clockOut;
            }
        }

        if (this.adjustmentReason) {
            this.adjustmentReason.value = reason || '';
        }

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
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.setDefaultDate();
        this.clearPrefillState();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.adjustmentForm = document.getElementById('adjustmentForm');
        this.adjustmentDate = document.getElementById('adjustmentDate');
        this.adjustmentClockIn = document.getElementById('adjustmentClockIn');
        this.adjustmentClockOut = document.getElementById('adjustmentClockOut');
        this.adjustmentReason = document.getElementById('adjustmentReason');
        this.formTitle = document.getElementById('adjustmentFormTitle');
        this.cancelPrefillButton = document.getElementById('adjustmentFormCancel');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.listenersBound) return;
        if (this.adjustmentForm) {
            this.adjustmentForm.addEventListener('submit', (e) => this.handleAdjustmentSubmit(e));
        }

        // 日付変更時のバリデーション
        if (this.adjustmentDate) {
            this.adjustmentDate.addEventListener('change', () => this.validateAdjustmentDate());
        }

        // 時刻変更時のバリデーション
        if (this.adjustmentClockIn) {
            this.adjustmentClockIn.addEventListener('change', () => this.validateTimeRange());
        }

        if (this.adjustmentClockOut) {
            this.adjustmentClockOut.addEventListener('change', () => this.validateTimeRange());
        }
        this.listenersBound = true;
    }

    /**
     * デフォルト日付設定（今日の日付）
     */
    setDefaultDate() {
        if (this.adjustmentDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            this.adjustmentDate.value = `${year}-${month}-${day}`;
        }
    }

    clearPrefillState() {
        if (this.formTitle) {
            this.formTitle.textContent = '打刻修正申請';
        }
        if (this.cancelPrefillButton) {
            this.cancelPrefillButton.style.display = 'none';
            this.cancelPrefillButton.onclick = null;
        }
    }

    /**
     * 打刻修正申請送信
     * @param {Event} e - イベント
     */
    async handleAdjustmentSubmit(e) {
        e.preventDefault();

        const date = this.adjustmentDate.value;
        const clockIn = this.adjustmentClockIn.value;
        const clockOut = this.adjustmentClockOut.value;
        const reason = this.adjustmentReason.value;

        if (!date || !reason) {
            this.showAlert('対象日: *、理由: *は必須項目です', 'warning');
            return;
        }

        // 日付の妥当性チェック
        if (!this.validateAdjustmentDate()) {
            return;
        }

        // 出勤・退勤のどちらか一方は必須
        if (!clockIn && !clockOut) {
            this.showAlert('出勤時刻または退勤時刻のどちらか一方は必須です', 'warning');
            return;
        }
        
        // 両方入力されている場合のみ時間範囲チェック
        if (clockIn && clockOut && !this.validateTimeRange()) {
            return;
        }

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        // 事前確認
        const confirmDate = date || '(未入力)';
        const ci = clockIn || '-';
        const co = clockOut || '-';
        const confirmed = window.confirm(`打刻修正申請を送信します。\n対象日: ${confirmDate}\n出勤: ${ci}\n退勤: ${co}\nよろしいですか？`);
        if (!confirmed) return;

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/adjustment-request', {
                    employeeId: window.currentEmployeeId,
                    date: date,
                    clockInTime: clockIn || '',
                    clockOutTime: clockOut || '',
                    reason: reason
                }),
                '打刻修正申請に失敗しました'
            );

            this.showAlert(data.message, 'success');
            this.adjustmentForm.reset();
            this.setDefaultDate();
            this.clearPrefillState();

            // 履歴カレンダーを即時反映（存在する場合）
            await this.refreshAllScreens();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 修正日付のバリデーション
     * @returns {boolean} - バリデーション結果
     */
    validateAdjustmentDate() {
        const date = this.adjustmentDate.value;
        if (!date) return true;

        // 入力は YYYY-MM-DD（ブラウザはUTCとして解釈しがち）。
        // ローカル日付として比較できるように手動で生成する。
        const [y, m, d] = date.split('-').map(v => parseInt(v, 10));
        const selectedDate = new Date(y, (m || 1) - 1, d || 1);
        if (Number.isNaN(selectedDate.getTime())) {
            this.showAlert('有効な日付を入力してください', 'warning');
            this.adjustmentDate.focus();
            return false;
        }
        selectedDate.setHours(0, 0, 0, 0);

        if (!this.isBusinessDay(selectedDate)) {
            this.showAlert('土日祝日は打刻修正を申請できません', 'warning');
            this.adjustmentDate.focus();
            return false;
        }

        return true;
    }

    /**
     * 時刻範囲のバリデーション
     * @returns {boolean} - バリデーション結果
     */
    validateTimeRange() {
        const clockIn = this.adjustmentClockIn.value;
        const clockOut = this.adjustmentClockOut.value;

        if (!clockIn || !clockOut) {
            return true; // まだ入力中
        }

        // 時刻を比較
        if (clockOut <= clockIn) {
            this.showAlert('退勤時刻は出勤時刻より後の時刻を入力してください', 'warning');
            this.adjustmentClockOut.focus();
            return false;
        }

        // 勤務時間が長すぎないかチェック（24時間以内）
        const clockInTime = new Date(`2000-01-01T${clockIn}:00`);
        const clockOutTime = new Date(`2000-01-01T${clockOut}:00`);
        const workHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

        if (workHours > 24) {
            this.showAlert('勤務時間が24時間を超えています。時刻を確認してください', 'warning');
            return false;
        }

        return true;
    }

    isBusinessDay(date) {
        if (typeof BusinessDayUtils !== 'undefined' && BusinessDayUtils) {
            return BusinessDayUtils.isBusinessDay(date);
        }
        const day = date.getDay();
        return day !== 0 && day !== 6;
    }

    /**
     * 全画面を更新（リアルタイム反映）
     */
    async refreshAllScreens() {
        try {
            console.log('打刻修正申請後の画面更新を開始します');
            
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

        // 5秒後に自動削除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// グローバルインスタンスを作成
window.adjustmentScreen = new AdjustmentScreen();
