/**
 * 勤怠履歴画面モジュール
 */
class HistoryScreen {
    constructor() {
        this.historyMonthSelect = null;
        this.monthlySubmitHistoryBtn = null;
        this.historyTableBody = null;
        this.calendarGrid = null;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.attendanceData = [];
        this.vacationRequests = [];
        this.adjustmentRequests = [];
        this.vacationRequestRawMap = new Map();
        this.adjustmentCancelButton = null;
        this.vacationCancelButton = null;
        this.adjustmentResubmitButton = null;
        this.vacationResubmitButton = null;
        this.currentAdjustmentDetail = null;
        this.currentVacationDetail = null;
        this.eventsBound = false;
    }

    /**
     * 初期化
     */
    async init() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupModalActions();
        this.generateMonthOptions();
        await this.loadCalendarData();
        this.generateCalendar();
        // 初期の月末申請ボタン状態を反映（関数が存在する場合のみ）
        const selectedMonth = this.historyMonthSelect?.value;
        if (selectedMonth && typeof this.updateMonthlySubmitButton === 'function') {
            await this.updateMonthlySubmitButton(selectedMonth);
        } else if (typeof this.hideMonthlySubmitButton === 'function') {
            // 月が選択されていない場合はボタンを非表示
            this.hideMonthlySubmitButton();
        }
        this.initialized = true;
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.historyMonthSelect = document.getElementById('historyMonthSelect');
        this.monthlySubmitHistoryBtn = document.getElementById('monthlySubmitHistoryBtn');
        this.historyTableBody = document.getElementById('historyTableBody');
        this.calendarGrid = document.getElementById('calendarGrid');
        this.adjustmentCancelButton = document.getElementById('adjustmentCancelButton');
        this.vacationCancelButton = document.getElementById('vacationCancelButton');
        this.adjustmentResubmitButton = document.getElementById('adjustmentResubmitButton');
        this.vacationResubmitButton = document.getElementById('vacationResubmitButton');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.eventsBound) return;
        if (this.monthlySubmitHistoryBtn) {
            this.monthlySubmitHistoryBtn.addEventListener('click', () => {
                const action = this.monthlySubmitHistoryBtn.dataset.action || 'submit';
                if (action === 'cancel') {
                    this.handleMonthlyCancel();
                } else {
                    this.handleMonthlySubmit();
                }
            });
        }

        // ドロップダウンの変更イベント
        if (this.historyMonthSelect) {
            this.historyMonthSelect.addEventListener('change', () => this.handleMonthSelectChange());
        }
        this.eventsBound = true;
    }

    /**
     * 詳細モーダルのイベント設定
     */
    setupModalActions() {
        if (this.adjustmentCancelButton && !this.adjustmentCancelButton.dataset.bound) {
            this.adjustmentCancelButton.addEventListener('click', () => this.handleAdjustmentCancel());
            this.adjustmentCancelButton.dataset.bound = 'true';
        }

        if (this.vacationCancelButton && !this.vacationCancelButton.dataset.bound) {
            this.vacationCancelButton.addEventListener('click', () => this.handleVacationCancel());
            this.vacationCancelButton.dataset.bound = 'true';
        }

        if (this.adjustmentResubmitButton && !this.adjustmentResubmitButton.dataset.bound) {
            this.adjustmentResubmitButton.addEventListener('click', () => this.handleAdjustmentResubmit());
            this.adjustmentResubmitButton.dataset.bound = 'true';
        }

        if (this.vacationResubmitButton && !this.vacationResubmitButton.dataset.bound) {
            this.vacationResubmitButton.addEventListener('click', () => this.handleVacationResubmit());
            this.vacationResubmitButton.dataset.bound = 'true';
        }
    }

    /**
     * カレンダーデータ読み込み
     */
    async loadCalendarData() {
        if (!window.currentEmployeeId) {
            console.warn('従業員IDが取得できません');
            return;
        }

        const selectedMonth = this.historyMonthSelect?.value;
        let url = `/api/attendance/history/${window.currentEmployeeId}`;
        
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            url += `?year=${year}&month=${parseInt(month, 10)}`;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '勤怠履歴の取得に失敗しました'
            );

            if (data && data.success) {
                this.attendanceData = data.data || [];
                console.log('勤怠履歴データ取得成功:', this.attendanceData.length, '件');
            } else {
                // APIが失敗した場合はモックデータを使用せず、実データのみ表示
                this.attendanceData = [];
                console.log('勤怠履歴データ取得失敗、空配列で継続');
            }

            // 有給申請データも読み込み（履歴カレンダー用）
            await this.loadVacationRequests();

            // 打刻修正申請データも読み込み（履歴カレンダー用）
            await this.loadAdjustmentRequests();
        } catch (error) {
            console.error('勤怠履歴読み込みエラー:', error);
            // エラーの場合もモックデータは使用しない
            this.attendanceData = [];
            console.log('エラーにより勤怠データは空で継続、申請データは別途読み込み');
            
            // 申請データは独立して読み込み
            try {
                await this.loadVacationRequests();
                await this.loadAdjustmentRequests();
            } catch (appError) {
                console.error('申請データ読み込みエラー:', appError);
                this.vacationRequests = [];
                this.adjustmentRequests = [];
            }
        }
    }

    /**
     * 勤怠履歴読み込み
     */
    async loadAttendanceHistory() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const selectedMonth = this.historyMonthSelect?.value;
        let url = `/api/attendance/history/${window.currentEmployeeId}`;
        
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            url += `?year=${year}&month=${parseInt(month, 10)}`;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '勤怠履歴の取得に失敗しました'
            );

            if (data.success) {
                this.displayAttendanceHistory(data.data);
            } else {
                // APIが失敗した場合もモックデータは表示しない
                this.displayAttendanceHistory([]);
            }
        } catch (error) {
            console.error('勤怠履歴読み込みエラー:', error);
            // エラーの場合もモックデータは表示しない
            this.displayAttendanceHistory([]);
        }
    }

    /**
     * 新規社員かどうかを判定する関数
     * @returns {boolean} - 新規社員の場合true
     */
    isNewEmployee() {
        // 現在のユーザーがemp1またはemp2の場合は既存社員（テスト用）
        if (window.currentUser === 'emp1' || window.currentUser === 'emp2') {
            return false;
        }
        
        // emp3以降は新規社員として扱う（管理者画面で作成された社員）
        if (window.currentUser && window.currentUser.startsWith('emp')) {
            const empNumber = parseInt(window.currentUser.replace('emp', ''));
            return empNumber >= 3;
        }
        
        // その他の場合は新規社員として扱う
        return true;
    }

    /**
     * モック勤怠データ生成
     * @param {string} month - 対象月（YYYY-MM形式）
     * @returns {Array} - モックデータ
     */
    generateMockAttendanceData(month = null) {
        // 新規作成された社員の場合は空のデータを返す（勤怠データは存在しない）
        if (this.isNewEmployee()) {
            return [];
        }
        
        const data = [];
        const today = new Date();
        let targetDate = today;

        if (month) {
            const [year, monthNum] = month.split('-');
            targetDate = new Date(year, monthNum - 1, 1);
        }

        // 指定月の日数を取得
        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
            
            // 土日はスキップ
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const clockIn = new Date(date);
            clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);

            const clockOut = new Date(date);
            clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0);

            // 遅刻・早退・残業・深夜の計算
            const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
            const clockOutMinutes = clockOut.getHours() * 60 + clockOut.getMinutes();
            
            const lateMinutes = Math.max(0, clockInMinutes - (9 * 60)); // 9:00以降は遅刻
            const earlyLeaveMinutes = Math.max(0, (18 * 60) - clockOutMinutes); // 18:00より早い退勤
            const overtimeMinutes = Math.max(0, clockOutMinutes - (18 * 60)); // 18:00以降の残業
            const nightWorkMinutes = Math.max(0, clockOutMinutes - (22 * 60)); // 22:00以降の深夜

            // 日本時間での日付文字列を生成（UTC変換を避ける）
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            data.push({
                attendanceDate: dateStr,
                clockInTime: clockIn.toISOString(),
                clockOutTime: clockOut.toISOString(),
                lateMinutes: lateMinutes,
                earlyLeaveMinutes: earlyLeaveMinutes,
                overtimeMinutes: overtimeMinutes,
                nightWorkMinutes: nightWorkMinutes
            });
        }

        return data;
    }

    /**
     * 勤怠履歴表示
     * @param {Array} data - 勤怠データ
     */
    displayAttendanceHistory(data) {
        if (!this.historyTableBody) return;

        this.historyTableBody.innerHTML = '';

        // データがない場合でも、ヘッダ列のみ表示（空のテーブル本体）
        if (data.length === 0) {
            return;
        }

        data.forEach(record => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.classList.add('attendance-row');

            const hasIn = !!record.clockInTime;
            const hasOut = !!record.clockOutTime;
            const isConfirmed = hasIn && hasOut;

            const clockInTime = hasIn ? new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
            const clockOutTime = hasOut ? new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
            const workingTime = isConfirmed ? TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime) : '';
            const lateDisplay = isConfirmed && record.lateMinutes > 0 ? formatMinutesToTime(record.lateMinutes) : '';
            const earlyLeaveDisplay = isConfirmed && record.earlyLeaveMinutes > 0 ? formatMinutesToTime(record.earlyLeaveMinutes) : '';
            const overtimeDisplay = isConfirmed && record.overtimeMinutes > 0 ? formatMinutesToTime(record.overtimeMinutes) : '';
            const nightValue = (record.nightWorkMinutes ?? record.nightShiftMinutes) || 0;
            const nightWorkDisplay = isConfirmed && nightValue > 0 ? formatMinutesToTime(nightValue) : '';
            let status = '';
            if (!hasIn) status = '出勤前';
            else if (hasIn && !hasOut) status = '出勤中';
            else if (isConfirmed) status = '退勤済み';

            // 日付をyyyy/mm/dd形式に変換
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}/${month}/${day}`;
            };

            row.innerHTML = `
                <td>${formatDate(record.attendanceDate)}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${workingTime}</td>
                <td>${lateDisplay}</td>
                <td>${earlyLeaveDisplay}</td>
                <td>${overtimeDisplay}</td>
                <td>${nightWorkDisplay}</td>
                <td>${status}</td>
            `;

            // クリックイベントを追加
            row.addEventListener('click', () => {
                this.showAttendanceDetail(record);
            });

            this.historyTableBody.appendChild(row);
        });
    }

    /**
     * ドロップダウン月選択変更時の処理
     */
    async handleMonthSelectChange() {
        const selectedMonth = this.historyMonthSelect?.value;
        
        if (!selectedMonth) return;
        
        const [year, month] = selectedMonth.split('-');
        this.currentYear = parseInt(year);
        this.currentMonth = parseInt(month) - 1; // JavaScriptの月は0ベース
        
        await this.loadCalendarData();
        this.generateCalendar();
        
    }




    /**
     * 月選択オプション生成
     */
    generateMonthOptions() {
        if (!this.historyMonthSelect) return;

        // 既存のオプションをクリア（最初のオプション以外）
        while (this.historyMonthSelect.children.length > 1) {
            this.historyMonthSelect.removeChild(this.historyMonthSelect.lastChild);
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // 過去12ヶ月 + 現在月 + 未来12ヶ月 = 合計25ヶ月分を生成
        for (let i = -12; i <= 12; i++) {
            const date = new Date(currentYear, currentMonth - 1 + i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const value = `${year}-${month}`;
            const label = `${year}/${month}`;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            
            // 現在月の場合は選択状態にする
            if (i === 0) {
                option.selected = true;
            }
            
            this.historyMonthSelect.appendChild(option);
        }
    }

    /**
     * 分数を時間:分形式に変換
     * @param {number} minutes - 分数
     * @returns {string} - 時間:分形式の文字列
     */
    // formatMinutesToTime関数はtimeUtils.jsに移動しました

    /**
     * アラート表示
     * @param {string} message - メッセージ
     * @param {string} type - アラートタイプ
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        // 既存のアラートをクリアして重複表示を防止
        while (alertContainer.firstChild) {
            alertContainer.removeChild(alertContainer.firstChild);
        }

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

    /**
     * カレンダー生成
     */
    generateCalendar() {
        if (!this.calendarGrid) return;

        // デバッグ用：データ読み込み状況を確認
        console.log('=== カレンダー生成開始 ===');
        console.log('有給申請データ:', this.vacationRequests?.length || 0, '件');
        console.log('打刻修正申請データ:', this.adjustmentRequests?.length || 0, '件');
        console.log('勤怠データ:', this.attendanceData?.length || 0, '件');

        // 既存のカレンダー内容をクリア
        this.calendarGrid.innerHTML = '';

        // 曜日ヘッダー
        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        const headerHtml = weekdays.map(day => 
            `<div class="calendar-header">${day}</div>`
        ).join('');

        // 月の最初の日と最後の日
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

        let calendarHtml = headerHtml;

        // 月曜始まりの空白を先頭に挿入（他月のセルは描画しない）
        const mondayOffset = (firstDay.getDay() + 6) % 7; // Mon=0 ... Sun=6
        for (let i = 0; i < mondayOffset; i++) {
            calendarHtml += `<div class="calendar-empty"></div>`;
        }

        // 対象月のみ描画
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const currentDate = new Date(this.currentYear, this.currentMonth, d);
            const isToday = this.isToday(currentDate);
            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
            const isHoliday = this.isHoliday(currentDate);
            const dateString = this.formatDateString(currentDate);

            const attendance = this.getAttendanceForDate(dateString);
            const vacationRequest = this.getVacationRequestForDate(dateString);
            const adjustmentRequest = this.getAdjustmentRequestForDate(dateString);
            
            // デバッグ用：打刻修正申請のデータを確認
            if (adjustmentRequest) {
                console.log(`日付 ${dateString} の打刻修正申請:`, adjustmentRequest);
            }

            let dayClasses = ['calendar-day'];
            if (isToday) dayClasses.push('today');
            if (isWeekend) dayClasses.push('weekend');
            if (isHoliday) dayClasses.push('holiday');
            if (attendance) dayClasses.push('has-attendance');
            if (attendance && attendance.clockOutTime) dayClasses.push('clocked-out');
            if (attendance && attendance.clockInTime && !attendance.clockOutTime) dayClasses.push('clocked-in');

            let badges = '';
            
            // 申請状況を表示（申請中・承認済・却下のみ）
            // デバッグ用ログ
            if (attendance && attendance.clockInTime) {
                console.log(`日付 ${dateString}: 出勤打刻あり`, attendance);
            }
            if (vacationRequest || adjustmentRequest) {
                console.log(`日付 ${dateString}: 申請あり`, { 
                    vacationRequest: vacationRequest ? `${vacationRequest.status}` : 'なし',
                    adjustmentRequest: adjustmentRequest ? `${adjustmentRequest.status}` : 'なし'
                });
            }
            
            // 有給申請状況の表示（申請がある場合のみ）
            if (vacationRequest) {
                const statusUpper = (vacationRequest.status || '').toUpperCase();
                if (statusUpper !== 'CANCELLED') {
                    let statusClass = 'bg-secondary';
                    let label = '申請';
                    switch (statusUpper) {
                        case 'APPROVED':
                            statusClass = 'bg-success';
                            label = '承認済';
                            break;
                        case 'PENDING':
                            statusClass = 'bg-warning';
                            label = '申請中';
                            break;
                        case 'REJECTED':
                            statusClass = 'bg-danger';
                            label = '却下';
                            break;
                        default:
                            statusClass = 'bg-secondary';
                            label = statusUpper || '申請';
                    }
                    const dataAttrs = `data-vacation-id="${vacationRequest.vacationId || ''}" data-status="${vacationRequest.status}" data-date="${dateString}"`;
                    badges += `<span class="badge ${statusClass} badge-sm vacation-badge clickable" ${dataAttrs} title="クリックして申請内容を確認">有給${label}</span>`;
                }
            }

            // 打刻修正申請状況の表示（申請がある場合のみ）
            if (adjustmentRequest) {
                let statusClass, label, title;

                switch (adjustmentRequest.status) {
                    case 'APPROVED':
                        statusClass = 'bg-success';
                        label = '承認済';
                        title = 'クリックして申請内容を確認';
                        break;
                    case 'REJECTED':
                        statusClass = 'bg-danger';
                        label = '却下';
                        title = 'クリックして却下理由を確認';
                        break;
                    case 'CANCELLED':
                        statusClass = 'bg-secondary';
                        label = '取消';
                        title = 'クリックして申請内容を確認';
                        break;
                    default: // PENDING
                        statusClass = 'bg-warning';
                        label = '申請中';
                        title = 'クリックして申請内容を確認';
                }

                const dataAttrs = `data-adjustment-date="${dateString}" data-status="${adjustmentRequest.status}" data-adjustment-id="${adjustmentRequest.adjustmentRequestId}" data-rejection-comment="${adjustmentRequest.rejectionComment || ''}"`;
                badges += `<span class="badge ${statusClass} badge-sm adjustment-badge clickable" ${dataAttrs} title="${title}">打刻修正${label}</span>`;
            }

            calendarHtml += `
                <div class="${dayClasses.join(' ')}" data-date="${dateString}" style="cursor: pointer;" title="クリックして詳細を表示">
                    <div class="day-number">${d}</div>
                    <div class="day-badges">${badges}</div>
                    ${attendance ? this.renderAttendanceInfo(attendance) : ''}
                    ${!attendance && (isWeekend || isHoliday) ? '<div class="day-status"><small>' + (isHoliday ? '祝日' : '休日') + '</small></div>' : ''}
                </div>
            `;
        }

        this.calendarGrid.innerHTML = calendarHtml;
        
        // カレンダーの日付クリックイベントを設定
        this.setupCalendarClickEvents();
        
        // 有給バッジのクリックイベント（申請取消）
        this.setupVacationBadgeActions();
        
        // 打刻修正バッジのクリックイベント（申請詳細表示）
        this.setupAdjustmentBadgeActions();

        // 表示中の月が「今日」と同一なら、当日セルを自動選択し、明細も当日に同期
        try {
            const today = new Date();
            if (this.currentYear === today.getFullYear() && this.currentMonth === today.getMonth()) {
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                const todayCell = this.calendarGrid.querySelector(`.calendar-day[data-date="${todayStr}"]`);
                if (todayCell) {
                    this.updateSelectedDate(todayCell);
                    this.filterAttendanceTableByDate(todayStr);
                }
            }
        } catch (e) {
            console.warn('当日セル自動選択中にエラー:', e);
        }
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
        // 基本祝日（日付文字列のSetで管理）
        const base = new Set();
        const add = (y, m, d) => base.add(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

        // 固定祝日
        add(year, 1, 1);   // 元日
        add(year, 2, 11);  // 建国記念の日
        add(year, 2, 23);  // 天皇誕生日（令和）
        add(year, 4, 29);  // 昭和の日
        add(year, 5, 3);   // 憲法記念日
        add(year, 5, 4);   // みどりの日
        add(year, 5, 5);   // こどもの日
        add(year, 8, 11);  // 山の日
        add(year, 11, 3);  // 文化の日
        add(year, 11, 23); // 勤労感謝の日

        // ハッピーマンデー（第n月曜）
        this.addNthMonday(base, year, 1, 2);  // 1月第2月曜: 成人の日
        this.addNthMonday(base, year, 7, 3);  // 7月第3月曜: 海の日
        this.addNthMonday(base, year, 9, 3);  // 9月第3月曜: 敬老の日
        this.addNthMonday(base, year, 10, 2); // 10月第2月曜: スポーツの日

        // 春分・秋分（近似式 1980-2099）
        const vernal = this.calcVernalEquinoxDay(year);
        const autumnal = this.calcAutumnalEquinoxDay(year);
        if (vernal) add(year, 3, vernal);
        if (autumnal) add(year, 9, autumnal);

        // 振替休日（Holiday on Sunday => next non-holiday weekday）
        const withSubstitute = this.applySubstituteHolidays(base, year);

        // 国民の休日（祝日に挟まれた平日）
        const withCitizens = this.applyCitizensHoliday(withSubstitute, year);

        return Array.from(withCitizens.values());
    }

    addNthMonday(set, year, month1Based, n) {
        const first = new Date(year, month1Based - 1, 1);
        const firstDay = first.getDay();
        const firstMondayDate = 1 + ((8 - firstDay) % 7);
        const date = firstMondayDate + 7 * (n - 1);
        const daysInMonth = new Date(year, month1Based, 0).getDate();
        if (date <= daysInMonth) {
            set.add(`${year}-${String(month1Based).padStart(2, '0')}-${String(date).padStart(2, '0')}`);
        }
    }

    calcVernalEquinoxDay(year) {
        // 1980-2099の近似: 20.8431 + 0.242194*(Y-1980) - floor((Y-1980)/4)
        if (year < 1900 || year > 2099) return 20; // フォールバック
        const d = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
        return d;
    }

    calcAutumnalEquinoxDay(year) {
        // 1980-2099の近似: 23.2488 + 0.242194*(Y-1980) - floor((Y-1980)/4)
        if (year < 1900 || year > 2099) return 23; // フォールバック
        const d = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
        return d;
    }

    applySubstituteHolidays(baseSet, year) {
        const result = new Map();
        // まず既存祝日をすべて投入
        for (const s of baseSet) result.set(s, s);
        // 各祝日が日曜なら翌平日を振替
        for (const s of baseSet) {
            const d = new Date(s);
            if (d.getFullYear() !== year) continue;
            if (d.getDay() === 0) { // Sunday
                let next = new Date(d);
                do {
                    next.setDate(next.getDate() + 1);
                    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
                    // 平日で、まだ祝日でなければ振替
                    if (!result.has(key) && next.getDay() >= 1 && next.getDay() <= 6) {
                        result.set(key, key);
                        break;
                    }
                } while (next.getFullYear() === year);
            }
        }
        return result;
    }

    applyCitizensHoliday(holidayMap, year) {
        // 祝日に挟まれた平日を祝日に（国民の休日）
        const result = new Map(holidayMap);
        const isHoliday = (dt) => result.has(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
        for (let m = 0; m < 12; m++) {
            const days = new Date(year, m + 1, 0).getDate();
            for (let d = 2; d <= days - 1; d++) {
                const cur = new Date(year, m, d);
                if (cur.getDay() === 0 || cur.getDay() === 6) continue; // 平日のみ
                const prev = new Date(year, m, d - 1);
                const next = new Date(year, m, d + 1);
                if (isHoliday(prev) && isHoliday(next) && !isHoliday(cur)) {
                    const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    result.set(key, key);
                }
            }
        }
        return result;
    }

    /**
     * 日付文字列フォーマット
     */
    formatDateString(date) {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0');
    }

    /**
     * 指定日の勤怠データ取得
     */
    getAttendanceForDate(dateString) {
        // 既存の実データのみを返し、モックは生成しない
        return this.attendanceData.find(record => record.attendanceDate === dateString) || null;
    }

    /**
     * 指定日のモック勤怠データ生成
     * @param {string} dateString - 日付文字列（YYYY-MM-DD形式）
     * @returns {Object|null} - モック勤怠データまたはnull
     */
    generateMockAttendanceForDate(dateString) {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = this.isHoliday(date);
        
        // 土日祝日は勤怠データなし
        if (isWeekend || isHoliday) {
            return null;
        }
        
        // 平日の場合、ランダムに勤怠データを生成（50%の確率）
        if (Math.random() < 0.5) {
            return null;
        }
        
        // 勤怠データを生成
        const clockIn = new Date(date);
        clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0); // 9:00-9:30の間でランダム

        const clockOut = new Date(date);
        clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0); // 18:00-19:00の間でランダム

        // 遅刻・早退・残業・深夜の計算
        const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
        const clockOutMinutes = clockOut.getHours() * 60 + clockOut.getMinutes();
        
        const lateMinutes = Math.max(0, clockInMinutes - (9 * 60)); // 9:00以降は遅刻
        const earlyLeaveMinutes = Math.max(0, (18 * 60) - clockOutMinutes); // 18:00より早い退勤
        const overtimeMinutes = Math.max(0, clockOutMinutes - (18 * 60)); // 18:00以降の残業
        const nightWorkMinutes = Math.max(0, clockOutMinutes - (22 * 60)); // 22:00以降の深夜

        return {
            attendanceDate: dateString,
            clockInTime: clockIn.toISOString(),
            clockOutTime: clockOut.toISOString(),
            lateMinutes: lateMinutes,
            earlyLeaveMinutes: earlyLeaveMinutes,
            overtimeMinutes: overtimeMinutes,
            nightWorkMinutes: nightWorkMinutes
        };
    }

    /**
     * 指定日の有給申請取得
     */
    getVacationRequestForDate(dateString) {
        return this.vacationRequests.find(request => request.date === dateString);
    }

    /**
     * 有給申請データ読み込み（当月分に整形）
     */
    async loadVacationRequests() {
        if (!window.currentEmployeeId) {
            this.vacationRequests = [];
            return;
        }

        try {
            // 既存のAPI: /api/vacation/{employeeId} を利用し、フロントで月別に整形
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/vacation/${window.currentEmployeeId}`),
                '有給申請の取得に失敗しました'
            );

            // response は { success: true, data: [...] } 形式を想定
            const requests = (response && response.success && Array.isArray(response.data)) ? response.data : [];

            // 申請を日付ごとに展開
            this.vacationRequestRawMap = new Map();
            const expanded = [];
            requests.forEach(req => {
                if (!req.startDate || !req.endDate) return;

                const statusUpper = (req.status || 'PENDING').toUpperCase();
                if (statusUpper === 'CANCELLED') {
                    return;
                }

                const requestId = (req.vacationId ?? req.id);
                const requestIdStr = requestId !== undefined && requestId !== null
                    ? String(requestId)
                    : '';

                if (requestIdStr) {
                    this.vacationRequestRawMap.set(requestIdStr, req);
                }

                try {
                    const start = new Date(req.startDate);
                    const end = new Date(req.endDate);

                    // 範囲を1日ずつ展開（全休想定）
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const y = d.getFullYear();
                        const m = d.getMonth(); // 0-based
                        // 表示中の年月のみ保持
                        if (y === this.currentYear && m === this.currentMonth) {
                            expanded.push({
                                date: this.formatDateString(d),
                                status: statusUpper,
                                vacationId: requestIdStr,
                                request: req
                            });
                        }
                    }
                } catch (dateError) {
                    console.warn('有給申請の日付解析エラー:', dateError, req);
                }
            });

            console.log('当月の有給申請データ:', expanded);
            this.vacationRequests = expanded;
        } catch (error) {
            console.error('有給申請データ読み込みエラー:', error);
            this.vacationRequests = [];
            // エラーを再スローしない（画面の表示を継続するため）
        }
    }

    /**
     * 有給バッジのクリックアクション（申請取消）
     */
    setupVacationBadgeActions() {
        if (!this.calendarGrid) return;
        const badges = this.calendarGrid.querySelectorAll('.vacation-badge');
        badges.forEach(badge => {
            badge.addEventListener('click', async (e) => {
                e.stopPropagation();
                const vacationId = badge.getAttribute('data-vacation-id');
                const dateString = badge.getAttribute('data-date');
                try {
                    await this.showVacationDetail(dateString, vacationId);
                } catch (error) {
                    this.showAlert(error.message || '申請詳細の表示に失敗しました', 'danger');
                }
            });
        });
    }

    /**
     * 打刻修正申請データ読み込み（当月分に整形）
     */
    async loadAdjustmentRequests() {
        if (!window.currentEmployeeId) {
            this.adjustmentRequests = [];
            return;
        }

        try {
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/adjustment/${window.currentEmployeeId}`),
                '打刻修正申請の取得に失敗しました'
            );

            console.log('打刻修正申請APIレスポンス:', response);

            // レスポンス構造の柔軟な対応
            let list = [];
            if (response && response.success && Array.isArray(response.data)) {
                list = response.data;
            } else if (Array.isArray(response)) {
                // 直接配列が返される場合
                list = response;
            } else if (response && Array.isArray(response.adjustmentRequests)) {
                // ネストされた構造の場合
                list = response.adjustmentRequests;
            }

            console.log('打刻修正申請リスト:', list);

            // 当月のみ抽出し、カレンダー用に整形（却下状態も含める）
            const filtered = [];
            list.forEach(req => {
                // 日付フィールドの候補をチェック（targetDate, date, attendanceDate）
                const dateField = req.targetDate || req.date || req.attendanceDate;
                if (!dateField) return;
                
                try {
                    const d = new Date(dateField);
                    if (d.getFullYear() === this.currentYear && d.getMonth() === this.currentMonth) {
                        const status = req.status || 'PENDING';
                        filtered.push({
                            date: this.formatDateString(d),
                            status: status,
                            adjustmentRequestId: req.adjustmentRequestId || req.id,
                            rejectionComment: req.rejectionComment || '',
                            request: req
                        });
                    }
                } catch (dateError) {
                    console.warn('打刻修正申請の日付解析エラー:', dateError, req);
                }
            });

            console.log('フィルタリング後の打刻修正申請:', filtered);
            console.log('当月の打刻修正申請データ:', filtered);
            this.adjustmentRequests = filtered;
        } catch (error) {
            console.error('打刻修正申請データ読み込みエラー:', error);
            this.adjustmentRequests = [];
            // エラーを再スローしない（画面の表示を継続するため）
        }
    }

    /**
     * 指定日の打刻修正申請取得
     */
    getAdjustmentRequestForDate(dateString) {
        return this.adjustmentRequests.find(request => request.date === dateString);
    }

    /**
     * 却下理由表示モーダル
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
     * 打刻修正バッジのクリックアクション（申請詳細表示）
     */
    setupAdjustmentBadgeActions() {
        if (!this.calendarGrid) return;
        const badges = this.calendarGrid.querySelectorAll('.adjustment-badge');
        badges.forEach(badge => {
            badge.addEventListener('click', async (e) => {
                e.stopPropagation();
                const adjustmentDate = badge.getAttribute('data-adjustment-date');
                const adjustmentId = badge.getAttribute('data-adjustment-id');

                if (!adjustmentDate) return;
                try {
                    await this.showAdjustmentDetail(adjustmentDate, adjustmentId);
                } catch (error) {
                    this.showAlert('申請詳細の取得に失敗しました', 'danger');
                }
            });
        });
    }

    /**
     * カレンダークリックイベント設定
     */
    setupCalendarClickEvents() {
        const calendarDays = this.calendarGrid.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            day.addEventListener('click', () => {
                const dateString = day.getAttribute('data-date');
                
                // 選択状態の視覚的フィードバック
                this.updateSelectedDate(day);
                
                // 勤怠詳細テーブルを選択日付でフィルタリング
                this.filterAttendanceTableByDate(dateString);
            });
        });
    }

    /**
     * 選択日付の視覚的フィードバック更新
     * @param {HTMLElement} selectedDay - 選択された日付要素
     */
    updateSelectedDate(selectedDay) {
        // 既存の選択状態をクリア
        const calendarDays = this.calendarGrid.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            day.classList.remove('selected');
        });
        
        // 選択された日付にクラスを追加
        selectedDay.classList.add('selected');
    }

    /**
     * 勤怠詳細テーブルを指定日付でフィルタリング
     * @param {string} dateString - フィルタリングする日付（YYYY-MM-DD形式）
     */
    filterAttendanceTableByDate(dateString) {
        if (!this.historyTableBody) return;

        // 選択された日付の勤怠データを取得
        const attendance = this.getAttendanceForDate(dateString);
        
        // 日付の詳細情報を取得
        const selectedDate = new Date(dateString);
        const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
        const isHoliday = this.isHoliday(selectedDate);
        
        // テーブルをクリア
        this.historyTableBody.innerHTML = '';

        if (attendance) {
            // 勤怠データがある場合
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.classList.add('attendance-row');

            // 時刻表示
            const clockInTime = attendance.clockInTime ? 
                new Date(attendance.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
            const clockOutTime = attendance.clockOutTime ? 
                new Date(attendance.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';

            // 勤務時間の計算（0:00形式に統一）
            const workingTime = (attendance.clockInTime && attendance.clockOutTime)
                ? TimeUtils.calculateWorkingTime(attendance.clockInTime, attendance.clockOutTime)
                : '';

            // 遅刻・早退・残業・深夜の表示（0:00形式に統一）
            const lateDisplay = attendance.lateMinutes > 0 && attendance.clockInTime && attendance.clockOutTime ? formatMinutesToTime(attendance.lateMinutes) : '';
            const earlyLeaveDisplay = attendance.earlyLeaveMinutes > 0 && attendance.clockInTime && attendance.clockOutTime ? formatMinutesToTime(attendance.earlyLeaveMinutes) : '';
            const overtimeDisplay = attendance.overtimeMinutes > 0 && attendance.clockInTime && attendance.clockOutTime ? formatMinutesToTime(attendance.overtimeMinutes) : '';
            const nightWorkValue = (attendance.nightWorkMinutes ?? attendance.nightShiftMinutes) || 0;
            const nightWorkDisplay = nightWorkValue > 0 && attendance.clockInTime && attendance.clockOutTime ? formatMinutesToTime(nightWorkValue) : '';

            // ステータス表示
            let status = '出勤前';
            if (attendance.clockInTime && !attendance.clockOutTime) status = '出勤中';
            if (attendance.clockInTime && attendance.clockOutTime) status = '退勤済み';

            // 日付をyyyy/mm/dd形式に変換
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}/${month}/${day}`;
            };

            row.innerHTML = `
                <td>${formatDate(attendance.attendanceDate)}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${workingTime}</td>
                <td>${lateDisplay}</td>
                <td>${earlyLeaveDisplay}</td>
                <td>${overtimeDisplay}</td>
                <td>${nightWorkDisplay}</td>
                <td>${status}</td>
            `;

            // クリックイベントを追加
            row.addEventListener('click', () => {
                this.showAttendanceDetail(attendance);
            });

            this.historyTableBody.appendChild(row);
        } else {
            // 勤怠データがない場合
            const row = document.createElement('tr');
            
            // ステータスを日付の種類に応じて設定
            let status = '';
            if (isHoliday) {
                status = '';
            } else if (isWeekend) {
                status = '';
            }

            row.innerHTML = `
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>${status}</td>
            `;
            this.historyTableBody.appendChild(row);
        }
    }

    /**
     * 勤怠詳細表示
     * @param {Object} record - 勤怠記録
     */
    showAttendanceDetail(record) {
        // モーダルの要素を取得
        const modal = document.getElementById('attendanceDetailModal');
        if (!modal) {
            console.error('勤怠詳細モーダルが見つかりません');
            return;
        }

        // 基本情報を設定
        const isConfirmed = !!(record.clockInTime && record.clockOutTime);
        // 日付をyyyy/mm/dd形式に変換
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        };
        document.getElementById('detailDate').textContent = isConfirmed ? formatDate(record.attendanceDate) : '';
        
        const clockInTime = isConfirmed && record.clockInTime ? 
            new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
        const clockOutTime = isConfirmed && record.clockOutTime ? 
            new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
        
        document.getElementById('detailClockIn').textContent = clockInTime;
        document.getElementById('detailClockOut').textContent = clockOutTime;

        // 勤務時間計算
        const workingTime = (isConfirmed && record.clockInTime && record.clockOutTime)
            ? TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime)
            : '';
        document.getElementById('detailWorkingTime').textContent = workingTime;

        // ステータス設定（未確定は空白）
        let status = (isConfirmed) ? '退勤済み' : '';
        document.getElementById('detailStatus').textContent = status;

        // 詳細情報を設定
        const lateDisplay = (isConfirmed && record.lateMinutes > 0) ? formatMinutesToTime(record.lateMinutes) : '';
        const earlyLeaveDisplay = (isConfirmed && record.earlyLeaveMinutes > 0) ? formatMinutesToTime(record.earlyLeaveMinutes) : '';
        const overtimeDisplay = (isConfirmed && record.overtimeMinutes > 0) ? formatMinutesToTime(record.overtimeMinutes) : '';
        const nightWorkDisplay = (isConfirmed && record.nightShiftMinutes > 0) ? formatMinutesToTime(record.nightShiftMinutes) : '';

        document.getElementById('detailLate').textContent = lateDisplay;
        document.getElementById('detailEarlyLeave').textContent = earlyLeaveDisplay;
        document.getElementById('detailOvertime').textContent = overtimeDisplay;
        document.getElementById('detailNightWork').textContent = nightWorkDisplay;

        // 備考設定
        const notes = record.notes || '特記事項はありません';
        document.getElementById('detailNotes').textContent = notes;

        // モーダルを表示
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    /**
     * 打刻修正申請詳細表示
     * @param {string} dateString - 対象日付
     */
    async showAdjustmentDetail(dateString, adjustmentRequestId = null) {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            // 打刻修正申請の詳細データを取得
            console.log('打刻修正申請データを取得中...', window.currentEmployeeId);
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/adjustment/${window.currentEmployeeId}`),
                '打刻修正申請の取得に失敗しました'
            );

            console.log('APIレスポンス:', response);

            if (!response) {
                console.error('APIレスポンスがnullまたはundefined:', response);
                this.showAlert('APIからの応答がありません', 'warning');
                return;
            }

            if (!response.success) {
                console.error('APIが失敗を返しました:', response);
                this.showAlert(response.message || '申請データの取得に失敗しました', 'warning');
                return;
            }

            if (!Array.isArray(response.data)) {
                console.error('APIレスポンスのdataが配列ではありません:', response);
                this.showAlert('申請データの形式が正しくありません', 'warning');
                return;
            }

            // 対象申請を検索（ID優先、無ければ日付）
            const targetId = adjustmentRequestId ? String(adjustmentRequestId) : null;
            let adjustmentRequest = null;

            if (targetId) {
                adjustmentRequest = response.data.find(req => {
                    const reqId = req.adjustmentRequestId ?? req.id;
                    return reqId !== undefined && reqId !== null && String(reqId) === targetId;
                });
            }

            if (!adjustmentRequest && dateString) {
                adjustmentRequest = response.data.find(req => {
                    if (!req.targetDate) return false;
                    const reqDate = new Date(req.targetDate);
                    const targetDate = new Date(dateString);
                    return reqDate.toDateString() === targetDate.toDateString();
                });
            }

            console.log('見つかった申請:', adjustmentRequest);

            if (!adjustmentRequest) {
                this.showAlert('指定日の申請が見つかりません', 'warning');
                return;
            }

            // モーダルの要素を取得
            const modal = document.getElementById('adjustmentDetailModal');
            if (!modal) {
                console.error('打刻修正申請詳細モーダルが見つかりません');
                return;
            }

            // 申請情報を設定
            // 日付をyyyy/mm/dd形式に変換
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}/${month}/${day}`;
            };
            document.getElementById('adjustmentDetailDate').textContent = 
                formatDate(adjustmentRequest.targetDate);

            // 申請状態を設定
            let statusText = '';
            switch (adjustmentRequest.status) {
                case 'PENDING':
                    statusText = '申請中';
                    break;
                case 'APPROVED':
                    statusText = '承認済';
                    break;
                case 'REJECTED':
                    statusText = '却下';
                    break;
                case 'CANCELLED':
                    statusText = '取消';
                    break;
                default:
                    statusText = adjustmentRequest.status || '-';
            }
            const statusElement = document.getElementById('adjustmentDetailStatus');
            statusElement.textContent = statusText;
            statusElement.className = ''; // 色クラスを削除して黒文字にする

            // 修正内容を設定
            const clockInTime = adjustmentRequest.newClockIn ? 
                new Date(adjustmentRequest.newClockIn).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
            const clockOutTime = adjustmentRequest.newClockOut ? 
                new Date(adjustmentRequest.newClockOut).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

            document.getElementById('adjustmentDetailClockIn').textContent = clockInTime;
            document.getElementById('adjustmentDetailClockOut').textContent = clockOutTime;

            // 勤務時間を計算
            const workingTime = (adjustmentRequest.newClockIn && adjustmentRequest.newClockOut) ?
                TimeUtils.calculateWorkingTime(adjustmentRequest.newClockIn, adjustmentRequest.newClockOut) : '-';
            document.getElementById('adjustmentDetailWorkingTime').textContent = workingTime;

            // 修正理由を設定
            document.getElementById('adjustmentDetailReason').textContent = 
                adjustmentRequest.reason || '理由は記載されていません';

            const rejectionRow = document.getElementById('adjustmentRejectionRow');
            const rejectionField = document.getElementById('adjustmentDetailRejection');
            if (rejectionRow && rejectionField) {
                const comment = adjustmentRequest.rejectionComment || '';
                if (comment.trim()) {
                    rejectionRow.style.display = '';
                    rejectionField.textContent = comment.trim();
                } else {
                    rejectionRow.style.display = 'none';
                    rejectionField.textContent = '-';
                }
            }

            // 承認情報を設定（承認済の場合のみ表示）
            const approvalInfo = document.getElementById('adjustmentApprovalInfo');
            if (adjustmentRequest.status === 'APPROVED') {
                approvalInfo.style.display = 'block';
                document.getElementById('adjustmentDetailApprover').textContent = 
                    adjustmentRequest.approvedByEmployeeId ? `従業員ID: ${adjustmentRequest.approvedByEmployeeId}` : '管理者';
                document.getElementById('adjustmentDetailApprovalDate').textContent = 
                    adjustmentRequest.approvedAt ? 
                    formatDate(adjustmentRequest.approvedAt) : '-';
            } else {
                approvalInfo.style.display = 'none';
            }

            // 取消ボタンの表示制御
            this.currentAdjustmentDetail = {
                request: adjustmentRequest,
                dateString,
                fallbackId: adjustmentRequestId ? String(adjustmentRequestId) : (adjustmentRequest.adjustmentRequestId != null ? String(adjustmentRequest.adjustmentRequestId) : (targetId || null))
            };

            if (this.adjustmentCancelButton) {
                const reqIdValue = adjustmentRequest.adjustmentRequestId ?? adjustmentRequest.id;
                const canCancel = adjustmentRequest.status === 'PENDING' || adjustmentRequest.status === 'APPROVED';
                if (canCancel && reqIdValue !== undefined && reqIdValue !== null) {
                    this.adjustmentCancelButton.style.display = 'inline-block';
                    this.adjustmentCancelButton.disabled = false;
                    this.adjustmentCancelButton.dataset.requestId = String(reqIdValue);
                } else {
                    this.adjustmentCancelButton.style.display = 'none';
                    this.adjustmentCancelButton.removeAttribute('data-request-id');
                }
            }

            if (this.adjustmentResubmitButton) {
                if ((adjustmentRequest.status || '').toUpperCase() === 'REJECTED') {
                    this.adjustmentResubmitButton.style.display = 'inline-block';
                    this.adjustmentResubmitButton.disabled = false;
                } else {
                    this.adjustmentResubmitButton.style.display = 'none';
                }
            }

            // モーダルを表示
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();

        } catch (error) {
            console.error('打刻修正申請詳細表示エラー:', error);
            const errorMessage = error.message || '申請詳細の表示に失敗しました';
            this.showAlert(errorMessage, 'danger');
        }
    }

    /**
     * 打刻修正申請の取消処理
     */
    async handleAdjustmentCancel() {
        if (!this.adjustmentCancelButton) return;
        const detail = this.currentAdjustmentDetail;
        let requestId = null;

        if (detail?.request) {
            const resolved = detail.request.adjustmentRequestId ?? detail.request.id;
            if (resolved !== undefined && resolved !== null) {
                requestId = String(resolved);
            }
        }

        if (!requestId && detail?.fallbackId) {
            requestId = detail.fallbackId;
        }

        if (!requestId && this.adjustmentCancelButton.dataset.requestId) {
            requestId = this.adjustmentCancelButton.dataset.requestId;
        }

        const normalizedId = (requestId || '').trim();

        if (!normalizedId) {
            this.showAlert('申請IDを取得できません。画面を再読み込みしてください。', 'warning');
            return;
        }
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const confirmed = window.confirm('この打刻修正申請を取消しますか？');
        if (!confirmed) {
            return;
        }

        let refreshRequired = false;
        let closeModal = false;

        try {
            this.adjustmentCancelButton.disabled = true;
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post(`/api/attendance/adjustment/${normalizedId}/cancel`, {
                    employeeId: window.currentEmployeeId
                }),
                '修正申請の取消に失敗しました'
            );

            this.showAlert(data.message || '修正申請を取消しました', 'success');
            refreshRequired = true;
            closeModal = true;
        } catch (error) {
            console.error('打刻修正申請取消エラー:', error);
            const message = error.message || '修正申請の取消に失敗しました';
            const isMissing = message.includes('見つかりません') || message.includes('存在しません');
            const isStateError = message.includes('取消できない');

            if (isMissing || isStateError) {
                this.showAlert(`${message}。最新の状態を反映します。`, 'warning');
                refreshRequired = true;
                closeModal = true;
            } else {
                this.showAlert(message, 'danger');
            }
        } finally {
            this.adjustmentCancelButton.disabled = false;
            this.adjustmentCancelButton.removeAttribute('data-request-id');
            this.currentAdjustmentDetail = null;

            if (closeModal) {
                const modalElement = document.getElementById('adjustmentDetailModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    const instance = bootstrap.Modal.getInstance(modalElement);
                    instance?.hide();
                }
            }

            if (refreshRequired) {
                try {
                    await this.loadCalendarData();
                    this.generateCalendar();
                } catch (refreshError) {
                    console.error('修正申請取消後の再描画に失敗しました:', refreshError);
                }
            }
        }
    }

    /**
     * 有給申請詳細表示
     */
    async showVacationDetail(dateString, vacationId) {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const targetId = vacationId ? String(vacationId) : null;
        let request = null;

        if (targetId && this.vacationRequestRawMap.has(targetId)) {
            request = this.vacationRequestRawMap.get(targetId);
        }

        try {
            if (!request) {
                const response = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.get(`/api/vacation/${window.currentEmployeeId}`),
                    '有給申請の取得に失敗しました'
                );

                const items = (response && response.success && Array.isArray(response.data)) ? response.data : [];
                this.vacationRequestRawMap = new Map();
                items.forEach(item => {
                    const id = item.vacationId ?? item.id;
                    if (id === undefined || id === null) return;
                    const idStr = String(id);
                    this.vacationRequestRawMap.set(idStr, item);
                    if (!request && targetId && idStr === targetId) {
                        request = item;
                    }
                });

                if (!request && dateString) {
                    const targetDate = new Date(dateString);
                    for (const value of this.vacationRequestRawMap.values()) {
                        if (!value.startDate || !value.endDate) continue;
                        const start = new Date(value.startDate);
                        const end = new Date(value.endDate);
                        if (targetDate >= start && targetDate <= end) {
                            request = value;
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('有給申請詳細取得エラー:', error);
            this.showAlert(error.message || '申請詳細の取得に失敗しました', 'danger');
            return;
        }

        if (!request) {
            this.showAlert('申請詳細が見つかりません', 'warning');
            return;
        }

        const modal = document.getElementById('vacationDetailModal');
        if (!modal) {
            console.error('有給申請詳細モーダルが見つかりません');
            return;
        }

        const formatDate = (value) => {
            if (!value) return '-';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '-';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        };

        document.getElementById('vacationDetailStartDate').textContent = formatDate(request.startDate);
        document.getElementById('vacationDetailEndDate').textContent = formatDate(request.endDate);
        document.getElementById('vacationDetailDays').textContent = request.days != null ? `${request.days}日` : '-';

        const statusElement = document.getElementById('vacationDetailStatus');
        const statusMap = {
            PENDING: '申請中',
            APPROVED: '承認済',
            REJECTED: '却下',
            CANCELLED: '取消'
        };
        const statusText = statusMap[request.status] || (request.status || '-');
        statusElement.textContent = statusText;

        document.getElementById('vacationDetailReason').textContent = request.reason || '理由は記載されていません';

        const vacationRejectionRow = document.getElementById('vacationRejectionRow');
        const vacationRejectionField = document.getElementById('vacationDetailRejection');
        if (vacationRejectionRow && vacationRejectionField) {
            const comment = request.rejectionComment || request.rejectionReason || '';
            if (comment.trim()) {
                vacationRejectionRow.style.display = '';
                vacationRejectionField.textContent = comment.trim();
            } else {
                vacationRejectionRow.style.display = 'none';
                vacationRejectionField.textContent = '-';
            }
        }

        this.currentVacationDetail = {
            request,
            dateString,
            fallbackId: targetId || (request.vacationId != null ? String(request.vacationId) : null)
        };

        if (this.vacationCancelButton) {
            const reqId = request.vacationId ?? request.id;
            const canCancel = (request.status === 'PENDING' || request.status === 'APPROVED') && reqId !== undefined && reqId !== null;
            if (canCancel) {
                this.vacationCancelButton.style.display = 'inline-block';
                this.vacationCancelButton.disabled = false;
                this.vacationCancelButton.dataset.vacationId = String(reqId);
            } else {
                this.vacationCancelButton.style.display = 'none';
                this.vacationCancelButton.removeAttribute('data-vacation-id');
            }
        }

        if (this.vacationResubmitButton) {
            if ((request.status || '').toUpperCase() === 'REJECTED') {
                this.vacationResubmitButton.style.display = 'inline-block';
                this.vacationResubmitButton.disabled = false;
            } else {
                this.vacationResubmitButton.style.display = 'none';
            }
        }

        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    /**
     * 有給申請の取消処理
     */
    async handleVacationCancel() {
        if (!this.vacationCancelButton) return;
        const vacationDetail = this.currentVacationDetail;
        let vacationId = null;

        if (vacationDetail?.request) {
            const resolved = vacationDetail.request.vacationId ?? vacationDetail.request.id;
            if (resolved !== undefined && resolved !== null) {
                vacationId = String(resolved);
            }
        }

        if (!vacationId && vacationDetail?.fallbackId) {
            vacationId = vacationDetail.fallbackId;
        }

        if (!vacationId && this.vacationCancelButton.dataset.vacationId) {
            vacationId = this.vacationCancelButton.dataset.vacationId;
        }

        const normalizedId = (vacationId || '').trim();

        if (!normalizedId) {
            this.showAlert('申請IDを取得できません。画面を再読み込みしてください。', 'warning');
            return;
        }
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const confirmed = window.confirm('この有給申請を取消しますか？');
        if (!confirmed) {
            return;
        }

        let refreshRequired = false;
        let closeModal = false;

        try {
            this.vacationCancelButton.disabled = true;
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post(`/api/vacation/${normalizedId}/cancel`, {
                    employeeId: window.currentEmployeeId
                }),
                '有給申請の取消に失敗しました'
            );

            this.showAlert(data.message || '有給申請を取消しました', 'success');
            refreshRequired = true;
            closeModal = true;
        } catch (error) {
            console.error('有給申請取消エラー:', error);
            const message = error.message || '有給申請の取消に失敗しました';
            const isMissing = message.includes('見つかりません') || message.includes('存在しません');
            const isStateError = message.includes('取消できない');

            if (isMissing || isStateError) {
                this.showAlert(`${message}。最新の状態を反映します。`, 'warning');
                refreshRequired = true;
                closeModal = true;
            } else {
                this.showAlert(message, 'danger');
            }
        } finally {
            this.vacationCancelButton.disabled = false;
            this.vacationCancelButton.removeAttribute('data-vacation-id');
            this.currentVacationDetail = null;
            if (this.vacationResubmitButton) {
                this.vacationResubmitButton.style.display = 'none';
            }

            if (closeModal) {
                const modalElement = document.getElementById('vacationDetailModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    const instance = bootstrap.Modal.getInstance(modalElement);
                    instance?.hide();
                }
            }

            if (refreshRequired) {
                try {
                    await this.loadCalendarData();
                    this.generateCalendar();
                } catch (refreshError) {
                    console.error('有給申請取消後の再描画に失敗しました:', refreshError);
                }
            }
        }
    }

    /**
     * 打刻修正申請の再申請
     */
    handleAdjustmentResubmit() {
        const detail = this.currentAdjustmentDetail?.request;
        if (!detail) {
            this.showAlert('再申請するデータが見つかりません', 'warning');
            return;
        }

        const modalElement = document.getElementById('adjustmentDetailModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const instance = bootstrap.Modal.getInstance(modalElement);
            instance?.hide();
        }

        if (typeof showScreen === 'function') {
            showScreen('adjustmentScreen');
        }

        setTimeout(() => {
            if (window.adjustmentScreen && typeof window.adjustmentScreen.prefillForm === 'function') {
                window.adjustmentScreen.prefillForm({
                    date: detail.targetDate,
                    clockIn: detail.newClockIn,
                    clockOut: detail.newClockOut,
                    reason: detail.reason || ''
                });
            }
        }, 150);
    }

    /**
     * 有給申請の再申請
     */
    handleVacationResubmit() {
        const detail = this.currentVacationDetail?.request;
        if (!detail) {
            this.showAlert('再申請するデータが見つかりません', 'warning');
            return;
        }

        const modalElement = document.getElementById('vacationDetailModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const instance = bootstrap.Modal.getInstance(modalElement);
            instance?.hide();
        }

        if (typeof showScreen === 'function') {
            showScreen('vacationScreen');
        }

        setTimeout(() => {
            if (window.vacationScreen && typeof window.vacationScreen.prefillForm === 'function') {
                window.vacationScreen.prefillForm({
                    startDate: detail.startDate,
                    endDate: detail.endDate,
                    reason: detail.reason || ''
                });
            }
        }, 150);
    }

    /**
     * 勤怠情報レンダリング
     */
    renderAttendanceInfo(attendance) {
        if (!attendance) return '';

        const clockInTime = attendance.clockInTime ? 
            new Date(attendance.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : null;
        const clockOutTime = attendance.clockOutTime ? 
            new Date(attendance.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : null;

        // 出勤時刻のみ、退勤時刻のみ、または両方の表示を調整
        let timeDisplay = '';
        
        if (clockInTime && clockOutTime) {
            // 両方ある場合
            timeDisplay = `
                <div class="clock-times">
                    <small>出勤：${clockInTime}</small>
                    <small>退勤：${clockOutTime}</small>
                </div>
            `;
        } else if (clockInTime) {
            // 出勤のみ - 出勤時刻だけを表示
            timeDisplay = `
                <div class="clock-times">
                    <small>出勤：${clockInTime}</small>
                </div>
            `;
        } else if (clockOutTime) {
            // 退勤のみ（通常はないが念のため）
            timeDisplay = `
                <div class="clock-times">
                    <small>出勤：--:--</small>
                    <small>退勤：${clockOutTime}</small>
                </div>
            `;
        }

        return `
            <div class="attendance-info">
                ${timeDisplay}
            </div>
        `;
    }
}

// グローバルインスタンスを作成
window.historyScreen = new HistoryScreen();
