package com.kintai.entity;

import jakarta.persistence.*;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 勤務時間変更申請エンティティ
 */
@Entity
@Table(name = "work_pattern_change_requests")
public class WorkPatternChangeRequest {

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "break_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer breakMinutes = 0;

    @Column(name = "working_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer workingMinutes = 0;

    @Column(name = "reason", length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status = Status.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "approved_by_employee_id")
    private Long approvedByEmployeeId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by_employee_id")
    private Long rejectedByEmployeeId;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_comment", length = 500)
    private String rejectionComment;

    @Column(name = "apply_monday", nullable = false)
    private Boolean applyMonday = false;

    @Column(name = "apply_tuesday", nullable = false)
    private Boolean applyTuesday = false;

    @Column(name = "apply_wednesday", nullable = false)
    private Boolean applyWednesday = false;

    @Column(name = "apply_thursday", nullable = false)
    private Boolean applyThursday = false;

    @Column(name = "apply_friday", nullable = false)
    private Boolean applyFriday = false;

    @Column(name = "apply_saturday", nullable = false)
    private Boolean applySaturday = false;

    @Column(name = "apply_sunday", nullable = false)
    private Boolean applySunday = false;

    @Column(name = "apply_holiday", nullable = false)
    private Boolean applyHoliday = false;

    public WorkPatternChangeRequest() {
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

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
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

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public Integer getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(Integer breakMinutes) {
        this.breakMinutes = breakMinutes == null ? 0 : Math.max(breakMinutes, 0);
    }

    public Integer getWorkingMinutes() {
        return workingMinutes;
    }

    public void setWorkingMinutes(Integer workingMinutes) {
        this.workingMinutes = workingMinutes == null ? 0 : Math.max(workingMinutes, 0);
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

    public boolean isApplyMonday() {
        return Boolean.TRUE.equals(applyMonday);
    }

    public void setApplyMonday(boolean applyMonday) {
        this.applyMonday = applyMonday;
    }

    public boolean isApplyTuesday() {
        return Boolean.TRUE.equals(applyTuesday);
    }

    public void setApplyTuesday(boolean applyTuesday) {
        this.applyTuesday = applyTuesday;
    }

    public boolean isApplyWednesday() {
        return Boolean.TRUE.equals(applyWednesday);
    }

    public void setApplyWednesday(boolean applyWednesday) {
        this.applyWednesday = applyWednesday;
    }

    public boolean isApplyThursday() {
        return Boolean.TRUE.equals(applyThursday);
    }

    public void setApplyThursday(boolean applyThursday) {
        this.applyThursday = applyThursday;
    }

    public boolean isApplyFriday() {
        return Boolean.TRUE.equals(applyFriday);
    }

    public void setApplyFriday(boolean applyFriday) {
        this.applyFriday = applyFriday;
    }

    public boolean isApplySaturday() {
        return Boolean.TRUE.equals(applySaturday);
    }

    public void setApplySaturday(boolean applySaturday) {
        this.applySaturday = applySaturday;
    }

    public boolean isApplySunday() {
        return Boolean.TRUE.equals(applySunday);
    }

    public void setApplySunday(boolean applySunday) {
        this.applySunday = applySunday;
    }

    public boolean isApplyHoliday() {
        return Boolean.TRUE.equals(applyHoliday);
    }

    public void setApplyHoliday(boolean applyHoliday) {
        this.applyHoliday = applyHoliday;
    }

    public boolean appliesTo(LocalDate date, boolean holiday) {
        if (date == null) {
            return false;
        }
        if (holiday && isApplyHoliday()) {
            return true;
        }
        DayOfWeek dow = date.getDayOfWeek();
        return switch (dow) {
            case MONDAY -> isApplyMonday();
            case TUESDAY -> isApplyTuesday();
            case WEDNESDAY -> isApplyWednesday();
            case THURSDAY -> isApplyThursday();
            case FRIDAY -> isApplyFriday();
            case SATURDAY -> isApplySaturday();
            case SUNDAY -> isApplySunday();
        };
    }
}
