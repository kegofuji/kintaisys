package com.kintai.controller;

import com.kintai.dto.WorkPatternChangeRequestDto;
import com.kintai.dto.WorkPatternSummaryDto;
import com.kintai.entity.WorkPatternChangeRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.WorkPatternChangeRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/work-pattern-change")
@Validated
public class WorkPatternChangeController {

    @Autowired
    private WorkPatternChangeRequestService service;

    @PostMapping(value = "/requests", consumes = "application/json", produces = "application/json")
    public ResponseEntity<Map<String, Object>> createRequest(@Valid @RequestBody WorkPatternChangeRequestDto dto) {
        try {
            WorkPatternChangeRequest created = service.createRequest(dto);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "勤務時間変更を申請しました");
            body.put("requestId", created.getRequestId());
            body.put("status", created.getStatus());
            body.put("createdAt", created.getCreatedAt());
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
            body.put("message", "勤務時間変更の申請に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    @GetMapping("/requests/{employeeId}")
    public ResponseEntity<Map<String, Object>> getRequestsByEmployee(@PathVariable Long employeeId) {
        List<WorkPatternChangeRequest> requests = service.getRequestsByEmployee(employeeId);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", requests);
        body.put("count", requests.size());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/current/{employeeId}")
    public ResponseEntity<Map<String, Object>> getCurrentSummary(
            @PathVariable Long employeeId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        WorkPatternSummaryDto summary = service.getCurrentSummary(employeeId, date);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", summary);
        return ResponseEntity.ok(body);
    }
}
