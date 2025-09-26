package com.kintai.controller;

import com.kintai.entity.Employee;
import com.kintai.entity.AttendanceRecord;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.AttendanceRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * テスト用コントローラー
 * FastAPIサービスとの連携用
 */
@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    /**
     * 従業員情報取得（テスト用）
     * @param employeeId 従業員ID
     * @return 従業員情報
     */
    @GetMapping("/employees/{employeeId}")
    public ResponseEntity<Employee> getEmployee(@PathVariable Long employeeId) {
        Optional<Employee> employee = employeeRepository.findById(employeeId);
        if (employee.isPresent()) {
            return ResponseEntity.ok(employee.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 勤怠記録取得（テスト用）
     * @param employeeId 従業員ID
     * @param yearMonth 年月
     * @return 勤怠記録一覧
     */
    @GetMapping("/attendance/records")
    public ResponseEntity<List<AttendanceRecord>> getAttendanceRecords(
            @RequestParam Long employeeId,
            @RequestParam String yearMonth) {
        // yearMonthを解析して年月に分割
        String[] parts = yearMonth.split("-");
        int year = Integer.parseInt(parts[0]);
        int month = Integer.parseInt(parts[1]);
        List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(employeeId, year, month);
        return ResponseEntity.ok(records);
    }
    
    /**
     * 勤怠記録作成（テスト用）
     * @param request 勤怠記録作成リクエスト
     * @return 作成結果
     */
    @PostMapping("/create-attendance")
    public ResponseEntity<String> createAttendance(@RequestBody AttendanceRequest request) {
        try {
            Employee employee = employeeRepository.findById(request.employeeId).orElse(null);
            if (employee == null) {
                return ResponseEntity.badRequest().body("従業員が見つかりません");
            }
            
            AttendanceRecord record = new AttendanceRecord();
            record.setEmployeeId(request.employeeId);
            record.setAttendanceDate(java.time.LocalDate.parse(request.date));
            record.setClockInTime(java.time.LocalDateTime.parse(request.date + "T" + request.clockIn + ":00"));
            record.setClockOutTime(java.time.LocalDateTime.parse(request.date + "T" + request.clockOut + ":00"));
            record.setOvertimeMinutes(0);
            record.setLateMinutes(0);
            record.setEarlyLeaveMinutes(0);
            record.setAttendanceStatus(com.kintai.entity.AttendanceStatus.NORMAL);
            record.setAttendanceFixedFlag(false);
            
            attendanceRecordRepository.save(record);
            
            return ResponseEntity.ok("勤怠記録を作成しました");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("エラー: " + e.getMessage());
        }
    }
    
    /**
     * テスト用データ作成
     * @return 作成結果
     */
    @PostMapping("/data/init")
    public ResponseEntity<String> initTestData() {
        try {
            // 従業員データが存在するかチェック
            if (employeeRepository.count() == 0) {
                return ResponseEntity.ok("データベースに従業員データが存在しません。マイグレーションを実行してください。");
            }
            
            // 勤怠データを作成
            Employee employee = employeeRepository.findById(2L).orElse(null);
            if (employee != null) {
                // 2025年9月の勤怠データを作成
                AttendanceRecord record = new AttendanceRecord();
                record.setEmployeeId(2L);
                record.setAttendanceDate(java.time.LocalDate.of(2025, 9, 1));
                record.setClockInTime(java.time.LocalDateTime.of(2025, 9, 1, 9, 0));
                record.setClockOutTime(java.time.LocalDateTime.of(2025, 9, 1, 18, 0));
                record.setOvertimeMinutes(0);
                record.setLateMinutes(0);
                record.setEarlyLeaveMinutes(0);
                record.setAttendanceStatus(com.kintai.entity.AttendanceStatus.NORMAL);
                attendanceRecordRepository.save(record);
                
                return ResponseEntity.ok("テストデータを作成しました。従業員ID: 2, 年月: 2025-09");
            } else {
                return ResponseEntity.ok("従業員ID 2が見つかりません。");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("エラー: " + e.getMessage());
        }
    }
    
    /**
     * 勤怠記録作成リクエスト
     */
    public static class AttendanceRequest {
        public Long employeeId;
        public String date;
        public String clockIn;
        public String clockOut;
    }
}
