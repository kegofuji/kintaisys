package com.kintai.service;

import com.kintai.dto.InconsistencyResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 勤怠整合チェックサービス
 */
@Service
@Transactional
public class AttendanceConsistencyCheckService {
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private TimeCalculator timeCalculator;
    
    /**
     * 勤怠整合チェックを実行
     * @return 不整合リスト
     */
    public List<InconsistencyResponse> checkInconsistencies() {
        List<InconsistencyResponse> inconsistencies = new ArrayList<>();
        
        // 全勤怠記録を取得
        List<AttendanceRecord> allRecords = attendanceRecordRepository.findAll();
        
        // 従業員情報を取得してマップ化
        Map<Long, Employee> employeeMap = employeeRepository.findAll().stream()
                .collect(Collectors.toMap(Employee::getEmployeeId, employee -> employee));
        
        // 各勤怠記録をチェック
        for (AttendanceRecord record : allRecords) {
            Employee employee = employeeMap.get(record.getEmployeeId());
            if (employee == null) {
                continue; // 従業員が見つからない場合はスキップ
            }
            
            // 社員名の表示ロジック（employeeCodeを使用）
            String employeeName = employee.getEmployeeCode();
            
            // 1. 打刻漏れチェック
            if (record.getClockInTime() != null && record.getClockOutTime() == null) {
                inconsistencies.add(new InconsistencyResponse(
                    record.getEmployeeId(),
                    employeeName,
                    record.getAttendanceDate(),
                    "退勤漏れ"
                ));
            } else if (record.getClockInTime() == null && record.getClockOutTime() != null) {
                inconsistencies.add(new InconsistencyResponse(
                    record.getEmployeeId(),
                    employeeName,
                    record.getAttendanceDate(),
                    "出勤漏れ"
                ));
            }
            
            // 2. 遅刻チェック（出勤時刻が9:00を超過している場合）
            if (record.getClockInTime() != null) {
                int lateMinutes = timeCalculator.calculateLateMinutes(record.getClockInTime());
                if (lateMinutes > 0) {
                    inconsistencies.add(new InconsistencyResponse(
                        record.getEmployeeId(),
                        employeeName,
                        record.getAttendanceDate(),
                        "遅刻"
                    ));
                }
            }
            
            // 3. 早退チェック（退勤時刻が18:00未満の場合）
            if (record.getClockOutTime() != null) {
                int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(record.getClockOutTime());
                if (earlyLeaveMinutes > 0) {
                    inconsistencies.add(new InconsistencyResponse(
                        record.getEmployeeId(),
                        employeeName,
                        record.getAttendanceDate(),
                        "早退"
                    ));
                }
            }
        }
        
        return inconsistencies;
    }
}
