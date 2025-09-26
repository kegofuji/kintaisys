package com.kintai.entity;

/**
 * 勤怠申請ステータス
 */
public enum SubmissionStatus {
    NOT_SUBMITTED("未申請"),
    SUBMITTED("申請中"),
    APPROVED("承認済"),
    REJECTED("却下");
    
    private final String displayName;
    
    SubmissionStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
