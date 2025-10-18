package com.kintai.dto;

/**
 * 休憩時間更新リクエスト
 */
public class BreakTimeUpdateRequest {

    private Integer breakMinutes;

    public Integer getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(Integer breakMinutes) {
        this.breakMinutes = breakMinutes;
    }
}
