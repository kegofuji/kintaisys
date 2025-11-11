package com.kintai.dto;

/**
 * 管理者ダッシュボードの未承認件数サマリー
 */
public record AdminDashboardSummary(
        long adjustmentPending,
        long workPatternPending,
        long leavePending,
        long holidayPending
) {
}
