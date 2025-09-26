package com.kintai.service;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import com.kintai.entity.UserAccount;

import java.time.LocalDate;
import java.util.List;
import com.kintai.util.BusinessDayCalculator;

/**
 * 有給休暇申請サービス
 */
@Service
@Transactional
public class VacationService {
    
    @Autowired
    private VacationRequestRepository vacationRequestRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private BusinessDayCalculator businessDayCalculator;
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    // 年間付与日数（簡易実装。必要なら従業員ごとに管理に変更）
    private static final int DEFAULT_ANNUAL_PAID_LEAVE_DAYS = 10;
    
    /**
     * 有給休暇申請処理
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     * @param reason 理由
     * @return 申請レスポンス
     */
    public VacationRequestDto createVacationRequest(Long employeeId, LocalDate startDate, 
                                                  LocalDate endDate, String reason) {
        try {
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new VacationException(
                            VacationException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new VacationException(
                        VacationException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 日付範囲バリデーション
            validateDateRange(startDate, endDate);
            
            // 4. 重複申請チェック
            if (vacationRequestRepository.existsOverlappingRequest(employeeId, startDate, endDate)) {
                throw new VacationException(
                        VacationException.DUPLICATE_REQUEST, 
                        "既に申請済みの日付を含んでいます");
            }
            
            // 5. 出勤後の有給申請禁止チェック
            validateNoAttendanceAfterClockIn(employeeId, startDate, endDate);
            
            // 6. 付与基準日の判定（当年1/1を使用）
            LocalDate startOfYear = LocalDate.now().withMonth(1).withDayOfMonth(1);
            LocalDate grantDate = startOfYear;
            
            // 当年1/1より前は取得不可
            if (startDate.isBefore(grantDate)) {
                throw new VacationException(
                        VacationException.INVALID_DATE_RANGE,
                        "当年1/1より前は有給を取得できません");
            }

            // 7. 申請日数（営業日換算。土日除外、祝日未考慮）
            int days = calculateVacationDays(startDate, endDate);

            // 8. 残日数超過の禁止（当年内・付与後の承認済み消化分を控除）
            LocalDate endOfYear = LocalDate.now().withMonth(12).withDayOfMonth(31);
            Integer usedDays = vacationRequestRepository
                    .sumApprovedDaysInPeriod(employeeId, grantDate, endOfYear);
            if (usedDays == null) usedDays = 0;
            int adjustment = employee.getPaidLeaveAdjustment();
            int remaining = Math.max(0, DEFAULT_ANNUAL_PAID_LEAVE_DAYS + adjustment - usedDays);
            if (days > remaining) {
                throw new VacationException(
                        VacationException.INVALID_DATE_RANGE,
                        "残有給日数を超える申請はできません");
            }
            
            // 9. 有給申請作成（理由必須はコントローラで検証済みだが保険でnull→空文字整備）
            VacationRequest vacationRequest = new VacationRequest(employeeId, startDate, endDate, reason);
            vacationRequest.setDays(days);
            
            // 10. データベース保存
            VacationRequest savedRequest = vacationRequestRepository.save(vacationRequest);
            
            // 11. レスポンス作成
            VacationRequestDto.VacationData data = new VacationRequestDto.VacationData(
                    savedRequest.getVacationId(),
                    savedRequest.getEmployeeId(),
                    savedRequest.getStartDate(),
                    savedRequest.getEndDate(),
                    savedRequest.getDays(),
                    savedRequest.getStatus().name()
            );
            
            String message = "有給申請を受け付けました";
            VacationRequestDto response = new VacationRequestDto(true, message, data);
            setUserInfoToResponse(response);
            return response;
            
        } catch (VacationException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new VacationException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 有給申請ステータス更新
     * @param vacationId 申請ID
     * @param status 新しいステータス
     * @return 更新レスポンス
     */
    public VacationRequestDto updateVacationStatus(Long vacationId, VacationStatus status) {
        try {
            // 1. 申請存在チェック
            VacationRequest vacationRequest = vacationRequestRepository.findById(vacationId)
                    .orElseThrow(() -> new VacationException(
                            VacationException.VACATION_NOT_FOUND, 
                            "申請が見つかりません"));
            
            // 2. ステータス変更バリデーション
            validateStatusChange(vacationRequest.getStatus(), status);
            
            // 3. ステータス更新
            vacationRequest.setStatus(status);
            VacationRequest savedRequest = vacationRequestRepository.save(vacationRequest);
            
            // 4. レスポンス作成
            VacationRequestDto.VacationData data = new VacationRequestDto.VacationData(
                    savedRequest.getVacationId(),
                    savedRequest.getEmployeeId(),
                    savedRequest.getStartDate(),
                    savedRequest.getEndDate(),
                    savedRequest.getDays(),
                    savedRequest.getStatus().name()
            );
            
            String message = String.format("申請を%sしました", status.getDisplayName());
            VacationRequestDto response = new VacationRequestDto(true, message, data);
            setUserInfoToResponse(response);
            return response;
            
        } catch (VacationException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new VacationException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 残有給日数を取得（年度は当年1/1〜12/31のシンプル運用）
     * @param employeeId 従業員ID
     * @return 残日数
     */
    @Transactional(readOnly = true)
    public int getRemainingVacationDays(Long employeeId) {
        LocalDate today = LocalDate.now();
        LocalDate startOfYear = today.withMonth(1).withDayOfMonth(1);
        LocalDate endOfYear = today.withMonth(12).withDayOfMonth(31);
        
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElse(null);
        if (employee == null) {
            return 0;
        }
        // 付与基準日：当年の1/1
        LocalDate grantDate = startOfYear;
        
        // まだ付与前の場合は残日数0
        if (today.isBefore(grantDate)) {
            return 0;
        }
        
        Integer usedDays = vacationRequestRepository
                .sumApprovedDaysInPeriod(employeeId, grantDate, endOfYear);
        if (usedDays == null) usedDays = 0;
        int adjustment = employee.getPaidLeaveAdjustment();
        int remaining = DEFAULT_ANNUAL_PAID_LEAVE_DAYS + adjustment - usedDays;
        return Math.max(remaining, 0);
    }

    /**
     * 従業員の有給申請一覧取得
     * @param employeeId 従業員ID
     * @return 申請一覧
     */
    public List<VacationRequest> getVacationRequestsByEmployee(Long employeeId) {
        return vacationRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }
    
    /**
     * 日付範囲のバリデーション
     * @param startDate 開始日
     * @param endDate 終了日
     */
    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE, 
                    "開始日と終了日は必須です");
        }
        
        if (startDate.isAfter(endDate)) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE, 
                    "開始日は終了日より前である必要があります");
        }
        
        if (startDate.isBefore(LocalDate.now())) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE, 
                    "過去の日付は申請できません");
        }

