use std::path::{Path, PathBuf};
use std::process::Stdio;

use anyhow::{Result, bail};
use clap::ValueEnum;
use tokio::process::Command;

use super::profile::{Codec, Quality};

/// 1秒ごとにキーフレームを打ち、HLS セグメントを 1 秒単位で切れるようにする。
pub const SEGMENT_SECONDS: u32 = 1;
const GOP_FRAMES: u32 = 30 * SEGMENT_SECONDS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum)]
pub enum EncoderChoice {
    Auto,
    Vaapi,
    Qsv,
    Videotoolbox,
    Software,
}

#[derive(Debug, Clone)]
pub enum Encoder {
    Vaapi { device: PathBuf },
    Qsv { device: PathBuf },
    VideoToolbox,
    Software,
}

#[derive(Debug, Clone)]
pub struct EncoderSetup {
    pub ffmpeg: PathBuf,
    pub encoder: Encoder,
    pub codecs: Vec<Codec>,
}

impl Encoder {
    pub const fn name(&self) -> &'static str {
        match self {
            Self::Vaapi { .. } => "vaapi",
            Self::Qsv { .. } => "qsv",
            Self::VideoToolbox => "videotoolbox",
            Self::Software => "software",
        }
    }

    /// 入力より前に置く ffmpeg 引数（ハードウェアデバイスの初期化）。
    pub fn global_args(&self) -> Vec<String> {
        match self {
            Self::Vaapi { device } => args(&[
                "-init_hw_device",
                &format!("vaapi=va:{}", device.display()),
                "-filter_hw_device",
                "va",
            ]),
            Self::Qsv { device } => args(&[
                "-init_hw_device",
                &format!("vaapi=va:{}", device.display()),
                "-init_hw_device",
                "qsv=qs@va",
                "-filter_hw_device",
                "qs",
            ]),
            Self::VideoToolbox | Self::Software => Vec::new(),
        }
    }

    /// 映像フィルタとエンコーダの引数。
    /// デコードは常にソフトウェアで行う。MPEG-2 のハードウェアデコードは非対応の GPU があり、
    /// 失敗時に ffmpeg がソフトウェアへ落ちるとフィルタのフレーム形式が合わなくなるため。
    pub fn video_args(&self, codec: Codec, quality: Quality) -> Vec<String> {
        let spec = quality.spec(codec);
        let (w, h) = (spec.width, spec.height);
        let software_filter = format!("bwdif=mode=send_frame:deint=interlaced,scale={w}:{h},setsar=1,format=yuv420p");
        let bitrate = format!("{}k", spec.video_kbps);
        let maxrate = format!("{}k", spec.video_kbps * 3 / 2);
        let bufsize = format!("{}k", spec.video_kbps * 2);
        let gop = GOP_FRAMES.to_string();

        let mut out = match self {
            Self::Vaapi { .. } => {
                let filter =
                    format!("format=nv12,hwupload,deinterlace_vaapi=rate=frame:auto=1,scale_vaapi=w={w}:h={h}");
                let (encoder, profile) = match codec {
                    Codec::Hevc => ("hevc_vaapi", "main"),
                    Codec::H264 => ("h264_vaapi", "high"),
                };
                args(&[
                    "-vf",
                    &filter,
                    "-c:v",
                    encoder,
                    "-profile:v",
                    profile,
                    "-rc_mode",
                    "VBR",
                ])
            }
            Self::Qsv { .. } => {
                let filter = format!("format=nv12,hwupload=extra_hw_frames=64,vpp_qsv=deinterlace=2:w={w}:h={h}");
                let (encoder, profile) = match codec {
                    Codec::Hevc => ("hevc_qsv", "main"),
                    Codec::H264 => ("h264_qsv", "high"),
                };
                args(&[
                    "-vf",
                    &filter,
                    "-c:v",
                    encoder,
                    "-profile:v",
                    profile,
                    "-preset",
                    "veryfast",
                ])
            }
            Self::VideoToolbox => {
                let (encoder, profile) = match codec {
                    Codec::Hevc => ("hevc_videotoolbox", "main"),
                    Codec::H264 => ("h264_videotoolbox", "high"),
                };
                args(&[
                    "-vf",
                    &software_filter,
                    "-c:v",
                    encoder,
                    "-profile:v",
                    profile,
                    "-realtime",
                    "1",
                ])
            }
            Self::Software => match codec {
                Codec::Hevc => args(&[
                    "-vf",
                    &software_filter,
                    "-c:v",
                    "libx265",
                    "-preset",
                    "veryfast",
                    "-x265-params",
                    &format!("log-level=error:keyint={gop}:min-keyint={gop}:scenecut=0"),
                ]),
                Codec::H264 => args(&[
                    "-vf",
                    &software_filter,
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-profile:v",
                    "high",
                    "-sc_threshold",
                    "0",
                ]),
            },
        };
        out.extend(args(&[
            "-b:v", &bitrate, "-maxrate", &maxrate, "-bufsize", &bufsize, "-g", &gop,
        ]));
        out
    }

    /// AMD の VAAPI（Mesa）は HEVC の PPS を ffmpeg の extradata と異なる値で出力する。
    /// hvc1 では extradata の PPS でデコードされ映像が壊れるため、出力 TS を別の ffmpeg で読み直して
    /// 実際の PPS から hvcC を作らせる。HLS の muxer は最初のパケットより前に init.mp4 を書くので、
    /// `extract_extradata` では直らない。
    pub fn needs_remux(&self, codec: Codec) -> bool {
        matches!(self, Self::Vaapi { .. }) && codec == Codec::Hevc
    }
}

