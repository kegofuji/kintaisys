package com.kintai.controller;

import com.kintai.dto.ReportGenerateRequest;
import com.kintai.dto.ReportGenerateResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * レポート生成コントローラー
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    /**
     * 勤怠レポートPDFを生成
     * 現在はFastAPI連携を廃止しているため、未実装として応答する。
     *
     * @param request レポート生成リクエスト
     * @return 生成状況レスポンス
     */
    @PostMapping("/generate")
    public ResponseEntity<ReportGenerateResponse> generateReport(@RequestBody ReportGenerateRequest request) {
        try {
            // リクエストの検証
            validateRequest(request);
            // FastAPI連携を廃止したため、現在はPDF生成を行わない
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ReportGenerateResponse.failure("PDF生成機能は現在利用できません"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ReportGenerateResponse.failure("リクエストが無効です: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ReportGenerateResponse.failure("PDF生成処理中にエラーが発生しました: " + e.getMessage()));
        }
    }
    
    /**
     * リクエストを検証
     * @param request リクエスト
     * @throws IllegalArgumentException 検証エラーの場合
     */
    private void validateRequest(ReportGenerateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("リクエストがnullです");
        }
        
        if (request.getEmployeeId() == null || request.getEmployeeId() <= 0) {
            throw new IllegalArgumentException("従業員IDが無効です");
        }
        
        if (request.getYearMonth() == null || request.getYearMonth().trim().isEmpty()) {
            throw new IllegalArgumentException("年月が指定されていません");
        }
        
        // 年月フォーマットの検証
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM");
            formatter.parse(request.getYearMonth());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("年月フォーマットが不正です。yyyy-MM形式で入力してください。");
        }
    }
}
