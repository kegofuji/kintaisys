package com.kintai.dto;

/**
 * レポート生成レスポンスDTO
 */
public class ReportGenerateResponse {
    
    private boolean success;
    private String pdfUrl;
    private String message;

    // デフォルトコンストラクタ
    public ReportGenerateResponse() {
    }

    public ReportGenerateResponse(boolean success, String pdfUrl, String message) {
        this.success = success;
        this.pdfUrl = pdfUrl;
        this.message = message;
    }

    public static ReportGenerateResponse success(String pdfUrl) {
        return new ReportGenerateResponse(true, pdfUrl, null);
    }

    public static ReportGenerateResponse failure(String message) {
        return new ReportGenerateResponse(false, null, message);
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getPdfUrl() {
        return pdfUrl;
    }

    public void setPdfUrl(String pdfUrl) {
        this.pdfUrl = pdfUrl;
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
                "success=" + success +
                ", pdfUrl='" + pdfUrl + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}
