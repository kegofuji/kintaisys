package com.kintai.service;

import com.kintai.entity.UserAccount;
import com.kintai.entity.AdminAccount;
import com.kintai.entity.Employee;
import com.kintai.repository.UserAccountRepository;
import com.kintai.repository.AdminAccountRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.PasswordValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {
    
    @Autowired
    private UserAccountRepository userAccountRepository;
    
    @Autowired
    private AdminAccountRepository adminAccountRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private PasswordValidator passwordValidator;
    
    /**
     * ユーザー認証（従業員）
     * @param username ユーザー名
     * @param password パスワード
     * @return 認証成功時はユーザーアカウント、失敗時は空
     */
    public Optional<UserAccount> authenticateEmployee(String username, String password) {
        Optional<UserAccount> userOpt = userAccountRepository.findByUsernameAndEnabled(username, true);
        
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            
            // 退職者チェック
            Optional<Employee> employeeOpt = employeeRepository.findByEmployeeId(user.getEmployeeId());
            if (employeeOpt.isPresent() && !employeeOpt.get().getIsActive()) {
                // 退職者の場合は認証失敗
                return Optional.empty();
            }
            
            if (passwordEncoder.matches(password, user.getPassword())) {
                return Optional.of(user);
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * 管理者認証
     * @param username ユーザー名
     * @param password パスワード
     * @return 認証成功時は管理者アカウント、失敗時は空
     */
    public Optional<AdminAccount> authenticateAdmin(String username, String password) {
        Optional<AdminAccount> adminOpt = adminAccountRepository.findByUsername(username);
        
        if (adminOpt.isPresent()) {
            AdminAccount admin = adminOpt.get();
            if (admin.getEnabled() && passwordEncoder.matches(password, admin.getPassword())) {
                return Optional.of(admin);
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * 退職者チェック
     * @param username ユーザー名
     * @return 退職者の場合true
     */
    public boolean isRetiredEmployee(String username) {
        Optional<UserAccount> userOpt = userAccountRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            Optional<Employee> employeeOpt = employeeRepository.findByEmployeeId(user.getEmployeeId());
            if (employeeOpt.isPresent()) {
                Employee employee = employeeOpt.get();
                // isActiveがfalseの場合（退職済み）をチェック
                return !employee.getIsActive();
            }
        }
        return false;
    }
    
    /**
     * 統合認証（従業員または管理者）
     * @param username ユーザー名
     * @param password パスワード
     * @return 認証結果（従業員、管理者、または失敗）
     */
    public AuthResult authenticate(String username, String password) {
        // まず管理者をチェック
        Optional<AdminAccount> adminOpt = authenticateAdmin(username, password);
        if (adminOpt.isPresent()) {
            return new AuthResult(adminOpt.get(), null, "ADMIN");
        }
        
        // 退職者チェック
        if (isRetiredEmployee(username)) {
            return new AuthResult(null, null, "RETIRED");
        }
        
        // 次に従業員をチェック
        Optional<UserAccount> userOpt = authenticateEmployee(username, password);
        if (userOpt.isPresent()) {
            return new AuthResult(null, userOpt.get(), "EMPLOYEE");
        }
        
        return new AuthResult(null, null, "FAILED");
    }
    
    /**
     * 認証結果クラス
     */
    public static class AuthResult {
        private final AdminAccount admin;
        private final UserAccount employee;
        private final String role;
        
        public AuthResult(AdminAccount admin, UserAccount employee, String role) {
            this.admin = admin;
            this.employee = employee;
            this.role = role;
        }
        
        public AdminAccount getAdmin() { return admin; }
        public UserAccount getEmployee() { return employee; }
        public String getRole() { return role; }
        public boolean isSuccess() { return !"FAILED".equals(role); }
        public Long getUserId() { 
            return admin != null ? admin.getAdminId() : (employee != null ? employee.getEmployeeId() : null); 
        }
    }
    
    /**
     * ユーザー名でユーザーを検索
     * @param username ユーザー名
     * @return ユーザーアカウント（存在しない場合は空）
     */
    public Optional<UserAccount> findByUsername(String username) {
        return userAccountRepository.findByUsernameAndEnabled(username, true);
    }
    
    /**
     * 社員IDでユーザーを検索
     * @param employeeId 社員ID
     * @return ユーザーアカウント（存在しない場合は空）
     */
    public Optional<UserAccount> findByEmployeeId(Long employeeId) {
        return userAccountRepository.findByEmployeeId(employeeId);
    }
    
    /**
     * パスワードをエンコード
     * @param rawPassword 生のパスワード
     * @return エンコードされたパスワード
     */
    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }
    
    /**
     * パスワードを検証
     * @param password パスワード
     * @param employeeCode 社員コード
     * @return 検証結果
     */
    public PasswordValidator.PasswordValidationResult validatePassword(String password, String employeeCode) {
        return passwordValidator.validate(password, employeeCode);
    }
    
    /**
     * ユーザー登録
     * @param username ユーザー名
     * @param password パスワード
     * @param employeeId 従業員ID
     * @param role ロール
     * @return 登録されたユーザーアカウント
     */
    @Transactional
    public UserAccount registerUser(String username, String password, Long employeeId, String role) {
        // ユーザー名の重複チェック
        if (userAccountRepository.findByUsernameAndEnabled(username, true).isPresent()) {
            throw new IllegalArgumentException("ユーザー名が既に使用されています");
        }
        
        // 従業員IDの重複チェック
        if (userAccountRepository.findByEmployeeId(employeeId).isPresent()) {
            throw new IllegalArgumentException("この従業員IDは既に登録されています");
        }
        
        // パスワードの最小長チェックのみ（強度チェックは撤廃）
        if (password == null || password.length() < 4) {
            throw new IllegalArgumentException("パスワードは4文字以上で入力してください");
        }
        
        // ユーザーアカウント作成
        UserAccount userAccount = new UserAccount();
        userAccount.setUsername(username);
        userAccount.setPassword(passwordEncoder.encode(password));
        userAccount.setEmployeeId(employeeId);
        userAccount.setRole(UserAccount.UserRole.valueOf(role.toUpperCase()));
        userAccount.setEnabled(true);
        
        return userAccountRepository.save(userAccount);
    }
}
