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
 * 休憩時間や深夜勤務時間などの基本的な集計を担う
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
    public static final int HALF_DAY_WORKING_MINUTES = 240; // 半休は一律4時間
    
    // 労働基準法第34条による休憩時間の定数
    public static final int MIN_BREAK_6_TO_8_HOURS = 45; // 6時間超8時間以下：45分
    public static final int MIN_BREAK_OVER_8_HOURS = 60;  // 8時間超：60分
    public static final int WORK_HOURS_6_HOURS = 360;     // 6時間（分）
    public static final int WORK_HOURS_8_HOURS = 480;     // 8時間（分）
    
    private static final ZoneId TOKYO_ZONE = ZoneId.of("Asia/Tokyo");
    
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
        clockInTime = normalizeToSecondPrecision(clockInTime);
        clockOutTime = normalizeToSecondPrecision(clockOutTime);
        if (!clockOutTime.isAfter(clockInTime)) {
            return 0;
        }
        LocalDateTime clockInMinute = truncateToMinutes(clockInTime);
        LocalDateTime clockOutMinute = truncateToMinutes(clockOutTime);
        if (!clockOutMinute.isAfter(clockInMinute)) {
            return 0;
        }

        long totalMinutes = calculateTotalMinutesFloor(clockInTime, clockOutTime);
        if (totalMinutes <= 0) {
            return 0;
        }
        
        int effectiveBreakMinutes = resolveBreakMinutes(clockInTime, clockOutTime, breakMinutes);
        long netMinutes = totalMinutes - effectiveBreakMinutes;

        return (int) Math.max(0, netMinutes);
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
        clockInTime = normalizeToSecondPrecision(clockInTime);
        clockOutTime = normalizeToSecondPrecision(clockOutTime);
        if (!clockOutTime.isAfter(clockInTime)) {
            return 0;
        }
        LocalDateTime clockInMinute = truncateToMinutes(clockInTime);
        LocalDateTime clockOutMinute = truncateToMinutes(clockOutTime);
        if (!clockOutMinute.isAfter(clockInMinute)) {
            return 0;
        }

        long totalMinutes = calculateTotalMinutesFloor(clockInTime, clockOutTime);
        if (totalMinutes <= 0) {
            return 0;
        }
        int cappedTotalMinutes = (int) Math.min(totalMinutes, Integer.MAX_VALUE);
        int breakMinutes = requestedBreakMinutes != null ? requestedBreakMinutes : calculateRequiredBreakMinutes(cappedTotalMinutes);

        if (breakMinutes < 0) {
            breakMinutes = 0;
        }
        if (breakMinutes > cappedTotalMinutes) {
            breakMinutes = cappedTotalMinutes;
        }

        return breakMinutes;
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
     * 深夜勤務時間を計算し、休憩が深夜帯に重なる分のみ控除する
     * 休憩は勤務時間の中央付近で取得されると仮定して重なりを推定する
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @param breakMinutes 休憩時間（分）
     * @return 深夜勤務分数（休憩控除後）
     */
    public int calculateNightShiftMinutesWithBreak(LocalDateTime clockInTime,
                                                   LocalDateTime clockOutTime,
                                                   Integer breakMinutes) {
        if (clockInTime == null || clockOutTime == null) {
            return 0;
        }

        clockInTime = normalizeToSecondPrecision(clockInTime);
        clockOutTime = normalizeToSecondPrecision(clockOutTime);
        if (!clockOutTime.isAfter(clockInTime)) {
            return 0;
        }
        LocalDateTime clockInMinute = truncateToMinutes(clockInTime);
        LocalDateTime clockOutMinute = truncateToMinutes(clockOutTime);
        if (!clockOutMinute.isAfter(clockInMinute)) {
            return 0;
        }

        int baseNightMinutes = calculateNightShiftMinutes(clockInTime, clockOutTime);
        if (baseNightMinutes <= 0) {
            return 0;
        }

        int sanitizedBreak = breakMinutes == null ? 0 : Math.max(0, breakMinutes);
        if (sanitizedBreak == 0) {
            return baseNightMinutes;
        }

        long totalMinutes = calculateTotalMinutesFloor(clockInTime, clockOutTime);
        if (totalMinutes <= 0) {
            return 0;
        }

        if (sanitizedBreak >= totalMinutes) {
            return 0;
        }

        long startOffset = (totalMinutes - sanitizedBreak) / 2;
        LocalDateTime breakStart = clockInTime.plusMinutes(startOffset);
        LocalDateTime breakEnd = breakStart.plusMinutes(sanitizedBreak);

        if (breakStart.isBefore(clockInTime)) {
            breakStart = clockInTime;
            breakEnd = breakStart.plusMinutes(sanitizedBreak);
        }
        if (breakEnd.isAfter(clockOutTime)) {
            breakEnd = clockOutTime;
            breakStart = breakEnd.minusMinutes(sanitizedBreak);
        }

        int nightOverlap = calculateNightShiftMinutes(breakStart, breakEnd);
        nightOverlap = Math.min(nightOverlap, sanitizedBreak);
        return Math.max(0, baseNightMinutes - nightOverlap);
    }
    
    /**
     * 現在の東京時刻を取得
     * @return 東京時刻のLocalDateTime
     */
    public LocalDateTime getCurrentTokyoTime() {
        return LocalDateTime.now(TOKYO_ZONE);
    }

    /**
     * 残業時間を計算する（分）
     * @param workingMinutes 実働時間（分）
     * @return 残業分数
     */
    public int calculateOvertimeMinutes(int workingMinutes) {
        if (workingMinutes <= 0) {
            return 0;
        }
        int overtime = workingMinutes - STANDARD_WORKING_MINUTES;
        return Math.max(0, overtime);
    }

    /**
     * 遅刻時間を計算する（分）
     * @param clockInTime 出勤時刻
     * @param attendanceDate 勤怠日
     * @return 遅刻分数
     */
    public int calculateLateMinutes(LocalDateTime clockInTime, LocalDate attendanceDate) {
        if (clockInTime == null || attendanceDate == null) {
            return 0;
        }
        LocalDateTime scheduledStart = LocalDateTime.of(attendanceDate, STANDARD_START_TIME);
        if (clockInTime.isBefore(scheduledStart) || clockInTime.isEqual(scheduledStart)) {
            return 0;
        }
        // 秒数は切り捨て
        long lateSeconds = ChronoUnit.SECONDS.between(scheduledStart, clockInTime);
        return (int) (lateSeconds / 60);
    }

    /**
     * 遅刻時間を計算する（分）- カスタム開始時刻対応
     * @param clockInTime 出勤時刻
     * @param scheduledStart 予定開始時刻
     * @return 遅刻分数
     */
    public int calculateLateMinutes(LocalDateTime clockInTime, LocalDateTime scheduledStart) {
        if (clockInTime == null || scheduledStart == null) {
            return 0;
        }
        if (clockInTime.isBefore(scheduledStart) || clockInTime.isEqual(scheduledStart)) {
            return 0;
        }
        // 秒数は切り捨て
        long lateSeconds = ChronoUnit.SECONDS.between(scheduledStart, clockInTime);
        return (int) (lateSeconds / 60);
    }

    /**
     * 早退時間を計算する（分）
     * @param clockOutTime 退勤時刻
     * @param attendanceDate 勤怠日
     * @return 早退分数
     */
    public int calculateEarlyLeaveMinutes(LocalDateTime clockOutTime, LocalDate attendanceDate) {
        if (clockOutTime == null || attendanceDate == null) {
            return 0;
        }
        LocalDateTime scheduledEnd = LocalDateTime.of(attendanceDate, STANDARD_END_TIME);
        if (clockOutTime.isAfter(scheduledEnd) || clockOutTime.isEqual(scheduledEnd)) {
            return 0;
        }
        // 1秒でもあれば1分に切り上げる
        long earlySeconds = ChronoUnit.SECONDS.between(clockOutTime, scheduledEnd);
        int earlyMinutes = (int) ((earlySeconds + 59) / 60);
        
        return earlyMinutes;
    }

    /**
     * 早退時間を計算する（分）- カスタム終了時刻対応
     * @param clockOutTime 退勤時刻
     * @param scheduledEnd 予定終了時刻
     * @return 早退分数
     */
    public int calculateEarlyLeaveMinutes(LocalDateTime clockOutTime, LocalDateTime scheduledEnd) {
        if (clockOutTime == null || scheduledEnd == null) {
            return 0;
        }
        if (clockOutTime.isAfter(scheduledEnd) || clockOutTime.isEqual(scheduledEnd)) {
            return 0;
        }
        // 1秒でもあれば1分に切り上げる
        long earlySeconds = ChronoUnit.SECONDS.between(clockOutTime, scheduledEnd);
        int earlyMinutes = (int) ((earlySeconds + 59) / 60);
        
        return earlyMinutes;
    }

    /**
     * 勤怠記録の休憩・深夜勤務時間を再計算し、遅刻・早退・残業は0で保持する
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
        
        // 遅刻・早退・残業は算出しない（空欄表示用に0で保持）
        attendanceRecord.setOvertimeMinutes(0);
        
        // 実働時間を算出して残業判断に利用
        int workingMinutes = calculateWorkingMinutes(
                attendanceRecord.getClockInTime(),
                attendanceRecord.getClockOutTime(),
                breakMinutes
        );

        // 深夜勤務時間を計算・設定
        int nightShiftMinutes = calculateNightShiftMinutesWithBreak(
                attendanceRecord.getClockInTime(),
                attendanceRecord.getClockOutTime(),
                breakMinutes
        );
        attendanceRecord.setNightShiftMinutes(nightShiftMinutes);

        // 残業時間を計算・設定
        int overtimeMinutes = calculateOvertimeMinutes(workingMinutes);
        attendanceRecord.setOvertimeMinutes(overtimeMinutes);
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
     * 半休の勤務時間を取得（一律4時間）
     * @return 半休の勤務時間（分）
     */
    public int getHalfDayWorkingMinutes() {
        return HALF_DAY_WORKING_MINUTES;
    }

    /**
     * 午前半休の遅刻・早退時間を計算
     * 半休は一律4時間付与。勤務時間変更の実働時間 - 4時間 = 半休日に働く必要がある時間
     * 
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @param attendanceDate 勤怠日
     * @param standardWorkingMinutes 標準勤務時間（分）
     * @return 配列[遅刻分数, 早退分数]
     */
    public int[] calculateHalfAmMetrics(LocalDateTime clockInTime, LocalDateTime clockOutTime, LocalDate attendanceDate, int standardWorkingMinutes) {
        if (clockInTime == null || clockOutTime == null || attendanceDate == null) {
            return new int[]{0, 0};
        }
        
        // 勤務時間変更の実働時間から4時間を引いた時間が半休日に必要な勤務時間
        int requiredWorkMinutes = Math.max(0, standardWorkingMinutes - HALF_DAY_WORKING_MINUTES);
        
        // 標準退勤時刻
        LocalDateTime expectedEnd = LocalDateTime.of(attendanceDate, STANDARD_END_TIME);
        // 期待開始時刻 = 標準退勤時刻 - 必要な勤務時間
        LocalDateTime expectedStart = expectedEnd.minusMinutes(requiredWorkMinutes);
        
        int lateMinutes = calculateLateMinutes(clockInTime, expectedStart);
        int earlyLeaveMinutes = calculateEarlyLeaveMinutes(clockOutTime, expectedEnd);
        
        return new int[]{lateMinutes, earlyLeaveMinutes};
    }

    /**
     * 午後半休の遅刻・早退時間を計算
     * 半休は一律4時間付与。勤務時間変更の実働時間 - 4時間 = 半休日に働く必要がある時間
     * 
     * @param clockInTime 出勤時刻
     * @param clockOutTime 退勤時刻
     * @param attendanceDate 勤怠日
     * @param standardWorkingMinutes 標準勤務時間（分）
     * @return 配列[遅刻分数, 早退分数]
     */
    public int[] calculateHalfPmMetrics(LocalDateTime clockInTime, LocalDateTime clockOutTime, LocalDate attendanceDate, int standardWorkingMinutes) {
        if (clockInTime == null || clockOutTime == null || attendanceDate == null) {
            return new int[]{0, 0};
        }
        
        // 勤務時間変更の実働時間から4時間を引いた時間が半休日に必要な勤務時間
        int requiredWorkMinutes = Math.max(0, standardWorkingMinutes - HALF_DAY_WORKING_MINUTES);
        
        // 標準退勤時刻
        LocalDateTime expectedEnd = LocalDateTime.of(attendanceDate, STANDARD_END_TIME);
        // 期待開始時刻 = 標準退勤時刻 - 必要な勤務時間
        LocalDateTime expectedStart = expectedEnd.minusMinutes(requiredWorkMinutes);
        
        int lateMinutes = calculateLateMinutes(clockInTime, expectedStart);
        int earlyLeaveMinutes = calculateEarlyLeaveMinutes(clockOutTime, expectedEnd);
        
        return new int[]{lateMinutes, earlyLeaveMinutes};
    }

    /**
     * 秒以下を切り捨てて分単位に統一
     * @param dateTime 対象日時
     * @return 分単位に正規化した日時
     */
    private LocalDateTime truncateToMinutes(LocalDateTime dateTime) {
        return dateTime.truncatedTo(ChronoUnit.MINUTES);
    }

    /**
     * ナノ秒を切り捨てて秒精度に統一
     */
    private LocalDateTime normalizeToSecondPrecision(LocalDateTime dateTime) {
        return dateTime.withNano(0);
    }

    /**
     * 秒は切り捨てて総分数を算出
     */
    private long calculateTotalMinutesFloor(LocalDateTime start, LocalDateTime end) {
        LocalDateTime startMinute = truncateToMinutes(start);
        LocalDateTime endMinute = truncateToMinutes(end);
        long minutes = ChronoUnit.MINUTES.between(startMinute, endMinute);
        if (minutes <= 0) {
            return 0;
        }
        return minutes;
    }
}
