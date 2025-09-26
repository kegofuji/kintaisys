-- 管理者サンプルデータを更新（削除されたカラムを除く）
-- 既存のサンプルデータを削除して再作成

DELETE FROM admin_accounts WHERE username = 'admin';
DELETE FROM admins WHERE admin_code = 'ADM001';

-- 管理者データを再挿入（既存のカラム構造に合わせる）
INSERT INTO admins (admin_id, admin_code, first_name, last_name, email, hire_date, is_active, created_at, updated_at)
SELECT 1, 'ADM001', 'admin', 'admin', 'admin@example.com', '2020-04-01', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE admin_code = 'ADM001');

-- 管理者アカウントを再挿入
INSERT INTO admin_accounts (admin_id, enabled, password, role, username)
SELECT a.admin_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'ADMIN', 'admin'
FROM admins a
WHERE a.admin_code = 'ADM001' AND NOT EXISTS (SELECT 1 FROM admin_accounts aa WHERE aa.username = 'admin');
