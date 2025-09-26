package com.kintai.controller;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.service.VacationService;
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
import java.util.List;
import java.util.ArrayList;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 有給休暇申請コントローラー
 */
@RestController
@RequestMapping("/api/vacation")
@Validated
public class VacationController {
    
    @Autowired
    private VacationService vacationService;
    
    /**
     * 有給休暇申請API
     * @param request 有給申請リクエスト
     * @return 申請レスポンス
     */
    @PostMapping("/request")
    public ResponseEntity<VacationRequestDto> createVacationRequest(@Valid @RequestBody VacationRequestRequest request) {
        try {
            VacationRequestDto response = vacationService.createVacationRequest(
                    request.getEmployeeId(),
                    request.getStartDate(),
                    request.getEndDate(),
                    request.getReason()
            );
            return ResponseEntity.ok(response);
        } catch (VacationException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 有給申請ステータス更新API
     * @param vacationId 申請ID
     * @param request ステータス更新リクエスト
     * @return 更新レスポンス
     */
    @PutMapping("/{vacationId}/status")
    public ResponseEntity<VacationRequestDto> updateVacationStatus(
            @PathVariable Long vacationId,
            @Valid @RequestBody StatusUpdateRequest request) {
        try {
            VacationStatus status = parseVacationStatus(request.getStatus());
            VacationRequestDto response = vacationService.updateVacationStatus(vacationId, status);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INVALID_STATUS", "無効なステータスです");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (VacationException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 受信したステータス文字列を寛容に解釈して `VacationStatus` に変換する。
     * 想定揺れ: cancel/canceled/cancelled/取消/キャンセル 等
     */
    private VacationStatus parseVacationStatus(String raw) {
        if (raw == null) throw new IllegalArgumentException("status is null");
        String normalized = raw.trim().toUpperCase();

        // よくある表記揺れを吸収
        switch (normalized) {
            case "CANCEL":
            case "CANCELED": // 1つL
            case "CANCELLED": // 2つL
            case "取消":
            case "ｷｬﾝｾﾙ":
            case "キャンセル":
                return VacationStatus.CANCELLED;
            case "APPROVE":
            case "APPROVED":
            case "承認":
                return VacationStatus.APPROVED;
            case "REJECT":
            case "REJECTED":
            case "却下":
                return VacationStatus.REJECTED;
            case "PENDING":
            case "申請中":
                return VacationStatus.PENDING;
            default:
                // 直接Enum名に一致するか最終チェック
                return VacationStatus.valueOf(normalized);
        }
    }
    
    /**
     * 従業員の有給申請一覧取得API
     * @param employeeId 従業員ID
     * @return 申請一覧
     */
    @GetMapping("/{employeeId}")
    public ResponseEntity<Map<String, Object>> getVacationRequests(@PathVariable Long employeeId) {
        try {
            List<VacationRequest> requests = vacationService.getVacationRequestsByEmployee(employeeId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requests);
            response.put("count", requests.size());
            
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

    /**
     * 有給申請の取消API
     */
    @PostMapping("/{vacationId}/cancel")
    public ResponseEntity<VacationRequestDto> cancelVacationRequest(
            @PathVariable Long vacationId,
            @Valid @RequestBody CancelRequest request) {
        try {
            VacationRequestDto response = vacationService.cancelVacationRequest(vacationId, request.getEmployeeId());
            return ResponseEntity.ok(response);
        } catch (VacationException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INTERNAL_ERROR", "有給申請の取消に失敗しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 残有給日数取得API（簡易実装）
     * @param employeeId 従業員ID
     * @return { success, remainingDays }
     */
    @GetMapping("/remaining/{employeeId}")
    public ResponseEntity<Map<String, Object>> getRemainingDays(@PathVariable Long employeeId) {
        try {
            int remaining = vacationService.getRemainingVacationDays(employeeId);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("remainingDays", remaining);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", "INTERNAL_ERROR");
            body.put("message", "残有給日数の取得に失敗しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
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
    
    /**
     * 有給申請リクエスト内部クラス
     */
    public static class VacationRequestRequest {
        @NotNull(message = "従業員IDは必須です")
        private Long employeeId;
        @NotNull(message = "開始日は必須です")
        private LocalDate startDate;
        @NotNull(message = "終了日は必須です")
        private LocalDate endDate;
        @NotBlank(message = "理由は必須です")
        private String reason;
        
        // デフォルトコンストラクタ
        public VacationRequestRequest() {
        }
        
        // ゲッター・セッター
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
        
        public String getReason() {
            return reason;
        }
        
        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    /**
     * 取消リクエスト内部クラス
     */
    public static class CancelRequest {
        @NotNull(message = "従業員IDは必須です")
        private Long employeeId;

        public CancelRequest() {
        }

        public Long getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
    }
    
    /**
     * ステータス更新リクエスト内部クラス
     */
    public static class StatusUpdateRequest {
        private String status;
        
        // デフォルトコンストラクタ
        public StatusUpdateRequest() {
        }
        
        // ゲッター・セッター
        public String getStatus() {
            return status;
        }
        
        public void setStatus(String status) {
            this.status = status;
        }
    }
}
