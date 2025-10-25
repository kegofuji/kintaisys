package com.kintai.controller;

import com.kintai.dto.AdminDashboardSummary;
import com.kintai.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService adminDashboardService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        AdminDashboardSummary summary = adminDashboardService.getSummary();
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", summary);
        return ResponseEntity.ok(body);
    }
}
