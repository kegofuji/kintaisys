package com.kintai.dto;

import com.kintai.entity.HolidayRequest;

import java.time.LocalDate;

public class HolidayRequestDto {
    private boolean success;
    private String message;
    private Long id;
    private Long employeeId;
    private String requestType; // HOLIDAY_WORK / TRANSFER
    private LocalDate workDate;
    private LocalDate compDate;
    private LocalDate transferHolidayDate;
    private Boolean takeComp;
    private String status;
    private String reason;

    public HolidayRequestDto() {}

    public HolidayRequestDto(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public static HolidayRequestDto from(HolidayRequest entity) {
        HolidayRequestDto dto = new HolidayRequestDto(true, "OK");
        if (entity != null) {
            dto.id = entity.getId();
            dto.employeeId = entity.getEmployeeId();
            dto.requestType = entity.getRequestType() != null ? entity.getRequestType().name() : null;
            dto.workDate = entity.getWorkDate();
            dto.compDate = entity.getCompDate();
            dto.transferHolidayDate = entity.getTransferHolidayDate();
            dto.takeComp = entity.getTakeComp();
            dto.status = entity.getStatus() != null ? entity.getStatus().name() : null;
            dto.reason = entity.getReason();
        }
        return dto;
    }

    // getters/setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }
    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }
    public LocalDate getCompDate() { return compDate; }
    public void setCompDate(LocalDate compDate) { this.compDate = compDate; }
    public LocalDate getTransferHolidayDate() { return transferHolidayDate; }
    public void setTransferHolidayDate(LocalDate transferHolidayDate) { this.transferHolidayDate = transferHolidayDate; }
    public Boolean getTakeComp() { return takeComp; }
    public void setTakeComp(Boolean takeComp) { this.takeComp = takeComp; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}


