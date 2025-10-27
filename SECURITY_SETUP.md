# Spring Security設定ドキュメント

## 概要
Spring Securityの設定をプロファイル別に実装し、開発環境（dev）と本番環境（prod）で異なる認証・認可設定を提供します。

## プロファイル設定

### devプロファイル（開発環境）
- **認証**: なし（permitAll）
- **CSRF**: 無効
- **データベース**: H2（メモリ）
- **用途**: 開発・テスト環境

### prodプロファイル（本番環境）
- **認証**: ID/パスワード認証必須
- **認可**: ロールベース制御（EMPLOYEE, ADMIN）
- **CSRF**: 有効
- **CSRF除外**: `/api/reports/**`（PDF ダウンロード用）
- **データベース**: MySQL
- **用途**: 本番環境

## 実装内容

### 1. SecurityConfig.java
- プロファイル別のSecurityFilterChainを実装
- dev: 認証なし、CSRF無効
- prod: 認証必須、ロールベース制御、CSRF有効

### 2. CustomUserDetailsService.java
- Spring SecurityのUserDetailsServiceを実装
- UserAccountエンティティを使用した認証

### 3. application.yml
- プロファイル別の設定を統合
- dev/prodプロファイルの自動切替

### 4. login.html
- ログインページ
- エラーメッセージ表示機能

## エンドポイント権限設定

### prodプロファイルでの権限制御

| エンドポイント | 権限 | 説明 |
|---|---|---|
| `/css/**`, `/js/**`, `/images/**`, `/favicon.ico` | permitAll | 静的リソース |
| `/h2-console/**` | denyAll | H2コンソール（本番では無効） |
| `/api/auth/**` | permitAll | 認証関連API |
| `/api/attendance/**`, `/api/leave/**`, `/api/work-pattern-change/**`, `/api/holiday/**` | ROLE_EMPLOYEE | 従業員用API |
| `/api/admin/**` | ROLE_ADMIN | 管理者用API |
| `/api/reports/**` | authenticated | PDF レポート生成（いずれのロールでも可） |
| `/api/**` | authenticated | 上記以外の API |
| `/login`, `/logout` | permitAll | 認証ページ |
| その他 | permitAll | フロントエンドページ |

> 現状 `/api/attendance/health` も `ROLE_EMPLOYEE` が必要です。Render 等で外部ヘルスチェックを行いたい場合は、公開ヘルスエンドポイント（例: `/api/health`）を追加し、`SecurityConfig` 側で `permitAll` を設定してください。

## 使用方法

### プロファイル切替

```bash
# devプロファイルで起動
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# prodプロファイルで起動
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### テスト用curlコマンド

```bash
# devプロファイル（認証なし）
curl http://localhost:8080/api/attendance/health
# 期待値: 200 OK

# prodプロファイル（認証必須）
curl http://localhost:8080/api/attendance/health
# 期待値: 401/403（ログイン前）

# ログイン（prodプロファイル）
curl -c cookies.txt -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"pass"}'

curl -b cookies.txt http://localhost:8080/api/attendance/health
# 期待値: 200 OK（ログイン済みセッションを送る場合）
```

## 環境変数設定

### prodプロファイル用環境変数

```bash
# データベース設定
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=jdbc:mysql://localhost:3306/kintai?useSSL=false&serverTimezone=Asia/Tokyo&characterEncoding=UTF-8&allowPublicKeyRetrieval=true&useUnicode=true
DB_USERNAME=kintai
DB_PASSWORD=kintai
SPRING_DATASOURCE_PASSWORD=kintai     # root${DB_PASSWORD} 形式を回避したい場合
SPRING_FLYWAY_PASSWORD=kintai         # Flyway も同値で上書き

# タイムゾーン
TZ=Asia/Tokyo

# サーバーポート（Render など PaaS では自動付与される）
PORT=8080
```

## セキュリティ機能

### 1. パスワード暗号化
- BCryptPasswordEncoderを使用
- 自動的にソルト付きハッシュ化

### 2. セッション管理
- 最大1セッション制限
- セッション固定攻撃対策
- 自動タイムアウト

### 3. CSRF保護
- 本番環境で有効
- APIエンドポイントは除外設定可能

### 4. ロールベース認可
- EMPLOYEE: 従業員用機能
- ADMIN: 管理者用機能

## トラブルシューティング

### よくある問題

1. **認証エラー**: ログインできない
   - 確認: ユーザー名・パスワードの正確性
   - 確認: プロファイル設定（dev/prod）

2. **CSRFエラー**: 403 Forbidden
   - 解決策: CSRFトークンを取得して送信
   - 解決策: devプロファイルでテスト

### ログ確認

```bash
# アプリケーションログ
tail -f app.log

# サーバーログ
tail -f server.log
```

## 今後の拡張

1. **OAuth2認証**: 外部認証プロバイダー連携
2. **JWT認証**: ステートレス認証
3. **多要素認証**: TOTP対応
4. **監査ログ**: 認証・認可イベントの記録

## 関連ファイル

- `src/main/java/com/kintai/config/SecurityConfig.java`
- `src/main/java/com/kintai/config/CustomUserDetailsService.java`
- `src/main/resources/application.yml`
- `src/main/resources/static/login.html`
