/**
 * カレンダー画面モジュール
 */
const CALENDAR_RANGE = {
    start: { year: 2025, month: 0 },
    end: { year: 2027, month: 11 }
};




class CalendarScreen {
    constructor() {
        this.calendarGrid = null;
        this.prevMonthBtn = null;
        this.currentMonthBtn = null;
        this.nextMonthBtn = null;
        this.currentMonthDisplay = null;
        this.monthlySubmitBtn = null;
        const initial = this.clampDateToRange(new Date());
        this.currentYear = initial.year;
        this.currentMonth = initial.month;
        this.attendanceData = [];
        this.vacationRequests = [];
        this.adjustmentRequests = [];
        this.holidayRequests = [];
        this.customHolidays = [];
        this.dayActionMenu = null;
        this.activeActionButton = null;
        this.actionMenuListenersBound = false;
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleWindowScrollBound = this.handleWindowScroll.bind(this);
        this.handleKeydownBound = this.handleKeydown.bind(this);
        this.calendarActionDefinitions = [
            { key: 'adjustment', path: '/adjustment', label: '打刻修正申請', icon: 'fas fa-pen-to-square' },
            { key: 'vacation', path: '/vacation', label: '休暇申請', icon: 'fas fa-plane-departure' },
            { key: 'workPattern', path: '/work-pattern', label: '勤務時間変更', icon: 'fas fa-business-time' },
            { key: 'holiday', path: '/holiday', label: '休日関連申請', icon: 'fas fa-sun' }
        ];
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadCalendarData();
        this.generateCalendar();
        this.updateNavigationState();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.calendarGrid = document.getElementById('calendarGrid');
        this.prevMonthBtn = document.getElementById('prevMonthBtn');
        this.currentMonthBtn = document.getElementById('currentMonthBtn');
        this.nextMonthBtn = document.getElementById('nextMonthBtn');
        this.currentMonthDisplay = document.getElementById('currentMonthDisplay');
        this.monthlySubmitBtn = document.getElementById('monthlySubmitBtn');

        if (this.calendarGrid && !this.calendarGrid.dataset.actionBound) {
            this.calendarGrid.addEventListener('click', (event) => this.handleCalendarGridClick(event));
            this.calendarGrid.dataset.actionBound = 'true';
        }
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.prevMonthBtn) {
            this.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        }

        if (this.currentMonthBtn) {
            this.currentMonthBtn.addEventListener('click', () => this.goToCurrentMonth());
        }

        if (this.nextMonthBtn) {
            this.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        }

        if (this.monthlySubmitBtn) {
            this.monthlySubmitBtn.addEventListener('click', () => this.handleMonthlySubmit());
        }
        
