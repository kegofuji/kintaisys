package com.kintai.service;

import com.kintai.dto.HolidayRequestDto;
import com.kintai.entity.HolidayRequest;
import com.kintai.entity.HolidayRequest.RequestType;
import com.kintai.entity.HolidayRequest.Status;
import com.kintai.repository.HolidayRequestRepository;
import com.kintai.util.BusinessDayCalculator;
import com.kintai.entity.WorkPatternChangeRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class HolidayRequestService {

    @Autowired
    private HolidayRequestRepository repository;

    @Autowired
    private BusinessDayCalculator businessDayCalculator;

    @Autowired
    private CustomHolidayService customHolidayService;

    @Autowired
    private WorkPatternChangeRequestService workPatternChangeRequestService;

    public HolidayRequestDto createHolidayWork(Long employeeId, LocalDate workDate, boolean takeComp, LocalDate compDate, String reason) {
        validateHoliday(employeeId, workDate, true); // 休日のみ
        if (takeComp) {
            validateHoliday(employeeId, compDate, false); // 勤務日のみ
        }

        HolidayRequest req = new HolidayRequest();
        req.setEmployeeId(employeeId);
        req.setRequestType(RequestType.HOLIDAY_WORK);
        req.setWorkDate(workDate);
        req.setTakeComp(takeComp);
        req.setCompDate(takeComp ? compDate : null);
        req.setReason(reason);
        req.setStatus(Status.PENDING);
        HolidayRequest saved = repository.save(req);
        HolidayRequestDto dto = HolidayRequestDto.from(saved);
        dto.setMessage("休日出勤を申請しました");
        return dto;
    }

    public HolidayRequestDto createTransfer(Long employeeId, LocalDate transferWorkDate, LocalDate transferHolidayDate, String reason) {
        validateHoliday(employeeId, transferWorkDate, true);   // 出勤へ振替する元は休日
        validateHoliday(employeeId, transferHolidayDate, false); // 休日へ振替する元は勤務日

        HolidayRequest req = new HolidayRequest();
        req.setEmployeeId(employeeId);
        req.setRequestType(RequestType.TRANSFER);
        req.setWorkDate(transferWorkDate);
        req.setTransferHolidayDate(transferHolidayDate);
        req.setReason(reason);
        req.setStatus(Status.PENDING);
        HolidayRequest saved = repository.save(req);
        HolidayRequestDto dto = HolidayRequestDto.from(saved);
        dto.setMessage("振替を申請しました");
        return dto;
    }

    public List<HolidayRequest> listByEmployee(Long employeeId) {
        return repository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public List<HolidayRequest> listPending() {
        return repository.findByStatusOrderByCreatedAtDesc(Status.PENDING);
    }

    public List<HolidayRequest> listByStatus(Status status) {
        return repository.findByStatusOrderByCreatedAtDesc(status);
    }

    public HolidayRequestDto approve(Long id, Long approverId) {
        HolidayRequest req = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("申請が見つかりません"));
        if (req.getStatus() != Status.PENDING) throw new IllegalStateException("承認できない状態です");
        req.setStatus(Status.APPROVED);
        req.setApproverId(approverId);
        HolidayRequest saved = repository.save(req);
        
        // 承認時のカレンダー表示更新処理
        updateCalendarDisplayOnApproval(saved);
        
        HolidayRequestDto dto = HolidayRequestDto.from(saved);
        dto.setMessage("承認しました");
        return dto;
    }

    public HolidayRequestDto reject(Long id, Long approverId, String comment) {
        HolidayRequest req = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("申請が見つかりません"));
        if (req.getStatus() != Status.PENDING) throw new IllegalStateException("却下できない状態です");
        req.setStatus(Status.REJECTED);
        req.setApproverId(approverId);
        req.setRejectionComment(comment);
        HolidayRequest saved = repository.save(req);
        HolidayRequestDto dto = HolidayRequestDto.from(saved);
        dto.setMessage("却下しました");
        return dto;
    }

    /**
     * 承認時のカレンダー表示更新処理
     * 休日出勤・振替出勤が承認されたら、カレンダーの休日表記を削除
     * 代休・振替休日は新たに休日としてカレンダーに表記
     */
    private void updateCalendarDisplayOnApproval(HolidayRequest approvedRequest) {
        Long employeeId = approvedRequest.getEmployeeId();
        Long approverId = approvedRequest.getApproverId();
        
        if (approvedRequest.getRequestType() == RequestType.HOLIDAY_WORK) {
            // 休日出勤承認時
            // 出勤日（元々の休日）の休日表記を削除
            removeHolidayDisplay(employeeId, approvedRequest.getWorkDate());
            
            // 代休取得の場合、代休日を新たに休日として登録
            if (approvedRequest.getTakeComp() && approvedRequest.getCompDate() != null) {
                addHolidayDisplay(employeeId, approvedRequest.getCompDate(), "代休", 
                    "休日出勤の代休", approvedRequest.getId(), approverId);
            }
        } else if (approvedRequest.getRequestType() == RequestType.TRANSFER) {
            // 振替出勤承認時
            // 出勤日（元々の休日）の休日表記を削除
            removeHolidayDisplay(employeeId, approvedRequest.getWorkDate());
            
            // 振替休日を新たに休日として登録
            if (approvedRequest.getTransferHolidayDate() != null) {
                addHolidayDisplay(employeeId, approvedRequest.getTransferHolidayDate(), "振替休日", 
                    "振替出勤の振替休日", approvedRequest.getId(), approverId);
            }
        }
    }
    
    /**
     * 指定日の休日表記を削除
     */
    private void removeHolidayDisplay(Long employeeId, LocalDate date) {
        try {
            // 該当従業員の指定日のカスタム休日を削除
            customHolidayService.removeCustomHoliday(employeeId, date);
            System.out.println("休日表記を削除: 従業員ID=" + employeeId + ", 日付=" + date);
        } catch (Exception e) {
            System.err.println("休日表記の削除に失敗: " + e.getMessage());
        }
    }
    
    /**
     * 指定日を新たに休日として登録
     */
    private void addHolidayDisplay(Long employeeId, LocalDate date, String holidayType, String description, Long relatedRequestId, Long createdBy) {
        try {
            if ("代休".equals(holidayType)) {
                customHolidayService.createCompensatoryHoliday(employeeId, date, description, relatedRequestId, createdBy);
            } else if ("振替休日".equals(holidayType)) {
                customHolidayService.createTransferHoliday(employeeId, date, description, relatedRequestId, createdBy);
            } else {
                customHolidayService.createCustomHoliday(employeeId, date, holidayType, description, relatedRequestId, createdBy);
            }
            System.out.println("新たな休日を追加: 従業員ID=" + employeeId + ", 日付=" + date + ", 種別=" + holidayType);
        } catch (Exception e) {
            System.err.println("新たな休日の追加に失敗: " + e.getMessage());
        }
    }

    private void validateHoliday(Long employeeId, LocalDate date, boolean expectHoliday) {
        Objects.requireNonNull(date, "日付は必須です");
        boolean working = isWorkingDay(employeeId, date);
        if (expectHoliday && working) {
            throw new IllegalArgumentException("休日のみ選択できます");
        }
        if (!expectHoliday && !working) {
            throw new IllegalArgumentException("勤務日のみ選択できます");
        }
    }

    private boolean isWorkingDay(Long employeeId, LocalDate date) {
        if (date == null) {
            return false;
        }

        if (employeeId != null && customHolidayService != null) {
            try {
                if (customHolidayService.isCustomHoliday(employeeId, date)) {
                    return false;
                }
            } catch (Exception ignored) {
                // カスタム休日判定で失敗した場合は後続ロジックにフォールバック
            }
        }

        boolean calendarHoliday = businessDayCalculator != null && businessDayCalculator.isJapaneseHoliday(date);

        if (employeeId != null && workPatternChangeRequestService != null) {
            try {
                Optional<WorkPatternChangeRequest> patternOpt = workPatternChangeRequestService.findApplicablePattern(employeeId, date);
                if (patternOpt.isPresent()) {
                    WorkPatternChangeRequest pattern = patternOpt.get();
                    return pattern.appliesTo(date, calendarHoliday);
                }
            } catch (Exception ignored) {
                // 勤務時間変更の判定に失敗した場合はフォールバック
            }
        }

        if (businessDayCalculator != null) {
            return businessDayCalculator.isBusinessDay(date);
        }

        DayOfWeek dow = date.getDayOfWeek();
        return dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY;
    }

    @Transactional(readOnly = true)
    public long countByStatus(Status status) {
        return repository.countByStatus(status);
    }
}
