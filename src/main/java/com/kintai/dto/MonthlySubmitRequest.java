package com.kintai.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * 月末申請リクエストDTO
 */
public class MonthlySubmitRequest {
    
    @NotNull(message = "従業員IDは必須です")
    private Long employeeId;
    
    @NotNull(message = "年月は必須です")
    @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "年月はyyyy-MM形式で入力してください")
    private String yearMonth;
    
    // デフォルトコンストラクタ
    public MonthlySubmitRequest() {
    }
    
    // コンストラクタ
    public MonthlySubmitRequest(Long employeeId, String yearMonth) {
        this.employeeId = employeeId;
        this.yearMonth = yearMonth;
    }
    
    // ゲッター・セッター
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public String getYearMonth() {
        return yearMonth;
    }
    
    public void setYearMonth(String yearMonth) {
        this.yearMonth = yearMonth;
    }
}
