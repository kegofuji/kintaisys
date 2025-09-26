package com.kintai.util;

import org.springframework.stereotype.Component;

/**
 * パスワード強度チェック用バリデーター
 */
@Component
public class PasswordValidator {
    
    // パスワードポリシー定数
    private static final int MIN_LENGTH = 4;
    
    /**
     * パスワードの強度を検証
     * @param password 検証するパスワード
     * @param employeeCode 社員コード（重複チェック用）
     * @return 検証結果
     */
    public PasswordValidationResult validate(String password, String employeeCode) {
        if (password == null || password.isEmpty()) {
            return new PasswordValidationResult(false, "パスワードは必須です。");
        }
        
        // 長さチェック
        if (password.length() < MIN_LENGTH) {
            return new PasswordValidationResult(false, 
                String.format("パスワードは%d文字以上で入力してください。", MIN_LENGTH));
        }
        
        // 社員IDとの重複チェック
        if (employeeCode != null && !employeeCode.isEmpty() && password.equals(employeeCode)) {
            return new PasswordValidationResult(false, "パスワードに社員IDと同じ文字列は使用できません。");
        }
        
        return new PasswordValidationResult(true, "パスワードは有効です。");
    }
    
    /**
     * パスワード検証結果を保持するクラス
     */
    public static class PasswordValidationResult {
        private final boolean valid;
        private final String message;
        
        public PasswordValidationResult(boolean valid, String message) {
            this.valid = valid;
            this.message = message;
        }
        
        public boolean isValid() {
            return valid;
        }
        
        public String getMessage() {
            return message;
        }
    }
}
