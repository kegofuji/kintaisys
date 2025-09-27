package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.AttendanceException;
import com.kintai.exception.VacationException;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import com.kintai.service.AdjustmentRequestService;
import com.kintai.service.VacationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@org.springframework.test.context.TestExecutionListeners(
        listeners = {
                org.springframework.test.context.web.ServletTestExecutionListener.class,
                org.springframework.test.context.support.DirtiesContextBeforeModesTestExecutionListener.class,
                org.springframework.test.context.support.DependencyInjectionTestExecutionListener.class,
                org.springframework.test.context.support.DirtiesContextTestExecutionListener.class,
                org.springframework.test.context.transaction.TransactionalTestExecutionListener.class,
                org.springframework.test.context.jdbc.SqlScriptsTestExecutionListener.class
        },
        mergeMode = org.springframework.test.context.TestExecutionListeners.MergeMode.REPLACE_DEFAULTS
)
class CancellationControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    EmployeeRepository employeeRepository;

    @Autowired
    AdjustmentRequestService adjustmentRequestService;

    @Autowired
    VacationService vacationService;

    @Autowired
    AdjustmentRequestRepository adjustmentRequestRepository;

    @Autowired
    AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    VacationRequestRepository vacationRequestRepository;

    private Employee employee;
    private Employee approver;

    @BeforeEach
    void setUp() {
        employee = employeeRepository.save(new Employee("EMP-TST-001"));
        approver = employeeRepository.save(new Employee("EMP-TST-ADMIN"));
    }

    @Test
    void cancelPendingAdjustmentRequest() throws Exception {
        LocalDate targetDate = LocalDate.of(2025, 9, 1);
        AdjustmentRequestDto dto = new AdjustmentRequestDto(
                employee.getEmployeeId(),
                targetDate,
                LocalDateTime.of(2025, 9, 1, 9, 0),
                LocalDateTime.of(2025, 9, 1, 18, 0),
                "申請理由"
        );
        AdjustmentRequest adjustmentRequest = adjustmentRequestService.createAdjustmentRequest(dto);

        String payload = objectMapper.writeValueAsString(
                Map.of(
                        "adjustmentRequestId", adjustmentRequest.getAdjustmentRequestId(),
                        "employeeId", employee.getEmployeeId()
                ));

        mockMvc.perform(post("/api/cancel/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        AdjustmentRequest updated = adjustmentRequestRepository.findById(adjustmentRequest.getAdjustmentRequestId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(AdjustmentRequest.AdjustmentStatus.CANCELLED);
    }

    @Test
    void cancelApprovedAdjustmentRequestRestoresOriginalAttendance() throws Exception {
        LocalDate targetDate = LocalDate.of(2025, 9, 2);
        LocalDateTime originalClockIn = LocalDateTime.of(2025, 9, 2, 8, 30);
        LocalDateTime originalClockOut = LocalDateTime.of(2025, 9, 2, 17, 30);

        AttendanceRecord attendanceRecord = new AttendanceRecord(employee.getEmployeeId(), targetDate);
        attendanceRecord.setClockInTime(originalClockIn);
        attendanceRecord.setClockOutTime(originalClockOut);
        attendanceRecordRepository.save(attendanceRecord);

        AdjustmentRequestDto dto = new AdjustmentRequestDto(
                employee.getEmployeeId(),
                targetDate,
                LocalDateTime.of(2025, 9, 2, 9, 0),
                LocalDateTime.of(2025, 9, 2, 18, 0),
                "理由"
        );
        AdjustmentRequest adjustmentRequest = adjustmentRequestService.createAdjustmentRequest(dto);

        adjustmentRequestService.approveAdjustmentRequest(adjustmentRequest.getAdjustmentRequestId(), approver.getEmployeeId());

        String payload = objectMapper.writeValueAsString(
                Map.of(
                        "adjustmentRequestId", adjustmentRequest.getAdjustmentRequestId(),
                        "employeeId", employee.getEmployeeId()
                ));

        mockMvc.perform(post("/api/cancel/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        AdjustmentRequest updated = adjustmentRequestRepository.findById(adjustmentRequest.getAdjustmentRequestId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(AdjustmentRequest.AdjustmentStatus.CANCELLED);

        AttendanceRecord reverted = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(employee.getEmployeeId(), targetDate)
                .orElseThrow();
        assertThat(reverted.getClockInTime()).isEqualTo(originalClockIn);
        assertThat(reverted.getClockOutTime()).isEqualTo(originalClockOut);
    }

    @Test
    void cancelPendingVacationRequest() throws Exception {
        LocalDate start = LocalDate.of(2025, 9, 3);
        VacationRequestDto requestDto = vacationService.createVacationRequest(
                employee.getEmployeeId(), start, start, "有給理由");

        VacationRequestDto.VacationData responseData = (VacationRequestDto.VacationData) requestDto.getData();
        Long vacationId = responseData.getVacationId();
        String payload = objectMapper.writeValueAsString(
                Map.of(
                        "vacationId", vacationId,
                        "employeeId", employee.getEmployeeId()
                ));

        mockMvc.perform(post("/api/cancel/vacation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        VacationRequest updated = vacationRequestRepository.findById(vacationId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(VacationStatus.CANCELLED);
    }

    @Test
    void cancelApprovedVacationRequest() throws Exception {
        LocalDate start = LocalDate.of(2025, 9, 4);
        LocalDate end = start.plusDays(1);
        VacationRequestDto requestDto = vacationService.createVacationRequest(
                employee.getEmployeeId(), start, end, "連休理由");

        VacationRequestDto.VacationData responseData = (VacationRequestDto.VacationData) requestDto.getData();
        Long vacationId = responseData.getVacationId();
        vacationService.updateVacationStatus(vacationId, VacationStatus.APPROVED);

        String payload = objectMapper.writeValueAsString(
                Map.of(
                        "vacationId", vacationId,
                        "employeeId", employee.getEmployeeId()
                ));

        mockMvc.perform(post("/api/cancel/vacation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        VacationRequest updated = vacationRequestRepository.findById(vacationId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(VacationStatus.CANCELLED);
    }

    @Test
    void cannotCreateVacationRequestOnHoliday() {
        LocalDate sunday = LocalDate.of(2025, 9, 7);
        assertThatThrownBy(() ->
                vacationService.createVacationRequest(
                        employee.getEmployeeId(), sunday, sunday, "休日申請"))
                .isInstanceOf(VacationException.class)
                .hasMessageContaining("土日祝日は有給申請できません");
    }

    @Test
    void cannotCreateAdjustmentRequestOnHoliday() {
        LocalDate sunday = LocalDate.of(2025, 9, 7);
        AdjustmentRequestDto dto = new AdjustmentRequestDto(
                employee.getEmployeeId(),
                sunday,
                LocalDateTime.of(2025, 9, 7, 9, 0),
                LocalDateTime.of(2025, 9, 7, 18, 0),
                "休日打刻修正"
        );

        assertThatThrownBy(() -> adjustmentRequestService.createAdjustmentRequest(dto))
                .isInstanceOf(AttendanceException.class)
                .hasMessageContaining("土日祝は打刻修正を申請できません");
    }
}
