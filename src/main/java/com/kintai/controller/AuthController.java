package com.kintai.controller;

import com.kintai.entity.UserAccount;
import com.kintai.entity.AdminAccount;
import com.kintai.service.AuthService;
import com.kintai.util.PasswordValidator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    /**
     * ログイン
     * @param loginRequest ログインリクエスト
     * @param request HTTPリクエスト
     * @return ログイン結果
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest loginRequest, 
                                                   HttpServletRequest request) {
        try {
            // 統合認証（従業員または管理者）
            AuthService.AuthResult authResult = authService.authenticate(loginRequest.getUsername(), loginRequest.getPassword());
            
            if (authResult.isSuccess()) {
                // セッション作成
                HttpSession session = request.getSession(true);
                
                String role = authResult.getRole();
                
                if ("ADMIN".equals(role)) {
                    // 管理者の場合
                    AdminAccount admin = authResult.getAdmin();
                    session.setAttribute("user", admin);
                    session.setAttribute("username", admin.getUsername());
                    session.setAttribute("role", "ADMIN");
                    session.setAttribute("adminId", admin.getAdminId());
                    
                    // Spring Securityの認証コンテキストを作成
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                        admin,
                        admin.getPassword(),
                        admin.getAuthorities()
                    );
                    
                    // SecurityContextを作成して設定
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                    
                    // セッションにSecurityContextを保存
                    session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
                    
                    // レスポンス作成
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("message", "ログインに成功しました");
                    response.put("username", admin.getUsername());
                    response.put("role", "ADMIN");
                    response.put("adminId", admin.getAdminId());
                    response.put("sessionId", session.getId());
                    
                    return ResponseEntity.ok(response);
                } else if ("EMPLOYEE".equals(role)) {
                    // 従業員の場合
                    UserAccount user = authResult.getEmployee();
                    session.setAttribute("user", user);
                    session.setAttribute("username", user.getUsername());
                    session.setAttribute("role", "EMPLOYEE");
                    session.setAttribute("employeeId", user.getEmployeeId());
                    
                    // Spring Securityの認証コンテキストを作成
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                        user,
                        user.getPassword(),
                        user.getAuthorities()
                    );
                    
                    // SecurityContextを作成して設定
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                    
                    // セッションにSecurityContextを保存
                    session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
                    
                    // レスポンス作成
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("message", "ログインに成功しました");
                    response.put("username", user.getUsername());
                    response.put("role", "EMPLOYEE");
                    response.put("employeeId", user.getEmployeeId());
                    response.put("sessionId", session.getId());
                    
                    return ResponseEntity.ok(response);
                }
            }
            
            // 認証失敗
            Map<String, Object> response = new HashMap<>();
            String role = authResult.getRole();
            
            if ("RETIRED".equals(role)) {
                response.put("success", false);
                response.put("message", "退職者はログインできません");
            } else {
                response.put("success", false);
                response.put("message", "ユーザー名またはパスワードが正しくありません");
            }
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "ログイン処理中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * ログアウト
     * @param request HTTPリクエスト
     * @return ログアウト結果
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            
            // セキュリティコンテキストをクリア
            SecurityContextHolder.clearContext();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "ログアウトしました");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "ログアウト処理中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 現在のセッション情報を取得
     * @param request HTTPリクエスト
     * @return セッション情報
     */
    @GetMapping("/session")
    public ResponseEntity<Map<String, Object>> getSession(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            
            if (session != null && session.getAttribute("user") != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("authenticated", true);
                response.put("username", session.getAttribute("username"));
                response.put("role", session.getAttribute("role"));
                response.put("employeeId", session.getAttribute("employeeId"));
                response.put("sessionId", session.getId());
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("authenticated", false);
                response.put("message", "セッションが無効です");
                
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("authenticated", false);
            response.put("message", "セッション確認中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * パスワード検証エンドポイント
     * @param passwordRequest パスワード検証リクエスト
     * @return 検証結果
     */
    @PostMapping("/validate-password")
    public ResponseEntity<Map<String, Object>> validatePassword(@Valid @RequestBody PasswordValidationRequest passwordRequest) {
        try {
            PasswordValidator.PasswordValidationResult result = authService.validatePassword(
                passwordRequest.getPassword(), 
                passwordRequest.getEmployeeCode()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("valid", result.isValid());
            response.put("message", result.getMessage());
            
            if (result.isValid()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("valid", false);
            response.put("message", "パスワード検証中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * ユーザー登録
     * @param registerRequest 登録リクエスト
     * @return 登録結果
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // ユーザー登録処理
            UserAccount userAccount = authService.registerUser(
                registerRequest.getUsername(),
                registerRequest.getPassword(),
                registerRequest.getEmployeeId(),
                registerRequest.getRole()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "ユーザー登録が完了しました");
            response.put("username", userAccount.getUsername());
            response.put("employeeId", userAccount.getEmployeeId());
            response.put("role", userAccount.getRole().name());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "ユーザー登録中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * ログインリクエスト用の内部クラス
     */
    public static class LoginRequest {
        private String username;
        private String password;
        
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
    }
    
    /**
     * パスワード検証リクエスト用の内部クラス
     */
    public static class PasswordValidationRequest {
        private String password;
        private String employeeCode;
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
        
        public String getEmployeeCode() {
            return employeeCode;
        }
        
        public void setEmployeeCode(String employeeCode) {
            this.employeeCode = employeeCode;
        }
    }
    
    /**
     * ユーザー登録リクエスト用の内部クラス
     */
    public static class RegisterRequest {
        private String username;
        private String password;
        private Long employeeId;
        private String role;
        private String employeeCode;
        
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
        
        public Long getEmployeeId() {
            return employeeId;
        }
        
        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
        
        public String getRole() {
            return role;
        }
        
        public void setRole(String role) {
            this.role = role;
        }
        
        public String getEmployeeCode() {
            return employeeCode;
        }
        
        public void setEmployeeCode(String employeeCode) {
            this.employeeCode = employeeCode;
        }
    }
}
