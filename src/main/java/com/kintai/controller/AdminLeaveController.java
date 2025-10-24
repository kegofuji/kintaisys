package com.kintai.controller;

import com.kintai.dto.LeaveRequestDto;
import com.kintai.entity.LeaveRequest;
import com.kintai.entity.LeaveStatus;
import com.kintai.entity.LeaveType;
import com.kintai.exception.VacationException;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.LeaveRequestRepository;
import com.kintai.service.LeaveRequestService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/leave")
public class AdminLeaveController {

    @Autowired
    private LeaveRequestService leaveRequestService;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    // adjustPaidLeave エンドポイントは廃止（有休調整機能の廃止により）

    @PostMapping("/requests/{leaveRequestId}/decision")
    public ResponseEntity<Map<String, Object>> decideRequest(@PathVariable Long leaveRequestId,
                                                             @Valid @RequestBody DecisionRequest request) {
        try {
            Long approverId = Optional.ofNullable(request.getApproverId()).orElseGet(this::resolveApproverId);
            LeaveStatus status = request.isApproved() ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
            LeaveRequestDto dto = leaveRequestService.updateStatus(leaveRequestId, status, approverId, request.getComment());

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", request.isApproved() ? "休暇申請を承認しました" : "休暇申請を却下しました");
            body.put("data", dto.getData());
            return ResponseEntity.ok(body);
        } catch (VacationException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", e.getErrorCode());
            body.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "休暇申請処理中にエラーが発生しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<Map<String, Object>> pendingRequests() {
        List<LeaveRequest> pending = leaveRequestRepository.findByStatusOrderByCreatedAtDesc(LeaveStatus.PENDING);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", pending);
        body.put("count", pending.size());
        return ResponseEntity.ok(body);
    }

    /**
     * 状態別の休暇申請一覧（管理者用）
     */
    @GetMapping("/requests/status/{status}")
    public ResponseEntity<Map<String, Object>> requestsByStatus(@PathVariable String status) {
        LeaveStatus parsed;
        try {
            parsed = LeaveStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", "INVALID_STATUS");
            body.put("message", "無効な状態です: " + status);
            return ResponseEntity.badRequest().body(body);
        }

        List<LeaveRequest> list = leaveRequestRepository.findByStatusOrderByCreatedAtDesc(parsed);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        body.put("count", list.size());
        body.put("status", parsed.name());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/grants")
    public ResponseEntity<Map<String, Object>> grantLeave(@Valid @RequestBody GrantRequest request) {
        try {
            LeaveType leaveType = LeaveType.fromLabel(request.getLeaveType());
            BigDecimal days = request.getGrantedDays();
            LocalDate grantedOn = request.getGrantedDate();
            LocalDate expiresAt = request.getExpiresAt();
            Long approverId = resolveApproverId();

            // 夏季・冬季休暇は開始・終了の両日が必須
            if ((leaveType == LeaveType.SUMMER || leaveType == LeaveType.WINTER)
                    && (grantedOn == null || expiresAt == null)) {
                throw new VacationException(VacationException.INVALID_REQUEST, "有効期限の開始日と終了日を指定してください");
            }
            // 特別休暇は付与日と終了日の両方を必須とし、利用者向けに分かりやすい文言を返す
            if (leaveType == LeaveType.SPECIAL && (grantedOn == null || expiresAt == null)) {
                throw new VacationException(VacationException.INVALID_REQUEST, "特別休暇の日付を指定してください");
            }

            List<Long> targetEmployees = resolveTargetEmployees(request);
            if (targetEmployees.isEmpty()) {
                throw new VacationException(VacationException.INVALID_REQUEST, "付与対象の従業員が見つかりません");
            }

            // 有休の場合は grantedOn が必須（NOT NULL 制約のため）
            if (leaveType == LeaveType.PAID_LEAVE && grantedOn == null) {
                grantedOn = LocalDate.now();
            }

            // 全ての休暇種別で同じ処理を行う
            for (Long employeeId : targetEmployees) {
                leaveRequestService.applyGrant(
                        employeeId,
                        leaveType,
                        days,
                        grantedOn,
                        expiresAt,
                        approverId
                );
            }

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "休暇を付与しました");
            body.put("distributedCount", targetEmployees.size());
            return ResponseEntity.ok(body);
        } catch (VacationException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("errorCode", e.getErrorCode());
            body.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "休暇付与に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    private Long resolveApproverId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof com.kintai.entity.UserAccount userAccount) {
                return userAccount.getEmployeeId();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private List<Long> resolveTargetEmployees(GrantRequest request) {
        if (request.getScope() == GrantScope.ALL) {
            return employeeRepository.findAll()
                    .stream()
                    .filter(employee -> employee.getIsActive() != null && employee.getIsActive())
                    .map(com.kintai.entity.Employee::getEmployeeId)
                    .collect(Collectors.toList());
        }
        if (request.getEmployeeIds() == null) {
            return Collections.emptyList();
        }
        Set<Long> existing = employeeRepository.findAllById(request.getEmployeeIds())
                .stream()
                .filter(employee -> employee.getIsActive() != null && employee.getIsActive())
                .map(com.kintai.entity.Employee::getEmployeeId)
                .collect(Collectors.toSet());
        return request.getEmployeeIds()
                .stream()
                .filter(existing::contains)
                .collect(Collectors.toList());
    }

    public static class DecisionRequest {
        private boolean approved;
        private Long approverId;
        private String comment;

        public boolean isApproved() {
            return approved;
        }

        public void setApproved(boolean approved) {
            this.approved = approved;
        }

        public Long getApproverId() {
            return approverId;
        }

        public void setApproverId(Long approverId) {
            this.approverId = approverId;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }
    }

    public static class GrantRequest {
        @NotBlank(message = "休暇種別は必須です")
        private String leaveType;
        @NotNull(message = "付与日数は必須です")
        private BigDecimal grantedDays;
        private LocalDate grantedDate;
        private LocalDate expiresAt;
        @NotNull(message = "付与対象を指定してください")
        private GrantScope scope;
        private List<Long> employeeIds;

        public String getLeaveType() {
            return leaveType;
        }

        public void setLeaveType(String leaveType) {
            this.leaveType = leaveType;
        }

        public BigDecimal getGrantedDays() {
            return grantedDays;
        }

        public void setGrantedDays(BigDecimal grantedDays) {
            this.grantedDays = grantedDays;
        }

        public LocalDate getGrantedDate() {
            return grantedDate;
        }

        public void setGrantedDate(LocalDate grantedDate) {
            this.grantedDate = grantedDate;
        }

        public LocalDate getExpiresAt() {
            return expiresAt;
        }

        public void setExpiresAt(LocalDate expiresAt) {
            this.expiresAt = expiresAt;
        }

        public GrantScope getScope() {
            return scope;
        }

        public void setScope(GrantScope scope) {
            this.scope = scope;
        }

        public List<Long> getEmployeeIds() {
            return employeeIds;
        }

        public void setEmployeeIds(List<Long> employeeIds) {
            this.employeeIds = employeeIds;
        }


    }

    public enum GrantScope {
        ALL,
        INDIVIDUAL
    }

    // AdjustBalanceRequest クラスは廃止（有休調整機能の廃止により）

    // error メソッドは廃止（有休調整機能の廃止により使用されなくなった）
}
