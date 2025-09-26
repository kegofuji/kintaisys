package com.kintai.dto;

import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 勤怠レポート用DTO
 */
public class AttendanceReportDto {
    
    private String employeeName;
    private String employeeCode;
    private String yearMonth;
    private String attendanceDate;
    private String clockInTime;
    private String clockOutTime;
    private String attendanceStatus;
    private String overtimeHours;
    private String lateMinutes;
    private String earlyLeaveMinutes;
    
    // デフォルトコンストラクタ
    public AttendanceReportDto() {
    }
    
    // コンストラクタ
    public AttendanceReportDto(AttendanceRecord record, String employeeName, String employeeCode) {
        this.employeeName = employeeName;
        this.employeeCode = employeeCode;
        this.attendanceDate = record.getAttendanceDate().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        this.clockInTime = formatTime(record.getClockInTime());
        this.clockOutTime = formatTime(record.getClockOutTime());
        this.attendanceStatus = getStatusDisplayName(record.getAttendanceStatus());
        this.overtimeHours = formatOvertime(record.getOvertimeMinutes());
        this.lateMinutes = record.getLateMinutes() != null ? record.getLateMinutes().toString() : "0";
        this.earlyLeaveMinutes = record.getEarlyLeaveMinutes() != null ? record.getEarlyLeaveMinutes().toString() : "0";
    }
    
    // データなし用のコンストラクタ
    public AttendanceReportDto(String employeeName, String employeeCode, String yearMonth) {
        this.employeeName = employeeName;
        this.employeeCode = employeeCode;
        this.yearMonth = yearMonth;
        this.attendanceDate = "";
        this.clockInTime = "";
        this.clockOutTime = "";
        this.attendanceStatus = "データなし";
        this.overtimeHours = "";
        this.lateMinutes = "";
        this.earlyLeaveMinutes = "";
    }
    
    private String formatTime(LocalDateTime time) {
        if (time == null) {
            return "";
        }
        return time.format(DateTimeFormatter.ofPattern("HH:mm"));
    }
    
    private String formatOvertime(Integer overtimeMinutes) {
        if (overtimeMinutes == null || overtimeMinutes == 0) {
            return "";
        }
        int hours = overtimeMinutes / 60;
        int minutes = overtimeMinutes % 60;
        if (hours > 0 && minutes > 0) {
            return String.format("%d時間%d分", hours, minutes);
        } else if (hours > 0) {
            return String.format("%d時間", hours);
        } else {
            return String.format("%d分", minutes);
        }
    }
    
    private String getStatusDisplayName(AttendanceStatus status) {
        if (status == null) {
            return "未出勤";
        }
        return switch (status) {
            case NORMAL -> "通常";
            case LATE -> "遅刻";
            case EARLY_LEAVE -> "早退";
            case LATE_AND_EARLY_LEAVE -> "遅刻・早退";
            case OVERTIME -> "残業";
            case NIGHT_SHIFT -> "深夜勤務";
            case ABSENT -> "欠勤";
        };
    }
    
    // ゲッター・セッター
    public String getEmployeeName() {
        return employeeName;
    }
    
    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }
    
    public String getEmployeeCode() {
        return employeeCode;
    }
    
    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }
    
    public String getYearMonth() {
        return yearMonth;
    }
    
    public void setYearMonth(String yearMonth) {
        this.yearMonth = yearMonth;
    }
    
    public String getAttendanceDate() {
        return attendanceDate;
    }
    
    public void setAttendanceDate(String attendanceDate) {
        this.attendanceDate = attendanceDate;
    }
    
    public String getClockInTime() {
        return clockInTime;
    }
    
    public void setClockInTime(String clockInTime) {
        this.clockInTime = clockInTime;
    }
    
    public String getClockOutTime() {
        return clockOutTime;
    }
    
    public void setClockOutTime(String clockOutTime) {
        this.clockOutTime = clockOutTime;
    }
    
    public String getAttendanceStatus() {
        return attendanceStatus;
    }
    
    public void setAttendanceStatus(String attendanceStatus) {
        this.attendanceStatus = attendanceStatus;
    }
    
    public String getOvertimeHours() {
        return overtimeHours;
    }
    
    public void setOvertimeHours(String overtimeHours) {
        this.overtimeHours = overtimeHours;
    }
    
    public String getLateMinutes() {
        return lateMinutes;
    }
    
    public void setLateMinutes(String lateMinutes) {
        this.lateMinutes = lateMinutes;
    }
    
    public String getEarlyLeaveMinutes() {
        return earlyLeaveMinutes;
    }
    
    public void setEarlyLeaveMinutes(String earlyLeaveMinutes) {
        this.earlyLeaveMinutes = earlyLeaveMinutes;
    }
}
