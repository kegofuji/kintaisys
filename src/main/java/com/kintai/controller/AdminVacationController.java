package com.kintai.controller;

import com.kintai.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 管理者向け 有給調整API
 */
@RestController
@RequestMapping("/api/admin/vacation")
@Validated
public class AdminVacationController {

    @Autowired
    private EmployeeRepository employeeRepository;

    /**
     * 有給残数の加減算（履歴保存なし）
     */
    @PostMapping("/adjust")
    public ResponseEntity<Map<String, Object>> adjustVacation(@RequestBody AdjustRequest req) {
        if (req == null || req.employeeId == null || req.deltaDays == null || req.deltaDays == 0) {
            return ResponseEntity.badRequest().body(error("INVALID_REQUEST", "不正なリクエストです"));
        }
        return employeeRepository.findById(req.employeeId)
                .map(emp -> {
                    int current = emp.getPaidLeaveAdjustment();
                    emp.setPaidLeaveAdjustment(current + req.deltaDays);
                    employeeRepository.save(emp);
                    Map<String, Object> body = new HashMap<>();
                    body.put("success", true);
                    body.put("message", "有給残数を調整しました");
                    body.put("adjustmentTotal", emp.getPaidLeaveAdjustment());
                    return ResponseEntity.ok(body);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "従業員が見つかりません")));
    }

    private Map<String, Object> error(String code, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("errorCode", code);
        body.put("message", message);
        return body;
    }

    /** リクエストDTO */
    public static class AdjustRequest {
        public Long employeeId;
        public Integer deltaDays; // 正負の整数
        public String reason; // 今回は保存しない
    }
}


