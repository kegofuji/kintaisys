package com.kintai.repository;

import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 有給休暇申請リポジトリ
 */
@Repository
public interface VacationRequestRepository extends JpaRepository<VacationRequest, Long> {
    
    /**
     * 従業員IDで有給申請を検索
     * @param employeeId 従業員ID
     * @return 該当従業員の有給申請リスト
     */
    List<VacationRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    
    /**
     * 従業員IDとステータスで有給申請を検索
     * @param employeeId 従業員ID
     * @param status ステータス
     * @return 該当条件の有給申請リスト
     */
    List<VacationRequest> findByEmployeeIdAndStatusOrderByCreatedAtDesc(Long employeeId, VacationStatus status);
    
    /**
     * ステータスで有給申請を検索
     * @param status ステータス
     * @return 該当ステータスの有給申請リスト
     */
    List<VacationRequest> findByStatusOrderByCreatedAtDesc(VacationStatus status);
    
    /**
     * 日付範囲での重複申請チェック
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     * @return 重複する申請がある場合true
     */
    @Query("SELECT COUNT(vr) > 0 FROM VacationRequest vr WHERE vr.employeeId = :employeeId " +
           "AND vr.status IN ('PENDING', 'APPROVED') " +
           "AND ((vr.startDate <= :endDate AND vr.endDate >= :startDate))")
    boolean existsOverlappingRequest(@Param("employeeId") Long employeeId, 
                                   @Param("startDate") LocalDate startDate, 
                                   @Param("endDate") LocalDate endDate);
    
    /**
     * 特定の日付範囲で重複する申請を検索（除外ID付き）
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     * @param excludeId 除外する申請ID
     * @return 重複する申請リスト
     */
    @Query("SELECT vr FROM VacationRequest vr WHERE vr.employeeId = :employeeId " +
           "AND vr.status IN ('PENDING', 'APPROVED') " +
           "AND ((vr.startDate <= :endDate AND vr.endDate >= :startDate)) " +
           "AND vr.vacationId != :excludeId")
    List<VacationRequest> findOverlappingRequestsExcludingId(@Param("employeeId") Long employeeId,
                                                           @Param("startDate") LocalDate startDate,
                                                           @Param("endDate") LocalDate endDate,
                                                           @Param("excludeId") Long excludeId);
    
    /**
     * 従業員の未承認有給申請を検索
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     * @return 未承認の有給申請リスト
     */
    @Query("SELECT vr FROM VacationRequest vr WHERE vr.employeeId = :employeeId " +
           "AND vr.status = 'PENDING' " +
           "AND ((vr.startDate <= :endDate AND vr.endDate >= :startDate))")
    List<VacationRequest> findPendingVacationRequestsInPeriod(@Param("employeeId") Long employeeId,
                                                             @Param("startDate") LocalDate startDate,
                                                             @Param("endDate") LocalDate endDate);

    /**
     * 指定期間内の承認済み有給申請日数の合計を取得
     * @param employeeId 従業員ID
     * @param startDate 集計開始日
     * @param endDate 集計終了日
     * @return 合計日数（該当なしは0）
     */
    @Query("SELECT COALESCE(SUM(vr.days), 0) FROM VacationRequest vr WHERE vr.employeeId = :employeeId " +
           "AND vr.status = 'APPROVED' " +
           "AND vr.startDate >= :startDate AND vr.endDate <= :endDate")
    Integer sumApprovedDaysInPeriod(@Param("employeeId") Long employeeId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);
}
