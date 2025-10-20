-- 不足しているカラムを追加
ALTER TABLE employees ADD COLUMN last_name VARCHAR(50) NOT NULL DEFAULT '未設定';
ALTER TABLE employees ADD COLUMN first_name VARCHAR(50) NOT NULL DEFAULT '未設定';
ALTER TABLE employees ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT 'unknown@company.com';
ALTER TABLE employees ADD COLUMN hire_date DATE NOT NULL DEFAULT (CURRENT_DATE);

-- 既存データの更新
UPDATE employees SET 
    last_name = '未設定',
    first_name = '未設定',
    email = CONCAT(employee_code, '@company.com'),
    hire_date = CURRENT_DATE
WHERE last_name IS NULL OR first_name IS NULL OR email IS NULL OR hire_date IS NULL;

-- ユニーク制約を追加
ALTER TABLE employees ADD CONSTRAINT uk_employees_email UNIQUE (email);
