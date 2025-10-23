/**
 * 休日関連（休日出勤/振替）画面モジュール
 */
class HolidayScreen {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.initializeElements();
        this.setupEventListeners();
        this.resetForm();
    }

    initializeElements() {
        this.holidayForm = document.getElementById('holidayForm');
        this.typeWorkRadio = document.getElementById('holidayTypeWork');
        this.typeTransferRadio = document.getElementById('holidayTypeTransfer');
        this.transferRow = document.getElementById('transferRow');
        this.compSwitch = document.getElementById('compensatoryOffSwitch');
        this.compSwitchContainer = this.compSwitch ? this.compSwitch.closest('.col-md-6') : null;
        this.workDate = document.getElementById('holidayWorkDate');
        this.compDate = document.getElementById('compensatoryDate');
        this.holidayWorkRow = this.workDate ? this.workDate.closest('.row') : null;
        this.transferWorkDate = document.getElementById('transferWorkDate');
        this.transferHolidayDate = document.getElementById('transferHolidayDate');
        this.reason = document.getElementById('holidayReason');
        this.resetBtn = document.getElementById('holidayFormResetBtn');
        this.submitBtn = document.getElementById('holidaySubmitBtn');
        this.summaryClockIn = document.querySelector('[data-hol-sum-clock-in]');
        this.summaryClockOut = document.querySelector('[data-hol-sum-clock-out]');
        this.summaryStatus = document.querySelector('[data-hol-sum-status]');
        this.summaryTitleEl = document.querySelector('#holidaySelectedDaySummary .fw-semibold.text-body.mb-1');
        this.holidayWorkHelp = document.getElementById('holidayWorkHelp');
        this.compensatoryHelp = document.getElementById('compensatoryHelp');
        this.transferWorkHelp = document.getElementById('transferWorkHelp');
        this.transferHolidayHelp = document.getElementById('transferHolidayHelp');
        this.upcomingHolidaysHint = document.getElementById('upcomingHolidaysHint');
    }

    setupEventListeners() {
        if (!this.holidayForm) return;

        // タブ切り替え
        const updateMode = () => {
            const isTransfer = this.typeTransferRadio?.checked === true;
            if (this.transferRow) this.transferRow.style.display = isTransfer ? '' : 'none';
            if (this.holidayWorkRow) this.holidayWorkRow.style.display = isTransfer ? 'none' : '';
            if (this.compSwitchContainer) this.compSwitchContainer.style.display = isTransfer ? 'none' : '';
            // 休日出勤モード
            this.workDate.required = !isTransfer;
            this.compSwitch.disabled = isTransfer;
            this.compDate.disabled = !this.compSwitch.checked || isTransfer;

            // 振替モード
            if (isTransfer) {
                this.transferWorkDate.required = true;
                this.transferHolidayDate.required = true;
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
            }
        };
        this.typeWorkRadio?.addEventListener('change', updateMode);
        this.typeTransferRadio?.addEventListener('change', updateMode);

        // 代休スイッチ
        this.compSwitch?.addEventListener('change', () => {
            const on = this.compSwitch.checked;
            this.compDate.disabled = !on;
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

        updateMode();
        this.updateHolidayWorkHints();
        this.updateUpcomingHolidaysHint();
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
    }

    // 休日（非勤務日）かどうか
    isHolidayOrWeekend(dateStr) {
        const d = this.parseDate(dateStr);
        if (!d) return false;
        // 勤務時間変更の休日適用を最優先
        if (typeof window.isWorkingDayByPattern === 'function') {
            const patternWork = window.isWorkingDayByPattern(d);
            if (patternWork !== null && patternWork !== undefined) {
                return !patternWork;
            }
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
        if (typeof window.isWorkingDayByPattern === 'function') {
            const patternWork = window.isWorkingDayByPattern(d);
            if (patternWork !== null && patternWork !== undefined) {
                return !!patternWork;
            }
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

    updateUpcomingHolidaysHint() {
        if (!this.upcomingHolidaysHint) return;
        try {
            const today = new Date();
            const list = [];
            // 今日から先の休日を10件収集（上限90日走査）
            for (let i = 0; list.length < 10 && i < 90; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const patternWork = typeof window.isWorkingDayByPattern === 'function' ? window.isWorkingDayByPattern(d) : null;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isHolidayCal = window.BusinessDayUtils && typeof window.BusinessDayUtils.isHoliday === 'function' ? window.BusinessDayUtils.isHoliday(d) : false;
                const isHoliday = patternWork === null ? (isWeekend || isHolidayCal) : !patternWork;
                if (isHoliday) {
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    list.push(`${mm}/${dd}`);
                }
            }
            // タイトルを置き換え
            if (this.summaryTitleEl) {
                this.summaryTitleEl.textContent = '休日予定日';
            }
            // 1行に統一して表示（フォーマット固定 MM/DD）
            const oneLine = list.join(' / ');
            if (this.summaryClockIn) this.summaryClockIn.textContent = oneLine || '-';
            if (this.summaryClockOut) this.summaryClockOut.textContent = '';
            if (this.summaryStatus) this.summaryStatus.hidden = true;
            if (this.upcomingHolidaysHint) {
                this.upcomingHolidaysHint.textContent = '';
                this.upcomingHolidaysHint.style.display = 'none';
            }
        } catch (e) {
            // noop
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const isTransfer = this.typeTransferRadio?.checked === true;

        // 事前バリデーション
        const checks = [
            isTransfer ? this.validateTransferWorkDate() : this.validateWorkDate(),
            isTransfer ? this.validateTransferHolidayDate() : this.validateCompDate()
        ];
        if (checks.some(ok => !ok)) {
            this.showAlert('入力内容を確認してください', 'danger');
            return;
        }

        try {
            const payload = this.buildPayload();
            const url = isTransfer ? '/api/holiday/transfer' : '/api/holiday/holiday-work';
            const body = isTransfer
                ? {
                    employeeId: window.currentEmployeeId,
                    transferWorkDate: payload.transferWorkDate,
                    transferHolidayDate: payload.transferHolidayDate,
                    reason: payload.reason || ''
                }
                : {
                    employeeId: window.currentEmployeeId,
                    workDate: payload.workDate,
                    takeComp: !!payload.takeComp,
                    compDate: payload.compDate || null,
                    reason: payload.reason || ''
                };
            const res = await window.fetchWithAuth.post(url, body);
            const data = await window.fetchWithAuth.parseJson(res);
            if (res.ok && data && data.success) {
                this.showAlert(data.message || '申請しました', 'success');
                this.resetForm();
            } else {
                const msg = data?.message || '申請に失敗しました';
                this.showAlert(msg, 'danger');
            }
        } catch (err) {
            console.error(err);
            this.showAlert('申請に失敗しました', 'danger');
        }
    }

    buildPayload() {
        const isTransfer = this.typeTransferRadio?.checked === true;
        if (isTransfer) {
            return {
                type: 'TRANSFER',
                transferWorkDate: this.transferWorkDate?.value || null,
                transferHolidayDate: this.transferHolidayDate?.value || null,
                reason: (this.reason?.value || '').trim()
            };
        } else {
            return {
                type: 'HOLIDAY_WORK',
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
}

window.holidayScreen = new HolidayScreen();


