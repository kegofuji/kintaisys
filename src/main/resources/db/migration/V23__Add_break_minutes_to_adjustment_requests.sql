ALTER TABLE adjustment_requests
    ADD COLUMN new_break_minutes INT NOT NULL DEFAULT 0;

ALTER TABLE adjustment_requests
    ADD COLUMN original_break_minutes INT;

UPDATE adjustment_requests
SET new_break_minutes = 0
WHERE new_break_minutes IS NULL;
