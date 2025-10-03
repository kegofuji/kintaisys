package com.kintai.util;

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
}
