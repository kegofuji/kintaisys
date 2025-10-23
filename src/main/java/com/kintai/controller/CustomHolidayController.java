package com.kintai.controller;

import com.kintai.entity.CustomHoliday;
import com.kintai.service.CustomHolidayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * カスタム休日管理コントローラ
 */
@RestController
@RequestMapping("/api/custom-holidays")
public class CustomHolidayController {

    @Autowired
    private CustomHolidayService customHolidayService;

    /**
     * 従業員のカスタム休日一覧を取得
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<Map<String, Object>> getCustomHolidaysByEmployee(@PathVariable Long employeeId) {
        try {
            List<CustomHoliday> holidays = customHolidayService.getCustomHolidaysByEmployee(employeeId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", holidays);
            response.put("count", holidays.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 指定期間のカスタム休日一覧を取得
     */
    @GetMapping("/employee/{employeeId}/range")
    public ResponseEntity<Map<String, Object>> getCustomHolidaysByDateRange(
            @PathVariable Long employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        try {
            List<CustomHoliday> holidays = customHolidayService.getCustomHolidaysByDateRange(employeeId, startDate, endDate);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", holidays);
            response.put("count", holidays.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 指定日がカスタム休日かどうかを判定
     */
    @GetMapping("/employee/{employeeId}/check/{date}")
    public ResponseEntity<Map<String, Object>> isCustomHoliday(@PathVariable Long employeeId, @PathVariable LocalDate date) {
        try {
            boolean isHoliday = customHolidayService.isCustomHoliday(employeeId, date);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isCustomHoliday", isHoliday);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
