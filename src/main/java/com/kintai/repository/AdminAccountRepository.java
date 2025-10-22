package com.kintai.repository;

import com.kintai.entity.AdminAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 管理者アカウントリポジトリ
 */
@Repository
public interface AdminAccountRepository extends JpaRepository<AdminAccount, Long> {
    
    /**
     * ユーザー名で管理者アカウントを検索
     * @param username ユーザー名
     * @return 管理者アカウント（存在しない場合は空）
     */
    Optional<AdminAccount> findByUsername(String username);
    
    /**
     * 管理者IDで管理者アカウントを検索
     * @param adminId 管理者ID
     * @return 管理者アカウント（存在しない場合は空）
     */
    Optional<AdminAccount> findByAdminId(Long adminId);
}
