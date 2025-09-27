package com.kintai.service;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import com.kintai.util.BusinessDayCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import com.kintai.entity.UserAccount;

import java.time.LocalDate;
import java.util.List;

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
    
    private static final int FALLBACK_ANNUAL_PAID_LEAVE_DAYS = 10;

    @Autowired
    private BusinessDayCalculator businessDayCalculator;
    
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
            enforceBusinessDaysOnly(startDate, endDate);

            // 4. 重複申請チェック
            if (vacationRequestRepository.existsOverlappingRequest(employeeId, startDate, endDate)) {
                throw new VacationException(
                        VacationException.DUPLICATE_REQUEST, 
                        "既に申請済みの日付を含んでいます");
            }

            // 6. 付与基準日の判定（当年1/1を使用）
            LocalDate startOfYear = LocalDate.now().withMonth(1).withDayOfMonth(1);
            LocalDate grantDate = startOfYear;

            // 7. 申請日数（営業日換算。土日除外、祝日未考慮）
            int days = calculateVacationDays(startDate, endDate);

            // 8. 残日数超過の禁止（当年内・付与後の承認済み消化分を控除）
            LocalDate endOfYear = LocalDate.now().withMonth(12).withDayOfMonth(31);
            Integer usedDays = vacationRequestRepository
                    .sumApprovedDaysInPeriod(employeeId, grantDate, endOfYear);
            if (usedDays == null) usedDays = 0;
            int adjustment = employee.getPaidLeaveAdjustment();
            int baseDays = resolveBaseDays(employee);
            int remaining = Math.max(0, baseDays + adjustment - usedDays);
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
            data.setRejectionComment(savedRequest.getRejectionComment());
            
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
            if (status != VacationStatus.REJECTED) {
                vacationRequest.setRejectionComment(null);
            }
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
            data.setRejectionComment(savedRequest.getRejectionComment());
            
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
     * 有給申請を取消
     * @param vacationId 申請ID
     * @param employeeId 従業員ID
     * @return 取消レスポンス
     */
    public VacationRequestDto cancelVacationRequest(Long vacationId, Long employeeId) {
        try {
            VacationRequest vacationRequest = vacationRequestRepository.findById(vacationId)
                    .orElseThrow(() -> new VacationException(
                            VacationException.VACATION_NOT_FOUND,
                            "申請が見つかりません"));

            if (!vacationRequest.getEmployeeId().equals(employeeId)) {
                throw new VacationException(VacationException.INVALID_REQUEST, "自身の申請のみ取消できます");
            }

            if (vacationRequest.getStatus() == VacationStatus.REJECTED
                    || vacationRequest.getStatus() == VacationStatus.CANCELLED) {
                throw new VacationException(VacationException.VACATION_NOT_CANCELLABLE, "取消できない状態です");
            }

            vacationRequest.setStatus(VacationStatus.CANCELLED);
            vacationRequest.setRejectionComment(null);
            VacationRequest savedRequest = vacationRequestRepository.save(vacationRequest);

            VacationRequestDto.VacationData data = new VacationRequestDto.VacationData(
                    savedRequest.getVacationId(),
                    savedRequest.getEmployeeId(),
                    savedRequest.getStartDate(),
                    savedRequest.getEndDate(),
                    savedRequest.getDays(),
                    savedRequest.getStatus().name()
            );
            data.setRejectionComment(savedRequest.getRejectionComment());

            VacationRequestDto response = new VacationRequestDto(true, "申請を取消しました", data);
            setUserInfoToResponse(response);
            return response;
        } catch (VacationException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new VacationException("INTERNAL_ERROR", "有給申請の取消に失敗しました: " + e.getMessage());
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
            int baseDays = resolveBaseDays(employee);
            int remaining = baseDays + adjustment - usedDays;
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

    private void enforceBusinessDaysOnly(LocalDate startDate, LocalDate endDate) {
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            if (!businessDayCalculator.isBusinessDay(cursor)) {
                throw new VacationException(
                        VacationException.INVALID_DATE_RANGE,
                        "土日祝日は有給申請できません: " + cursor);
            }
            cursor = cursor.plusDays(1);
        }
    }

    private int resolveBaseDays(Employee employee) {
        Integer base = employee.getPaidLeaveBaseDays();
        if (base == null) {
            return FALLBACK_ANNUAL_PAID_LEAVE_DAYS;
        }
        return base;
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
