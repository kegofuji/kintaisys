-- 有給休暇申請テーブル作成
CREATE TABLE vacation_requests (
  vacation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INT NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vacation_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- インデックス追加（パフォーマンス向上）
CREATE INDEX idx_vacation_employee_id ON vacation_requests(employee_id);
CREATE INDEX idx_vacation_dates ON vacation_requests(start_date, end_date);
CREATE INDEX idx_vacation_status ON vacation_requests(status);
