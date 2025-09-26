-- emp3の勤怠データを完全にクリアするマイグレーション
-- emp3は管理者画面で新規作成されたアカウントなので、勤怠データは存在しないのが正常

-- emp3のemployee_idを取得
-- emp3のユーザーアカウントからemployee_idを取得して、そのIDに関連する全ての勤怠データを削除

-- 1. emp3の勤怠記録を削除
DELETE FROM attendance_records 
WHERE employee_id = (
    SELECT ua.employee_id 
    FROM user_accounts ua 
    WHERE ua.username = 'emp3'
);

-- 2. emp3の打刻修正申請を削除
DELETE FROM adjustment_requests 
WHERE employee_id = (
    SELECT ua.employee_id 
    FROM user_accounts ua 
    WHERE ua.username = 'emp3'
);

-- 3. emp3の有給申請を削除
DELETE FROM vacation_requests 
WHERE employee_id = (
    SELECT ua.employee_id 
    FROM user_accounts ua 
    WHERE ua.username = 'emp3'
);

-- 削除結果を確認するためのログ出力（実際の削除は行われない）
-- これらのクエリはemp3が存在する場合のみ実行される
