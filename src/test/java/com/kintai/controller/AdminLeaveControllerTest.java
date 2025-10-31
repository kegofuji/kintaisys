package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.dto.LeaveRequestDto;
import com.kintai.entity.Employee;
import com.kintai.entity.LeaveRequest;
import com.kintai.entity.LeaveStatus;
import com.kintai.entity.LeaveTimeUnit;
import com.kintai.entity.LeaveType;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.LeaveRequestRepository;
import com.kintai.service.LeaveRequestService;
import com.kintai.util.BusinessDayCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

// BigDecimal import は廃止（有休調整機能の廃止により使用されなくなった）
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminLeaveControllerTest {

    private final BusinessDayCalculator businessDayCalculator = new BusinessDayCalculator();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private LeaveRequestService leaveRequestService;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    private Employee employee;
    private Employee employee2;
    private Employee approver;

    @BeforeEach
    void setUp() {
        employee = employeeRepository.save(new Employee("EMP-ADMIN-001"));
        employee2 = employeeRepository.save(new Employee("EMP-ADMIN-002"));
        approver = employeeRepository.save(new Employee("EMP-ADMIN-APPROVER"));
    }

    @Test
    void grantSpecialWithoutDatesReturnsBadRequest() throws Exception {
        Map<String, Object> payload = Map.of(
                "leaveType", "SPECIAL",
                "grantedDays", 1,
                "grantedDate", LocalDate.now().toString(),
                "scope", "ALL"
        );

        mockMvc.perform(post("/api/admin/leave/grants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("特別休暇の日付を指定してください"));
    }

    @Test
    void grantSeasonalLeaveToIndividualsSuccess() throws Exception {
        Map<String, Object> payload = Map.of(
                "leaveType", "SUMMER",
                "grantedDays", 3,
                "grantedDate", LocalDate.now().toString(),
                "expiresAt", LocalDate.now().plusMonths(1).toString(),
                "scope", "INDIVIDUAL",
                "employeeIds", List.of(employee.getEmployeeId(), employee2.getEmployeeId())
        );

        mockMvc.perform(post("/api/admin/leave/grants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.distributedCount").value(2));

        var remaining = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        assertThat(remaining.get(LeaveType.SUMMER).getRemaining()).isEqualByComparingTo("3");
        assertThat(remaining.get(LeaveType.SUMMER).getPending()).isEqualByComparingTo("0");
    }

    @Test
    void pendingRequestsEndpointReturnsCreatedLeave() throws Exception {
        LocalDate start = nextBusinessDay(3);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                start,
                nextBusinessDayFrom(start, 1),
                "夏季前休暇");

        mockMvc.perform(get("/api/admin/leave/requests/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].leaveType").value("PAID_LEAVE"))
                .andExpect(jsonPath("$.data[0].id").value(((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId()));
    }

    @Test
    void decisionEndpointApprovesLeaveRequest() throws Exception {
        LocalDate start = nextBusinessDay(2);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                start,
                start,
                "承認テスト");

        Long requestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();

        Map<String, Object> payload = Map.of(
                "approved", true,
                "approverId", approver.getEmployeeId()
        );

        mockMvc.perform(post("/api/admin/leave/requests/" + requestId + "/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        LeaveRequest updated = leaveRequestRepository.findById(requestId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(LeaveStatus.APPROVED);
    }

    // adjustBalanceEndpointIncrementsPaidLeaveAdjustment テストは廃止（有休調整機能の廃止により）

    private LocalDate nextBusinessDay(int offset) {
        LocalDate date = LocalDate.now();
        int remaining = offset;
        while (remaining > 0) {
            date = date.plusDays(1);
            if (businessDayCalculator.isBusinessDay(date)) {
                remaining--;
            }
        }
        while (!businessDayCalculator.isBusinessDay(date)) {
            date = date.plusDays(1);
        }
        return date;
    }

    private LocalDate nextBusinessDayFrom(LocalDate base, int offset) {
        LocalDate date = base;
        int remaining = offset;
        while (remaining > 0) {
            date = date.plusDays(1);
            if (businessDayCalculator.isBusinessDay(date)) {
                remaining--;
            }
        }
        while (!businessDayCalculator.isBusinessDay(date)) {
            date = date.plusDays(1);
        }
        return date;
    }

    @Test
    void testLeaveRequestWithWorkPatternChange() throws Exception {
        // テスト用の従業員を作成
        Employee employee = new Employee("TEST998");
        employee.setLastName("勤務時間変更");
        employee.setFirstName("テスト従業員");
        employee.setPaidLeaveBaseDays(10);
        employee.setIsActive(true);
        employee = employeeRepository.save(employee);

        // 土日を含む期間での休暇申請（勤務日のみをカウント）
        LocalDate startDate = LocalDate.of(2025, 10, 27); // 月曜日
        LocalDate endDate = LocalDate.of(2025, 11, 7);     // 金曜日（12日間、土日を除くと9日間）

        // 休暇申請を作成（勤務日のみをカウントするため9日になる）
        LeaveRequestDto result = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                startDate,
                endDate,
                "勤務時間変更考慮テスト"
        );

        // 申請日数が勤務日のみ（9日）であることを確認
        assertThat(result.isSuccess()).isTrue();
        if (result.getData() instanceof LeaveRequestDto.LeaveData) {
            LeaveRequestDto.LeaveData data = (LeaveRequestDto.LeaveData) result.getData();
            assertThat(data.getDays()).isEqualByComparingTo("9");
        }
    }
}
