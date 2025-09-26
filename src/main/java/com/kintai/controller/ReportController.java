package com.kintai.controller;

import com.kintai.dto.ReportGenerateRequest;
import com.kintai.dto.ReportGenerateResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * レポート生成コントローラー
 * FastAPIマイクロサービスとの連携
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${pdf.service.url:http://localhost:8081}")
    private String pdfServiceUrl;
    
    @Value("${pdf.service.api-key:test-key}")
    private String pdfServiceApiKey;
    
    @Value("${pdf.service.require-auth:false}")
    private boolean requireAuth;
    
    /**
     * 勤怠レポートPDFを生成
     * @param request レポート生成リクエスト
     * @return 生成されたPDFのURL
     */
    @PostMapping("/generate")
    public ResponseEntity<ReportGenerateResponse> generateReport(@RequestBody ReportGenerateRequest request) {
        try {
            // リクエストの検証
            validateRequest(request);
            
            // FastAPIサービスにリクエストを転送
            String fastApiUrl = pdfServiceUrl + "/reports/pdf";
            
            // リクエストボディを作成
            ReportGenerateRequest fastApiRequest = new ReportGenerateRequest();
            fastApiRequest.setEmployeeId(request.getEmployeeId());
            fastApiRequest.setYearMonth(request.getYearMonth());
            
            // HTTPヘッダーを設定
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // 認証が必要な場合はAuthorizationヘッダーを追加
            if (requireAuth) {
                headers.set("Authorization", "Bearer " + pdfServiceApiKey);
            }
            
            HttpEntity<ReportGenerateRequest> entity = new HttpEntity<>(fastApiRequest, headers);
            
            // FastAPIサービスにリクエストを送信
            ResponseEntity<ReportGenerateResponse> response = restTemplate.exchange(
                fastApiUrl,
                HttpMethod.POST,
                entity,
                ReportGenerateResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return ResponseEntity.ok(response.getBody());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ReportGenerateResponse("PDF生成に失敗しました"));
            }
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(new ReportGenerateResponse("リクエストが無効です: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ReportGenerateResponse("PDF生成サービスとの通信に失敗しました: " + e.getMessage()));
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
