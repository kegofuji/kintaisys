-- Ensure no attendance metrics store NULL values after adjustments
UPDATE attendance_records SET late_minutes = 0 WHERE late_minutes IS NULL;
UPDATE attendance_records SET early_leave_minutes = 0 WHERE early_leave_minutes IS NULL;
UPDATE attendance_records SET overtime_minutes = 0 WHERE overtime_minutes IS NULL;
UPDATE attendance_records SET night_shift_minutes = 0 WHERE night_shift_minutes IS NULL;
