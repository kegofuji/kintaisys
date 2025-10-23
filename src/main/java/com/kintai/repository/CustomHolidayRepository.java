package com.kintai.repository;

import com.kintai.entity.CustomHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * カスタム休日リポジトリ
 */
@Repository
public interface CustomHolidayRepository extends JpaRepository<CustomHoliday, Long> {

    /**
     * 従業員のカスタム休日一覧を取得
     */
    List<CustomHoliday> findByEmployeeIdOrderByHolidayDateDesc(Long employeeId);

    /**
     * 指定日のカスタム休日を取得
     */
    @Query("SELECT ch FROM CustomHoliday ch WHERE ch.employeeId = :employeeId AND ch.holidayDate = :date")
    Optional<CustomHoliday> findByEmployeeIdAndDate(@Param("employeeId") Long employeeId, @Param("date") LocalDate date);

    /**
     * 指定期間のカスタム休日一覧を取得
     */
    @Query("SELECT ch FROM CustomHoliday ch WHERE ch.employeeId = :employeeId AND ch.holidayDate BETWEEN :startDate AND :endDate ORDER BY ch.holidayDate")
    List<CustomHoliday> findByEmployeeIdAndDateRange(@Param("employeeId") Long employeeId, 
                                                   @Param("startDate") LocalDate startDate, 
                                                   @Param("endDate") LocalDate endDate);

    /**
     * 関連申請IDでカスタム休日を取得
     */
    Optional<CustomHoliday> findByRelatedRequestId(Long relatedRequestId);

    /**
     * 指定日のカスタム休日を削除
     */
    void deleteByEmployeeIdAndHolidayDate(Long employeeId, LocalDate holidayDate);
}
