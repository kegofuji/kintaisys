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
        if (minutes === null || minutes === undefined || isNaN(minutes)) {
            return '0:00';
        }
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
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
     * 勤務時間を計算（出勤時刻と退勤時刻から）
     * 労働基準法第34条に基づく休憩時間を自動控除する
     * @param {string} clockInTime - 出勤時刻
     * @param {string} clockOutTime - 退勤時刻
     * @returns {string} 勤務時間（時間:分形式）
     */
    static calculateWorkingTime(clockInTime, clockOutTime) {
        if (!clockInTime || !clockOutTime) {
            return '0:00';
        }
        try {
            const clockIn = new Date(clockInTime);
            const clockOut = new Date(clockOutTime);
            if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) {
                return '0:00';
            }
            if (clockOut <= clockIn) {
                return '0:00';
            }

            // 総勤務分（丸目処理なし、正確な分数を計算）
            let totalMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));

            // 労働基準法第34条に基づく休憩時間を控除
            const breakMinutes = this.calculateRequiredBreakMinutes(totalMinutes);
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

        if (totalWorkMinutes <= WORK_HOURS_6_HOURS) {
            // 6時間以下の場合：休憩時間なし
            return 0;
        } else if (totalWorkMinutes <= WORK_HOURS_8_HOURS) {
            // 6時間超8時間以下の場合：45分の休憩
            return MIN_BREAK_6_TO_8_HOURS;
        } else {
            // 8時間超の場合：60分の休憩
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
            const diffMs = now - clockIn;
            
            if (diffMs < 0) {
                return '0:00';
            }
            
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return this.formatMinutesToTime(diffMinutes);
        } catch (error) {
            console.error('Error calculating elapsed time:', error);
            return '0:00';
        }
    }
}

// グローバル関数としても利用可能にする
window.formatMinutesToTime = TimeUtils.formatMinutesToTime.bind(TimeUtils);
window.timeStringToMinutes = TimeUtils.timeStringToMinutes.bind(TimeUtils);
window.calculateWorkingTime = TimeUtils.calculateWorkingTime.bind(TimeUtils);
window.calculateElapsedTime = TimeUtils.calculateElapsedTime.bind(TimeUtils);
