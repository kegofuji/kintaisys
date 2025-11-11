# 勤怠管理システム

社内向けの勤怠・有給申請を扱う Spring Boot ベースの Web アプリケーションです。ログイン後は SPA（静的ファイル）で勤怠入力・履歴閲覧・管理者承認などを行います。

## 主な機能

### 基本勤怠機能
- **出退勤打刻**: リアルタイムでの出勤・退勤時刻記録
- **勤怠履歴表示**: 日別・月別の勤怠記録閲覧（カレンダー表示対応）
- **勤務時間計算**: 自動的な勤務時間・残業時間・深夜勤務時間の算出
- **遅刻・早退・欠勤管理**: 勤怠ステータスの自動判定と記録

### 申請・承認機能
- **有給申請**: 期間指定での有給休暇申請（休日自動除外）
- **有給承認フロー**: 管理者による申請の承認・却下処理
- **打刻修正申請**: 勤怠記録の修正申請と管理者承認

### 管理者機能
- **従業員管理**: 社員一覧表示と基本情報管理
- **申請管理**: 未承認の有給申請・修正申請の一覧表示と処理

### セキュリティ機能
- **認証・認可**: セッション管理によるユーザー認証
- **CSRF保護**: クロスサイトリクエストフォージェリ対策
- **権限管理**: 一般ユーザーと管理者の権限分離

## 技術スタック

### バックエンド
- **Java 17** / **Spring Boot 3.2.x**
- **Spring Security** (認証・認可)
- **Spring Data JPA** (データアクセス)
- **MySQL 8.x** (本番環境) / **H2** (開発環境)
- **Flyway** (データベースマイグレーション)

### フロントエンド
- **Vanilla JavaScript** (ES6+)
- **Bootstrap 5** (UI フレームワーク)
- **SPA (Single Page Application)** アーキテクチャ

### 開発・運用
- **Maven** (ビルドツール)
- **Docker** (コンテナ化)
- **Render** (デプロイプラットフォーム)

## ローカル開発環境

```bash
# 依存関係の取得とテスト
mvn clean test

# 開発プロファイルで起動（H2 メモリ DB）
mvn spring-boot:run

# ブラウザで http://localhost:8080/login を開く
```

MySQL を使用したい場合は `SPRING_PROFILES_ACTIVE=prod` および `DATABASE_URL` / `DB_USERNAME` / `DB_PASSWORD` を環境変数で指定してください。

## 初期データとアカウント

`@Profile("!test")` で有効な `DataInitializer` が起動時にサンプルデータを投入します（本番プロファイルを含む）。

| ロール | ユーザーID | パスワード | 備考 |
| --- | --- | --- | --- |
| 従業員 | `emp1` | `pass` | 勤怠入力・履歴確認用のサンプルアカウント |
| 管理者 | `admin` | `pass` | 申請承認・従業員管理用のサンプルアカウント |

> 実運用で既存データを扱う場合は、`DataInitializer` を無効化するか専用プロファイルに限定してからデプロイしてください。そのまま本番で起動すると既存データが削除されます。

## デプロイ

Render を利用したデプロイ手順を `RENDER_DEPLOYMENT.md` にまとめています。CI/CD は Render の自動デプロイ（GitHub 連携）を想定しています。

プロダクションプロファイルで稼働させる場合は、最低限以下の環境変数を設定してください。

| Key | Value | 備考 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` | プロファイル切替 |
| `DATABASE_URL` | `<JDBC URL>` | `jdbc:mysql://…` 形式 |
| `DB_USERNAME` | `<DBユーザー名>` | MySQL 接続ユーザー |
| `DB_PASSWORD` | `<DBパスワード>` | デフォルト設定では `root${DB_PASSWORD}` 形式で展開されるため、`root` で始まらないパスワードを使う場合は `SPRING_DATASOURCE_PASSWORD` / `SPRING_FLYWAY_PASSWORD` で上書きする |
| `TZ` | `Asia/Tokyo` | Java のシステムタイムゾーンを固定 |

Flyway を起動時に実行したい場合は `SPRING_FLYWAY_ENABLED=true` を追加してください。

## データベース設計

### 主要テーブル
- **employees**: 従業員情報（従業員ID、コード、基準休暇日数など）
- **attendance_records**: 勤怠記録（出退勤時刻、遅刻・早退・残業時間等）
- **leave_requests**: 休暇申請（休暇種別、期間、取得単位、承認状況等）
- **leave_balances**: 休暇残数（種別ごとの総日数・使用日数・残日数）
- **adjustment_requests**: 打刻修正申請（修正内容、理由、承認状況等）
- **approvals**: 承認履歴（対象種別、対象ID、承認者、コメント等）
- **user_accounts**: ユーザーアカウント（ログイン認証用）
- **admins**: 管理者アカウント

### 勤怠ステータス
- **NORMAL**: 正常勤務
- **LATE**: 遅刻
- **EARLY_LEAVE**: 早退
- **LATE_AND_EARLY_LEAVE**: 遅刻・早退
- **OVERTIME**: 残業
- **NIGHT_SHIFT**: 深夜勤務

## ディレクトリ構成

| パス | 説明 |
| --- | --- |
| `src/main/java/com/kintai/` | Spring Boot アプリケーションコード |
| `├── controller/` | REST API コントローラー |
| `├── service/` | ビジネスロジック層 |
| `├── entity/` | JPA エンティティ |
| `├── repository/` | データアクセス層 |
| `├── dto/` | データ転送オブジェクト |
| `└── util/` | ユーティリティクラス |
| `src/main/resources/` | 設定ファイル・静的リソース |
| `├── static/` | SPA の HTML / JS / CSS |
| `├── db/migration/` | Flyway マイグレーションスクリプト |
| `└── application*.yml` | プロファイル別設定 |
| `scripts/` | 運用向けスクリプト |


社内利用を想定しているため、必要に応じて確認してください。
