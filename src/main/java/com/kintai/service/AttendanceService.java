package com.kintai.service;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import com.kintai.entity.UserAccount;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 勤怠管理サービス
 */
@Service
@Transactional
public class AttendanceService {
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private TimeCalculator timeCalculator;
    
    @Autowired
    private VacationRequestRepository vacationRequestRepository;
    
    @Autowired
    private AdjustmentRequestRepository adjustmentRequestRepository;
    
    /**
     * 出勤打刻処理
     * @param request 出勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockIn(ClockInRequest request) {
        Long employeeId = request.getEmployeeId();
        LocalDate today = LocalDate.now();
        LocalDateTime now = timeCalculator.getCurrentTokyoTime();
        
        // 1. 従業員存在チェック
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new AttendanceException(
                        AttendanceException.EMPLOYEE_NOT_FOUND, 
                        "従業員が見つかりません"));
        
        // 2. 退職者チェック
        if (employee.isRetired()) {
            throw new AttendanceException(
                    AttendanceException.RETIRED_EMPLOYEE, 
                    "退職済みの従業員です");
        }
        
        // 3. 重複出勤チェック
        if (attendanceRecordRepository.existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(employeeId, today)) {
            throw new AttendanceException(
                    AttendanceException.ALREADY_CLOCKED_IN, 
                    "既に出勤打刻済みです");
        }
        
        // 4. 出勤打刻記録作成
        AttendanceRecord attendanceRecord = new AttendanceRecord(employeeId, today);
        attendanceRecord.setClockInTime(now);
        
        // 5. 遅刻時間計算
        int lateMinutes = timeCalculator.calculateLateMinutes(now);
        attendanceRecord.setLateMinutes(lateMinutes);
        
        // 6. 勤怠ステータス設定
        if (lateMinutes > 0) {
            attendanceRecord.setAttendanceStatus(AttendanceStatus.LATE);
        }
        
        // 7. データベース保存
        AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
        
        // 8. レスポンス作成
        ClockResponse.ClockData data = new ClockResponse.ClockData(
                savedRecord.getAttendanceId(),
                savedRecord.getAttendanceDate(),
                savedRecord.getClockInTime(),
                null,
                savedRecord.getLateMinutes(),
                null,
                null,
                null,
                savedRecord.getAttendanceStatus() != null ? savedRecord.getAttendanceStatus().name() : null,
                savedRecord.getAttendanceFixedFlag()
        );
        
        String message = "出勤打刻完了";
        
        ClockResponse response = new ClockResponse(true, message, data);
        setUserInfoToResponse(response);
        return response;
    }
    
    /**
     * 退勤打刻処理
     * @param request 退勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockOut(ClockOutRequest request) {
        try {
            Long employeeId = request.getEmployeeId();
            LocalDate today = LocalDate.now();
            LocalDateTime now = timeCalculator.getCurrentTokyoTime();
            
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 出勤済みチェック
            AttendanceRecord attendanceRecord = attendanceRecordRepository
                    .findEditableRecord(employeeId, today)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.NOT_CLOCKED_IN, 
                            "出勤打刻がされていません"));
            
            // 4. 既に退勤済みチェック
            if (attendanceRecord.getClockOutTime() != null) {
                throw new AttendanceException(
                        AttendanceException.ALREADY_CLOCKED_IN, 
                        "既に退勤打刻済みです");
            }
            
            // 5. 退勤時刻設定
            attendanceRecord.setClockOutTime(now);
            
            // 6. 時間計算
            LocalDateTime clockInTime = attendanceRecord.getClockInTime();
            
            // 早退時間計算
            int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(now);
            attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
            
            // 実働時間計算
            int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, now);

            if (workingMinutes >= TimeCalculator.STANDARD_WORKING_MINUTES) {
                attendanceRecord.setLateMinutes(0);
                attendanceRecord.setEarlyLeaveMinutes(0);
                earlyLeaveMinutes = 0;
            }
            
            // 残業時間計算
            int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
            attendanceRecord.setOvertimeMinutes(overtimeMinutes);
            
            // 深夜勤務時間計算
            int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, now);
            attendanceRecord.setNightShiftMinutes(nightShiftMinutes);
            
            // 7. 勤怠ステータス更新
            updateAttendanceStatus(attendanceRecord, earlyLeaveMinutes, overtimeMinutes, nightShiftMinutes);
            
            // 8. データベース保存
            timeCalculator.normalizeMetrics(attendanceRecord);
            AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
            
            // 9. レスポンス作成
            ClockResponse.ClockData data = new ClockResponse.ClockData(
                    savedRecord.getAttendanceId(),
                    savedRecord.getAttendanceDate(),
                    savedRecord.getClockInTime(),
                    savedRecord.getClockOutTime(),
                    savedRecord.getLateMinutes(),
                    savedRecord.getEarlyLeaveMinutes(),
                    savedRecord.getOvertimeMinutes(),
                    savedRecord.getNightShiftMinutes(),
                    savedRecord.getAttendanceStatus() != null ? savedRecord.getAttendanceStatus().name() : null,
                    savedRecord.getAttendanceFixedFlag()
            );
            
            ClockResponse response = new ClockResponse(true, "退勤打刻完了", toClockData(savedRecord));
            setUserInfoToResponse(response);
            return response;
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 勤怠ステータスを更新
     * @param record 勤怠記録
     * @param earlyLeaveMinutes 早退分数
     * @param overtimeMinutes 残業分数
     * @param nightShiftMinutes 深夜勤務分数
     */
    private void updateAttendanceStatus(AttendanceRecord record, int earlyLeaveMinutes, 
                                      int overtimeMinutes, int nightShiftMinutes) {
        boolean isLate = record.getLateMinutes() > 0;
        boolean isEarlyLeave = earlyLeaveMinutes > 0;
        boolean isOvertime = overtimeMinutes > 0;
        boolean isNightShift = nightShiftMinutes > 0;
        
        if (isLate && isEarlyLeave) {
            record.setAttendanceStatus(AttendanceStatus.LATE_AND_EARLY_LEAVE);
        } else if (isLate) {
            record.setAttendanceStatus(AttendanceStatus.LATE);
        } else if (isEarlyLeave) {
            record.setAttendanceStatus(AttendanceStatus.EARLY_LEAVE);
        } else if (isNightShift) {
            record.setAttendanceStatus(AttendanceStatus.NIGHT_SHIFT);
        } else if (isOvertime) {
            record.setAttendanceStatus(AttendanceStatus.OVERTIME);
        } else {
            record.setAttendanceStatus(AttendanceStatus.NORMAL);
        }
    }
    
