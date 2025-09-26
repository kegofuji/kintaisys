/**
 * 管理者画面モジュール
 */
class AdminScreen {
    constructor() {
        this.employeesTableBody = null;
        this.attendanceEmployeeSelect = null;
        this.attendanceMonthSelect = null;
        this.searchAttendanceBtn = null;
        this.adminAttendanceTableBody = null;
        this.approvalsTableBody = null;
        this.reportEmployeeSelect = null;
        this.reportMonthSelect = null;
        this.generateReportBtn = null;
        this.vacationManagementTableBody = null;
        this.monthlySubmissionsTableBody = null;
        this.monthlySubmissionStatusFilter = null;
        this.approvalConfirmModal = null;
        this.approvalConfirmTitle = null;
        this.approvalConfirmMessage = null;
        this.approvalConfirmReasonGroup = null;
        this.approvalConfirmReasonInput = null;
        this.approvalConfirmButton = null;
        this.approvalCancelButton = null;
    }

    /**
     * 表示用の社員名を取得（右上メニューと連動）
     * @param {Object} item
     * @returns {string}
     */
    getDisplayEmployeeName(item) {
        // 全ての社員をemp{ID}形式で表記
        if (item && item.employeeId) {
            return `emp${item.employeeId}`;
        }
        // employeeIdがない場合のフォールバック
        const nameFromTopRight = window.currentUser;
        if (nameFromTopRight && typeof nameFromTopRight === 'string') {
            return nameFromTopRight;
        }
        return 'unknown';
    }

