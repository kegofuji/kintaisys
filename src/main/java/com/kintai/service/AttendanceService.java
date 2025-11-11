package com.kintai.service;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AdminAccount;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.List;
import org.springframework.security.core.Authentication;
import com.kintai.entity.UserAccount;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
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
    private AdjustmentRequestRepository adjustmentRequestRepository;
    
    @Autowired
    private TimeCalculator timeCalculator;

    @Autowired
    private WorkPatternChangeRequestService workPatternChangeRequestService;
    
    
    /**
     * 出勤打刻処理
     * @param request 出勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockIn(ClockInRequest request) {
        Long employeeId = request.getEmployeeId();
        LocalDateTime now = timeCalculator.getCurrentTokyoTime();
        LocalDate today = now.toLocalDate();
        
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
        Optional<AttendanceRecord> existingRecordOpt = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, today);
        
        if (existingRecordOpt.isPresent() && existingRecordOpt.get().getClockInTime() != null) {
            // 既に出勤済みの場合は、現在の状態を返す
            AttendanceRecord existingRecord = existingRecordOpt.get();
            
            Integer workingMinutes = null;
            Integer breakMinutes = null;
            if (existingRecord.getClockOutTime() != null) {
                breakMinutes = timeCalculator.resolveBreakMinutes(
                        existingRecord.getClockInTime(),
                        existingRecord.getClockOutTime(),
                        existingRecord.getBreakMinutes()
                );
                existingRecord.setBreakMinutes(breakMinutes);
                workingMinutes = timeCalculator.calculateWorkingMinutes(
                        existingRecord.getClockInTime(), 
                        existingRecord.getClockOutTime(),
                        breakMinutes
                );
            }
            
            int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes != null ? workingMinutes : 0);
            int nightShiftMinutes = timeCalculator.calculateNightShiftMinutesWithBreak(
                    existingRecord.getClockInTime(),
                    existingRecord.getClockOutTime(),
                    breakMinutes != null ? breakMinutes : 0
            );

            if (workPatternChangeRequestService != null) {
                workPatternChangeRequestService.applyPatternMetrics(existingRecord);
                int lateMinutes = safeInt(existingRecord.getLateMinutes());
                int earlyLeaveMinutes = safeInt(existingRecord.getEarlyLeaveMinutes());
                existingRecord.setAttendanceStatus(
                        workPatternChangeRequestService.resolveAttendanceStatus(
                                lateMinutes,
                                earlyLeaveMinutes,
                                overtimeMinutes,
                                nightShiftMinutes
                        )
                );
            } else {
                // 勤務パターン変更申請が適用されていない場合は標準時間で計算
                int lateMinutes = timeCalculator.calculateLateMinutes(existingRecord.getClockInTime(), existingRecord.getAttendanceDate());
                int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(existingRecord.getClockOutTime(), existingRecord.getAttendanceDate());
                existingRecord.setLateMinutes(lateMinutes);
                existingRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
            }

            ClockResponse.ClockData data = new ClockResponse.ClockData(
                    existingRecord.getAttendanceId(),
                    existingRecord.getAttendanceDate(),
                    existingRecord.getClockInTime(),
                    existingRecord.getClockOutTime(),
                    existingRecord.getLateMinutes(),
                    existingRecord.getEarlyLeaveMinutes(),
                    overtimeMinutes,
                    nightShiftMinutes,
                    breakMinutes,
                    workingMinutes,
                    existingRecord.getAttendanceStatus() != null ? existingRecord.getAttendanceStatus().name() : null,
                    existingRecord.getAttendanceFixedFlag()
            );
            data.setHasApprovedAdjustment(hasApprovedAdjustment(existingRecord));
            
            ClockResponse response = new ClockResponse();
            response.setSuccess(true);
            response.setMessage("出勤打刻完了");
            response.setData(data);
            setUserInfoToResponse(response);
            return response;
        }
        
        // 4. 出勤打刻記録作成
        AttendanceRecord attendanceRecord = new AttendanceRecord(employeeId, today);
        attendanceRecord.setClockInTime(now);
        
        // 5. データベース保存
        AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
        
        // 6. レスポンス作成
        ClockResponse.ClockData data = new ClockResponse.ClockData(
                savedRecord.getAttendanceId(),
                savedRecord.getAttendanceDate(),
                savedRecord.getClockInTime(),
                null,
                null,
                null,
                null,
                savedRecord.getNightShiftMinutes(),
                null,
                null,
                savedRecord.getAttendanceStatus() != null ? savedRecord.getAttendanceStatus().name() : null,
                savedRecord.getAttendanceFixedFlag()
        );
        data.setHasApprovedAdjustment(Boolean.FALSE);
        
        String message = "出勤打刻完了";
        
        ClockResponse response = new ClockResponse();
        response.setSuccess(true);
        response.setMessage(message);
        response.setData(data);
        setUserInfoToResponse(response);
        return response;
    }
    
    /**
     * 退勤打刻処理
     * @param request 退勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockOut(ClockOutRequest request) {
        Long employeeId = request.getEmployeeId();
        LocalDateTime now = timeCalculator.getCurrentTokyoTime();
        LocalDate today = now.toLocalDate();
        
        // 最大3回までリトライ
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                System.out.println("退勤打刻処理開始 (試行" + attempt + "/" + maxRetries + "): employeeId=" + employeeId);
                
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
                
                // 3. 重複データをクリーンアップ
                cleanupDuplicateAttendanceRecords(employeeId, today);
                
                // 4. 最新の勤怠記録を取得
                Optional<AttendanceRecord> attendanceRecordOpt = attendanceRecordRepository
                        .findByEmployeeIdAndAttendanceDate(employeeId, today);
                
                if (attendanceRecordOpt.isEmpty() || attendanceRecordOpt.get().getClockInTime() == null) {
                    // 出勤打刻がない場合は、空の成功レスポンスを返す
                    ClockResponse response = new ClockResponse();
                    response.setSuccess(true);
                    response.setMessage("");
                    setUserInfoToResponse(response);
                    return response;
                }
                
                AttendanceRecord attendanceRecord = attendanceRecordOpt.get();
                
                // 5. 既に退勤済チェック
                if (attendanceRecord.getClockOutTime() != null) {
                    // 既に退勤済みの場合は、現在の状態を返す
                    int breakMinutes = timeCalculator.resolveBreakMinutes(
                            attendanceRecord.getClockInTime(),
                            attendanceRecord.getClockOutTime(),
                            attendanceRecord.getBreakMinutes()
                    );
                    attendanceRecord.setBreakMinutes(breakMinutes);
                    int workingMinutes = timeCalculator.calculateWorkingMinutes(
                            attendanceRecord.getClockInTime(),
                            attendanceRecord.getClockOutTime(),
                            breakMinutes
                    );
                    int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
                    int nightShiftMinutes = timeCalculator.calculateNightShiftMinutesWithBreak(
                            attendanceRecord.getClockInTime(),
                            attendanceRecord.getClockOutTime(),
                            breakMinutes
                    );

                    attendanceRecord.setOvertimeMinutes(overtimeMinutes);
                    attendanceRecord.setNightShiftMinutes(nightShiftMinutes);

                    if (workPatternChangeRequestService != null) {
                        workPatternChangeRequestService.applyPatternMetrics(attendanceRecord);
                        int lateMinutes = safeInt(attendanceRecord.getLateMinutes());
                        int earlyLeaveMinutes = safeInt(attendanceRecord.getEarlyLeaveMinutes());
                        attendanceRecord.setAttendanceStatus(
                                workPatternChangeRequestService.resolveAttendanceStatus(
                                        lateMinutes,
                                        earlyLeaveMinutes,
                                        overtimeMinutes,
                                        nightShiftMinutes
                                )
                        );
                    }

                    ClockResponse.ClockData data = new ClockResponse.ClockData(
                            attendanceRecord.getAttendanceId(),
                            attendanceRecord.getAttendanceDate(),
                            attendanceRecord.getClockInTime(),
                            attendanceRecord.getClockOutTime(),
                            attendanceRecord.getLateMinutes(),
                            attendanceRecord.getEarlyLeaveMinutes(),
                            overtimeMinutes,
                            nightShiftMinutes,
                            breakMinutes,
                            workingMinutes,
                            attendanceRecord.getAttendanceStatus() != null ? attendanceRecord.getAttendanceStatus().name() : null,
                            attendanceRecord.getAttendanceFixedFlag()
                    );
                    data.setHasApprovedAdjustment(hasApprovedAdjustment(attendanceRecord));

                    ClockResponse response = new ClockResponse();
                    response.setSuccess(true);
                    response.setMessage("退勤打刻完了");
                    response.setData(data);
                    setUserInfoToResponse(response);
                    return response;
                }
                
                // 6. 退勤時刻設定
                attendanceRecord.setClockOutTime(now);
                
                // 7. 時間計算
                LocalDateTime clockInTime = attendanceRecord.getClockInTime();

                int breakMinutes = timeCalculator.resolveBreakMinutes(clockInTime, now, attendanceRecord.getBreakMinutes());
                attendanceRecord.setBreakMinutes(breakMinutes);

                int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, now, breakMinutes);
                int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
                attendanceRecord.setOvertimeMinutes(overtimeMinutes);
                
                // 深夜勤務時間計算
                int nightShiftMinutes = timeCalculator.calculateNightShiftMinutesWithBreak(clockInTime, now, breakMinutes);
                attendanceRecord.setNightShiftMinutes(nightShiftMinutes);

                if (workPatternChangeRequestService != null) {
                    workPatternChangeRequestService.applyPatternMetrics(attendanceRecord);
                } else {
                    // 勤務パターン変更申請が適用されていない場合は標準時間で計算
                    int lateMinutes = timeCalculator.calculateLateMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getAttendanceDate());
                    int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(attendanceRecord.getClockOutTime(), attendanceRecord.getAttendanceDate());
                    attendanceRecord.setLateMinutes(lateMinutes);
                    attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
                }
                
                // 8. 勤怠ステータス更新
                updateAttendanceStatus(attendanceRecord, overtimeMinutes, nightShiftMinutes);
                
                // 9. メトリクス正規化
                timeCalculator.normalizeMetrics(attendanceRecord);
                
                // 10. データベース保存
                AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
                System.out.println("退勤打刻処理: データベース保存成功, ID=" + savedRecord.getAttendanceId());
                
                // 11. レスポンス作成
                ClockResponse response = new ClockResponse();
                response.setSuccess(true);
                response.setMessage("退勤打刻完了");
                response.setData(toClockData(savedRecord));
                setUserInfoToResponse(response);
                return response;
                
            } catch (ObjectOptimisticLockingFailureException e) {
                System.err.println("退勤打刻処理: 楽観的ロックエラー (試行" + attempt + "/" + maxRetries + ")=" + e.getMessage());
                
                if (attempt == maxRetries) {
                    // 最後の試行でも失敗した場合
                    throw new AttendanceException("CONCURRENT_UPDATE_ERROR", 
                            "他の操作と競合しました。しばらく時間をおいてから再度お試しください。");
                }
                
                // 少し待ってから再試行
                try {
                    Thread.sleep(100 * attempt); // 100ms, 200ms, 300ms
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new AttendanceException("INTERNAL_ERROR", "処理が中断されました");
                }
                
            } catch (AttendanceException e) {
                // AttendanceExceptionは再試行しない
                throw e;
            } catch (Exception e) {
                System.err.println("退勤打刻処理: 予期しないエラー (試行" + attempt + "/" + maxRetries + ")=" + e.getMessage());
                e.printStackTrace();
                
                if (attempt == maxRetries) {
                    throw new AttendanceException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
                }
                
                // 少し待ってから再試行
                try {
                    Thread.sleep(100 * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new AttendanceException("INTERNAL_ERROR", "処理が中断されました");
                }
            }
        }
        
        // ここには到達しないはず
        throw new AttendanceException("INTERNAL_ERROR", "予期しないエラーが発生しました");
    }

    
    /**
     * 勤怠ステータスを更新
     * @param record 勤怠記録
     * @param overtimeMinutes 残業分数
     * @param nightShiftMinutes 深夜勤務分数
     */
    private void updateAttendanceStatus(AttendanceRecord record, int overtimeMinutes, int nightShiftMinutes) {
        if (record == null) {
            return;
        }
        if (record.getAttendanceStatus() == AttendanceStatus.HOLIDAY) {
            return;
        }
        int lateMinutes = safeInt(record.getLateMinutes());
        int earlyLeaveMinutes = safeInt(record.getEarlyLeaveMinutes());

        AttendanceStatus status;
        if (workPatternChangeRequestService != null) {
            status = workPatternChangeRequestService.resolveAttendanceStatus(
                    lateMinutes,
                    earlyLeaveMinutes,
                    overtimeMinutes,
                    nightShiftMinutes
            );
        } else {
            status = resolveStatusFallback(lateMinutes, earlyLeaveMinutes, overtimeMinutes, nightShiftMinutes);
        }
        record.setAttendanceStatus(status);
    }
    
    /**
     * 勤務記録を再計算する
     * @param attendanceRecord 勤務記録
     */
    public void recalculateAttendanceRecord(AttendanceRecord attendanceRecord) {
        if (attendanceRecord == null) {
            return;
        }
        
        // 勤務時間を再計算
        if (attendanceRecord.getClockInTime() != null && attendanceRecord.getClockOutTime() != null) {
            int breakMinutes = timeCalculator.resolveBreakMinutes(
                    attendanceRecord.getClockInTime(),
                    attendanceRecord.getClockOutTime(),
                    attendanceRecord.getBreakMinutes()
            );
            attendanceRecord.setBreakMinutes(breakMinutes);
            
            int workingMinutes = timeCalculator.calculateWorkingMinutes(
                    attendanceRecord.getClockInTime(),
                    attendanceRecord.getClockOutTime(),
                    breakMinutes
            );
            
            int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
            attendanceRecord.setOvertimeMinutes(overtimeMinutes);
            
            // 深夜勤務時間計算
            int nightShiftMinutes = timeCalculator.calculateNightShiftMinutesWithBreak(
                    attendanceRecord.getClockInTime(),
                    attendanceRecord.getClockOutTime(),
                    breakMinutes
            );
            attendanceRecord.setNightShiftMinutes(nightShiftMinutes);
            
            // 遅刻・早退時間を再計算
            if (workPatternChangeRequestService != null) {
                workPatternChangeRequestService.applyPatternMetrics(attendanceRecord);
            } else {
                // 勤務パターン変更申請が適用されていない場合は標準時間で計算
                int lateMinutes = timeCalculator.calculateLateMinutes(attendanceRecord.getClockInTime(), attendanceRecord.getAttendanceDate());
                int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(attendanceRecord.getClockOutTime(), attendanceRecord.getAttendanceDate());
                attendanceRecord.setLateMinutes(lateMinutes);
                attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
            }
            
            // 勤怠ステータス更新
            updateAttendanceStatus(attendanceRecord, overtimeMinutes, nightShiftMinutes);
            
            // メトリクス正規化
            timeCalculator.normalizeMetrics(attendanceRecord);
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
            authorizeAttendanceHistoryAccess(employeeId);

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
            LocalDate endDate = timeCalculator.getCurrentTokyoTime().toLocalDate();
            LocalDate startDate = endDate.minusDays(30);
            
            List<AttendanceRecord> records = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(employeeId, startDate, endDate);

            // 各勤務記録を再計算
            for (AttendanceRecord record : records) {
                recalculateAttendanceRecord(record);
            }
            
            // 再計算後のデータを保存
            attendanceRecordRepository.saveAll(records);

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
            authorizeAttendanceHistoryAccess(employeeId);

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

            // 各勤務記録を再計算
            for (AttendanceRecord record : records) {
                recalculateAttendanceRecord(record);
            }
            
            // 再計算後のデータを保存
            attendanceRecordRepository.saveAll(records);

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
     * 指定日の勤怠情報取得
     * @param employeeId 従業員ID
     * @param targetDate 対象日
     * @return 勤怠レスポンス
     */
    @Transactional(readOnly = true)
    public ClockResponse getAttendanceRecordForDate(Long employeeId, LocalDate targetDate) {
        try {
            authorizeAttendanceHistoryAccess(employeeId);

            if (targetDate == null) {
                throw new AttendanceException(AttendanceException.INVALID_REQUEST, "対象日が指定されていません");
            }

            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND,
                            "従業員が見つかりません"));

            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE,
                        "退職済みの従業員です");
            }

            Optional<AttendanceRecord> recordOpt = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDate(employeeId, targetDate);

            ClockResponse response = new ClockResponse();
            response.setSuccess(true);

            if (recordOpt.isPresent()) {
                AttendanceRecord record = recordOpt.get();
                recalculateAttendanceRecord(record);
                attendanceRecordRepository.save(record);
                response.setMessage("指定日の勤怠情報を取得しました");
                response.setData(toClockData(record));
            } else {
                response.setMessage("指定日の勤怠情報はありません");
                response.setData(null);
            }
            setUserInfoToResponse(response);
            return response;
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "指定日の勤怠情報の取得に失敗しました: " + e.getMessage());
        }
    }

    
    /**
     * 今日の勤怠状況取得
     * @param employeeId 従業員ID
     * @return 勤怠レスポンス
     */
    @Transactional(readOnly = true)
    public ClockResponse getTodayAttendance(Long employeeId) {
        try {
            LocalDate today = timeCalculator.getCurrentTokyoTime().toLocalDate();
            
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
            
            // 3. 重複データをクリーンアップ
            cleanupDuplicateAttendanceRecords(employeeId, today);
            
            // 4. 今日の勤怠記録を取得
            Optional<AttendanceRecord> attendanceRecord = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDate(employeeId, today);
            
            if (attendanceRecord.isPresent()) {
                AttendanceRecord record = attendanceRecord.get();
                System.out.println("今日の勤怠記録取得: 出勤=" + record.getClockInTime() + ", 退勤=" + record.getClockOutTime());
                
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
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "今日の勤怠状況の取得に失敗しました: " + e.getMessage());
        }
    }
    
    /**
     * 重複する勤怠記録をクリーンアップ
     * @param employeeId 従業員ID
     * @param date 対象日
     */
    @Transactional
    public void cleanupDuplicateAttendanceRecords(Long employeeId, LocalDate date) {
        try {
            List<AttendanceRecord> duplicates = attendanceRecordRepository
                    .findDuplicatesByEmployeeIdAndAttendanceDate(employeeId, date);
            
            if (duplicates.size() > 1) {
                // 最新のレコード（最初の要素）を除いて、古いレコードを削除
                for (int i = 1; i < duplicates.size(); i++) {
                    try {
                        attendanceRecordRepository.delete(duplicates.get(i));
                    } catch (Exception e) {
                        // 削除に失敗した場合はログを出力して続行
                        System.err.println("Failed to delete duplicate record: " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            // クリーンアップに失敗した場合はログを出力して続行
            System.err.println("Failed to cleanup duplicates: " + e.getMessage());
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

        if (workPatternChangeRequestService != null) {
            try {
                workPatternChangeRequestService.applyPatternMetrics(record);
            } catch (Exception ex) {
                // ignore pattern refresh errors for read responses
            }
        }

        LocalDateTime clockInTime = record.getClockInTime();
        LocalDateTime clockOutTime = record.getClockOutTime();

        Integer breakMinutes = null;
        Integer workingMinutes = null;
        Integer overtimeMinutes = null;
        Integer nightShiftMinutes = null;

        if (clockInTime != null && clockOutTime != null) {
            int resolvedBreak = timeCalculator.resolveBreakMinutes(clockInTime, clockOutTime, record.getBreakMinutes());
            breakMinutes = resolvedBreak;
            workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime, resolvedBreak);
            overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
            nightShiftMinutes = timeCalculator.calculateNightShiftMinutesWithBreak(clockInTime, clockOutTime, resolvedBreak);
        } else {
            int storedOvertime = safeInt(record.getOvertimeMinutes());
            if (storedOvertime > 0) {
                overtimeMinutes = storedOvertime;
            }
            int storedNight = safeInt(record.getNightShiftMinutes());
            if (storedNight > 0) {
                nightShiftMinutes = storedNight;
            }
        }

        int lateMinutesValue = safeInt(record.getLateMinutes());
        int earlyLeaveMinutesValue = safeInt(record.getEarlyLeaveMinutes());
        int overtimeForStatus = overtimeMinutes != null ? overtimeMinutes : safeInt(record.getOvertimeMinutes());
        int nightForStatus = nightShiftMinutes != null ? nightShiftMinutes : safeInt(record.getNightShiftMinutes());

        AttendanceStatus attendanceStatus = record.getAttendanceStatus();
        if (workPatternChangeRequestService != null) {
            attendanceStatus = workPatternChangeRequestService.resolveAttendanceStatus(
                    lateMinutesValue,
                    earlyLeaveMinutesValue,
                    overtimeForStatus,
                    nightForStatus
            );
        }
        if (attendanceStatus == null) {
            attendanceStatus = resolveStatusFallback(
                    lateMinutesValue,
                    earlyLeaveMinutesValue,
                    overtimeForStatus,
                    nightForStatus
            );
        }
        record.setAttendanceStatus(attendanceStatus);

        ClockResponse.ClockData clockData = new ClockResponse.ClockData(
                record.getAttendanceId(),
                record.getAttendanceDate(),
                record.getClockInTime(),
                record.getClockOutTime(),
                lateMinutesValue,
                earlyLeaveMinutesValue,
                overtimeMinutes,
                nightShiftMinutes,
                breakMinutes,
                workingMinutes,
                attendanceStatus != null ? attendanceStatus.name() : null,
                record.getAttendanceFixedFlag()
        );
        clockData.setHasApprovedAdjustment(hasApprovedAdjustment(record));
        return clockData;
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

    private boolean hasApprovedAdjustment(AttendanceRecord record) {
        if (record == null) {
            return false;
        }
        Long employeeId = record.getEmployeeId();
        LocalDate attendanceDate = record.getAttendanceDate();
        if (employeeId == null || attendanceDate == null) {
            return false;
        }
        // 承認済みの修正申請が存在する場合は休憩編集を抑止
        return adjustmentRequestRepository.existsApprovedRequestForDate(
                employeeId,
                attendanceDate
        );
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

    private void authorizeAttendanceHistoryAccess(Long employeeId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AttendanceException(
                    AttendanceException.ACCESS_DENIED,
                    "勤怠履歴を閲覧する権限がありません");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AdminAccount) {
            return;
        }

        if (principal instanceof UserAccount userAccount) {
            if (userAccount.getRole() == UserAccount.UserRole.ADMIN) {
                return;
            }
            if (userAccount.getEmployeeId() != null && userAccount.getEmployeeId().equals(employeeId)) {
                return;
            }
            throw new AttendanceException(
                    AttendanceException.ACCESS_DENIED,
                    "本人以外の勤怠履歴は管理者のみ閲覧できます");
        }

        throw new AttendanceException(
                AttendanceException.ACCESS_DENIED,
                "勤怠履歴を閲覧する権限がありません");
    }

    private AttendanceStatus resolveStatusFallback(int lateMinutes, int earlyLeaveMinutes, int overtimeMinutes, int nightShiftMinutes) {
        if (lateMinutes > 0 && earlyLeaveMinutes > 0) {
            return AttendanceStatus.LATE_AND_EARLY_LEAVE;
        }
        if (lateMinutes > 0) {
            return AttendanceStatus.LATE;
        }
        if (earlyLeaveMinutes > 0) {
            return AttendanceStatus.EARLY_LEAVE;
        }
        if (nightShiftMinutes > 0) {
            return AttendanceStatus.NIGHT_SHIFT;
        }
        if (overtimeMinutes > 0) {
            return AttendanceStatus.OVERTIME;
        }
        return AttendanceStatus.NORMAL;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
    
    
}
