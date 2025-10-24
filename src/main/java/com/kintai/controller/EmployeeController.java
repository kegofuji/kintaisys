package com.kintai.controller;

import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 従業員（本人/一般向け）情報参照API
 */
@RestController
@RequestMapping("/api/employee")
@CrossOrigin(origins = "*")
public class EmployeeController {

    @Autowired
    private EmployeeRepository employeeRepository;

    /**
     * 指定IDの従業員プロフィール（氏名など簡易情報）を返す
     */
    @GetMapping("/{employeeId}")
    public ResponseEntity<Map<String, Object>> getEmployeeSimple(@PathVariable Long employeeId) {
        return employeeRepository.findById(employeeId)
                .map(emp -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("employeeId", emp.getEmployeeId());
                    data.put("lastName", emp.getLastName());
                    data.put("firstName", emp.getFirstName());
                    data.put("lastKana", emp.getLastKana());
                    data.put("firstKana", emp.getFirstKana());

                    String displayName = buildDisplayName(emp);
                    data.put("displayName", displayName);

                    Map<String, Object> body = new HashMap<>();
                    body.put("success", true);
                    body.put("data", data);
                    return ResponseEntity.ok(body);
                })
                .orElseGet(() -> {
                    Map<String, Object> body = new HashMap<>();
                    body.put("success", false);
                    body.put("message", "従業員が見つかりません");
                    return ResponseEntity.status(404).body(body);
                });
    }

    private String buildDisplayName(Employee emp) {
        String last = emp.getLastName() == null ? "" : emp.getLastName().trim();
        String first = emp.getFirstName() == null ? "" : emp.getFirstName().trim();
        String name = (last + " " + first).trim();
        if (name.isEmpty()) {
            // 名前未設定時は空文字を返す（フロント側で適切にフォールバック表示）
            return "";
        }
        return name;
    }
}


