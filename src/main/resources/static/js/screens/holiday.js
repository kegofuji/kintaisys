/**
 * 休日関連（休日出勤/振替）画面モジュール
 */
class HolidayScreen {
    constructor() {
        this.initialized = false;
    }

    async init() {
        const navigationPrefill = typeof window.consumeNavigationPrefill === 'function'
            ? window.consumeNavigationPrefill('/holiday')
            : null;
        const pathPrefill = this.extractDateFromPath();
        const hasNavigationPrefill = Boolean(navigationPrefill && (navigationPrefill.workDate || navigationPrefill.date || navigationPrefill.transferWorkDate));
        const hasPathPrefill = Boolean(pathPrefill);

        if (!this.initialized) {
            this.initialized = true;
            this.initializeElements();
            // 勤務パターンの事前取得（履歴画面のローダーを流用）
            await this.prefetchWorkPatterns();
            this.setupEventListeners();
        }

        this.resetForm();
        if (hasNavigationPrefill) {
            this.applyNavigationPrefill(navigationPrefill);
        } else if (hasPathPrefill) {
            this.applyPathPrefill(pathPrefill);
        } else {
            this.updateHolidayWorkHints();
            this.updateTransferHints();
        }
    }

    initializeElements() {
        this.holidayForm = document.getElementById('holidayForm');
        this.refreshBtn = document.getElementById('holidayRefreshBtn');
        this.typeWorkRadio = document.getElementById('holidayTypeWork');
        this.typeTransferRadio = document.getElementById('holidayTypeTransfer');
        this.transferRow = document.getElementById('transferRow');
        this.compSwitch = document.getElementById('compensatoryOffSwitch');
        this.compSwitchContainer = document.getElementById('compensatoryOffContainer');
        this.compSwitchLabel = document.getElementById('compensatoryOffLabel');
        this.workDate = document.getElementById('holidayWorkDate');
        this.compDate = document.getElementById('compensatoryDate');
        this.holidayWorkRow = this.workDate ? this.workDate.closest('.row') : null;
        this.transferWorkDate = document.getElementById('transferWorkDate');
        this.transferHolidayDate = document.getElementById('transferHolidayDate');
        this.reason = document.getElementById('holidayReason');
        this.resetBtn = document.getElementById('holidayFormResetBtn');
        this.submitBtn = document.getElementById('holidaySubmitBtn');
        this.holidayWorkHelp = document.getElementById('holidayWorkHelp');
        this.compensatoryHelp = document.getElementById('compensatoryHelp');
        this.transferWorkHelp = document.getElementById('transferWorkHelp');
        this.transferHolidayHelp = document.getElementById('transferHolidayHelp');
    }

