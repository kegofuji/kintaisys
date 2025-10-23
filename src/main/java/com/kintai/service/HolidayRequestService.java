package com.kintai.service;

import com.kintai.dto.HolidayRequestDto;
import com.kintai.entity.HolidayRequest;
import com.kintai.entity.HolidayRequest.RequestType;
import com.kintai.entity.HolidayRequest.Status;
import com.kintai.repository.HolidayRequestRepository;
import com.kintai.util.BusinessDayCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class HolidayRequestService {

    @Autowired
    private HolidayRequestRepository repository;

    @Autowired
    private BusinessDayCalculator businessDayCalculator;

    public HolidayRequestDto createHolidayWork(Long employeeId, LocalDate workDate, boolean takeComp, LocalDate compDate, String reason) {
        validateHoliday(workDate, true); // 休日のみ
        if (takeComp) {
            validateHoliday(compDate, false); // 勤務日のみ
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
        validateHoliday(transferWorkDate, true);   // 出勤へ振替する元は休日
        validateHoliday(transferHolidayDate, false); // 休日へ振替する元は勤務日

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

    public HolidayRequestDto approve(Long id, Long approverId) {
        HolidayRequest req = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("申請が見つかりません"));
        if (req.getStatus() != Status.PENDING) throw new IllegalStateException("承認できない状態です");
        req.setStatus(Status.APPROVED);
        req.setApproverId(approverId);
        HolidayRequest saved = repository.save(req);
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

    private void validateHoliday(LocalDate date, boolean expectHoliday) {
        Objects.requireNonNull(date, "日付は必須です");
        boolean isBiz = businessDayCalculator.isBusinessDay(date);
        if (expectHoliday && isBiz) {
            throw new IllegalArgumentException("休日のみ選択できます");
        }
        if (!expectHoliday && !isBiz) {
            throw new IllegalArgumentException("勤務日のみ選択できます");
        }
    }
}


