-- 勤怠記録テーブルにsubmission_statusカラムを追加
ALTER TABLE attendance_records ADD COLUMN submission_status VARCHAR(20) DEFAULT '未申請';

-- インデックス追加
CREATE INDEX idx_attendance_records_submission_status ON attendance_records(submission_status);
