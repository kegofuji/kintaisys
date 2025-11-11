package com.kintai.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 休暇残数ビュー
 * 残数（承認済みベース）、申請中、申請可能残の3値を提供する。
 */
public class LeaveBalanceView {

    private final BigDecimal remaining;
    private final BigDecimal pending;
    private final BigDecimal available;

    public LeaveBalanceView(BigDecimal remaining, BigDecimal pending) {
        BigDecimal normalizedRemaining = normalize(remaining);
        BigDecimal normalizedPending = normalize(pending);
        this.remaining = normalizedRemaining;
        this.pending = normalizedPending;
        this.available = calculateAvailable(normalizedRemaining, normalizedPending);
    }

    public BigDecimal getRemaining() {
        return remaining;
    }

    public BigDecimal getPending() {
        return pending;
    }

    public BigDecimal getAvailable() {
        return available;
    }

    private static BigDecimal normalize(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal calculateAvailable(BigDecimal remaining, BigDecimal pending) {
        BigDecimal available = remaining.subtract(pending);
        if (available.signum() < 0) {
            available = BigDecimal.ZERO;
        }
        return available.setScale(2, RoundingMode.HALF_UP);
    }
}
