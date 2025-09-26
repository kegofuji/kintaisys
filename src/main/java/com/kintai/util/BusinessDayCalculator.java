package com.kintai.util;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * 営業日計算ユーティリティ（土日祝を除外）
 */
@Component
public class BusinessDayCalculator {

    /**
     * 開始日と終了日を含めた営業日数を数える（週末を除外、祝日未対応）
     */
    public int countBusinessDaysInclusive(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return 0;
        }

        int count = 0;
        LocalDate date = startDate;
        while (!date.isAfter(endDate)) {
            if (isBusinessDay(date)) {
                count++;
            }
            date = date.plusDays(1);
        }
        return count;
    }

    /**
     * 土日・祝日以外を営業日とみなす
     */
    public boolean isBusinessDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }
        return !isJapaneseHoliday(date);
    }

    /**
     * 日本の祝日（簡易版）判定
     * - 固定祝日と一部のハッピーマンデー、春分/秋分（簡易近似）を考慮
     * - 必要十分な精度を目指した簡易実装。厳密な法改正対応は対象外
     */
    public boolean isJapaneseHoliday(LocalDate date) {
        int year = date.getYear();
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();

        // 固定祝日（簡易）
        if (matches(month, day, 1, 1)) return true;   // 元日 1/1
        if (matches(month, day, 2, 11)) return true;  // 建国記念の日 2/11
        if (matches(month, day, 4, 29)) return true;  // 昭和の日 4/29
        if (matches(month, day, 5, 3)) return true;   // 憲法記念日 5/3
        if (matches(month, day, 5, 4)) return true;   // みどりの日 5/4
        if (matches(month, day, 5, 5)) return true;   // こどもの日 5/5
        if (matches(month, day, 8, 11)) return true;  // 山の日 8/11
        if (matches(month, day, 11, 3)) return true;  // 文化の日 11/3
        if (matches(month, day, 11, 23)) return true; // 勤労感謝の日 11/23
        // フロント実装に合わせて旧天皇誕生日 12/23 を考慮（現行は2/23）
        if (matches(month, day, 12, 23)) return true;

        // ハッピーマンデー（簡易）
        if (date.equals(nthMonday(year, 1, 2))) return true;  // 成人の日（1月第2月曜）
        if (date.equals(nthMonday(year, 7, 3))) return true;  // 海の日（7月第3月曜）
        if (date.equals(nthMonday(year, 9, 3))) return true;  // 敬老の日（9月第3月曜）
        if (date.equals(nthMonday(year, 10, 2))) return true; // スポーツの日（10月第2月曜）

        // 春分・秋分（簡易近似）
        LocalDate spring = approximateSpringEquinox(year);
        LocalDate autumn = approximateAutumnEquinox(year);
        if (date.equals(spring) || date.equals(autumn)) return true;

        return false;
    }

    private boolean matches(int m, int d, int expectedM, int expectedD) {
        return m == expectedM && d == expectedD;
    }

    private LocalDate nthMonday(int year, int month, int n) {
        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate firstMonday = first.with(TemporalAdjusters.firstInMonth(DayOfWeek.MONDAY));
        return firstMonday.plusWeeks(n - 1);
    }

    // 簡易近似: 1980-2099 で概ね正しい日付
    private LocalDate approximateSpringEquinox(int year) {
        int day = (int) Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4.0));
        return LocalDate.of(year, 3, Math.max(19, Math.min(21, day)));
    }

    private LocalDate approximateAutumnEquinox(int year) {
        int day = (int) Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4.0));
        return LocalDate.of(year, 9, Math.max(22, Math.min(24, day)));
    }
}


