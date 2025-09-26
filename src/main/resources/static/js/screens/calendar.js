/**
 * カレンダー画面モジュール
 */
class CalendarScreen {
    constructor() {
        this.calendarGrid = null;
        this.prevMonthBtn = null;
        this.currentMonthBtn = null;
        this.nextMonthBtn = null;
        this.currentMonthDisplay = null;
        this.monthlySubmitBtn = null;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.attendanceData = [];
        this.vacationRequests = [];
        this.adjustmentRequests = [];
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadCalendarData();
        this.generateCalendar();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.calendarGrid = document.getElementById('calendarGrid');
        this.prevMonthBtn = document.getElementById('prevMonthBtn');
        this.currentMonthBtn = document.getElementById('currentMonthBtn');
        this.nextMonthBtn = document.getElementById('nextMonthBtn');
        this.currentMonthDisplay = document.getElementById('currentMonthDisplay');
        this.monthlySubmitBtn = document.getElementById('monthlySubmitBtn');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.prevMonthBtn) {
            this.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        }

        if (this.currentMonthBtn) {
            this.currentMonthBtn.addEventListener('click', () => this.goToCurrentMonth());
        }

        if (this.nextMonthBtn) {
            this.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        }

        if (this.monthlySubmitBtn) {
            this.monthlySubmitBtn.addEventListener('click', () => this.handleMonthlySubmit());
        }
        
