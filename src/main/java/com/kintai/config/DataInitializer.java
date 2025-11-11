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
        Employee emp1Employee = employeeRepository.findById(1L).orElse(null);
        if (emp1Employee == null) {
            emp1Employee = new Employee("EMP001");
            emp1Employee.setEmployeeId(1L);
            emp1Employee.setIsActive(true);
            // 表示名が emp1 にフォールバックしないよう、氏名を初期設定（テスト仕様）
            emp1Employee.setLastName("テスト");
            emp1Employee.setFirstName("");
            // 入社日を設定
            emp1Employee.setHireDate(java.time.LocalDate.of(2025, 8, 1));
            Employee savedEmp1 = employeeRepository.save(emp1Employee);
            System.out.println("Created emp1 employee with ID: " + savedEmp1.getEmployeeId());
        } else {
            // 既存のemp1の入社日を設定（未設定の場合）
            if (emp1Employee.getHireDate() == null) {
                emp1Employee.setHireDate(java.time.LocalDate.of(2025, 8, 1));
                employeeRepository.save(emp1Employee);
                System.out.println("Updated emp1 employee hire date to 2025/8/1");
            }
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
        
        // emp2/emp3 は生成しない（サンプルデータは emp1 のみ）
        
        // admin用の管理者データを作成（adminId=1）
        Admin adminData = new Admin("ADM001");
        adminData.setAdminId(1L);
        adminData.setIsActive(true);
        Admin savedAdmin = adminRepository.save(adminData);
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
            
            // サンプル従業員（emp1 のみ）に対して休暇残数を初期化
            Long[] employeeIds = {1L};
            
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
                                BigDecimal total = BigDecimal.valueOf(base);
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
