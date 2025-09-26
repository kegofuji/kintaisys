package com.kintai.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 退勤打刻リクエストDTO
 */
public class ClockOutRequest {
    
    @NotNull(message = "従業員IDは必須です")
    @Positive(message = "従業員IDは正の数である必要があります")
    private Long employeeId;
    
    // デフォルトコンストラクタ
    public ClockOutRequest() {
    }
    
    // コンストラクタ
    public ClockOutRequest(Long employeeId) {
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
