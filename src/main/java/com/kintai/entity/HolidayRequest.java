package com.kintai.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 休日関連申請（休日出勤/振替）
 */
@Entity
@Table(name = "holiday_requests")
public class HolidayRequest {

    public enum RequestType {
        HOLIDAY_WORK, // 休日出勤
        TRANSFER      // 振替（出勤日と休日の入替）
    }

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 20)
    private RequestType requestType;

    // 休日出勤日（HOLIDAY_WORKの場合のみ必須）/ 振替出勤日（TRANSFERの場合は workDate が出勤側）
    @Column(name = "work_date")
    private LocalDate workDate;

    // 代休日（HOLIDAY_WORKで代休を取得する場合）
    @Column(name = "comp_date")
    private LocalDate compDate;

    // 振替休日（TRANSFERの場合のみ必須）
    @Column(name = "transfer_holiday_date")
    private LocalDate transferHolidayDate;

    @Column(name = "take_comp", nullable = false)
    private Boolean takeComp = false;

    @Column(name = "reason", length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.PENDING;

    @Column(name = "approver_id")
    private Long approverId;

    @Column(name = "rejection_comment", length = 500)
    private String rejectionComment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public HolidayRequest() {}

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public RequestType getRequestType() {
        return requestType;
    }

    public void setRequestType(RequestType requestType) {
        this.requestType = requestType;
    }

    public LocalDate getWorkDate() {
        return workDate;
    }

    public void setWorkDate(LocalDate workDate) {
        this.workDate = workDate;
    }

    public LocalDate getCompDate() {
        return compDate;
    }

    public void setCompDate(LocalDate compDate) {
        this.compDate = compDate;
    }

    public LocalDate getTransferHolidayDate() {
        return transferHolidayDate;
    }

    public void setTransferHolidayDate(LocalDate transferHolidayDate) {
        this.transferHolidayDate = transferHolidayDate;
    }

    public Boolean getTakeComp() {
        return Boolean.TRUE.equals(takeComp);
    }

    public void setTakeComp(Boolean takeComp) {
        this.takeComp = takeComp == null ? false : takeComp;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Long getApproverId() {
        return approverId;
    }

    public void setApproverId(Long approverId) {
        this.approverId = approverId;
    }

    public String getRejectionComment() {
        return rejectionComment;
    }

    public void setRejectionComment(String rejectionComment) {
        this.rejectionComment = rejectionComment;
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
}


