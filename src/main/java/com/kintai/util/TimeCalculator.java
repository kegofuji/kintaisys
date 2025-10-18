package com.kintai.util;

import com.kintai.entity.AttendanceRecord;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * 勤怠時間計算ユーティリティクラス
 * 遅刻、早退、残業、深夜勤務時間を計算する
 */
@Component
public class TimeCalculator {
    
    // 定数定義
    public static final LocalTime STANDARD_START_TIME = LocalTime.of(9, 0);
    public static final LocalTime STANDARD_END_TIME = LocalTime.of(18, 0);
    public static final LocalTime LUNCH_START_TIME = LocalTime.of(12, 0);
    public static final LocalTime LUNCH_END_TIME = LocalTime.of(13, 0);
    public static final LocalTime NIGHT_START_TIME = LocalTime.of(22, 0);
    public static final LocalTime NIGHT_END_TIME = LocalTime.of(5, 0);
    public static final int LUNCH_BREAK_MINUTES = 60;
    public static final int STANDARD_WORKING_MINUTES = 480;
    
    // 労働基準法第34条による休憩時間の定数
    public static final int MIN_BREAK_6_TO_8_HOURS = 45; // 6時間超8時間以下：45分
    public static final int MIN_BREAK_OVER_8_HOURS = 60;  // 8時間超：60分
    public static final int WORK_HOURS_6_HOURS = 360;     // 6時間（分）
    public static final int WORK_HOURS_8_HOURS = 480;     // 8時間（分）
    
    private static final ZoneId TOKYO_ZONE = ZoneId.of("Asia/Tokyo");
    
    /**
     * 遅刻時間を計算する（分）
     * @param clockInTime 出勤時刻
     * @return 遅刻分数（遅刻していない場合は0）
     */
    public int calculateLateMinutes(LocalDateTime clockInTime) {
        LocalTime clockInTimeOnly = truncateToMinutes(clockInTime).toLocalTime();
        
        if (clockInTimeOnly.isAfter(STANDARD_START_TIME)) {
            return (int) ChronoUnit.MINUTES.between(STANDARD_START_TIME, clockInTimeOnly);
        }
        return 0;
    }
    
    /**
     * 早退時間を計算する（分）
     * @param clockOutTime 退勤時刻
     * @return 早退分数（早退していない場合は0）
     */
    public int calculateEarlyLeaveMinutes(LocalDateTime clockOutTime) {
        LocalTime clockOutTimeOnly = truncateToMinutes(clockOutTime).toLocalTime();
        
        if (clockOutTimeOnly.isBefore(STANDARD_END_TIME)) {
            return (int) ChronoUnit.MINUTES.between(clockOutTimeOnly, STANDARD_END_TIME);
        }
        return 0;
    }
    
    /**
     * 実働時間を計算する（分）
     * 労働基準法第34条に基づく休憩時間を自動控除する
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @return 実働分数（休憩時間控除後）
     */
    public int calculateWorkingMinutes(LocalDateTime clockInTime, LocalDateTime clockOutTime) {
        return calculateWorkingMinutes(clockInTime, clockOutTime, null);
    }

    /**
     * 実働時間を計算する（分）
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @param breakMinutes 休憩時間（分）。null の場合は法定休憩時間を適用
     * @return 実働分数（休憩時間控除後）
     */
    public int calculateWorkingMinutes(LocalDateTime clockInTime, LocalDateTime clockOutTime, Integer breakMinutes) {
        if (clockInTime == null || clockOutTime == null) {
            return 0;
        }
        clockInTime = truncateToMinutes(clockInTime);
        clockOutTime = truncateToMinutes(clockOutTime);
        if (!clockOutTime.isAfter(clockInTime)) {
            return 0;
        }

        long totalMinutes = ChronoUnit.MINUTES.between(clockInTime, clockOutTime);
        int effectiveBreakMinutes = resolveBreakMinutes(clockInTime, clockOutTime, breakMinutes);
        totalMinutes -= effectiveBreakMinutes;

        return (int) Math.max(0, totalMinutes);
    }
    
