package com.kintai.controller;

import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AdjustmentRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 勤怠修正申請管理コントローラー（管理者用）
 */
@RestController
@RequestMapping("/api/admin/attendance")
@Validated
public class AdminAdjustmentRequestController {
    
    @Autowired
    private AdjustmentRequestService adjustmentRequestService;
    
    /**
     * 修正申請承認API
     * @param adjustmentRequestId 修正申請ID
     * @return 承認結果
     */
    @PostMapping("/adjustment/approve/{adjustmentRequestId}")
    public ResponseEntity<Map<String, Object>> approveAdjustmentRequest(@PathVariable Long adjustmentRequestId, jakarta.servlet.http.HttpServletRequest request) {
        try {
            Long approverEmployeeId = resolveApproverEmployeeId(request);
            AdjustmentRequest approvedRequest = adjustmentRequestService.approveAdjustmentRequest(adjustmentRequestId, approverEmployeeId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請が承認されました");
            response.put("adjustmentRequestId", approvedRequest.getAdjustmentRequestId());
            response.put("status", approvedRequest.getStatus());
            response.put("employeeId", approvedRequest.getEmployeeId());
            response.put("targetDate", approvedRequest.getTargetDate());
            
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
     * 修正申請却下API
     * @param adjustmentRequestId 修正申請ID
     * @return 却下結果
     */
    @PostMapping("/adjustment/reject/{adjustmentRequestId}")
    public ResponseEntity<Map<String, Object>> rejectAdjustmentRequest(@PathVariable Long adjustmentRequestId, @RequestParam String comment, jakarta.servlet.http.HttpServletRequest request) {
        try {
            Long approverEmployeeId = resolveApproverEmployeeId(request);
            AdjustmentRequest rejectedRequest = adjustmentRequestService.rejectAdjustmentRequest(adjustmentRequestId, approverEmployeeId, comment);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請が却下されました");
            response.put("adjustmentRequestId", rejectedRequest.getAdjustmentRequestId());
            response.put("status", rejectedRequest.getStatus());
            response.put("employeeId", rejectedRequest.getEmployeeId());
            response.put("targetDate", rejectedRequest.getTargetDate());
            
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

    private Long resolveApproverEmployeeId(jakarta.servlet.http.HttpServletRequest request) {
        // 1) Spring Security認証情報から取得
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.kintai.entity.UserAccount user) {
                return user.getEmployeeId();
            }
        } catch (Exception ignored) {}
        
        // 2) セッションから取得（AuthControllerが設定）
        try {
            Object attr = request.getSession(false) != null ? request.getSession(false).getAttribute("employeeId") : null;
            if (attr instanceof Long id) return id;
            if (attr instanceof Integer i) return i.longValue();
        } catch (Exception ignored) {}
        
        // 取得できない場合はnull（上位で扱う）
        return null;
    }
    
    /**
     * 全修正申請一覧取得API（管理者用）
     * @return 修正申請リスト
     */
    @GetMapping("/adjustment")
    public ResponseEntity<Map<String, Object>> getAllAdjustmentRequests() {
        try {
            List<AdjustmentRequest> adjustmentRequests = adjustmentRequestService.getAllAdjustmentRequests();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", adjustmentRequests);
            response.put("count", adjustmentRequests.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 状態別修正申請一覧取得API（管理者用）
     * @param status 状態（PENDING, APPROVED, REJECTED）
     * @return 修正申請リスト
     */
    @GetMapping("/adjustment/status/{status}")
    public ResponseEntity<Map<String, Object>> getAdjustmentRequestsByStatus(@PathVariable String status) {
        try {
            AdjustmentRequest.AdjustmentStatus adjustmentStatus;
            try {
                adjustmentStatus = AdjustmentRequest.AdjustmentStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("errorCode", "INVALID_STATUS");
                errorResponse.put("message", "無効な状態です: " + status);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            List<AdjustmentRequest> adjustmentRequests = adjustmentRequestService.getAdjustmentRequestsByStatus(adjustmentStatus);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", adjustmentRequests);
            response.put("count", adjustmentRequests.size());
            response.put("status", status);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 承認待ち修正申請数取得API（管理者用）
     * @return 承認待ちの件数
     */
    @GetMapping("/adjustment/pending-count")
    public ResponseEntity<Map<String, Object>> getPendingRequestCount() {
        try {
            long pendingCount = adjustmentRequestService.getPendingRequestCount();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("pendingCount", pendingCount);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 修正申請削除API
     * @param adjustmentRequestId 修正申請ID
     * @return 削除結果
     */
    @DeleteMapping("/adjustment/{adjustmentRequestId}")
    public ResponseEntity<Map<String, Object>> deleteAdjustmentRequest(@PathVariable Long adjustmentRequestId) {
        try {
            adjustmentRequestService.deleteAdjustmentRequest(adjustmentRequestId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請が削除されました");
            response.put("adjustmentRequestId", adjustmentRequestId);
            
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
}
