package com.kintai.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * FastAPI連携用のAPI Key認証フィルター
 */
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    
    @Value("${pdf.service.api-key:test-key}")
    private String expectedApiKey;
    
    @Value("${pdf.service.require-auth:false}")
    private boolean requireAuth;
    
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, 
                                  @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        // PDF APIエンドポイントのみを対象とする
        if (request.getRequestURI().startsWith("/api/pdf/")) {
            String apiKey = request.getHeader("X-API-Key");
            
            // 認証が必要でない場合はスキップ
            if (!requireAuth) {
                filterChain.doFilter(request, response);
                return;
            }
            
            // API Keyが一致しない場合は401を返す
            if (apiKey == null || !expectedApiKey.equals(apiKey)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Invalid API Key\"}");
                return;
            }
            
            // 認証成功時はシステムユーザーとして認証
            Authentication auth = new UsernamePasswordAuthenticationToken(
                "pdf-service", 
                null, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_SYSTEM"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
}