        // 却下コメント表示のイベントリスナーを設定
        this.setupRejectionCommentListeners();
    }

    /**
     * カレンダーデータ読み込み
     */
    async loadCalendarData() {
        try {
            // 勤怠データ読み込み
            await this.loadAttendanceData();
            // 休暇申請データ読み込み
            await this.loadVacationRequests();
            // 打刻修正申請データ読み込み
            await this.loadAdjustmentRequests();
            // 休日出勤・振替出勤申請データ読み込み
            await this.loadHolidayRequests();
            // カスタム休日データ読み込み
            await this.loadCustomHolidays();
        } catch (error) {
            console.error('カレンダーデータ読み込みエラー:', error);
        }
    }

    /**
     * 勤怠データ読み込み
     */
    async loadAttendanceData() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/attendance/history/${window.currentEmployeeId}?year=${this.currentYear}&month=${this.currentMonth + 1}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.attendanceData = data.data || [];
            }
        } catch (error) {
            console.error('勤怠データ読み込みエラー:', error);
            this.attendanceData = [];
        }
    }

    /**
     * 休暇申請データ読み込み
     */
    async loadVacationRequests() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/leave/requests/${window.currentEmployeeId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const rawList = Array.isArray(data.data) ? data.data : [];
                const normalized = this.normalizeVacationEntries(rawList);
                this.vacationRequests = normalized.filter((entry) => {
                    const date = this.parseDateString(entry.date);
                    return date && date.getFullYear() === this.currentYear && date.getMonth() === this.currentMonth;
                });
            } else {
                this.vacationRequests = [];
            }
        } catch (error) {
            console.error('休暇申請データ読み込みエラー:', error);
            this.vacationRequests = [];
        }
    }

    /**
     * APIから取得した休暇データを日別ベースに正規化
     */
    normalizeVacationEntries(entries) {
        if (!Array.isArray(entries)) {
            return [];
        }

        const normalized = [];
        entries.forEach(item => {
            if (!item) return;

            const status = item.status || 'PENDING';
            if ((status || '').toUpperCase() === 'CANCELLED') {
                return;
            }

            if (item.date) {
                const parsed = this.parseDateString(item.date);
                if (parsed) {
                    const isWeekend = parsed.getDay() === 0 || parsed.getDay() === 6;
                    const isHoliday = this.isHoliday(parsed);
                    if (!(isWeekend || isHoliday)) {
                        normalized.push({ ...item, date: this.formatDateString(parsed) });
                    }
                }
                return;
            }

            if (item.startDate && item.endDate) {
                const start = this.parseDateString(item.startDate);
                const end = this.parseDateString(item.endDate);
                if (!start || !end) {
                    return;
                }

                for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
                    const current = new Date(d);
                    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
                    const isHoliday = this.isHoliday(current);
                    if (isWeekend || isHoliday) {
                        continue; // 休日は休暇バッジを表示しない
                    }
                    normalized.push({ ...item, date: this.formatDateString(current) });
                }
            }
        });

        return normalized;
    }

    /**
     * 打刻修正申請データ読み込み
     */
    async loadAdjustmentRequests() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/attendance/adjustments?employeeId=${window.currentEmployeeId}&year=${this.currentYear}&month=${this.currentMonth + 1}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.adjustmentRequests = data.data || [];
            }
        } catch (error) {
            console.error('打刻修正申請データ読み込みエラー:', error);
            this.adjustmentRequests = [];
        }
    }

    /**
     * 休日出勤・振替出勤申請データ読み込み
     */
    async loadHolidayRequests() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/holiday/requests/${window.currentEmployeeId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const requests = (data && data.success && Array.isArray(data.data)) ? data.data : [];

                // 当月分の申請データのみをフィルタリング（workDate or transferWorkDate or transferHolidayDate）
                this.holidayRequests = requests.filter(req => {
                    const raw = req.workDate || req.transferWorkDate || req.transferHolidayDate;
                    if (!raw) return false;
                    const d = this.parseDateString(String(raw));
                    return d && d.getFullYear() === this.currentYear && d.getMonth() === this.currentMonth;
                });
            } else {
                this.holidayRequests = [];
            }
        } catch (error) {
            console.error('休日出勤・振替出勤申請データ読み込みエラー:', error);
            this.holidayRequests = [];
        }
    }

    /**
     * カスタム休日データ読み込み
     */
    async loadCustomHolidays() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetch(`/api/custom-holidays/employee/${window.currentEmployeeId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.customHolidays = data.data || [];
            }
        } catch (error) {
            console.error('カスタム休日データ読み込みエラー:', error);
            this.customHolidays = [];
        }
    }

    /**
     * カレンダー生成
     */
    generateCalendar() {
        if (!this.calendarGrid) return;

        // 月表示更新
        if (this.currentMonthDisplay) {
            this.currentMonthDisplay.textContent = `${this.currentYear}/${String(this.currentMonth + 1).padStart(2, '0')}`;
        }

        // 曜日ヘッダー
        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        const headerHtml = weekdays.map(day => 
            `<div class="calendar-header">${day}</div>`
        ).join('');

        // 月の最初の日と最後の日
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

        // 月曜始まりのカレンダー計算
        const startDate = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - mondayOffset);

        let calendarHtml = headerHtml;

        // 6週間分のカレンダーを生成
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);

                const isCurrentMonth = currentDate.getMonth() === this.currentMonth;
                const isToday = this.isToday(currentDate);
                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                const isHoliday = this.isHoliday(currentDate);

                const dayNumber = currentDate.getDate();
                const dateString = this.formatDateString(currentDate);
                const isNonWorkingDay = isWeekend || isHoliday;

                // 勤怠データの取得
                const attendance = this.getAttendanceForDate(dateString);
                const vacationRequest = this.getVacationRequestForDate(dateString);
                const adjustmentRequest = this.getAdjustmentRequestForDate(dateString);
                const holidayRequest = this.getHolidayRequestForDate(dateString);
                const customHoliday = this.getCustomHolidayForDate(dateString);

                // 日付のクラス設定
                let dayClasses = ['calendar-day'];
                if (!isCurrentMonth) dayClasses.push('other-month');
                if (isToday) dayClasses.push('today');
                if (isWeekend || isHoliday) dayClasses.push('weekend');
                if (attendance) dayClasses.push('has-attendance');
                if (attendance && attendance.clockOutTime) dayClasses.push('clocked-out');
                if (attendance && attendance.clockInTime && !attendance.clockOutTime) dayClasses.push('clocked-in');

                // バッジ表示
                let badges = '';
                if (vacationRequest) {
                    const statusUpper = (vacationRequest.status || '').toUpperCase();
                    let statusClass = 'bg-warning';
                    let statusLabel = '申請中';
                    if (statusUpper === 'APPROVED') {
                        statusClass = 'bg-success';
                        statusLabel = '承認済';
                    } else if (statusUpper === 'REJECTED') {
                        statusClass = 'bg-danger';
                        statusLabel = '却下';
                    }
                    const typeLabel = LEAVE_TYPE_LABELS[vacationRequest.leaveType] || '休暇';
                    const unitMarker = LEAVE_TIME_UNIT_MARKERS[vacationRequest.timeUnit] || '';
                    
                    // 申請中の場合は「有休申請中」「AM有休申請中」、承認済みの場合は「有休承認済」「AM有休承認済」などの単位を表示
                    let badgeText;
                    if (statusUpper === 'PENDING') {
                        if (typeLabel === '有休') {
                            // 有休の場合、時間単位に応じて表示を決定
                            if (vacationRequest.timeUnit === 'HALF_AM') {
                                badgeText = 'AM有休申請中';
                            } else if (vacationRequest.timeUnit === 'HALF_PM') {
                                badgeText = 'PM有休申請中';
                            } else {
                                badgeText = '有休申請中';
                            }
                        } else {
                            badgeText = `${typeLabel}休暇申請中`;
                        }
                    } else {
                        if (typeLabel === '有休') {
                            // 有休の場合、時間単位に応じて表示を決定
                            if (vacationRequest.timeUnit === 'HALF_AM') {
                                badgeText = `AM有休${statusLabel}`;
                            } else if (vacationRequest.timeUnit === 'HALF_PM') {
                                badgeText = `PM有休${statusLabel}`;
                            } else {
                                badgeText = `有休${statusLabel}`;
                            }
                        } else {
                            badgeText = `${typeLabel}休暇${statusLabel}`;
                        }
                    }
                    badges += `<span class="badge ${statusClass} badge-sm">${badgeText}</span>`;
                }
                if (adjustmentRequest) {
                    let statusClass, statusText;
                    if (adjustmentRequest.status === 'APPROVED') {
                        statusClass = 'bg-success';
                        statusText = '修正承認済';
                    } else if (adjustmentRequest.status === 'REJECTED') {
                        statusClass = 'bg-danger';
                        statusText = '修正却下';
                    } else {
                        statusClass = 'bg-warning';
                        statusText = '修正申請中';
                    }
                    badges += `<span class="badge ${statusClass} badge-sm adjustment-badge" data-adjustment-id="${adjustmentRequest.adjustmentRequestId}" data-rejection-comment="${adjustmentRequest.rejectionComment || ''}">${statusText}</span>`;
                }
                if (holidayRequest) {
                    let statusClass, statusText, requestTypeLabel;
                    if ((holidayRequest.status || '').toUpperCase() === 'APPROVED') {
                        statusClass = 'bg-success';
                        statusText = '承認済';
                    } else if ((holidayRequest.status || '').toUpperCase() === 'REJECTED') {
                        statusClass = 'bg-danger';
                        statusText = '却下';
                    } else {
                        statusClass = 'bg-warning';
                        statusText = '申請中';
                    }

                    if (holidayRequest.requestType === 'HOLIDAY_WORK') {
                        requestTypeLabel = '休日出勤';
                    } else if (holidayRequest.requestType === 'TRANSFER') {
                        requestTypeLabel = '振替';
                    } else {
                        requestTypeLabel = '休日関連';
                    }

                    badges += `<span class="badge ${statusClass} badge-sm">${requestTypeLabel}${statusText}</span>`;
                }

                // カスタム休日・代休/振替休日の表示
                // バックエンドは承認時に CustomHoliday を作成/削除するため
                // ここでは customHoliday があれば休日扱いとして赤字で表示する
                let customHolidayLabel = '';
                if (customHoliday) {
                    const typeText = customHoliday.holidayType || '休日';
                    customHolidayLabel = `<div class="holiday-label text-danger fw-semibold">${typeText}</div>`;
                }

                // 通常の土日祝の「休日」表記
                // ただし、承認済みの休日出勤/振替出勤がある日は赤字「休日」を消す
                let holidayLabel = '';
                if (isNonWorkingDay && !customHoliday) {
                    const approvedHolidayRequest = this.getApprovedHolidayRequestForDate(dateString);
                    if (!approvedHolidayRequest) {
                        holidayLabel = '<div class="holiday-label text-danger fw-semibold">休日</div>';
                    }
                }

                calendarHtml += `
                    <div class="${dayClasses.join(' ')}" data-date="${dateString}">
                        <div class="day-header">
                            <div class="day-number">${dayNumber}</div>
                            ${customHolidayLabel}
                            ${holidayLabel}
                        </div>
                        <div class="day-badges">${badges}</div>
                        ${attendance ? this.renderAttendanceInfo(attendance) : ''}
                        <button type="button" class="calendar-add-btn" data-date="${dateString}" aria-label="${dateString}の申請を追加" aria-haspopup="menu" aria-expanded="false">
                            <i class="fas fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                `;
            }
        }

        this.calendarGrid.innerHTML = calendarHtml;

        // 却下コメント表示のイベントリスナーを追加
        this.setupRejectionCommentListeners();
        this.hideActionMenu();
        this.ensureActionMenu();

        this.updateNavigationState();
    }

    ensureActionMenu() {
        if (this.dayActionMenu) {
            return this.dayActionMenu;
        }
        if (!Array.isArray(this.calendarActionDefinitions) || this.calendarActionDefinitions.length === 0) {
            return null;
        }
        const menu = document.createElement('div');
        menu.className = 'calendar-action-menu';
        menu.setAttribute('role', 'menu');
        menu.innerHTML = this.calendarActionDefinitions.map(({ key, label, icon }) => {
            const iconHtml = icon ? `<i class="${icon}" aria-hidden="true"></i>` : '';
            return `<button type="button" class="calendar-action-item" data-action="${key}" role="menuitem">${iconHtml}<span>${label}</span></button>`;
        }).join('');
        menu.addEventListener('click', (event) => this.handleActionMenuClick(event));
        document.body.appendChild(menu);
        this.dayActionMenu = menu;
        this.bindActionMenuListeners();
        return menu;
    }

    bindActionMenuListeners() {
        if (this.actionMenuListenersBound) {
            return;
        }
        document.addEventListener('click', this.handleDocumentClickBound);
        window.addEventListener('scroll', this.handleWindowScrollBound, true);
        window.addEventListener('resize', this.handleWindowScrollBound, true);
        document.addEventListener('keydown', this.handleKeydownBound);
        this.actionMenuListenersBound = true;
    }

    handleCalendarGridClick(event) {
        const addButton = event.target.closest('.calendar-add-btn');
        if (addButton) {
            event.preventDefault();
            event.stopPropagation();
            const { date } = addButton.dataset;
            this.toggleActionMenu(addButton, date);
        }
    }

    toggleActionMenu(button, dateString) {
        if (!button || !dateString) {
            return;
        }
        const menu = this.ensureActionMenu();
        if (!menu) {
            return;
        }
        const isoDate = this.convertToIsoDate(dateString);
        const alreadyOpen = menu.dataset.visible === 'true'
            && menu.dataset.dateIso === isoDate
            && this.activeActionButton === button;
        if (alreadyOpen) {
            this.hideActionMenu();
            return;
        }
        this.showActionMenu(button, dateString, isoDate);
    }

    showActionMenu(button, displayDate, isoDate) {
        const menu = this.ensureActionMenu();
        if (!menu) {
            return;
        }

        if (this.activeActionButton && this.activeActionButton !== button) {
            this.activeActionButton.setAttribute('aria-expanded', 'false');
        }

        this.activeActionButton = button;
        button.setAttribute('aria-expanded', 'true');

        menu.dataset.visible = 'true';
        menu.dataset.dateIso = isoDate;
        menu.dataset.dateDisplay = displayDate;
        menu.style.display = 'block';
        menu.style.visibility = 'hidden';

        requestAnimationFrame(() => {
            if (!this.activeActionButton || menu.dataset.visible !== 'true') {
                return;
            }
            const rect = this.activeActionButton.getBoundingClientRect();
            const menuWidth = menu.offsetWidth;
            const menuHeight = menu.offsetHeight;
            const scrollX = window.scrollX || window.pageXOffset || 0;
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const preferredTop = scrollY + rect.bottom + 6;
            const preferredLeft = scrollX + rect.right - menuWidth;

            let top = preferredTop;
            let left = preferredLeft;

            const viewportBottom = scrollY + window.innerHeight;
            if (preferredTop + menuHeight + 8 > viewportBottom) {
                top = Math.max(scrollY + rect.top - menuHeight - 6, scrollY + 8);
            }

            left = Math.max(left, scrollX + 8);

            menu.style.top = `${top}px`;
            menu.style.left = `${left}px`;
            menu.style.visibility = 'visible';
        });
    }

    hideActionMenu() {
        if (!this.dayActionMenu || this.dayActionMenu.dataset.visible !== 'true') {
            if (this.activeActionButton) {
                this.activeActionButton.setAttribute('aria-expanded', 'false');
                this.activeActionButton = null;
            }
            return;
        }
        this.dayActionMenu.style.display = 'none';
        this.dayActionMenu.style.visibility = 'hidden';
        this.dayActionMenu.dataset.visible = 'false';
        this.dayActionMenu.removeAttribute('data-date-iso');
        this.dayActionMenu.removeAttribute('data-date-display');
        if (this.activeActionButton) {
            this.activeActionButton.setAttribute('aria-expanded', 'false');
            this.activeActionButton = null;
        }
    }

    convertToIsoDate(value) {
        if (!value || typeof value !== 'string') {
            return '';
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }
        if (trimmed.includes('/')) {
            return trimmed.replace(/\//g, '-');
        }
        return trimmed;
    }

    handleActionMenuClick(event) {
        const item = event.target.closest('.calendar-action-item');
        if (!item) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const actionKey = item.dataset.action;
        const isoDate = this.dayActionMenu?.dataset?.dateIso || '';
        const displayDate = this.dayActionMenu?.dataset?.dateDisplay || '';
        this.performActionNavigation(actionKey, isoDate, displayDate);
    }

    performActionNavigation(actionKey, isoDate, displayDate) {
        const action = (this.calendarActionDefinitions || []).find((candidate) => candidate.key === actionKey);
        if (!action || !isoDate) {
            this.hideActionMenu();
            return;
        }

        const payload = {
            source: 'calendar',
            date: isoDate,
            startDate: isoDate,
            displayDate
        };

        switch (action.key) {
            case 'adjustment':
                payload.clockInDate = isoDate;
                break;
            case 'workPattern':
                payload.endDate = isoDate;
                break;
            case 'holiday':
                payload.workDate = isoDate;
                payload.transferWorkDate = isoDate;
                break;
            default:
                break;
        }

        if (typeof window.setNavigationPrefill === 'function') {
            window.setNavigationPrefill(action.path, payload);
        } else {
            window.__navigationPrefillFallback = window.__navigationPrefillFallback || {};
            window.__navigationPrefillFallback[action.path] = payload;
        }

        this.hideActionMenu();

        if (window.router && typeof window.router.navigate === 'function') {
            window.router.navigate(action.path, { updateHistory: true });
        } else {
            window.location.href = action.path;
        }
    }

    handleDocumentClick(event) {
        if (!this.dayActionMenu || this.dayActionMenu.dataset.visible !== 'true') {
            return;
        }
        const target = event.target;
        if (target && typeof target.closest === 'function') {
            if (target.closest('.calendar-action-menu') || target.closest('.calendar-add-btn')) {
                return;
            }
        }
        this.hideActionMenu();
    }

    handleWindowScroll() {
        this.hideActionMenu();
    }

    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.hideActionMenu();
        }
    }

    /**
     * 今日かどうか判定
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    /**
     * 祝日かどうか判定
     */
    isHoliday(date) {
        if (window.BusinessDayUtils && typeof window.BusinessDayUtils.isHoliday === 'function') {
            return window.BusinessDayUtils.isHoliday(date);
        }

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const holidays = this.getHolidays(year);
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        return holidays.includes(dateString);
    }

    /**
     * 指定年の祝日一覧を取得
     */
    getHolidays(year) {
        if (year < CALENDAR_RANGE.start.year || year > CALENDAR_RANGE.end.year) {
            return [];
        }

        if (window.BusinessDayUtils && typeof window.BusinessDayUtils.getHolidayListForYear === 'function') {
            return window.BusinessDayUtils.getHolidayListForYear(year);
        }

        return [];
    }

    /**
     * 文字列から日付オブジェクトを生成（YYYY-MM-DD / YYYY/MM/DD などを許容）
     */
    parseDateString(value) {
        if (!value || typeof value !== 'string') {
            return null;
        }
        const parts = value.split(/[-/]/);
        if (parts.length !== 3) {
            return null;
        }
        const [yearStr, monthStr, dayStr] = parts;
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if ([year, month, day].some(num => Number.isNaN(num))) {
            return null;
        }
        return new Date(year, month - 1, day);
    }

    /**
     * 日付文字列フォーマット
     */
    formatDateString(date) {
        return date.getFullYear() + '/' + 
               String(date.getMonth() + 1).padStart(2, '0') + '/' + 
               String(date.getDate()).padStart(2, '0');
    }

    /**
     * 指定日の勤怠データ取得
     */
    getAttendanceForDate(dateString) {
        return this.attendanceData.find(record => record.attendanceDate === dateString);
    }

    /**
     * 指定日の休暇申請取得
     */
    getVacationRequestForDate(dateString) {
        return this.vacationRequests.find(request => request.date === dateString);
    }

    /**
     * 指定日の打刻修正申請取得
     */
    getAdjustmentRequestForDate(dateString) {
        return this.adjustmentRequests.find(request => request.date === dateString);
    }

    /**
     * 指定日のカスタム休日取得
     */
    getCustomHolidayForDate(dateString) {
        return this.customHolidays.find(holiday => {
            const holidayDate = new Date(holiday.holidayDate);
            const formattedDate = this.formatDateString(holidayDate);
            return formattedDate === dateString;
        });
    }

    /**
     * 指定日の休日出勤・振替出勤申請取得
     */
    getHolidayRequestForDate(dateString) {
        return this.holidayRequests.find(request => {
            const raw = request.workDate || request.transferWorkDate || request.transferHolidayDate;
            if (!raw) return false;
            const d = this.parseDateString(String(raw));
            return d && this.formatDateString(d) === dateString;
        });
    }

    /**
     * 指定日の承認済み休日出勤・振替出勤申請取得
     */
    getApprovedHolidayRequestForDate(dateString) {
        return this.holidayRequests.find(request => {
            const raw = request.workDate || request.transferWorkDate || request.transferHolidayDate;
            if (!raw) return false;
            const d = this.parseDateString(String(raw));
            const isDateMatch = d && this.formatDateString(d) === dateString;
            const isApproved = (request.status || '').toUpperCase() === 'APPROVED';
            return isDateMatch && isApproved;
        });
    }

    /**
     * 勤怠情報レンダリング
     */
    renderAttendanceInfo(attendance) {
        if (!attendance) return '';

        const clockInTime = attendance.clockInTime ? 
            new Date(attendance.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
        const clockOutTime = attendance.clockOutTime ? 
            new Date(attendance.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

        return `
            <div class="attendance-info">
                <div class="clock-times">
                    <small>出勤: ${clockInTime}</small><br>
                    <small>退勤: ${clockOutTime}</small>
                </div>
            </div>
        `;
    }

    /**
     * 月変更
     */
    async changeMonth(direction) {
        const tentativeMonth = this.currentMonth + direction;
        let year = this.currentYear;
        let month = tentativeMonth;

        if (tentativeMonth < 0) {
            year -= Math.ceil(Math.abs(tentativeMonth) / 12);
            month = ((tentativeMonth % 12) + 12) % 12;
        } else if (tentativeMonth > 11) {
            year += Math.floor(tentativeMonth / 12);
            month = tentativeMonth % 12;
        }

        const clamped = this.clampYearMonth(year, month);

        if (clamped.year === this.currentYear && clamped.month === this.currentMonth) {
            this.updateNavigationState();
            return;
        }

        this.currentYear = clamped.year;
        this.currentMonth = clamped.month;

        await this.loadCalendarData();
        this.generateCalendar();
    }

    /**
     * 今月に移動
     */
    async goToCurrentMonth() {
        const clamped = this.clampDateToRange(new Date());

        if (clamped.year === this.currentYear && clamped.month === this.currentMonth) {
            this.updateNavigationState();
            return;
        }

        this.currentYear = clamped.year;
        this.currentMonth = clamped.month;

        await this.loadCalendarData();
        this.generateCalendar();
    }

    /**
     * 月末申請処理
     */
    async handleMonthlySubmit() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/attendance/monthly-submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({
                    employeeId: window.currentEmployeeId,
                    yearMonth: `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.showAlert(data.message || '月末申請が完了しました', 'success');
                await this.loadCalendarData();
                this.generateCalendar();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || '月末申請に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('月末申請エラー:', error);
            this.showAlert('月末申請中にエラーが発生しました', 'danger');
        }
    }

    getMonthIndex(year, month) {
        return year * 12 + month;
    }

    clampYearMonth(year, month) {
        const startIndex = this.getMonthIndex(CALENDAR_RANGE.start.year, CALENDAR_RANGE.start.month);
        const endIndex = this.getMonthIndex(CALENDAR_RANGE.end.year, CALENDAR_RANGE.end.month);
        const targetIndex = this.getMonthIndex(year, month);

        if (targetIndex < startIndex) {
            return { ...CALENDAR_RANGE.start };
        }

        if (targetIndex > endIndex) {
            return { ...CALENDAR_RANGE.end };
        }

        return { year, month };
    }

    clampDateToRange(date) {
        return this.clampYearMonth(date.getFullYear(), date.getMonth());
    }

    isAtRangeStart() {
        return this.currentYear === CALENDAR_RANGE.start.year && this.currentMonth === CALENDAR_RANGE.start.month;
    }

    isAtRangeEnd() {
        return this.currentYear === CALENDAR_RANGE.end.year && this.currentMonth === CALENDAR_RANGE.end.month;
    }

    updateNavigationState() {
        const atStart = this.isAtRangeStart();
        const atEnd = this.isAtRangeEnd();

        if (this.prevMonthBtn) {
            this.prevMonthBtn.disabled = atStart;
        }

        if (this.nextMonthBtn) {
            this.nextMonthBtn.disabled = atEnd;
        }

        if (this.currentMonthBtn) {
            const today = this.clampDateToRange(new Date());
            const isCurrentView = today.year === this.currentYear && today.month === this.currentMonth;
            this.currentMonthBtn.disabled = isCurrentView;
        }
    }

    /**
     * 却下コメント表示のイベントリスナー設定
     */
    setupRejectionCommentListeners() {
        // 既存のイベントリスナーを削除
        const existingListeners = document.querySelectorAll('.adjustment-badge');
        existingListeners.forEach(badge => {
            badge.removeEventListener('click', this.showRejectionComment);
        });

        // 新しいイベントリスナーを追加
        const adjustmentBadges = document.querySelectorAll('.adjustment-badge');
        adjustmentBadges.forEach(badge => {
            badge.addEventListener('click', (e) => this.showRejectionComment(e));
        });
    }

    /**
     * 却下コメント表示
     */
    showRejectionComment(event) {
        const badge = event.target;
        const rejectionComment = badge.getAttribute('data-rejection-comment');
        
        if (rejectionComment && rejectionComment.trim()) {
            // モーダルで却下コメントを表示
            this.showRejectionCommentModal(rejectionComment);
        }
    }

    /**
     * 却下コメントモーダル表示
     */
    showRejectionCommentModal(comment) {
        // 既存のモーダルを削除
        const existingModal = document.getElementById('rejectionCommentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // モーダルHTMLを作成
        const modalHtml = `
            <div class="modal fade" id="rejectionCommentModal" tabindex="-1" aria-labelledby="rejectionCommentModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="rejectionCommentModalLabel">打刻修正申請却下理由</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning">
                                <h6>却下理由:</h6>
                                <p>${comment}</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // モーダルをDOMに追加
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // モーダルを表示
        const modalElement = document.getElementById('rejectionCommentModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    /**
     * アラート表示
     */
    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertContainer.insertAdjacentHTML('beforeend', alertHtml);

        // 5秒後に自動削除
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }
}
