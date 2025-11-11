-- 休日関連申請テーブル
CREATE TABLE IF NOT EXISTS holiday_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  work_date DATE,
  comp_date DATE,
  transfer_holiday_date DATE,
  take_comp BOOLEAN NOT NULL DEFAULT FALSE,
  reason VARCHAR(500),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  approver_id BIGINT NULL,
  rejection_comment VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holiday_requests_emp ON holiday_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_holiday_requests_status ON holiday_requests(status);
CREATE INDEX IF NOT EXISTS idx_holiday_requests_work_date ON holiday_requests(work_date);


