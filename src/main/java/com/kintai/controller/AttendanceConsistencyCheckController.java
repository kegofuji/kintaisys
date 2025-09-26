package com.kintai.controller;

import com.kintai.dto.InconsistencyResponse;
import com.kintai.service.AttendanceConsistencyCheckService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 勤怠整合チェックコントローラー（管理者用）
 */
@RestController
@RequestMapping("/api/admin/attendance")
public class AttendanceConsistencyCheckController {
    
    @Autowired
    private AttendanceConsistencyCheckService attendanceConsistencyCheckService;
    
    /**
     * 勤怠整合チェックAPI
     * @return 不整合リスト
     */
    @GetMapping("/inconsistencies")
    public ResponseEntity<List<InconsistencyResponse>> getInconsistencies() {
        try {
            List<InconsistencyResponse> inconsistencies = attendanceConsistencyCheckService.checkInconsistencies();
            return ResponseEntity.ok(inconsistencies);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
