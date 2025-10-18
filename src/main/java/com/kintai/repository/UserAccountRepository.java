package com.kintai.repository;

import com.kintai.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    
    /**
     * ユーザー名でユーザーアカウントを検索
     * @param username ユーザー名
     * @return ユーザーアカウント（存在しない場合は空）
     */
    Optional<UserAccount> findByUsername(String username);
    
    /**
     * ユーザー名と有効フラグでユーザーアカウントを検索
     * @param username ユーザー名
     * @param enabled 有効フラグ
     * @return ユーザーアカウント（存在しない場合は空）
     */
    Optional<UserAccount> findByUsernameAndEnabled(String username, boolean enabled);
    
    /**
     * 社員IDでユーザーアカウントを検索
     * @param employeeId 社員ID
     * @return ユーザーアカウント（存在しない場合は空）
     */
    Optional<UserAccount> findByEmployeeId(Long employeeId);
}
