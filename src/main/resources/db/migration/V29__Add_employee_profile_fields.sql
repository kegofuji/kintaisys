-- 社員プロフィール項目の追加
-- last_name, first_name, last_kana, first_kana, birthday

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS last_kana VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS first_kana VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS birthday DATE NULL;


-- EMP001（emp1）の氏名初期値を設定（未設定の場合のみ）
UPDATE employees
SET last_name = COALESCE(NULLIF(last_name, ''), 'テスト'),
    first_name = COALESCE(NULLIF(first_name, ''), '')
WHERE employee_code = 'EMP001';

