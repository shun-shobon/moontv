use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Codec {
    Hevc,
    H264,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Quality {
    #[serde(rename = "1080p")]
    P1080,
    #[serde(rename = "720p")]
    P720,
    #[serde(rename = "540p")]
    P540,
    #[serde(rename = "360p")]
    P360,
}

pub const QUALITIES: [Quality; 4] = [Quality::P1080, Quality::P720, Quality::P540, Quality::P360];

pub struct Spec {
    pub width: u32,
    pub height: u32,
    pub video_kbps: u32,
    pub audio_kbps: u32,
    /// HLS の CODECS 属性。Safari はこれを見て再生可否を判断する。
    pub codecs: &'static str,
}

impl Quality {
    pub const fn label(self) -> &'static str {
        match self {
            Self::P1080 => "1080p",
            Self::P720 => "720p",
            Self::P540 => "540p",
            Self::P360 => "360p",
        }
    }

    pub const fn spec(self, codec: Codec) -> Spec {
        // HEVC は同等画質の H.264 より 4 割程度少ないビットレートで済む。
        let (width, height, hevc_kbps, h264_kbps, audio_kbps, hevc_codecs, h264_codecs) = match self {
            Self::P1080 => (1920, 1080, 5000, 8000, 192, "hvc1.1.6.L120.90", "avc1.640028"),
            Self::P720 => (1280, 720, 2500, 4000, 192, "hvc1.1.6.L93.90", "avc1.64001f"),
            Self::P540 => (960, 540, 1500, 2200, 128, "hvc1.1.6.L90.90", "avc1.64001f"),
            Self::P360 => (640, 360, 700, 1000, 96, "hvc1.1.6.L63.90", "avc1.64001e"),
        };
        let (video_kbps, codecs) = match codec {
            Codec::Hevc => (hevc_kbps, hevc_codecs),
            Codec::H264 => (h264_kbps, h264_codecs),
        };
        Spec {
            width,
            height,
            video_kbps,
            audio_kbps,
            codecs,
        }
    }
}

impl Codec {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Hevc => "hevc",
            Self::H264 => "h264",
        }
    }
}
