# SoundCloud to MP3 Converter

Next.js アプリケーションで SoundCloud の音楽を MP3 形式でダウンロードできるツールです。

## 機能

- SoundCloud の URL を入力するだけで MP3 ファイルに変換
- **自動的にアーティスト名と曲タイトルを取得してファイル名に設定**
- **トラック情報の事前プレビュー（サムネイル、タイトル、アーティスト、再生時間）**
- **アートワーク（サムネイル）の自動埋め込み**
- ブラウザから直接ダウンロード可能
- シンプルで使いやすい UI
- エラーハンドリング付き

## 必要な環境

- Node.js 18.0.0 以上
- npm または yarn
- yt-dlp（グローバルインストール）
- ffmpeg（グローバルインストール）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/soundcloud2wav.git
cd soundcloud2wav
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. yt-dlp と ffmpeg のインストール

#### macOS
```bash
brew install yt-dlp ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install yt-dlp ffmpeg
```

#### Windows
```bash
# Chocolatey を使用
choco install yt-dlp ffmpeg
```

#### Python pip を使用（全OS共通）
```bash
pip install yt-dlp
```

### 4. 環境変数の設定（オプション）

`.env.local` ファイルを作成：

```env
# タイムアウト設定（ミリ秒、デフォルト: 120000 = 2分）
CONVERSION_TIMEOUT=120000

# 最大ファイルサイズ（MB、デフォルト: 500）
MAX_FILE_SIZE_MB=500
```

## 使い方

### 1. 開発サーバーの起動

```bash
npm run dev
```

### 2. ブラウザでアクセス

```
http://localhost:3000
```

### 3. SoundCloud URL を入力

1. SoundCloud のトラック URL を入力フィールドに貼り付け
2. URL を入力すると自動的にトラック情報（サムネイル、タイトル、アーティスト、再生時間）が表示されます
3. 「Convert to MP3」ボタンをクリック
4. 変換が完了すると「アーティスト名 - 曲名.mp3」の形式でダウンロードが開始されます

### 対応している URL 形式

- `https://soundcloud.com/artist-name/track-name`
- `https://soundcloud.com/user-name/sets/playlist-name`

## API エンドポイント

### POST /api/convert

SoundCloud URL を MP3 ファイル（アートワーク付き）に変換します。

**リクエスト:**
```json
{
  "url": "https://soundcloud.com/artist/track"
}
```

**レスポンス:**
- 成功時: MP3 ファイルのバイナリストリーム（アートワーク埋め込み済み）
- エラー時: JSON エラーメッセージ

### POST /api/metadata

SoundCloud トラックのメタデータを取得します。

**リクエスト:**
```json
{
  "url": "https://soundcloud.com/artist/track"
}
```

**レスポンス:**
```json
{
  "artist": "Artist Name",
  "title": "Track Title",
  "duration": 180,
  "thumbnail": "https://...",
  "description": "Track description",
  "uploader": "Uploader Name",
  "upload_date": "20240101"
}
```

## プロジェクト構成

```
soundcloud2wav/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── convert/
│   │   │   │   ├── route.ts          # MP3変換 API エンドポイント
│   │   │   │   └── stream-utils.ts   # ストリーミングユーティリティ
│   │   │   └── metadata/
│   │   │       └── route.ts          # メタデータ取得 API
│   │   ├── page.tsx                  # メインページ UI
│   │   ├── layout.tsx                # レイアウト
│   │   └── globals.css               # グローバルスタイル
│   └── types/
│       └── index.ts                  # TypeScript 型定義
├── public/                           # 静的ファイル
├── .env.example                      # 環境変数の例
├── .gitignore
├── next.config.ts                    # Next.js 設定
├── package.json
├── tsconfig.json                     # TypeScript 設定
└── README.md
```

## 技術スタック

- **フレームワーク**: Next.js 15.3.5 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **ツール**: yt-dlp, ffmpeg
- **出力フォーマット**: MP3（アートワーク埋め込み）

## トラブルシューティング

### yt-dlp が見つからないエラー

```bash
# インストールされているか確認
which yt-dlp

# 再インストール
brew reinstall yt-dlp
```

### 変換に失敗する場合

1. yt-dlp のバージョンを更新:
   ```bash
   yt-dlp -U
   ```

2. 手動で動作確認:
   ```bash
   yt-dlp -x --audio-format wav "https://soundcloud.com/..." -o test.wav
   ```

### タイムアウトエラー

大きなファイルの場合は `.env.local` でタイムアウトを延長:
```env
CONVERSION_TIMEOUT=300000  # 5分
```

## 注意事項

- このツールは個人利用を目的としています
- SoundCloud の利用規約を遵守してください
- ダウンロードした音楽の著作権を尊重してください
- 一時ファイルは `/tmp` ディレクトリに作成され、自動的に削除されます

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まず Issue を作成して変更内容を議論してください。