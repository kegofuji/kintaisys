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
    void calculateWorkingMinutes_returnsZeroWhenClockOutEqualsClockIn() {
        LocalDateTime timestamp = LocalDateTime.of(2025, 1, 1, 9, 0);
        assertEquals(0, calculator.calculateWorkingMinutes(timestamp, timestamp, 0));
    }

    @Test
    void calculateWorkingMinutes_truncatesPartialMinutes() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 9, 9, 45);

        assertEquals(9, calculator.calculateWorkingMinutes(start, end, 0));
    }

    @Test
    void calculateWorkingMinutes_countsMinuteWhenCrossingBoundary() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 13, 34, 10);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 13, 35, 5);

        assertEquals(1, calculator.calculateWorkingMinutes(start, end, 0));
    }

    @Test
    void calculateWorkingMinutes_returnsZeroWithinSameMinute() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 9, 0, 30);

        assertEquals(0, calculator.calculateWorkingMinutes(start, end, 0));
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
    void resolveBreakMinutes_returnsZeroWithinSameMinute() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 9, 0, 45);

        assertEquals(0, calculator.resolveBreakMinutes(start, end, 5));
    }

    @Test
    void resolveBreakMinutes_defaultsToFortyFiveAtSixHours() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 1, 15, 0);

        assertEquals(45, calculator.resolveBreakMinutes(start, end, null));
    }

    @Test
    void calculateAttendanceMetrics_leavesLateAndEarlyBlank() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 17, 0));
        record.setBreakMinutes(30);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(0, record.getLateMinutes());
        assertEquals(0, record.getEarlyLeaveMinutes());
        assertEquals(0, record.getOvertimeMinutes());
    }

    @Test
    void calculateAttendanceMetrics_doesNotSetLateForTardyClockIn() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 10));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 18, 0));
        record.setBreakMinutes(60);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(0, record.getLateMinutes());
        assertEquals(0, record.getEarlyLeaveMinutes());
        assertEquals(0, record.getOvertimeMinutes());
    }

    @Test
    void calculateAttendanceMetrics_setsOvertimeWhenExceedingStandard() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 8, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 20, 0));
        record.setBreakMinutes(60);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(0, record.getLateMinutes());
        assertEquals(0, record.getEarlyLeaveMinutes());
        assertEquals(180, record.getOvertimeMinutes());
    }

    @Test
    void calculateAttendanceMetrics_trimsNightShiftByBreak() {
        AttendanceRecord record = new AttendanceRecord();
        record.setClockInTime(LocalDateTime.of(2025, 10, 17, 22, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 6, 0));
        record.setBreakMinutes(60);

        calculator.calculateAttendanceMetrics(record);

        assertEquals(360, record.getNightShiftMinutes());
        assertEquals(0, record.getOvertimeMinutes());
    }

    @Test
    void calculateNightShiftMinutesWithBreak_keepsDaytimeBreakOutOfNight() {
        LocalDateTime start = LocalDateTime.of(2025, 10, 18, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 10, 18, 23, 0);

        assertEquals(60, calculator.calculateNightShiftMinutesWithBreak(start, end, 60));
    }

    @Test
    void calculateNightShiftMinutesWithBreak_subtractsNightOverlap() {
        LocalDateTime start = LocalDateTime.of(2025, 10, 17, 22, 0);
        LocalDateTime end = LocalDateTime.of(2025, 10, 18, 6, 0);

        assertEquals(360, calculator.calculateNightShiftMinutesWithBreak(start, end, 60));
    }
}
