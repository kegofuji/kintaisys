/**
 * ダッシュボード画面モジュール
 */
class DashboardScreen {
    constructor() {
        this.clockInBtn = null;
        this.clockOutBtn = null;
        this.clockStatus = null;
        this.refreshHistoryBtn = null;
        this.attendanceHistory = null;
        this.monthlySubmitBtn = null;
        this.monthSelect = null;
        this.logoutBtn = null;
    }

    /**
     * 初期化
     */
    init() {
        console.log('Dashboard init called, employeeId:', window.currentEmployeeId);
        this.initializeElements();
        this.setupEventListeners();
        this.updateDateTime();
        
        // 従業員IDが設定されている場合のみ勤怠データを読み込み
        if (window.currentEmployeeId) {
            console.log('従業員IDが設定されています。勤怠データを読み込みます。');
            this.loadTodayAttendance();
            this.loadAttendanceHistory();
        } else {
            console.log('従業員IDが設定されていません。セッション情報を確認します。');
            // セッション情報を再確認
            this.checkSessionAndLoadData();
        }
        
        this.generateMonthOptions();
        
        // 現在時刻を1秒ごとに更新
        setInterval(() => {
            this.updateDateTime();
            // 勤務時間のリアルタイム更新は行わない
        }, 1000);
    }

