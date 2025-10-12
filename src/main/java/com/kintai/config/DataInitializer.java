package com.kintai.config;

import com.kintai.entity.Employee;
import com.kintai.entity.UserAccount;
import com.kintai.entity.Admin;
import com.kintai.entity.AdminAccount;
import com.kintai.entity.LeaveBalance;
import com.kintai.entity.LeaveType;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.UserAccountRepository;
import com.kintai.repository.AdminRepository;
import com.kintai.repository.AdminAccountRepository;
import com.kintai.repository.LeaveBalanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@Profile("!test")
public class DataInitializer {
    
    @Autowired
    private UserAccountRepository userAccountRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private AdminRepository adminRepository;
    
    @Autowired
    private AdminAccountRepository adminAccountRepository;
    
    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @PostConstruct
    public void initData() {
        try {
            System.out.println("DataInitializer: Starting data initialization...");
            // 既存のデータをクリア（外部キー制約があるため、依存関係を考慮して削除）
            try {
                leaveBalanceRepository.deleteAll(); // LeaveBalanceを最初に削除
                userAccountRepository.deleteAll();
                adminAccountRepository.deleteAll();
                adminRepository.deleteAll();
                employeeRepository.deleteAll();
                System.out.println("DataInitializer: Cleared existing data");
            } catch (Exception e) {
                System.out.println("DataInitializer: Could not clear existing data (may have dependencies): " + e.getMessage());
                // データクリアに失敗しても続行
            }
        
        // emp1用の従業員データを作成（employeeId=1）
        if (!employeeRepository.existsById(1L)) {
            Employee emp1Employee = new Employee("EMP001");
            emp1Employee.setEmployeeId(1L);
            emp1Employee.setIsActive(true);
            Employee savedEmp1 = employeeRepository.save(emp1Employee);
            System.out.println("Created emp1 employee with ID: " + savedEmp1.getEmployeeId());
        } else {
            System.out.println("emp1 employee already exists");
        }
        
        // emp1ユーザーアカウントを作成
        if (!userAccountRepository.findByUsername("emp1").isPresent()) {
            UserAccount emp1 = new UserAccount();
            emp1.setUsername("emp1");
            emp1.setPassword(passwordEncoder.encode("pass"));
            emp1.setRole(UserAccount.UserRole.EMPLOYEE);
            emp1.setEmployeeId(1L);
            emp1.setEnabled(true);
            userAccountRepository.save(emp1);
            System.out.println("Created emp1 user with employeeId: 1");
        } else {
            System.out.println("emp1 user already exists");
        }
        
        // emp2用の従業員データを作成（employeeId=2、退職済み）
        if (!employeeRepository.existsById(2L)) {
            Employee emp2Employee = new Employee("EMP002");
            emp2Employee.setEmployeeId(2L);
            emp2Employee.setIsActive(false); // 退職済み
            Employee savedEmp2 = employeeRepository.save(emp2Employee);
            System.out.println("Created emp2 employee with ID: " + savedEmp2.getEmployeeId());
        } else {
            System.out.println("emp2 employee already exists");
        }
        
        // emp2ユーザーアカウントを作成
        if (!userAccountRepository.findByUsername("emp2").isPresent()) {
            UserAccount emp2 = new UserAccount();
            emp2.setUsername("emp2");
            emp2.setPassword(passwordEncoder.encode("pass"));
            emp2.setRole(UserAccount.UserRole.EMPLOYEE);
            emp2.setEmployeeId(2L);
            emp2.setEnabled(true); // 認証は可能だが、退職者チェックで拒否される
            userAccountRepository.save(emp2);
            System.out.println("Created emp2 user with employeeId: 2");
        } else {
            System.out.println("emp2 user already exists");
        }
        
        // admin用の管理者データを作成（adminId=1）
        Admin adminData = new Admin("ADM001");
        adminData.setAdminId(1L);
        adminData.setIsActive(true);
        Admin savedAdmin = adminRepository.save(adminData);
        if (savedAdmin == null) {
            System.err.println("DataInitializer: Failed to save admin data");
            return;
        }
        System.out.println("Created admin data with ID: " + savedAdmin.getAdminId());
        
        // adminアカウントを作成
        AdminAccount admin = new AdminAccount();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("pass"));
        admin.setRole(AdminAccount.UserRole.ADMIN);
        admin.setAdminId(savedAdmin.getAdminId());
        admin.setEnabled(true);
        adminAccountRepository.save(admin);
        System.out.println("Created admin account with adminId: " + savedAdmin.getAdminId());
        
        // 休暇残数の初期化
        initializeLeaveBalances();
        
        System.out.println("DataInitializer: Data initialization completed successfully");
        } catch (Exception e) {
            System.err.println("DataInitializer: Error during data initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 休暇残数の初期化
     */
    private void initializeLeaveBalances() {
        try {
            System.out.println("DataInitializer: Initializing leave balances...");
            
            // emp1とemp2の両方に対して休暇残数を初期化
            Long[] employeeIds = {1L, 2L};
            
            for (Long employeeId : employeeIds) {
                // 各従業員に対してすべての休暇種別の残数レコードを作成（既存のものも更新）
                for (LeaveType leaveType : LeaveType.values()) {
                    LeaveBalance balance;
                    // 既存のレコードがあるかチェック
                    if (leaveBalanceRepository.findByEmployeeIdAndLeaveType(employeeId, leaveType).isPresent()) {
                        // 既存のレコードを取得
                        balance = leaveBalanceRepository.findByEmployeeIdAndLeaveType(employeeId, leaveType).get();
                        System.out.println("Updating existing leave balance for employee " + employeeId + ", type " + leaveType);
                    } else {
                        // 新しいレコードを作成
                        balance = new LeaveBalance(employeeId, leaveType);
                        System.out.println("Creating new leave balance for employee " + employeeId + ", type " + leaveType);
                    }
                        
                        if (leaveType == LeaveType.PAID_LEAVE) {
                            // 有休休暇は基本日数 + 調整分を設定
                            Employee employee = employeeRepository.findByEmployeeId(employeeId).orElse(null);
                            if (employee != null) {
                                int base = employee.getPaidLeaveBaseDays();
                                int adjustment = employee.getPaidLeaveAdjustment();
                                BigDecimal total = BigDecimal.valueOf(base + adjustment);
                                balance.setTotalDays(total);
                                balance.setRemainingDays(total);
                            } else {
                                balance.setTotalDays(BigDecimal.valueOf(10));
                                balance.setRemainingDays(BigDecimal.valueOf(10));
                            }
                        } else if (leaveType == LeaveType.SUMMER) {
                            // 夏季休暇は初期値として0日
                            balance.setTotalDays(BigDecimal.ZERO);
                            balance.setRemainingDays(BigDecimal.ZERO);
                        } else if (leaveType == LeaveType.WINTER) {
                            // 冬季休暇は初期値として0日
                            balance.setTotalDays(BigDecimal.ZERO);
                            balance.setRemainingDays(BigDecimal.ZERO);
                        } else if (leaveType == LeaveType.SPECIAL) {
                            // 特別休暇は初期値として0日
                            balance.setTotalDays(BigDecimal.ZERO);
                            balance.setRemainingDays(BigDecimal.ZERO);
                        } else {
                            // その他の休暇種別は0日
                            balance.setTotalDays(BigDecimal.ZERO);
                            balance.setRemainingDays(BigDecimal.ZERO);
                        }
                        
                        balance.setUsedDays(BigDecimal.ZERO);
                        balance.setUpdatedAt(LocalDateTime.now());
                        
                        leaveBalanceRepository.save(balance);
                        System.out.println("Saved leave balance for employee " + employeeId + ", type " + leaveType + 
                                         ", total: " + balance.getTotalDays() + ", remaining: " + balance.getRemainingDays());
                }
            }
            
            System.out.println("DataInitializer: Leave balances initialization completed");
        } catch (Exception e) {
            System.err.println("DataInitializer: Error during leave balances initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
