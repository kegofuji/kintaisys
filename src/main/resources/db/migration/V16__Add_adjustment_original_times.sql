ALTER TABLE adjustment_requests
    ADD COLUMN original_clock_in TIMESTAMP NULL AFTER new_clock_out,
    ADD COLUMN original_clock_out TIMESTAMP NULL AFTER original_clock_in;
