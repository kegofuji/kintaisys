package com.kintai.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web設定クラス
 * SPA ルーティングのためのフォワード設定を追加
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // /history/YYYYMM 直リンクを SPA の index.html にフォワード
        registry.addViewController("/history/{yyyymm:\\d{6}}")
                .setViewName("forward:/index.html");
    }
}
