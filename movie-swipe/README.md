# 🎬 MOVIE SWIPE

映画をスワイプで探せるWebアプリ。右スワイプで選んで、左スワイプでスキップ。あなたにぴったりの映画を見つけよう。

![MOVIE SWIPE](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

## ✨ 機能

- 🎯 **スワイプで映画探し**: 直感的なスワイプ操作で映画を選択
- 📱 **レスポンシブデザイン**: PC・スマホ両対応
- 💾 **選んだ映画を保存**: localStorage で履歴管理
- 🎭 **配信サービス情報**: Netflix、Prime Video などの配信情報を表示
- 🔗 **シェア機能**: 選んだ映画を友達とシェア
- 🌏 **日本語対応**: 映画情報は日本語で表示

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <your-repo-url>
cd movie-swipe
```

### 2. 依存パッケージのインストール

```bash
npm install
# または
yarn install
# または
pnpm install
```

### 3. TMDb API キーの取得

1. [TMDb](https://www.themoviedb.org/) にアカウント登録
2. [Settings > API](https://www.themoviedb.org/settings/api) から API キーを取得
3. プロジェクトルートに `.env.local` ファイルを作成

```bash
# .env.local
TMDB_API_KEY=あなたのAPIキーをここに貼り付け
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 📦 技術スタック

- **フレームワーク**: [Next.js 14](https://nextjs.org/) (App Router)
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **スタイリング**: [Tailwind CSS 4](https://tailwindcss.com/)
- **API**: [TMDb API](https://www.themoviedb.org/documentation/api)
- **デプロイ**: [Vercel](https://vercel.com/)

## 🌐 デプロイ手順

### Vercel でデプロイ（推奨）

1. **GitHub にプッシュ**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Vercel にインポート**
   - [Vercel](https://vercel.com/) にログイン
   - 「Add New...」 → 「Project」 をクリック
   - GitHub リポジトリを選択

3. **環境変数の設定**
   - Project Settings → Environment Variables で以下を追加:
     ```
     TMDB_API_KEY = あなたのAPIキー
     ```
   - 「Production」「Preview」「Development」すべてにチェック

4. **デプロイ**
   - 「Deploy」 をクリック
   - 数分で完了し、公開URLが発行されます

### 他のプラットフォーム

#### Netlify
```bash
npm run build
```
生成された `.next` ディレクトリをデプロイ

#### 自前サーバー
```bash
npm run build
npm run start
```

## 📁 プロジェクト構造

```
movie-swipe/
├── app/
│   ├── api/
│   │   └── movies/
│   │       ├── route.ts              # 映画取得API
│   │       └── [id]/
│   │           └── providers/
│   │               └── route.ts      # 配信サービス情報API
│   ├── selected/
│   │   └── page.tsx                  # 選んだ映画リスト画面
│   ├── layout.tsx                    # ルートレイアウト
│   ├── page.tsx                      # メイン画面（スワイプ）
│   └── globals.css                   # グローバルスタイル
├── public/                           # 静的ファイル
├── .env.local                        # 環境変数（Git管理外）
└── README.md
```

## 🎮 使い方

### メイン画面
- **右スワイプ**: 映画を選ぶ（「今すぐ見る」or「後で見る」を選択）
- **左スワイプ**: スキップして次の映画へ
- **別の映画を見る**: ボタンクリックでランダムに映画を表示

### 選んだリスト画面
- **フィルタ**: 「すべて」「今すぐ見る」「後で見る」で絞り込み
- **配信サービス**: Netflix、Prime Video などのリンクを表示
- **見た**: クリックで「見た」マークを付ける
- **シェア**: 映画情報をシェア（モバイルは Web Share API、PCはクリップボードにコピー）
- **削除**: リストから削除

## 📝 ライセンス

This product uses the TMDb API but is not endorsed or certified by TMDb.

## 🤝 コントリビューション

Issue や Pull Request を歓迎します！

---

Made with ❤️ using Next.js and TMDb API
