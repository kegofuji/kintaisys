package com.kintai.service;

import com.kintai.dto.LeaveBalanceView;
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

    @Autowired
    private com.kintai.util.BusinessDayCalculator businessDayCalculator;

    private Employee employee;
    private Employee approver;

    @BeforeEach
    void setUp() {
        employee = employeeRepository.save(new Employee("EMP-L-001"));
        approver = employeeRepository.save(new Employee("EMP-L-ADMIN"));
    }

    @Test
    void approvePaidLeaveReducesRemainingDaysByOne() {
        LocalDate start = nextWorkingDay(1);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                start,
                start,
                "年休取得");

        Long leaveRequestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();
        leaveRequestService.updateStatus(leaveRequestId, LeaveStatus.APPROVED, approver.getEmployeeId(), null);

        Map<LeaveType, LeaveBalanceView> remaining = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        LeaveBalanceView view = remaining.get(LeaveType.PAID_LEAVE);
        assertThat(view.getRemaining()).isEqualByComparingTo("9");
        assertThat(view.getPending()).isEqualByComparingTo("0");
    }

    @Test
    void approveHalfDayReducesRemainingDaysByPointFive() {
        LocalDate start = nextWorkingDay(2);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.HALF_AM,
                start,
                start,
                "午前半休");

        Long leaveRequestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();
        leaveRequestService.updateStatus(leaveRequestId, LeaveStatus.APPROVED, approver.getEmployeeId(), null);

        Map<LeaveType, LeaveBalanceView> remaining = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        LeaveBalanceView view = remaining.get(LeaveType.PAID_LEAVE);
        assertThat(view.getRemaining()).isEqualByComparingTo("9.5");
        assertThat(view.getPending()).isEqualByComparingTo("0");
    }

    @Test
    void paidLeaveWithoutReasonIsRejected() {
        LocalDate start = nextWorkingDay(3);
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
        LocalDate start = nextWorkingDay(4);
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
        LocalDate specialDate = nextWorkingDay(5);
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

        LocalDate requestDate = nextWorkingDay(1);
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
        LocalDate target = nextWorkingDay(6);
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
    void pendingRequestsConsumeRemainingDays() {
        employee.setPaidLeaveBaseDays(2);
        employee = employeeRepository.save(employee);

        LocalDate first = nextWorkingDay(1);
        leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                first,
                first,
                "1日目");

        LocalDate second = nextWorkingDay(2);
        leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                second,
                second,
                "2日目");

        Map<LeaveType, LeaveBalanceView> summary = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        LeaveBalanceView balanceView = summary.get(LeaveType.PAID_LEAVE);
        assertThat(balanceView.getRemaining()).isEqualByComparingTo("2");
        assertThat(balanceView.getPending()).isEqualByComparingTo("2");
        assertThat(balanceView.getAvailable()).isEqualByComparingTo("0");

        BigDecimal remainingDays = leaveRequestService.getRemainingLeaveDays(employee.getEmployeeId(), LeaveType.PAID_LEAVE);
        assertThat(remainingDays).isEqualByComparingTo("0");

        LocalDate third = nextWorkingDay(3);
        assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                third,
                third,
                "3日目"))
                .isInstanceOf(VacationException.class)
                .hasMessageContaining("残日数が不足しています");
    }

    @Test
    void summerLeaveAllowsOptionalReason() {
        LocalDate target = nextWorkingDay(7);
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
        LocalDate target = nextWorkingDay(8);
        LeaveRequestDto dto = leaveRequestService.createLeaveRequest(
                employee.getEmployeeId(),
                LeaveType.PAID_LEAVE,
                LeaveTimeUnit.FULL_DAY,
                target,
                target,
                "取り消しテスト");

        Long leaveRequestId = ((LeaveRequestDto.LeaveData) dto.getData()).getLeaveRequestId();
        leaveRequestService.updateStatus(leaveRequestId, LeaveStatus.APPROVED, approver.getEmployeeId(), null);

        Map<LeaveType, LeaveBalanceView> afterApproval = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        LeaveBalanceView afterApprovalView = afterApproval.get(LeaveType.PAID_LEAVE);
        assertThat(afterApprovalView.getRemaining()).isEqualByComparingTo("9");
        assertThat(afterApprovalView.getPending()).isEqualByComparingTo("0");

        leaveRequestService.cancelRequest(leaveRequestId, employee.getEmployeeId());

        Map<LeaveType, LeaveBalanceView> afterCancel = leaveRequestService.getRemainingLeaveSummary(employee.getEmployeeId());
        LeaveBalanceView afterCancelView = afterCancel.get(LeaveType.PAID_LEAVE);
        assertThat(afterCancelView.getRemaining()).isEqualByComparingTo("10");
        assertThat(afterCancelView.getPending()).isEqualByComparingTo("0");

        LeaveBalance balance = leaveBalanceRepository.findByEmployeeIdAndLeaveType(employee.getEmployeeId(), LeaveType.PAID_LEAVE)
                .orElseThrow();
        assertThat(balance.getRemainingDays()).isEqualByComparingTo("10");
    }

    private LocalDate nextWorkingDay(int plusDays) {
        LocalDate date = LocalDate.now();
        int remaining = plusDays;
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

}
