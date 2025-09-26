package com.kintai.controller;

import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AdjustmentRequestService;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
            response.put("message", "修正申請が正常に作成されました");
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
     * 修正申請作成API（フロント互換: /adjustment-request）
     * 日付と時刻文字列を受け取りDTOへ変換
     */
    @PostMapping("/adjustment-request")
    public ResponseEntity<Map<String, Object>> createAdjustmentRequestCompat(@RequestBody Map<String, String> payload) {
        try {
            Long employeeId = Long.valueOf(payload.getOrDefault("employeeId", "0"));
            String date = payload.get("date");
            String clockIn = payload.get("clockInTime");
            String clockOut = payload.get("clockOutTime");
            String reason = payload.getOrDefault("reason", "");

            AdjustmentRequestDto dto = new AdjustmentRequestDto();
            dto.setEmployeeId(employeeId);
            dto.setTargetDate(LocalDate.parse(date));
            if (clockIn != null && !clockIn.isBlank()) {
                dto.setNewClockIn(LocalDateTime.parse(date + "T" + clockIn + ":00"));
            }
            if (clockOut != null && !clockOut.isBlank()) {
                dto.setNewClockOut(LocalDateTime.parse(date + "T" + clockOut + ":00"));
            }
            dto.setReason(reason);

            AdjustmentRequest adjustmentRequest = adjustmentRequestService.createAdjustmentRequest(dto);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請が正常に作成されました");
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
     * 修正申請取消API
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
}
