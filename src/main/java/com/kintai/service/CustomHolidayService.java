package com.kintai.service;

import com.kintai.entity.CustomHoliday;
import com.kintai.repository.CustomHolidayRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * カスタム休日管理サービス
 */
@Service
@Transactional
public class CustomHolidayService {

    @Autowired
    private CustomHolidayRepository repository;

    /**
     * カスタム休日を作成
     */
    public CustomHoliday createCustomHoliday(Long employeeId, LocalDate holidayDate, String holidayType, String description, Long relatedRequestId, Long createdBy) {
        // 既存のカスタム休日があるかチェック
        Optional<CustomHoliday> existing = repository.findByEmployeeIdAndDate(employeeId, holidayDate);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("指定日には既にカスタム休日が設定されています: " + holidayDate);
        }

        CustomHoliday customHoliday = new CustomHoliday(employeeId, holidayDate, holidayType, description, relatedRequestId, createdBy);
        return repository.save(customHoliday);
    }

    /**
     * 代休を作成
     */
    public CustomHoliday createCompensatoryHoliday(Long employeeId, LocalDate holidayDate, String description, Long relatedRequestId, Long createdBy) {
        return createCustomHoliday(employeeId, holidayDate, "代休", description, relatedRequestId, createdBy);
    }

    /**
     * 振替休日を作成
     */
    public CustomHoliday createTransferHoliday(Long employeeId, LocalDate holidayDate, String description, Long relatedRequestId, Long createdBy) {
        return createCustomHoliday(employeeId, holidayDate, "振替休日", description, relatedRequestId, createdBy);
    }

    /**
     * 指定日のカスタム休日を削除
     */
    public void removeCustomHoliday(Long employeeId, LocalDate holidayDate) {
        repository.deleteByEmployeeIdAndHolidayDate(employeeId, holidayDate);
    }

    /**
     * 従業員のカスタム休日一覧を取得
     */
    @Transactional(readOnly = true)
    public List<CustomHoliday> getCustomHolidaysByEmployee(Long employeeId) {
        return repository.findByEmployeeIdOrderByHolidayDateDesc(employeeId);
    }

    /**
     * 指定期間のカスタム休日一覧を取得
     */
    @Transactional(readOnly = true)
    public List<CustomHoliday> getCustomHolidaysByDateRange(Long employeeId, LocalDate startDate, LocalDate endDate) {
        return repository.findByEmployeeIdAndDateRange(employeeId, startDate, endDate);
    }

    /**
     * 指定日のカスタム休日を取得
     */
    @Transactional(readOnly = true)
    public Optional<CustomHoliday> getCustomHolidayByDate(Long employeeId, LocalDate date) {
        return repository.findByEmployeeIdAndDate(employeeId, date);
    }

    /**
     * 指定日がカスタム休日かどうかを判定
     */
    @Transactional(readOnly = true)
    public boolean isCustomHoliday(Long employeeId, LocalDate date) {
        return repository.findByEmployeeIdAndDate(employeeId, date).isPresent();
    }

    /**
     * 関連申請IDでカスタム休日を取得
     */
    @Transactional(readOnly = true)
    public Optional<CustomHoliday> getCustomHolidayByRelatedRequest(Long relatedRequestId) {
        return repository.findByRelatedRequestId(relatedRequestId);
    }
}
