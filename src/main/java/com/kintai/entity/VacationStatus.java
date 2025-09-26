package com.kintai.entity;

/**
 * 有給休暇申請ステータス
 */
public enum VacationStatus {
    PENDING("申請中"),
    APPROVED("承認"),
    REJECTED("却下"),
    CANCELLED("取消");
    
    private final String displayName;
    
    VacationStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
