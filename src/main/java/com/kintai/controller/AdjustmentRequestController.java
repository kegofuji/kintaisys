package com.kintai.controller;

import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AdjustmentRequestService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

/**
 * 勤怠修正申請コントローラー（社員用）
 */
@RestController
@RequestMapping("/api/attendance")
@Validated
public class AdjustmentRequestController {
    
    @Autowired
    private AdjustmentRequestService adjustmentRequestService;
    
    /**
     * 修正申請作成API（DTOそのまま）
     */
    @PostMapping("/adjustment")
    public ResponseEntity<Map<String, Object>> createAdjustmentRequest(@Valid @RequestBody AdjustmentRequestDto requestDto) {
        try {
            AdjustmentRequest adjustmentRequest = adjustmentRequestService.createAdjustmentRequest(requestDto);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "打刻修正が完了しました");
            response.put("adjustmentRequestId", adjustmentRequest.getAdjustmentRequestId());
            response.put("status", adjustmentRequest.getStatus());
            response.put("createdAt", adjustmentRequest.getCreatedAt());
            
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 修正申請取消API（従来エンドポイント）
     */
    @PostMapping("/adjustment/{adjustmentRequestId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelAdjustmentRequest(
            @PathVariable Long adjustmentRequestId,
            @Valid @RequestBody CancelRequest request) {
        try {
            AdjustmentRequest cancelled = adjustmentRequestService
                    .cancelAdjustmentRequest(adjustmentRequestId, request.getEmployeeId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請を取消しました");
            response.put("data", cancelled);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "修正申請の取消に失敗しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 修正申請作成API（フロント互換: /adjustment-request）
     * 日付と時刻文字列を受け取りDTOへ変換
     */
    @PostMapping("/adjustment-request")
    public ResponseEntity<Map<String, Object>> createAdjustmentRequestCompat(@RequestBody Map<String, String> payload) {
        try {
            Long employeeId = Long.valueOf(payload.getOrDefault("employeeId", "0"));
            String targetDateStr = payload.get("date");
            String clockInDateStr = payload.getOrDefault("clockInDate", targetDateStr);
            String clockInTimeStr = payload.get("clockInTime");
            String clockOutDateStr = payload.getOrDefault("clockOutDate", targetDateStr);
            String clockOutTimeStr = payload.get("clockOutTime");
            String reason = payload.getOrDefault("reason", "");
            String breakMinutesStr = payload.get("breakMinutes");
            String breakTimeStr = payload.get("breakTime");

            AdjustmentRequestDto dto = new AdjustmentRequestDto();
            dto.setEmployeeId(employeeId);
            LocalDate clockInDate = clockInDateStr != null && !clockInDateStr.isBlank() ? LocalDate.parse(clockInDateStr) : null;
            LocalDate clockOutDate = clockOutDateStr != null && !clockOutDateStr.isBlank() ? LocalDate.parse(clockOutDateStr) : null;

            if (clockInDate != null) {
                dto.setTargetDate(clockInDate);
            } else if (clockOutDate != null) {
                dto.setTargetDate(clockOutDate);
            }

            if (clockInDate != null && clockInTimeStr != null && !clockInTimeStr.isBlank()) {
                dto.setNewClockIn(LocalDateTime.of(clockInDate, LocalTime.parse(clockInTimeStr)));
            }
            if (clockOutDate != null && clockOutTimeStr != null && !clockOutTimeStr.isBlank()) {
                dto.setNewClockOut(LocalDateTime.of(clockOutDate, LocalTime.parse(clockOutTimeStr)));
            }
            dto.setReason(reason);
            Integer parsedBreakMinutes = parseBreakMinutes(breakMinutesStr, breakTimeStr);
            dto.setBreakMinutes(parsedBreakMinutes);

            AdjustmentRequest adjustmentRequest = adjustmentRequestService.createAdjustmentRequest(dto);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "打刻修正が完了しました");
            response.put("adjustmentRequestId", adjustmentRequest.getAdjustmentRequestId());
            response.put("status", adjustmentRequest.getStatus());
            response.put("createdAt", adjustmentRequest.getCreatedAt());

            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 修正申請一覧取得API（社員用）
     * @param employeeId 従業員ID
     * @return 修正申請リスト
     */
    @GetMapping("/adjustment/{employeeId}")
    public ResponseEntity<Map<String, Object>> getAdjustmentRequests(@PathVariable Long employeeId) {
        try {
            List<AdjustmentRequest> adjustmentRequests = adjustmentRequestService.getAdjustmentRequestsByEmployee(employeeId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", adjustmentRequests);
            response.put("count", adjustmentRequests.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            // エラーの場合は空のリストを返す
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", new ArrayList<>());
            response.put("count", 0);
            return ResponseEntity.ok(response);
        }
    }

    /** 取消リクエストDTO */
    public static class CancelRequest {
        @NotNull(message = "従業員IDは必須です")
        private Long employeeId;

        public Long getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
    }

    private Integer parseBreakMinutes(String breakMinutesStr, String breakTimeStr) {
        Integer breakMinutes = null;
        if (breakMinutesStr != null && !breakMinutesStr.isBlank()) {
            try {
                breakMinutes = Integer.parseInt(breakMinutesStr.trim());
            } catch (NumberFormatException ignored) {
                // fall back to time format
            }
        }

        if (breakMinutes == null && breakTimeStr != null && !breakTimeStr.isBlank()) {
            String[] parts = breakTimeStr.trim().split(":");
            if (parts.length == 2) {
                try {
                    int hours = Integer.parseInt(parts[0]);
                    int minutes = Integer.parseInt(parts[1]);
                    if (hours >= 0 && minutes >= 0 && minutes < 60) {
                        breakMinutes = hours * 60 + minutes;
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return breakMinutes;
    }
}
