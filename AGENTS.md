# AGENTS.md

## 開発コマンド

| 目的 | コマンド |
| --- | --- |
| バックエンドの起動 | `MOONTV_MIRAKC_URL=http://<mirakc のホスト>:40772 cargo run` |
| フロントエンドの開発サーバー | `pnpm -C frontend dev`（`/api` を `127.0.0.1:40780` へプロキシ） |
| Storybook | `pnpm -C frontend storybook`（`http://localhost:6006`） |
| アイコンの生成 | `pnpm -C frontend icons`（`frontend/scripts/icons.ts` の図形から `frontend/public` のアイコン一式を書き出す） |
| 全検査 | `mise run check`（story の描画テストに Chromium を使う。初回は `pnpm -C frontend exec playwright install chromium-headless-shell`） |
| リリースビルド | `mise run build` |

`cargo build` は `frontend/dist` を埋め込むため、リリースビルドの前に `pnpm -C frontend build` が必要です。デバッグビルドは実行時に `frontend/dist` を読みます。

## ディレクトリ構成

| パス | 責務 |
| --- | --- |
| `src/mirakc.rs` | mirakc API クライアント |
| `src/catalog.rs` | サービス・番組情報のキャッシュと API 向けの整形 |
| `src/transcode/` | ffmpeg によるライブ配信セッション（`profile` 画質定義、`encoder` エンコーダ別の引数と自動検出、`session` 1本の配信、`manager` セッションの共有と停止） |
| `src/api.rs` | HTTP API |
| `src/assets.rs` | 埋め込んだフロントエンドの配信 |
| `frontend/src/app` | 画面の枠組みとルーティング |
| `frontend/src/features/live` | チャンネル一覧と視聴画面 |
| `frontend/src/features/player` | プレイヤー、視聴設定の保存、ブラウザーのコーデック判定、配信セッションの開始・終了 |
| `frontend/src/features/guide` | 番組表と番組詳細 |
| `frontend/src/shared` | 複数の feature で使う API クライアント・スキーマ、時刻の規則、ルート定義、部品 |
| `frontend/.storybook` | Storybook の設定と、story が共有する fixture・デコレーター |

`app`・各 feature・`shared` の中は次の層に分ける。依存方向は `frontend/oxlint.config.ts` の `no-restricted-imports` で強制し、`shared` は feature と `app` を、feature は `app` を参照しない。

| 層 | 責務 |
| --- | --- |
| `components/` | props だけで描画する純粋なコンポーネント |
| `containers/` | API・storage・ブラウザー判定とつなぐコンポーネントと、その専用フック（`containers/hooks/`） |
| `hooks/` | 外部とつながない UI 用のフック |
| `services/` | UI に紐づくロジック。React に依存させず、`*.test.ts` で検証する |
| `api/`・`domain/`・`media/` | API の通信とスキーマ、UI に依存しない規則、ブラウザーの機能と storage |

## 設計上の前提

- チューナーは1つしかない前提で、別チャンネルの要求が来たら既存セッションを止めて譲る（`SessionManager::open_stream`）。mirakc はチューナーを確保できないとき 404 を返す。
- 配信 URL は `/api/live/{service}/{codec}/{quality}/{viewer}/...`。セッションは前3要素で共有し、`viewer` ごとの最終アクセスで視聴継続を判定する。視聴者がいなくなったセッションは止める。
- `master.m3u8` 以下のメディアは `{session}/media.m3u8` のようにセッション ID を含む。同じキーで作り直されたセッションの断片を古いプレイヤーが読むと、`init.mp4` が食い違ってデコードに失敗するため。
- フロントエンドは `PUT /api/live/...` で起動完了を待ってからプレイヤーに `master.m3u8` を渡す。起動失敗の理由を画面に出すため。
- HEVC は `hvc1` タグ付きの fMP4 で出力する。Safari は `hev1` を再生できない。
- UI のコンポーネントは1ファイル1つにし、ファイル名をコンポーネント名（PascalCase）に合わせる。
- `components/` のコンポーネントには同じ場所に `*.stories.tsx` を置く。story は `pnpm -C frontend test` でブラウザー上に描画され、`play` の検証も実行される。
- 色と文字は `frontend/src/index.css` の semantic token（`--color-*`、`--text-*`）だけを使う。文字のサイズ・太さ・行間は `text-title` などの役割名1つで指定する。Tailwind 既定の値は無効にしてあり、`bg-zinc-900` や `text-sm`、`font-semibold` などは書いても生成されない。
- 実機確認は `mirakc` に接続できる環境で行う。チューナーを占有するので、検証後はセッションを止める。
