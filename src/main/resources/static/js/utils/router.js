/**
 * SPAルーティング機能
 * ハッシュベースのルーティングを実装
 */
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.isInitialized = false;
        
        // ルート定義
        this.defineRoutes();
        
        // イベントリスナーを設定
        this.setupEventListeners();
    }

    /**
     * ルート定義
     */
    defineRoutes() {
        // 一般ユーザー向けルート
        this.routes.set('/', { screen: 'dashboardScreen', title: 'TOP' });
        this.routes.set('/dashboard', { screen: 'dashboardScreen', title: 'TOP' });
        this.routes.set('/history', { screen: 'historyScreen', title: '勤怠履歴' });
        this.routes.set('/vacation', { screen: 'vacationScreen', title: '有給申請' });
        this.routes.set('/adjustment', { screen: 'adjustmentScreen', title: '打刻修正' });
        
        // 管理者向けルート
        this.routes.set('/admin', { screen: 'adminDashboardScreen', title: '管理者ダッシュボード', admin: true });
        this.routes.set('/admin/employees', { screen: 'adminEmployeesScreen', title: '社員管理', admin: true });
        // 勤怠管理画面は廃止
        this.routes.set('/admin/approvals', { screen: 'adminApprovalsScreen', title: '打刻修正', admin: true });
        this.routes.set('/admin/reports', { screen: 'adminReportsScreen', title: 'レポート出力', admin: true });
        this.routes.set('/admin/vacation-management', { screen: 'adminVacationManagementScreen', title: '有給承認・付与調整', admin: true });
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // ハッシュ変更イベント
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // ページ読み込み時のルート処理
        window.addEventListener('DOMContentLoaded', () => {
            this.handleRouteChange();
        });
    }

    /**
     * ルート変更処理
     */
    handleRouteChange() {
        const hash = window.location.hash.substring(1) || '/';
        this.navigate(hash, false);
    }

    /**
     * ルート遷移
     * @param {string} path - 遷移先パス
     * @param {boolean} updateHash - ハッシュを更新するかどうか
     */
    navigate(path, updateHash = true) {
        // パスを正規化
        const normalizedPath = this.normalizePath(path);
        
        // ルートが存在するかチェック
        const route = this.routes.get(normalizedPath);
        if (!route) {
            console.warn(`ルートが見つかりません: ${normalizedPath}`);
            this.navigate('/dashboard');
            return;
        }

        // 管理者権限チェック
        if (route.admin && !this.isAdmin()) {
            console.warn('管理者権限が必要です');
            this.navigate('/dashboard');
            return;
        }

        // 画面を切り替え
        this.showScreen(route.screen);
        
        // タイトルを更新
        this.updateTitle(route.title);
        
        // ハッシュを更新
        if (updateHash) {
            window.location.hash = normalizedPath;
        }
        
        // 現在のルートを保存
        this.currentRoute = normalizedPath;
        
        // ルート固有の初期化処理を実行
        this.initializeScreen(route.screen);
    }

    /**
     * パス正規化
     * @param {string} path - パス
     * @returns {string} - 正規化されたパス
     */
    normalizePath(path) {
        // 先頭のスラッシュを削除
        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        
        // 空の場合はルートに
        if (!path) {
            path = '/';
        }
        
        // 先頭にスラッシュを追加
        return '/' + path;
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

        // 指定された画面を表示
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
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
        // グローバル変数から管理者権限をチェック
        return window.currentUser === 'admin';
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
                if (window.historyScreen && !window.historyScreen.initialized) {
                    window.historyScreen.init();
                }
                break;
            case 'vacationScreen':
                if (window.vacationScreen) {
                    window.vacationScreen.init();
                }
                break;
            case 'adjustmentScreen':
                if (window.adjustmentScreen) {
                    window.adjustmentScreen.init();
                }
                break;
            case 'adminDashboardScreen':
                if (window.adminScreen) {
                    window.adminScreen.initDashboard();
                }
                break;
            case 'adminEmployeesScreen':
                if (window.adminScreen) {
                    window.adminScreen.initEmployees();
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
        }
    }

    /**
     * 現在のルートを取得
     * @returns {string} - 現在のルート
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * ルートが存在するかチェック
     * @param {string} path - パス
     * @returns {boolean} - 存在するかどうか
     */
    hasRoute(path) {
        const normalizedPath = this.normalizePath(path);
        return this.routes.has(normalizedPath);
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
            
            // クリックイベントからパスを取得
            const onclick = link.getAttribute('onclick');
            if (onclick && onclick.includes('router.navigate(')) {
                const match = onclick.match(/router\.navigate\('([^']+)'\)/);
                if (match) {
                    const linkPath = match[1];
                    if (linkPath === currentPath || (linkPath === '/' && currentPath === '/dashboard')) {
                        link.classList.add('active');
                    }
                }
            }
        });
    }
}

// グローバルルーターインスタンスを作成
window.router = new Router();
