package com.kintai.controller;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.exception.VacationException;
import com.kintai.service.AdjustmentRequestService;
import com.kintai.service.VacationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 申請取消専用コントローラー
 */
@RestController
@RequestMapping("/api/cancel")
@Validated
public class CancellationController {

    @Autowired
    private AdjustmentRequestService adjustmentRequestService;

    @Autowired
    private VacationService vacationService;

    /**
     * 打刻修正申請の取消
     */
    @PostMapping("/adjustment")
    public ResponseEntity<Map<String, Object>> cancelAdjustment(@Valid @RequestBody AdjustmentCancelRequest request) {
        try {
            AdjustmentRequest cancelled = adjustmentRequestService.cancelAdjustmentRequest(
                    request.getAdjustmentRequestId(), request.getEmployeeId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請を取消しました");
            response.put("data", cancelled);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "修正申請の取消に失敗しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 有給申請の取消
     */
    @PostMapping("/vacation")
    public ResponseEntity<VacationRequestDto> cancelVacation(@Valid @RequestBody VacationCancelRequest request) {
        try {
            VacationRequestDto response = vacationService.cancelVacationRequest(
                    request.getVacationId(), request.getEmployeeId());
            return ResponseEntity.ok(response);
        } catch (VacationException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INTERNAL_ERROR", "有給申請の取消に失敗しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /** 申請ID付き打刻修正取消リクエスト */
    public static class AdjustmentCancelRequest {
        @NotNull(message = "申請IDは必須です")
        private Long adjustmentRequestId;

        @NotNull(message = "従業員IDは必須です")
        private Long employeeId;

        public Long getAdjustmentRequestId() {
            return adjustmentRequestId;
        }

        public void setAdjustmentRequestId(Long adjustmentRequestId) {
            this.adjustmentRequestId = adjustmentRequestId;
        }

        public Long getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
    }

    /** 申請ID付き有給取消リクエスト */
    public static class VacationCancelRequest {
        @NotNull(message = "有給申請IDは必須です")
        private Long vacationId;

        @NotNull(message = "従業員IDは必須です")
        private Long employeeId;

        public Long getVacationId() {
            return vacationId;
        }

        public void setVacationId(Long vacationId) {
            this.vacationId = vacationId;
        }

        public Long getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
    }
}
