/**
 * SPAルーティング機能
 * History API を利用したルーティングを実装
 */
class Router {
    constructor() {
        this.routes = new Map();
        this.dynamicRoutes = [];
        this.currentRoute = null;
        this.currentFullPath = null;
        this.currentRouteParams = {};

        // thisにバインドしたルート変更ハンドラを保持
        this.handleRouteChange = this.handleRouteChange.bind(this);

        // ルート定義
        this.defineRoutes();

        // ルート変更イベントの監視を開始
        window.addEventListener('popstate', this.handleRouteChange);

        if (document.readyState !== 'loading') {
            this.initializeCurrentRoute();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.initializeCurrentRoute());
        }
    }

    /**
     * 初期表示時のルート処理
     */
    initializeCurrentRoute() {
        let initialPath = this.normalizePath(window.location.pathname);

        // /history/YYYYMM のディープリンクをサポート
        const historyMatch = initialPath.match(/^\/history\/(\d{6})$/);
        if (historyMatch) {
            const yyyymm = historyMatch[1];
            const year = parseInt(yyyymm.slice(0, 4), 10);
            const month = parseInt(yyyymm.slice(4), 10);
            if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
                if (typeof window.setNavigationPrefill === 'function') {
                    window.setNavigationPrefill('/history', { year, month });
                }
                initialPath = '/history';
            }
        }

        if (initialPath === '/') {
            this.navigate('/login', { updateHistory: true, replace: true });
            return;
        }

        const initialMatch = this.matchRoute(initialPath);
        if (!initialMatch) {
            // 管理者権限がある場合は管理者TOPに、ない場合はダッシュボードに遷移
            if (this.isAdmin()) {
                this.navigate('/admin', { updateHistory: true, replace: true });
            } else {
                this.navigate('/dashboard', { updateHistory: true, replace: true });
            }
            return;
        }

        this.navigate(initialPath, { updateHistory: true, replace: true });
    }

    /**
     * ルート定義
     */
    defineRoutes() {
        // 一般ユーザー向けルート
        this.routes.set('/', { screen: 'dashboardScreen', title: '打刻画面' });
        this.routes.set('/login', { title: 'ログイン', login: true });
        this.routes.set('/dashboard', { screen: 'dashboardScreen', title: '打刻画面' });
        this.routes.set('/history', { screen: 'historyScreen', title: '勤怠履歴' });
        this.routes.set('/vacation', { screen: 'vacationScreen', title: '休暇申請' });
        this.routes.set('/adjustment', { screen: 'adjustmentScreen', title: '打刻修正' });
        this.routes.set('/work-pattern', { screen: 'workPatternScreen', title: '勤務時間変更' });
        // 休日関連（休日出勤/振替）
        this.routes.set('/holiday', { screen: 'holidayScreen', title: '休日関連' });
        
        // 管理者向けルート
        this.routes.set('/admin', { screen: 'adminDashboardScreen', title: '管理者TOP', admin: true });
        this.routes.set('/admin/employees', { screen: 'adminEmployeesScreen', title: '社員管理', admin: true });
        // 勤怠管理画面は廃止
        this.routes.set('/admin/approvals', { screen: 'adminApprovalsScreen', title: '打刻修正', admin: true });
        this.routes.set('/admin/work-pattern-change', { screen: 'adminWorkPatternScreen', title: '勤務時間変更', admin: true });
        this.routes.set('/admin/vacation-management', { screen: 'adminVacationManagementScreen', title: '休暇管理', admin: true });
        // 管理者: 休日関連
        this.routes.set('/admin/holiday', { screen: 'adminHolidayScreen', title: '休日関連', admin: true });

        this.registerDynamicRoutes();
    }

    registerDynamicRoutes() {
        this.dynamicRoutes = [
            { basePath: '/vacation', paramNames: ['date'], pattern: /^\/vacation\/(\d{4}-\d{2}-\d{2})$/ },
            { basePath: '/adjustment', paramNames: ['date'], pattern: /^\/adjustment\/(\d{4}-\d{2}-\d{2})$/ },
            { basePath: '/work-pattern', paramNames: ['date'], pattern: /^\/work-pattern\/(\d{4}-\d{2}-\d{2})$/ },
            { basePath: '/holiday', paramNames: ['date'], pattern: /^\/holiday\/(\d{4}-\d{2}-\d{2})$/ }
        ];
    }

    matchRoute(path) {
        const normalized = this.normalizePath(path);
        if (this.routes.has(normalized)) {
            return {
                route: this.routes.get(normalized),
                basePath: normalized,
                params: {},
                resolvedPath: normalized
            };
        }

        if (!Array.isArray(this.dynamicRoutes) || this.dynamicRoutes.length === 0) {
            return null;
        }

        for (const entry of this.dynamicRoutes) {
            if (!entry || !entry.pattern || !entry.basePath) {
                continue;
            }
            const match = normalized.match(entry.pattern);
            if (!match) {
                continue;
            }
            const route = this.routes.get(entry.basePath);
            if (!route) {
                continue;
            }
            const params = {};
            if (Array.isArray(entry.paramNames)) {
                entry.paramNames.forEach((name, idx) => {
                    const value = match[idx + 1];
                    if (name && value !== undefined) {
                        params[name] = value;
                    }
                });
            }
            return {
                route,
                basePath: entry.basePath,
                params,
                resolvedPath: normalized
            };
        }

        return null;
    }

    /**
     * ルート変更処理
     */
    handleRouteChange() {
        const path = this.normalizePath(window.location.pathname);
        this.navigate(path, { updateHistory: false });
    }

    /**
     * ルート遷移
     * @param {string} path - 遷移先パス
     * @param {Object|boolean} options - 履歴更新オプション
     */
    navigate(path, options = {}) {
        const normalizedOptions = typeof options === 'boolean'
            ? { updateHistory: options }
            : options;

        const {
            updateHistory = true,
            replace = false
        } = normalizedOptions;

        let requestedPath = this.normalizePath(path);

        // /history/YYYYMM のディープリンクを /history に解決してプレフィルを付与
        const historyMatch = requestedPath.match(/^\/history\/(\d{6})$/);
        if (historyMatch) {
            const yyyymm = historyMatch[1];
            const year = parseInt(yyyymm.slice(0, 4), 10);
            const month = parseInt(yyyymm.slice(4), 10);
            if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
                if (typeof window.setNavigationPrefill === 'function') {
                    window.setNavigationPrefill('/history', { year, month });
                }
                requestedPath = '/history';
            }
        }

        if (requestedPath === '/') {
            requestedPath = '/dashboard';
        }

        const match = this.matchRoute(requestedPath);
        if (!match || !match.route) {
            console.warn(`ルートが見つかりません: ${requestedPath}`);
            if (requestedPath !== '/dashboard') {
                this.navigate('/dashboard', { updateHistory: true, replace: true });
            }
            return;
        }

        const { route, basePath, params, resolvedPath } = match;
        const fullPath = resolvedPath || basePath;

        if (route.admin && !this.isAdmin()) {
            console.warn('管理者権限が必要です');
            this.navigate('/dashboard', { updateHistory: true, replace: true });
            return;
        }

        const currentPath = window.location.pathname;
        if (updateHistory) {
            const state = { path: fullPath, basePath };
            if (replace) {
                window.history.replaceState(state, '', fullPath);
            } else if (currentPath !== fullPath) {
                window.history.pushState(state, '', fullPath);
            }
        } else if (replace && currentPath !== fullPath) {
            window.history.replaceState({ path: fullPath, basePath }, '', fullPath);
        }

        const isSameRoute = this.currentRoute === basePath && this.currentFullPath === fullPath;
        if (isSameRoute) {
            this.currentRouteParams = params || {};
            this.updateNavigation(basePath);
            return;
        }

        if (route.login) {
            this.showScreen(null);
        } else if (route.screen) {
            this.showScreen(route.screen);
            this.initializeScreen(route.screen);
        }

        if (route.title) {
            this.updateTitle(route.title);
        }

        this.currentRoute = basePath;
        this.currentFullPath = fullPath;
        this.currentRouteParams = params || {};
        this.updateNavigation(basePath);
    }

    /**
     * パス正規化
     * @param {string} path - パス
     * @returns {string} - 正規化されたパス
     */
    normalizePath(path) {
        if (!path) {
            return '/';
        }

        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        return path;
    }

    /**
     * 画面表示
     * @param {string} screenId - 画面ID
     */
    showScreen(screenId) {
        // すべての画面を非表示
        const screens = document.querySelectorAll('.screen-container');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });

        if (!screenId) {
            return;
        }

        // 指定された画面を表示
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            
            // historyScreenが表示された場合、カレンダー要素を確実に表示する
            if (screenId === 'historyScreen' && window.historyScreen && typeof window.historyScreen.initializeElements === 'function') {
                setTimeout(() => {
                    // タイトルを更新（管理者が閲覧している場合）
                    if (typeof window.historyScreen.updateHistoryTitle === 'function') {
                        window.historyScreen.updateHistoryTitle();
                    }

                    const calendarGrid = document.getElementById('calendarGrid');
                    if (calendarGrid && window.historyScreen.calendarGrid) {
                        // カレンダーが表示されていない場合は再生成
                        if (calendarGrid.children.length === 0) {
                            console.log('カレンダーが空のため再生成します');
                            if (typeof window.historyScreen.generateCalendar === 'function') {
                                window.historyScreen.generateCalendar();
                            }
                        }
                    } else if (!window.historyScreen.calendarGrid) {
                        console.log('calendarGrid要素が見つからないため、再初期化します');
                        if (typeof window.historyScreen.initializeElements === 'function') {
                            window.historyScreen.initializeElements();
                        }
                        if (window.historyScreen.calendarGrid && typeof window.historyScreen.generateCalendar === 'function') {
                            window.historyScreen.generateCalendar();
                        }
                    }
                }, 100);
            }
        } else {
            console.error(`画面が見つかりません: ${screenId}`);
        }
    }

    /**
     * タイトル更新
     * @param {string} title - タイトル
     */
    updateTitle(title) {
        // 画面名のみをタイトルに表示（要望 7:B）
        document.title = `${title}`;
    }

    /**
     * 管理者権限チェック
     * @returns {boolean} - 管理者かどうか
     */
    isAdmin() {
        // セッション情報から管理者権限をチェック
        // より確実な方法として、セッションAPIから取得したroleをチェック
        return window.currentUser === 'admin' || window.isAdmin === true;
    }

    /**
     * 画面固有の初期化処理
     * @param {string} screenId - 画面ID
     */
    initializeScreen(screenId) {
        // 各画面の初期化処理を呼び出し
        switch (screenId) {
            case 'dashboardScreen':
                if (window.dashboardScreen) {
                    window.dashboardScreen.init();
                }
                break;
            case 'historyScreen':
                if (window.historyScreen && typeof window.historyScreen.init === 'function') {
                    if (!window.historyScreen.initialized) {
                        window.historyScreen.init();
                    } else {
                        // 既に初期化済みの場合でも、要素が存在しない場合は再初期化
                        if (!window.historyScreen.calendarGrid || !document.getElementById('calendarGrid')) {
                            console.log('calendarGrid要素が見つからないため、要素を再取得します');
                            if (typeof window.historyScreen.initializeElements === 'function') {
                                window.historyScreen.initializeElements();
                            }
                            if (window.historyScreen.calendarGrid && typeof window.historyScreen.loadCalendarData === 'function') {
                                window.historyScreen.loadCalendarData(true).catch(error => {
                                    console.error('カレンダーデータの再読み込みに失敗:', error);
                                });
                            }
                        }
                        // タイトルを更新（管理者が閲覧している場合）
                        if (typeof window.historyScreen.updateHistoryTitle === 'function') {
                            window.historyScreen.updateHistoryTitle();
                        }
                    }
                } else {
                    console.error('historyScreenまたはinitメソッドが見つかりません');
                }
                break;
            case 'vacationScreen':
                if (window.vacationScreen) {
                    window.vacationScreen.init();
                }
                break;
            case 'holidayScreen':
                if (window.holidayScreen) {
                    window.holidayScreen.init();
                }
                break;
            case 'adjustmentScreen':
                if (window.adjustmentScreen) {
                    window.adjustmentScreen.init();
                }
                break;
            case 'workPatternScreen':
                if (window.workPatternScreen) {
                    window.workPatternScreen.init();
                }
                break;
            case 'adminDashboardScreen':
                if (window.adminScreen) {
                    window.adminScreen.initDashboard();
                }
                break;
            case 'adminWorkPatternScreen':
                if (window.adminScreen) {
                    window.adminScreen.initWorkPattern();
                }
                break;
            case 'adminEmployeesScreen':
                if (window.adminScreen) {
                    console.log('ルーターから社員管理画面を初期化します');
                    // DOM要素の準備を待ってから初期化
                    setTimeout(() => {
                        window.adminScreen.initEmployees();
                    }, 50);
                } else {
                    console.error('AdminScreenインスタンスが見つかりません');
                }
                break;
            // adminAttendanceScreen は廃止
            case 'adminApprovalsScreen':
                if (window.adminScreen) {
                    window.adminScreen.initApprovals();
                }
                break;
            case 'adminReportsScreen':
                if (window.adminScreen) {
                    window.adminScreen.initReports();
                }
                break;
            case 'adminVacationManagementScreen':
                if (window.adminScreen) {
                    window.adminScreen.initVacationManagement();
                }
                break;
            case 'adminHolidayScreen':
                if (window.adminScreen) {
                    window.adminScreen.initHoliday();
                }
                break;
        }
    }

    /**
     * 現在のルートを取得
     * @returns {string} - 現在のルート
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    getCurrentRouteParams() {
        return { ...(this.currentRouteParams || {}) };
    }

    /**
     * ルートが存在するかチェック
     * @param {string} path - パス
     * @returns {boolean} - 存在するかどうか
     */
    hasRoute(path) {
        return Boolean(this.matchRoute(path));
    }

    /**
     * 管理者メニューの表示/非表示を制御
     * @param {boolean} isAdmin - 管理者かどうか
     */
    toggleAdminMenu(isAdmin) {
        const adminMenu = document.getElementById('adminMenu');
        if (adminMenu) {
            if (isAdmin) {
                adminMenu.classList.add('show');
            } else {
                adminMenu.classList.remove('show');
            }
        }
    }

    /**
     * ナビゲーションバーのアクティブ状態を更新
     * @param {string} currentPath - 現在のパス
     */
    updateNavigation(currentPath) {
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');

            const href = link.getAttribute('href');
            if (!href || href === '#') {
                return;
            }

            const hashPath = href.startsWith('#') ? href.substring(1) : href;
            if (!hashPath) {
                return;
            }
            const linkPath = this.normalizePath(hashPath);
            if (linkPath === currentPath || (linkPath === '/' && currentPath === '/dashboard')) {
                link.classList.add('active');
            }
        });
    }
}

// Router クラスをグローバルに公開
window.Router = Router;
