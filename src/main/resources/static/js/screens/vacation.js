/**
 * 休暇申請画面モジュール
 * Version: 2024-10-13-1030
 */
class VacationScreen {
    constructor() {
        this.vacationForm = null;
        this.vacationStartDate = null;
        this.vacationEndDate = null;
        this.vacationReason = null;
        this.leaveTypeSelect = null;
        this.balanceSummary = null;
        this.validityInfo = null;
        this.validityDetails = null;
        this.paidLeaveRemaining = null;
        this.paidLeaveValidity = null;
        this.summerLeaveRemaining = null;
        this.winterLeaveRemaining = null;
        this.specialLeaveRemaining = null;
        this.summerValidity = null;
        this.winterValidity = null;
        this.specialValidity = null;
        this.reasonLabel = null;
        this.reasonRequiredMark = null;
        this.specialNotice = null;
        this.prefillCancelButton = null;
        this.formTitle = null;
        this.refreshLeaveBalanceButton = null;
        this.reasonTouched = false;
        this.validationAttempted = false;

        this.listenersBound = false;
        this.remainingByType = {};
        this.activeGrantsByType = new Map();
        this.workPatternData = null; // 勤務時間変更申請データ

        this.leaveTypeDisplayMap = {
            PAID_LEAVE: '有休',
            SUMMER: '夏季休暇',
            WINTER: '冬季休暇',
            SPECIAL: '特別休暇'
        };

        this.timeUnitDisplayMap = {
            FULL_DAY: '',
            HALF_AM: 'AM有休',
            HALF_PM: 'PM有休'
        };
    }

    /**
     * 初期化処理
     */
    async init() {
        this.initializeElements();
        this.setupEventListeners();
        const navigationPrefill = typeof window.consumeNavigationPrefill === 'function'
            ? window.consumeNavigationPrefill('/vacation')
            : null;
        const pathPrefill = this.extractDateFromPath();
        const hasNavigationPrefill = Boolean(navigationPrefill && (navigationPrefill.startDate || navigationPrefill.date));
        const hasPathPrefill = Boolean(pathPrefill);

        this.clearPrefillState();
        if (hasNavigationPrefill) {
            this.applyNavigationPrefill(navigationPrefill);
        } else if (hasPathPrefill) {
            this.applyPathPrefill(pathPrefill);
        }

        await this.loadAllSupportingData();
        
        // ブラウザの初期化完了後に再度空白を確実に設定 (ナビゲーションプレフィル時は保持)
        setTimeout(() => {
            if (!(hasNavigationPrefill || hasPathPrefill)) {
                this.clearPrefillState();
            }
        }, 100);
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.vacationForm = document.getElementById('vacationForm');
        this.vacationStartDate = document.getElementById('vacationStartDate');
        this.vacationEndDate = document.getElementById('vacationEndDate');
        this.vacationReason = document.getElementById('vacationReason');
        this.leaveTypeSelect = document.getElementById('vacationTypeSelect');
        this.balanceSummary = document.getElementById('vacationBalanceSummary');
        this.validityInfo = document.getElementById('vacationValidityInfo');
        this.validityDetails = document.getElementById('validityDetails');
        this.paidLeaveRemaining = document.getElementById('paidLeaveRemaining');
        this.paidLeaveValidity = document.getElementById('paidLeaveValidity');
        this.summerLeaveRemaining = document.getElementById('summerLeaveRemaining');
        this.winterLeaveRemaining = document.getElementById('winterLeaveRemaining');
        this.specialLeaveRemaining = document.getElementById('specialLeaveRemaining');
        this.summerValidity = document.getElementById('summerValidity');
        this.winterValidity = document.getElementById('winterValidity');
        this.specialValidity = document.getElementById('specialValidity');
        this.reasonLabel = document.getElementById('vacationReasonLabel');
        this.reasonRequiredMark = document.getElementById('vacationReasonRequiredMark');
        this.specialNotice = document.getElementById('vacationSpecialNotice');
        this.prefillCancelButton = document.getElementById('vacationFormCancel');
        this.resetButton = document.getElementById('vacationFormResetBtn');
        this.formTitle = document.getElementById('vacationFormTitle');
        this.refreshLeaveBalanceButton = document.getElementById('refreshLeaveBalance');

        // 要素が取得できた直後に空白を設定（ブラウザのデフォルト値を上書き）
        if (this.vacationStartDate) {
            this.vacationStartDate.value = '';
        }
        if (this.vacationEndDate) {
            this.vacationEndDate.value = '';
        }
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.listenersBound) return;

        if (this.vacationForm) {
            this.vacationForm.addEventListener('submit', (e) => this.handleVacationSubmit(e));
        }

        if (this.leaveTypeSelect) {
            this.leaveTypeSelect.addEventListener('change', () => this.handleLeaveTypeChange());
        }

        if (this.vacationStartDate) {
            this.vacationStartDate.addEventListener('change', () => this.syncEndDateIfNeeded());
        }

        if (this.vacationEndDate) {
            this.vacationEndDate.addEventListener('change', () => this.handleDateRangeChange());
        }

