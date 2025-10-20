ALTER TABLE attendance_records
    ADD COLUMN break_minutes INT NOT NULL DEFAULT 0;

UPDATE attendance_records
SET break_minutes = CASE
    WHEN clock_in_time IS NULL OR clock_out_time IS NULL THEN 0
    WHEN TIMESTAMPDIFF(MINUTE, clock_in_time, clock_out_time) <= 360 THEN 0
    WHEN TIMESTAMPDIFF(MINUTE, clock_in_time, clock_out_time) <= 480 THEN 45
    ELSE 60
END;