fn args(items: &[&str]) -> Vec<String> {
    items.iter().map(|s| (*s).to_owned()).collect()
}

fn candidates(choice: EncoderChoice, vaapi_device: &Path) -> Vec<Encoder> {
    let device = vaapi_device.to_path_buf();
    match choice {
        EncoderChoice::Vaapi => vec![Encoder::Vaapi { device }],
        EncoderChoice::Qsv => vec![Encoder::Qsv { device }],
        EncoderChoice::Videotoolbox => vec![Encoder::VideoToolbox],
        EncoderChoice::Software => vec![Encoder::Software],
        EncoderChoice::Auto => {
            let mut list = Vec::new();
            if cfg!(target_os = "macos") {
                list.push(Encoder::VideoToolbox);
            }
            if vaapi_device.exists() {
                list.push(Encoder::Vaapi { device: device.clone() });
                list.push(Encoder::Qsv { device });
            }
            list.push(Encoder::Software);
            list
        }
    }
}

/// 候補のエンコーダで実際に短い映像をエンコードし、使えるものを選ぶ。
/// ffmpeg のビルド構成とドライバの組み合わせは `-encoders` の一覧だけでは判断できないため。
pub async fn detect(ffmpeg: &Path, choice: EncoderChoice, vaapi_device: &Path) -> Result<EncoderSetup> {
    for encoder in candidates(choice, vaapi_device) {
        let mut codecs = Vec::new();
        for codec in [Codec::Hevc, Codec::H264] {
            if probe(ffmpeg, &encoder, codec).await {
                codecs.push(codec);
            }
        }
        tracing::info!(encoder = encoder.name(), ?codecs, "probed encoder");
        if !codecs.is_empty() {
            return Ok(EncoderSetup {
                ffmpeg: ffmpeg.to_path_buf(),
                encoder,
                codecs,
            });
        }
    }
    bail!("no usable encoder found (ffmpeg: {})", ffmpeg.display())
}

async fn probe(ffmpeg: &Path, encoder: &Encoder, codec: Codec) -> bool {
    let status = Command::new(ffmpeg)
        .args(["-hide_banner", "-loglevel", "error"])
        .args(encoder.global_args())
        .args([
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=1440x1080:rate=30000/1001",
            "-frames:v",
            "10",
        ])
        .args(encoder.video_args(codec, Quality::P360))
        .args(["-f", "null", "-"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .status()
        .await;
    matches!(status, Ok(s) if s.success())
}
