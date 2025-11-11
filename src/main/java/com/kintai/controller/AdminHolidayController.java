package com.kintai.controller;

import com.kintai.dto.HolidayRequestDto;
import com.kintai.entity.HolidayRequest;
import com.kintai.service.HolidayRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/holiday")
public class AdminHolidayController {

    @Autowired
    private HolidayRequestService service;

    @GetMapping("/requests/pending")
    public ResponseEntity<Map<String, Object>> pending() {
        List<HolidayRequest> list = service.listPending();
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        body.put("count", list.size());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/requests/status/{status}")
    public ResponseEntity<Map<String, Object>> listByStatus(@PathVariable("status") String status) {
        HolidayRequest.Status st;
        try {
            st = HolidayRequest.Status.valueOf(status.toUpperCase());
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "不正なステータスです");
            return ResponseEntity.badRequest().body(error);
        }
        List<HolidayRequest> list = service.listByStatus(st);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        body.put("count", list.size());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable Long id, @RequestParam Long approverId) {
        try {
            HolidayRequestDto dto = service.approve(id, approverId);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", dto.getMessage());
            body.put("data", dto);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable Long id, @RequestParam Long approverId, @RequestParam(required = false) String comment) {
        try {
            HolidayRequestDto dto = service.reject(id, approverId, comment);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", dto.getMessage());
            body.put("data", dto);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
}


