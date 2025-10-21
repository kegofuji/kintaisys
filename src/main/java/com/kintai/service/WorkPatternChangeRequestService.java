package com.kintai.service;

import com.kintai.dto.WorkPatternChangeRequestDto;
import com.kintai.dto.WorkPatternSummaryDto;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkPatternChangeRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkPatternChangeRequestRepository;
import com.kintai.util.BusinessDayCalculator;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkPatternChangeRequestService {

    @Autowired
    private WorkPatternChangeRequestRepository repository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private TimeCalculator timeCalculator;

    @Autowired
    private BusinessDayCalculator businessDayCalculator;

    public WorkPatternChangeRequest createRequest(WorkPatternChangeRequestDto dto) {
        Long employeeId = dto.getEmployeeId();
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new AttendanceException(AttendanceException.EMPLOYEE_NOT_FOUND, "従業員が見つかりません: " + employeeId));

        if (Boolean.FALSE.equals(employee.getIsActive())) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "退職済みの従業員です");
        }

        if (dto.getStartDate() == null) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "開始日は必須です");
        }
        if (dto.getEndDate() == null) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "終了日は必須です");
        }
        LocalDate startDate = dto.getStartDate();
        LocalDate endDate = dto.getEndDate();
        if (endDate.isBefore(startDate)) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "終了日は開始日以降を指定してください");
        }

        if (dto.getStartTime() == null) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "始業時間は必須です");
        }
        if (dto.getEndTime() == null) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "終業時間は必須です");
        }
        LocalTime startTime = dto.getStartTime();
        LocalTime endTime = dto.getEndTime();

        LocalDateTime startDateTime = LocalDateTime.of(startDate, startTime);
        LocalDateTime endDateTime = LocalDateTime.of(startDate, endTime);
        if (!endDateTime.isAfter(startDateTime)) {
            throw new AttendanceException(AttendanceException.INVALID_TIME_PAIR, "終業時間は始業時間より後に設定してください");
        }

        if (repository.existsActiveOverlap(employeeId, startDate, endDate)) {
            throw new AttendanceException("DUPLICATE_WORK_PATTERN_REQUEST", "指定期間には既に申請中または承認済みの勤務時間変更が存在します");
        }

        Set<String> dayKeys = normalizeDayKeys(dto.getActiveDays());
        boolean applyMonday = dayKeys.contains("MONDAY");
        boolean applyTuesday = dayKeys.contains("TUESDAY");
        boolean applyWednesday = dayKeys.contains("WEDNESDAY");
        boolean applyThursday = dayKeys.contains("THURSDAY");
        boolean applyFriday = dayKeys.contains("FRIDAY");
        boolean applySaturday = dayKeys.contains("SATURDAY");
        boolean applySunday = dayKeys.contains("SUNDAY");
        boolean applyHoliday = dayKeys.contains("HOLIDAY");

        if (!(applyMonday || applyTuesday || applyWednesday || applyThursday || applyFriday || applySaturday || applySunday || applyHoliday)) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "勤務日を選択してください");
        }

        int sanitizedBreak = timeCalculator.resolveBreakMinutes(startDateTime, endDateTime, dto.getBreakMinutes());
        int workingMinutes = timeCalculator.calculateWorkingMinutes(startDateTime, endDateTime, sanitizedBreak);
        if (workingMinutes <= 0) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "勤務時間が0分以下です");
        }

        // 実働時間に応じた最小休憩時間の検証
        // 実働6時間以上8時間未満：45分以上の休憩が必要
        if (workingMinutes >= 360 && workingMinutes < 480 && sanitizedBreak < 45) {
            throw new AttendanceException("INSUFFICIENT_BREAK_TIME", "実働6時間以上8時間未満の場合、休憩時間は45分以上必要です");
        }
        // 実働8時間以上：60分以上の休憩が必要
        else if (workingMinutes >= 480 && sanitizedBreak < 60) {
            throw new AttendanceException("INSUFFICIENT_BREAK_TIME", "実働8時間以上の場合、休憩時間は60分以上必要です");
        }

        WorkPatternChangeRequest request = new WorkPatternChangeRequest();
        request.setEmployeeId(employeeId);
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setStartTime(startTime);
        request.setEndTime(endTime);
        request.setBreakMinutes(sanitizedBreak);
        request.setWorkingMinutes(workingMinutes);
        request.setApplyMonday(applyMonday);
        request.setApplyTuesday(applyTuesday);
        request.setApplyWednesday(applyWednesday);
        request.setApplyThursday(applyThursday);
        request.setApplyFriday(applyFriday);
        request.setApplySaturday(applySaturday);
        request.setApplySunday(applySunday);
        request.setApplyHoliday(applyHoliday);

        if (dto.getReason() != null) {
            String trimmed = dto.getReason().trim();
            request.setReason(trimmed.isEmpty() ? null : trimmed);
        }

        return repository.save(request);
    }

    @Transactional(readOnly = true)
    public List<WorkPatternChangeRequest> getRequestsByEmployee(Long employeeId) {
        return repository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public List<WorkPatternChangeRequest> getRequestsByStatus(WorkPatternChangeRequest.Status status) {
        return repository.findByStatusOrderByCreatedAtDesc(status);
    }

    @Transactional(readOnly = true)
    public WorkPatternSummaryDto getCurrentSummary(Long employeeId, LocalDate date) {
        if (employeeId == null) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "従業員IDが指定されていません");
        }

        LocalDate targetDate = date != null ? date : LocalDate.now();
        Optional<WorkPatternChangeRequest> patternOpt = findApplicablePattern(employeeId, targetDate);

        WorkPatternSummaryDto summary = new WorkPatternSummaryDto();
        if (patternOpt.isPresent()) {
            WorkPatternChangeRequest pattern = patternOpt.get();
            summary.setStartTime(pattern.getStartTime());
            summary.setEndTime(pattern.getEndTime());
            summary.setBreakMinutes(pattern.getBreakMinutes() == null ? 0 : pattern.getBreakMinutes());
            summary.setWorkingMinutes(pattern.getWorkingMinutes() == null ? 0 : pattern.getWorkingMinutes());
            summary.setPatternStartDate(pattern.getStartDate());
            summary.setPatternEndDate(pattern.getEndDate());
            summary.setWorkingDays(buildDayLabels(pattern, true));
            summary.setHolidayDays(buildDayLabels(pattern, false));
            summary.setHasApprovedRequest(true);
            summary.setUpcoming(false);
        } else {
            Optional<WorkPatternChangeRequest> upcomingOpt = findUpcomingApprovedPattern(employeeId, targetDate);
            if (upcomingOpt.isPresent()) {
                WorkPatternChangeRequest pattern = upcomingOpt.get();
                summary.setStartTime(pattern.getStartTime());
                summary.setEndTime(pattern.getEndTime());
                summary.setBreakMinutes(pattern.getBreakMinutes() == null ? 0 : pattern.getBreakMinutes());
                summary.setWorkingMinutes(pattern.getWorkingMinutes() == null ? 0 : pattern.getWorkingMinutes());
                summary.setPatternStartDate(pattern.getStartDate());
                summary.setPatternEndDate(pattern.getEndDate());
                summary.setWorkingDays(buildDayLabels(pattern, true));
                summary.setHolidayDays(buildDayLabels(pattern, false));
                summary.setHasApprovedRequest(true);
                summary.setUpcoming(true);
            } else {
                summary.setStartTime(TimeCalculator.STANDARD_START_TIME);
                summary.setEndTime(TimeCalculator.STANDARD_END_TIME);
                summary.setBreakMinutes(TimeCalculator.LUNCH_BREAK_MINUTES);
                summary.setWorkingMinutes(TimeCalculator.STANDARD_WORKING_MINUTES);
                summary.setPatternStartDate(null);
                summary.setPatternEndDate(null);
                summary.setWorkingDays(List.of("月", "火", "水", "木", "金"));
                summary.setHolidayDays(List.of("土", "日", "祝"));
                summary.setHasApprovedRequest(false);
                summary.setUpcoming(false);
            }
        }
        return summary;
    }

    @Transactional(readOnly = true)
    public Optional<WorkPatternChangeRequest> findApplicablePattern(Long employeeId, LocalDate date) {
        if (employeeId == null || date == null) {
            return Optional.empty();
        }
        return repository.findApprovedRequestsForDate(employeeId, date)
                .stream()
                .findFirst();
    }

    @Transactional(readOnly = true)
    public Optional<WorkPatternChangeRequest> findUpcomingApprovedPattern(Long employeeId, LocalDate date) {
        if (employeeId == null || date == null) {
            return Optional.empty();
        }
        return repository.findUpcomingApprovedRequests(employeeId, date).stream().findFirst();
    }

    public void applyPatternMetrics(AttendanceRecord record) {
        if (record == null || record.getEmployeeId() == null || record.getAttendanceDate() == null) {
            return;
        }

        Optional<WorkPatternChangeRequest> patternOpt = findApplicablePattern(record.getEmployeeId(), record.getAttendanceDate());
        if (patternOpt.isEmpty()) {
            if (record.getLateMinutes() == null) {
                record.setLateMinutes(0);
            }
            if (record.getEarlyLeaveMinutes() == null) {
                record.setEarlyLeaveMinutes(0);
            }
            return;
        }

        WorkPatternChangeRequest pattern = patternOpt.get();
        LocalDate date = record.getAttendanceDate();
        boolean calendarHoliday = businessDayCalculator != null && businessDayCalculator.isJapaneseHoliday(date);

        boolean hasAttendance = record.getClockInTime() != null || record.getClockOutTime() != null;
        boolean appliesToCalendar = pattern.appliesTo(date, calendarHoliday);

        if (!appliesToCalendar && hasAttendance) {
            appliesToCalendar = true;
        }

        if (appliesToCalendar) {
            applyWorkingDayPattern(record, pattern);
        } else {
            markAsHoliday(record);
        }
    }

    public WorkPatternChangeRequest approveRequest(Long requestId, Long approverEmployeeId) {
        WorkPatternChangeRequest request = repository.findById(requestId)
                .orElseThrow(() -> new AttendanceException(AttendanceException.REQUEST_NOT_FOUND, "勤務時間変更申請が見つかりません: " + requestId));

        if (request.getStatus() != WorkPatternChangeRequest.Status.PENDING) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "承認可能な状態ではありません");
        }

        request.setStatus(WorkPatternChangeRequest.Status.APPROVED);
        request.setApprovedByEmployeeId(approverEmployeeId);
        request.setApprovedAt(LocalDateTime.now());
        request.setRejectionComment(null);
        request.setRejectedAt(null);
        request.setRejectedByEmployeeId(null);

        WorkPatternChangeRequest saved = repository.save(request);
        recalculateAttendanceForRequest(saved);
        return saved;
    }

    public WorkPatternChangeRequest rejectRequest(Long requestId, Long approverEmployeeId, String comment) {
        WorkPatternChangeRequest request = repository.findById(requestId)
                .orElseThrow(() -> new AttendanceException(AttendanceException.REQUEST_NOT_FOUND, "勤務時間変更申請が見つかりません: " + requestId));

        if (request.getStatus() != WorkPatternChangeRequest.Status.PENDING) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "却下可能な状態ではありません");
        }

        String trimmedComment = comment == null ? "" : comment.trim();
        if (trimmedComment.isEmpty()) {
            throw new AttendanceException(AttendanceException.INVALID_REQUEST, "却下理由を入力してください");
        }

        request.setStatus(WorkPatternChangeRequest.Status.REJECTED);
        request.setRejectedByEmployeeId(approverEmployeeId);
        request.setRejectedAt(LocalDateTime.now());
        request.setRejectionComment(trimmedComment);

        return repository.save(request);
    }

    @Transactional(readOnly = true)
    public long countPendingRequests() {
        return repository.countByStatus(WorkPatternChangeRequest.Status.PENDING);
    }

    private Set<String> normalizeDayKeys(Set<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return Set.of();
        }
        return raw.stream()
                .filter(Objects::nonNull)
                .map(value -> value.trim().toUpperCase())
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toSet());
    }

    private void recalculateAttendanceForRequest(WorkPatternChangeRequest request) {
        if (request == null) {
            return;
        }

        for (LocalDate date = request.getStartDate(); !date.isAfter(request.getEndDate()); date = date.plusDays(1)) {
            boolean calendarHoliday = businessDayCalculator != null && businessDayCalculator.isJapaneseHoliday(date);
            boolean workingDay = request.appliesTo(date, calendarHoliday);

            AttendanceRecord record = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDate(request.getEmployeeId(), date)
                    .orElse(null);

            if (workingDay) {
                if (record == null) {
                    continue;
                }
                applyWorkingDayPattern(record, request);
            } else {
                if (record == null) {
                    record = new AttendanceRecord(request.getEmployeeId(), date);
                }
                markAsHoliday(record);
            }

            if (record != null) {
                timeCalculator.normalizeMetrics(record);
                attendanceRecordRepository.save(record);
            }
        }
    }

    public AttendanceStatus resolveAttendanceStatus(int lateMinutes, int earlyLeaveMinutes, int overtimeMinutes, int nightShiftMinutes) {
        if (lateMinutes > 0 && earlyLeaveMinutes > 0) {
            return AttendanceStatus.LATE_AND_EARLY_LEAVE;
        }
        if (lateMinutes > 0) {
            return AttendanceStatus.LATE;
        }
        if (earlyLeaveMinutes > 0) {
            return AttendanceStatus.EARLY_LEAVE;
        }
        if (nightShiftMinutes > 0) {
            return AttendanceStatus.NIGHT_SHIFT;
        }
        if (overtimeMinutes > 0) {
            return AttendanceStatus.OVERTIME;
        }
        return AttendanceStatus.NORMAL;
    }

    private void applyWorkingDayPattern(AttendanceRecord record, WorkPatternChangeRequest pattern) {
        if (record == null || pattern == null || record.getAttendanceDate() == null) {
            return;
        }

        LocalDate date = record.getAttendanceDate();
        if (record.getClockInTime() != null) {
            LocalDateTime scheduledStart = LocalDateTime.of(date, pattern.getStartTime());
            // 1秒でもあれば1分に切り上げる
            long lateSeconds = Duration.between(scheduledStart, record.getClockInTime()).getSeconds();
            long lateMinutes = (lateSeconds + 59) / 60; // 切り上げ処理
            record.setLateMinutes((int) Math.max(lateMinutes, 0));
        } else {
            record.setLateMinutes(0);
        }

        if (record.getClockOutTime() != null) {
            LocalDateTime scheduledEnd = LocalDateTime.of(date, pattern.getEndTime());
            // 1秒でもあれば1分に切り上げる（終業時刻から退勤時刻までの時間）
            long earlySeconds = Duration.between(record.getClockOutTime(), scheduledEnd).getSeconds();
            long earlyMinutes = (earlySeconds + 59) / 60; // 切り上げ処理
            record.setEarlyLeaveMinutes((int) Math.max(earlyMinutes, 0));
        } else {
            record.setEarlyLeaveMinutes(0);
        }

        int late = safeInt(record.getLateMinutes());
        int early = safeInt(record.getEarlyLeaveMinutes());
        int overtime = safeInt(record.getOvertimeMinutes());
        int night = safeInt(record.getNightShiftMinutes());
        record.setAttendanceStatus(resolveAttendanceStatus(late, early, overtime, night));
    }

    private void markAsHoliday(AttendanceRecord record) {
        if (record == null) {
            return;
        }
        record.setLateMinutes(0);
        record.setEarlyLeaveMinutes(0);
        if (record.getClockInTime() == null && record.getClockOutTime() == null) {
            record.setBreakMinutes(0);
        }
        record.setOvertimeMinutes(0);
        record.setNightShiftMinutes(0);
        record.setAttendanceStatus(AttendanceStatus.HOLIDAY);
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private List<String> buildDayLabels(WorkPatternChangeRequest pattern, boolean working) {
        List<String> labels = new ArrayList<>();
        if (pattern == null) {
            return labels;
        }
        appendIfMatch(labels, pattern.isApplyMonday(), working, "月");
        appendIfMatch(labels, pattern.isApplyTuesday(), working, "火");
        appendIfMatch(labels, pattern.isApplyWednesday(), working, "水");
        appendIfMatch(labels, pattern.isApplyThursday(), working, "木");
        appendIfMatch(labels, pattern.isApplyFriday(), working, "金");
        appendIfMatch(labels, pattern.isApplySaturday(), working, "土");
        appendIfMatch(labels, pattern.isApplySunday(), working, "日");
        appendIfMatch(labels, pattern.isApplyHoliday(), working, "祝");
        return labels;
    }

    private void appendIfMatch(List<String> labels, boolean applies, boolean working, String label) {
        if ((applies && working) || (!applies && !working)) {
            labels.add(label);
        }
    }
}
