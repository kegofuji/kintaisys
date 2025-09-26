package com.kintai.repository;

import com.kintai.entity.AdjustmentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 勤怠修正申請リポジトリ
 */
@Repository
public interface AdjustmentRequestRepository extends JpaRepository<AdjustmentRequest, Long> {
    
    /**
     * 従業員IDと対象日で修正申請を検索
     * @param employeeId 従業員ID
     * @param targetDate 対象日
     * @return 修正申請（存在しない場合は空）
     */
    Optional<AdjustmentRequest> findByEmployeeIdAndTargetDate(Long employeeId, LocalDate targetDate);
    
    /**
     * 従業員IDで修正申請一覧を取得
     * @param employeeId 従業員ID
     * @return 修正申請リスト
     */
    List<AdjustmentRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    
    /**
     * 状態別に修正申請一覧を取得
     * @param status 状態
     * @return 修正申請リスト
     */
    List<AdjustmentRequest> findByStatusOrderByCreatedAtDesc(AdjustmentRequest.AdjustmentStatus status);
    
    /**
     * 全修正申請を取得（管理者用）
     * @return 修正申請リスト
     */
    @Query("SELECT ar FROM AdjustmentRequest ar ORDER BY ar.createdAt DESC")
    List<AdjustmentRequest> findAllOrderByCreatedAtDesc();
    
    /**
     * 承認待ちの修正申請数を取得
     * @return 承認待ちの件数
     */
    long countByStatus(AdjustmentRequest.AdjustmentStatus status);

    /**
     * 同日同社員のアクティブ申請（PENDING/APPROVED）の存在確認
     */
    @Query("SELECT COUNT(ar) > 0 FROM AdjustmentRequest ar WHERE ar.employeeId = :employeeId AND ar.targetDate = :targetDate AND ar.status IN ('PENDING','APPROVED')")
    boolean existsActiveRequestForDate(@Param("employeeId") Long employeeId, @Param("targetDate") LocalDate targetDate);
    
    /**
     * 指定期間内の未承認打刻修正申請を取得
     * @param employeeId 従業員ID
     * @param startDate 期間開始日
     * @param endDate 期間終了日
     * @return 未承認打刻修正申請リスト
     */
    @Query("SELECT ar FROM AdjustmentRequest ar WHERE ar.employeeId = :employeeId AND ar.targetDate >= :startDate AND ar.targetDate <= :endDate AND ar.status = 'PENDING' ORDER BY ar.targetDate")
    List<AdjustmentRequest> findPendingAdjustmentRequestsInPeriod(@Param("employeeId") Long employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
