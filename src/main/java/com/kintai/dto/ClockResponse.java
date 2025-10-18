package com.kintai.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 打刻レスポンスDTO
 */
public class ClockResponse {
    
    private boolean success;
    private String message;
    private String errorCode;
    private Object data;
    private Long employeeId;
    private String username;
    
    // デフォルトコンストラクタ
    public ClockResponse() {
    }
    
    // 成功レスポンス用コンストラクタ
    public ClockResponse(boolean success, String message, ClockData data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
    
    
    // エラーレスポンス用コンストラクタ
    public ClockResponse(boolean success, String errorCode, String message) {
        this.success = success;
        this.errorCode = errorCode;
        this.message = message;
    }
    
    // 汎用データレスポンス用コンストラクタ
    public ClockResponse(boolean success, String message, Object data) {
        this.success = success;
        this.message = message;
        this.data = data;
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
     * 打刻データ内部クラス
     */
    public static class ClockData {
        private Long attendanceId;
        private LocalDate attendanceDate;
        private LocalDateTime clockInTime;
        private LocalDateTime clockOutTime;
        private Integer lateMinutes;
        private Integer earlyLeaveMinutes;
        private Integer overtimeMinutes;
        private Integer nightShiftMinutes;
        private Integer breakMinutes;
        private Integer workingMinutes;
        private String attendanceStatus;
        private Boolean attendanceFixed;
        private Boolean hasApprovedAdjustment;

        // デフォルトコンストラクタ
        public ClockData() {
        }

        // コンストラクタ
        public ClockData(Long attendanceId, LocalDate attendanceDate, LocalDateTime clockInTime, LocalDateTime clockOutTime,
                        Integer lateMinutes, Integer earlyLeaveMinutes, Integer overtimeMinutes, Integer nightShiftMinutes,
                        Integer breakMinutes, Integer workingMinutes, String attendanceStatus, Boolean attendanceFixed) {
            this.attendanceId = attendanceId;
            this.attendanceDate = attendanceDate;
            this.clockInTime = clockInTime;
            this.clockOutTime = clockOutTime;
            this.lateMinutes = lateMinutes;
            this.earlyLeaveMinutes = earlyLeaveMinutes;
            this.overtimeMinutes = overtimeMinutes;
            this.nightShiftMinutes = nightShiftMinutes;
            this.breakMinutes = breakMinutes;
            this.workingMinutes = workingMinutes;
            this.attendanceStatus = attendanceStatus;
            this.attendanceFixed = attendanceFixed;
            this.hasApprovedAdjustment = Boolean.FALSE;
        }
        
        // ゲッター・セッター
        public Long getAttendanceId() {
            return attendanceId;
        }

        public void setAttendanceId(Long attendanceId) {
            this.attendanceId = attendanceId;
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
            this.lateMinutes = lateMinutes;
        }
        
        public Integer getEarlyLeaveMinutes() {
            return earlyLeaveMinutes;
        }
        
        public void setEarlyLeaveMinutes(Integer earlyLeaveMinutes) {
            this.earlyLeaveMinutes = earlyLeaveMinutes;
        }
        
        public Integer getOvertimeMinutes() {
            return overtimeMinutes;
        }
        
        public void setOvertimeMinutes(Integer overtimeMinutes) {
            this.overtimeMinutes = overtimeMinutes;
        }
        
        public Integer getNightShiftMinutes() {
            return nightShiftMinutes;
        }

        public void setNightShiftMinutes(Integer nightShiftMinutes) {
            this.nightShiftMinutes = nightShiftMinutes;
        }

        public Integer getBreakMinutes() {
            return breakMinutes;
        }

        public void setBreakMinutes(Integer breakMinutes) {
            this.breakMinutes = breakMinutes;
        }

        public String getAttendanceStatus() {
            return attendanceStatus;
        }

        public void setAttendanceStatus(String attendanceStatus) {
            this.attendanceStatus = attendanceStatus;
        }

        public Boolean getAttendanceFixed() {
            return attendanceFixed;
        }

        public void setAttendanceFixed(Boolean attendanceFixed) {
            this.attendanceFixed = attendanceFixed;
        }
        
        public Integer getWorkingMinutes() {
            return workingMinutes;
        }

        public void setWorkingMinutes(Integer workingMinutes) {
            this.workingMinutes = workingMinutes;
        }

        public Boolean getHasApprovedAdjustment() {
            return hasApprovedAdjustment;
        }

        public void setHasApprovedAdjustment(Boolean hasApprovedAdjustment) {
            this.hasApprovedAdjustment = hasApprovedAdjustment;
        }
    }

}
