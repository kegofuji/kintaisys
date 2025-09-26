package com.kintai.dto;

/**
 * レポート生成レスポンスDTO
 */
public class ReportGenerateResponse {
    
    private String url;
    private String message;
    
    // デフォルトコンストラクタ
    public ReportGenerateResponse() {
    }
    
    // 成功用コンストラクタ
    public ReportGenerateResponse(String url) {
        this.url = url;
    }
    
    // エラー用コンストラクタ
    public ReportGenerateResponse(String url, String message) {
        this.url = url;
        this.message = message;
    }
    
    // ゲッター・セッター
    public String getUrl() {
        return url;
    }
    
    public void setUrl(String url) {
        this.url = url;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    @Override
    public String toString() {
        return "ReportGenerateResponse{" +
                "url='" + url + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}
