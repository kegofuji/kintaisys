package com.kintai.util;

import com.kintai.entity.AttendanceRecord;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TimeCalculatorTest {

    private final TimeCalculator calculator = new TimeCalculator();

    @Test
    void calculateNightShiftMinutes_handlesShiftWithinNightWindow() {
        LocalDateTime start = LocalDateTime.of(2025, 9, 29, 0, 0);
        LocalDateTime end = LocalDateTime.of(2025, 9, 29, 0, 53);

        assertEquals(53, calculator.calculateNightShiftMinutes(start, end));
    }

    @Test
    void calculateNightShiftMinutes_handlesShiftCrossingMidnight() {
        LocalDateTime start = LocalDateTime.of(2025, 9, 28, 21, 0);
        LocalDateTime end = LocalDateTime.of(2025, 9, 29, 0, 53);

        assertEquals(173, calculator.calculateNightShiftMinutes(start, end));
    }

    @Test
    void calculateNightShiftMinutes_capsAtNightWindowEnd() {
        LocalDateTime start = LocalDateTime.of(2025, 9, 28, 21, 0);
        LocalDateTime end = LocalDateTime.of(2025, 9, 29, 6, 0);

        assertEquals(420, calculator.calculateNightShiftMinutes(start, end));
    }

    @Test
    void calculateNightShiftMinutes_handlesMultipleNights() {
        LocalDateTime start = LocalDateTime.of(2025, 9, 28, 23, 30);
        LocalDateTime end = LocalDateTime.of(2025, 9, 30, 4, 0);

        assertEquals(690, calculator.calculateNightShiftMinutes(start, end));
    }

    @Test
    void calculateNightShiftMinutes_truncatesSecondsForConsistency() {
        LocalDateTime start = LocalDateTime.of(2025, 9, 29, 21, 59, 30);
        LocalDateTime end = LocalDateTime.of(2025, 9, 30, 0, 1, 45);

        // 深夜帯 22:00-翌00:01 を対象とし、秒未満は切り捨てる => 121 分
        assertEquals(121, calculator.calculateNightShiftMinutes(start, end));
    }

    @Test
    void calculateWorkingMinutes_appliesDefaultBreaks() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 18, 0);

        // 9時間勤務 -> 60分休憩を控除して8時間
        assertEquals(480, calculator.calculateWorkingMinutes(start, end));
    }

    @Test
    void calculateWorkingMinutes_appliesFortyFiveMinutesAtSixHours() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 15, 0);

        // 6時間勤務 -> 45分休憩を控除して5時間15分
        assertEquals(315, calculator.calculateWorkingMinutes(start, end));
    }

    @Test
    void resolveBreakMinutes_clampsRequestedValue() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 12, 0);

        // 3時間勤務で90分の休憩を要求しても、最大で総勤務分(180)に制限される
        assertEquals(180, calculator.resolveBreakMinutes(start, end, 900));

        // マイナス値は0に丸める
        assertEquals(0, calculator.resolveBreakMinutes(start, end, -30));
    }

    @Test
    void resolveBreakMinutes_defaultsToFortyFiveAtSixHours() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 15, 0);

        assertEquals(45, calculator.resolveBreakMinutes(start, end, null));
    }

    @Test
    void calculateAttendanceMetrics_accountsForShortageCausedByBreakExtension() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 18, 1));
        record.setBreakMinutes(65);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(0, record.getLateMinutes());
        assertEquals(4, record.getEarlyLeaveMinutes());
    }

    @Test
    void calculateAttendanceMetrics_retainsLateWhenShortageAlreadyCovered() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 10));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 18, 0));
        record.setBreakMinutes(60);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(10, record.getLateMinutes());
        assertEquals(0, record.getEarlyLeaveMinutes());
    }

    @Test
    void calculateAttendanceMetrics_distributesShortageAcrossLateAndEarly() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 10));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 17, 50));
        record.setBreakMinutes(60);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(10, record.getLateMinutes());
        assertEquals(10, record.getEarlyLeaveMinutes());
    }
}
