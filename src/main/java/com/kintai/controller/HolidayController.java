package com.kintai.controller;

import com.kintai.dto.HolidayRequestDto;
import com.kintai.entity.HolidayRequest;
import com.kintai.service.HolidayRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/holiday")
@Validated
public class HolidayController {

    @Autowired
    private HolidayRequestService service;

    /**
     * 休日出勤申請（JSON）
     */
    @PostMapping(value = "/holiday-work", consumes = "application/json", produces = "application/json")
    public ResponseEntity<Map<String, Object>> createHolidayWorkJson(@Valid @RequestBody HolidayWorkRequest req) {
        try {
            HolidayRequestDto dto = service.createHolidayWork(
                    req.getEmployeeId(),
                    req.getWorkDate(),
                    Boolean.TRUE.equals(req.getTakeComp()),
                    req.getCompDate(),
                    req.getReason()
            );
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

    /**
     * 振替申請（JSON）
     */
    @PostMapping(value = "/transfer", consumes = "application/json", produces = "application/json")
    public ResponseEntity<Map<String, Object>> createTransferJson(@Valid @RequestBody TransferRequest req) {
        try {
            HolidayRequestDto dto = service.createTransfer(
                    req.getEmployeeId(),
                    req.getTransferWorkDate(),
                    req.getTransferHolidayDate(),
                    req.getReason()
            );
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

    @GetMapping("/requests/{employeeId}")
    public ResponseEntity<Map<String, Object>> listByEmployee(@PathVariable Long employeeId) {
        List<HolidayRequest> list = service.listByEmployee(employeeId);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        body.put("count", list.size());
        return ResponseEntity.ok(body);
    }

    /**
     * CSRFトークン取得（他コントローラと同等の振る舞い）
     */
    @GetMapping("/csrf-token")
    public ResponseEntity<Map<String, String>> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        Map<String, String> tokenMap = new HashMap<>();
        tokenMap.put("token", csrfToken != null ? csrfToken.getToken() : "");
        return ResponseEntity.ok(tokenMap);
    }

    /** リクエストDTO: 休日出勤 */
    public static class HolidayWorkRequest {
        @NotNull
        private Long employeeId;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate workDate;
        private Boolean takeComp;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate compDate;
        private String reason;

        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
        public LocalDate getWorkDate() { return workDate; }
        public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }
        public Boolean getTakeComp() { return takeComp; }
        public void setTakeComp(Boolean takeComp) { this.takeComp = takeComp; }
        public LocalDate getCompDate() { return compDate; }
        public void setCompDate(LocalDate compDate) { this.compDate = compDate; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    /** リクエストDTO: 振替 */
    public static class TransferRequest {
        @NotNull
        private Long employeeId;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate transferWorkDate;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate transferHolidayDate;
        private String reason;

        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
        public LocalDate getTransferWorkDate() { return transferWorkDate; }
        public void setTransferWorkDate(LocalDate transferWorkDate) { this.transferWorkDate = transferWorkDate; }
        public LocalDate getTransferHolidayDate() { return transferHolidayDate; }
        public void setTransferHolidayDate(LocalDate transferHolidayDate) { this.transferHolidayDate = transferHolidayDate; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}


