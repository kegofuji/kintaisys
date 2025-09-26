-- 有給残高の調整用カラムを従業員テーブルに追加（履歴は持たない簡易方式）
ALTER TABLE employees ADD COLUMN paid_leave_adjustment INT NOT NULL DEFAULT 0;