    setupEventListeners() {
        if (!this.holidayForm) return;

        // タブ切り替え
        this.updateMode = () => {
            const isTransfer = this.typeTransferRadio?.checked === true;
            if (this.transferRow) this.transferRow.style.display = isTransfer ? '' : 'none';
            if (this.holidayWorkRow) this.holidayWorkRow.style.display = isTransfer ? 'none' : '';
            if (this.compSwitchContainer) {
                this.compSwitchContainer.hidden = isTransfer;
                this.compSwitchContainer.style.display = isTransfer ? 'none' : '';
                this.compSwitchContainer.classList.toggle('d-none', isTransfer);
            }
            if (this.compSwitchLabel) {
                this.compSwitchLabel.hidden = isTransfer;
                this.compSwitchLabel.style.display = isTransfer ? 'none' : '';
            }
            if (this.compSwitch) {
                this.compSwitch.hidden = isTransfer;
                this.compSwitch.style.display = isTransfer ? 'none' : '';
            }
            // 休日出勤モード
            this.workDate.required = !isTransfer;
            this.compSwitch.disabled = isTransfer;
            this.compDate.disabled = !this.compSwitch.checked || isTransfer;

            // 振替モード
            if (isTransfer) {
                this.transferWorkDate.required = true;
                this.transferHolidayDate.required = true;
                this.setValidity(this.transferWorkDate, true);
                this.setValidity(this.transferHolidayDate, true);
                // 代休UI/値を完全クリア
                if (this.compSwitch) this.compSwitch.checked = false;
                if (this.compDate) {
                    this.compDate.value = '';
                    this.setValidity(this.compDate, true);
                }
                if (this.workDate) this.setValidity(this.workDate, true);
            } else {
                this.transferWorkDate.required = false;
                this.transferHolidayDate.required = false;
                this.setValidity(this.transferWorkDate, true);
                this.setValidity(this.transferHolidayDate, true);
                this.setValidity(this.workDate, true);
                this.setValidity(this.compDate, true);
            }
        };
        this.typeWorkRadio?.addEventListener('change', this.updateMode);
        this.typeTransferRadio?.addEventListener('change', this.updateMode);

        const resetValidity = (input) => {
            if (!input) return;
            const handler = () => this.setValidity(input, true);
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        };
        resetValidity(this.workDate);
        resetValidity(this.compDate);
        resetValidity(this.transferWorkDate);
        resetValidity(this.transferHolidayDate);
        resetValidity(this.reason);

        // 代休スイッチ
        this.compSwitch?.addEventListener('change', () => {
            const on = this.compSwitch.checked;
            this.compDate.disabled = !on;
            if (!on) {
                this.setValidity(this.compDate, true);
                if (this.compDate) this.compDate.value = '';
            }
            // 代休日の現状表示を即時更新
            this.updateHolidayWorkHints();
        });

        // バリデーション（休日/勤務日 制約）
        this.workDate?.addEventListener('change', () => {
            this.updateHolidayWorkHints();
            this.validateWorkDate();
            this.validateCompDate();
        });
        this.compDate?.addEventListener('change', () => {
            this.updateHolidayWorkHints();
            this.validateCompDate();
        });
        this.transferWorkDate?.addEventListener('change', () => {
            this.updateTransferHints();
            this.validateTransferWorkDate();
        });
        this.transferHolidayDate?.addEventListener('change', () => {
            this.updateTransferHints();
            this.validateTransferHolidayDate();
        });

        // 送信
        this.holidayForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.resetBtn?.addEventListener('click', () => this.resetForm());

        // 更新ボタン: 勤務パターンの再取得と予定日の再描画
        if (this.refreshBtn && !this.refreshBtn.dataset.bound) {
            this.refreshBtn.addEventListener('click', async () => {
                const success = await this.handleRefreshButton(this.refreshBtn, async () => {
                    await this.prefetchWorkPatterns();
                    this.updateHolidayWorkHints();
                    this.updateTransferHints();
                });
                if (!success) {
                    this.showAlert('更新に失敗しました', 'danger');
                }
            });
            this.refreshBtn.dataset.bound = 'true';
        }

        this.updateMode();
        this.updateHolidayWorkHints();
        this.updateTransferHints();
    }

    resetForm() {
        if (!this.holidayForm) return;
        this.holidayForm.reset();
        // 明示的に初期状態へ
        if (this.typeWorkRadio) this.typeWorkRadio.checked = true;
        if (this.typeTransferRadio) this.typeTransferRadio.checked = false;
        if (this.compSwitch) this.compSwitch.checked = false;
        if (this.compDate) this.compDate.disabled = true;
        this.setValidity(this.workDate, true);
        this.setValidity(this.compDate, true);
        this.setValidity(this.transferWorkDate, true);
        this.setValidity(this.transferHolidayDate, true);
        this.setValidity(this.reason, true);
        this.updateMode();
        this.updateHolidayWorkHints();
        this.updateTransferHints();
    }

    extractDateFromPath() {
        try {
            if (window.router && typeof window.router.getCurrentRouteParams === 'function') {
                const params = window.router.getCurrentRouteParams();
                const candidate = params && params.date ? params.date : '';
                if (candidate) {
                    return candidate;
                }
            }
            const path = window.location?.pathname || '';
            const match = path.match(/^\/holiday\/(\d{4}-\d{2}-\d{2})$/);
            if (match && match[1]) {
                return match[1];
            }
        } catch (error) {
            console.warn('Failed to extract holiday date from path:', error);
        }
        return '';
    }

