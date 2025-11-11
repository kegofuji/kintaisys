-- カスタム休日テーブル作成
CREATE TABLE custom_holidays (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(32) NOT NULL,
    description VARCHAR(200),
    related_request_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    INDEX idx_custom_holidays_employee (employee_id),
    INDEX idx_custom_holidays_date (holiday_date),
    INDEX idx_custom_holidays_related_request (related_request_id)
);

-- コメント追加
ALTER TABLE custom_holidays COMMENT = 'カスタム休日管理テーブル（代休・振替休日など）';
ALTER TABLE custom_holidays MODIFY COLUMN employee_id BIGINT NOT NULL COMMENT '従業員ID';
ALTER TABLE custom_holidays MODIFY COLUMN holiday_date DATE NOT NULL COMMENT '休日';
ALTER TABLE custom_holidays MODIFY COLUMN holiday_type VARCHAR(32) NOT NULL COMMENT '休日種別（代休、振替休日など）';
ALTER TABLE custom_holidays MODIFY COLUMN description VARCHAR(200) COMMENT '説明';
ALTER TABLE custom_holidays MODIFY COLUMN related_request_id BIGINT COMMENT '関連する休日出勤・振替申請のID';
ALTER TABLE custom_holidays MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時';
ALTER TABLE custom_holidays MODIFY COLUMN created_by BIGINT COMMENT '作成者ID';
