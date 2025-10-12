package com.kintai.repository;

import com.kintai.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 従業員リポジトリ
 */
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    
    /**
     * 従業員IDで従業員を検索
     * @param employeeId 従業員ID
     * @return 従業員（存在しない場合は空）
     */
    Optional<Employee> findByEmployeeId(Long employeeId);
    
    /**
     * 社員コードで従業員を検索
     * @param employeeCode 社員コード
     * @return 従業員（存在しない場合は空）
     */
    Optional<Employee> findByEmployeeCode(String employeeCode);
    
    
    /**
     * 社員コードで在職中の従業員を検索
     * @param employeeCode 社員コード
     * @return 在職中の従業員（存在しない場合は空）
     */
    Optional<Employee> findByEmployeeCodeAndIsActiveTrue(String employeeCode);
}
