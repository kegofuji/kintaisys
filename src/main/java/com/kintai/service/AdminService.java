package com.kintai.service;

import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理者機能サービス
 */
@Service
@Transactional
public class AdminService {
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private VacationRequestRepository vacationRequestRepository;
    
    /**
     * 全社員一覧取得
     * @return 社員一覧
     */
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }
    
    /**
     * 勤怠承認処理
     * @param employeeId 従業員ID
     * @param yearMonth 年月（yyyy-MM形式）
     * @return 承認成功の場合true
     */
    public boolean approveAttendance(Long employeeId, String yearMonth) {
        try {
            // 該当月の勤怠記録を取得
            String[] parts = yearMonth.split("-");
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(employeeId, year, month);
            
            if (records.isEmpty()) {
                return false;
            }
            
            // 勤怠記録を承認済みに更新
            for (AttendanceRecord record : records) {
                record.setAttendanceFixedFlag(true);
            }
            attendanceRecordRepository.saveAll(records);
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 有給申請承認処理
     * @param vacationId 有給申請ID
     * @param approved 承認する場合true、却下する場合false
     * @return 処理成功の場合true
     */
    public boolean approveVacation(Long vacationId, boolean approved) {
        try {
            VacationRequest vacationRequest = vacationRequestRepository.findById(vacationId)
                    .orElse(null);
            
            if (vacationRequest == null) {
                return false;
            }
            
            // ステータスを更新
            if (approved) {
                vacationRequest.setStatus(VacationStatus.APPROVED);
            } else {
                vacationRequest.setStatus(VacationStatus.REJECTED);
            }
            
            vacationRequestRepository.save(vacationRequest);
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 未承認有給申請一覧取得
     * @return 未承認申請一覧
     */
    public List<VacationRequest> getPendingVacations() {
        return vacationRequestRepository.findByStatusOrderByCreatedAtDesc(VacationStatus.PENDING);
    }

    /**
     * ステータス別 有給申請一覧取得
     * @param status 取得対象ステータス
     * @return 有給申請一覧
     */
    public List<VacationRequest> getVacationsByStatus(VacationStatus status) {
        return vacationRequestRepository.findByStatusOrderByCreatedAtDesc(status);
    }
    
}