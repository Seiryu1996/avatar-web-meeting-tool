# デプロイ手順

## 概要

このドキュメントでは、Avatar Web Meeting Toolのデプロイ手順について説明します。

## 前提条件

- Docker及びDocker Composeがインストールされていること
- GitHubアカウントとリポジトリが作成されていること
- 本番サーバーへのSSHアクセスが可能であること

## 1. GitHub リポジトリの設定

### 1.1 リポジトリの作成

```bash
# GitHubでリポジトリを作成後
git remote add origin https://github.com/yourusername/avatar-web-meeting.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 1.2 GitHub Secrets の設定

リポジトリの Settings > Secrets and variables > Actions で以下を設定：

```
DOCKER_USERNAME: DockerHubのユーザー名
DOCKER_PASSWORD: DockerHubのパスワード
HOST: デプロイ先サーバーのIPアドレス
USERNAME: サーバーのユーザー名
SSH_KEY: サーバーへのSSH秘密鍵
```

## 2. 開発環境でのセットアップ

### 2.1 依存関係のインストール

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install
```

### 2.2 開発サーバーの起動

```bash
# Docker Composeを使用
docker-compose up --build

# または個別に起動
cd frontend && npm start
cd backend && npm run dev
```

## 3. 本番環境への初回デプロイ

### 3.1 サーバーの準備

```bash
# Docker & Docker Composeのインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# プロジェクトディレクトリの作成
sudo mkdir -p /opt/avatar-meeting
sudo chown $USER:$USER /opt/avatar-meeting
cd /opt/avatar-meeting

# リポジトリのクローン
git clone https://github.com/yourusername/avatar-web-meeting.git .
```

### 3.2 環境変数の設定

```bash
# 本番環境用の.envファイルを作成
cat > .env.prod << EOF
DOCKER_USERNAME=your-dockerhub-username
BACKEND_URL=https://yourdomain.com/api
NODE_ENV=production
EOF
```

### 3.3 SSL証明書の設定（推奨）

```bash
# Let's Encryptを使用する場合
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# 証明書をコピー
sudo mkdir -p /opt/avatar-meeting/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/avatar-meeting/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/avatar-meeting/ssl/
sudo chown -R $USER:$USER /opt/avatar-meeting/ssl
```

### 3.4 初回デプロイ

```bash
# Docker イメージのビルドとプッシュ（初回のみ手動）
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push

# アプリケーションの起動
docker-compose -f docker-compose.prod.yml up -d
```

## 4. 継続的デプロイ（CI/CD）

### 4.1 自動デプロイの流れ

1. `main`ブランチにプッシュ
2. GitHub Actionsが自動実行
3. テスト実行
4. Docker イメージのビルド & プッシュ
5. 本番サーバーでの自動デプロイ

### 4.2 デプロイの確認

```bash
# コンテナの状態確認
docker-compose -f docker-compose.prod.yml ps

# ログの確認
docker-compose -f docker-compose.prod.yml logs -f

# アプリケーションの確認
curl http://yourdomain.com/health
```

## 5. メンテナンス

### 5.1 手動でのアップデート

```bash
cd /opt/avatar-meeting
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### 5.2 ログ確認

```bash
# 全サービスのログ
docker-compose -f docker-compose.prod.yml logs

# 特定サービスのログ
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs nginx
```

### 5.3 バックアップ

```bash
# 設定ファイルのバックアップ
tar -czf backup-$(date +%Y%m%d).tar.gz .env.prod ssl/ docker-compose.prod.yml
```

## 6. トラブルシューティング

### 6.1 よくある問題

**Q: WebRTCが動作しない**
A: HTTPS環境での動作が必要です。SSL証明書を確認してください。

**Q: アバターが表示されない**
A: CORS設定を確認し、フロントエンドとバックエンドの通信を確認してください。

**Q: Docker イメージがプッシュできない**
A: DockerHubの認証情報を確認してください。

### 6.2 デバッグ方法

```bash
# コンテナ内でのデバッグ
docker-compose -f docker-compose.prod.yml exec frontend sh
docker-compose -f docker-compose.prod.yml exec backend sh

# ネットワーク接続確認
docker-compose -f docker-compose.prod.yml exec backend ping frontend
```

## 7. スケーリング

### 7.1 負荷分散

```bash
# バックエンドサービスのスケール
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### 7.2 監視

- Docker Composeのヘルスチェック機能を活用
- Prometheus + Grafanaでの監視を推奨
- ログ監視ツール（ELK Stack等）の導入を検討

## 参考資料

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)