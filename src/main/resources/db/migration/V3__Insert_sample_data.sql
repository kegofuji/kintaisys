-- Idempotent sample data insertion for employees and user_accounts
-- This script avoids duplicate key errors by inserting only when the key does not already exist.
-- Works for H2 and MySQL with the SELECT ... WHERE NOT EXISTS pattern.

INSERT INTO employees (created_at, employee_code, is_active, updated_at)
SELECT CURRENT_TIMESTAMP, 'EMP001', TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP001');

-- user_accountsデータはV5で作成されるテーブルに挿入するため、ここでは省略
