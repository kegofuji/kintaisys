# 勤怠管理システム

社内向けの勤怠・有給申請を扱う Spring Boot ベースの Web アプリケーションです。ログイン後は SPA（静的ファイル）で勤怠入力・履歴閲覧・管理者承認などを行います。

## 主な機能

- 出退勤打刻、履歴表示、月次申請
- 有給申請／承認フロー（休日は自動除外）
- 打刻修正申請と管理者承認
- 管理者ダッシュボード（従業員管理・レポート）

## 技術スタック

- Java 17 / Spring Boot 3
- MySQL 8.x
- フロント: 素の JS + Bootstrap（`src/main/resources/static`）
- ビルド: Maven

## ローカル開発環境

```bash
# 依存関係の取得とテスト
mvn clean test

# 開発プロファイルで起動（H2 メモリ DB）
mvn spring-boot:run

# ブラウザで http://localhost:8080/login を開く
```

MySQL を使用したい場合は `SPRING_PROFILES_ACTIVE=prod` および `DATABASE_URL` / `DB_USERNAME` / `DB_PASSWORD` を環境変数で指定してください。

## デプロイ

Render を利用したデプロイ手順を `RENDER_DEPLOYMENT.md` にまとめています。CI/CD は Render の自動デプロイ（GitHub 連携）を想定しています。

## ディレクトリ構成メモ

| パス | 説明 |
| --- | --- |
| `src/main/java` | Spring Boot アプリケーションコード |
| `src/main/resources/static` | SPA の HTML / JS / CSS |
| `src/main/resources/application*.yml` | プロファイル別設定 |
| `scripts/` | 運用向けスクリプト（テスト、DB 初期化など） |

## ライセンス

社内利用を想定しているため、必要に応じて確認してください。