        // 全休のみ: 営業日数が0の場合は不正
        int bizDays = businessDayCalculator.countBusinessDaysInclusive(startDate, endDate);
        if (bizDays <= 0) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE,
                    "営業日が含まれない期間は申請できません");
        }
        
        // 土日祝の有給申請禁止チェック
        validateNoWeekendHolidayRequest(startDate, endDate);
    }
    
    /**
     * 有給日数を計算
     * @param startDate 開始日
     * @param endDate 終了日
     * @return 日数
     */
    private int calculateVacationDays(LocalDate startDate, LocalDate endDate) {
        return businessDayCalculator.countBusinessDaysInclusive(startDate, endDate);
    }
    
    /**
     * ステータス変更のバリデーション
     * @param currentStatus 現在のステータス
     * @param newStatus 新しいステータス
     */
    private void validateStatusChange(VacationStatus currentStatus, VacationStatus newStatus) {
        if (currentStatus == newStatus) {
            throw new VacationException(
                    VacationException.INVALID_STATUS_CHANGE,
                    "同じステータスに変更することはできません");
        }

        // 承認済み・申請中の取消は許可（APPROVED/PENDING → CANCELLED）
        if (newStatus == VacationStatus.CANCELLED) {
            if (currentStatus == VacationStatus.CANCELLED) {
                throw new VacationException(
                        VacationException.INVALID_STATUS_CHANGE,
                        "既に取消済みです");
            }
            // PENDING, APPROVED からの取消は許可
            return;
        }

        // CANCELLED/REJECTED から他ステータスへは不可
        if (currentStatus == VacationStatus.CANCELLED || currentStatus == VacationStatus.REJECTED) {
            throw new VacationException(
                    VacationException.INVALID_STATUS_CHANGE,
                    "既に処理済みの申請は変更できません");
        }

        // APPROVED から CANCELLED 以外への変更は不可
        if (currentStatus == VacationStatus.APPROVED) {
            throw new VacationException(
                    VacationException.INVALID_STATUS_CHANGE,
                    "承認済みの申請は取消以外に変更できません");
        }
    }
    
    /**
     * 土日祝の有給申請禁止チェック
     * @param startDate 開始日
     * @param endDate 終了日
     */
    private void validateNoWeekendHolidayRequest(LocalDate startDate, LocalDate endDate) {
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            // 土日チェック
            if (date.getDayOfWeek().getValue() == 6 || date.getDayOfWeek().getValue() == 7) {
                throw new VacationException(
                        VacationException.INVALID_DATE_RANGE,
                        String.format("%sは土日祝のため、有給申請できません", date));
            }
            
            // 祝日チェック（簡易版）
            if (isHoliday(date)) {
                throw new VacationException(
                        VacationException.INVALID_DATE_RANGE,
                        String.format("%sは祝日のため、有給申請できません", date));
            }
        }
    }
    
    /**
     * 祝日判定（簡易版）
     * @param date 日付
     * @return 祝日かどうか
     */
    private boolean isHoliday(LocalDate date) {
        int year = date.getYear();
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();
        
        // 日本の祝日判定（簡易版）
        String[] holidays = {
            String.format("%04d-01-01", year), // 元日
            String.format("%04d-02-11", year), // 建国記念の日
            String.format("%04d-02-23", year), // 天皇誕生日
            String.format("%04d-04-29", year), // 昭和の日
            String.format("%04d-05-03", year), // 憲法記念日
            String.format("%04d-05-04", year), // みどりの日
            String.format("%04d-05-05", year), // こどもの日
            String.format("%04d-08-11", year), // 山の日
            String.format("%04d-11-03", year), // 文化の日
            String.format("%04d-11-23", year)  // 勤労感謝の日
        };
        
        String dateString = String.format("%04d-%02d-%02d", year, month, day);
        for (String holiday : holidays) {
            if (dateString.equals(holiday)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 出勤後の有給申請禁止チェック
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     */
    private void validateNoAttendanceAfterClockIn(Long employeeId, LocalDate startDate, LocalDate endDate) {
        // 申請期間内で出勤打刻済みの日があるかチェック
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            if (attendanceRecordRepository.existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(employeeId, date)) {
                throw new VacationException(
                        VacationException.INVALID_DATE_RANGE,
                        String.format("%sは既に出勤打刻済みのため、有給申請できません", date));
            }
        }
    }
    
    /**
     * レスポンスにユーザー情報を設定
     * @param response レスポンス
     */
    private void setUserInfoToResponse(VacationRequestDto response) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserAccount) {
                UserAccount userAccount = (UserAccount) authentication.getPrincipal();
                response.setEmployeeId(userAccount.getEmployeeId());
                response.setUsername(userAccount.getUsername());
            }
        } catch (Exception e) {
            // セッション情報の取得に失敗した場合は無視
            // ログ出力は行わない（認証エラーではないため）
        }
    }
}
