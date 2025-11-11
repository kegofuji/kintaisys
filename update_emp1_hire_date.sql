-- emp1の入社日を2025/8/1に設定
UPDATE employees
SET hire_date = '2025-08-01'
WHERE employee_code = 'EMP001' AND (hire_date IS NULL OR hire_date != '2025-08-01');

