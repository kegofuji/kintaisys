package com.kintai.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * カスタム休日エンティティ
 * 代休・振替休日などの社内で設定する休日を管理
 */
@Entity
@Table(name = "custom_holidays",
        indexes = {
                @Index(name = "idx_custom_holidays_employee", columnList = "employee_id"),
                @Index(name = "idx_custom_holidays_date", columnList = "holiday_date")
        })
public class CustomHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(name = "holiday_type", nullable = false, length = 32)
    private String holidayType; // "代休", "振替休日" など

    @Column(name = "description", length = 200)
    private String description;

    @Column(name = "related_request_id")
    private Long relatedRequestId; // 関連する休日出勤・振替申請のID

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    public CustomHoliday() {
    }

    public CustomHoliday(Long employeeId, LocalDate holidayDate, String holidayType, String description, Long relatedRequestId, Long createdBy) {
        this.employeeId = employeeId;
        this.holidayDate = holidayDate;
        this.holidayType = holidayType;
        this.description = description;
        this.relatedRequestId = relatedRequestId;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // ゲッター・セッター
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public LocalDate getHolidayDate() {
        return holidayDate;
    }

    public void setHolidayDate(LocalDate holidayDate) {
        this.holidayDate = holidayDate;
    }

    public String getHolidayType() {
        return holidayType;
    }

    public void setHolidayType(String holidayType) {
        this.holidayType = holidayType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getRelatedRequestId() {
        return relatedRequestId;
    }

    public void setRelatedRequestId(Long relatedRequestId) {
        this.relatedRequestId = relatedRequestId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }
}
