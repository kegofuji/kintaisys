package com.kintai.dto;

import java.time.LocalDate;

/**
 * 勤怠整合チェックレスポンスDTO
 */
public class InconsistencyResponse {
    
    private Long employeeId;
    private String employeeName;
    private LocalDate date;
    private String issue;
    
    // デフォルトコンストラクタ
    public InconsistencyResponse() {
    }
    
    // コンストラクタ
    public InconsistencyResponse(Long employeeId, String employeeName, LocalDate date, String issue) {
        this.employeeId = employeeId;
        this.employeeName = employeeName;
        this.date = date;
        this.issue = issue;
    }
    
    // ゲッター・セッター
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public String getEmployeeName() {
        return employeeName;
    }
    
    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }
    
    public LocalDate getDate() {
        return date;
    }
    
    public void setDate(LocalDate date) {
        this.date = date;
    }
    
    public String getIssue() {
        return issue;
    }
    
    public void setIssue(String issue) {
        this.issue = issue;
    }
}
