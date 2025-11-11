package com.kintai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.entity.HolidayRequest;
import com.kintai.entity.LeaveRequest;
import com.kintai.entity.LeaveStatus;
import com.kintai.entity.LeaveTimeUnit;
import com.kintai.entity.LeaveType;
import com.kintai.entity.WorkPatternChangeRequest;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.HolidayRequestRepository;
import com.kintai.repository.LeaveRequestRepository;
import com.kintai.repository.WorkPatternChangeRequestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AdminDashboardServiceTest {

    @Autowired
    private AdminDashboardService adminDashboardService;

    @Autowired
    private AdjustmentRequestRepository adjustmentRequestRepository;

    @Autowired
    private WorkPatternChangeRequestRepository workPatternChangeRequestRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private HolidayRequestRepository holidayRequestRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getSummaryReturnsPendingCounts() {
        AdjustmentRequest adjustmentRequest = new AdjustmentRequest(1L,
                LocalDate.of(2025, 10, 23),
                LocalDateTime.of(2025, 10, 23, 9, 0),
                LocalDateTime.of(2025, 10, 23, 19, 0),
                "test");
        adjustmentRequestRepository.save(adjustmentRequest);

        WorkPatternChangeRequest workPattern = new WorkPatternChangeRequest();
        workPattern.setEmployeeId(1L);
        workPattern.setStartDate(LocalDate.of(2025, 11, 1));
        workPattern.setEndDate(LocalDate.of(2025, 11, 30));
        workPattern.setStartTime(LocalTime.of(9, 0));
        workPattern.setEndTime(LocalTime.of(17, 0));
        workPattern.setBreakMinutes(60);
        workPattern.setWorkingMinutes((8 * 60) - 60);
        workPattern.setApplyMonday(true);
        workPattern.setApplyTuesday(true);
        workPattern.setApplyWednesday(true);
        workPattern.setApplyThursday(true);
        workPattern.setApplyFriday(true);
        workPatternChangeRequestRepository.save(workPattern);

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setEmployeeId(1L);
        leaveRequest.setLeaveType(LeaveType.PAID_LEAVE);
        leaveRequest.setTimeUnit(LeaveTimeUnit.FULL_DAY);
        leaveRequest.setStartDate(LocalDate.of(2025, 10, 24));
        leaveRequest.setEndDate(LocalDate.of(2025, 10, 24));
        leaveRequest.setDays(BigDecimal.ONE);
        leaveRequest.setReason("test");
        leaveRequest.setStatus(LeaveStatus.PENDING);
        leaveRequestRepository.save(leaveRequest);

        HolidayRequest holidayRequest = new HolidayRequest();
        holidayRequest.setEmployeeId(1L);
        holidayRequest.setRequestType(HolidayRequest.RequestType.HOLIDAY_WORK);
        holidayRequest.setWorkDate(LocalDate.of(2025, 10, 18));
        holidayRequest.setReason("test");
        holidayRequestRepository.save(holidayRequest);

        var summary = adminDashboardService.getSummary();

        // JSONにシリアライズした際のフィールド名を確認（フロント連携用）
        try {
            String json = objectMapper.writeValueAsString(summary);
            System.out.println("AdminDashboardSummary JSON: " + json);
        } catch (Exception ignored) {}

        assertThat(summary.adjustmentPending()).isEqualTo(1L);
        assertThat(summary.workPatternPending()).isEqualTo(1L);
        assertThat(summary.leavePending()).isEqualTo(1L);
        assertThat(summary.holidayPending()).isEqualTo(1L);
    }
}
