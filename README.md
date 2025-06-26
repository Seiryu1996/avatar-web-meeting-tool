# Avatar Web Meeting Tool

アバターキャラクターを使用したWeb会議システムです。[make_model](https://github.com/Seiryu1996/make_model)で作成されたJSONデータを読み込んでアバターを表示し、WebRTCを使用してリアルタイム通信を行います。

## 機能

- JSONファイルからアバターデータを読み込み
- Canvas APIを使用したアバター表示
- WebRTCによるビデオ通話
- Socket.ioによるリアルタイム通信
- ルーム機能

## 技術スタック

### フロントエンド
- React 18 + TypeScript
- WebRTC API
- Canvas API
- Socket.io-client

### バックエンド
- Node.js + Express
- Socket.io
- Multer (ファイルアップロード)

### インフラ
- Docker + Docker Compose
- Nginx (リバースプロキシ)

## 使用方法

### 1. 環境設定

```bash
# 環境変数ファイルをコピー
cp .env.example .env
# 必要に応じて.envを編集
```

### 2. 起動

```bash
# 開発環境
docker-compose up

# 本番環境
docker-compose -f docker-compose.prod.yml up -d
```

### 3. アクセス

- 開発環境: `http://localhost`
- 本番環境: `https://yourdomain.com`

### 4. 会議に参加

1. make_modelで作成したJSONファイルをアップロード
2. ルームIDを入力
3. "Join Meeting"ボタンをクリック

## GitHub管理

### リポジトリ作成

```bash
# GitHub でリポジトリ作成後
git remote add origin https://github.com/yourusername/avatar-web-meeting.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

### CI/CD設定

GitHub Actions による自動デプロイが設定済みです。
詳細は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください。

## ディレクトリ構成

```
web_meeting_tool/
├── frontend/          # React フロントエンド
│   ├── src/
│   │   ├── components/
│   │   │   ├── AvatarCanvas.tsx
│   │   │   └── VideoCall.tsx
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── Dockerfile
├── backend/           # Node.js バックエンド
│   ├── src/
│   │   └── server.js
│   └── Dockerfile
├── nginx/             # Nginx設定
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

## 開発

### フロントエンド開発

```bash
cd frontend
npm install
npm start
```

### バックエンド開発

```bash
cd backend
npm install
npm run dev
```

## 注意事項

- WebRTCのためHTTPS環境が推奨されます
- カメラ・マイクへのアクセス許可が必要です
- make_modelのJSON形式に対応しています