package com.kintai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 従業員エンティティ
 */
@Entity
@Table(name = "employees")
public class Employee {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;
    
    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;
    
    
    @Column(name = "is_active", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean isActive = true;
    
    @Column(name = "paid_leave_adjustment", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer paidLeaveAdjustment = 0;

    @Column(name = "paid_leave_base_days", nullable = false, columnDefinition = "INT DEFAULT 10")
    private Integer paidLeaveBaseDays = 10;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // デフォルトコンストラクタ
    public Employee() {
        this.isActive = true;
        this.paidLeaveAdjustment = 0;
        this.paidLeaveBaseDays = 10;
    }
    
    // コンストラクタ
    public Employee(String employeeCode) {
        this.employeeCode = employeeCode;
        this.isActive = true;
        this.paidLeaveAdjustment = 0;
        this.paidLeaveBaseDays = 10;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        if (isActive == null) {
            isActive = true;
        }
        if (paidLeaveAdjustment == null) {
            paidLeaveAdjustment = 0;
        }
        if (paidLeaveBaseDays == null) {
            paidLeaveBaseDays = 10;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // ゲッター・セッター
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public String getEmployeeCode() {
        return employeeCode;
    }
    
    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }
    
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    /**
     * 退職済みかどうかを判定
     * @return 退職済みの場合true
     */
    public boolean isRetired() {
        return !isActive;
    }

    public Integer getPaidLeaveAdjustment() {
        return paidLeaveAdjustment == null ? 0 : paidLeaveAdjustment;
    }

    public void setPaidLeaveAdjustment(Integer paidLeaveAdjustment) {
        this.paidLeaveAdjustment = paidLeaveAdjustment == null ? 0 : paidLeaveAdjustment;
    }

    public Integer getPaidLeaveBaseDays() {
        return paidLeaveBaseDays == null ? 10 : paidLeaveBaseDays;
    }

    public void setPaidLeaveBaseDays(Integer paidLeaveBaseDays) {
        this.paidLeaveBaseDays = (paidLeaveBaseDays == null || paidLeaveBaseDays < 0) ? 10 : paidLeaveBaseDays;
    }
}
