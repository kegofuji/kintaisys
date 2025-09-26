-- 勤怠修正申請テーブル作成
CREATE TABLE adjustment_requests (
    adjustment_request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    target_date DATE NOT NULL,
    new_clock_in TIMESTAMP NULL,
    new_clock_out TIMESTAMP NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- インデックス作成
CREATE INDEX idx_adjustment_requests_employee_id ON adjustment_requests(employee_id);
CREATE INDEX idx_adjustment_requests_target_date ON adjustment_requests(target_date);
CREATE INDEX idx_adjustment_requests_status ON adjustment_requests(status);
CREATE INDEX idx_adjustment_requests_created_at ON adjustment_requests(created_at);
