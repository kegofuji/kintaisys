package com.kintai.dto;

/**
 * レポート生成リクエストDTO
 */
public class ReportGenerateRequest {
    
    private Long employeeId;
    private String yearMonth;
    
    // デフォルトコンストラクタ
    public ReportGenerateRequest() {
    }
    
    // コンストラクタ
    public ReportGenerateRequest(Long employeeId, String yearMonth) {
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
    
    @Override
    public String toString() {
        return "ReportGenerateRequest{" +
                "employeeId=" + employeeId +
                ", yearMonth='" + yearMonth + '\'' +
                '}';
    }
}
