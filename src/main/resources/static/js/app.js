/**
 * メインアプリケーション
 * SPAの初期化と全体制御を行う
 */
class App {
    constructor() {
        this.isInitialized = false;
        this.midnightTimerId = null;
    }

    /**
     * アプリケーション初期化
     */
    async init() {
        if (this.isInitialized) return;

        console.log('勤怠管理システムを初期化しています...');

        try {
            // セッション情報を確認してユーザー情報を取得
            await this.checkAndUpdateUserInfo();

            // ログイン画面を初期化
            if (window.loginScreen) {
                await window.loginScreen.init();
            }

            // ルーターの初期化は既に完了している
            console.log('ルーターが初期化されました');

            // 管理者メニューの表示制御
            this.updateAdminMenu();

            this.isInitialized = true;
            console.log('勤怠管理システムの初期化が完了しました');

            // 日付変更監視を開始
            this.scheduleMidnightRefresh();
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }

    /**
     * セッション情報を確認してユーザー情報を更新
     */
    async checkAndUpdateUserInfo() {
        try {
            console.log('セッション情報を確認中...');
            const response = await fetchWithAuth.get('/api/auth/session');
            console.log('セッション確認レスポンス:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('セッション確認データ:', data);
                
                if (data.authenticated) {
                    console.log('セッション確認成功:', data);
                    console.log('取得した従業員ID:', data.employeeId, '型:', typeof data.employeeId);
                    this.updateUserInfo(data.username, data.employeeId);
                    return true;
                } else {
                    console.log('セッションが無効です');
                }
            } else {
                console.log('セッション確認失敗:', response.status, response.statusText);
                const errorText = await response.text();
                console.log('エラーレスポンス:', errorText);
            }
        } catch (error) {
            console.log('セッション確認エラー:', error);
        }
        return false;
    }

    /**
     * 次の深夜0時に自動で画面を最新化するタイマーをセット
     */
    scheduleMidnightRefresh() {
        try {
            if (this.midnightTimerId) {
                clearTimeout(this.midnightTimerId);
                this.midnightTimerId = null;
            }

            const now = new Date();
            const nextMidnight = new Date(now);
            nextMidnight.setHours(24, 0, 0, 0); // 今日の24:00 = 明日0:00
            const msUntilMidnight = nextMidnight.getTime() - now.getTime();

            this.midnightTimerId = setTimeout(async () => {
                await this.refreshForNewDate();
                // 次の0時にも再スケジュール
                this.scheduleMidnightRefresh();
            }, Math.max(1000, msUntilMidnight));
        } catch (e) {
            console.error('深夜更新スケジュール設定エラー:', e);
        }
    }

    /**
     * 日付が変わったタイミングで、ログイン表示・ダッシュボード・履歴カレンダーを最新化
     */
    async refreshForNewDate() {
        try {
            // ユーザー情報を再確認（セッション維持時はログイン状態のまま）
            await this.checkAndUpdateUserInfo();

            // ログイン画面の上部日付などは `dashboardScreen.updateDateTime()` が更新
            if (window.dashboardScreen) {
                try {
                    window.dashboardScreen.updateDateTime();
                    await window.dashboardScreen.loadTodayAttendance();
                    // 履歴や一覧も必要に応じて更新
                    if (typeof window.dashboardScreen.loadAttendanceHistory === 'function') {
                        await window.dashboardScreen.loadAttendanceHistory();
                    }
                } catch (e) {
                    console.warn('ダッシュボード更新でエラー:', e);
                }
            }

            // 履歴カレンダーの再取得・再描画と「当日」選択＆詳細反映
            if (window.historyScreen && typeof window.historyScreen.loadCalendarData === 'function') {
                try {
                    await window.historyScreen.loadCalendarData();
                    window.historyScreen.generateCalendar();

                    // 当日セルを選択状態にし、詳細テーブルも当日で更新
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    const todayStr = `${yyyy}-${mm}-${dd}`;

                    const grid = document.getElementById('calendarGrid');
                    if (grid) {
                        const todayCell = grid.querySelector(`.calendar-day[data-date="${todayStr}"]`);
                        if (todayCell && typeof window.historyScreen.updateSelectedDate === 'function') {
                            window.historyScreen.updateSelectedDate(todayCell);
                        }
                    }
                    if (typeof window.historyScreen.filterAttendanceTableByDate === 'function') {
                        window.historyScreen.filterAttendanceTableByDate(todayStr);
                    }
                } catch (e) {
                    console.warn('履歴カレンダー更新でエラー:', e);
                }
            }

            // 画面上部の現在時刻・日付の即時反映
            if (window.dashboardScreen && typeof window.dashboardScreen.updateDateTime === 'function') {
                window.dashboardScreen.updateDateTime();
            }
        } catch (error) {
            console.error('日付変更時の更新エラー:', error);
        }
    }

    /**
     * 管理者メニューの表示制御
     */
    updateAdminMenu() {
        const isAdmin = window.currentUser === 'admin';
        if (window.router) {
            window.router.toggleAdminMenu(isAdmin);
        }
    }

    /**
     * エラー表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.appendChild(alertDiv);

        // 10秒後に自動削除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 10000);
    }

    /**
     * ユーザー情報更新
     * @param {string} username - ユーザー名
     * @param {number} employeeId - 従業員ID
     */
    updateUserInfo(username, employeeId) {
        console.log('ユーザー情報を更新:', { username, employeeId });
        
        window.currentUser = username;
        window.currentEmployeeId = employeeId;
        this.updateAdminMenu();
        
        // ユーザー名表示を更新
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        if (currentUserDisplay) {
            currentUserDisplay.textContent = username || 'ユーザー名';
            console.log('ユーザー名表示を更新:', username);
        } else {
            console.error('currentUserDisplay要素が見つかりません');
        }
    }

    /**
     * ログアウト処理
     */
    async logout() {
        try {
            await fetchWithAuth.post('/api/auth/logout');
            
            window.currentUser = null;
            window.currentEmployeeId = null;
            this.updateAdminMenu();
            
            // ログイン画面に戻る
            if (window.loginScreen) {
                window.loginScreen.showLoginInterface();
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
            this.showError('ログアウト処理中にエラーが発生しました');
        }
    }
}

// グローバルアプリケーションインスタンスを作成
window.app = new App();

// DOM読み込み完了時にアプリケーションを初期化
document.addEventListener('DOMContentLoaded', async () => {
    await window.app.init();
});

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
    // 必要に応じてクリーンアップ処理を追加
    console.log('ページを離脱します');
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
    if (window.app) {
        window.app.showError('予期しないエラーが発生しました');
    }
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (event) => {
    console.error('未処理のPromise拒否:', event.reason);
    if (window.app) {
        window.app.showError('処理中にエラーが発生しました');
    }
});
