ALTER TABLE vacation_requests
    ADD COLUMN IF NOT EXISTS rejection_comment VARCHAR(500);
