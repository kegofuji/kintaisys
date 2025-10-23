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
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonFormat;

@RestController
@RequestMapping("/api/holiday")
@Validated
public class HolidayController {

    @Autowired
    private HolidayRequestService service;

    /**
     * 休日出勤申請（JSON）
     */
    @PostMapping(value = "/holiday-work")
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
     * 休日出勤申請（JSON・休暇申請系と同じプレフィックス）
     */
    @PostMapping(value = "/requests/holiday-work", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> createHolidayWorkJsonAlt(@Valid @RequestBody HolidayWorkRequest req) {
        return createHolidayWorkJson(req);
    }

    /**
     * 休日出勤申請（フォームURLエンコード互換）
     */
    @PostMapping(value = "/holiday-work", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Map<String, Object>> createHolidayWorkForm(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDate,
            @RequestParam(name = "takeComp", defaultValue = "false") boolean takeComp,
            @RequestParam(name = "compDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compDate,
            @RequestParam(name = "reason", required = false) String reason
    ) {
        HolidayWorkRequest req = new HolidayWorkRequest();
        req.setEmployeeId(employeeId);
        req.setWorkDate(workDate);
        req.setTakeComp(takeComp);
        req.setCompDate(compDate);
        req.setReason(reason);
        return createHolidayWorkJson(req);
    }

    /**
     * 振替申請（JSON）
     */
    @PostMapping(value = "/transfer")
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

    /**
     * 振替申請（JSON・休暇申請系と同じプレフィックス）
     */
    @PostMapping(value = "/requests/transfer", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> createTransferJsonAlt(@Valid @RequestBody TransferRequest req) {
        return createTransferJson(req);
    }

    /**
     * 振替申請（フォームURLエンコード互換）
     */
    @PostMapping(value = "/transfer", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Map<String, Object>> createTransferForm(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate transferWorkDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate transferHolidayDate,
            @RequestParam(required = false) String reason
    ) {
        TransferRequest req = new TransferRequest();
        req.setEmployeeId(employeeId);
        req.setTransferWorkDate(transferWorkDate);
        req.setTransferHolidayDate(transferHolidayDate);
        req.setReason(reason);
        return createTransferJson(req);
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
     * 統一作成エンドポイント（既存の申請系に合わせて /requests を踏襲）
     */
    @PostMapping(value = "/requests", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> createUnified(@Valid @RequestBody CreateRequest req) {
        try {
            Map<String, Object> body = new HashMap<>();
            HolidayRequestDto dto;
            String type = (req.getRequestType() == null ? "" : req.getRequestType().trim().toUpperCase());
            if ("TRANSFER".equals(type)) {
                dto = service.createTransfer(req.getEmployeeId(), req.getTransferWorkDate(), req.getTransferHolidayDate(), req.getReason());
            } else {
                // デフォルトは休日出勤
                dto = service.createHolidayWork(req.getEmployeeId(), req.getWorkDate(), Boolean.TRUE.equals(req.getTakeComp()), req.getCompDate(), req.getReason());
            }
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
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate workDate;
        private Boolean takeComp;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @JsonFormat(pattern = "yyyy-MM-dd")
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
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate transferWorkDate;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @JsonFormat(pattern = "yyyy-MM-dd")
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

    /** リクエストDTO: 統一作成用 */
    public static class CreateRequest {
        @NotNull
        private Long employeeId;
        private String requestType; // HOLIDAY_WORK / TRANSFER
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate workDate;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate compDate;
        private Boolean takeComp;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate transferWorkDate;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate transferHolidayDate;
        private String reason;

        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
        public String getRequestType() { return requestType; }
        public void setRequestType(String requestType) { this.requestType = requestType; }
        public LocalDate getWorkDate() { return workDate; }
        public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }
        public LocalDate getCompDate() { return compDate; }
        public void setCompDate(LocalDate compDate) { this.compDate = compDate; }
        public Boolean getTakeComp() { return takeComp; }
        public void setTakeComp(Boolean takeComp) { this.takeComp = takeComp; }
        public LocalDate getTransferWorkDate() { return transferWorkDate; }
        public void setTransferWorkDate(LocalDate transferWorkDate) { this.transferWorkDate = transferWorkDate; }
        public LocalDate getTransferHolidayDate() { return transferHolidayDate; }
        public void setTransferHolidayDate(LocalDate transferHolidayDate) { this.transferHolidayDate = transferHolidayDate; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}


