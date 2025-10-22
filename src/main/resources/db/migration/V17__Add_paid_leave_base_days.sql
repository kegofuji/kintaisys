ALTER TABLE employees
    ADD COLUMN paid_leave_base_days INT NOT NULL DEFAULT 10;

UPDATE employees
SET paid_leave_base_days = 10
WHERE paid_leave_base_days IS NULL;
