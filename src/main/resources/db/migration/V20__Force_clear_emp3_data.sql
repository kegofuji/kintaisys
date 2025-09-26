-- 新規作成された社員（emp3以降）の勤怠データを強制的にクリアするマイグレーション
-- 新規作成された社員には勤怠データが存在しないのが正常

-- 1. emp3以降の社員の勤怠記録を削除
DELETE FROM attendance_records 
WHERE employee_id IN (
    SELECT ua.employee_id 
    FROM user_accounts ua 
    WHERE (ua.username LIKE 'emp3%' OR ua.username LIKE 'emp4%' OR ua.username LIKE 'emp5%' 
           OR ua.username LIKE 'emp6%' OR ua.username LIKE 'emp7%' OR ua.username LIKE 'emp8%' 
           OR ua.username LIKE 'emp9%' OR ua.username REGEXP '^emp[1-9][0-9]+$')
);

-- 2. emp3以降の社員の打刻修正申請を削除
DELETE FROM adjustment_requests 
WHERE employee_id IN (
    SELECT ua.employee_id 
    FROM user_accounts ua 
    WHERE (ua.username LIKE 'emp3%' OR ua.username LIKE 'emp4%' OR ua.username LIKE 'emp5%' 
           OR ua.username LIKE 'emp6%' OR ua.username LIKE 'emp7%' OR ua.username LIKE 'emp8%' 
           OR ua.username LIKE 'emp9%' OR ua.username REGEXP '^emp[1-9][0-9]+$')
);

-- 3. emp3以降の社員の有給申請を削除
DELETE FROM vacation_requests 
WHERE employee_id IN (
    SELECT ua.employee_id 
    FROM user_accounts ua 
    WHERE (ua.username LIKE 'emp3%' OR ua.username LIKE 'emp4%' OR ua.username LIKE 'emp5%' 
           OR ua.username LIKE 'emp6%' OR ua.username LIKE 'emp7%' OR ua.username LIKE 'emp8%' 
           OR ua.username LIKE 'emp9%' OR ua.username REGEXP '^emp[1-9][0-9]+$')
);

-- 4. 削除結果をログに出力
SELECT '新規社員（emp3以降）の勤怠データをクリアしました' as message;
