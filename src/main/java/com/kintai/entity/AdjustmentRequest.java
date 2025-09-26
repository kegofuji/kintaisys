package com.kintai.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 勤怠修正申請エンティティ
 */
@Entity
@Table(name = "adjustment_requests")
public class AdjustmentRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "adjustment_request_id")
    private Long adjustmentRequestId;
    
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    
    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;
    
    @Column(name = "new_clock_in")
    private LocalDateTime newClockIn;
    
    @Column(name = "new_clock_out")
    private LocalDateTime newClockOut;
    
    @Column(name = "reason", nullable = false, length = 500)
    private String reason;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AdjustmentStatus status = AdjustmentStatus.PENDING;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // 承認監査
    @Column(name = "approved_by_employee_id")
    private Long approvedByEmployeeId;
    
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;
    
    // 却下監査
    @Column(name = "rejected_by_employee_id")
    private Long rejectedByEmployeeId;
    
    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;
    
    @Column(name = "rejection_comment", length = 500)
    private String rejectionComment;
    
    // デフォルトコンストラクタ
    public AdjustmentRequest() {
    }
    
    // コンストラクタ
    public AdjustmentRequest(Long employeeId, LocalDate targetDate, LocalDateTime newClockIn, 
                           LocalDateTime newClockOut, String reason) {
        this.employeeId = employeeId;
        this.targetDate = targetDate;
        this.newClockIn = newClockIn;
        this.newClockOut = newClockOut;
        this.reason = reason;
        this.status = AdjustmentStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // ゲッター・セッター
    public Long getAdjustmentRequestId() {
        return adjustmentRequestId;
    }
    
    public void setAdjustmentRequestId(Long adjustmentRequestId) {
        this.adjustmentRequestId = adjustmentRequestId;
    }
    
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
    
    public AdjustmentStatus getStatus() {
        return status;
    }
    
    public void setStatus(AdjustmentStatus status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Long getApprovedByEmployeeId() {
        return approvedByEmployeeId;
    }
    
    public void setApprovedByEmployeeId(Long approvedByEmployeeId) {
        this.approvedByEmployeeId = approvedByEmployeeId;
    }
    
    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }
    
    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }
    
    public Long getRejectedByEmployeeId() {
        return rejectedByEmployeeId;
    }
    
    public void setRejectedByEmployeeId(Long rejectedByEmployeeId) {
        this.rejectedByEmployeeId = rejectedByEmployeeId;
    }
    
    public LocalDateTime getRejectedAt() {
        return rejectedAt;
    }
    
    public void setRejectedAt(LocalDateTime rejectedAt) {
        this.rejectedAt = rejectedAt;
    }
    
    public String getRejectionComment() {
        return rejectionComment;
    }
    
    public void setRejectionComment(String rejectionComment) {
        this.rejectionComment = rejectionComment;
    }
    
    /**
     * 修正申請の状態を表すenum
     */
    public enum AdjustmentStatus {
        PENDING,    // 申請中
        APPROVED,   // 承認済み
        REJECTED    // 却下
    }
}