    applyPathPrefill(dateString) {
        const normalized = typeof dateString === 'string' ? dateString.trim() : '';
        if (!normalized) {
            return;
        }

        if (this.typeWorkRadio) {
            this.typeWorkRadio.checked = true;
            this.typeWorkRadio.dispatchEvent(new Event('change'));
        }
        if (this.typeTransferRadio) {
            this.typeTransferRadio.checked = false;
        }

        if (this.workDate) {
            this.workDate.value = normalized;
            this.setValidity(this.workDate, true);
            this.workDate.dispatchEvent(new Event('change'));
        }

        if (this.transferWorkDate) {
            this.transferWorkDate.value = normalized;
            this.setValidity(this.transferWorkDate, true);
            this.transferWorkDate.dispatchEvent(new Event('change'));
        }
        if (this.transferHolidayDate) {
            this.transferHolidayDate.value = '';
            this.setValidity(this.transferHolidayDate, true);
        }
    }

    applyNavigationPrefill(prefill = {}) {
        const normalizeDate = (value) => {
            if (!value) return '';
            if (value instanceof Date) {
                if (Number.isNaN(value.getTime())) return '';
                const yyyy = value.getFullYear();
                const mm = String(value.getMonth() + 1).padStart(2, '0');
                const dd = String(value.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return '';
                if (trimmed.includes('T')) {
                    return trimmed.split('T')[0];
                }
                return trimmed.replace(/\//g, '-');
            }
            return '';
        };

        const primaryDate = normalizeDate(prefill.workDate || prefill.date || prefill.transferWorkDate);
        if (!primaryDate) {
            return;
        }

        if (this.typeWorkRadio) this.typeWorkRadio.checked = true;
        if (this.typeTransferRadio) this.typeTransferRadio.checked = false;
        if (this.typeWorkRadio) {
            this.typeWorkRadio.dispatchEvent(new Event('change'));
        }

        if (this.workDate) {
            this.workDate.value = primaryDate;
            this.setValidity(this.workDate, true);
            this.workDate.dispatchEvent(new Event('change'));
        }

        if (this.transferWorkDate) {
            const transferWork = normalizeDate(prefill.transferWorkDate);
            if (transferWork) {
                this.transferWorkDate.value = transferWork;
                this.setValidity(this.transferWorkDate, true);
            } else {
                this.transferWorkDate.value = '';
                this.setValidity(this.transferWorkDate, true);
            }
        }

        if (this.compSwitch) {
            this.compSwitch.checked = false;
        }
        if (this.compDate) {
            this.compDate.disabled = true;
            this.compDate.value = '';
            this.setValidity(this.compDate, true);
        }

        this.updateHolidayWorkHints();
        this.updateTransferHints();
        this.validateWorkDate();
        this.validateTransferWorkDate();
    }

    // 休日（非勤務日）かどうか
    isHolidayOrWeekend(dateStr) {
        const d = this.parseDate(dateStr);
        if (!d) return false;
        // 勤務時間変更の休日適用を最優先
        const patternWork = this.resolveWorkingByPattern(d);
        if (patternWork !== null && patternWork !== undefined) {
            return !patternWork;
        }
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHoliday = window.BusinessDayUtils && typeof window.BusinessDayUtils.isHoliday === 'function'
            ? window.BusinessDayUtils.isHoliday(d)
            : false;
        return isWeekend || isHoliday;
    }

    // 勤務日かどうか（単純: 土日祝以外）
    isBusinessDay(dateStr) {
        const d = this.parseDate(dateStr);
        if (!d) return false;
        const patternWork = this.resolveWorkingByPattern(d);
        if (patternWork !== null && patternWork !== undefined) {
            return !!patternWork;
        }
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHoliday = window.BusinessDayUtils && typeof window.BusinessDayUtils.isHoliday === 'function'
            ? window.BusinessDayUtils.isHoliday(d)
            : false;
        return !(isWeekend || isHoliday);
    }

    validateWorkDate() {
        const v = this.workDate?.value;
        if (!v) return true;
        const ok = this.isHolidayOrWeekend(v); // 休日出勤日は休日のみ
        this.setValidity(this.workDate, ok, '休日出勤日は休日のみ選択できます');
        return ok;
    }

    validateCompDate() {
        if (this.compDate?.disabled) return true;
        const v = this.compDate?.value;
        if (!v) return true;
        let ok = this.isBusinessDay(v); // 代休は勤務日のみ
        if (!ok) {
            this.setValidity(this.compDate, false, '代休は勤務日のみ選択できます');
            return false;
        }
        // 代休日は休日出勤日より後
        const work = this.workDate?.value;
        if (work) {
            const cd = this.parseDate(v);
            const wd = this.parseDate(work);
            if (cd && wd && cd.getTime() <= wd.getTime()) {
                this.setValidity(this.compDate, false, '代休日は休日出勤日より後の日付を選択してください');
                return false;
            }
        }
        this.setValidity(this.compDate, true);
        return true;
    }

    validateTransferWorkDate() {
        const v = this.transferWorkDate?.value;
        if (!v) return true;
        const ok = this.isHolidayOrWeekend(v); // 振替出勤日は元の休日
        this.setValidity(this.transferWorkDate, ok, '振替出勤日は元の休日のみ選択できます');
        return ok;
    }

    validateTransferHolidayDate() {
        const v = this.transferHolidayDate?.value;
        if (!v) return true;
        const ok = this.isBusinessDay(v); // 振替休日は元の出勤日
        this.setValidity(this.transferHolidayDate, ok, '振替休日は元の出勤日のみ選択できます');
        return ok;
    }

    setValidity(input, ok, message) {
        if (!input) return;
        if (ok) {
            input.setCustomValidity('');
            input.classList.remove('is-invalid');
        } else {
            input.setCustomValidity(message || '無効な値です');
            input.classList.add('is-invalid');
        }
    }

    updateHolidayWorkHints() {
        // ヒント: 「原則、休日のみ選択可能」→「現状：休日/勤務日」を併記
        if (this.holidayWorkHelp) {
            const v = this.workDate?.value;
            if (v) {
                const isHoliday = this.isHolidayOrWeekend(v);
                this.holidayWorkHelp.textContent = `現状：${isHoliday ? '休日' : '勤務日'}（休日のみ選択可能）`;
            } else {
                this.holidayWorkHelp.textContent = '休日のみ選択可能';
            }
        }
        if (this.compensatoryHelp) {
            const v = this.compDate?.value;
            if (v) {
                const isBiz = this.isBusinessDay(v);
                this.compensatoryHelp.textContent = `現状：${isBiz ? '勤務日' : '休日'}（勤務日のみ選択可能）`;
            } else {
                this.compensatoryHelp.textContent = '勤務日のみ選択可能';
            }
        }
    }

    updateTransferHints() {
        if (this.transferWorkHelp) {
            const v = this.transferWorkDate?.value;
            if (v) {
                const isHoliday = this.isHolidayOrWeekend(v);
                this.transferWorkHelp.textContent = `現状：${isHoliday ? '休日' : '勤務日'}（休日のみ選択可能）`;
            } else {
                this.transferWorkHelp.textContent = '休日のみ選択可能';
            }
        }
        if (this.transferHolidayHelp) {
            const v = this.transferHolidayDate?.value;
            if (v) {
                const isBiz = this.isBusinessDay(v);
                this.transferHolidayHelp.textContent = `現状：${isBiz ? '勤務日' : '休日'}（勤務日のみ選択可能）`;
            } else {
                this.transferHolidayHelp.textContent = '勤務日のみ選択可能';
            }
        }
    }

    parseDate(v) {
        if (!v) return null;
        const [y, m, d] = v.split('-').map(n => parseInt(n, 10));
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    }


    // 勤務パターンに基づく勤務日判定の解決
    resolveWorkingByPattern(dateObj) {
        try {
            if (typeof window.isWorkingDayByPattern === 'function') {
                const r = window.isWorkingDayByPattern(dateObj);
                if (r !== null && r !== undefined) return r;
            }
            // 代替: holiday用にロードしたキャッシュがあれば利用
            if (Array.isArray(window._workPatternForHoliday)) {
                const y = dateObj.getFullYear();
                const m = dateObj.getMonth();
                const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                const entry = window._workPatternForHoliday.find(it => it.date === key);
                if (entry && entry.request) {
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const isHoliday = window.BusinessDayUtils && typeof window.BusinessDayUtils.isHoliday === 'function' ? window.BusinessDayUtils.isHoliday(dateObj) : false;
                    return this.isDateInWorkPatternLocal(dateObj, entry.request, isWeekend, isHoliday);
                }
            }
        } catch (_) {}
        return null;
    }

    // holiday.js 内部用の簡易 isDateInWorkPattern
    isDateInWorkPatternLocal(date, request, isWeekend, isHoliday) {
        if (!request) return false;
        if (isHoliday && request.applyHoliday === false) return false;
        const weekday = date.getDay();
        switch (weekday) {
            case 1: return !!request.applyMonday;
            case 2: return !!request.applyTuesday;
            case 3: return !!request.applyWednesday;
            case 4: return !!request.applyThursday;
            case 5: return !!request.applyFriday;
            case 6: return !!request.applySaturday;
            case 0: return !!request.applySunday;
        }
        return false;
    }

    async prefetchWorkPatterns() {
        try {
            // 代替: 自前で直近90日分の勤務パターンをロード（初期表示の精度を担保）
            if (!window.currentEmployeeId) return;
            const res = await window.fetchWithAuth.get(`/api/work-pattern-change/requests/${window.currentEmployeeId}`);
            const data = await window.fetchWithAuth.parseJson(res);
            const list = (data && data.data) || [];

            const today = new Date();
            const horizonDays = 120; // 余裕を持って120日先まで
            const endHorizon = new Date(today);
            endHorizon.setDate(today.getDate() + horizonDays);

            const filtered = [];
            list.forEach(req => {
                if ((req.status || '').toUpperCase() !== 'APPROVED') return;
                if (!req.startDate || !req.endDate) return;
                const start = this.parseDate(req.startDate);
                const end = this.parseDate(req.endDate);
                if (!start || !end) return;

                // 交差区間のみを展開
                const from = start.getTime() > today.getTime() ? start : today;
                const to = end.getTime() < endHorizon.getTime() ? end : endHorizon;
                if (from.getTime() > to.getTime()) return;

                for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const idx = filtered.findIndex(it => it.date === key);
                    const payload = { date: key, request: req, status: 'APPROVED', requestId: req.requestId || req.id };
                    if (idx >= 0) filtered[idx] = payload; else filtered.push(payload);
                }
            });
            window._workPatternForHoliday = filtered;
        } catch (_) {
            // ignore
        }
    }

    /**
     * 更新ボタンの共通ハンドリング
     * @param {HTMLButtonElement} button
     * @param {() => Promise<boolean|void>} taskFn
     * @returns {Promise<boolean>}
     */
    async handleRefreshButton(button, taskFn) {
        if (!button || typeof taskFn !== 'function') {
            return false;
        }

        const originalHtml = button.dataset.originalHtml || button.innerHTML;
        button.dataset.originalHtml = originalHtml;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>更新中...';

        let success = true;
        let caughtError = null;

        try {
            const result = await taskFn();
            if (result === false || (result && typeof result === 'object' && result.success === false)) {
                success = false;
            }
        } catch (error) {
            success = false;
            caughtError = error;
            console.error('更新処理でエラーが発生しました:', error);
        }

        if (success) {
            button.innerHTML = '<i class="fas fa-check me-1"></i>更新完了';
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.disabled = false;
            }, 1000);
        } else {
            button.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>更新失敗';
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.disabled = false;
            }, 2000);
        }

        if (caughtError == null && success === false) {
            console.warn('更新処理は失敗として扱われました');
        }

        return success;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const isTransfer = this.typeTransferRadio?.checked === true;

        const requiredFields = [];
        if (isTransfer) {
            const transferWorkOk = !!(this.transferWorkDate?.value);
            const transferHolidayOk = !!(this.transferHolidayDate?.value);
            requiredFields.push({ input: this.transferWorkDate, ok: transferWorkOk });
            requiredFields.push({ input: this.transferHolidayDate, ok: transferHolidayOk });
            this.setValidity(this.workDate, true);
            this.setValidity(this.compDate, true);
        } else {
            const workDateOk = !!(this.workDate?.value);
            requiredFields.push({ input: this.workDate, ok: workDateOk });
            if (this.compSwitch?.checked) {
                const compDateOk = !!(this.compDate?.value);
                requiredFields.push({ input: this.compDate, ok: compDateOk });
            } else {
                this.setValidity(this.compDate, true);
            }
            this.setValidity(this.transferWorkDate, true);
            this.setValidity(this.transferHolidayDate, true);
        }
        let firstInvalidField = null;
        requiredFields.forEach(({ input, ok }) => {
            this.setValidity(input, ok, '必須項目を入力してください');
            if (!ok && !firstInvalidField) {
                firstInvalidField = input;
            }
        });

        // 事前バリデーション（理由必須）
        const reasonValue = (this.reason?.value || '').trim();
        const hasReason = reasonValue.length > 0;
        if (!hasReason) {
            this.setValidity(this.reason, false, '必須項目を入力してください');
        } else {
            this.setValidity(this.reason, true);
        }
        const checks = [
            requiredFields.every(({ ok }) => ok),
            hasReason,
            isTransfer ? this.validateTransferWorkDate() : this.validateWorkDate(),
            isTransfer ? this.validateTransferHolidayDate() : this.validateCompDate()
        ];
        if (checks.some(ok => !ok)) {
            this.showAlert('必須項目を入力してください', 'warning');
            if (firstInvalidField?.focus) {
                firstInvalidField.focus();
            } else if (!hasReason) {
                this.reason?.focus();
            }
            return;
        }

        try {
            const payload = this.buildPayload();
            // 既存実装を踏襲: /api/holiday/requests に統一して送信
            const primaryUrl = '/api/holiday/requests';
            const altUrl = isTransfer ? '/api/holiday/transfer' : '/api/holiday/holiday-work';
            const body = isTransfer
                ? {
                    employeeId: window.currentEmployeeId,
                    requestType: 'TRANSFER',
                    transferWorkDate: payload.transferWorkDate,
                    transferHolidayDate: payload.transferHolidayDate,
                    reason: payload.reason || ''
                }
                : {
                    employeeId: window.currentEmployeeId,
                    requestType: 'HOLIDAY_WORK',
                    workDate: payload.workDate,
                    takeComp: !!payload.takeComp,
                    compDate: payload.compDate || null,
                    reason: payload.reason || ''
                };

            // 送信前モーダル（打刻修正申請モーダルのレイアウトに合わせる）
            const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            const formatDateForDialog = (v) => (v ? String(v).replace(/-/g, '/') : '-');
            const reasonDisplay = (body.reason || '').trim() || '記載なし';

            const modalMessageHtml = isTransfer
                ? `
                    <div class="text-start small">
                        <dl class="row g-1 mb-3 align-items-center">
                            <dt class="col-4 text-muted text-nowrap mb-0">振替出勤日</dt>
                            <dd class="col-8 text-end mb-0 fw-semibold">${formatDateForDialog(body.transferWorkDate)}</dd>
                            <dt class="col-4 text-muted text-nowrap mb-0">振替休日</dt>
                            <dd class="col-8 text-end mb-0 fw-semibold">${formatDateForDialog(body.transferHolidayDate)}</dd>
                            <dt class="col-4 text-muted text-nowrap mb-0">理由</dt>
                            <dd class="col-8 text-end mb-0">${escapeHtml(reasonDisplay)}</dd>
                        </dl>
                        <p class="mb-0">申請してよろしいですか？</p>
                    </div>
                `.trim()
                : `
                    <div class="text-start small">
                        <dl class="row g-1 mb-3 align-items-center">
                            <dt class="col-4 text-muted text-nowrap mb-0">休日出勤日</dt>
                            <dd class="col-8 text-end mb-0 fw-semibold">${formatDateForDialog(body.workDate)}</dd>
                            <dt class="col-4 text-muted text-nowrap mb-0">代休</dt>
                            <dd class="col-8 text-end mb-0 fw-semibold">${body.takeComp ? (formatDateForDialog(body.compDate) || '取得') : '取得しない'}</dd>
                            <dt class="col-4 text-muted text-nowrap mb-0">理由</dt>
                            <dd class="col-8 text-end mb-0">${escapeHtml(reasonDisplay)}</dd>
                        </dl>
                        <p class="mb-0">申請してよろしいですか？</p>
                    </div>
                `.trim();

            const confirmResult = await (window.employeeDialog?.confirm?.({
                title: isTransfer ? '振替申請の送信' : '休日出勤申請の送信',
                message: modalMessageHtml,
                confirmLabel: '申請する',
                cancelLabel: 'キャンセル',
                requireReason: false
            }) || Promise.resolve({ confirmed: true }));
            if (!confirmResult.confirmed) {
                return;
            }

            // 二重送信防止
            const submitBtn = this.submitBtn;
            if (submitBtn) submitBtn.disabled = true;

            // 1st: /requests にPOST、失敗したら従来URLにフォールバック
            let res = await window.fetchWithAuth.post(primaryUrl, body);
            let data = await window.fetchWithAuth.parseJson(res);
            if (!(res.ok && data && data.success)) {
                res = await window.fetchWithAuth.post(altUrl, body);
                data = await window.fetchWithAuth.parseJson(res);
            }

            if (res.ok && data && data.success) {
                this.showAlert(data.message || '申請しました', 'success');
                this.resetForm();
                // 休暇/打刻修正と同様、他画面のカレンダーを即時反映
                await this.refreshAllScreens();
            } else {
                const msg = data?.message || '申請に失敗しました';
                this.showAlert(msg, 'danger');
            }
        } catch (err) {
            console.error(err);
            this.showAlert('申請に失敗しました', 'danger');
        } finally {
            const submitBtn = this.submitBtn;
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    buildPayload() {
        const isTransfer = this.typeTransferRadio?.checked === true;
        if (isTransfer) {
            return {
                transferWorkDate: this.transferWorkDate?.value || null,
                transferHolidayDate: this.transferHolidayDate?.value || null,
                reason: (this.reason?.value || '').trim()
            };
        } else {
            return {
                workDate: this.workDate?.value || null,
                takeComp: this.compSwitch?.checked === true,
                compDate: this.compSwitch?.checked ? (this.compDate?.value || null) : null,
                reason: (this.reason?.value || '').trim()
            };
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        const id = `alert-${Date.now()}`;
        const html = `
            <div id="${id}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
        alertContainer.insertAdjacentHTML('beforeend', html);
        setTimeout(() => {
            document.getElementById(id)?.remove();
        }, 5000);
    }

    // 休暇/打刻修正の実装を踏襲: 申請成功時に他画面を更新
    async refreshAllScreens() {
        try {
            if (window.historyScreen) {
                try {
                    if (typeof window.historyScreen.loadCalendarData === 'function') {
                        await window.historyScreen.loadCalendarData(true);
                        if (typeof window.historyScreen.generateCalendar === 'function') {
                            window.historyScreen.generateCalendar();
                        }
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
                        if (typeof window.calendarScreen.generateCalendar === 'function') {
                            window.calendarScreen.generateCalendar();
                        }
                    }
                } catch (error) {
                    console.warn('カレンダー画面の更新に失敗:', error);
                }
            }
        } catch (e) {
            // noop
        }
    }
}

window.holidayScreen = new HolidayScreen();
