/**
 * 時間表示ユーティリティ
 */
class TimeUtils {
    /**
     * 分数を時間:分形式に変換（0:00形式に統一）
     * @param {number} minutes - 分数
     * @returns {string} 時間:分形式の文字列
     */
    static formatMinutesToTime(minutes) {
        const normalized = this.normalizeMinutesValue(minutes);
        if (normalized === null || Number.isNaN(normalized)) {
            return '0:00';
        }
        const rounded = Math.trunc(normalized);
        const sign = rounded < 0 ? '-' : '';
        const absolute = Math.abs(rounded);
        const hours = Math.floor(absolute / 60);
        const mins = absolute % 60;
        return `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * 時間文字列を分数に変換
     * @param {string} timeString - 時間:分形式の文字列（例: "8:30"）
     * @returns {number} 分数
     */
    static timeStringToMinutes(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return 0;
        }
        const parts = timeString.split(':');
        if (parts.length !== 2) {
            return 0;
        }
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 60 + minutes;
    }

    /**
     * 8桁または4桁の文字列を日付/時間形式へ整形
     */
    static normalizeCompactDateString(value) {
        if (value === null || value === undefined) {
            return null;
        }
        const digitsOnly = String(value).replace(/\D/g, '');
        if (digitsOnly.length !== 8) {
            return null;
        }
        const year = parseInt(digitsOnly.slice(0, 4), 10);
        const month = parseInt(digitsOnly.slice(4, 6), 10);
        const day = parseInt(digitsOnly.slice(6, 8), 10);
        if (!this.isValidDateParts(year, month, day)) {
            return null;
        }
        const yyyy = digitsOnly.slice(0, 4);
        const mm = digitsOnly.slice(4, 6);
        const dd = digitsOnly.slice(6, 8);
        const iso = `${yyyy}-${mm}-${dd}`;
        const display = `${yyyy}/${mm}/${dd}`;
        const date = new Date(year, month - 1, day);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return { iso, display, date };
    }

    static normalizeCompactTimeString(value) {
        if (value === null || value === undefined) {
            return null;
        }
        let digitsOnly = String(value).replace(/\D/g, '');
        if (digitsOnly.length === 3) {
            digitsOnly = `0${digitsOnly}`;
        }
        if (digitsOnly.length !== 4) {
            return null;
        }
        const hours = parseInt(digitsOnly.slice(0, 2), 10);
        const minutes = parseInt(digitsOnly.slice(2, 4), 10);
        if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
            return null;
        }
        const hh = digitsOnly.slice(0, 2);
        const mm = digitsOnly.slice(2, 4);
        return {
            value: `${hh}:${mm}`,
            display: `${hh}:${mm}`
        };
    }

    static isValidDateParts(year, month, day) {
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
            return false;
        }
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return false;
        }
        const date = new Date(year, month - 1, day);
        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
    }

    /**
     * 勤務時間を計算（出勤時刻と退勤時刻から）
     * 労働基準法第34条に基づく休憩時間を自動控除する
     * @param {string} clockInTime - 出勤時刻
     * @param {string} clockOutTime - 退勤時刻
     * @returns {string} 勤務時間（時間:分形式）
     */
    static calculateWorkingTime(clockInTime, clockOutTime, customBreakMinutes = null) {
        if (!clockInTime || !clockOutTime) {
            return '0:00';
        }
        try {
            const clockIn = new Date(clockInTime);
            const clockOut = new Date(clockOutTime);
            if (Number.isNaN(clockIn.getTime()) || Number.isNaN(clockOut.getTime())) {
                return '0:00';
            }
            if (clockOut <= clockIn) {
                return '0:00';
            }

            const clockInMinute = Math.floor(clockIn.getTime() / (1000 * 60));
            const clockOutMinute = Math.floor(clockOut.getTime() / (1000 * 60));
            if (clockOutMinute === clockInMinute) {
                return '0:00';
            }

            let totalMinutes = clockOutMinute - clockInMinute;
            if (totalMinutes <= 0) {
                return '0:00';
            }

            let breakMinutes = this.normalizeMinutesValue(customBreakMinutes);
            if (breakMinutes === null || Number.isNaN(breakMinutes) || breakMinutes < 0) {
                breakMinutes = this.calculateRequiredBreakMinutes(totalMinutes);
            }
            breakMinutes = Math.floor(Math.max(Math.min(breakMinutes, totalMinutes), 0));

            totalMinutes -= breakMinutes;

            if (totalMinutes < 0) totalMinutes = 0;
            return this.formatMinutesToTime(totalMinutes);
        } catch (error) {
            console.error('Error calculating working time:', error);
            return '0:00';
        }
    }

    /**
     * 労働基準法第34条に基づく必要休憩時間を計算する（分）
     * @param {number} totalWorkMinutes - 総勤務時間（分）
     * @returns {number} 必要休憩時間（分）
     */
    static calculateRequiredBreakMinutes(totalWorkMinutes) {
        const WORK_HOURS_6_HOURS = 360;     // 6時間（分）
        const WORK_HOURS_8_HOURS = 480;     // 8時間（分）
        const MIN_BREAK_6_TO_8_HOURS = 45;  // 6時間超8時間以下：45分
        const MIN_BREAK_OVER_8_HOURS = 60;  // 8時間超：60分

        if (totalWorkMinutes < WORK_HOURS_6_HOURS) {
            // 6時間未満の場合：休憩時間なし
            return 0;
        } else if (totalWorkMinutes < WORK_HOURS_8_HOURS) {
            // 6時間以上8時間未満の場合：45分の休憩
            return MIN_BREAK_6_TO_8_HOURS;
        } else {
            // 8時間以上の場合：60分の休憩
            return MIN_BREAK_OVER_8_HOURS;
        }
    }

    /**
     * 現在時刻から出勤時刻までの経過時間を計算
     * @param {string} clockInTime - 出勤時刻
     * @returns {string} 経過時間（時間:分形式）
     */
    static calculateElapsedTime(clockInTime) {
        if (!clockInTime) {
            return '0:00';
        }
        
        try {
            const clockIn = new Date(clockInTime);
            const now = new Date();
            const clockInMinute = Math.floor(clockIn.getTime() / (1000 * 60));
            const nowMinute = Math.floor(now.getTime() / (1000 * 60));

            if (nowMinute <= clockInMinute) {
                return '0:00';
            }

            const diffMinutes = nowMinute - clockInMinute;
            return this.formatMinutesToTime(diffMinutes);
        } catch (error) {
            console.error('Error calculating elapsed time:', error);
            return '0:00';
        }
    }

    /**
     * 深夜勤務時間を計算する（22:00〜翌05:00）
     * 休憩時間が指定されている場合は深夜帯と重なる分のみ控除する
     * @param {string|Date} clockInTime
     * @param {string|Date} clockOutTime
     * @param {number|null|undefined} breakMinutes
     * @returns {number}
     */
    static calculateNightShiftMinutes(clockInTime, clockOutTime, breakMinutes = null) {
        if (!clockInTime || !clockOutTime) {
            return 0;
        }

        const start = new Date(clockInTime);
        const end = new Date(clockOutTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return 0;
        }

        const rawNight = this.calculateNightOverlapMinutes(start, end);
        if (rawNight <= 0) {
            return 0;
        }

        let effectiveBreak = this.normalizeMinutesValue(breakMinutes);
        const startMinute = Math.floor(start.getTime() / (1000 * 60));
        const endMinute = Math.floor(end.getTime() / (1000 * 60));
        const totalMinutesForBreak = Math.max(0, endMinute - startMinute);
        
        if (effectiveBreak === null || Number.isNaN(effectiveBreak) || effectiveBreak < 0) {
            effectiveBreak = this.calculateRequiredBreakMinutes(totalMinutesForBreak);
        }

        effectiveBreak = Math.min(Math.max(effectiveBreak, 0), totalMinutesForBreak);
        if (effectiveBreak === 0) {
            return rawNight;
        }

        const totalMinutes = Math.max(0, endMinute - startMinute);
        if (effectiveBreak >= totalMinutes) {
            return 0;
        }

        const startOffset = Math.floor((totalMinutes - effectiveBreak) / 2);
        const breakStart = new Date(start.getTime() + startOffset * 60 * 1000);
        const breakEnd = new Date(breakStart.getTime() + effectiveBreak * 60 * 1000);

        const nightOverlap = this.calculateNightOverlapMinutes(breakStart, breakEnd);
        return Math.max(0, rawNight - Math.min(nightOverlap, effectiveBreak));
    }

    /**
     * 深夜帯（22:00〜翌05:00）との重複分を計算
     * @private
     */
    static calculateNightOverlapMinutes(start, end) {
        const NIGHT_START_HOUR = 22;
        const NIGHT_DURATION_MINUTES = 7 * 60;

        let nightMinutes = 0;

        const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
        const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        while (current <= last) {
            const nightStart = new Date(current);
            nightStart.setHours(NIGHT_START_HOUR, 0, 0, 0);
            const nightEnd = new Date(nightStart.getTime() + NIGHT_DURATION_MINUTES * 60 * 1000);

            const overlapStart = start > nightStart ? start : nightStart;
            const overlapEnd = end < nightEnd ? end : nightEnd;

            if (overlapEnd > overlapStart) {
                const overlapStartMinute = Math.floor(overlapStart.getTime() / (1000 * 60));
                const overlapEndMinute = Math.floor(overlapEnd.getTime() / (1000 * 60));
                nightMinutes += Math.max(0, overlapEndMinute - overlapStartMinute);
            }

            current.setDate(current.getDate() + 1);
        }

        return nightMinutes;
    }

    /**
     * 休憩・分数フィールドを数値の分に正規化
     * @param {number|string|null|undefined} value
     * @returns {number|null}
     */
    static normalizeMinutesValue(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number') {
            return Number.isNaN(value) ? null : value;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return null;
            }
            if (/^\d{1,2}:[0-5]\d$/.test(trimmed)) {
                return this.timeStringToMinutes(trimmed);
            }
            const hhmmssMatch = trimmed.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
            if (hhmmssMatch) {
                const hours = parseInt(hhmmssMatch[1], 10) || 0;
                const minutes = parseInt(hhmmssMatch[2], 10) || 0;
                const seconds = parseInt(hhmmssMatch[3], 10) || 0;
                return hours * 60 + minutes + Math.floor(seconds / 60);
            }
            const isoDurationMatch = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
            if (isoDurationMatch) {
                const hours = parseInt(isoDurationMatch[1] || '0', 10);
                const minutes = parseInt(isoDurationMatch[2] || '0', 10);
                const seconds = parseInt(isoDurationMatch[3] || '0', 10);
                return hours * 60 + minutes + Math.floor(seconds / 60);
            }
            const numeric = Number(trimmed);
            return Number.isNaN(numeric) ? null : numeric;
        }

        return null;
    }
}

// グローバル関数としても利用可能にする
window.formatMinutesToTime = TimeUtils.formatMinutesToTime.bind(TimeUtils);
window.timeStringToMinutes = TimeUtils.timeStringToMinutes.bind(TimeUtils);
window.calculateWorkingTime = TimeUtils.calculateWorkingTime.bind(TimeUtils);
window.calculateElapsedTime = TimeUtils.calculateElapsedTime.bind(TimeUtils);
window.calculateRequiredBreakMinutes = TimeUtils.calculateRequiredBreakMinutes.bind(TimeUtils);
window.calculateNightShiftMinutes = TimeUtils.calculateNightShiftMinutes.bind(TimeUtils);
