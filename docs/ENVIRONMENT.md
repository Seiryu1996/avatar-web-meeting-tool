# 環境変数管理ガイド

## 概要

このドキュメントでは、Avatar Web Meeting Toolで使用する環境変数の設定と管理方法について説明します。

## 環境別設定

### 開発環境 (.env)

```bash
# フロントエンド設定
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development

# バックエンド設定
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# WebRTC設定
STUN_SERVER=stun:stun.l.google.com:19302
```

### 本番環境 (.env.prod)

```bash
# フロントエンド設定
REACT_APP_BACKEND_URL=https://yourdomain.com/api
REACT_APP_ENVIRONMENT=production

# バックエンド設定
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

# Docker設定
DOCKER_USERNAME=your-dockerhub-username
BACKEND_URL=https://yourdomain.com/api

# SSL設定
SSL_CERT_PATH=/etc/nginx/ssl/fullchain.pem
SSL_KEY_PATH=/etc/nginx/ssl/privkey.pem

# WebRTC設定
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:yourdomain.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password
```

## 環境変数の説明

### フロントエンド関連

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|-------------|
| REACT_APP_BACKEND_URL | ✓ | バックエンドAPIのURL | http://localhost:3001 |
| REACT_APP_ENVIRONMENT | - | 環境識別子 | development |

### バックエンド関連

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|-------------|
| NODE_ENV | ✓ | Node.js実行環境 | development |
| PORT | - | サーバーポート番号 | 3001 |
| CORS_ORIGIN | - | CORS許可オリジン | * |

### WebRTC関連

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|-------------|
| STUN_SERVER | - | STUNサーバーURL | stun:stun.l.google.com:19302 |
| TURN_SERVER | - | TURNサーバーURL | - |
| TURN_USERNAME | - | TURN認証ユーザー名 | - |
| TURN_PASSWORD | - | TURN認証パスワード | - |

### Docker関連

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|-------------|
| DOCKER_USERNAME | ✓ | DockerHubユーザー名 | - |
| BACKEND_URL | ✓ | 本番バックエンドURL | - |

## 設定方法

### 1. 開発環境での設定

```bash
# プロジェクトルートに.envファイルを作成
cp .env.example .env

# 必要な値を編集
nano .env
```

### 2. 本番環境での設定

```bash
# 本番サーバーで環境ファイルを作成
cat > .env.prod << 'EOF'
REACT_APP_BACKEND_URL=https://yourdomain.com/api
REACT_APP_ENVIRONMENT=production
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com
DOCKER_USERNAME=your-dockerhub-username
BACKEND_URL=https://yourdomain.com/api
EOF
```

### 3. GitHub Actions での設定

Repository Settings > Secrets and variables > Actions で設定：

#### 必須シークレット
- `DOCKER_USERNAME`: DockerHubユーザー名
- `DOCKER_PASSWORD`: DockerHubパスワード/トークン
- `HOST`: デプロイ先サーバーIP
- `USERNAME`: サーバーユーザー名
- `SSH_KEY`: SSH秘密鍵

#### オプション変数
- `BACKEND_URL`: 本番バックエンドURL
- `STUN_SERVER`: STUNサーバーURL
- `TURN_SERVER`: TURNサーバーURL

## セキュリティ対策

### 1. 秘密情報の管理

```bash
# .envファイルは絶対にコミットしない
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore

# サンプルファイルを提供
cp .env .env.example
# .env.exampleから実際の値を削除
```

### 2. 本番環境での権限設定

```bash
# 環境ファイルの権限を制限
chmod 600 .env.prod
chown root:root .env.prod
```

### 3. 環境変数の検証

バックエンドで環境変数をチェック：

```javascript
// backend/src/config/env.js
const requiredEnvVars = [
  'NODE_ENV',
  'PORT'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Required environment variable ${envVar} is not set`);
    process.exit(1);
  }
});
```

## Docker Compose での環境変数

### 開発環境 (docker-compose.yml)

```yaml
services:
  frontend:
    environment:
      - REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL:-http://localhost:3001}
    env_file:
      - .env

  backend:
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - PORT=${PORT:-3001}
    env_file:
      - .env
```

### 本番環境 (docker-compose.prod.yml)

```yaml
services:
  frontend:
    environment:
      - REACT_APP_BACKEND_URL=${BACKEND_URL}
      - NODE_ENV=production
    env_file:
      - .env.prod

  backend:
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - .env.prod
```

## トラブルシューティング

### 1. 環境変数が読み込まれない

```bash
# Docker Composeで環境変数を確認
docker-compose config

# コンテナ内で環境変数を確認
docker-compose exec backend printenv
```

### 2. フロントエンドで環境変数が取得できない

- React環境変数は`REACT_APP_`プレフィックスが必要
- ビルド時に埋め込まれるため、変更後は再ビルドが必要

```bash
# 再ビルドが必要
docker-compose up --build frontend
```

### 3. CORS エラーが発生する

```bash
# CORS_ORIGIN設定を確認
echo $CORS_ORIGIN

# バックエンドログを確認
docker-compose logs backend
```

## ベストプラクティス

1. **環境別設定ファイル**: 開発・ステージング・本番で設定を分離
2. **デフォルト値**: 必須でない変数にはデフォルト値を設定
3. **検証**: アプリケーション起動時に必須変数をチェック
4. **ドキュメント**: 全環境変数の用途と設定例を文書化
5. **セキュリティ**: 秘密情報は適切に管理し、ログに出力しない

## 参考資料

- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Create React App Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)