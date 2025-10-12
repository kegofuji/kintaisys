package com.kintai.service;

import com.itextpdf.html2pdf.HtmlConverter;
import com.kintai.dto.AttendanceReportDto;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * 勤怠レポートPDF生成サービス
 */
@Service
public class AttendanceReportService {
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    /**
     * 勤怠レポートPDFを生成
     * @param employeeId 従業員ID
     * @param yearMonth 年月（yyyy-MM形式）
     * @return PDFバイト配列
     */
    public byte[] generateAttendanceReportPdf(Long employeeId, String yearMonth) {
        // 従業員情報を取得
        Optional<Employee> employeeOpt = employeeRepository.findById(employeeId);
        if (employeeOpt.isEmpty()) {
            throw new IllegalArgumentException("従業員が見つかりません: " + employeeId);
        }
        
        Employee employee = employeeOpt.get();
        
        // 勤怠記録を取得
        String[] parts = yearMonth.split("-");
        int year = Integer.parseInt(parts[0]);
        int month = Integer.parseInt(parts[1]);
        List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(employeeId, year, month);
        
        // HTMLを生成
        String html = generateHtml(employee, yearMonth, records);
        
        // PDFに変換
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            HtmlConverter.convertToPdf(html, outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF生成に失敗しました", e);
        }
    }
    
    /**
     * HTMLを生成
     */
    private String generateHtml(Employee employee, String yearMonth, List<AttendanceRecord> records) {
        StringBuilder html = new StringBuilder();
        
        // 年月をフォーマット
        String formattedYearMonth = formatYearMonth(yearMonth);
        
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', sans-serif; margin: 20px; }");
        html.append(".header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }");
        html.append(".company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }");
        html.append(".report-title { font-size: 18px; margin-bottom: 5px; }");
        html.append(".employee-info { font-size: 14px; margin-bottom: 20px; }");
        html.append(".table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }");
        html.append(".table th, .table td { border: 1px solid #333; padding: 8px; text-align: center; }");
        html.append(".table th { background-color: #f0f0f0; font-weight: bold; }");
        html.append(".footer { margin-top: 50px; display: flex; justify-content: space-between; }");
        html.append(".approval-section { text-align: center; }");
        html.append(".approval-box { border: 1px solid #333; width: 200px; height: 80px; margin: 0 auto; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        
        // ヘッダー
        html.append("<div class='header'>");
        html.append("<div class='company-name'>KintaiSystem</div>");
        html.append("<div class='report-title'>勤怠レポート</div>");
        html.append("<div class='employee-info'>");
        html.append("対象年月: ").append(formattedYearMonth).append("<br>");
        // 社員名の表示ロジック（employeeCodeを使用）
        html.append("社員名: ").append(employee.getEmployeeCode()).append("<br>");
        html.append("社員コード: ").append(employee.getEmployeeCode());
        html.append("</div>");
        html.append("</div>");
        
        // テーブル
        html.append("<table class='table'>");
        html.append("<thead>");
        html.append("<tr>");
        html.append("<th>日付</th>");
        html.append("<th>出勤時刻</th>");
        html.append("<th>退勤時刻</th>");
        html.append("<th>勤怠区分</th>");
        html.append("<th>残業時間</th>");
        html.append("<th>遅刻分</th>");
        html.append("<th>早退分</th>");
        html.append("</tr>");
        html.append("</thead>");
        html.append("<tbody>");
        
        if (records.isEmpty()) {
            html.append("<tr>");
            html.append("<td colspan='7' style='text-align: center;'>データなし</td>");
            html.append("</tr>");
        } else {
            for (AttendanceRecord record : records) {
                AttendanceReportDto dto = new AttendanceReportDto(record, 
                    employee.getEmployeeCode(), 
                    employee.getEmployeeCode());
                
                html.append("<tr>");
                html.append("<td>").append(dto.getAttendanceDate()).append("</td>");
                html.append("<td>").append(dto.getClockInTime()).append("</td>");
                html.append("<td>").append(dto.getClockOutTime()).append("</td>");
                html.append("<td>").append(dto.getAttendanceStatus()).append("</td>");
                html.append("<td>").append(dto.getOvertimeHours()).append("</td>");
                html.append("<td>").append(dto.getLateMinutes()).append("</td>");
                html.append("<td>").append(dto.getEarlyLeaveMinutes()).append("</td>");
                html.append("</tr>");
            }
        }
        
        html.append("</tbody>");
        html.append("</table>");
        
        // フッター
        html.append("<div class='footer'>");
        html.append("<div>ページ 1</div>");
        html.append("<div class='approval-section'>");
        html.append("<div>承認欄</div>");
        html.append("<div class='approval-box'></div>");
        html.append("</div>");
        html.append("</div>");
        
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }
    
    /**
     * 年月をフォーマット
     */
    private String formatYearMonth(String yearMonth) {
        try {
            LocalDate date = LocalDate.parse(yearMonth + "-01", DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            return date.format(DateTimeFormatter.ofPattern("yyyy年M月"));
        } catch (Exception e) {
            return yearMonth;
        }
    }
}
