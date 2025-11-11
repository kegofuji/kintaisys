package com.kintai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

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
    
    // プロフィール項目
    @Column(name = "last_name")
    private String lastName;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_kana")
    private String lastKana;

    @Column(name = "first_kana")
    private String firstKana;

    @Column(name = "birthday")
    private LocalDate birthday;
    
    @Column(name = "hire_date")
    private LocalDate hireDate;
    
    @Column(name = "retirement_date")
    private LocalDate retirementDate;
    
    @Column(name = "is_active", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean isActive = true;
    
    // paid_leave_adjustment カラムは廃止（有休調整機能の廃止により）

    @Column(name = "paid_leave_base_days", nullable = false, columnDefinition = "INT DEFAULT 10")
    private Integer paidLeaveBaseDays = 10;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // デフォルトコンストラクタ
    public Employee() {
        this.isActive = true;
        this.paidLeaveBaseDays = 10;
    }
    
    // コンストラクタ
    public Employee(String employeeCode) {
        this.employeeCode = employeeCode;
        this.isActive = true;
        this.paidLeaveBaseDays = 10;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        if (isActive == null) {
            isActive = true;
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
    
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastKana() { return lastKana; }
    public void setLastKana(String lastKana) { this.lastKana = lastKana; }

    public String getFirstKana() { return firstKana; }
    public void setFirstKana(String firstKana) { this.firstKana = firstKana; }

    public LocalDate getBirthday() { return birthday; }
    public void setBirthday(LocalDate birthday) { this.birthday = birthday; }

    public LocalDate getHireDate() { return hireDate; }
    public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }

    public LocalDate getRetirementDate() { return retirementDate; }
    public void setRetirementDate(LocalDate retirementDate) { this.retirementDate = retirementDate; }

    /**
     * 退職済みかどうかを判定
     * @return 退職済みの場合true
     */
    public boolean isRetired() {
        return !isActive;
    }

    // getPaidLeaveAdjustment と setPaidLeaveAdjustment メソッドは廃止（有休調整機能の廃止により）

    public Integer getPaidLeaveBaseDays() {
        return paidLeaveBaseDays == null ? 10 : paidLeaveBaseDays;
    }

    public void setPaidLeaveBaseDays(Integer paidLeaveBaseDays) {
        this.paidLeaveBaseDays = (paidLeaveBaseDays == null || paidLeaveBaseDays < 0) ? 10 : paidLeaveBaseDays;
    }
}
