const navigationPrefillStore = new Map();

function normalizePrefillPath(path) {
    if (typeof path !== 'string') {
        return '';
    }
    const trimmed = path.trim();
    if (!trimmed) {
        return '';
    }
    if (trimmed === '/') {
        return '/';
    }
    const withoutTrailingSlash = trimmed.endsWith('/') && trimmed.length > 1
        ? trimmed.slice(0, -1)
        : trimmed;
    return withoutTrailingSlash.startsWith('/')
        ? withoutTrailingSlash
        : `/${withoutTrailingSlash}`;
}

window.setNavigationPrefill = function(path, payload = {}) {
    const normalized = normalizePrefillPath(path);
    if (!normalized) {
        return;
    }
    const entry = { ...(payload || {}) };
    entry.__timestamp = Date.now();
    navigationPrefillStore.set(normalized, entry);
};

window.consumeNavigationPrefill = function(path) {
    const normalized = normalizePrefillPath(path);
    if (!normalized) {
        return null;
    }

    if (!navigationPrefillStore.size && window.__navigationPrefillFallback) {
        try {
            const entries = window.__navigationPrefillFallback || {};
            Object.keys(entries).forEach((key) => {
                const normalizedKey = normalizePrefillPath(key);
                if (!normalizedKey) {
                    return;
                }
                const value = entries[key];
                navigationPrefillStore.set(normalizedKey, {
                    ...(value || {}),
                    __timestamp: Date.now()
                });
            });
        } finally {
            delete window.__navigationPrefillFallback;
        }
    }

    const entry = navigationPrefillStore.get(normalized);
    if (!entry) {
        return null;
    }
    navigationPrefillStore.delete(normalized);
    const { __timestamp, ...payload } = entry;
    return payload;
};

/**
 * メインアプリケーション
 * SPAの初期化と全体制御を行う
 */
class App {
    constructor() {
        this.isInitialized = false;
        this.midnightTimerId = null;
        this.navigationListenersInitialized = false;
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

            // historyScreenの初期化を確実に行う
            if (window.historyScreen && typeof window.historyScreen.initializeElements === 'function') {
                window.historyScreen.initializeElements();
            }

            // ルーターの初期化は既に完了している
            console.log('ルーターが初期化されました');

            // 管理者メニューの表示制御
            this.updateAdminMenu();

            this.isInitialized = true;
            console.log('勤怠管理システムの初期化が完了しました');

            // 日付変更監視を開始
            this.scheduleMidnightRefresh();

            // ナビゲーションリンクのイベント登録
            this.setupNavigationListeners();
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }

    /**
     * セッション情報を確認してユーザー情報を更新
     */
    async checkAndUpdateUserInfo() {
        // ログイン画面が表示されている場合はセッション確認をスキップ
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer && loginContainer.style.display !== 'none') {
            console.log('ログイン画面表示中: セッション確認をスキップ');
            return false;
        }
        
        try {
            console.log('セッション情報を確認中...');
            const response = await fetchWithAuth.get('/api/auth/session');
            console.log('セッション確認レスポンス:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('セッション確認データ:', data);
                
                if (data.authenticated) {
                    console.log('セッション確認成功:', data);
                    
                    // 管理者の場合はadminId、従業員の場合はemployeeIdを使用
                    let userId = data.employeeId;
                    if (data.role === 'ADMIN') {
                        userId = data.adminId;
                        console.log('管理者ログイン - adminId:', userId, '型:', typeof userId);
                    } else {
                        console.log('従業員ログイン - employeeId:', userId, '型:', typeof userId);
                    }
                    
                    this.updateUserInfo(data.username, userId);
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
     * ナビゲーションリンクのイベントリスナーを設定
     */
    setupNavigationListeners() {
        if (this.navigationListenersInitialized) {
            return;
        }

        if (!window.router) {
            console.warn('Routerが初期化される前にナビゲーション設定が呼び出されました');
            return;
        }

        const links = [
            { selector: '#brandNavLink', path: '/dashboard' },
            { selector: '#dashboardNavLink', path: '/dashboard' },
            { selector: '#historyNavLink', path: '/history' },
            { selector: '#vacationNavLink', path: '/vacation' },
            { selector: '#adjustmentNavLink', path: '/adjustment' },
            { selector: '#adminApprovalsNavLink', path: '/admin/approvals' },
            { selector: '#adminVacationManagementNavLink', path: '/admin/vacation-management' },
            { selector: '#adminEmployeesNavLink', path: '/admin/employees' }
        ];

        links.forEach(({ selector, path }) => {
            const link = document.querySelector(selector);
            if (!link) {
                return;
            }

            link.addEventListener('click', (event) => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                    return;
                }

                event.preventDefault();
                console.log(`Navigation clicked: ${path}`);
                window.router.navigate(path);
            });
        });

        this.navigationListenersInitialized = true;
        console.log('Navigation listeners setup completed');
    }

    /**
     * 管理者メニューの表示制御
     */
    updateAdminMenu() {
        // セッション情報から管理者権限を確認
        const isAdmin = window.currentUser === 'admin' || window.isAdmin === true;
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
        const isAdminUser = window.isAdmin === true || username === 'admin';
        if (!isAdminUser && typeof window.clearAdminViewingState === 'function') {
            window.clearAdminViewingState();
        }
        
        // 右上表示を氏名に変更（取得できない場合はユーザー名）
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        if (currentUserDisplay && employeeId != null) {
            // 管理者は常に固定表示
            if (isAdminUser) {
                currentUserDisplay.textContent = '管理者';
                return;
            }
            try {
                fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.get(`/api/employee/${employeeId}`),
                    'ユーザー情報の取得に失敗しました'
                ).then((data) => {
                    let displayName = data?.data?.displayName || '';
                    if (!displayName) {
                        displayName = `emp${employeeId}`;
                    }
                    currentUserDisplay.textContent = displayName || `emp${employeeId}` || username || 'ユーザー';
                }).catch(() => {
                    const fallback = employeeId != null ? `emp${employeeId}` : (username || 'ユーザー');
                    currentUserDisplay.textContent = fallback || 'ユーザー';
                });
            } catch (e) {
                const fallback = employeeId != null ? `emp${employeeId}` : (username || 'ユーザー');
                currentUserDisplay.textContent = fallback || 'ユーザー';
            }
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
            if (typeof window.clearAdminViewingState === 'function') {
                window.clearAdminViewingState();
            }
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

// グローバルなshowAlert関数を定義
window.showAlert = function(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.warn('Alert container not found');
        return;
    }

    // 既存のアラートをクリア（新しいアラートが優先されるように）
    const existingAlerts = alertContainer.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

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
};

// DOM読み込み完了時にアプリケーションとルーターを初期化
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new App();
    window.router = new Router();

    // フォームバリデーションカスタマイズ
    setupCustomFormValidation();
    setupAutoDateTimeInputFormatting();

    window.app.setupNavigationListeners();
    await window.app.init();
});

