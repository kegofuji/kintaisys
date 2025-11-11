package com.kintai.service;

import com.kintai.dto.ClockResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AdjustmentRequestRepository adjustmentRequestRepository;

    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        attendanceService = new AttendanceService();
        ReflectionTestUtils.setField(attendanceService, "attendanceRecordRepository", attendanceRecordRepository);
        ReflectionTestUtils.setField(attendanceService, "employeeRepository", employeeRepository);
        ReflectionTestUtils.setField(attendanceService, "adjustmentRequestRepository", adjustmentRequestRepository);
        ReflectionTestUtils.setField(attendanceService, "timeCalculator", new TimeCalculator());
    }

    @Test
    void toClockData_includesNightShiftAfterAdjustment() {
        AttendanceRecord record = new AttendanceRecord();
        record.setAttendanceId(2L);
        record.setEmployeeId(77L);
        record.setAttendanceDate(LocalDate.of(2025, 10, 18));
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 23, 0));
        record.setBreakMinutes(60);

        when(adjustmentRequestRepository.existsApprovedRequestForDate(77L, LocalDate.of(2025, 10, 18)))
                .thenReturn(false);

        ClockResponse.ClockData data =
                ReflectionTestUtils.invokeMethod(attendanceService, "toClockData", record);

        assertNotNull(data);
        assertEquals(60, data.getNightShiftMinutes());
        assertEquals(300, data.getOvertimeMinutes());
        assertEquals(TimeCalculator.STANDARD_WORKING_MINUTES + 300, data.getWorkingMinutes());
    }

    @Test
    void toClockData_recalculatesShortageAndPreventsBreakEdit() {
        AttendanceRecord record = new AttendanceRecord();
        record.setAttendanceId(1L);
        record.setEmployeeId(99L);
        record.setAttendanceDate(LocalDate.of(2025, 10, 18));
        record.setClockInTime(LocalDateTime.of(2025, 10, 18, 9, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 10, 18, 18, 1));
        record.setBreakMinutes(65);

        when(adjustmentRequestRepository.existsApprovedRequestForDate(99L, LocalDate.of(2025, 10, 18)))
                .thenReturn(true);

        ClockResponse.ClockData data =
                ReflectionTestUtils.invokeMethod(attendanceService, "toClockData", record);

        assertNotNull(data);
        assertEquals(0, data.getLateMinutes());
        assertEquals(0, data.getEarlyLeaveMinutes());
        assertEquals(476, data.getWorkingMinutes());
        assertEquals(65, data.getBreakMinutes());
        assertEquals(Boolean.TRUE, data.getHasApprovedAdjustment());
    }
}
