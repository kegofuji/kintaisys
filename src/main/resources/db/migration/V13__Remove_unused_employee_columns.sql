-- 従業員テーブルから不要なカラムを削除
-- last_name, first_name, email, hire_date, retirement_date を廃止

-- インデックスを先に削除
DROP INDEX IF EXISTS idx_employees_email ON employees;

-- ユニーク制約を削除
ALTER TABLE employees DROP CONSTRAINT IF EXISTS uk_employees_email;

-- カラムを削除
ALTER TABLE employees DROP COLUMN IF EXISTS last_name;
ALTER TABLE employees DROP COLUMN IF EXISTS first_name;
ALTER TABLE employees DROP COLUMN IF EXISTS email;
ALTER TABLE employees DROP COLUMN IF EXISTS hire_date;
ALTER TABLE employees DROP COLUMN IF EXISTS retirement_date;
