# Railway デプロイガイド

## 概要
このプロジェクトは、Spring BootアプリケーションをRailwayにデプロイします。

## アーキテクチャ
- **Spring Boot**: ポート8080で動作（メインの勤怠管理API）
- **データベース**: MySQL（RailwayのMySQLアドオンを使用）

## デプロイ手順

### 1. Railway プロジェクトの作成
1. [Railway](https://railway.app) にログイン
2. 新しいプロジェクトを作成
3. GitHubリポジトリを接続

### 2. データベースの設定
1. RailwayダッシュボードでMySQLアドオンを追加
2. データベースURLをコピー

### 3. 環境変数の設定
Railwayダッシュボードで以下の環境変数を設定：

```
PORT=8080
DATABASE_URL=<MySQLの接続URL>
SPRING_PROFILES_ACTIVE=prod
DB_USERNAME=root
DB_PASSWORD=<データベースパスワード>
```

### 4. デプロイ
1. メインブランチにプッシュすると自動デプロイが開始
2. または、Railwayダッシュボードから手動デプロイ

## 動作確認

### デプロイ後の確認URL
- **SPA**: `https://<railway-app>.railway.app/login`
- **API**: `https://<railway-app>.railway.app/api/attendance/health`
- **管理者画面**: `https://<railway-app>.railway.app/#/admin`
- **有給申請**: `https://<railway-app>.railway.app/#/vacation`
  - ※ PDF生成機能は現在無効化されています。

### 自動テストスクリプト
```bash
./test_railway_deployment.sh https://<railway-app>.railway.app
```

## トラブルシューティング

### よくある問題
1. **ポート競合**: Railwayは動的にポートを割り当てるため、環境変数を使用
2. **データベース接続エラー**: DATABASE_URLが正しく設定されているか確認

### ログの確認
Railwayダッシュボードの「Deployments」タブでログを確認できます。

## 開発環境でのテスト
```bash
# Spring Boot のテスト
mvn clean test

# ローカルでの起動
java -jar target/kintai-0.0.1-SNAPSHOT.jar &
```
