package com.kintai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;

/**
 * FastAPI PDFサービス連携サービス
 */
@Service
public class FastApiReportService {
    
    @Value("${fastapi.pdf.service.url:http://localhost:8081}")
    private String fastApiBaseUrl;
    
    @Value("${fastapi.pdf.service.api-key:test-key}")
    private String apiKey;
    
    @Autowired
    private RestTemplate restTemplate;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * FastAPIサービスにPDF生成を依頼
     * @param employeeId 従業員ID
     * @param yearMonth 年月
     * @return PDFダウンロードURL
     */
    public String generatePdfReport(Long employeeId, String yearMonth) {
        try {
            // リクエストボディを作成
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("employeeId", employeeId);
            requestBody.put("yearMonth", yearMonth);
            
            // ヘッダーを設定
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            // FastAPIサービスにリクエストを送信
            String url = fastApiBaseUrl + "/reports/pdf";
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                return (String) responseBody.get("url");
            } else {
                throw new RuntimeException("FastAPIサービスからのレスポンスが不正です");
            }
            
        } catch (HttpClientErrorException e) {
            // 4xxエラー（クライアントエラー）
            String errorMessage = extractErrorMessage(e.getResponseBodyAsString());
            throw new RuntimeException("PDF生成リクエストエラー: " + errorMessage, e);
            
        } catch (HttpServerErrorException e) {
            // 5xxエラー（サーバーエラー）
            String errorMessage = extractErrorMessage(e.getResponseBodyAsString());
            throw new RuntimeException("PDF生成サーバーエラー: " + errorMessage, e);
            
        } catch (ResourceAccessException e) {
            // 接続エラー
            throw new RuntimeException("FastAPIサービスに接続できません。サービスが起動しているか確認してください。", e);
            
        } catch (Exception e) {
            throw new RuntimeException("PDF生成中に予期しないエラーが発生しました: " + e.getMessage(), e);
        }
    }
    
    /**
     * PDFが生成済みかどうかを確認
     * @param employeeId 従業員ID
     * @param yearMonth 年月
     * @return 生成済みかどうか
     */
    public boolean isPdfGenerated(Long employeeId, String yearMonth) {
        try {
            // ファイル名を生成
            String filename = String.format("report_%d_%s.pdf", employeeId, yearMonth.replace("-", ""));
            
            // ヘッダーを設定
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            // FastAPIサービスでファイルの存在確認
            String url = fastApiBaseUrl + "/reports/tmp/" + filename;
            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.HEAD, request, String.class);
            
            return response.getStatusCode() == HttpStatus.OK;
            
        } catch (Exception e) {
            // エラーの場合は生成されていないとみなす
            return false;
        }
    }
    
    /**
     * エラーメッセージを抽出
     * @param responseBody レスポンスボディ
     * @return エラーメッセージ
     */
    private String extractErrorMessage(String responseBody) {
        try {
            if (responseBody != null && !responseBody.isEmpty()) {
                Map<String, Object> errorResponse = objectMapper.readValue(responseBody, Map.class);
                Object detail = errorResponse.get("detail");
                if (detail != null) {
                    return detail.toString();
                }
            }
        } catch (Exception e) {
            // JSON解析に失敗した場合は元のレスポンスボディを返す
        }
        return responseBody != null ? responseBody : "不明なエラー";
    }
}
