-- 勤怠記録テーブルにversionカラムを追加（楽観的ロック用）
ALTER TABLE attendance_records ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
