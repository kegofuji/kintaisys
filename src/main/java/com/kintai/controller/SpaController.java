package com.kintai.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA向けフォールバックコントローラ。
 * APIや静的アセット以外のパスはすべて index.html を返す。
 */
// @Controller
public class SpaController {

    /**
     * ルートおよび未定義のフロントエンドパスを index.html にフォワードする。
     *
     * 除外対象:
     * - /api/**
     * - /h2-console/**
     * - /css/**, /js/**, /images/**, /favicon.ico, /static/**
     */
    @GetMapping({
        "/",
        // 末尾セグメントにドット(拡張子)を含むものは除外し、API等も除外
        "/{path:^(?!(?:api|h2-console|css|js|images|favicon\\.ico|static)$)[^\\.]*$}",
        "/**/{path:^(?!(?:api|h2-console|css|js|images|favicon\\.ico|static)$)[^\\.]*$}"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}


