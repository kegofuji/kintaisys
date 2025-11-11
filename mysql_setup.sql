-- MySQL 8.0 初期設定SQL
-- 以下のコマンドで実行: mysql -u root -p < mysql_setup.sql

-- 1. データベースの作成
CREATE DATABASE IF NOT EXISTS kintai 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- 2. rootユーザーのパスワード設定（既に設定済みの場合はスキップ）
-- ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_mysql_password_here';

-- 3. rootユーザーにkintaiデータベースへの全権限を付与
GRANT ALL PRIVILEGES ON kintai.* TO 'root'@'localhost';

-- 4. 権限の適用
FLUSH PRIVILEGES;

-- 5. データベースの確認
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'root';
SHOW GRANTS FOR 'root'@'localhost';
