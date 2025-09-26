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
        
        // 2. 対象日のバリデーション（過去日または当日のみ）
        LocalDate today = LocalDate.now();
        if (targetDate.isAfter(today)) {
            throw new AttendanceException("INVALID_DATE", "対象日は過去日または当日のみ指定可能です");
        }
        
        // 3. 出勤時間と退勤時間のバリデーション（片側のみ許容、両方nullは不可）
        LocalDateTime newClockIn = requestDto.getNewClockIn();
        LocalDateTime newClockOut = requestDto.getNewClockOut();
        if (newClockIn == null && newClockOut == null) {
            throw new AttendanceException("INVALID_TIME", "出勤または退勤のいずれかは必須です");
        }
        
        if (newClockIn != null && newClockOut != null && newClockIn.isAfter(newClockOut)) {
            throw new AttendanceException("INVALID_TIME_ORDER", "出勤時間は退勤時間より前である必要があります");
        }
        
        // 4. 同日同社員のアクティブ申請（PENDING/APPROVED）がないか
        if (adjustmentRequestRepository.existsActiveRequestForDate(employeeId, targetDate)) {
            throw new AttendanceException("DUPLICATE_REQUEST", "該当日の修正申請は既に存在します");
        }
        
        // 5. 修正申請を作成
        AdjustmentRequest adjustmentRequest = new AdjustmentRequest(
                employeeId, targetDate, newClockIn, newClockOut, requestDto.getReason());
        
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
        
        // 4. 勤怠記録を更新
        attendanceRecord.setClockInTime(adjustmentRequest.getNewClockIn());
        attendanceRecord.setClockOutTime(adjustmentRequest.getNewClockOut());
        
        // 5. 遅刻・早退・残業・深夜を再計算
        timeCalculator.calculateAttendanceMetrics(attendanceRecord);
        
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