    /**
     * 汎用重複排除
     * @param {Array} items
     * @param {(item:any)=>string} keyFn ユニークキー生成関数
     * @returns {Array}
     */
    dedupeBy(items, keyFn) {
        const seen = new Set();
        const result = [];
        (items || []).forEach((item) => {
            try {
                const key = keyFn(item);
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push(item);
                }
            } catch (_) {}
        });
        return result;
    }

    /**
     * 日付をyyyy/MM/dd形式で整形
     */
    formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd}`;
    }

    /**
     * 日付範囲を整形（同一日の場合は単一表示）
     */
    formatDateRange(start, end) {
        const formattedStart = this.formatDate(start);
        const formattedEnd = this.formatDate(end);
        if (!start || !end || formattedStart === formattedEnd) {
            return formattedStart;
        }
        return `${formattedStart} 〜 ${formattedEnd}`;
    }

    /**
     * 時刻をHH:mm形式で整形
     */
    formatTime(value) {
        if (!value) return '--:--';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * ステータスを日本語に変換
     */
    translateStatus(status) {
        switch ((status || '').toUpperCase()) {
            case 'PENDING':
                return '申請中';
            case 'APPROVED':
                return '承認済';
            case 'REJECTED':
                return '却下';
            case 'CANCELLED':
                return '取消';
            default:
                return status || '-';
        }
    }

    /**
     * テーブルに状態メッセージを表示
     */
    setTableState(tbody, colspan, message, textClass = 'text-muted') {
        if (!tbody) return;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center ${textClass}">${message}</td>
            </tr>
        `;
    }

    /**
     * 同じ行の承認・却下ボタンを取得
     */
    getRowActionButtons(triggerButton) {
        if (!triggerButton) return [];
        const row = triggerButton.closest('tr');
        if (!row) return [triggerButton];
        return Array.from(row.querySelectorAll('.approve-btn, .reject-btn'));
    }

    /**
     * ボタンの活性/非活性をまとめて切り替え
     */
    setButtonsDisabled(buttons, disabled) {
        (buttons || []).forEach(btn => {
            if (btn) {
                btn.disabled = Boolean(disabled);
            }
        });
    }

    /**
     * 管理者ダッシュボード初期化
     */
    initDashboard() {
        // 管理者ダッシュボードの初期化処理
        console.log('管理者ダッシュボードを初期化しました');
    }

    /**
     * 月末申請：対象社員の当月勤怠カレンダーを表示
     * @param {number} employeeId
     * @param {string} employeeName
     * @param {string} yearMonth yyyy-MM
     */
    async showMonthlyHistory(employeeId, employeeName, yearMonth) {
        try {
            // 常に最新の申請月を表示するため、一覧から当該社員の最新年月を取得
            let targetYearMonth = yearMonth;
            try {
                const submissions = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.get('/api/admin/monthly-submissions'),
                    '月末申請一覧の取得に失敗しました'
                );

                if (submissions?.success && Array.isArray(submissions.data)) {
                    const employeeSubs = submissions.data.filter(s => s.employeeId === employeeId);
                    if (employeeSubs.length > 0) {
                        // updatedAt の新しい順、なければ yearMonth の新しい順
                        employeeSubs.sort((a, b) => {
                            const aUpdated = a.updatedAt ? new Date(a.updatedAt) : new Date(`${a.yearMonth}-01T00:00:00`);
                            const bUpdated = b.updatedAt ? new Date(b.updatedAt) : new Date(`${b.yearMonth}-01T00:00:00`);
                            return bUpdated - aUpdated;
                        });
                        targetYearMonth = employeeSubs[0].yearMonth;
                    }
                }
            } catch (e) {
                // 取得失敗時は引数の yearMonth を使用
            }

            // フォールバック（引数も未指定の場合は当月）
            if (!targetYearMonth) {
                const now = new Date();
                targetYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            const [year, monthStr] = targetYearMonth.split('-');
            const month = parseInt(monthStr, 10);

            // 履歴取得
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/history/${employeeId}?year=${year}&month=${month}`),
                '勤怠履歴の取得に失敗しました'
            );

            const calendarTbody = document.getElementById('adminMonthlyCalendarTbody');
            const meta = document.getElementById('adminMonthlyHistoryMeta');
            if (!calendarTbody || !meta) return;

            meta.textContent = `社員: ${employeeName} ／ 対象月: ${targetYearMonth}`;
            calendarTbody.innerHTML = '';

            const records = data?.data ?? [];
            // カレンダーを7列で生成
            const date = new Date(Number(year), month - 1, 1);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const dayToRecord = new Map();
            records.forEach(r => { dayToRecord.set(r.attendanceDate, r); });

            // 当該社員の有給・打刻修正を取得（履歴カレンダー用のバッジ表示）
            let vacationByDate = new Map();
            let adjustmentByDate = new Map();
            try {
                const [vacationsResp, adjustmentsResp] = await Promise.all([
                    // ユーザーAPIだが管理者でも参照用に呼び出し（認可はサーバ側ポリシーに従う）
                    fetchWithAuth
                        .handleApiCall(
                            () => fetchWithAuth.get(`/api/vacation/${employeeId}`),
                            '有給申請の取得に失敗しました'
                        )
                        .catch(() => null),
                    fetchWithAuth
                        .handleApiCall(
                            () => fetchWithAuth.get(`/api/attendance/adjustment/${employeeId}`),
                            '打刻修正申請の取得に失敗しました'
                        )
                        .catch(() => null)
                ]);

                // 有給を対象年月に整形（日付ごとに展開）
                if (Array.isArray(vacationsResp)) {
                    const y = Number(year);
                    const m = Number(month) - 1; // 0-based
                    vacationsResp.forEach(v => {
                        if (!v.startDate || !v.endDate) return;
                        const start = new Date(v.startDate);
                        const end = new Date(v.endDate);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            if (d.getFullYear() === y && d.getMonth() === m) {
                                const status = v.status || 'PENDING';
                                if (status !== 'CANCELLED' && status !== 'REJECTED') {
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    vacationByDate.set(`${d.getFullYear()}-${mm}-${dd}`, status);
                                }
                            }
                        }
                    });
                }

                // 打刻修正（当月のみ抽出）
                if (adjustmentsResp && adjustmentsResp.success && Array.isArray(adjustmentsResp.data)) {
                    const y = Number(year);
                    const m = Number(month) - 1; // 0-based
                    adjustmentsResp.data.forEach(a => {
                        if (!a.targetDate) return;
                        const d = new Date(a.targetDate);
                        if (d.getFullYear() === y && d.getMonth() === m) {
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            adjustmentByDate.set(`${d.getFullYear()}-${mm}-${dd}`, a.status || 'PENDING');
                        }
                    });
                }
            } catch (_ignored) {
                // 取得失敗時はバッジなし
            }

            let row = document.createElement('tr');
            // 先頭空白（日曜=0）
            for (let i = 0; i < firstDay.getDay(); i++) {
                row.appendChild(document.createElement('td'));
            }
            for (let d = 1; d <= lastDay.getDate(); d++) {
                const current = new Date(date.getFullYear(), date.getMonth(), d);
                const yyyy = current.getFullYear();
                const mm = String(current.getMonth() + 1).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                const key = `${yyyy}-${mm}-${dd}`;
                const rec = dayToRecord.get(key);

                const td = document.createElement('td');
                const dayNum = `<div class="fw-bold ${current.getDay()===0?'text-danger':''} ${current.getDay()===6?'text-primary':''}">${d}</div>`;

                let badgesHtml = '';
                const vacationStatus = vacationByDate.get(key);
                if (vacationStatus) {
                    const isApproved = vacationStatus === 'APPROVED';
                    const badgeClass = isApproved ? 'bg-success' : 'bg-warning';
                    const label = isApproved ? '有給承認済' : '有給申請中';
                    badgesHtml += `<div><span class="badge ${badgeClass} badge-sm">${label}</span></div>`;
                }
                const adjStatus = adjustmentByDate.get(key);
                if (adjStatus) {
                    const isApproved = adjStatus === 'APPROVED';
                    const badgeClass = isApproved ? 'bg-success' : 'bg-warning';
                    const label = isApproved ? '打刻修正承認済' : '打刻修正申請中';
                    badgesHtml += `<div><span class="badge ${badgeClass} badge-sm">${label}</span></div>`;
                }

                let detail = '<div class="text-muted">-</div>';
                if (rec) {
                    const ci = rec.clockInTime ? new Date(rec.clockInTime).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}) : '-';
                    const co = rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}) : '-';
                    detail = `<div class="clock-times"><span class="clock-in-time">${ci}</span> - <span class="clock-out-time">${co}</span></div>`;
                }
                td.innerHTML = `${dayNum}${badgesHtml}${detail}`;
                row.appendChild(td);

                if (current.getDay() === 6) {
                    calendarTbody.appendChild(row);
                    row = document.createElement('tr');
                }
            }
            // 末尾の埋め
            if (row.children.length > 0) {
                while (row.children.length < 7) row.appendChild(document.createElement('td'));
                calendarTbody.appendChild(row);
            }

            // モーダル表示
            const modalEl = document.getElementById('adminMonthlyHistoryModal');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 社員管理画面初期化
     */
    initEmployees() {
        this.initializeEmployeeElements();
        this.setupEmployeeEventListeners();
        this.loadEmployees();
    }

    /**
     * 勤怠管理画面初期化
     */
    // 勤怠管理画面は廃止
    initAttendance() {}

    /**
     * 申請承認画面初期化
     */
    initApprovals() {
        console.log('initApprovals 開始');
        this.initializeApprovalElements();
        this.setupApprovalEventListeners();
        this.loadPendingApprovals();
        console.log('initApprovals 完了');
    }

    /**
     * 月末申請管理画面初期化
     */
    initMonthlySubmissions() {
        this.initializeMonthlySubmissionElements();
        this.setupMonthlySubmissionEventListeners();
        this.loadMonthlySubmissions();
    }

    /**
     * レポート出力画面初期化
     */
    initReports() {
        this.initializeReportElements();
        this.setupReportEventListeners();
        this.generateReportMonthOptions();
        this.loadEmployeesForReports();
    }

    /**
     * 有給承認・付与調整画面初期化
     */
    initVacationManagement() {
        this.initializeVacationManagementElements();
        // 承認モーダルを共有するため承認要素も初期化
        this.initializeApprovalElements();
        this.setupVacationManagementEventListeners();
        this.loadVacationManagementData();
    }

    /**
     * 社員管理関連要素の初期化
     */
    initializeEmployeeElements() {
        this.employeesTableBody = document.getElementById('employeesTableBody');
        this.addEmployeeBtn = document.getElementById('addEmployeeBtn');
    }

    /**
     * 勤怠管理関連要素の初期化
     */
    initializeAttendanceElements() {}

    /**
     * 申請承認関連要素の初期化
     */
    initializeApprovalElements() {
        this.approvalsTableBody = document.getElementById('approvalsTableBody');
        this.approvalConfirmModal = document.getElementById('adminApprovalConfirmModal');
        this.approvalConfirmTitle = document.getElementById('adminApprovalConfirmTitle');
        this.approvalConfirmMessage = document.getElementById('adminApprovalConfirmMessage');
        this.approvalConfirmReasonGroup = document.getElementById('adminApprovalReasonGroup');
        this.approvalConfirmReasonInput = document.getElementById('adminApprovalReason');
        this.approvalConfirmButton = document.getElementById('adminApprovalConfirmButton');
        this.approvalCancelButton = document.getElementById('adminApprovalCancelButton');
    }

    /**
     * レポート関連要素の初期化
     */
    initializeReportElements() {
        this.reportEmployeeSelect = document.getElementById('reportEmployeeSelect');
        this.reportMonthSelect = document.getElementById('reportMonthSelect');
        this.generateReportBtn = document.getElementById('generateReportBtn');
    }

    /**
     * 有給管理関連要素の初期化
     */
    initializeVacationManagementElements() {
        this.vacationManagementTableBody = document.getElementById('vacationManagementTableBody');
    }

    /**
     * 月末申請管理要素の初期化
     */
    initializeMonthlySubmissionElements() {
        this.monthlySubmissionsTableBody = document.getElementById('monthlySubmissionsTableBody');
    }

    /**
     * 社員管理イベントリスナー設定
     */
    setupEmployeeEventListeners() {
        // 社員追加ボタン
        const addEmployeeBtn = document.getElementById('addEmployeeBtn');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => this.showAddEmployeeModal());
        }

        // 社員追加フォーム送信ボタン
        const submitAddEmployeeBtn = document.getElementById('submitAddEmployee');
        if (submitAddEmployeeBtn) {
            submitAddEmployeeBtn.addEventListener('click', () => this.submitAddEmployee());
        }

        // 社員追加フォーム送信（Enterキー対応）
        const addEmployeeForm = document.getElementById('addEmployeeForm');
        if (addEmployeeForm) {
            addEmployeeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitAddEmployee();
            });
        }

        // パスワード強度チェックは撤廃

        // 編集・退職処理・削除ボタン（イベント委譲）: アイコン<i>内クリックにも反応するようclosestを使用
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.edit-employee-btn, .deactivate-employee-btn, .delete-employee-btn');
            if (!btn) return;
            if (btn.classList.contains('edit-employee-btn')) {
                const employeeId = btn.getAttribute('data-employee-id');
                this.editEmployee(parseInt(employeeId));
            } else if (btn.classList.contains('deactivate-employee-btn')) {
                const employeeId = btn.getAttribute('data-employee-id');
                this.deactivateEmployee(parseInt(employeeId));
            } else if (btn.classList.contains('delete-employee-btn')) {
                const employeeId = btn.getAttribute('data-employee-id');
                this.deleteEmployee(parseInt(employeeId));
            }
        });
    }

    /**
     * 勤怠管理イベントリスナー設定
     */
    setupAttendanceEventListeners() {}

    /**
     * 申請承認イベントリスナー設定
     */
    setupApprovalEventListeners() {
        // 既存のイベントリスナーを削除（重複防止）
        if (this.approvalEventListener) {
            document.removeEventListener('click', this.approvalEventListener);
        }

        // 承認・却下ボタン（イベント委譲）
        this.approvalEventListener = (e) => {
            const target = e.target.closest('.approve-btn, .reject-btn');
            if (!target) return;

            const action = target.classList.contains('approve-btn') ? 'approve' : 'reject';
            const requestId = target.getAttribute('data-request-id');
            const requestType = target.getAttribute('data-type');

            if (!requestId || !requestType) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            this.handleApprovalAction(action, requestType, requestId, target);
        };

        document.addEventListener('click', this.approvalEventListener);
    }

    /**
     * レポートイベントリスナー設定
     */
    setupReportEventListeners() {
        if (this.generateReportBtn) {
            this.generateReportBtn.addEventListener('click', () => this.generateReport());
        }
    }

    /**
     * 有給管理イベントリスナー設定
     */
    setupVacationManagementEventListeners() {
        // 有給管理のイベントリスナーは必要に応じて追加
    }

    /**
     * 月末申請管理イベントリスナー設定
     */
    setupMonthlySubmissionEventListeners() {
        // フィルター機能は廃止のため、イベントなし
    }

    /**
     * 社員一覧読み込み
     */
    async loadEmployees() {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get('/api/admin/employee-management'),
                '社員一覧の取得に失敗しました'
            );

            if (data.success) {
                this.displayEmployees(data.data);
                // 社員一覧更新後に次の社員番号も更新
                this.updateNextEmployeeNumber();
            } else {
                // フォールバック: emp1 のみ表示
                const mockData = this.generateMockEmployeeData();
                this.displayEmployees(mockData);
            }
        } catch (error) {
            console.error('社員一覧読み込みエラー:', error);
            // エラー時も emp1 のみ
            const mockData = this.generateMockEmployeeData();
            this.displayEmployees(mockData);
        }
    }

    /**
     * モック社員データ生成
     * @returns {Array} - モックデータ
     */
    generateMockEmployeeData() {
        return [
            {
                employeeId: 1,
                employeeCode: 'E001',
                firstName: 'emp1',
                lastName: 'emp1',
                email: 'emp1@example.com',
                hireDate: '2020-04-01',
                isActive: true
            }
        ];
    }

    /**
     * 社員一覧表示
     * @param {Array} employees - 社員データ
     */
    displayEmployees(employees) {
        if (!this.employeesTableBody) return;

        // ヘッダー行を常に表示するため、テーブル本体のみクリア
        this.employeesTableBody.innerHTML = '';

        // 全社員を表示（emp1以外も含む）
        const list = Array.isArray(employees) ? employees : [];

        // データがない場合でも、ヘッダ列のみ表示（空のテーブル本体）
        if (list.length === 0) {
            return;
        }

        list.forEach(employee => {
            const row = document.createElement('tr');
            const statusClass = employee.isActive ? 'text-success' : 'text-secondary';
            const statusText = employee.isActive ? '在籍' : '退職';
            const deactivateText = employee.isActive ? '退職処理' : '復職処理';
            const deactivateClass = employee.isActive ? 'btn-outline-danger' : 'btn-outline-success';
            
            // ユーザー名を取得（UserAccountから取得するか、デフォルト値を使用）
            const username = employee.username || `emp${employee.employeeId}`;
            const displayName = `${employee.lastName || 'ユーザー'} ${employee.firstName || username}`;
            const email = employee.email || `${username}@example.com`;
            const hireDate = employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('ja-JP') : '-';

            // 退職済み社員には有給調整ボタンを表示しない
            const vacationAdjustButton = employee.isActive 
                ? `<button class="btn btn-sm btn-outline-primary me-1 edit-employee-btn" data-employee-id="${employee.employeeId}">
                     <i class="fas fa-hand-holding-medical"></i> 有給調整
                   </button>`
                : '';

            // 退職済み社員には復職処理ボタンも表示しない（通常の業務フローでは復職は稀）
            const deactivateButton = employee.isActive 
                ? `<button class="btn btn-sm ${deactivateClass} deactivate-employee-btn" data-employee-id="${employee.employeeId}">
                     <i class="fas fa-user-times"></i> ${deactivateText}
                   </button>`
                : '';

            // 削除ボタン（全社員に表示）
            const deleteButton = `<button class="btn btn-sm btn-outline-danger me-1 delete-employee-btn" data-employee-id="${employee.employeeId}">
                     <i class="fas fa-trash"></i> 削除
                   </button>`;

            row.innerHTML = `
                <td>${username}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    ${vacationAdjustButton}
                    ${deactivateButton}
                    ${deleteButton}
                </td>
            `;
            this.employeesTableBody.appendChild(row);
        });
    }

    /**
     * 勤怠検索
     */
    async searchAttendance() {}

    /**
     * モック勤怠データ生成
     * @returns {Array} - モックデータ
     */
    generateMockAttendanceData() { return []; }

    /**
     * 勤怠データ表示
     * @param {Array} data - 勤怠データ
     */
    displayAttendanceData(data) {}

    /**
     * 未承認申請読み込み
     */
    async loadPendingApprovals() {
        if (!this.approvalsTableBody) return;

        this.setTableState(this.approvalsTableBody, 6, 'データを読み込み中...', 'text-muted');

        try {
            const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
            const responses = await Promise.all(
                statuses.map(status =>
                    fetchWithAuth
                        .handleApiCall(
                            () => fetchWithAuth.get(`/api/admin/attendance/adjustment/status/${status}`),
                            `打刻修正申請（${status}）の取得に失敗しました`
                        )
                        .catch(() => ({ success: false, data: [] }))
                )
            );

            const list = [];
            statuses.forEach((status, index) => {
                const payload = responses[index];
                if (!payload?.success || !Array.isArray(payload.data)) return;
                payload.data.forEach(item => {
                    list.push({
                        requestId: item.adjustmentRequestId,
                        employeeName: this.getDisplayEmployeeName(item),
                        targetDate: item.targetDate,
                        reason: item.reason || '',
                        newClockIn: item.newClockIn,
                        newClockOut: item.newClockOut,
                        status: status
                    });
                });
            });

            this.renderAdjustmentApprovals(list);
        } catch (error) {
            console.error('打刻修正申請読み込みエラー:', error);
            this.setTableState(this.approvalsTableBody, 6, '打刻修正申請の取得に失敗しました', 'text-danger');
        }
    }

    /**
     * 打刻修正申請一覧を描画
     */
    renderAdjustmentApprovals(entries) {
        if (!this.approvalsTableBody) return;

        this.approvalsTableBody.innerHTML = '';

        if (!Array.isArray(entries) || entries.length === 0) {
            this.setTableState(this.approvalsTableBody, 6, '現在処理すべき打刻修正申請はありません', 'text-muted');
            return;
        }

        // 申請日（targetDate）降順で並べ替え
        entries.sort((a, b) => {
            const dateA = new Date(a.targetDate || 0).getTime();
            const dateB = new Date(b.targetDate || 0).getTime();
            return dateB - dateA;
        });

        entries.forEach(entry => {
            const isPending = (entry.status || '').toUpperCase() === 'PENDING';
            const row = document.createElement('tr');
            if (!isPending) {
                row.classList.add('table-secondary');
            }

            const actionCell = isPending
                ? `
                        <button class="btn btn-sm btn-success me-1 approve-btn" data-request-id="${entry.requestId}" data-type="adjustment">承認</button>
                        <button class="btn btn-sm btn-danger reject-btn" data-request-id="${entry.requestId}" data-type="adjustment">却下</button>
                    `
                : '<span class="text-muted">処理済</span>';

            const content = (entry.newClockIn || entry.newClockOut)
                ? `出勤: ${this.formatTime(entry.newClockIn)}<br>退勤: ${this.formatTime(entry.newClockOut)}`
                : '-';

            row.innerHTML = `
                <td>${entry.employeeName}</td>
                <td>${this.formatDate(entry.targetDate)}</td>
                <td>${entry.reason || '-'}</td>
                <td>${content}</td>
                <td>${this.translateStatus(entry.status)}</td>
                <td>${actionCell}</td>
            `;

            this.approvalsTableBody.appendChild(row);
        });
    }

    /**
     * レポート生成
     */
    async generateReport() {
        const employeeId = this.reportEmployeeSelect?.value;
        const month = this.reportMonthSelect?.value;

        if (!employeeId || !month) {
            this.showAlert('社員と期間を選択してください', 'warning');
            return;
        }

        try {
            // 月末申請が承認済みか確認
            const statusResp = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/monthly-status?employeeId=${employeeId}&yearMonth=${month}`),
                '申請状態の確認に失敗しました'
            );
            const submissionStatus = statusResp?.data?.submissionStatus || statusResp?.submissionStatus;
            if (submissionStatus !== 'APPROVED') {
                this.showAlert('PDF出力は月末申請が承認済の場合のみ可能です', 'warning');
                return;
            }

            // レポート生成APIを呼び出し
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/reports/generate', {
                    employeeId: parseInt(employeeId),
                    yearMonth: month
                }),
                'レポート生成に失敗しました'
            );

            if (data.success && data.pdfUrl) {
                const filename = `attendance_${employeeId}_${month}.pdf`;
                await fetchWithAuth.downloadFile(data.pdfUrl, filename);
                this.showAlert('レポートをダウンロードしました', 'success');
            } else {
                this.showAlert(data.message || 'レポート生成に失敗しました', 'danger');
            }
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 有給管理データ読み込み
     */
    async loadVacationManagementData() {
        if (!this.vacationManagementTableBody) return;

        this.setTableState(this.vacationManagementTableBody, 5, 'データを読み込み中...', 'text-muted');

        try {
            const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
            const responses = await Promise.all(
                statuses.map(status =>
                    fetchWithAuth
                        .handleApiCall(
                            () => fetchWithAuth.get(`/api/admin/vacation/status/${status}`),
                            `有給申請（${status}）の取得に失敗しました`
                        )
                        .catch(() => ({ success: false, data: [] }))
                )
            );

            const list = [];
            statuses.forEach((status, index) => {
                const payload = responses[index];
                if (!payload?.success || !Array.isArray(payload.data)) return;
                payload.data.forEach(item => {
                    list.push({
                        vacationId: item.vacationId,
                        employeeName: this.getDisplayEmployeeName(item),
                        startDate: item.startDate,
                        endDate: item.endDate,
                        reason: item.reason || '',
                        status: status
                    });
                });
            });

            this.renderVacationApprovals(list);
        } catch (error) {
            console.error('有給申請読み込みエラー:', error);
            this.setTableState(this.vacationManagementTableBody, 5, '有給申請の取得に失敗しました', 'text-danger');
        }
    }

    /**
     * 有給申請一覧を描画
     */
    renderVacationApprovals(entries) {
        if (!this.vacationManagementTableBody) return;

        this.vacationManagementTableBody.innerHTML = '';

        if (!Array.isArray(entries) || entries.length === 0) {
            this.setTableState(this.vacationManagementTableBody, 5, '現在処理すべき有給申請はありません', 'text-muted');
            return;
        }

        entries.sort((a, b) => {
            const dateA = new Date(a.startDate || 0).getTime();
            const dateB = new Date(b.startDate || 0).getTime();
            return dateB - dateA;
        });

        entries.forEach(entry => {
            const isPending = (entry.status || '').toUpperCase() === 'PENDING';
            const row = document.createElement('tr');
            if (!isPending) {
                row.classList.add('table-secondary');
            }

            const actionCell = isPending
                ? `
                        <button class="btn btn-sm btn-success me-1 approve-btn" data-request-id="${entry.vacationId}" data-type="vacation">承認</button>
                        <button class="btn btn-sm btn-danger reject-btn" data-request-id="${entry.vacationId}" data-type="vacation">却下</button>
                    `
                : '<span class="text-muted">処理済</span>';

            row.innerHTML = `
                <td>${entry.employeeName}</td>
                <td>${this.formatDateRange(entry.startDate, entry.endDate)}</td>
                <td>${entry.reason || '-'}</td>
                <td>${this.translateStatus(entry.status)}</td>
                <td>${actionCell}</td>
            `;

            this.vacationManagementTableBody.appendChild(row);
        });
    }

    /**
     * 管理者承認・却下処理
     */
    async handleApprovalAction(action, requestType, requestId, triggerButton) {
        const isApprove = action === 'approve';
        const typeLabel = requestType === 'adjustment' ? '打刻修正申請'
            : requestType === 'vacation' ? '有給申請'
            : '申請';

        const confirmOptions = {
            title: `${typeLabel}の${isApprove ? '承認' : '却下'}`,
            message: `${typeLabel}を${isApprove ? '承認' : '却下'}しますか？`,
            confirmLabel: isApprove ? '承認する' : '却下する',
            requireReason: !isApprove
        };

        const dialogResult = await this.promptApprovalDialog(confirmOptions);
        if (!dialogResult.confirmed) {
            return;
        }

        const reason = dialogResult.reason || '';
        const buttons = this.getRowActionButtons(triggerButton);

        try {
            this.setButtonsDisabled(buttons, true);

            if (requestType === 'adjustment') {
                await this.executeAdjustmentAction(isApprove, requestId, reason);
            } else if (requestType === 'vacation') {
                await this.executeVacationAction(isApprove, requestId, reason);
            } else {
                throw new Error('不明な申請種別です');
            }

            const alertType = isApprove ? 'success' : 'warning';
            const alertMessage = `${typeLabel}を${isApprove ? '承認' : '却下'}しました`;
            this.showAlert(alertMessage, alertType);

            if (requestType === 'adjustment') {
                await this.loadPendingApprovals();
            } else if (requestType === 'vacation') {
                await this.loadVacationManagementData();
            }

            await this.refreshEmployeeScreens();
        } catch (error) {
            console.error('承認処理エラー:', error);
            this.showAlert(error.message || `${typeLabel}の処理に失敗しました`, 'danger');
        } finally {
            this.setButtonsDisabled(buttons, false);
        }
    }

    /**
     * 打刻修正申請の承認/却下を実行
     */
    async executeAdjustmentAction(isApprove, requestId, reason) {
        const numericId = Number(requestId);
        if (!Number.isFinite(numericId)) {
            throw new Error('打刻修正申請のIDが不正です');
        }

        if (isApprove) {
            await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post(`/api/admin/attendance/adjustment/approve/${numericId}`),
                '打刻修正申請の承認に失敗しました'
            );
        } else {
            const comment = reason.trim();
            if (!comment) {
                throw new Error('却下理由は必須です');
            }
            const endpoint = `/api/admin/attendance/adjustment/reject/${numericId}?comment=${encodeURIComponent(comment)}`;
            await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post(endpoint),
                '打刻修正申請の却下に失敗しました'
            );
        }
    }

    /**
     * 有給申請の承認/却下を実行
     */
    async executeVacationAction(isApprove, requestId, reason) {
        const numericId = Number(requestId);
        if (!Number.isFinite(numericId)) {
            throw new Error('有給申請のIDが不正です');
        }

        const payload = {
            vacationId: numericId,
            approved: isApprove
        };

        // サーバー側で扱っていなくても、将来的な拡張を見据えて理由を添付
        if (!isApprove) {
            const trimmed = reason.trim();
            if (!trimmed) {
                throw new Error('却下理由は必須です');
            }
            payload.rejectionReason = trimmed;
        }

        await fetchWithAuth.handleApiCall(
            () => fetchWithAuth.post('/api/admin/vacation/approve', payload),
            isApprove ? '有給申請の承認に失敗しました' : '有給申請の却下に失敗しました'
        );
    }

    /**
     * 承認・却下確認ダイアログ
     */
    async promptApprovalDialog({ title, message, confirmLabel, requireReason }) {
        const modalEl = this.approvalConfirmModal;
        const hasModal = modalEl && typeof bootstrap !== 'undefined';

        if (!hasModal) {
            if (requireReason) {
                const reason = prompt(`${message}\n\n却下理由を入力してください。`);
                if (reason === null) {
                    return { confirmed: false };
                }
                const trimmed = reason.trim();
                if (!trimmed) {
                    this.showAlert('却下理由は必須です', 'warning');
                    return { confirmed: false };
                }
                return { confirmed: true, reason: trimmed };
            }
            const confirmed = confirm(message);
            return { confirmed };
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const confirmBtn = this.approvalConfirmButton;
        const cancelBtn = this.approvalCancelButton;
        const reasonGroup = this.approvalConfirmReasonGroup;
        const reasonInput = this.approvalConfirmReasonInput;
        const titleElement = this.approvalConfirmTitle;
        const messageElement = this.approvalConfirmMessage;

        if (titleElement) titleElement.textContent = title || '確認';
        if (messageElement) messageElement.textContent = message || '';
        if (confirmBtn) confirmBtn.textContent = confirmLabel || '実行する';

        if (reasonGroup) {
            reasonGroup.style.display = requireReason ? 'block' : 'none';
        }
        if (reasonInput) {
            reasonInput.value = '';
            reasonInput.classList.remove('is-invalid');
        }

        return await new Promise((resolve) => {
            let resolved = false;

            const finalize = (result) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(result);
            };

            const onInput = () => {
                if (reasonInput) {
                    reasonInput.classList.remove('is-invalid');
                }
            };

            const onConfirm = () => {
                if (requireReason) {
                    const reason = reasonInput?.value?.trim() || '';
                    if (!reason) {
                        if (reasonInput) {
                            reasonInput.classList.add('is-invalid');
                            reasonInput.focus();
                        }
                        return;
                    }
                    modal.hide();
                    finalize({ confirmed: true, reason });
                    return;
                }
                modal.hide();
                finalize({ confirmed: true, reason: '' });
            };

            const onCancel = () => {
                modal.hide();
                finalize({ confirmed: false });
            };

            const onHidden = () => {
                finalize({ confirmed: false });
            };

            const cleanup = () => {
                confirmBtn?.removeEventListener('click', onConfirm);
                cancelBtn?.removeEventListener('click', onCancel);
                modalEl.removeEventListener('hidden.bs.modal', onHidden);
                reasonInput?.removeEventListener('input', onInput);
            };

            confirmBtn?.addEventListener('click', onConfirm);
            cancelBtn?.addEventListener('click', onCancel);
            modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
            reasonInput?.addEventListener('input', onInput);

            modal.show();
        });
    }

    /**
     * 社員編集
     * @param {number} employeeId - 社員ID
     */
    editEmployee(employeeId) {
        // 有給調整ダイアログ
        const deltaStr = prompt('有給日数の増減を入力してください（例: +2 または -1。単位: 日）');
        if (deltaStr === null) return;
        const normalized = (deltaStr || '').trim();
        if (!/^[-+]?\d+$/.test(normalized)) {
            this.showAlert('整数で入力してください（例: +1, -2）', 'warning');
            return;
        }
        const delta = parseInt(normalized, 10);
        if (delta === 0) {
            this.showAlert('0日は処理不要です', 'info');
            return;
        }
        const reason = prompt('調整理由を入力してください（必須）');
        if (reason === null || !reason.trim()) {
            this.showAlert('調整理由は必須です', 'warning');
            return;
        }
        this.adjustVacationBalance(employeeId, delta, reason.trim());
    }

    /**
     * 社員退職処理
     * @param {number} employeeId - 社員ID
     */
    async deactivateEmployee(employeeId) {
        if (confirm('この社員を退職処理しますか？')) {
            try {
                const data = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.put(`/api/admin/employee-management/${employeeId}/deactivate`),
                    '退職処理に失敗しました'
                );

                this.showAlert(data.message, 'success');
                await this.loadEmployees();
                // 社員一覧更新後に次の社員番号も更新
                this.updateNextEmployeeNumber();
            } catch (error) {
                this.showAlert(error.message, 'danger');
            }
        }
    }

    /**
     * 社員削除
     * @param {number} employeeId - 社員ID
     */
    async deleteEmployee(employeeId) {
        if (confirm('この社員を完全に削除しますか？この操作は取り消せません。')) {
            try {
                const data = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.delete(`/api/admin/employee-management/${employeeId}`),
                    '社員削除に失敗しました'
                );

                this.showAlert(data.message, 'success');
                await this.loadEmployees();
                // 社員一覧更新後に次の社員番号も更新
                this.updateNextEmployeeNumber();
            } catch (error) {
                this.showAlert(error.message, 'danger');
            }
        }
    }

    /**
     * 勤怠編集
     * @param {number} attendanceId - 勤怠ID
     */
    editAttendance(attendanceId) {
        this.showAlert(`勤怠ID ${attendanceId} の編集機能は実装中です`, 'info');
    }


    /**
     * 勤怠管理用月選択オプション生成
     */
    generateAttendanceMonthOptions() {
        if (!this.attendanceMonthSelect) return;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        // 現在年から過去3年分の1-12月を生成
        for (let year = currentYear; year >= currentYear - 2; year--) {
            for (let month = 12; month >= 1; month--) {
                const monthStr = String(month).padStart(2, '0');
                const value = `${year}-${monthStr}`;
                const label = `${year}/${monthStr}`;

                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                this.attendanceMonthSelect.appendChild(option);
            }
        }
    }

    /**
     * レポート用月選択オプション生成
     */
    generateReportMonthOptions() {
        if (!this.reportMonthSelect) return;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        // 現在年から過去3年分の1-12月を生成
        for (let year = currentYear; year >= currentYear - 2; year--) {
            for (let month = 12; month >= 1; month--) {
                const monthStr = String(month).padStart(2, '0');
                const value = `${year}-${monthStr}`;
                const label = `${year}/${monthStr}`;

                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                this.reportMonthSelect.appendChild(option);
            }
        }
    }

    /**
     * 勤怠管理用社員リスト読み込み
     */
    async loadEmployeesForAttendance() {
        // 社員一覧を取得してセレクトボックスに設定
        // 実装は必要に応じて追加
    }

    /**
     * レポート用社員リスト読み込み
     */
    async loadEmployeesForReports() {
        // 社員一覧を取得してセレクトボックスに設定
        // 実装は必要に応じて追加
    }

    /**
     * 勤怠履歴画面のカレンダーを更新
     */
    async refreshHistoryCalendar() {
        try {
            // 勤怠履歴画面が存在する場合のみ更新
            if (window.historyScreen && typeof window.historyScreen.loadCalendarData === 'function') {
                await window.historyScreen.loadCalendarData();
                if (typeof window.historyScreen.generateCalendar === 'function') {
                    window.historyScreen.generateCalendar();
                }
            }
            
            // 旧カレンダー画面も更新（存在する場合）
            if (window.calendarScreen && typeof window.calendarScreen.loadCalendarData === 'function') {
                await window.calendarScreen.loadCalendarData();
                if (typeof window.calendarScreen.generateCalendar === 'function') {
                    window.calendarScreen.generateCalendar();
                }
            }
        } catch (error) {
            console.warn('勤怠履歴カレンダーの更新に失敗しました:', error);
        }
    }

    /**
     * 社員側の画面を更新（リアルタイム反映）
     */
    async refreshEmployeeScreens() {
        try {
            console.log('社員側画面の更新を開始します');

            const hasEmployeeContext = window.currentEmployeeId !== undefined && window.currentEmployeeId !== null;
            
            // 勤怠履歴画面の更新
            if (hasEmployeeContext && window.historyScreen) {
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
            
            // カレンダー画面の更新
            if (hasEmployeeContext && window.calendarScreen) {
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
            
            // 有給申請画面の残有給日数更新
            if (hasEmployeeContext && window.vacationScreen) {
                console.log('有給申請画面の残有給日数を更新中...');
                try {
                    if (typeof window.vacationScreen.loadRemainingVacationDays === 'function') {
                        await window.vacationScreen.loadRemainingVacationDays();
                    }
                    console.log('有給申請画面の更新完了');
                } catch (error) {
                    console.warn('有給申請画面の更新に失敗:', error);
                }
            }
            
            // ダッシュボード画面の更新
            if (hasEmployeeContext && window.dashboardScreen) {
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
            
            console.log('社員側画面の更新が完了しました');
        } catch (error) {
            console.warn('社員側画面の更新に失敗しました:', error);
        }
    }

    /**
     * 却下理由入力モーダル表示
     * @returns {Promise<string|null>} 入力された理由またはnull（キャンセル時）
     */
    showRejectionReasonModal() {
        return new Promise((resolve) => {
            // 既存のモーダルを削除
            const existingModal = document.getElementById('rejectionReasonModal');
            if (existingModal) {
                existingModal.remove();
            }

            // モーダルHTMLを作成
            const modalHtml = `
                <div class="modal fade" id="rejectionReasonModal" tabindex="-1" aria-labelledby="rejectionReasonModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="rejectionReasonModalLabel">却下理由を入力してください(必須)</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="rejectionReasonInput" class="form-label">却下理由</label>
                                    <textarea class="form-control" id="rejectionReasonInput" rows="3" placeholder="例:申請内容に不備があります、勤務時間が妥当ではありません など"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
                                <button type="button" class="btn btn-primary" id="confirmRejectionBtn">OK</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // モーダルをDOMに追加
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // モーダルを表示
            const modalElement = document.getElementById('rejectionReasonModal');
            if (modalElement && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();

                // イベントリスナーを設定
                const confirmBtn = document.getElementById('confirmRejectionBtn');
                const cancelBtn = modalElement.querySelector('[data-bs-dismiss="modal"]');
                const input = document.getElementById('rejectionReasonInput');

                // 確認ボタンクリック
                confirmBtn.addEventListener('click', () => {
                    const reason = input.value.trim();
                    modal.hide();
                    resolve(reason);
                });

                // キャンセルボタンクリック
                cancelBtn.addEventListener('click', () => {
                    modal.hide();
                    resolve(null);
                });

                // モーダルが閉じられた時の処理
                modalElement.addEventListener('hidden.bs.modal', () => {
                    modalElement.remove();
                });

                // エンターキーで確認
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        confirmBtn.click();
                    }
                });

                // フォーカスを入力フィールドに
                setTimeout(() => {
                    input.focus();
                }, 300);
            } else {
                // Bootstrapが利用できない場合はpromptにフォールバック
                const reason = prompt('却下理由を入力してください（必須）\n\n例：申請内容に不備があります、勤務時間が妥当ではありません など');
                resolve(reason);
            }
        });
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

    // ここから下の従来の編集モーダル系は廃止（有給調整に置換）

    /**
     * 社員情報更新
     * @param {number} employeeId - 従業員ID
     * @param {Object} updateData - 更新データ
     */
    async updateEmployee(employeeId, updateData) {
        try {
            const response = await fetch(`/api/admin/employees/${employeeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.showAlert('社員情報を更新しました', 'success');
                this.loadEmployees();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || '社員情報の更新に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('社員情報更新エラー:', error);
            this.showAlert('社員情報の更新中にエラーが発生しました', 'danger');
        }
    }

    /**
     * 有給残高調整
     * @param {number} employeeId
     * @param {number} deltaDays 正負の整数（日）
     * @param {string} reason 理由
     */
    async adjustVacationBalance(employeeId, deltaDays, reason) {
        try {
            const payload = { employeeId, deltaDays, reason };
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/admin/vacation/adjust', payload),
                '有給残高の調整に失敗しました'
            );

            if (data && (data.success === true || data.status === 'OK')) {
                this.showAlert('有給残高を調整しました', 'success');
            } else {
                this.showAlert((data && data.message) || '有給残高の調整に失敗しました', 'danger');
            }
            // 画面の残数表示があれば再取得するが、一覧には残数列がないためスキップ
        } catch (error) {
            console.error('有給調整エラー:', error);
            this.showAlert('有給残高の調整中にエラーが発生しました', 'danger');
        }
    }

    // 復職/退職はAPIに一本化（上の async deactivateEmployee を使用）

    /**
     * 次の社員番号を取得
     */
    async getNextEmployeeNumber() {
        try {
            const response = await fetch('/api/admin/employee-management/next-number');
            if (response.ok) {
                const data = await response.json();
                return data.nextNumber || '1';
            }
        } catch (error) {
            console.error('次の社員番号の取得に失敗:', error);
        }
        return '1'; // デフォルト値
    }

    /**
     * 次の社員番号を更新（社員一覧更新時に呼び出し）
     */
    async updateNextEmployeeNumber() {
        try {
            const nextNumber = await this.getNextEmployeeNumber();
            console.log('次の社員番号を取得:', nextNumber);
            const usernameField = document.getElementById('employeeUsername');
            if (usernameField) {
                usernameField.value = nextNumber;
                console.log('ユーザー名フィールドを更新:', nextNumber);
            } else {
                console.warn('ユーザー名フィールドが見つかりません');
            }
        } catch (error) {
            console.error('次の社員番号の更新に失敗:', error);
        }
    }

    /**
     * 社員追加モーダル表示
     */
    async showAddEmployeeModal() {
        // フォームをリセット
        const form = document.getElementById('addEmployeeForm');
        if (form) {
            form.reset();
        }

        // 次の社員番号を取得して表示
        try {
            const nextNumber = await this.getNextEmployeeNumber();
            console.log('モーダル表示時の次の社員番号:', nextNumber);
            const usernameField = document.getElementById('employeeUsername');
            if (usernameField) {
                usernameField.value = nextNumber;
                console.log('モーダル内のユーザー名フィールドを更新:', nextNumber);
            } else {
                console.warn('モーダル内のユーザー名フィールドが見つかりません');
            }
        } catch (error) {
            console.error('次の社員番号の取得に失敗:', error);
        }

        // パスワード強度表示は撤廃

        // モーダルを表示
        const modal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
        modal.show();
    }

    /**
     * パスワード強度機能は撤廃
     */

    /**
     * 社員追加フォーム送信
     */
    async submitAddEmployee() {
        const form = document.getElementById('addEmployeeForm');
        if (!form) return;

        const formData = new FormData(form);
        const employeeData = {
            username: 'emp', // ユーザー名はempで固定（バックエンドで自動採番）
            password: formData.get('password')?.trim()
        };

        // バリデーション
        if (!employeeData.password) {
            this.showAlert('パスワードは必須です', 'warning');
            return;
        }
        if (employeeData.password.length < 4) {
            this.showAlert('パスワードは4文字以上で入力してください', 'warning');
            return;
        }
        
        // パスワード強度チェックは撤廃

        // 送信ボタンを無効化
        const submitBtn = document.getElementById('submitAddEmployee');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 追加中...';
        }

        try {
            const result = await this.addEmployee(employeeData);
            if (result.success) {
                // 成功時はモーダルを閉じてリストを更新
                const modal = bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'));
                if (modal) {
                    modal.hide();
                }
                this.showAlert(result.message || '社員を追加しました', 'success');
                this.loadEmployees(); // リストを再読み込み
            } else {
                this.showAlert(result.message || '社員の追加に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('社員追加エラー:', error);
            // より詳細なエラーメッセージを表示
            const errorMessage = error.message || '社員の追加中にエラーが発生しました';
            this.showAlert(`エラー: ${errorMessage}`, 'danger');
        } finally {
            // 送信ボタンを有効化
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> 社員を追加';
            }
        }
    }

    /**
     * 社員追加
     * @param {Object} employeeData - 社員データ
     */
    async addEmployee(employeeData) {
        try {
            const response = await fetch('/api/admin/employee-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(employeeData)
            });

            let data = {};
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('JSON解析エラー:', parseError);
                throw new Error('サーバーからの応答を解析できませんでした');
            }
            
            if (response.ok) {
                return data;
            } else {
                // より詳細なエラーメッセージを提供
                const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('社員追加エラー:', error);
            // ネットワークエラーの場合
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('サーバーに接続できません。ネットワーク接続を確認してください。');
            }
            throw error;
        }
    }

}

// グローバルインスタンスを作成
window.adminScreen = new AdminScreen();
