-- 打刻修正申請に承認/却下の監査項目と却下コメントを追加
ALTER TABLE adjustment_requests ADD COLUMN approved_by_employee_id BIGINT NULL;
ALTER TABLE adjustment_requests ADD COLUMN approved_at TIMESTAMP NULL;
ALTER TABLE adjustment_requests ADD COLUMN rejected_by_employee_id BIGINT NULL;
ALTER TABLE adjustment_requests ADD COLUMN rejected_at TIMESTAMP NULL;
ALTER TABLE adjustment_requests ADD COLUMN rejection_comment VARCHAR(500) NULL;

-- インデックス（検索最適化）
-- idx_adjustment_requests_statusは V6 で既に作成済み
CREATE INDEX idx_adjustment_requests_employee_date ON adjustment_requests(employee_id, target_date);


