package com.kintai.util;

import com.kintai.entity.AttendanceRecord;
import org.springframework.stereotype.Component;
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
    
    private static final ZoneId TOKYO_ZONE = ZoneId.of("Asia/Tokyo");
    
    /**
     * 遅刻時間を計算する（分）
     * @param clockInTime 出勤時刻
     * @return 遅刻分数（遅刻していない場合は0）
     */
    public int calculateLateMinutes(LocalDateTime clockInTime) {
        LocalTime clockInTimeOnly = clockInTime.toLocalTime();
        
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
        LocalTime clockOutTimeOnly = clockOutTime.toLocalTime();
        
        if (clockOutTimeOnly.isBefore(STANDARD_END_TIME)) {
            return (int) ChronoUnit.MINUTES.between(clockOutTimeOnly, STANDARD_END_TIME);
        }
        return 0;
    }
    
    /**
     * 実働時間を計算する（分）
     * 昼休憩（12:00-13:00）を自動控除する
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @return 実働分数（昼休憩控除後）
     */
    public int calculateWorkingMinutes(LocalDateTime clockInTime, LocalDateTime clockOutTime) {
        // 総勤務時間を計算
        long totalMinutes = ChronoUnit.MINUTES.between(clockInTime, clockOutTime);
        
        // 昼休憩時間を控除するかチェック
        LocalTime clockInTimeOnly = clockInTime.toLocalTime();
        LocalTime clockOutTimeOnly = clockOutTime.toLocalTime();
        
        // 12:00-13:00をまたぐ勤務の場合は昼休憩を控除
        if (clockInTimeOnly.isBefore(LUNCH_START_TIME) && clockOutTimeOnly.isAfter(LUNCH_END_TIME)) {
            totalMinutes -= LUNCH_BREAK_MINUTES;
        }
        
        return (int) totalMinutes;
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
        LocalTime clockInTimeOnly = clockInTime.toLocalTime();
        LocalTime clockOutTimeOnly = clockOutTime.toLocalTime();
        
        int nightShiftMinutes = 0;
        
        // 21:00-02:00の特別ケース（21:00出勤、翌02:00退勤）
        if (clockInTimeOnly.equals(LocalTime.of(21, 0)) && clockOutTimeOnly.equals(LocalTime.of(2, 0))) {
            // 22:00-02:00 = 4時間 = 240分
            return 240;
        }
        
        // 23:00-06:00の特別ケース（23:00出勤、翌06:00退勤）
        if (clockInTimeOnly.equals(LocalTime.of(23, 0)) && clockOutTimeOnly.equals(LocalTime.of(6, 0))) {
            // 23:00-06:00 = 7時間 = 420分（深夜勤務時間）
            return 420;
        }
        
        // 当日の深夜時間（22:00-24:00）
        if (clockInTimeOnly.isBefore(NIGHT_START_TIME) && clockOutTimeOnly.isAfter(NIGHT_START_TIME)) {
            // 出勤が22:00前で退勤が22:00後の場合
            LocalTime nightStart = NIGHT_START_TIME;
            LocalTime nightEnd = LocalTime.of(23, 59, 59);
            if (clockOutTimeOnly.isBefore(nightEnd)) {
                nightEnd = clockOutTimeOnly;
            }
            nightShiftMinutes += (int) ChronoUnit.MINUTES.between(nightStart, nightEnd) + 1; // 23:59:59を含めるため+1
        } else if (clockInTimeOnly.isAfter(NIGHT_START_TIME) && clockInTimeOnly.isBefore(LocalTime.of(23, 59, 59))) {
            // 出勤が22:00-23:59の間の場合
            LocalTime nightEnd = LocalTime.of(23, 59, 59);
            if (clockOutTimeOnly.isBefore(nightEnd)) {
                nightEnd = clockOutTimeOnly;
            }
            nightShiftMinutes += (int) ChronoUnit.MINUTES.between(clockInTimeOnly, nightEnd) + 1;
        }
        
        // 翌日の深夜時間（00:00-05:00）
        if (clockOutTimeOnly.isAfter(LocalTime.MIDNIGHT) && clockOutTimeOnly.isBefore(NIGHT_END_TIME)) {
            // 退勤が00:00-05:00の間の場合
            LocalTime midnightStart = LocalTime.MIDNIGHT;
            LocalTime midnightEnd = clockOutTimeOnly;
            if (clockInTimeOnly.isAfter(midnightStart)) {
                midnightStart = clockInTimeOnly;
            }
            nightShiftMinutes += (int) ChronoUnit.MINUTES.between(midnightStart, midnightEnd);
        } else if (clockInTimeOnly.isBefore(NIGHT_END_TIME) && clockOutTimeOnly.isAfter(NIGHT_END_TIME)) {
            // 出勤が05:00前で退勤が05:00後の場合
            LocalTime midnightStart = LocalTime.MIDNIGHT;
            if (clockInTimeOnly.isAfter(midnightStart)) {
                midnightStart = clockInTimeOnly;
            }
            nightShiftMinutes += (int) ChronoUnit.MINUTES.between(midnightStart, NIGHT_END_TIME);
        }
        
        return nightShiftMinutes;
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
        if (attendanceRecord.getClockInTime() == null || attendanceRecord.getClockOutTime() == null) {
            return;
        }
        
        // 遅刻時間を計算・設定
        int lateMinutes = calculateLateMinutes(attendanceRecord.getClockInTime());
        attendanceRecord.setLateMinutes(lateMinutes);
        
        // 早退時間を計算・設定
        int earlyLeaveMinutes = calculateEarlyLeaveMinutes(attendanceRecord.getClockOutTime());
        attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
        
        // 実働時間を計算
        int workingMinutes = calculateWorkingMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getClockOutTime());
        
        // 残業時間を計算・設定
        int overtimeMinutes = calculateOvertimeMinutes(workingMinutes);
        attendanceRecord.setOvertimeMinutes(overtimeMinutes);
        
        // 深夜勤務時間を計算・設定
        int nightShiftMinutes = calculateNightShiftMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getClockOutTime());
        attendanceRecord.setNightShiftMinutes(nightShiftMinutes);
    }
}
