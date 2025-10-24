-- EMP001（emp1）の氏名を「テスト」に設定
-- 既に別名が入っていても上書きする
UPDATE employees
SET last_name = 'テスト',
    first_name = ''
WHERE employee_code = 'EMP001';


