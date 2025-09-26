package com.kintai.dto;

import java.time.LocalDate;

/**
 * 有給休暇申請DTO
 */
public class VacationRequestDto {
    
    private boolean success;
    private String message;
    private String errorCode;
    private Object data;
    private Long employeeId;
    private String username;
    
    // デフォルトコンストラクタ
    public VacationRequestDto() {
    }
    
    // 成功レスポンス用コンストラクタ
    public VacationRequestDto(boolean success, String message, VacationData data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
    
    // エラーレスポンス用コンストラクタ
    public VacationRequestDto(boolean success, String errorCode, String message) {
        this.success = success;
        this.errorCode = errorCode;
        this.message = message;
    }
    
    // ゲッター・セッター
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }
    
    public Object getData() {
        return data;
    }
    
    public void setData(Object data) {
        this.data = data;
    }
    
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    /**
     * 有給休暇申請データ内部クラス
     */
    public static class VacationData {
        private Long vacationId;
        private Long employeeId;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer days;
        private String status;
        private String rejectionComment;
        
        // デフォルトコンストラクタ
        public VacationData() {
        }
        
        // コンストラクタ
        public VacationData(Long vacationId, Long employeeId, LocalDate startDate, 
                          LocalDate endDate, Integer days, String status) {
            this.vacationId = vacationId;
            this.employeeId = employeeId;
            this.startDate = startDate;
            this.endDate = endDate;
            this.days = days;
            this.status = status;
        }
        
        // ゲッター・セッター
        public Long getVacationId() {
            return vacationId;
        }
        
        public void setVacationId(Long vacationId) {
            this.vacationId = vacationId;
        }
        
        public Long getEmployeeId() {
            return employeeId;
        }
        
        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
        
        public LocalDate getStartDate() {
            return startDate;
        }
        
        public void setStartDate(LocalDate startDate) {
            this.startDate = startDate;
        }
        
        public LocalDate getEndDate() {
            return endDate;
        }
        
        public void setEndDate(LocalDate endDate) {
            this.endDate = endDate;
        }
        
        public Integer getDays() {
            return days;
        }
        
        public void setDays(Integer days) {
            this.days = days;
        }
        
        public String getStatus() {
            return status;
        }
        
        public void setStatus(String status) {
            this.status = status;
        }

        public String getRejectionComment() {
            return rejectionComment;
        }

        public void setRejectionComment(String rejectionComment) {
            this.rejectionComment = rejectionComment;
        }
    }
}
