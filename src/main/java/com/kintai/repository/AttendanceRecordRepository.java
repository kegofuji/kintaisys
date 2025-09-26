package com.kintai.repository;

import com.kintai.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 勤怠記録リポジトリ
 */
@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    
    /**
     * 従業員IDと勤怠日で勤怠記録を検索
     * @param employeeId 従業員ID
     * @param attendanceDate 勤怠日
     * @return 勤怠記録（存在しない場合は空）
     */
    Optional<AttendanceRecord> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);
    
    /**
     * 編集可能な勤怠記録を検索（確定済みでないもの）
     * @param employeeId 従業員ID
     * @param date 勤怠日
     * @return 編集可能な勤怠記録（存在しない場合は空）
     */
    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.employeeId = :employeeId AND ar.attendanceDate = :date AND ar.attendanceFixedFlag = false")
    Optional<AttendanceRecord> findEditableRecord(@Param("employeeId") Long employeeId, @Param("date") LocalDate date);
    
    /**
     * 従業員IDと勤怠日で出勤済みかチェック
     * @param employeeId 従業員ID
     * @param attendanceDate 勤怠日
     * @return 出勤済みの場合true
     */
    boolean existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(Long employeeId, LocalDate attendanceDate);
    
    /**
     * 従業員IDと勤怠日で退勤済みかチェック
     * @param employeeId 従業員ID
     * @param attendanceDate 勤怠日
     * @return 退勤済みの場合true
     */
    boolean existsByEmployeeIdAndAttendanceDateAndClockOutTimeIsNotNull(Long employeeId, LocalDate attendanceDate);
    
    /**
     * 従業員IDと年月で勤怠記録を検索
     * @param employeeId 従業員ID
     * @param yearMonth 年月（yyyy-MM形式）
     * @return 該当月の勤怠記録リスト
     */
    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.employeeId = :empId AND YEAR(ar.attendanceDate) = :year AND MONTH(ar.attendanceDate) = :month")
    List<AttendanceRecord> findByEmployeeAndMonth(@Param("empId") Long empId, @Param("year") int year, @Param("month") int month);
    
    /**
     * 従業員IDと日付範囲で勤怠記録を検索（日付降順）
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     * @return 勤怠記録リスト（日付降順）
     */
    List<AttendanceRecord> findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(Long employeeId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 従業員IDで勤怠記録を検索（日付降順）
     * @param employeeId 従業員ID
     * @return 勤怠記録リスト（日付降順）
     */
    List<AttendanceRecord> findByEmployeeIdOrderByAttendanceDateDesc(Long employeeId);
}
