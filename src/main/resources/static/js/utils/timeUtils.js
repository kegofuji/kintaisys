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

            // 総勤務分
            let totalMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));

            // 昼休憩(12:00-13:00)にかかった分を控除
            const lunchStart = new Date(clockIn);
            lunchStart.setHours(12, 0, 0, 0);
            const lunchEnd = new Date(clockIn);
            lunchEnd.setHours(13, 0, 0, 0);

            const overlapStart = new Date(Math.max(clockIn.getTime(), lunchStart.getTime()));
            const overlapEnd = new Date(Math.min(clockOut.getTime(), lunchEnd.getTime()));
            const overlapMinutes = Math.max(0, Math.floor((overlapEnd - overlapStart) / (1000 * 60)));
            totalMinutes -= overlapMinutes;

            if (totalMinutes < 0) totalMinutes = 0;
            return this.formatMinutesToTime(totalMinutes);
        } catch (error) {
            console.error('Error calculating working time:', error);
            return '0:00';
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
