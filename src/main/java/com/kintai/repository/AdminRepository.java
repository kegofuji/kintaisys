package com.kintai.repository;

import com.kintai.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 管理者リポジトリ
 */
@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    
    /**
     * 管理者IDで管理者を検索
     * @param adminId 管理者ID
     * @return 管理者（存在しない場合は空）
     */
    Optional<Admin> findByAdminId(Long adminId);
    
    /**
     * 管理者コードで管理者を検索
     * @param adminCode 管理者コード
     * @return 管理者（存在しない場合は空）
     */
    Optional<Admin> findByAdminCode(String adminCode);
    
}
