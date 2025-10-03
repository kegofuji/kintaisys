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
     * 昼休憩（12:00-13:00）を自動控除する
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @return 実働分数（昼休憩控除後）
     */
    public int calculateWorkingMinutes(LocalDateTime clockInTime, LocalDateTime clockOutTime) {
        clockInTime = truncateToMinutes(clockInTime);
        clockOutTime = truncateToMinutes(clockOutTime);
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
        
        // 遅刻時間を計算・設定
        int lateMinutes = calculateLateMinutes(attendanceRecord.getClockInTime());
        attendanceRecord.setLateMinutes(lateMinutes);
        
        // 早退時間を計算・設定
        int earlyLeaveMinutes = calculateEarlyLeaveMinutes(attendanceRecord.getClockOutTime());
        attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
        
        // 実働時間を計算
        int workingMinutes = calculateWorkingMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getClockOutTime());

        if (workingMinutes >= STANDARD_WORKING_MINUTES) {
            attendanceRecord.setLateMinutes(0);
            attendanceRecord.setEarlyLeaveMinutes(0);
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
