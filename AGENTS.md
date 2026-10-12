# AGENTS.md

## 開発コマンド

| 目的 | コマンド |
| --- | --- |
| バックエンドの起動 | `MOONTV_MIRAKC_URL=http://<mirakc のホスト>:40772 cargo run` |
| フロントエンドの開発サーバー | `pnpm -C frontend dev`（`/api` を `127.0.0.1:40780` へプロキシ） |
| 全検査 | `mise run check` |
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
| `frontend/src/api` | API クライアントと Valibot スキーマ |
| `frontend/src/domain` | 時刻・ジャンルなど UI に依存しない規則 |
| `frontend/src/media` | ブラウザーのコーデック判定、視聴設定の保存 |
| `frontend/src/ui` | React コンポーネント |

## 設計上の前提

- チューナーは1つしかない前提で、別チャンネルの要求が来たら既存セッションを止めて譲る（`SessionManager::open_stream`）。mirakc はチューナーを確保できないとき 404 を返す。
- 配信 URL は `/api/live/{service}/{codec}/{quality}/{viewer}/...`。セッションは前3要素で共有し、`viewer` ごとの最終アクセスで視聴継続を判定する。視聴者がいなくなったセッションは止める。
- フロントエンドは `PUT /api/live/...` で起動完了を待ってからプレイヤーに `master.m3u8` を渡す。起動失敗の理由を画面に出すため。
- HEVC は `hvc1` タグ付きの fMP4 で出力する。Safari は `hev1` を再生できない。
- 色は `frontend/src/index.css` の semantic token（`--color-*`）だけを使う。Tailwind 既定のパレットは無効にしてあり、`bg-zinc-900` などは書いても生成されない。
- 実機確認は `mirakc` に接続できる環境で行う。チューナーを占有するので、検証後はセッションを止める。