/**
 * カスタムフォームバリデーション設定
 * 各画面の独自バリデーション処理を優先し、統一されたトーストメッセージを表示
 */
function setupCustomFormValidation() {
    // 対象フォームのID
    const targetFormIds = ['vacationForm', 'adjustmentForm', 'workPatternForm', 'holidayForm'];
    
    targetFormIds.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            // 各画面の独自バリデーション処理を優先するため、
            // フォーム送信時のバリデーション処理は無効化
            // 代わりに、フィールドの入力時にクラスのクリアのみを行う
            form.addEventListener('input', function(event) {
                if (event.target.hasAttribute('required')) {
                    event.target.classList.remove('is-invalid');
                }
            });
        }
    });
}

/**
 * トーストアラートを表示
 */
function showToastAlert(message, type = 'warning') {
    // グローバルなshowAlert関数を使用
    window.showAlert(message, type);
}

function setupAutoDateTimeInputFormatting() {
    const processed = new WeakSet();
    const selector = 'input[type="date"], input[type="time"]';

    const attach = (input) => {
        if (!(input instanceof HTMLInputElement) || processed.has(input)) {
            return;
        }
        processed.add(input);
        if (input.type !== 'date' && input.type !== 'time') {
            return;
        }

        let suppress = false;
        const normalize = () => {
            if (suppress) {
                return;
            }
            const rawValue = input.value;
            let formatted = null;
            if (input.type === 'date') {
                formatted = typeof TimeUtils !== 'undefined'
                    ? TimeUtils.normalizeCompactDateString(rawValue)
                    : null;
            } else if (input.type === 'time') {
                formatted = typeof TimeUtils !== 'undefined'
                    ? TimeUtils.normalizeCompactTimeString(rawValue)
                    : null;
            }
            if (formatted) {
                let nextValue = null;
                if (input.type === 'date' && formatted.iso) {
                    nextValue = formatted.iso;
                } else if (input.type === 'time' && formatted.value) {
                    nextValue = formatted.value;
                }
                if (!nextValue || nextValue === rawValue) {
                    return;
                }
                suppress = true;
                if (input.type === 'date' && formatted.date instanceof Date) {
                    input.valueAsDate = formatted.date;
                }
                input.value = nextValue;
                if (formatted.display) {
                    input.dataset.formattedDisplay = formatted.display;
                    input.title = formatted.display;
                } else {
                    delete input.dataset.formattedDisplay;
                    input.removeAttribute('title');
                }
                input.dispatchEvent(new Event('change', { bubbles: true }));
                suppress = false;
            }
        };

        input.addEventListener('input', normalize);
        input.addEventListener('blur', normalize);
    };

    document.querySelectorAll(selector).forEach(attach);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) {
                    return;
                }
                if (node.matches(selector)) {
                    attach(node);
                }
                if (typeof node.querySelectorAll === 'function') {
                    node.querySelectorAll(selector).forEach(attach);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

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
