-- 管理者テーブル作成
CREATE TABLE admins (
    admin_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_code VARCHAR(20) NOT NULL UNIQUE,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    hire_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_admins_admin_code ON admins(admin_code);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- 管理者アカウントテーブル作成
CREATE TABLE admin_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    admin_id BIGINT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id)
);

-- サンプル管理者データ挿入
INSERT INTO admins (admin_id, admin_code, first_name, last_name, email, hire_date, is_active, created_at, updated_at)
SELECT 1, 'ADM001', 'admin', 'admin', 'admin@example.com', '2020-04-01', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE admin_code = 'ADM001');

-- 管理者アカウント追加
INSERT INTO admin_accounts (admin_id, enabled, password, role, username)
SELECT a.admin_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'ADMIN', 'admin'
FROM admins a
WHERE a.admin_code = 'ADM001' AND NOT EXISTS (SELECT 1 FROM admin_accounts aa WHERE aa.username = 'admin');
