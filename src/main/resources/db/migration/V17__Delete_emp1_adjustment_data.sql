-- emp1の打刻修正申請データを削除
-- 対象日: 2025-09-24, 理由: 忘れ のデータを削除

DELETE FROM adjustment_requests 
WHERE employee_id = (
    SELECT e.employee_id 
    FROM employees e 
    JOIN user_accounts ua ON e.employee_id = ua.employee_id 
    WHERE ua.username = 'emp1'
) 
AND target_date = '2025-09-24' 
AND reason = '忘れ';
