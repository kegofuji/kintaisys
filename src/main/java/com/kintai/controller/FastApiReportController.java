package com.kintai.controller;

import com.kintai.service.FastApiReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * FastAPI PDFサービス連携コントローラー
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class FastApiReportController {
    
    @Autowired
    private FastApiReportService fastApiReportService;
    
    /**
     * FastAPIサービス経由でPDFを生成し、ダウンロードURLを返す
     * @param employeeId 従業員ID
     * @param yearMonth 年月（yyyy-MM形式）
     * @return PDFダウンロードURL
     */
    @PostMapping("/pdf/{employeeId}/{yearMonth}")
    public ResponseEntity<Map<String, Object>> generatePdfReport(
            @PathVariable Long employeeId,
            @PathVariable String yearMonth) {
        
        try {
            // FastAPIサービスにPDF生成を依頼
            String pdfUrl = fastApiReportService.generatePdfReport(employeeId, yearMonth);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "PDF生成が完了しました");
            response.put("pdfUrl", pdfUrl);
            response.put("employeeId", employeeId);
            response.put("yearMonth", yearMonth);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "PDF生成に失敗しました: " + e.getMessage());
            response.put("errorCode", "PDF_GENERATION_FAILED");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * PDF生成の状態を確認
     * @param employeeId 従業員ID
     * @param yearMonth 年月
     * @return 生成状態
     */
    @GetMapping("/status/{employeeId}/{yearMonth}")
    public ResponseEntity<Map<String, Object>> getPdfStatus(
            @PathVariable Long employeeId,
            @PathVariable String yearMonth) {
        
        try {
            boolean isGenerated = fastApiReportService.isPdfGenerated(employeeId, yearMonth);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isGenerated", isGenerated);
            response.put("employeeId", employeeId);
            response.put("yearMonth", yearMonth);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "状態確認に失敗しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
