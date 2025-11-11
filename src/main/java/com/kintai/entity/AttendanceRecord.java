package com.kintai.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 勤怠記録エンティティ
 */
@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Long attendanceId;
    
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    
    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;
    
    @Column(name = "clock_in_time")
    private LocalDateTime clockInTime;
    
    @Column(name = "clock_out_time")
    private LocalDateTime clockOutTime;
    
    @Column(name = "late_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer lateMinutes = 0;
    
    @Column(name = "early_leave_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer earlyLeaveMinutes = 0;
    
    @Column(name = "overtime_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer overtimeMinutes = 0;
    
    @Column(name = "night_shift_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer nightShiftMinutes = 0;

    @Column(name = "break_minutes", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer breakMinutes = 0;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", nullable = false)
    private AttendanceStatus attendanceStatus = AttendanceStatus.NORMAL;
    
    @Column(name = "attendance_fixed_flag", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean attendanceFixedFlag = false;
    
    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // デフォルトコンストラクタ
    public AttendanceRecord() {
        this.version = 0L;
    }
    
    // コンストラクタ
    public AttendanceRecord(Long employeeId, LocalDate attendanceDate) {
        this.employeeId = employeeId;
        this.attendanceDate = attendanceDate;
        this.version = 0L;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (version == null) {
            version = 0L;
        }
        normalizeMetrics();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        normalizeMetrics();
    }
    
    // ゲッター・セッター
    public Long getAttendanceId() {
        return attendanceId;
    }
    
    public void setAttendanceId(Long attendanceId) {
        this.attendanceId = attendanceId;
    }
    
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }
    
    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }
    
    public LocalDateTime getClockInTime() {
        return clockInTime;
    }
    
    public void setClockInTime(LocalDateTime clockInTime) {
        this.clockInTime = clockInTime;
    }
    
    public LocalDateTime getClockOutTime() {
        return clockOutTime;
    }
    
    public void setClockOutTime(LocalDateTime clockOutTime) {
        this.clockOutTime = clockOutTime;
    }
    
    public Integer getLateMinutes() {
        return lateMinutes;
    }
    
    public void setLateMinutes(Integer lateMinutes) {
        this.lateMinutes = lateMinutes == null ? 0 : lateMinutes;
    }
    
    public Integer getEarlyLeaveMinutes() {
        return earlyLeaveMinutes;
    }
    
    public void setEarlyLeaveMinutes(Integer earlyLeaveMinutes) {
        this.earlyLeaveMinutes = earlyLeaveMinutes == null ? 0 : earlyLeaveMinutes;
    }
    
    public Integer getOvertimeMinutes() {
        return overtimeMinutes;
    }
    
    public void setOvertimeMinutes(Integer overtimeMinutes) {
        this.overtimeMinutes = overtimeMinutes == null ? 0 : overtimeMinutes;
    }
    
    public Integer getNightShiftMinutes() {
        return nightShiftMinutes;
    }
    
    public void setNightShiftMinutes(Integer nightShiftMinutes) {
        this.nightShiftMinutes = nightShiftMinutes == null ? 0 : nightShiftMinutes;
    }

    public Integer getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(Integer breakMinutes) {
        this.breakMinutes = breakMinutes == null ? 0 : breakMinutes;
    }

    private void normalizeMetrics() {
        if (lateMinutes == null) {
            lateMinutes = 0;
        }
        if (earlyLeaveMinutes == null) {
            earlyLeaveMinutes = 0;
        }
        if (overtimeMinutes == null) {
            overtimeMinutes = 0;
        }
        if (nightShiftMinutes == null) {
            nightShiftMinutes = 0;
        }
        if (breakMinutes == null) {
            breakMinutes = 0;
        }
    }
    
    public AttendanceStatus getAttendanceStatus() {
        return attendanceStatus;
    }
    
    public void setAttendanceStatus(AttendanceStatus attendanceStatus) {
        this.attendanceStatus = attendanceStatus;
    }
    
    public Boolean getAttendanceFixedFlag() {
        return attendanceFixedFlag;
    }
    
    public void setAttendanceFixedFlag(Boolean attendanceFixedFlag) {
        this.attendanceFixedFlag = attendanceFixedFlag;
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
    
    public Long getVersion() {
        return version;
    }
    
    public void setVersion(Long version) {
        this.version = version;
    }
}
