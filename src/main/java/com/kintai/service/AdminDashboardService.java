package com.kintai.service;

import com.kintai.dto.AdminDashboardSummary;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.entity.HolidayRequest;
import com.kintai.entity.LeaveStatus;
import com.kintai.entity.WorkPatternChangeRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 管理者ダッシュボードの集計サービス
 */
@Service
@Transactional(readOnly = true)
public class AdminDashboardService {

    @Autowired
    private AdjustmentRequestService adjustmentRequestService;

    @Autowired
    private WorkPatternChangeRequestService workPatternChangeRequestService;

    @Autowired
    private LeaveRequestService leaveRequestService;

    @Autowired
    private HolidayRequestService holidayRequestService;

    public AdminDashboardSummary getSummary() {
        long adjustmentPending = adjustmentRequestService
                .getAdjustmentRequestsByStatus(AdjustmentRequest.AdjustmentStatus.PENDING)
                .size();
        long workPatternPending = workPatternChangeRequestService
                .getRequestsByStatus(WorkPatternChangeRequest.Status.PENDING)
                .size();
        long leavePending = leaveRequestService
                .findByStatus(LeaveStatus.PENDING)
                .size();
        long holidayPending = holidayRequestService
                .listPending()
                .size();
        return new AdminDashboardSummary(adjustmentPending, workPatternPending, leavePending, holidayPending);
    }
}