    /**
     * 勤怠履歴取得
     * @param employeeId 従業員ID
     * @return 勤怠履歴レスポンス
     */
    @Transactional(readOnly = true)
    public ClockResponse getAttendanceHistory(Long employeeId) {
        try {
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 勤怠履歴を取得（過去30日分）
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(30);
            
            List<AttendanceRecord> records = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(employeeId, startDate, endDate);

            ClockResponse response = new ClockResponse(true, "勤怠履歴を取得しました", toClockDataList(records));
            setUserInfoToResponse(response);
            return response;
            
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "勤怠履歴の取得に失敗しました: " + e.getMessage());
        }
    }
    
    /**
     * 指定月の勤怠履歴取得
     * @param employeeId 従業員ID
     * @param year 年
     * @param month 月
     * @return 勤怠履歴レスポンス
     */
    @Transactional(readOnly = true)
    public ClockResponse getAttendanceHistoryForMonth(Long employeeId, int year, int month) {
        try {
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 指定月の勤怠履歴を取得
            List<AttendanceRecord> records = attendanceRecordRepository
                    .findByEmployeeAndMonth(employeeId, year, month);

            // 4. データが空でも正常にレスポンスを返す
            ClockResponse response = new ClockResponse(true, "指定月の勤怠履歴を取得しました", toClockDataList(records));
            setUserInfoToResponse(response);
            return response;
            
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "月別勤怠履歴の取得に失敗しました: " + e.getMessage());
        }
    }
    
    
    
    
    
    
    /**
     * 今日の勤怠状況取得
     * @param employeeId 従業員ID
     * @return 勤怠レスポンス
     */
    @Transactional(readOnly = true)
    public ClockResponse getTodayAttendance(Long employeeId) {
        LocalDate today = LocalDate.now();
        
        // 1. 従業員存在チェック
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new AttendanceException(
                        AttendanceException.EMPLOYEE_NOT_FOUND, 
                        "従業員が見つかりません"));
        
        // 2. 退職者チェック
        if (employee.isRetired()) {
            throw new AttendanceException(
                    AttendanceException.RETIRED_EMPLOYEE, 
                    "退職済みの従業員です");
        }
        
        // 3. 今日の勤怠記録を取得
        Optional<AttendanceRecord> attendanceRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, today);
        
        if (attendanceRecord.isPresent()) {
            AttendanceRecord record = attendanceRecord.get();
            
            ClockResponse.ClockData clockData = toClockData(record);
            if (record.getClockInTime() != null && record.getClockOutTime() == null) {
                clockData.setClockOutTime(null);
                clockData.setEarlyLeaveMinutes(null);
                clockData.setOvertimeMinutes(null);
                clockData.setNightShiftMinutes(null);
            }
            ClockResponse response = new ClockResponse();
            response.setSuccess(true);
            response.setMessage("今日の勤怠状況を取得しました");
            response.setData(clockData);
            setUserInfoToResponse(response);
            return response;
        } else {
            // 今日の記録がない場合はnullを返す
            ClockResponse response = new ClockResponse();
            response.setSuccess(true);
            response.setMessage("今日の勤怠記録はありません");
            response.setData(null);
            setUserInfoToResponse(response);
            return response;
        }
    }
    
    /**
     * レスポンスにユーザー情報を設定
     * @param response レスポンス
     */
    private ClockResponse.ClockData toClockData(AttendanceRecord record) {
        if (record == null) {
            return null;
        }
        int nightShiftMinutes = resolveNightShiftMinutes(record);
        return new ClockResponse.ClockData(
                record.getAttendanceId(),
                record.getAttendanceDate(),
                record.getClockInTime(),
                record.getClockOutTime(),
                safeInt(record.getLateMinutes()),
                safeInt(record.getEarlyLeaveMinutes()),
                safeInt(record.getOvertimeMinutes()),
                nightShiftMinutes,
                record.getAttendanceStatus() != null ? record.getAttendanceStatus().name() : null,
                record.getAttendanceFixedFlag()
        );
    }

    private List<ClockResponse.ClockData> toClockDataList(List<AttendanceRecord> records) {
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }
        List<ClockResponse.ClockData> dataList = new ArrayList<>();
        for (AttendanceRecord record : records) {
            dataList.add(toClockData(record));
        }
        return dataList;
    }

    private void setUserInfoToResponse(ClockResponse response) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserAccount) {
                UserAccount userAccount = (UserAccount) authentication.getPrincipal();
                response.setEmployeeId(userAccount.getEmployeeId());
                response.setUsername(userAccount.getUsername());
            }
        } catch (Exception e) {
            // セッション情報の取得に失敗した場合は無視
            // ログ出力は行わない（認証エラーではないため）
        }
    }

    /**
     * 深夜勤務時間を再計算してレコードに反映
     * @param record 勤怠記録
     * @return 再計算後の深夜勤務分数（計算不可の場合はnull）
     */
    private int resolveNightShiftMinutes(AttendanceRecord record) {
        if (record == null) {
            return 0;
        }
        if (record.getClockInTime() == null || record.getClockOutTime() == null) {
            return safeInt(record.getNightShiftMinutes());
        }
        int recalculated = timeCalculator.calculateNightShiftMinutes(
                record.getClockInTime(),
                record.getClockOutTime()
        );

        int current = safeInt(record.getNightShiftMinutes());
        if (current > 0 && recalculated == 0) {
            return current;
        }
        return recalculated;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
