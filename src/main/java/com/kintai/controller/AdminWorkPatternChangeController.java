package com.kintai.controller;

import com.kintai.entity.WorkPatternChangeRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.WorkPatternChangeRequestService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/work-pattern-change")
@Validated
public class AdminWorkPatternChangeController {

    @Autowired
    private WorkPatternChangeRequestService service;

    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable Long requestId, HttpServletRequest request) {
        try {
            Long approverId = resolveApproverEmployeeId(request);
            WorkPatternChangeRequest approved = service.approveRequest(requestId, approverId);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "勤務時間変更申請を承認しました");
            body.put("requestId", approved.getRequestId());
            body.put("status", approved.getStatus());
            return ResponseEntity.ok(body);
        } catch (AttendanceException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", e.getErrorCode());
            body.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "勤務時間変更申請の承認に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable Long requestId,
                                                      @RequestParam String comment,
                                                      HttpServletRequest request) {
        try {
            Long approverId = resolveApproverEmployeeId(request);
            WorkPatternChangeRequest rejected = service.rejectRequest(requestId, approverId, comment);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "勤務時間変更申請を却下しました");
            body.put("requestId", rejected.getRequestId());
            body.put("status", rejected.getStatus());
            return ResponseEntity.ok(body);
        } catch (AttendanceException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", e.getErrorCode());
            body.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "勤務時間変更申請の却下に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    @GetMapping("/requests/status/{status}")
    public ResponseEntity<Map<String, Object>> findByStatus(@PathVariable String status) {
        WorkPatternChangeRequest.Status parsedStatus;
        try {
            parsedStatus = WorkPatternChangeRequest.Status.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", "INVALID_STATUS");
            body.put("message", "無効な状態です: " + status);
            return ResponseEntity.badRequest().body(body);
        }

        List<WorkPatternChangeRequest> requests = service.getRequestsByStatus(parsedStatus);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", requests);
        body.put("count", requests.size());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/requests/pending-count")
    public ResponseEntity<Map<String, Object>> pendingCount() {
        long count = service.countPendingRequests();
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("pendingCount", count);
        return ResponseEntity.ok(body);
    }

    private Long resolveApproverEmployeeId(HttpServletRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.kintai.entity.UserAccount user) {
                return user.getEmployeeId();
            }
        } catch (Exception ignored) {
        }

        Object approverId = request.getAttribute("approverEmployeeId");
        if (approverId instanceof Long) {
            return (Long) approverId;
        }
        return null;
    }
}
