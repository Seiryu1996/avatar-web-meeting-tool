// App.tsx関連の定数

export const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export const VALIDATION_RULES = {
  username: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/,
  },
  roomId: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9-_]+$/,
  },
} as const;

export const ERROR_MESSAGES = {
  username: {
    required: 'ユーザー名を入力してください',
    tooShort: 'ユーザー名は1文字以上で入力してください',
    tooLong: 'ユーザー名は20文字以下で入力してください',
    invalidFormat: 'ユーザー名に使用できない文字が含まれています',
  },
  roomId: {
    required: 'ルームIDを入力してください',
    tooShort: 'ルームIDは1文字以上で入力してください',
    tooLong: 'ルームIDは50文字以下で入力してください',
    invalidFormat: 'ルームIDは半角英数字、ハイフン、アンダースコアのみ使用できます',
  },
  avatarData: {
    required: 'アバターデータを選択してください',
    invalidFormat: '無効なアバターデータです',
  },
  connection: {
    failed: 'サーバーへの接続に失敗しました',
    timeout: '接続がタイムアウトしました',
    disconnected: 'サーバーとの接続が切断されました',
  },
  file: {
    invalidType: 'JSONファイルを選択してください',
    parseError: 'ファイルの形式が正しくありません',
    readError: 'ファイルの読み込みに失敗しました',
  },
} as const;

export const CONNECTION_CONFIG = {
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  timeout: 10000,
} as const;

export const UI_CONFIG = {
  joinForm: {
    maxWidth: '500px',
    spacing: '16px',
  },
  avatarPreview: {
    maxWidth: '300px',
    maxHeight: '200px',
  },
} as const;