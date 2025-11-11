package com.kintai.controller;

import com.kintai.service.AttendanceReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * 勤怠レポートPDF出力コントローラー
 */
@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceReportController {
    
    @Autowired
    private AttendanceReportService attendanceReportService;
    
    /**
     * 勤怠レポートPDFを生成・ダウンロード
     * @param employeeId 従業員ID
     * @param yearMonth 年月（yyyy-MM形式）
     * @return PDFファイル
     */
    @GetMapping("/report/{employeeId}/{yearMonth}")
    public ResponseEntity<byte[]> generateAttendanceReport(
            @PathVariable Long employeeId,
            @PathVariable String yearMonth) {
        
        try {
            // 年月フォーマットの検証
            validateYearMonthFormat(yearMonth);
            
            // PDF生成
            byte[] pdfBytes = attendanceReportService.generateAttendanceReportPdf(employeeId, yearMonth);
            
            // レスポンスヘッダーを設定
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                String.format("attendance_%d_%s.pdf", employeeId, yearMonth));
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (IllegalArgumentException e) {
            // 従業員が見つからない場合
            return ResponseEntity.notFound().build();
        } catch (DateTimeParseException e) {
            // 年月フォーマットが不正な場合
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            // その他のエラー
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * 年月フォーマットを検証
     * @param yearMonth 年月文字列
     * @throws DateTimeParseException フォーマットが不正な場合
     */
    private void validateYearMonthFormat(String yearMonth) throws DateTimeParseException {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM");
            formatter.parse(yearMonth);
        } catch (DateTimeParseException e) {
            throw new DateTimeParseException("年月フォーマットが不正です。yyyy-MM形式で入力してください。", yearMonth, 0);
        }
    }
}
