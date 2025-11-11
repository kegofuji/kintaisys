-- 入社日と退職日のカラムを追加
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS hire_date DATE NULL,
    ADD COLUMN IF NOT EXISTS retirement_date DATE NULL;

-- 既存データの入社日を設定（created_atの日付を設定）
UPDATE employees
SET hire_date = DATE(created_at)
WHERE hire_date IS NULL;

