package com.kintai.controller;

import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理者機能コントローラー
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    
    @Autowired
    private AdminService adminService;
    
    /**
     * 全社員一覧取得API
     * @return 社員一覧
     */
    @GetMapping("/employees")
    public ResponseEntity<Map<String, Object>> getAllEmployees() {
        try {
            List<Employee> employees = adminService.getAllEmployees();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "社員一覧を取得しました");
            response.put("data", employees);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "社員一覧の取得に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 勤怠承認処理API
     * @param request 承認リクエスト
     * @return 承認結果
     */
    @PostMapping("/attendance/approve")
    public ResponseEntity<Map<String, Object>> approveAttendance(@RequestBody AttendanceApprovalRequest request) {
        try {
            boolean success = adminService.approveAttendance(request.getEmployeeId(), request.getYearMonth());
            
            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "勤怠を承認しました");
            } else {
                response.put("success", false);
                response.put("message", "勤怠の承認に失敗しました");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "勤怠承認処理中にエラーが発生しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 有給申請承認処理API
     * @param request 承認リクエスト
     * @return 承認結果
     */
    @PostMapping("/vacation/approve")
    public ResponseEntity<Map<String, Object>> approveVacation(@RequestBody VacationApprovalRequest request) {
        try {
            boolean success = adminService.approveVacation(request.getVacationId(), request.isApproved());
            
            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", request.isApproved() ? "有給申請を承認しました" : "有給申請を却下しました");
            } else {
                response.put("success", false);
                response.put("message", "有給申請の処理に失敗しました");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "有給申請処理中にエラーが発生しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 未承認有給申請一覧取得API
     * @return 未承認申請一覧
     */
    @GetMapping("/vacation/pending")
    public ResponseEntity<Map<String, Object>> getPendingVacations() {
        try {
            List<VacationRequest> pendingRequests = adminService.getPendingVacations();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "未承認申請一覧を取得しました");
            response.put("data", pendingRequests);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未承認申請一覧の取得に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * ステータス別 有給申請一覧取得API
     * @param status 取得対象ステータス（PENDING/APPROVED/REJECTED）
     * @return 有給申請一覧
     */
    @GetMapping("/vacation/status/{status}")
    public ResponseEntity<Map<String, Object>> getVacationsByStatus(@PathVariable String status) {
        try {
            com.kintai.entity.VacationStatus vs;
            try {
                vs = com.kintai.entity.VacationStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "無効なステータスです: " + status);
                return ResponseEntity.badRequest().body(error);
            }

            List<VacationRequest> list = adminService.getVacationsByStatus(vs);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "有給申請一覧の取得に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    
    /**
     * CSRFトークン取得API
     * @param request HTTPリクエスト
     * @return CSRFトークン
     */
    @GetMapping("/csrf-token")
    public ResponseEntity<CsrfToken> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return ResponseEntity.ok(csrfToken);
    }
    
    /**
     * 勤怠承認リクエスト内部クラス
     */
    public static class AttendanceApprovalRequest {
        private Long employeeId;
        private String yearMonth;
        
        public Long getEmployeeId() {
            return employeeId;
        }
        
        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
        
        public String getYearMonth() {
            return yearMonth;
        }
        
        public void setYearMonth(String yearMonth) {
            this.yearMonth = yearMonth;
        }
    }
    
    
    /**
     * 有給申請承認リクエスト内部クラス
     */
    public static class VacationApprovalRequest {
        private Long vacationId;
        private boolean approved;
        
        public Long getVacationId() {
            return vacationId;
        }
        
        public void setVacationId(Long vacationId) {
            this.vacationId = vacationId;
        }
        
        public boolean isApproved() {
            return approved;
        }
        
        public void setApproved(boolean approved) {
            this.approved = approved;
        }
    }
}