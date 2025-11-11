package com.kintai.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 従業員の現在の勤務パターン概要を表すDTO.
 */
public class WorkPatternSummaryDto {

    private LocalTime startTime;
    private LocalTime endTime;
    private int breakMinutes;
    private int workingMinutes;
    private LocalDate patternStartDate;
    private LocalDate patternEndDate;
    private List<String> workingDays;
    private List<String> holidayDays;
    private boolean hasApprovedRequest;
    private boolean upcoming;

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public int getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(int breakMinutes) {
        this.breakMinutes = Math.max(breakMinutes, 0);
    }

    public int getWorkingMinutes() {
        return workingMinutes;
    }

    public void setWorkingMinutes(int workingMinutes) {
        this.workingMinutes = Math.max(workingMinutes, 0);
    }

    public LocalDate getPatternStartDate() {
        return patternStartDate;
    }

    public void setPatternStartDate(LocalDate patternStartDate) {
        this.patternStartDate = patternStartDate;
    }

    public LocalDate getPatternEndDate() {
        return patternEndDate;
    }

    public void setPatternEndDate(LocalDate patternEndDate) {
        this.patternEndDate = patternEndDate;
    }

    public List<String> getWorkingDays() {
        return workingDays;
    }

    public void setWorkingDays(List<String> workingDays) {
        this.workingDays = workingDays;
    }

    public List<String> getHolidayDays() {
        return holidayDays;
    }

    public void setHolidayDays(List<String> holidayDays) {
        this.holidayDays = holidayDays;
    }

    public boolean isHasApprovedRequest() {
        return hasApprovedRequest;
    }

    public void setHasApprovedRequest(boolean hasApprovedRequest) {
        this.hasApprovedRequest = hasApprovedRequest;
    }

    public boolean isUpcoming() {
        return upcoming;
    }

    public void setUpcoming(boolean upcoming) {
        this.upcoming = upcoming;
    }
}
