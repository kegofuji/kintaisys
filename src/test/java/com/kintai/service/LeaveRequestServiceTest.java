package com.kintai.service;

import com.kintai.dto.LeaveRequestDto;
import com.kintai.entity.Employee;
import com.kintai.entity.LeaveBalance;
import com.kintai.entity.LeaveRequest;
import com.kintai.entity.LeaveStatus;
import com.kintai.entity.LeaveTimeUnit;
import com.kintai.entity.LeaveType;
import com.kintai.exception.VacationException;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.LeaveBalanceRepository;
import com.kintai.repository.LeaveRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class LeaveRequestServiceTest {

    @Autowired
    private LeaveRequestService leaveRequestService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

    private Employee employee;
    private Employee approver;

    @BeforeEach
    void setUp() {
        employee = employeeRepository.save(new Employee("EMP-L-001"));
        approver = employeeRepository.save(new Employee("EMP-L-ADMIN"));
    }

    @Test
    void approvePaidLeaveReducesRemainingDaysByOne() {
        LocalDate start = nextBusinessDay(1);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                start,
                start,
                "年休取得");

        Long leaveRequestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();
        leaveRequestService.updateStatus(leaveRequestId, LeaveStatus.APPROVED, approver.getEmployeeId(), null);

        Map<LeaveType, BigDecimal> remaining = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        assertThat(remaining.get(LeaveType.PAID_LEAVE)).isEqualByComparingTo("9");
    }

    @Test
    void approveHalfDayReducesRemainingDaysByPointFive() {
        LocalDate start = nextBusinessDay(2);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.HALF_AM,
                start,
                start,
                "午前半休");

        Long leaveRequestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();
        leaveRequestService.updateStatus(leaveRequestId, LeaveStatus.APPROVED, approver.getEmployeeId(), null);

        Map<LeaveType, BigDecimal> remaining = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        assertThat(remaining.get(LeaveType.PAID_LEAVE)).isEqualByComparingTo("9.5");
    }

    @Test
    void paidLeaveWithoutReasonIsRejected() {
        LocalDate start = nextBusinessDay(3);
        assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                start,
                start,
                null))
                .isInstanceOf(VacationException.class)
                .hasMessageContaining("理由を入力してください");
    }

    @Test
    void specialLeaveRequiresGrant() {
        LocalDate start = LocalDate.now().plusDays(4);
        assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.SPECIAL,
                LeaveTimeUnit.FULL_DAY,
                start,
                start,
                "特別休暇"))
                .isInstanceOf(VacationException.class)
                .hasMessageContaining("残日数が不足しています");
    }

    @Test
    void specialLeaveWithGrantIsAccepted() {
        LocalDate specialDate = nextBusinessDay(5);
        leaveRequestService.applyGrant(
                employee.getEmployeeId(),
                LeaveType.SPECIAL,
                BigDecimal.ONE,
                specialDate,
                specialDate,
                approver.getEmployeeId());

        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.SPECIAL,
                LeaveTimeUnit.FULL_DAY,
                specialDate,
                specialDate,
                "記念日");

        LeaveRequestDto.LeaveData data = (LeaveRequestDto.LeaveData) dto.getData();
        LeaveRequest stored = leaveRequestRepository.findById(data.getLeaveRequestId()).orElseThrow();
        assertThat(stored.getLeaveType()).isEqualTo(LeaveType.SPECIAL);
        assertThat(stored.getStatus()).isEqualTo(LeaveStatus.PENDING);
    }

    @Test
    void summerLeaveWithExpiredGrantIsRejected() {
        LocalDate granted = LocalDate.now().minusDays(30);
        LocalDate expires = LocalDate.now().minusDays(1);
        leaveRequestService.applyGrant(
                employee.getEmployeeId(),
                LeaveType.SUMMER,
                BigDecimal.ONE,
                granted,
                expires,
                approver.getEmployeeId());

        LocalDate requestDate = LocalDate.now().plusDays(1);
        assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.SUMMER,
                LeaveTimeUnit.FULL_DAY,
                requestDate,
                requestDate,
                null))
                .isInstanceOf(VacationException.class)
                .hasMessageContaining("残日数が不足しています");
    }

    @Test
    void duplicateHalfDayOnSameDateIsRejected() {
        LocalDate target = nextBusinessDay(6);
        leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.HALF_AM,
                target,
                target,
                "午前休");

        assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.HALF_PM,
                target,
                target,
                "午後休"))
                .isInstanceOf(VacationException.class)
                .hasMessageContaining("同一期間に既存の申請があります");
    }

    @Test
    void summerLeaveAllowsOptionalReason() {
        LocalDate target = nextBusinessDay(7);
        leaveRequestService.applyGrant(
                employee.getEmployeeId(),
                LeaveType.SUMMER,
                new BigDecimal("2"),
                target,
                target.plusDays(10),
                approver.getEmployeeId());

        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.SUMMER,
                LeaveTimeUnit.FULL_DAY,
                target,
                target.plusDays(1),
                null);

        LeaveRequestDto.LeaveData data = (LeaveRequestDto.LeaveData) dto.getData();
        LeaveRequest stored = leaveRequestRepository.findById(data.getLeaveRequestId()).orElseThrow();
        assertThat(stored.getReason()).isNull();
    }

    @Test
    void cancellingApprovedLeaveRestoresBalance() {
        LocalDate target = nextBusinessDay(8);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                target,
                target,
                "取り消しテスト");

        Long leaveRequestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();
        leaveRequestService.updateStatus(leaveRequestId, LeaveStatus.APPROVED, approver.getEmployeeId(), null);

        Map<LeaveType, BigDecimal> afterApproval = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        assertThat(afterApproval.get(LeaveType.PAID_LEAVE)).isEqualByComparingTo("9");

        leaveRequestService.cancelRequest(leaveRequestId, employee.getEmployeeId());

        Map<LeaveType, BigDecimal> afterCancel = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        assertThat(afterCancel.get(LeaveType.PAID_LEAVE)).isEqualByComparingTo("10");

        LeaveBalance balance = leaveBalanceRepository.findByEmployeeIdAndLeaveType(employee.getEmployeeId(), LeaveType.PAID_LEAVE)
                .orElseThrow();
        assertThat(balance.getRemainingDays()).isEqualByComparingTo("10");
    }
    private LocalDate nextBusinessDay(int plusDays) {
        LocalDate date = LocalDate.now().plusDays(plusDays);
        while (date.getDayOfWeek().getValue() >= 6) { // 6=SAT,7=SUN
            date = date.plusDays(1);
        }
        return date;
    }
}