    /**
     * セッション情報を確認してデータを読み込み
     */
    async checkSessionAndLoadData() {
        try {
            console.log('セッション情報を確認中...');
            const response = await fetchWithAuth.get('/api/auth/session');
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    console.log('セッション確認成功、ユーザー情報を更新:', data);
                    console.log('取得した従業員ID:', data.employeeId, '型:', typeof data.employeeId);
                    
                    window.currentUser = data.username;
                    window.currentEmployeeId = data.employeeId;
                    
                    // アプリケーションのユーザー情報を更新
                    if (window.app) {
                        window.app.updateUserInfo(data.username, data.employeeId);
                    }
                    
                    // 勤怠データを読み込み
                    this.loadTodayAttendance();
                    this.loadAttendanceHistory();
                } else {
                    console.log('セッションが無効です');
                }
            } else {
                console.log('セッション確認失敗:', response.status);
                const errorText = await response.text();
                console.log('エラーレスポンス:', errorText);
            }
        } catch (error) {
            console.error('セッション確認エラー:', error);
        }
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.clockInBtn = document.getElementById('clockInBtn');
        this.clockOutBtn = document.getElementById('clockOutBtn');
        this.clockStatus = document.getElementById('clockStatus');
        this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        this.attendanceHistory = document.getElementById('attendanceHistory');
        this.monthlySubmitBtn = document.getElementById('monthlySubmitBtn');
        this.monthSelect = document.getElementById('historyMonthSelect');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.clockInBtn) {
            this.clockInBtn.addEventListener('click', () => this.handleClockIn());
        }

        if (this.clockOutBtn) {
            this.clockOutBtn.addEventListener('click', () => this.handleClockOut());
        }

        if (this.refreshHistoryBtn) {
            this.refreshHistoryBtn.addEventListener('click', () => this.loadAttendanceHistory());
        }

        if (this.monthlySubmitBtn) {
            this.monthlySubmitBtn.addEventListener('click', () => this.handleMonthlySubmit());
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    /**
     * 出勤打刻
     */
    async handleClockIn() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/clock-in', { employeeId: window.currentEmployeeId }),
                '出勤打刻に失敗しました'
            );

            this.showAlert(data.message, 'success');
            await this.loadTodayAttendance();
            await this.loadAttendanceHistory();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 退勤打刻
     */
    async handleClockOut() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/clock-out', { employeeId: window.currentEmployeeId }),
                '退勤打刻に失敗しました'
            );

            this.showAlert(data.message, 'success');
            await this.loadTodayAttendance();
            await this.loadAttendanceHistory();
            
            // 履歴カレンダーを即時更新
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
            } catch (calendarError) {
                console.warn('カレンダー更新エラー:', calendarError);
            }
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 日時表示更新
     */
    updateDateTime() {
        const now = new Date();
        
        // 日付表示更新
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const date = now.getDate();
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            const dayName = dayNames[now.getDay()];
            currentDateElement.textContent = `${year}/${month}/${String(date).padStart(2, '0')}(${dayName})`;
        }
        
        // 時刻表示更新
        const currentTimeElement = document.getElementById('currentTime');
        if (currentTimeElement) {
            const timeString = now.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
            currentTimeElement.textContent = timeString;
        }
    }

    /**
     * 勤務時間のリアルタイム更新
     */
    updateWorkingTime() {}

    /**
     * 今日の勤怠状況読み込み
     */
    async loadTodayAttendance() {
        console.log('loadTodayAttendance called, employeeId:', window.currentEmployeeId, 'type:', typeof window.currentEmployeeId);
        
        if (!window.currentEmployeeId) {
            console.log('No employee ID found, attempting to get from session');
            // セッションから従業員IDを再取得
            await this.checkSessionAndLoadData();
            return;
        }

        try {
            console.log('Fetching today attendance for employee:', window.currentEmployeeId);
            const apiUrl = `/api/attendance/today/${window.currentEmployeeId}`;
            console.log('API URL:', apiUrl);
            
            const response = await fetchWithAuth.get(apiUrl);
            
            console.log('API Response status:', response.status);
            console.log('API Response headers:', response.headers);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Today attendance API response:', JSON.stringify(data, null, 2));
                
                if (data.success) {
                    if (data.data) {
                        console.log('Displaying attendance data:', data.data);
                        this.displayTodayAttendance(data.data);
                    } else {
                        console.log('No attendance data in response, showing default');
                        this.displayTodayAttendance(null);
                    }
                } else {
                    console.log('API returned success=false:', data.message);
                    this.displayTodayAttendance(null);
                }
            } else if (response.status === 404) {
                // 404エラーの場合は勤怠記録がないことを意味する
                console.log('No attendance record found (404), showing default');
                this.displayTodayAttendance(null);
            } else {
                // その他のエラー
                console.error('API error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                this.displayTodayAttendance(null);
            }
        } catch (error) {
            console.error('今日の勤怠状況読み込みエラー:', error);
            // エラーの場合はデフォルト表示
            this.displayTodayAttendance(null);
        }
    }

    /**
     * 今日の勤怠状況表示
     * @param {Object} data - 勤怠データ
     */
    displayTodayAttendance(data) {
        console.log('displayTodayAttendance called with data:', data);
        console.log('Data type:', typeof data);
        console.log('Data keys:', data ? Object.keys(data) : 'null');
        
        if (!this.clockStatus) {
            console.log('clockStatus element not found');
            return;
        }

        // ステータス表示（未確定は空白）→ 出勤前/出勤中/退勤済みに統一
        let statusText = '';
        if (!data || !data.clockInTime) {
            statusText = '出勤前';
        } else if (data.clockInTime && !data.clockOutTime) {
            statusText = '出勤中';
        } else if (data.clockInTime && data.clockOutTime) {
            statusText = '退勤済み';
        }

        console.log('Setting status:', statusText);
        this.clockStatus.innerHTML = statusText;

        // 出勤時刻表示
        const clockInTimeElement = document.getElementById('clockInTime');
        if (clockInTimeElement) {
            if (data && data.clockInTime && data.clockOutTime) {
                console.log('Clock in time raw data:', data.clockInTime);
                try {
                    // LocalDateTimeの文字列をDateオブジェクトに変換
                    const clockInTime = new Date(data.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'});
                    clockInTimeElement.textContent = clockInTime;
                    console.log('Clock in time set to:', clockInTime);
                } catch (error) {
                    console.error('Error parsing clock in time:', error);
                    clockInTimeElement.textContent = '';
                }
            } else {
                clockInTimeElement.textContent = '';
                console.log('No confirmed times, set to blank');
            }
        } else {
            console.log('clockInTimeElement not found');
        }

        // 退勤時刻表示
        const clockOutTimeElement = document.getElementById('clockOutTime');
        if (clockOutTimeElement) {
            if (data && data.clockInTime && data.clockOutTime) {
                console.log('Clock out time raw data:', data.clockOutTime);
                try {
                    // LocalDateTimeの文字列をDateオブジェクトに変換
                    const clockOutTime = new Date(data.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'});
                    clockOutTimeElement.textContent = clockOutTime;
                    console.log('Clock out time set to:', clockOutTime);
                } catch (error) {
                    console.error('Error parsing clock out time:', error);
                    clockOutTimeElement.textContent = '';
                }
            } else {
                clockOutTimeElement.textContent = '';
                console.log('No confirmed times, set to blank');
            }
        } else {
            console.log('clockOutTimeElement not found');
        }

        // 勤務時間表示
        const workingTimeElement = document.getElementById('workingTime');
        if (workingTimeElement) {
            if (data && data.clockInTime && data.clockOutTime) {
                workingTimeElement.textContent = TimeUtils.calculateWorkingTime(data.clockInTime, data.clockOutTime);
                console.log('Working time set to:', TimeUtils.calculateWorkingTime(data.clockInTime, data.clockOutTime));
            } else if (data && data.clockInTime && !data.clockOutTime) {
                // 出勤中でも合計は空白（未確定は空白の方針）
                workingTimeElement.textContent = '';
            } else {
                workingTimeElement.textContent = '';
            }
        } else {
            console.log('workingTimeElement not found');
        }

        // ボタンの状態更新
        this.updateButtonStates(data);
    }

    /**
     * ボタンの状態更新
     * @param {Object} data - 勤怠データ
     */
    updateButtonStates(data) {
        if (!this.clockInBtn || !this.clockOutBtn) return;

        if (data && data.clockInTime && !data.clockOutTime) {
            // 出勤済み・退勤未済の場合
            this.clockInBtn.disabled = true;
            this.clockInBtn.innerHTML = '出勤済み';
            this.clockInBtn.className = 'btn btn-secondary btn-lg me-3 clock-btn';
            
            this.clockOutBtn.disabled = false;
            this.clockOutBtn.innerHTML = '退勤打刻';
            this.clockOutBtn.className = 'btn btn-danger btn-lg clock-btn';
        } else if (data && data.clockInTime && data.clockOutTime) {
            // 出勤済み・退勤済みの場合
            this.clockInBtn.disabled = true;
            this.clockInBtn.innerHTML = '出勤済み';
            this.clockInBtn.className = 'btn btn-secondary btn-lg me-3 clock-btn';
            
            this.clockOutBtn.disabled = true;
            this.clockOutBtn.innerHTML = '退勤済み';
            this.clockOutBtn.className = 'btn btn-secondary btn-lg clock-btn';
        } else {
            // 未出勤の場合
            this.clockInBtn.disabled = false;
            this.clockInBtn.innerHTML = '出勤打刻';
            this.clockInBtn.className = 'btn btn-success btn-lg me-3 clock-btn';
            
            this.clockOutBtn.disabled = true;
            this.clockOutBtn.innerHTML = '退勤打刻';
            this.clockOutBtn.className = 'btn btn-secondary btn-lg clock-btn';
        }
    }

    /**
     * 勤怠履歴読み込み
     */
    async loadAttendanceHistory() {
        if (!window.currentEmployeeId) return;

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/history/${window.currentEmployeeId}`),
                '勤怠履歴の取得に失敗しました'
            );

            if (data.success) {
                this.displayAttendanceHistory(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = this.generateMockAttendanceData();
                this.displayAttendanceHistory(mockData);
            }
        } catch (error) {
            console.error('勤怠履歴読み込みエラー:', error);
            // エラーの場合はモックデータを表示
            const mockData = this.generateMockAttendanceData();
            this.displayAttendanceHistory(mockData);
        }
    }

    /**
     * モック勤怠データ生成
     * @returns {Array} - モックデータ
     */
    generateMockAttendanceData() {
        const data = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const clockIn = new Date(date);
            clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);

            const clockOut = new Date(date);
            clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0);

            const diffMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));
            const workingHours = TimeUtils.formatMinutesToTime(diffMinutes);

            data.push({
                attendanceDate: date.toISOString().split('T')[0],
                clockInTime: clockIn.toISOString(),
                clockOutTime: clockOut.toISOString(),
                workingHours: workingHours,
                status: i === 0 ? '出勤中' : '退勤済み'
            });
        }

        return data;
    }

    /**
     * 勤怠履歴表示
     * @param {Array} data - 勤怠データ
     */
    displayAttendanceHistory(data) {
        if (!this.attendanceHistory) return;

        this.attendanceHistory.innerHTML = '';

        // データがない場合でも、ヘッダ列のみ表示（空のテーブル本体）
        if (data.length === 0) {
            return;
        }

        data.forEach(record => {
            const row = document.createElement('tr');

            // 実際のデータ構造に合わせて表示
            const clockInTime = record.clockInTime ? 
                new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
            const clockOutTime = record.clockOutTime ? 
                new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';

            // 勤務時間計算 - 確定まで空白
            let workingHours = '';
            if (record.clockInTime && record.clockOutTime) {
                workingHours = TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime);
            }

            // ステータス表示
            let statusText = '未出勤';

            if (record.clockInTime && !record.clockOutTime) {
                statusText = '出勤中';
            } else if (record.clockInTime && record.clockOutTime) {
                statusText = '退勤済み';
            }

            row.innerHTML = `
                <td>${record.attendanceDate}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${workingHours}</td>
                <td>${statusText}</td>
            `;
            this.attendanceHistory.appendChild(row);
        });
    }



    /**
     * ログアウト処理
     */
    async handleLogout() {
        try {
            await fetchWithAuth.post('/api/auth/logout');
            
            window.currentUser = null;
            window.currentEmployeeId = null;
            this.showAlert('ログアウトしました', 'info');
            
            // ログイン画面に戻る
            if (window.loginScreen) {
                window.loginScreen.showLoginInterface();
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
            this.showAlert('ログアウト処理中にエラーが発生しました', 'danger');
        }
    }

    /**
     * 月選択オプション生成
     */
    generateMonthOptions() {
        if (!this.monthSelect) return;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, currentMonth - 1 - i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const value = `${year}-${month}`;
            const label = `${year}年${month}月`;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            this.monthSelect.appendChild(option);
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
window.dashboardScreen = new DashboardScreen();
