-- 月末申請機能廃止に伴うsubmission_statusカラムの削除
ALTER TABLE attendance_records DROP COLUMN submission_status;