    /**
     * 労働基準法第34条に基づく必要休憩時間を計算する（分）
     * @param totalWorkMinutes 総勤務時間（分）
     * @return 必要休憩時間（分）
     */
    private int calculateRequiredBreakMinutes(int totalWorkMinutes) {
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
     * 休憩時間を解決（null の場合は法定休憩時間を適用）し、総勤務時間の範囲に収める
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @param requestedBreakMinutes 希望する休憩時間（分）
     * @return 有効な休憩時間（分）
     */
    public int resolveBreakMinutes(LocalDateTime clockInTime, LocalDateTime clockOutTime, Integer requestedBreakMinutes) {
        if (clockInTime == null || clockOutTime == null) {
            return requestedBreakMinutes == null ? 0 : Math.max(0, requestedBreakMinutes);
        }
        clockInTime = truncateToMinutes(clockInTime);
        clockOutTime = truncateToMinutes(clockOutTime);
        if (!clockOutTime.isAfter(clockInTime)) {
            return 0;
        }

        int totalMinutes = (int) ChronoUnit.MINUTES.between(clockInTime, clockOutTime);
        int breakMinutes = requestedBreakMinutes != null ? requestedBreakMinutes : calculateRequiredBreakMinutes(totalMinutes);

        if (breakMinutes < 0) {
            breakMinutes = 0;
        }
        if (breakMinutes > totalMinutes) {
            breakMinutes = totalMinutes;
        }

        return breakMinutes;
    }
    
    /**
     * 残業時間を計算する（分）
     * @param workingMinutes 実働時間（分）
     * @return 残業分数（残業していない場合は0）
     */
    public int calculateOvertimeMinutes(int workingMinutes) {
        int overtime = workingMinutes - STANDARD_WORKING_MINUTES;
        return Math.max(0, overtime);
    }
    
    /**
     * 深夜勤務時間を計算する（分）
     * 22:00-翌05:00の勤務分を計算
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @return 深夜勤務分数
     */
    public int calculateNightShiftMinutes(LocalDateTime clockInTime, LocalDateTime clockOutTime) {
        if (clockInTime == null || clockOutTime == null || !clockOutTime.isAfter(clockInTime)) {
            return 0;
        }

        clockInTime = truncateToMinutes(clockInTime);
        clockOutTime = truncateToMinutes(clockOutTime);

        int nightShiftMinutes = 0;

        // 深夜時間帯は当日22:00〜翌日05:00なので、出勤日の前日分まで遡って重なりを評価する
        LocalDate currentDate = clockInTime.toLocalDate().minusDays(1);
        LocalDate lastDate = clockOutTime.toLocalDate();

        while (!currentDate.isAfter(lastDate)) {
            LocalDateTime nightStart = currentDate.atTime(NIGHT_START_TIME);
            LocalDateTime nightEnd = nightStart.plusHours(7);

            LocalDateTime overlapStart = clockInTime.isAfter(nightStart) ? clockInTime : nightStart;
            LocalDateTime overlapEnd = clockOutTime.isBefore(nightEnd) ? clockOutTime : nightEnd;

            if (overlapEnd.isAfter(overlapStart)) {
                long segmentMinutes = ChronoUnit.MINUTES.between(overlapStart, overlapEnd);
                nightShiftMinutes += (int) segmentMinutes;
            }

            currentDate = currentDate.plusDays(1);
        }

        return Math.max(nightShiftMinutes, 0);
    }
    
    /**
     * 現在の東京時刻を取得
     * @return 東京時刻のLocalDateTime
     */
    public LocalDateTime getCurrentTokyoTime() {
        return LocalDateTime.now(TOKYO_ZONE);
    }

    /**
     * 勤怠記録の遅刻・早退・残業・深夜勤務時間を再計算して設定
     * @param attendanceRecord 勤怠記録
     */
    public void calculateAttendanceMetrics(AttendanceRecord attendanceRecord) {
        if (attendanceRecord == null) {
            return;
        }

        normalizeMetrics(attendanceRecord);

        if (attendanceRecord.getClockInTime() == null || attendanceRecord.getClockOutTime() == null) {
            return;
        }
        
        int breakMinutes = resolveBreakMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getClockOutTime(), attendanceRecord.getBreakMinutes());
        attendanceRecord.setBreakMinutes(breakMinutes);

        // 遅刻時間を計算・設定
        int lateMinutes = Math.max(0, calculateLateMinutes(attendanceRecord.getClockInTime()));
        attendanceRecord.setLateMinutes(lateMinutes);
        
        // 早退時間を計算・設定
        int earlyLeaveMinutes = Math.max(0, calculateEarlyLeaveMinutes(attendanceRecord.getClockOutTime()));
        attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
        
        // 実働時間を計算
        int workingMinutes = calculateWorkingMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getClockOutTime(), breakMinutes);

        if (workingMinutes >= STANDARD_WORKING_MINUTES) {
            attendanceRecord.setLateMinutes(0);
            attendanceRecord.setEarlyLeaveMinutes(0);
        } else {
            int totalShortMinutes = STANDARD_WORKING_MINUTES - Math.max(0, workingMinutes);
            int adjustedLateMinutes = Math.min(attendanceRecord.getLateMinutes(), totalShortMinutes);
            int adjustedEarlyMinutes = Math.max(0, attendanceRecord.getEarlyLeaveMinutes());
            int coveredByLateAndEarly = adjustedLateMinutes + adjustedEarlyMinutes;
            if (coveredByLateAndEarly < totalShortMinutes) {
                adjustedEarlyMinutes += (totalShortMinutes - coveredByLateAndEarly);
            }
            attendanceRecord.setLateMinutes(adjustedLateMinutes);
            attendanceRecord.setEarlyLeaveMinutes(adjustedEarlyMinutes);
        }
        
        // 残業時間を計算・設定
        int overtimeMinutes = calculateOvertimeMinutes(workingMinutes);
        attendanceRecord.setOvertimeMinutes(overtimeMinutes);
        
        // 深夜勤務時間を計算・設定
        int nightShiftMinutes = calculateNightShiftMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getClockOutTime());
        attendanceRecord.setNightShiftMinutes(nightShiftMinutes);
    }

    /**
     * 遅刻・早退などの数値項目をnullから0に正規化
     * @param attendanceRecord 勤怠記録
     */
    public void normalizeMetrics(AttendanceRecord attendanceRecord) {
        if (attendanceRecord == null) {
            return;
        }

        if (attendanceRecord.getLateMinutes() == null) {
            attendanceRecord.setLateMinutes(0);
        }
        if (attendanceRecord.getEarlyLeaveMinutes() == null) {
            attendanceRecord.setEarlyLeaveMinutes(0);
        }
        if (attendanceRecord.getOvertimeMinutes() == null) {
            attendanceRecord.setOvertimeMinutes(0);
        }
        if (attendanceRecord.getNightShiftMinutes() == null) {
            attendanceRecord.setNightShiftMinutes(0);
        }
        if (attendanceRecord.getBreakMinutes() == null) {
            attendanceRecord.setBreakMinutes(0);
        }
    }

    /**
     * 秒以下を切り捨てて分単位に統一
     * @param dateTime 対象日時
     * @return 分単位に正規化した日時
     */
    private LocalDateTime truncateToMinutes(LocalDateTime dateTime) {
        return dateTime.truncatedTo(ChronoUnit.MINUTES);
    }
}
