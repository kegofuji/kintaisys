-- 既存の勤怠記録のversionフィールドを0に初期化
UPDATE attendance_records SET version = 0 WHERE version IS NULL;
