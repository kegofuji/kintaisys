package com.kintai.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 出勤打刻リクエストDTO
 */
public class ClockInRequest {
    
    @NotNull(message = "従業員IDは必須です")
    @Positive(message = "従業員IDは正の数である必要があります")
    private Long employeeId;
    
    // デフォルトコンストラクタ
    public ClockInRequest() {
    }
    
    // コンストラクタ
    public ClockInRequest(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    // ゲッター・セッター
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
}
