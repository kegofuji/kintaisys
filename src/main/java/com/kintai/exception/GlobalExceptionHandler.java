package com.kintai.exception;

import com.kintai.dto.ClockResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

import jakarta.validation.ConstraintViolationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.util.stream.Collectors;

/**
 * グローバル例外ハンドラー
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * バリデーションエラーのハンドリング
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ClockResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        
        ClockResponse errorResponse = new ClockResponse(false, "VALIDATION_ERROR", message);
        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * BindExceptionのハンドリング
     */
    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ClockResponse> handleBindException(BindException ex) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        
        ClockResponse errorResponse = new ClockResponse(false, "VALIDATION_ERROR", message);
        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * ConstraintViolationExceptionのハンドリング
     */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ClockResponse> handleConstraintViolationException(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations()
                .stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.joining(", "));
        
        ClockResponse errorResponse = new ClockResponse(false, "VALIDATION_ERROR", message);
        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * AttendanceExceptionのハンドリング
     */
    @ExceptionHandler(AttendanceException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ClockResponse> handleAttendanceException(AttendanceException ex) {
        ClockResponse errorResponse = new ClockResponse(false, ex.getErrorCode(), ex.getMessage());
        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * VacationExceptionのハンドリング
     */
    @ExceptionHandler(VacationException.class)
    public ResponseEntity<ClockResponse> handleVacationException(VacationException ex) {
        ClockResponse errorResponse = new ClockResponse(false, ex.getErrorCode(), ex.getMessage());
        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * 型変換エラーのハンドリング
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ClockResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "パラメータの型が正しくありません: " + ex.getName();
        ClockResponse errorResponse = new ClockResponse(false, "TYPE_MISMATCH", message);
        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * リソースが見つからない場合のハンドリング
     * 静的リソース（CSS、JS、画像など）は除外して、APIリクエストのみハンドリング
     */
    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ClockResponse> handleResourceNotFound(NoResourceFoundException ex) throws NoResourceFoundException {
        String resourcePath = ex.getResourcePath();
        
        // 静的リソースやHTMLファイルの場合は例外を再スローしてSpringのデフォルトハンドリングに任せる
        if (resourcePath != null && (
            resourcePath.startsWith("/css/") ||
            resourcePath.startsWith("/js/") ||
            resourcePath.startsWith("/images/") ||
            resourcePath.startsWith("/static/") ||
            resourcePath.endsWith(".html") ||
            resourcePath.endsWith(".css") ||
            resourcePath.endsWith(".js") ||
            resourcePath.endsWith(".ico") ||
            resourcePath.endsWith(".png") ||
            resourcePath.endsWith(".jpg") ||
            resourcePath.endsWith(".jpeg") ||
            resourcePath.endsWith(".gif") ||
            resourcePath.endsWith(".svg")
        )) {
            // 静的リソースの場合はSpringのデフォルトの404レスポンスを返すため、例外を再スロー
            throw ex;
        }
        
        // APIリクエストの場合はJSONレスポンスを返す
        ClockResponse errorResponse = new ClockResponse(false, "RESOURCE_NOT_FOUND", "リソースが見つかりません");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * その他の例外のハンドリング
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ClockResponse> handleAllExceptions(Exception ex) {
        ex.printStackTrace(); // デバッグ用
        ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "サーバーエラーが発生しました: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
