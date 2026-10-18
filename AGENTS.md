# AGENTS.md

## 開発コマンド

| 目的 | コマンド |
| --- | --- |
| バックエンドの起動 | `MOONTV_MIRAKC_URL=http://<mirakc のホスト>:40772 cargo run` |
| フロントエンドの開発サーバー | `pnpm -C frontend dev`（`/api` を `127.0.0.1:40780` へプロキシ） |
| Storybook | `pnpm -C frontend storybook`（`http://localhost:6006`） |
| 字幕の変換表の生成 | `python3 -I scripts/gen-caption-tables.py <libaribcaption のチェックアウト>`（`src/caption/tables/generated.rs` を書き出す。出典のコミットはファイルの先頭にある） |
| 字幕のフォントの生成 | `uv run --locked --script scripts/gen-caption-fonts.py <元フォントを置いたディレクトリ>`（`frontend/src/features/player/media/fonts` にフォント2つと、追加記号の字形を並べた `caption-symbols.svg` を書き出す。元フォントのファイル名と入手先はスクリプトの先頭にある） |
| アイコンの生成 | `pnpm -C frontend icons`（`frontend/scripts/icons.ts` の図形から `frontend/public` のアイコン一式を書き出す） |
| 全検査 | `mise run check`（story の描画テストに Chromium を使う。初回は `pnpm -C frontend exec playwright install chromium-headless-shell`） |
| リリースビルド | `mise run build` |

`cargo build` は `frontend/dist` を埋め込むため、リリースビルドの前に `pnpm -C frontend build` が必要です。デバッグビルドは実行時に `frontend/dist` を読みます。

## ディレクトリ構成

| パス | 責務 |
| --- | --- |
| `src/mirakc.rs` | mirakc API クライアント |
| `src/ts.rs` | MPEG-TS のパケット、PSI（PAT・PMT）、PES の読み書き |
| `src/caption/` | ARIB 字幕（STD-B24）の解読（`group` データグループ、`code` 8単位符号、`screen` 画面の状態と中間表現、`drcs` 外字、`tables` 変換表） |
| `src/catalog.rs` | サービス・番組情報のキャッシュと API 向けの整形 |
| `src/transcode/` | ffmpeg によるライブ配信セッション（`profile` 画質・音声の定義、`encoder` エンコーダ別の引数と自動検出、`input` ffmpeg に渡す前の TS の書き換え、`captions` 字幕を ID3 にして差し込む、`session` 1本の配信、`manager` セッションの共有と停止） |
| `src/api.rs` | HTTP API |
| `src/assets.rs` | 埋め込んだフロントエンドの配信 |
| `frontend/src/app` | 画面の枠組みとルーティング |
| `frontend/src/features/live` | チャンネル一覧と視聴画面 |
| `frontend/src/features/player` | プレイヤー、字幕の描画、視聴設定の保存、ブラウザーのコーデック判定、配信セッションの開始・終了 |
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

- チューナーの割り当ては mirakc に任せ、確保できなかったとき（mirakc は 404 を返す）だけ、最後に選ばれたのが一番古い別チャンネルの配信を1本止めて譲る（`SessionManager::release_tuner`）。止める候補は `/api/tuners` で同じチューナーを使いうる種類（地デジ・BS など）の配信に限る。止められた視聴者のプレイヤーは `GET /api/live/...` でその旨を知り、画面に出す。
- 配信 URL は `/api/live/{service}/{codec}/{quality}/{audio}/{viewer}/...`。セッションは前4要素で共有し、`viewer` ごとの最終アクセスで視聴継続を判定する。視聴者がいなくなったセッションは止める。
- `master.m3u8` 以下のメディアは `{session}/media.m3u8` のようにセッション ID を含む。同じキーで作り直されたセッションの断片を古いプレイヤーが読むと、`init.mp4` が食い違ってデコードに失敗するため。
- 音声は TS の段階で選んだ1本だけを固定の PID に載せ替えて ffmpeg に渡す。ffmpeg は起動時の PMT にあった ES しか読まないため、番組の切り替わりで音声の本数や PID が変わっても音声が途切れないようにする。主音声・副音声は `component_tag` の小さい順（ARIB では 0x10 が主音声）で決める。mirakc の番組情報の音声は並び順に意味がないので、主音声フラグで並べ直す。
- 字幕と文字スーパーはサーバーで解読し、画面全体の状態を JSON にして ID3 の PRIV フレーム（所有者 `moontv`）に包み、ffmpeg に渡す前の TS に差し込む。ffmpeg が映像と同じ規則で時刻を付け直して fMP4 の emsg に入れるので、プレイヤーは hls.js が返す時刻をそのまま再生位置と比べられる。プレイヤーを hls.js 版（`HlsJsVideo`）にしているのはこのためで、標準の再生エンジンは ID3 を読めない。iOS のネイティブ全画面では字幕を描けない。
- ID3 は表示時刻が来るまで差し込まず、字幕が変わらなくても毎秒送り直す。ffmpeg は ID3 が途切れると出力を止めて待ち、時刻が前後すると扱えないため。PMT の ID3 の ES には登録記述子 `ID3 ` が要る。無いと ffmpeg が MP3 の音声と誤認する。
- フロントエンドは `PUT /api/live/...` で起動完了を待ってからプレイヤーに `master.m3u8` を渡す。起動失敗の理由を画面に出すため。
- ページの切り替えは `frontend/src/app/containers/screens.tsx` のルートの `action` で、ページのコードと描画に要るデータを読み込み終えてから行う。それまで前の画面を残す。データは react-query のキャッシュに入れるだけにし、ページは `useQuery` で読む。
- HEVC は `hvc1` タグ付きの fMP4 で出力する。Safari は `hev1` を再生できない。
- UI のコンポーネントは1ファイル1つにし、ファイル名をコンポーネント名（PascalCase）に合わせる。
- `components/` のコンポーネントには同じ場所に `*.stories.tsx` を置く。story は `pnpm -C frontend test` でブラウザー上に描画され、`play` の検証も実行される。
- 色と文字は `frontend/src/index.css` の semantic token（`--color-*`、`--text-*`）だけを使う。文字のサイズ・太さ・行間は `text-title` などの役割名1つで指定する。Tailwind 既定の値は無効にしてあり、`bg-zinc-900` や `text-sm`、`font-semibold` などは書いても生成されない。
- 重なり順も `frontend/src/index.css` の `--z-index-*` の役割名（`z-nav` など）で指定する。数値の `z-10` や `z-[999]` は Tailwind が生成してしまうため、`pnpm -C frontend lint` で弾く。部品の中だけで重ねる値は、部品の根に `isolate` を付けて閉じる。
- 押す・選ぶ・開く部品は `react-aria-components` で組み、状態は `data-hovered`・`data-pressed`・`data-selected` などで装飾する。キーボードフォーカスの表示は `focus-ring` ユーティリティを使う。
- 実機確認は `mirakc` に接続できる環境で行う。チューナーを占有するので、検証後はセッションを止める。
