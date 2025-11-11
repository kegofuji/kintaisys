package com.kintai.controller;

import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.entity.UserAccount;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AttendanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    private Employee employee;
    private LocalDate targetDate;

    @BeforeEach
    void setUp() {
        employee = employeeRepository.save(new Employee("EMP-ATT-001"));
        targetDate = LocalDate.now().minusDays(3);
    }

    @Test
    void getAttendanceRecordReturnsExistingData() throws Exception {
        // テスト用の認証情報を設定
        UserAccount userAccount = new UserAccount("testuser", "password", UserAccount.UserRole.EMPLOYEE, employee.getEmployeeId());
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userAccount,
                userAccount.getPassword(),
                userAccount.getAuthorities()
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        
        LocalDateTime clockIn = targetDate.atTime(9, 0);
        LocalDateTime clockOut = targetDate.atTime(18, 0);

        AttendanceRecord record = new AttendanceRecord(employee.getEmployeeId(), targetDate);
        record.setClockInTime(clockIn);
        record.setClockOutTime(clockOut);
        record.setBreakMinutes(60);
        attendanceRecordRepository.save(record);

        mockMvc.perform(get("/api/attendance/history/{employeeId}/{date}", employee.getEmployeeId(), targetDate)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.clockInTime").value(Matchers.startsWith(clockIn.toString())))
                .andExpect(jsonPath("$.data.clockOutTime").value(Matchers.startsWith(clockOut.toString())))
                .andExpect(jsonPath("$.data.breakMinutes").value(60));
    }

    @Test
    void getAttendanceRecordWithoutDataReturnsNull() throws Exception {
        // テスト用の認証情報を設定
        UserAccount userAccount = new UserAccount("testuser", "password", UserAccount.UserRole.EMPLOYEE, employee.getEmployeeId());
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userAccount,
                userAccount.getPassword(),
                userAccount.getAuthorities()
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        
        LocalDate futureDate = targetDate.plusDays(10);

        mockMvc.perform(get("/api/attendance/history/{employeeId}/{date}", employee.getEmployeeId(), futureDate)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("指定日の勤怠情報はありません"))
                .andExpect(jsonPath("$.data").value(Matchers.nullValue()));
    }
}
