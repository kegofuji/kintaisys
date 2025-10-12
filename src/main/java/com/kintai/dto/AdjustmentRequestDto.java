package com.kintai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 勤怠修正申請DTO
 */
public class AdjustmentRequestDto {
    
    @NotNull(message = "従業員IDは必須です")
    @Positive(message = "従業員IDは正の数である必要があります")
    private Long employeeId;
    
    @NotNull(message = "対象日は必須です")
    private LocalDate targetDate;
    
    private LocalDateTime newClockIn;
    
    private LocalDateTime newClockOut;
    
    @NotBlank(message = "理由は必須です")
    @Size(max = 500, message = "理由は500文字以内で入力してください")
    private String reason;
    
    // デフォルトコンストラクタ
    public AdjustmentRequestDto() {
    }
    
    // コンストラクタ
    public AdjustmentRequestDto(Long employeeId, LocalDate targetDate, LocalDateTime newClockIn, 
                               LocalDateTime newClockOut, String reason) {
        this.employeeId = employeeId;
        this.targetDate = targetDate;
        this.newClockIn = newClockIn;
        this.newClockOut = newClockOut;
        this.reason = reason;
    }
    
    // ゲッター・セッター
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public LocalDate getTargetDate() {
        return targetDate;
    }
    
    public void setTargetDate(LocalDate targetDate) {
        this.targetDate = targetDate;
    }
    
    public LocalDateTime getNewClockIn() {
        return newClockIn;
    }
    
    public void setNewClockIn(LocalDateTime newClockIn) {
        this.newClockIn = newClockIn;
    }
    
    public LocalDateTime getNewClockOut() {
        return newClockOut;
    }
    
    public void setNewClockOut(LocalDateTime newClockOut) {
        this.newClockOut = newClockOut;
    }
    
    public String getReason() {
        return reason;
    }
    
    public void setReason(String reason) {
        this.reason = reason;
    }
}
