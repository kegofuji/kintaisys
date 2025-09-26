package com.kintai.exception;

/**
 * 勤怠関連のカスタム例外クラス
 */
public class AttendanceException extends RuntimeException {
    
    private final String errorCode;
    
    public AttendanceException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public AttendanceException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    // エラーコード定数
    public static final String ALREADY_CLOCKED_IN = "ALREADY_CLOCKED_IN";
    public static final String NOT_CLOCKED_IN = "NOT_CLOCKED_IN";
    public static final String FIXED_ATTENDANCE = "FIXED_ATTENDANCE";
    public static final String RETIRED_EMPLOYEE = "RETIRED_EMPLOYEE";
    public static final String EMPLOYEE_NOT_FOUND = "EMPLOYEE_NOT_FOUND";
    public static final String INVALID_REQUEST = "INVALID_REQUEST";
}