        if (this.refreshLeaveBalanceButton) {
            this.refreshLeaveBalanceButton.addEventListener('click', () => this.handleRefreshLeaveBalance());
        }

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetForm());
        }

        const resetValidity = (input) => {
            if (!input) return;
            const handler = () => this.setValidity(input, true);
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        };
        resetValidity(this.vacationStartDate);
        resetValidity(this.vacationEndDate);
        resetValidity(this.vacationReason);

        if (this.vacationReason) {
            this.vacationReason.addEventListener('input', () => {
                this.reasonTouched = true;
                this.updateReasonValidity();
            });
        }

        this.listenersBound = true;
    }

    /**
     * フォームリセット
     */
    resetForm() {
        if (this.vacationForm) {
            this.vacationForm.reset();
        }
        this.clearPrefillState();
    }

    /**
     * プレフィル解除
     */
    clearPrefillState() {
        if (this.formTitle) {
            this.formTitle.textContent = '休暇申請';
        }
        if (this.prefillCancelButton) {
            this.prefillCancelButton.style.display = 'none';
            this.prefillCancelButton.onclick = null;
        }
        if (this.vacationStartDate) {
            this.vacationStartDate.value = '';
        }
        if (this.vacationEndDate) {
            this.vacationEndDate.value = '';
        }
        if (this.leaveTypeSelect) {
            // 先頭の利用可能な選択肢を選択
            const availableOption = Array.from(this.leaveTypeSelect.options).find((opt) => !opt.disabled);
            if (availableOption) {
                this.leaveTypeSelect.value = availableOption.value;
            }
        }
        this.validationAttempted = false;
        this.reasonTouched = false;
        this.setValidity(this.vacationStartDate, true);
        this.setValidity(this.vacationEndDate, true);
        this.setValidity(this.vacationReason, true);
        this.handleLeaveTypeChange();
    }

    extractDateFromPath() {
        try {
            if (window.router && typeof window.router.getCurrentRouteParams === 'function') {
                const params = window.router.getCurrentRouteParams();
                const candidate = params && params.date ? this.normalizeDateString(params.date) : '';
                if (candidate) {
                    return candidate;
                }
            }
            const path = window.location?.pathname || '';
            const match = path.match(/^\/vacation\/(\d{4}-\d{2}-\d{2})$/);
            if (match && match[1]) {
                return this.normalizeDateString(match[1]);
            }
        } catch (error) {
            console.warn('Failed to extract vacation date from path:', error);
        }
        return '';
    }

    applyPathPrefill(dateString) {
        const normalized = this.normalizeDateString(dateString);
        if (!normalized) {
            return;
        }
        if (this.vacationStartDate) {
            this.vacationStartDate.value = normalized;
            this.setValidity(this.vacationStartDate, true);
            this.vacationStartDate.dispatchEvent(new Event('change'));
        }
        if (this.vacationEndDate) {
            this.vacationEndDate.value = '';
            this.setValidity(this.vacationEndDate, true);
        }
        if (this.prefillCancelButton) {
            this.prefillCancelButton.style.display = 'none';
            this.prefillCancelButton.onclick = null;
        }
        this.handleLeaveTypeChange();
    }

    /**
     * プレフィル
     */
    prefillForm({ startDate, endDate, reason, leaveType, timeUnit }) {
        if (!this.vacationForm) {
            this.init();
        }

        this.clearPrefillState();

        if (leaveType && timeUnit && this.leaveTypeSelect) {
            const candidate = `${leaveType}:${timeUnit}`;
            if (Array.from(this.leaveTypeSelect.options).some((opt) => opt.value === candidate)) {
                this.leaveTypeSelect.value = candidate;
            }
        }

        if (startDate && this.vacationStartDate) {
            this.vacationStartDate.value = this.normalizeDateString(startDate);
        }

        if (endDate && this.vacationEndDate) {
            this.vacationEndDate.value = this.normalizeDateString(endDate);
        }

        if (this.vacationReason) {
            this.vacationReason.value = reason || '';
        }
        this.validationAttempted = false;
        this.reasonTouched = !!(reason && reason.trim().length > 0);
        this.setValidity(this.vacationStartDate, true);
        this.setValidity(this.vacationEndDate, true);
        this.setValidity(this.vacationReason, true);

        if (this.formTitle) {
            this.formTitle.textContent = '休暇申請の再申請';
        }

        if (this.prefillCancelButton) {
            this.prefillCancelButton.style.display = 'inline-block';
            this.prefillCancelButton.onclick = () => {
                this.vacationForm?.reset();
                this.clearPrefillState();
            };
        }

        this.handleLeaveTypeChange();
    }

    applyNavigationPrefill(prefill = {}) {
        const startDate = this.normalizeDateString(prefill.startDate || prefill.date);
        const endDate = this.normalizeDateString(prefill.endDate);
        if (!startDate) {
            return;
        }
        if (this.vacationStartDate) {
            this.vacationStartDate.value = startDate;
            this.setValidity(this.vacationStartDate, true);
            // changeイベントを発火して依存UIを更新
            this.vacationStartDate.dispatchEvent(new Event('change'));
        }
        if (this.vacationEndDate) {
            if (endDate) {
                this.vacationEndDate.value = endDate;
                this.setValidity(this.vacationEndDate, true);
                this.vacationEndDate.dispatchEvent(new Event('change'));
            } else {
                this.vacationEndDate.value = '';
                this.setValidity(this.vacationEndDate, true);
            }
        }
        if (this.formTitle) {
            this.formTitle.textContent = '休暇申請';
        }
        if (this.prefillCancelButton) {
            this.prefillCancelButton.style.display = 'none';
            this.prefillCancelButton.onclick = null;
        }
        this.handleLeaveTypeChange();
    }

    /**
     * 補助データの読み込み
     */
    async loadAllSupportingData() {
        if (!window.currentEmployeeId) {
            return;
        }
        await Promise.all([
            this.loadRemainingVacationDays(),
            this.loadActiveGrants(),
            this.loadWorkPatternData()
        ]);
        this.updateLeaveTypeAvailability();
        this.handleLeaveTypeChange();
    }

    /**
     * 勤務時間変更申請データの読み込み
     */
    async loadWorkPatternData() {
        if (!window.currentEmployeeId) {
            return;
        }

        try {
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/work-pattern-change/requests/${window.currentEmployeeId}`),
                '勤務時間変更申請の取得に失敗しました'
            );
            
            this.workPatternData = Array.isArray(response?.data) ? response.data : [];
            console.log('勤務時間変更申請データを読み込みました:', this.workPatternData);
        } catch (error) {
            console.error('勤務時間変更申請データの読み込みエラー:', error);
            this.workPatternData = [];
        }
    }

    /**
     * 残休暇日数読み込み
     */
    async loadRemainingVacationDays() {
        if (!window.currentEmployeeId) {
            console.error('window.currentEmployeeIdが設定されていません:', window.currentEmployeeId);
            return;
        }

        console.log('休暇残数取得開始 - employeeId:', window.currentEmployeeId);

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/leave/remaining/${window.currentEmployeeId}`),
                '休暇残数の取得に失敗しました'
            );

            console.log('APIレスポンス:', data);

            if (data && data.success && data.remaining) {
                this.remainingByType = {};
                Object.entries(data.remaining).forEach(([key, value]) => {
                    const normalized = this.normalizeBalanceEntry(value);
                    this.remainingByType[key] = normalized;
                    console.log(`休暇種別 ${key}:`, normalized);
                });
                console.log('残休暇日数データ:', this.remainingByType);
            } else {
                this.remainingByType = {};
                console.log('残休暇日数データなし:', data);
                console.log('data.success:', data?.success);
                console.log('data.remaining:', data?.remaining);
            }
            // 新しいUI要素で表示を更新
            this.renderBalanceSummary();
        } catch (error) {
            console.error('休暇残数取得エラー:', error);
            this.remainingByType = {};
            this.renderBalanceSummary();
        }
    }

    /**
     * 付与情報読み込み
     */
    async loadActiveGrants() {
        if (!window.currentEmployeeId) {
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/leave/grants/${window.currentEmployeeId}`),
                '休暇付与情報の取得に失敗しました'
            );

            this.activeGrantsByType = new Map();

            if (data && data.success && Array.isArray(data.data)) {
                console.log('休暇付与データ:', data.data);
                data.data.forEach((grant) => {
                    const type = grant.leaveType;
                    if (!this.activeGrantsByType.has(type)) {
                        this.activeGrantsByType.set(type, []);
                    }
                    this.activeGrantsByType.get(type).push(grant);
                });
            }
            // 有効期限情報を含めて残数サマリを再描画
            this.renderBalanceSummary();
        } catch (error) {
            console.error('休暇付与情報取得エラー:', error);
            this.activeGrantsByType = new Map();
            // エラー時も残数サマリを再描画
            this.renderBalanceSummary();
        }
    }

    /**
     * 残数サマリ描画
     */
    renderBalanceSummary() {
        // 管理者画面など、残数表示用の要素が存在しない画面では何もしない
        if (!this.paidLeaveRemaining && !this.summerLeaveRemaining && !this.winterLeaveRemaining && !this.specialLeaveRemaining) {
            return;
        }
        this.renderBalanceForType(this.paidLeaveRemaining, this.paidLeaveValidity, 'PAID_LEAVE');
        this.renderBalanceForType(this.summerLeaveRemaining, this.summerValidity, 'SUMMER');
        this.renderBalanceForType(this.winterLeaveRemaining, this.winterValidity, 'WINTER');
        this.renderBalanceForType(this.specialLeaveRemaining, this.specialValidity, 'SPECIAL');
    }

    renderBalanceForType(displayElement, validityElement, leaveType) {
        if (!displayElement) {
            return;
        }
        const balance = this.getBalanceForType(leaveType);
        displayElement.innerHTML = this.formatBalanceDisplay(balance.remaining, balance.pending);

        if (validityElement) {
            const validity = this.getValidityPeriod(leaveType);
            if (validity) {
                validityElement.textContent = `有効期限：${validity}`;
            } else {
                validityElement.innerHTML = '&nbsp;';
            }
        }
    }

    normalizeBalanceEntry(rawValue) {
        if (rawValue && typeof rawValue === 'object') {
            const remaining = this.parseDays(rawValue.remaining ?? rawValue.available ?? rawValue.value ?? 0);
            const pending = this.parseDays(rawValue.pending ?? 0);
            const available = rawValue.available != null
                ? this.parseDays(rawValue.available)
                : this.parseDays(remaining - pending);
            return { remaining, pending, available: available < 0 ? 0 : available };
        }
        const numeric = this.parseDays(rawValue);
        return { remaining: numeric, pending: 0, available: numeric };
    }

    getBalanceForType(leaveType) {
        if (!leaveType || !this.remainingByType) {
            return { remaining: 0, pending: 0, available: 0 };
        }
        const entry = this.remainingByType[leaveType];
        if (!entry) {
            return { remaining: 0, pending: 0, available: 0 };
        }
        const normalized = this.normalizeBalanceEntry(entry);
        // 保存されている値が未正規化の場合があるため再代入しておく
        this.remainingByType[leaveType] = normalized;
        return normalized;
    }

    getPendingDays(leaveType) {
        const balance = this.getBalanceForType(leaveType);
        return balance.pending;
    }

    formatBalanceDisplay(remaining, pending) {
        const remainingText = `${this.formatDaysNumber(remaining)}日`;
        const pendingValue = Number(pending);
        if (pendingValue > 0) {
            return `${remainingText}<br><span style="font-size: 0.7em;">申請中: ${this.formatDaysNumber(pendingValue)}日</span>`;
        }
        return remainingText;
    }

    formatDaysNumber(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return '0';
        }
        const rounded = Math.round(num * 100) / 100;
        if (Number.isInteger(rounded)) {
            return String(Math.trunc(rounded));
        }
        return rounded.toFixed(2).replace(/\.0+$/, '').replace(/\.([1-9])0$/, '.$1');
    }

    parseDays(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return 0;
        }
        const rounded = Math.round(num * 100) / 100;
        return rounded;
    }

    /**
     * 休暇種別の有効期限情報を取得
     */
    getValidityPeriod(leaveType) {
        if (!this.activeGrantsByType || !this.activeGrantsByType.has(leaveType)) {
            console.log(`${leaveType}の付与情報なし`);
            return null;
        }

        const grants = this.activeGrantsByType.get(leaveType);
        if (!grants || grants.length === 0) {
            console.log(`${leaveType}の付与データなし`);
            return null;
        }

        // 最も最近の付与情報を取得
        const latestGrant = grants[grants.length - 1];
        console.log(`${leaveType}の最新付与情報:`, latestGrant);
        
        if (!latestGrant.grantedAt || !latestGrant.expiresAt) {
            console.log(`${leaveType}の有効期限情報不完全:`, { grantedAt: latestGrant.grantedAt, expiresAt: latestGrant.expiresAt });
            return null;
        }

        const startDate = this.formatDateForDisplay(latestGrant.grantedAt);
        const endDate = this.formatDateForDisplay(latestGrant.expiresAt);
        
        console.log(`${leaveType}の有効期限表示: ${startDate}～${endDate}`);
        return `${startDate}～${endDate}`;
    }

    /**
     * 日付を表示用フォーマットに変換
     */
    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}/${month}/${day}`;
        } catch (error) {
            console.error('日付フォーマットエラー:', error);
            return dateString;
        }
    }


    /**
     * 休暇種別選択変更時の処理
     */
    handleLeaveTypeChange() {
        const { leaveType, timeUnit } = this.getSelectedLeaveType();
        const isPaidLeave = leaveType === 'PAID_LEAVE';
        const isHalfDay = timeUnit === 'HALF_AM' || timeUnit === 'HALF_PM';

        if (this.vacationReason) {
            if (isPaidLeave) {
                this.vacationReason.required = true;
                this.vacationReason.placeholder = '理由は必須です';
                if (this.reasonRequiredMark) {
                    this.reasonRequiredMark.classList.remove('d-none');
                }
            } else {
                this.vacationReason.required = false;
                this.vacationReason.placeholder = '必要に応じて理由を入力してください（任意）';
                if (this.reasonRequiredMark) {
                    this.reasonRequiredMark.classList.add('d-none');
                }
            }
            this.updateReasonValidity();
        }

        if (this.vacationEndDate) {
            const disableEndDate = isHalfDay;
            this.vacationEndDate.disabled = disableEndDate;
            if (disableEndDate && this.vacationStartDate && this.vacationStartDate.value) {
                this.vacationEndDate.value = this.vacationStartDate.value;
            }
        }
    }

    /**
     * 日付入力同期
     */
    syncEndDateIfNeeded() {
        if (!this.vacationStartDate || !this.vacationEndDate) {
            return;
        }
        const { leaveType, timeUnit } = this.getSelectedLeaveType();
        const isHalfDay = timeUnit === 'HALF_AM' || timeUnit === 'HALF_PM';

        if (isHalfDay) {
            this.vacationEndDate.value = this.vacationStartDate.value;
        }
    }

    handleDateRangeChange() {
        // 範囲変更時の追加処理が必要な場合に備えたプレースホルダー
    }

    /**
     * 休暇種別の選択肢を更新
     */
    updateLeaveTypeAvailability() {
        if (!this.leaveTypeSelect) {
            console.log('leaveTypeSelectが見つかりません');
            return;
        }

        console.log('休暇種別の選択肢を更新中...');
        const options = Array.from(this.leaveTypeSelect.options);
        options.forEach((option) => {
            const { leaveType, timeUnit } = this.parseOptionValue(option.value);
            let canSelect = true;
            const remaining = this.getRemainingDays(leaveType);

            console.log(`休暇種別: ${leaveType}, 時間単位: ${timeUnit}, 残日数: ${remaining}`);

            if (leaveType === 'PAID_LEAVE') {
                if (timeUnit === 'HALF_AM' || timeUnit === 'HALF_PM') {
                    canSelect = remaining >= 0.5;
                } else {
                    canSelect = remaining >= 1;
                }
            } else {
                // 有休休暇以外は残日数が1日以上の場合のみ選択可能
                canSelect = remaining >= 1;
            }

            console.log(`${leaveType}(${timeUnit}): 残日数=${remaining}, 選択可能=${canSelect}`);
            option.disabled = !canSelect;
            console.log(`option.disabled = ${option.disabled} (${option.textContent})`);
        });

        if (this.leaveTypeSelect && this.leaveTypeSelect.value) {
            const selectedOption = this.leaveTypeSelect.selectedOptions[0];
            if (selectedOption && selectedOption.disabled) {
                const fallback = options.find((opt) => !opt.disabled);
                if (fallback) {
                    this.leaveTypeSelect.value = fallback.value;
                }
            }
        }
    }

    /**
     * 休暇申請送信処理
     */
    async handleVacationSubmit(e) {
        e.preventDefault();
        this.validationAttempted = true;
        this.updateReasonValidity();

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const { leaveType, timeUnit } = this.getSelectedLeaveType();
        const startDateRaw = this.vacationStartDate?.value || '';
        const endDateRaw = this.vacationEndDate?.value || '';
        const reasonRaw = this.vacationReason?.value || '';
        const reason = reasonRaw.trim();

        const isPaidLeave = leaveType === 'PAID_LEAVE';
        const requiredChecks = [
            { input: this.vacationStartDate, ok: !!startDateRaw }
        ];
        if (this.vacationEndDate) {
            if (!this.vacationEndDate.disabled) {
                requiredChecks.push({ input: this.vacationEndDate, ok: !!endDateRaw });
            } else {
                this.setValidity(this.vacationEndDate, true);
            }
        }
        if (isPaidLeave) {
            requiredChecks.push({ input: this.vacationReason, ok: reason.length > 0 });
        } else {
            this.setValidity(this.vacationReason, true);
        }

        let firstInvalid = null;
        requiredChecks.forEach(({ input, ok }) => {
            this.setValidity(input, ok, '必須項目を入力してください');
            if (!ok && !firstInvalid) {
                firstInvalid = input;
            }
        });

        if (firstInvalid) {
            this.showAlert('必須項目を入力してください', 'warning');
            firstInvalid.focus?.();
            return;
        }

        const startDate = startDateRaw;
        const endDate = endDateRaw || startDateRaw;

        if (!this.validateDateRange()) {
            return;
        }

        const requestDates = this.expandDateRange(startDate, endDate);
        try {
            const conflicts = await this.getActiveAdjustmentConflicts(requestDates);
            if (conflicts.length > 0) {
                const displayDates = conflicts.map((date) => this.formatDateForDisplay(date)).filter(Boolean);
                const dateLabel = displayDates.length > 0 ? `対象日（${displayDates.join(', ')}）` : '対象日';
                this.showAlert(`${dateLabel}には打刻修正申請が存在します。休暇申請するには、打刻修正申請を取消してください。`, 'danger');
                return;
            }
        } catch (error) {
            console.error('打刻修正申請状況の確認に失敗しました:', error);
            this.showAlert('打刻修正申請状況の確認に失敗しました。時間をおいて再度お試しください。', 'danger');
            return;
        }

        const leaveLabel = this.leaveTypeDisplayMap[leaveType] || leaveType;
        const unitLabelRaw = this.timeUnitDisplayMap[timeUnit] || '';
        const unitLabel = unitLabelRaw;

        const displayStart = this.formatDateForDisplay(startDate);
        const displayEnd = this.formatDateForDisplay(endDate);
        const rangeText = displayStart === displayEnd ? displayStart : `${displayStart} 〜 ${displayEnd}`;
        
        // 有休の場合は「有休」「AM有休」「PM有休」の形式で表示
        let summaryLabel;
        if (leaveLabel === '有休') {
            summaryLabel = unitLabel || '有休';
        } else {
            summaryLabel = unitLabel ? `${leaveLabel}（${unitLabel}）` : leaveLabel;
        }
        const reasonDisplay = reason ? reason : '記載なし';
        const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const summaryLabelHtml = escapeHtml(summaryLabel);
        const rangeTextHtml = escapeHtml(rangeText);
        const reasonDisplayHtml = escapeHtml(reasonDisplay);
        const modalMessageText = [
            `休暇種別 ${summaryLabel}`,
            `対象日 ${rangeText}`,
            `理由 ${reasonDisplay}`,
            '申請してよろしいですか？'
        ].join('\n');

        const modalMessageHtml = `
            <div class="text-start small">
                <dl class="row g-1 mb-3 align-items-center">
                    <dt class="col-4 text-muted text-nowrap mb-0">休暇種別</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${summaryLabelHtml}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">対象日</dt>
                    <dd class="col-8 text-end mb-0 fw-semibold">${rangeTextHtml}</dd>
                    <dt class="col-4 text-muted text-nowrap mb-0">理由</dt>
                    <dd class="col-8 text-end mb-0">${reasonDisplayHtml}</dd>
                </dl>
                <p class="mb-0">申請してよろしいですか？</p>
            </div>
        `.trim();

        // 見た目を2枚目（共通ダイアログ）に統一: 共通ダイアログ優先 → 専用モーダル → confirm
        const confirmHandler = window.employeeDialog?.confirm;
        if (confirmHandler) {
            const { confirmed } = await confirmHandler({
                title: '休暇申請の送信',
                message: modalMessageHtml,
                confirmLabel: '申請する',
                cancelLabel: 'キャンセル'
            });
            if (!confirmed) return;
        } else {
            const modalEl = document.getElementById('vacationSubmitConfirmModal');
            const messageEl = document.getElementById('vacationSubmitConfirmMessage');
            const confirmBtn = document.getElementById('vacationSubmitConfirmButton');
            if (modalEl && messageEl && confirmBtn && typeof bootstrap !== 'undefined') {
                messageEl.innerHTML = modalMessageHtml;
                const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
                const confirmed = await new Promise((resolve) => {
                    const onConfirm = () => { cleanup(); resolve(true); };
                    const onHidden = () => { cleanup(); resolve(false); };
                    const cleanup = () => {
                        confirmBtn.removeEventListener('click', onConfirm);
                        modalEl.removeEventListener('hidden.bs.modal', onHidden);
                    };
                    confirmBtn.addEventListener('click', onConfirm);
                    modalEl.addEventListener('hidden.bs.modal', onHidden);
                    modalInstance.show();
                });
                if (!confirmed) return;
            } else if (!window.confirm(modalMessageText)) {
                return;
            }
        }

        try {
            const payload = {
                employeeId: window.currentEmployeeId,
                leaveType,
                timeUnit,
                startDate,
                endDate,
                reason: reason || null
            };

            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/leave/requests', payload),
                '休暇申請に失敗しました'
            );

            this.showAlert(data.message || '休暇申請が完了しました', 'success');
            this.vacationForm?.reset();
            this.clearPrefillState();

            await this.loadAllSupportingData();
            await this.refreshAllScreens();
        } catch (error) {
            // サーバ側の休日バリデーションに合わせたメッセージ変換
            const msg = (error && typeof error.message === 'string' && error.message.includes('勤務日がありません'))
                ? '休日に休暇申請はできません'
                : (error.message || '休暇申請に失敗しました');
            this.showAlert(msg, 'danger');
        }
    }

    /**
     * 日付範囲のバリデーション
     */
    validateDateRange() {
        if (!this.vacationStartDate || !this.vacationEndDate) {
            return true;
        }

        const startDate = this.vacationStartDate.value;
        const endDate = this.vacationEndDate.value || startDate;
        const start = this.parseLocalDate(startDate);
        const end = this.parseLocalDate(endDate);

        this.setValidity(this.vacationStartDate, true);
        if (!this.vacationEndDate.disabled) {
            this.setValidity(this.vacationEndDate, true);
        }

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            if (Number.isNaN(start.getTime())) {
                this.setValidity(this.vacationStartDate, false, '有効な日付を入力してください');
            }
            if (!this.vacationEndDate.disabled && Number.isNaN(end.getTime())) {
                this.setValidity(this.vacationEndDate, false, '有効な日付を入力してください');
            }
            this.showAlert('有効な日付を入力してください', 'danger');
            return false;
        }

        if (end < start) {
            if (!this.vacationEndDate.disabled) {
                this.setValidity(this.vacationEndDate, false, '終了日は開始日以降の日付を選択してください');
            }
            this.showAlert('終了日は開始日以降の日付を選択してください', 'danger');
            this.vacationEndDate.focus();
            return false;
        }

        const { leaveType, timeUnit } = this.getSelectedLeaveType();
        const requestedDays = this.calculateRequestedDays(start, end, timeUnit);
        if (requestedDays <= 0) {
            this.setValidity(this.vacationStartDate, false, '休日は申請できません');
            if (!this.vacationEndDate.disabled) {
                this.setValidity(this.vacationEndDate, false, '休日は申請できません');
            }
            this.showAlert('休日は申請できません', 'danger');
            return false;
        }

        const remaining = this.getRemainingDays(leaveType);
        if (remaining < requestedDays) {
            this.showAlert('所有休暇残数不足のため申請できません', 'danger');
            return false;
        }

        // 夏季・冬季・特別休暇は有効期間内のみ
        if (leaveType === 'SUMMER' || leaveType === 'WINTER' || leaveType === 'SPECIAL') {
            const selectedDates = this.expandDateRange(startDate, endDate);
            const grants = this.activeGrantsByType.get(leaveType) || [];
            const invalid = selectedDates.filter((date) => !this.isDateCoveredByGrant(date, grants));
            if (invalid.length > 0) {
                this.showAlert('選択した期間に有効な休暇付与がありません', 'danger');
                if (!this.vacationEndDate.disabled) {
                    this.setValidity(this.vacationEndDate, false, '選択した期間に有効な休暇付与がありません');
                }
                return false;
            }
        }

        return true;
    }

    /**
     * 選択中の休暇種別と単位を取得
     */
    getSelectedLeaveType() {
        if (!this.leaveTypeSelect || !this.leaveTypeSelect.value) {
            return { leaveType: 'PAID_LEAVE', timeUnit: 'FULL_DAY' };
        }
        return this.parseOptionValue(this.leaveTypeSelect.value);
    }

    parseOptionValue(value) {
        if (!value.includes(':')) {
            return { leaveType: value, timeUnit: 'FULL_DAY' };
        }
        const [leaveType, timeUnit] = value.split(':');
        return {
            leaveType: leaveType || 'PAID_LEAVE',
            timeUnit: timeUnit || 'FULL_DAY'
        };
    }

    /**
     * 休暇残数取得
     */
    getRemainingDays(leaveType) {
        const balance = this.getBalanceForType(leaveType);
        console.log(`getRemainingDays called for ${leaveType}:`, balance);
        return balance.available;
    }

    /**
     * 申請日数計算（勤務日のみをカウント）
     */
    calculateRequestedDays(start, end, timeUnit) {
        if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 0;
        }
        if (timeUnit === 'HALF_AM' || timeUnit === 'HALF_PM') {
            return 0.5;
        }

        let count = 0;
        const cursor = new Date(start.getTime());
        while (cursor <= end) {
            if (this.isWorkingDay(cursor)) {
                count += 1;
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return count;
    }

    /**
     * 指定日が勤務日かどうかを判定（勤務時間変更の休日を考慮）
     */
    isWorkingDay(date) {
        if (!date || Number.isNaN(date.getTime())) {
            return false;
        }

        // 土日祝日の基本判定
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = BusinessDayUtils.isHoliday(date);

        // 勤務時間変更申請がない場合は基本判定のみ
        if (!this.workPatternData) {
            return !isWeekend && !isHoliday;
        }

        // 勤務時間変更申請がある場合は、その申請の勤務パターンに基づいて判定
        const applicablePattern = this.findApplicableWorkPattern(date);
        if (applicablePattern) {
            return applicablePattern.appliesTo(date, isHoliday);
        }

        // 勤務時間変更申請がない場合は基本判定
        return !isWeekend && !isHoliday;
    }

    /**
     * 指定日に適用される勤務時間変更申請を検索
     */
    findApplicableWorkPattern(date) {
        if (!this.workPatternData || !Array.isArray(this.workPatternData)) {
            return null;
        }

        const dateString = this.formatDateString(date);
        const targetDate = new Date(date);

        for (const pattern of this.workPatternData) {
            if (pattern.status !== 'APPROVED') {
                continue;
            }

            const startDate = new Date(pattern.startDate);
            const endDate = new Date(pattern.endDate);

            if (targetDate >= startDate && targetDate <= endDate) {
                return {
                    appliesTo: (date, isHoliday) => {
                        const dayOfWeek = date.getDay();
                        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                        const dayName = dayNames[dayOfWeek];

                        // 祝日かつ applyHoliday=false の場合は休日扱い
                        if (isHoliday && !pattern.applyHoliday) {
                            return false;
                        }

                        // 各曜日の適用判定
                        switch (dayName) {
                            case 'MONDAY': return pattern.applyMonday;
                            case 'TUESDAY': return pattern.applyTuesday;
                            case 'WEDNESDAY': return pattern.applyWednesday;
                            case 'THURSDAY': return pattern.applyThursday;
                            case 'FRIDAY': return pattern.applyFriday;
                            case 'SATURDAY': return pattern.applySaturday;
                            case 'SUNDAY': return pattern.applySunday;
                            default: return false;
                        }
                    }
                };
            }
        }

        return null;
    }

    /**
     * 日付を文字列形式に変換
     */
    formatDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 指定日が付与期間内か判定
     */
    isDateCoveredByGrant(dateString, grants) {
        if (!Array.isArray(grants) || grants.length === 0) {
            return false;
        }
        const target = this.parseDate(dateString);
        if (!target) {
            return false;
        }
        return grants.some((grant) => {
            const grantStart = this.parseDate(grant.grantedAt) || target;
            const grantEnd = grant.expiresAt ? this.parseDate(grant.expiresAt) : null;
            if (grantEnd) {
                return grantStart.getTime() <= target.getTime() && target.getTime() <= grantEnd.getTime();
            }
            return grantStart.getTime() <= target.getTime();
        });
    }

    /**
     * 他画面の更新
     */
    async refreshAllScreens() {
        try {
            if (window.historyScreen) {
                try {
                    if (typeof window.historyScreen.loadCalendarData === 'function') {
                        await window.historyScreen.loadCalendarData(true);
                    } else if (typeof window.historyScreen.loadAttendanceHistory === 'function') {
                        await window.historyScreen.loadAttendanceHistory();
                    }
                } catch (error) {
                    console.warn('勤怠履歴画面の更新に失敗:', error);
                }
            }

            if (window.calendarScreen) {
                try {
                    if (typeof window.calendarScreen.loadCalendarData === 'function') {
                        await window.calendarScreen.loadCalendarData();
                    }
                } catch (error) {
                    console.warn('カレンダー画面の更新に失敗:', error);
                }
            }

            if (window.dashboardScreen) {
                try {
                    if (typeof window.dashboardScreen.loadTodayAttendance === 'function') {
                        await window.dashboardScreen.loadTodayAttendance();
                    }
                } catch (error) {
                    console.warn('ダッシュボード画面の更新に失敗:', error);
                }
            }
        } catch (error) {
            console.warn('休暇申請後の画面更新に失敗しました:', error);
        }
    }

    /**
     * アラート表示
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

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    setValidity(input, ok, message) {
        if (!input) return;
        if (ok) {
            if (typeof input.setCustomValidity === 'function') {
                input.setCustomValidity('');
            }
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
        } else {
            if (typeof input.setCustomValidity === 'function') {
                input.setCustomValidity(message || '無効な値です');
            }
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
        }
    }

    updateReasonValidity(options = {}) {
        if (!this.vacationReason) return;
        const { force = false } = options;
        const { leaveType } = this.getSelectedLeaveType();
        const isPaidLeave = leaveType === 'PAID_LEAVE';
        if (!isPaidLeave) {
            this.setValidity(this.vacationReason, true);
            return;
        }
        const shouldValidate = force || this.validationAttempted || this.reasonTouched;
        if (!shouldValidate) {
            this.setValidity(this.vacationReason, true);
            return;
        }
        const hasReason = (this.vacationReason.value || '').trim().length > 0;
        this.setValidity(this.vacationReason, hasReason, '必須項目を入力してください');
    }

    expandDateRange(startStr, endStr) {
        const start = this.parseDate(startStr);
        const end = this.parseDate(endStr || startStr);
        if (!start || !end) {
            return [];
        }
        const dates = [];
        const cursor = new Date(start.getTime());
        while (cursor.getTime() <= end.getTime()) {
            dates.push(this.formatDateString(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return dates;
    }

    async getActiveAdjustmentConflicts(dateStrings) {
        if (!Array.isArray(dateStrings) || dateStrings.length === 0 || !window.currentEmployeeId) {
            return [];
        }

        const response = await fetchWithAuth.handleApiCall(
            () => fetchWithAuth.get(`/api/attendance/adjustment/${window.currentEmployeeId}`),
            '打刻修正申請の取得に失敗しました'
        );

        let list = [];
        if (response && response.success && Array.isArray(response.data)) {
            list = response.data;
        } else if (Array.isArray(response)) {
            list = response;
        } else if (response && Array.isArray(response.adjustmentRequests)) {
            list = response.adjustmentRequests;
        }

        const dateSet = new Set(dateStrings);
        const conflicts = new Set();
        list.forEach((req) => {
            const status = (req?.status || '').toString().toUpperCase();
            if (!['PENDING', 'APPROVED'].includes(status)) {
                return;
            }

            this.collectAdjustmentDates(req).forEach((date) => {
                if (dateSet.has(date)) {
                    conflicts.add(date);
                }
            });
        });

        return Array.from(conflicts).sort();
    }

    collectAdjustmentDates(request) {
        const dates = new Set();
        const add = (value) => {
            const normalized = this.normalizeDateString(value);
            if (normalized) {
                dates.add(normalized);
            }
        };

        add(request?.targetDate);
        add(request?.date);
        add(request?.attendanceDate);
        add(request?.clockInDate);
        add(request?.clockOutDate);
        add(request?.startDate);
        add(request?.endDate);
        add(request?.originalClockIn);
        add(request?.originalClockOut);
        add(request?.newClockIn);
        add(request?.newClockOut);

        if (request?.targetDateStart && request?.targetDateEnd) {
            this.expandDateRange(request.targetDateStart, request.targetDateEnd)
                .forEach((date) => dates.add(date));
        }

        return Array.from(dates);
    }

    parseDate(value) {
        const normalized = this.normalizeDateString(value);
        if (!normalized) {
            return null;
        }
        const [yearStr, monthStr, dayStr] = normalized.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
            return null;
        }
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    parseLocalDate(value) {
        if (!value) return new Date(NaN);
        const [yearStr, monthStr, dayStr] = value.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
            return new Date(NaN);
        }
        return new Date(year, month - 1, day);
    }

    normalizeDateString(value) {
        if (!value) {
            return '';
        }
        if (value instanceof Date) {
            return this.formatDateString(value);
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return '';
            }
            if (trimmed.includes('T')) {
                return trimmed.split('T')[0];
            }
            if (trimmed.includes('/')) {
                return trimmed.replace(/\//g, '-');
            }
            return trimmed;
        }
        return '';
    }

    formatDateString(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateForDisplay(dateStr) {
        const normalized = this.normalizeDateString(dateStr);
        if (!normalized) {
            return '';
        }
        return normalized.replace(/-/g, '/');
    }

    /**
     * 残休暇日数の更新ボタンクリック処理
     */
    async handleRefreshLeaveBalance() {
        if (!this.refreshLeaveBalanceButton) {
            console.error('更新ボタンが見つかりません');
            return;
        }

        // ボタンを無効化してローディング状態にする
        const originalText = this.refreshLeaveBalanceButton.innerHTML;
        this.refreshLeaveBalanceButton.disabled = true;
        this.refreshLeaveBalanceButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>更新中...';

        try {
            console.log('残休暇日数の手動更新を開始');
            
            // 残休暇日数を再取得
            await this.loadRemainingVacationDays();
            
            // 有効期限情報を再取得
            await this.loadActiveGrants();
            
            // 休暇種別の選択肢を更新
            this.updateLeaveTypeAvailability();
            
            console.log('残休暇日数と有効期限の更新が完了しました');
            
            // 成功メッセージを表示（短時間）
            this.refreshLeaveBalanceButton.innerHTML = '<i class="fas fa-check me-1"></i>更新完了';
            setTimeout(() => {
                this.refreshLeaveBalanceButton.innerHTML = originalText;
                this.refreshLeaveBalanceButton.disabled = false;
            }, 1000);
            
        } catch (error) {
            console.error('残休暇日数の更新エラー:', error);
            
            // エラーメッセージを表示
            this.refreshLeaveBalanceButton.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>更新失敗';
            setTimeout(() => {
                this.refreshLeaveBalanceButton.innerHTML = originalText;
                this.refreshLeaveBalanceButton.disabled = false;
            }, 2000);
        }
    }
}

// グローバルインスタンスを作成
window.vacationScreen = new VacationScreen();
