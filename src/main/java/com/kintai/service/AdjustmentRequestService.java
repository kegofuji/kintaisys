package com.kintai.service;

import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * 勤怠修正申請サービス
 */
@Service
@Transactional
public class AdjustmentRequestService {
    
    @Autowired
    private AdjustmentRequestRepository adjustmentRequestRepository;
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private TimeCalculator timeCalculator;

    @Autowired
    private WorkPatternChangeRequestService workPatternChangeRequestService;

    /**
     * 修正申請を作成
     * @param requestDto 修正申請DTO
     * @return 作成された修正申請
     */
    public AdjustmentRequest createAdjustmentRequest(AdjustmentRequestDto requestDto) {
        Long employeeId = requestDto.getEmployeeId();
        LocalDate targetDate = requestDto.getTargetDate();
        
        // 1. 従業員存在チェック
        employeeRepository.findById(employeeId)
                .orElseThrow(() -> new AttendanceException("EMPLOYEE_NOT_FOUND", "従業員が見つかりません: " + employeeId));
        
        // 2. 出勤時間と退勤時間のバリデーション（双方必須）
        LocalDateTime newClockIn = requestDto.getNewClockIn();
        LocalDateTime newClockOut = requestDto.getNewClockOut();
        if (newClockIn == null || newClockOut == null) {
            throw new AttendanceException(AttendanceException.INVALID_TIME_PAIR, "出勤と退勤の時刻はセットで入力してください");
        }
        
        if (newClockIn.isAfter(newClockOut)) {
            throw new AttendanceException("INVALID_TIME_ORDER", "出勤時間は退勤時間より前である必要があります");
        }

        // 実働時間に応じた最小休憩時間の検証
        if (newClockIn != null && newClockOut != null && requestDto.getBreakMinutes() != null) {
            int totalMinutes = (int) java.time.temporal.ChronoUnit.MINUTES.between(newClockIn, newClockOut);
            int workingMinutes = Math.max(totalMinutes - requestDto.getBreakMinutes(), 0);
            
            // 実働6時間以上8時間未満：45分以上の休憩が必要
            if (workingMinutes >= 360 && workingMinutes < 480 && requestDto.getBreakMinutes() < 45) {
                throw new AttendanceException("INSUFFICIENT_BREAK_TIME", "実働6時間以上8時間未満の場合、休憩時間は45分以上必要です");
            }
            // 実働8時間以上：60分以上の休憩が必要
            else if (workingMinutes >= 480 && requestDto.getBreakMinutes() < 60) {
                throw new AttendanceException("INSUFFICIENT_BREAK_TIME", "実働8時間以上の場合、休憩時間は60分以上必要です");
            }
        }

        if (targetDate == null && newClockIn != null) {
            targetDate = newClockIn.toLocalDate();
            requestDto.setTargetDate(targetDate);
        }

        if (targetDate == null) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "対象日が指定されていません");
        }

        // 4. 同日同社員のアクティブ申請（PENDING/APPROVED）がないか
        if (adjustmentRequestRepository.existsActiveRequestForDate(employeeId, targetDate)) {
            throw new AttendanceException("DUPLICATE_REQUEST", "該当日の修正申請は既に存在します");
        }

        // 5. 元の勤怠を記録（取消時に戻せるようにする）
        AttendanceRecord currentRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, targetDate)
                .orElse(null);

        // 7. 修正申請を作成
        AdjustmentRequest adjustmentRequest = new AdjustmentRequest(
                employeeId, targetDate, newClockIn, newClockOut, requestDto.getReason());
        int sanitizedBreak = timeCalculator.resolveBreakMinutes(newClockIn, newClockOut, requestDto.getBreakMinutes());
        adjustmentRequest.setNewBreakMinutes(sanitizedBreak);

        if (currentRecord != null) {
            adjustmentRequest.setOriginalClockIn(currentRecord.getClockInTime());
            adjustmentRequest.setOriginalClockOut(currentRecord.getClockOutTime());
            Integer originalBreak = null;
            if (currentRecord.getClockInTime() != null && currentRecord.getClockOutTime() != null) {
                originalBreak = timeCalculator.resolveBreakMinutes(
                        currentRecord.getClockInTime(),
                        currentRecord.getClockOutTime(),
                        currentRecord.getBreakMinutes()
                );
            }
            adjustmentRequest.setOriginalBreakMinutes(originalBreak);
        }

        return adjustmentRequestRepository.save(adjustmentRequest);
    }
    
    /**
     * 修正申請を承認
     * @param adjustmentRequestId 修正申請ID
     * @return 承認された修正申請
     */
    public AdjustmentRequest approveAdjustmentRequest(Long adjustmentRequestId, Long approverEmployeeId) {
        // 1. 修正申請を取得
        AdjustmentRequest adjustmentRequest = adjustmentRequestRepository.findById(adjustmentRequestId)
                .orElseThrow(() -> new AttendanceException("ADJUSTMENT_REQUEST_NOT_FOUND", "修正申請が見つかりません: " + adjustmentRequestId));
        
        // 2. 申請中かチェック
        if (adjustmentRequest.getStatus() != AdjustmentRequest.AdjustmentStatus.PENDING) {
            throw new AttendanceException("INVALID_STATUS", "承認可能な状態ではありません");
        }
        
        // 3. 勤怠記録を取得または作成
        AttendanceRecord attendanceRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(adjustmentRequest.getEmployeeId(), adjustmentRequest.getTargetDate())
                .orElse(new AttendanceRecord(adjustmentRequest.getEmployeeId(), adjustmentRequest.getTargetDate()));

        // 3-1. 承認時点の勤怠を原本として保持（既存データがない場合はnullのまま）
        if (adjustmentRequest.getOriginalClockIn() == null && adjustmentRequest.getOriginalClockOut() == null) {
            adjustmentRequest.setOriginalClockIn(attendanceRecord.getClockInTime());
            adjustmentRequest.setOriginalClockOut(attendanceRecord.getClockOutTime());
        }
        
        // 4. 勤怠記録を更新
        attendanceRecord.setClockInTime(adjustmentRequest.getNewClockIn());
        attendanceRecord.setClockOutTime(adjustmentRequest.getNewClockOut());
        int sanitizedBreak = timeCalculator.resolveBreakMinutes(
                adjustmentRequest.getNewClockIn(),
                adjustmentRequest.getNewClockOut(),
                adjustmentRequest.getNewBreakMinutes()
        );
        attendanceRecord.setBreakMinutes(sanitizedBreak);
        adjustmentRequest.setNewBreakMinutes(sanitizedBreak);
        
        // 5. 遅刻・早退・残業・深夜を再計算
        timeCalculator.calculateAttendanceMetrics(attendanceRecord);
        if (workPatternChangeRequestService != null) {
            workPatternChangeRequestService.applyPatternMetrics(attendanceRecord);
            int late = attendanceRecord.getLateMinutes() == null ? 0 : attendanceRecord.getLateMinutes();
            int early = attendanceRecord.getEarlyLeaveMinutes() == null ? 0 : attendanceRecord.getEarlyLeaveMinutes();
            int overtime = attendanceRecord.getOvertimeMinutes() == null ? 0 : attendanceRecord.getOvertimeMinutes();
            int night = attendanceRecord.getNightShiftMinutes() == null ? 0 : attendanceRecord.getNightShiftMinutes();
            attendanceRecord.setAttendanceStatus(
                    workPatternChangeRequestService.resolveAttendanceStatus(late, early, overtime, night)
            );
        }
        timeCalculator.normalizeMetrics(attendanceRecord);

        // 6. 勤怠記録を保存
        attendanceRecordRepository.save(attendanceRecord);
        
        // 7. 修正申請の状態を承認に更新
        adjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.APPROVED);
        adjustmentRequest.setApprovedByEmployeeId(approverEmployeeId);
        adjustmentRequest.setApprovedAt(LocalDateTime.now());
        
        return adjustmentRequestRepository.save(adjustmentRequest);
    }
    
    /**
     * 修正申請を却下
     * @param adjustmentRequestId 修正申請ID
     * @return 却下された修正申請
     */
    public AdjustmentRequest rejectAdjustmentRequest(Long adjustmentRequestId, Long approverEmployeeId, String comment) {
        // 1. 修正申請を取得
        AdjustmentRequest adjustmentRequest = adjustmentRequestRepository.findById(adjustmentRequestId)
                .orElseThrow(() -> new AttendanceException("ADJUSTMENT_REQUEST_NOT_FOUND", "修正申請が見つかりません: " + adjustmentRequestId));
        
        // 2. 申請中かチェック
        if (adjustmentRequest.getStatus() != AdjustmentRequest.AdjustmentStatus.PENDING) {
            throw new AttendanceException("INVALID_STATUS", "却下可能な状態ではありません");
        }
        
        // 3. 却下コメント必須
        if (comment == null || comment.trim().isEmpty()) {
            throw new AttendanceException("REJECTION_COMMENT_REQUIRED", "却下コメントは必須です");
        }
        // 4. 修正申請の状態を却下に更新
        adjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.REJECTED);
        adjustmentRequest.setRejectionComment(comment.trim());
        adjustmentRequest.setRejectedByEmployeeId(approverEmployeeId);
        adjustmentRequest.setRejectedAt(LocalDateTime.now());
       
        return adjustmentRequestRepository.save(adjustmentRequest);
    }

    /**
     * 修正申請を取消
     * @param adjustmentRequestId 修正申請ID
     * @param employeeId 申請者従業員ID
     * @return 取消後の修正申請
     */
    public AdjustmentRequest cancelAdjustmentRequest(Long adjustmentRequestId, Long employeeId) {
        AdjustmentRequest adjustmentRequest = adjustmentRequestRepository.findById(adjustmentRequestId)
                .orElseThrow(() -> new AttendanceException(AttendanceException.REQUEST_NOT_FOUND,
                        "修正申請が見つかりません: " + adjustmentRequestId));

        if (!Objects.equals(adjustmentRequest.getEmployeeId(), employeeId)) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "自身の申請のみ取消できます");
        }

        if (adjustmentRequest.getStatus() == AdjustmentRequest.AdjustmentStatus.REJECTED
                || adjustmentRequest.getStatus() == AdjustmentRequest.AdjustmentStatus.CANCELLED) {
            throw new AttendanceException(AttendanceException.REQUEST_NOT_CANCELLABLE, "取消できない状態です");
        }

        // 承認済みを取消する場合は勤怠を元に戻す
        if (adjustmentRequest.getStatus() == AdjustmentRequest.AdjustmentStatus.APPROVED) {
            attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(adjustmentRequest.getEmployeeId(), adjustmentRequest.getTargetDate())
                    .ifPresent(record -> {
                        LocalDateTime revertClockIn = adjustmentRequest.getOriginalClockIn();
                        LocalDateTime revertClockOut = adjustmentRequest.getOriginalClockOut();

                        if (revertClockIn != null || revertClockOut != null) {
                            record.setClockInTime(revertClockIn);
                            record.setClockOutTime(revertClockOut);
                        } else {
                            // 旧データがない場合は申請前の状態に戻せないため、勤務時刻を初期化する
                            record.setClockInTime(null);
                            record.setClockOutTime(null);
                        }

                        Integer revertBreak = adjustmentRequest.getOriginalBreakMinutes();
                        if (revertBreak != null) {
                            record.setBreakMinutes(revertBreak);
                        } else {
                            record.setBreakMinutes(0);
                        }

                        timeCalculator.calculateAttendanceMetrics(record);
                        timeCalculator.normalizeMetrics(record);
                        attendanceRecordRepository.save(record);
                    });
        }

        adjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.CANCELLED);
        adjustmentRequest.setApprovedByEmployeeId(null);
        adjustmentRequest.setApprovedAt(null);
        adjustmentRequest.setRejectedByEmployeeId(null);
        adjustmentRequest.setRejectedAt(null);
        adjustmentRequest.setRejectionComment(null);

        return adjustmentRequestRepository.save(adjustmentRequest);
    }
    
    /**
     * 従業員の修正申請一覧を取得
     * @param employeeId 従業員ID
     * @return 修正申請リスト
     */
    @Transactional(readOnly = true)
    public List<AdjustmentRequest> getAdjustmentRequestsByEmployee(Long employeeId) {
        return adjustmentRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }
    
    /**
     * 全修正申請一覧を取得（管理者用）
     * @return 修正申請リスト
     */
    @Transactional(readOnly = true)
    public List<AdjustmentRequest> getAllAdjustmentRequests() {
        return adjustmentRequestRepository.findAllOrderByCreatedAtDesc();
    }
    
    /**
     * 状態別修正申請一覧を取得
     * @param status 状態
     * @return 修正申請リスト
     */
    @Transactional(readOnly = true)
    public List<AdjustmentRequest> getAdjustmentRequestsByStatus(AdjustmentRequest.AdjustmentStatus status) {
        return adjustmentRequestRepository.findByStatusOrderByCreatedAtDesc(status);
    }
    
    /**
     * 承認待ちの修正申請数を取得
     * @return 承認待ちの件数
     */
    @Transactional(readOnly = true)
    public long getPendingRequestCount() {
        return adjustmentRequestRepository.countByStatus(AdjustmentRequest.AdjustmentStatus.PENDING);
    }
    
    /**
     * 修正申請を削除
     * @param adjustmentRequestId 修正申請ID
     */
    @Transactional
    public void deleteAdjustmentRequest(Long adjustmentRequestId) {
        // 修正申請の存在確認
        AdjustmentRequest adjustmentRequest = adjustmentRequestRepository.findById(adjustmentRequestId)
                .orElseThrow(() -> new AttendanceException("ADJUSTMENT_REQUEST_NOT_FOUND", "修正申請が見つかりません: " + adjustmentRequestId));
        
        // 削除実行
        adjustmentRequestRepository.delete(adjustmentRequest);
    }
}
