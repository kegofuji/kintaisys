package com.kintai.entity;

/**
 * 勤怠ステータス列挙型
 */
public enum AttendanceStatus {
    NORMAL("正常"),
    LATE("遅刻"),
    EARLY_LEAVE("早退"),
    LATE_AND_EARLY_LEAVE("遅刻・早退"),
    OVERTIME("残業"),
    NIGHT_SHIFT("深夜勤務"),
    ABSENT("欠勤");
    
    private final String displayName;
    
    AttendanceStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