        // 却下コメント表示のイベントリスナーを設定
        this.setupRejectionCommentListeners();
    }

    /**
     * カレンダーデータ読み込み
     */
    async loadCalendarData() {
        try {
            // 勤怠データ読み込み
            await this.loadAttendanceData();
            // 有給申請データ読み込み
            await this.loadVacationRequests();
            // 打刻修正申請データ読み込み
            await this.loadAdjustmentRequests();
        } catch (error) {
            console.error('カレンダーデータ読み込みエラー:', error);
        }
    }

    /**
     * 勤怠データ読み込み
     */
    async loadAttendanceData() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/attendance/history?employeeId=${window.currentEmployeeId}&year=${this.currentYear}&month=${this.currentMonth + 1}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.attendanceData = data.data || [];
            }
        } catch (error) {
            console.error('勤怠データ読み込みエラー:', error);
            this.attendanceData = [];
        }
    }

    /**
     * 有給申請データ読み込み
     */
    async loadVacationRequests() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/vacation/requests?employeeId=${window.currentEmployeeId}&year=${this.currentYear}&month=${this.currentMonth + 1}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.vacationRequests = data.data || [];
            }
        } catch (error) {
            console.error('有給申請データ読み込みエラー:', error);
            this.vacationRequests = [];
        }
    }

    /**
     * 打刻修正申請データ読み込み
     */
    async loadAdjustmentRequests() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/attendance/adjustments?employeeId=${window.currentEmployeeId}&year=${this.currentYear}&month=${this.currentMonth + 1}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.adjustmentRequests = data.data || [];
            }
        } catch (error) {
            console.error('打刻修正申請データ読み込みエラー:', error);
            this.adjustmentRequests = [];
        }
    }

    /**
     * カレンダー生成
     */
    generateCalendar() {
        if (!this.calendarGrid) return;

        // 月表示更新
        if (this.currentMonthDisplay) {
            this.currentMonthDisplay.textContent = `${this.currentYear}/${String(this.currentMonth + 1).padStart(2, '0')}`;
        }

        // 曜日ヘッダー
        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        const headerHtml = weekdays.map(day => 
            `<div class="calendar-header">${day}</div>`
        ).join('');

        // 月の最初の日と最後の日
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

        // 月曜始まりのカレンダー計算
        const startDate = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - mondayOffset);

        let calendarHtml = headerHtml;

        // 6週間分のカレンダーを生成
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);

                const isCurrentMonth = currentDate.getMonth() === this.currentMonth;
                const isToday = this.isToday(currentDate);
                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                const isHoliday = this.isHoliday(currentDate);

                const dayNumber = currentDate.getDate();
                const dateString = this.formatDateString(currentDate);

                // 勤怠データの取得
                const attendance = this.getAttendanceForDate(dateString);
                const vacationRequest = this.getVacationRequestForDate(dateString);
                const adjustmentRequest = this.getAdjustmentRequestForDate(dateString);

                // 日付のクラス設定
                let dayClasses = ['calendar-day'];
                if (!isCurrentMonth) dayClasses.push('other-month');
                if (isToday) dayClasses.push('today');
                if (isWeekend || isHoliday) dayClasses.push('weekend');
                if (attendance) dayClasses.push('has-attendance');
                if (attendance && attendance.clockOutTime) dayClasses.push('clocked-out');
                if (attendance && attendance.clockInTime && !attendance.clockOutTime) dayClasses.push('clocked-in');

                // バッジ表示
                let badges = '';
                if (vacationRequest) {
                    const statusClass = vacationRequest.status === 'APPROVED' ? 'bg-success' : 'bg-warning';
                    badges += `<span class="badge ${statusClass} badge-sm">有給${vacationRequest.status === 'APPROVED' ? '承認済' : '申請中'}</span>`;
                }
                if (adjustmentRequest) {
                    let statusClass, statusText;
                    if (adjustmentRequest.status === 'APPROVED') {
                        statusClass = 'bg-success';
                        statusText = '修正承認済';
                    } else if (adjustmentRequest.status === 'REJECTED') {
                        statusClass = 'bg-danger';
                        statusText = '修正却下';
                    } else {
                        statusClass = 'bg-warning';
                        statusText = '修正申請中';
                    }
                    badges += `<span class="badge ${statusClass} badge-sm adjustment-badge" data-adjustment-id="${adjustmentRequest.adjustmentRequestId}" data-rejection-comment="${adjustmentRequest.rejectionComment || ''}">${statusText}</span>`;
                }

                calendarHtml += `
                    <div class="${dayClasses.join(' ')}" data-date="${dateString}">
                        <div class="day-number">${dayNumber}</div>
                        <div class="day-badges">${badges}</div>
                        ${attendance ? this.renderAttendanceInfo(attendance) : ''}
                    </div>
                `;
            }
        }

        this.calendarGrid.innerHTML = calendarHtml;
        
        // 却下コメント表示のイベントリスナーを追加
        this.setupRejectionCommentListeners();
    }

    /**
     * 今日かどうか判定
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    /**
     * 祝日かどうか判定
     */
    isHoliday(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // 日本の祝日判定（簡易版）
        const holidays = this.getHolidays(year);
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        return holidays.includes(dateString);
    }

    /**
     * 指定年の祝日一覧を取得
     */
    getHolidays(year) {
        const holidays = [];
        
        // 固定祝日
        holidays.push(`${year}-01-01`); // 元日
        holidays.push(`${year}-02-11`); // 建国記念の日
        holidays.push(`${year}-04-29`); // 昭和の日
        holidays.push(`${year}-05-03`); // 憲法記念日
        holidays.push(`${year}-05-04`); // みどりの日
        holidays.push(`${year}-05-05`); // こどもの日
        holidays.push(`${year}-08-11`); // 山の日
        holidays.push(`${year}-11-03`); // 文化の日
        holidays.push(`${year}-11-23`); // 勤労感謝の日
        holidays.push(`${year}-12-23`); // 天皇誕生日
        
        // 春分の日・秋分の日（簡易計算）
        const springEquinox = this.calculateSpringEquinox(year);
        const autumnEquinox = this.calculateAutumnEquinox(year);
        holidays.push(springEquinox);
        holidays.push(autumnEquinox);
        
        // 海の日（第3月曜日）
        const marineDay = this.calculateMarineDay(year);
        holidays.push(marineDay);
        
        // 敬老の日（第3月曜日）
        const respectDay = this.calculateRespectDay(year);
        holidays.push(respectDay);
        
        // 体育の日（第2月曜日）
        const sportsDay = this.calculateSportsDay(year);
        holidays.push(sportsDay);
        
        return holidays;
    }

    /**
     * 春分の日を計算
     */
    calculateSpringEquinox(year) {
        // 簡易計算（実際の計算はより複雑）
        const day = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
        return `${year}-03-${String(day).padStart(2, '0')}`;
    }

    /**
     * 秋分の日を計算
     */
    calculateAutumnEquinox(year) {
        // 簡易計算（実際の計算はより複雑）
        const day = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
        return `${year}-09-${String(day).padStart(2, '0')}`;
    }

    /**
     * 海の日を計算（第3月曜日）
     */
    calculateMarineDay(year) {
        const firstMonday = this.getFirstMonday(year, 7);
        const marineDay = new Date(firstMonday);
        marineDay.setDate(marineDay.getDate() + 14); // 第3月曜日
        return this.formatDateString(marineDay);
    }

    /**
     * 敬老の日を計算（第3月曜日）
     */
    calculateRespectDay(year) {
        const firstMonday = this.getFirstMonday(year, 9);
        const respectDay = new Date(firstMonday);
        respectDay.setDate(respectDay.getDate() + 14); // 第3月曜日
        return this.formatDateString(respectDay);
    }

    /**
     * 体育の日を計算（第2月曜日）
     */
    calculateSportsDay(year) {
        const firstMonday = this.getFirstMonday(year, 10);
        const sportsDay = new Date(firstMonday);
        sportsDay.setDate(sportsDay.getDate() + 7); // 第2月曜日
        return this.formatDateString(sportsDay);
    }

    /**
     * 指定月の第1月曜日を取得
     */
    getFirstMonday(year, month) {
        const firstDay = new Date(year, month - 1, 1);
        const dayOfWeek = firstDay.getDay();
        const mondayOffset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        const firstMonday = new Date(firstDay);
        firstMonday.setDate(firstMonday.getDate() + mondayOffset);
        return firstMonday;
    }

    /**
     * 日付文字列フォーマット
     */
    formatDateString(date) {
        return date.getFullYear() + '/' + 
               String(date.getMonth() + 1).padStart(2, '0') + '/' + 
               String(date.getDate()).padStart(2, '0');
    }

    /**
     * 指定日の勤怠データ取得
     */
    getAttendanceForDate(dateString) {
        return this.attendanceData.find(record => record.attendanceDate === dateString);
    }

    /**
     * 指定日の有給申請取得
     */
    getVacationRequestForDate(dateString) {
        return this.vacationRequests.find(request => request.date === dateString);
    }

    /**
     * 指定日の打刻修正申請取得
     */
    getAdjustmentRequestForDate(dateString) {
        return this.adjustmentRequests.find(request => request.date === dateString);
    }

    /**
     * 勤怠情報レンダリング
     */
    renderAttendanceInfo(attendance) {
        if (!attendance) return '';

        const clockInTime = attendance.clockInTime ? 
            new Date(attendance.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
        const clockOutTime = attendance.clockOutTime ? 
            new Date(attendance.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

        return `
            <div class="attendance-info">
                <div class="clock-times">
                    <small>出勤: ${clockInTime}</small><br>
                    <small>退勤: ${clockOutTime}</small>
                </div>
            </div>
        `;
    }

    /**
     * 月変更
     */
    async changeMonth(direction) {
        this.currentMonth += direction;
        
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }

        await this.loadCalendarData();
        this.generateCalendar();
    }

    /**
     * 今月に移動
     */
    async goToCurrentMonth() {
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth();

        await this.loadCalendarData();
        this.generateCalendar();
    }

    /**
     * 月末申請処理
     */
    async handleMonthlySubmit() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/attendance/monthly-submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({
                    employeeId: window.currentEmployeeId,
                    yearMonth: `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.showAlert(data.message || '月末申請が完了しました', 'success');
                await this.loadCalendarData();
                this.generateCalendar();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || '月末申請に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('月末申請エラー:', error);
            this.showAlert('月末申請中にエラーが発生しました', 'danger');
        }
    }

    /**
     * 却下コメント表示のイベントリスナー設定
     */
    setupRejectionCommentListeners() {
        // 既存のイベントリスナーを削除
        const existingListeners = document.querySelectorAll('.adjustment-badge');
        existingListeners.forEach(badge => {
            badge.removeEventListener('click', this.showRejectionComment);
        });

        // 新しいイベントリスナーを追加
        const adjustmentBadges = document.querySelectorAll('.adjustment-badge');
        adjustmentBadges.forEach(badge => {
            badge.addEventListener('click', (e) => this.showRejectionComment(e));
        });
    }

    /**
     * 却下コメント表示
     */
    showRejectionComment(event) {
        const badge = event.target;
        const rejectionComment = badge.getAttribute('data-rejection-comment');
        
        if (rejectionComment && rejectionComment.trim()) {
            // モーダルで却下コメントを表示
            this.showRejectionCommentModal(rejectionComment);
        }
    }

    /**
     * 却下コメントモーダル表示
     */
    showRejectionCommentModal(comment) {
        // 既存のモーダルを削除
        const existingModal = document.getElementById('rejectionCommentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // モーダルHTMLを作成
        const modalHtml = `
            <div class="modal fade" id="rejectionCommentModal" tabindex="-1" aria-labelledby="rejectionCommentModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="rejectionCommentModalLabel">打刻修正申請却下理由</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning">
                                <h6>却下理由:</h6>
                                <p>${comment}</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // モーダルをDOMに追加
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // モーダルを表示
        const modalElement = document.getElementById('rejectionCommentModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    /**
     * アラート表示
     */
    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertContainer.insertAdjacentHTML('beforeend', alertHtml);

        // 5秒後に自動削除
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }
}
