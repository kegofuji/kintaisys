-- 重複した社員データをクリーンアップするマイグレーション
-- emp1, emp2の重複データ（employeeId: 12, 13）を削除

-- 1. 重複したユーザーアカウントを削除
DELETE FROM user_accounts 
WHERE username IN ('emp1', 'emp2') 
AND employee_id IN (12, 13);

-- 2. 重複した社員データを削除
DELETE FROM employees 
WHERE employee_id IN (12, 13);

-- 削除結果を確認するためのログ出力
-- これらのクエリは重複データが存在する場合のみ実行される
