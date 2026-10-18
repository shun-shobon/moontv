# moontv

[mirakc](https://github.com/mirakc/mirakc) のチューナーで受信したテレビ放送を、ブラウザーからどこでも視聴できるWebアプリです。サーバーはフロントエンドを埋め込んだ1つの実行ファイルで動きます。

アプリ自体には認証がありません。インターネットに直接公開せず、Tailscale などの VPN 越しにアクセスしてください。

## 特徴

- ライブ視聴とチャンネル一覧（放送中・次の番組と進捗）
- 番組表（7日分、ジャンル別の色分け、番組詳細）
- 録画予約と録画一覧（番組詳細から予約・取り消し。録画そのものは mirakc が行い、終わった録画を moontv が 1080p に変換して一覧に並べる。録画はシークでき、字幕も出る）
- HLS（fMP4）配信。HEVC を優先し、再生できないブラウザーには H.264 を配信
- 画質切替（1080p / 720p / 540p / 360p）
- 音声切替（二か国語放送・解説放送の主音声 / 副音声）
- 字幕と文字スーパー（ARIB 字幕を解読し、色・位置・縁取り・外字をテレビと同じように映像に重ねる。字幕は再生設定でオン・オフできる。iOS のネイティブ全画面には出ない）
- Intel・AMD GPU（VAAPI、Intel は QSV も可）、macOS の VideoToolbox、CPU によるエンコード

## 動作環境

- mirakc
- `ffmpeg`（HEVC・H.264 のエンコーダを含むビルド。VAAPI を使う場合は `hevc_vaapi` など）
- Intel・AMD GPU を使う場合は、VAAPI ドライバ（Intel は `intel-media-va-driver`、AMD は Mesa の `mesa-va-drivers`）が入っていて、実行ユーザーが `/dev/dri/renderD128` にアクセスできること（通常は `render` グループに追加）

## ビルド

[mise](https://mise.jdx.dev/) で Rust・Node.js・pnpm を導入してからビルドします。

```sh
mise install
mise run build
```

`target/release/moontv` が成果物です。この1ファイルを実行するマシンにコピーして使います。

## 使い方

```sh
moontv --mirakc-url http://<mirakc のホスト>:40772
```

ブラウザーで `http://<サーバーのアドレス>:40780/` を開きます。

| オプション | 環境変数 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `--listen` | `MOONTV_LISTEN` | `0.0.0.0:40780` | 待ち受けるアドレス |
| `--mirakc-url` | `MOONTV_MIRAKC_URL` | `http://localhost:40772` | mirakc の URL |
| `--ffmpeg` | `MOONTV_FFMPEG` | `ffmpeg` | ffmpeg のパス |
| `--encoder` | `MOONTV_ENCODER` | `auto` | `auto` / `vaapi` / `qsv` / `videotoolbox` / `software` |
| `--vaapi-device` | `MOONTV_VAAPI_DEVICE` | `/dev/dri/renderD128` | VAAPI・QSV で使うデバイス（QSV は Intel のみ） |
| `--recordings-dir` | `MOONTV_RECORDINGS_DIR` | なし | 変換した録画を置くディレクトリ |
| `--mirakc-recording-dir` | `MOONTV_MIRAKC_RECORDING_DIR` | なし | mirakc の `recording.basedir`。録画を読み、変換後に消す |

`auto` は起動時に `videotoolbox`（macOS のみ）→ `vaapi` → `qsv` → `software` の順に試しエンコードし、最初に動いたものを使います。AMD GPU では `vaapi` が選ばれます。選ばれたエンコーダは起動時のログで確認できます。

ログの詳細度は `RUST_LOG` で変えられます（例: `RUST_LOG=debug` で ffmpeg の出力も表示）。

## チューナーの使い方

- 同じチャンネル・同じ画質を見ている人同士は1つのエンコードを共有します。
- 視聴をやめると（ページを閉じる、チャンネルを変える）そのエンコードを止め、チューナーを解放します。通信が途絶えた場合も 20 秒で止めます。
- チューナーが複数あれば、別々のチャンネルを同時に視聴できます。
- チューナーが足りないときは、後から要求されたチャンネルを優先し、選ばれたのが一番古い別チャンネルの視聴を1つだけ止めます。止められた側の画面にはその旨が出ます。

## 録画について

録画予約には mirakc の録画機能を使います。mirakc の `config.yml` で `recording.basedir` を設定すると、番組詳細に「録画予約」が出ます。録画はライブ視聴より優先され、録画が始まるとチューナーを録画に譲ります。

`--recordings-dir` と `--mirakc-recording-dir` を両方指定すると、録画が終わるたびに TS を 1080p（HEVC が使えれば HEVC、なければ H.264）の HLS に変換し、録画ページに並べます。変換が終わった TS は消します。そのため moontv は mirakc と同じマシンで動かし、`recording.basedir` を読み書きできる必要があります。変換後の大きさは1時間で約 2.3GB（HEVC の場合）です。

## 番組表について

番組情報は mirakc が EPG を取得した結果を使います。mirakc が EPG を取得するまで、番組表とチャンネル一覧の番組名は空になります。
