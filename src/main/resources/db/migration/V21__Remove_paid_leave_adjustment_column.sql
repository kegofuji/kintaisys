-- 有休調整機能の廃止によりpaid_leave_adjustmentカラムを削除
ALTER TABLE employees DROP COLUMN paid_leave_adjustment;
