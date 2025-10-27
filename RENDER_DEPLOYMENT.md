# Render デプロイガイド

最新の本番運用は [Render](https://render.com) の Web Service と Managed MySQL を利用します。以下では、GitHub 上のこのリポジトリを Render に接続し、Spring Boot アプリを稼働させるまでの手順をまとめています。

---

## 1. システム構成

- **アプリケーション**: Spring Boot (Java 17) / ポートは Render が割り当てる `PORT`
- **永続データ**: Render Managed MySQL（または互換の外部 MySQL）
- **ビルド**: Maven による fat-jar (`kintai-0.0.1-SNAPSHOT.jar`)

> **Tip** Render ではビルドと起動のコマンドを GUI で設定できます。コンテナは自動的に再起動されるため、アプリ側は `PORT` 環境変数を使用するようにしておきます（本プロジェクトは `application.yml` で対応済み）。

---

## 2. 前提条件

1. GitHub にリポジトリが存在し、Render からアクセスできる（Public か、Render に連携済みの Private Repo）
2. Render アカウント（無料プラン可）
3. MySQL 8.x が利用できる（Render Managed MySQL もしくは外部の MySQL サービス）

---

## 3. Render 側のセットアップ

### 3.1 データベース

1. Render ダッシュボードで **New ➜ Database ➜ MySQL** を選択
2. 任意のリージョン・プランを選び作成
3. 作成後の **Internal Database URL / External URL / ユーザー名 / パスワード** を控える
   - Spring Boot では JDBC 形式の URL を利用します（例: `jdbc:mysql://<host>:3306/<db>?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Tokyo&useUnicode=true&characterEncoding=UTF-8`）
   - Flyway も同じ接続情報を参照します

> Managed MySQL が利用できないプランの場合は、Aiven など外部の MySQL を用意して同様に接続情報を取得してください。

### 3.2 Web Service

1. **New ➜ Web Service** を選び、GitHub リポジトリを接続
2. Branch は本番運用したいブランチ（通常 `main`）を指定
3. Build & Start コマンドを設定
   - **Build Command**: `mvn -B clean package -DskipTests`
   - **Start Command**: `java -jar target/kintai-0.0.1-SNAPSHOT.jar`
4. Environment には **Docker** ではなく **Native (Buildpack)** を選択
5. Free プランの場合はインスタンスがスリープする点に注意

---

## 4. 環境変数の設定

Render Web Service の **Environment ➜ Environment Variables** に以下を登録します。

### 4.1 必須

| Key | Value | 備考 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` | プロダクション設定を有効化 |
| `DATABASE_URL` | `<JDBC URL>` | 例: `jdbc:mysql://…`（クエリパラメータは上記参照） |
| `DB_USERNAME` | `<DBユーザー>` | MySQL のユーザー名 |
| `DB_PASSWORD` | `<DBパスワード>` | デフォルト設定では `root${DB_PASSWORD}` 形式で解釈されるため、Render 側のパスワードも先頭が `root` になるようにするか、下記の追加設定で上書きしてください |
| `TZ` | `Asia/Tokyo` | Java のシステムタイムゾーンを日本時間に固定 |

### 4.2 推奨オプション

| Key | Value | 備考 |
| --- | --- | --- |
| `SPRING_DATASOURCE_PASSWORD` | `<DBパスワード>` | `root` 付与を避けたい場合の上書き用 |
| `SPRING_FLYWAY_PASSWORD` | `<DBパスワード>` | 同上。Flyway の接続パスワード |
| `SPRING_FLYWAY_ENABLED` | `true` | 起動時に Flyway マイグレーションを自動適用したい場合 |
| `PORT` | `10000` など | Render が自動付与するため通常は未指定で可 |

> Render の MySQL を利用している場合、接続情報は **Internal Database URL** を基に JDBC 形式に整形するのが安全です。`SPRING_DATASOURCE_PASSWORD` / `SPRING_FLYWAY_PASSWORD` を併用する場合でも以下の形式で問題ありません。サンプル:
>
> ```text
> DATABASE_URL=jdbc:mysql://<internal-hostname>:3306/<db>?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Tokyo&useUnicode=true&characterEncoding=UTF-8
> DB_USERNAME=<ユーザー名>
> DB_PASSWORD=<パスワード>
> ```

---

## 5. デプロイと確認

1. 設定を保存すると自動で初回ビルドが走ります（ダッシュボードの Deploys で進捗確認）
2. **Logs** で Spring Boot が `Started KintaiApplication` と出力していれば成功
3. 公開 URL は `https://<service-name>.onrender.com` 形式
   - SPA: `https://<service>.onrender.com/login`
   - API ヘルスチェック（要認証）: `https://<service>.onrender.com/api/attendance/health`
   - 管理画面: `https://<service>.onrender.com/#/admin`

### ヘルスチェック例

```bash
curl -c cookies.txt -X POST https://<service>.onrender.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"pass"}'

curl -b cookies.txt https://<service>.onrender.com/api/attendance/health
# => "勤怠管理システムは正常に動作しています"
```

> Render のビルトイン Health Check にはセッション情報を渡せないため、`/api/health` など公開ヘルスエンドポイントを別途用意するか、Health Check を無効化する運用を検討してください。

### サンプルアカウント

本リポジトリは起動時にサンプルデータ（`DataInitializer`）を投入します。Render へデプロイすると以下の認証情報が作成されます。

| ロール | ユーザーID | パスワード | 備考 |
| --- | --- | --- | --- |
| 従業員 | `emp1` | `pass` | 勤怠入力および履歴確認用 |
| 管理者 | `admin` | `pass` | 申請承認や従業員管理用 |

> 実運用で既存データを扱う場合は、`DataInitializer` を無効化するか削除し、上記の初期化処理が走らないよう調整してください。

---

## 6. デプロイ後の運用メモ

- **ログ**: Render ダッシュボードの Logs タブから確認。`render logs <service>` CLI も利用可
- **スケール**: インスタンスタイプはダッシュボードの Settings で変更可能
- **DB マイグレーション**: Flyway を使う場合は `SPRING_FLYWAY_ENABLED=true` と `SPRING_FLYWAY_PASSWORD` を設定し、起動時にマイグレーションを適用
- **初期データ**: `DataInitializer` が本番でも動作すると既存データが削除されるため、実運用では Bean を無効化するかプロファイルを分離してからリリース
- **バックアップ**: Managed MySQL の自動バックアップを有効化、または `mysqldump` を cron などで取得する

---

## 7. よくあるトラブル

| 症状 | 原因/対処 |
| --- | --- |
| 起動直後にクラッシュする | `DATABASE_URL` や認証情報が誤っている。Render の環境変数を再確認 |
| 502 / 503 が返る | アプリがまだ起動していないか、ログで例外が発生していないかを確認 |
| MySQL 接続がタイムアウトする | Render Free プランの MySQL はスリープすることがある。Pro プランまたは外部サービスを検討 |
| データが初期化される / サンプルデータしか残らない | `DataInitializer` が起動時にテーブルを削除している。実運用では `@Profile("dev")` などに変更するか Bean を削除してからデプロイ |

---

## 8. ローカルでの検証

Render デプロイ前に以下で確認しておくと安全です。

```bash
# 単体テスト
mvn clean test

# プロダクションプロファイルで起動（ローカル MySQL を使用する場合）
SPRING_PROFILES_ACTIVE=prod \
DATABASE_URL=jdbc:mysql://localhost:3306/kintai?useSSL=false&serverTimezone=Asia/Tokyo&characterEncoding=UTF-8&allowPublicKeyRetrieval=true&useUnicode=true \
DB_USERNAME=kintai DB_PASSWORD=kintai \
mvn spring-boot:run
```

---

## 9. 更新履歴

- 2025-10-27: DataInitializer に関する注意と環境変数の最新構成を追記、PDF サービス依存の記述を整理
- 2025-09-28: Render 向け手順に刷新（旧 Railway ガイドを置き換え）
