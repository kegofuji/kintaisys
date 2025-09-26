package com.kintai.config;

import com.kintai.entity.Employee;
import com.kintai.entity.UserAccount;
import com.kintai.entity.Admin;
import com.kintai.entity.AdminAccount;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.UserAccountRepository;
import com.kintai.repository.AdminRepository;
import com.kintai.repository.AdminAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;

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
    private PasswordEncoder passwordEncoder;
    
    @PostConstruct
    public void initData() {
        try {
            System.out.println("DataInitializer: Starting data initialization...");
            // 既存のデータをクリア（外部キー制約があるため、依存関係を考慮して削除）
            try {
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
        
        System.out.println("DataInitializer: Data initialization completed successfully");
        } catch (Exception e) {
            System.err.println("DataInitializer: Error during data initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
