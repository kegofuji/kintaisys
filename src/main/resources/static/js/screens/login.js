/**
 * ログイン画面モジュール
 */
class LoginScreen {
    constructor() {
        this.loginForm = null;
        this.usernameInput = null;
        this.passwordInput = null;
        this.passwordStrengthIndicator = null;
        this.passwordStrengthText = null;
        this.passwordRequirements = null;
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.checkSession();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.passwordStrengthIndicator = document.getElementById('passwordStrengthIndicator');
        this.passwordStrengthText = document.getElementById('passwordStrengthText');
        this.passwordRequirements = document.getElementById('passwordRequirements');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (this.passwordInput && this.usernameInput) {
            this.passwordInput.addEventListener('input', () => {
                this.checkPasswordStrength(this.passwordInput.value, this.usernameInput.value);
            });

            this.usernameInput.addEventListener('input', () => {
                if (this.passwordInput.value) {
                    this.checkPasswordStrength(this.passwordInput.value, this.usernameInput.value);
                }
            });
        }
    }

    /**
     * セッション確認
     */
    async checkSession() {
        try {
            const response = await fetchWithAuth.get('/api/auth/session');
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    // 既にログイン済みの場合はダッシュボードに遷移
                    window.currentUser = data.username;
                    
                    // 管理者の場合はadminId、従業員の場合はemployeeIdを使用
                    let userId = data.employeeId;
                    if (data.role === 'ADMIN') {
                        userId = data.adminId;
                        console.log('管理者セッション確認 - adminId:', userId, '型:', typeof userId);
                    } else {
                        console.log('従業員セッション確認 - employeeId:', userId, '型:', typeof userId);
                    }
                    
                    window.currentEmployeeId = userId;
                    console.log('Session found, username:', data.username, 'userId:', userId, 'role:', data.role);
                    
                    // アプリケーションのユーザー情報を更新
                    if (window.app) {
                        window.app.updateUserInfo(data.username, userId);
                    }
                    
                    this.showMainInterface();
                    
                    // ダッシュボードを再初期化
                    if (window.dashboardScreen) {
                        window.dashboardScreen.init();
                    }
                    return;
                }
            }
        } catch (error) {
            console.error('セッション確認エラー:', error);
        }

        // ログイン画面を表示
        this.showLoginInterface();
    }

    /**
     * ログイン処理
     * @param {Event} e - イベント
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        
        if (!username || !password) {
            this.showAlert('ユーザー名とパスワードを入力してください', 'warning');
            return;
        }

        try {
            const response = await fetchWithAuth.post('/api/auth/login', { username, password });
            const data = await response.json();
            
            if (data.success) {
                window.currentUser = data.username;
                window.currentEmployeeId = data.employeeId;
                window.currentRole = data.role;
                console.log('Login successful, username:', data.username, 'employeeId:', data.employeeId, 'role:', data.role);
                
                // アプリケーションのユーザー情報を更新
                if (window.app) {
                    window.app.updateUserInfo(data.username, data.employeeId);
                }
                
                this.showAlert('ログインしました', 'success');
                this.showMainInterface();
                
                // ダッシュボードを再初期化
                if (window.dashboardScreen) {
                    window.dashboardScreen.init();
                }
                
                // ロールに応じてリダイレクト先を決定
                let redirectPath;
                if (data.role === 'ADMIN') {
                    redirectPath = '/admin';
                } else {
                    redirectPath = fetchWithAuth.getRedirectAfterLogin();
                }
                router.navigate(redirectPath);
            } else {
                this.showAlert(data.message || 'ログインに失敗しました', 'danger');
            }
        } catch (error) {
            console.error('ログインエラー:', error);
            this.showAlert('ログイン処理中にエラーが発生しました', 'danger');
        }
    }

    /**
     * ログイン画面表示
     */
    showLoginInterface() {
        const loginContainer = document.getElementById('loginContainer');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loginContainer && mainContainer) {
            loginContainer.style.display = 'block';
            mainContainer.style.display = 'none';
        }

        if (window.router && typeof window.router.navigate === 'function') {
            window.router.navigate('/login', { updateHistory: true, replace: true });
        }
    }

    /**
     * メイン画面表示
     */
    showMainInterface() {
        const loginContainer = document.getElementById('loginContainer');
        const mainContainer = document.getElementById('mainContainer');
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        
        if (loginContainer && mainContainer) {
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'block';
        }

        if (currentUserDisplay) {
            const username = window.currentUser;
            const employeeId = window.currentEmployeeId;
            // 管理者は常に固定表示
            if (window.isAdmin === true || username === 'admin') {
                currentUserDisplay.textContent = '管理者';
                return;
            }
            if (employeeId != null) {
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
            } else {
                const fallback = employeeId != null ? `emp${employeeId}` : (username || 'ユーザー');
                currentUserDisplay.textContent = fallback || 'ユーザー';
            }
        }

        // 管理者メニューの表示/非表示を制御
        router.toggleAdminMenu(window.currentUser === 'admin');
    }

    /**
     * パスワード強度チェック
     * @param {string} password - パスワード
     * @param {string} username - ユーザー名
     */
    checkPasswordStrength(password, username) {
        if (!this.passwordStrengthIndicator || !this.passwordStrengthText || !this.passwordRequirements) {
            return;
        }

        if (!password) {
            this.passwordStrengthIndicator.style.display = 'none';
            return;
        }

        this.passwordStrengthIndicator.style.display = 'block';

        // バリデーション結果を取得
        const validation = this.validatePassword(password, username);
        const strength = this.calculatePasswordStrength(validation);

        // 強度表示を更新
        this.updateStrengthDisplay(strength);
        this.updateRequirementsDisplay(validation);
    }

    /**
     * パスワードバリデーション
     * @param {string} password - パスワード
     * @param {string} username - ユーザー名
     * @returns {Object} - バリデーション結果
     */
    validatePassword(password, username) {
        return {
            length: password.length >= 4,
            notSameAsUsername: password !== username
        };
    }

    /**
     * パスワード強度計算
     * @param {Object} validation - バリデーション結果
     * @returns {string} - 強度レベル
     */
    calculatePasswordStrength(validation) {
        let score = 0;
        const totalChecks = 2;

        Object.values(validation).forEach(isValid => {
            if (isValid) score++;
        });

        if (score < 2) return 'weak';
        return 'strong';
    }

    /**
     * 強度表示を更新
     * @param {string} strength - 強度レベル
     */
    updateStrengthDisplay(strength) {
        this.passwordStrengthText.textContent = `強度: ${strength === 'weak' ? '弱' : strength === 'medium' ? '中' : '強'}`;
        this.passwordStrengthText.className = `badge password-strength-${strength}`;
    }

    /**
     * 要件表示を更新
     * @param {Object} validation - バリデーション結果
     */
    updateRequirementsDisplay(validation) {
        const requirements = [
            { text: '4文字以上', valid: validation.length },
            { text: 'ユーザーIDと異なる', valid: validation.notSameAsUsername }
        ];

        this.passwordRequirements.innerHTML = requirements.map(req => 
            `<div class="password-requirement ${req.valid ? 'valid' : 'invalid'}">
                <i class="fas fa-${req.valid ? 'check' : 'times'} me-1"></i>${req.text}
            </div>`
        ).join('');
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
window.loginScreen = new LoginScreen();
