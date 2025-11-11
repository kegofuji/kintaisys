package com.kintai.controller;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.Map;
import java.util.HashMap;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * 勤怠管理コントローラー
 */
@RestController
@RequestMapping("/api/attendance")
@Validated
public class AttendanceController {
    
    @Autowired
    private AttendanceService attendanceService;
    
    /**
     * 出勤打刻API
     * @param request 出勤打刻リクエスト
     * @return 打刻レスポンス
     */
    @PostMapping("/clock-in")
    public ResponseEntity<ClockResponse> clockIn(@Valid @RequestBody ClockInRequest request) {
        try {
            ClockResponse response = attendanceService.clockIn(request);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            ClockResponse errorResponse = new ClockResponse(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 退勤打刻API
     * @param request 退勤打刻リクエスト
     * @return 打刻レスポンス
     */
    @PostMapping("/clock-out")
    public ResponseEntity<ClockResponse> clockOut(@Valid @RequestBody ClockOutRequest request) {
        try {
            ClockResponse response = attendanceService.clockOut(request);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            ClockResponse errorResponse = new ClockResponse(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    
    /**
     * ヘルスチェックAPI
     * @return ヘルスステータス
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("勤怠管理システムは正常に動作しています");
    }
    
    /**
     * 今日の勤怠状況取得API
     * @param employeeId 従業員ID
     * @return 今日の勤怠記録
     */
    @GetMapping("/today/{employeeId}")
    public ResponseEntity<ClockResponse> getTodayAttendance(@PathVariable Long employeeId) {
        try {
            ClockResponse response = attendanceService.getTodayAttendance(employeeId);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            ClockResponse errorResponse = new ClockResponse(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 勤怠履歴取得API
     * @param employeeId 従業員ID
     * @param year 年（オプション）
     * @param month 月（オプション）
     * @return 勤怠履歴
     */
    @GetMapping("/history/{employeeId}")
    public ResponseEntity<ClockResponse> getAttendanceHistory(
            @PathVariable Long employeeId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        ClockResponse response;
        if (year != null && month != null) {
            response = attendanceService.getAttendanceHistoryForMonth(employeeId, year, month);
        } else {
            response = attendanceService.getAttendanceHistory(employeeId);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 指定日の勤怠情報取得API
     * @param employeeId 従業員ID
     * @param date 日付
     * @return 指定日の勤怠記録
     */
    @GetMapping("/history/{employeeId}/{date}")
    public ResponseEntity<ClockResponse> getAttendanceRecordByDate(
            @PathVariable Long employeeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            ClockResponse response = attendanceService.getAttendanceRecordForDate(employeeId, date);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            ClockResponse errorResponse = new ClockResponse(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * CSRFトークン取得API
     * @param request HTTPリクエスト
     * @return CSRFトークン
     */
    @GetMapping("/csrf-token")
    public ResponseEntity<Map<String, String>> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        Map<String, String> tokenMap = new HashMap<>();
        if (csrfToken != null) {
            tokenMap.put("token", csrfToken.getToken());
        } else {
            tokenMap.put("token", "");
        }
        return ResponseEntity.ok(tokenMap);
    }
}
