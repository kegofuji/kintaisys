package com.kintai.exception;

/**
 * 有給休暇申請関連のカスタム例外クラス
 */
public class VacationException extends RuntimeException {
    
    private final String errorCode;
    
    public VacationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public VacationException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    // エラーコード定数
    public static final String DUPLICATE_REQUEST = "DUPLICATE_REQUEST";
    public static final String INVALID_DATE_RANGE = "INVALID_DATE_RANGE";
    public static final String RETIRED_EMPLOYEE = "RETIRED_EMPLOYEE";
    public static final String EMPLOYEE_NOT_FOUND = "EMPLOYEE_NOT_FOUND";
    public static final String INVALID_REQUEST = "INVALID_REQUEST";
    public static final String VACATION_NOT_FOUND = "VACATION_NOT_FOUND";
    public static final String INVALID_STATUS_CHANGE = "INVALID_STATUS_CHANGE";
}
