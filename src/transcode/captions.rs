use std::collections::VecDeque;

use serde::Serialize;

use crate::caption::{CaptionDecoder, Snapshot};
use crate::ts::{self, ElementaryStream, PTS_MASK, PesAssembler, Pmt};

/// ARIB の地デジ・BS が ES に使う範囲と重ならない値。
pub const ID3_PID: u16 = 0x0ff2;
const STREAM_TYPE_METADATA: u8 = 0x15;
const STREAM_TYPE_PRIVATE_DATA: u8 = 0x06;
const STREAM_ID_PRIVATE_1: u8 = 0xbd;
const STREAM_ID_PRIVATE_2: u8 = 0xbf;
const COMPONENT_CAPTION: u8 = 0x30;
const COMPONENT_SUPERIMPOSE: u8 = 0x38;
const VIDEO_STREAM_TYPES: [u8; 3] = [0x02, 0x1b, 0x24];
/// 字幕が変わらなくてもこの間隔で今の状態を送る。ID3 が途切れると ffmpeg が出力を止めて待ってしまう。
const HEARTBEAT: u64 = 90_000;
/// ID3 の PRIV フレームの所有者。プレイヤーはこれで moontv の字幕を見分ける。
const ID3_OWNER: &[u8] = b"moontv";

/// ffmpeg に ID3 として読ませるための記述子。登録記述子がないと ffmpeg は MP3 の音声と誤認する。
const ID3_DESCRIPTORS: [u8; 21] = [
    0x05, 0x04, b'I', b'D', b'3', b' ', // registration_descriptor
    0x26, 0x0d, 0xff, 0xff, b'I', b'D', b'3', b' ', 0xff, b'I', b'D', b'3', b' ', 0x00,
    0x0f, // metadata_descriptor
];

#[derive(Clone, Copy, PartialEq, Eq)]
enum Layer {
    Caption,
    Superimpose,
}

struct Track {
    pid: Option<u16>,
    pes: PesAssembler,
    decoder: CaptionDecoder,
}

impl Track {
    fn new() -> Self {
        Self {
            pid: None,
            pes: PesAssembler::new(),
            decoder: CaptionDecoder::new(),
        }
    }
}

#[derive(Serialize)]
struct Payload<'a> {
    /// 状態が変わるたびに増える。同じ状態を送り直したときは同じ値になる。
    seq: u64,
    caption: &'a Snapshot,
    superimpose: &'a Snapshot,
}

pub struct Captions {
    caption: Track,
    superimpose: Track,
    video_pid: Option<u16>,
    video_pts: Option<u64>,
    pending: VecDeque<(u64, Layer, Snapshot)>,
    current_caption: Snapshot,
    current_superimpose: Snapshot,
    seq: u64,
    last_sent: Option<u64>,
    counter: u8,
}

impl Captions {
    pub fn new() -> Self {
        let caption = Track::new();
        let current = caption.decoder.snapshot();
        Self {
            caption,
            superimpose: Track::new(),
            video_pid: None,
            video_pts: None,
            pending: VecDeque::new(),
            current_caption: current.clone(),
            current_superimpose: current,
            seq: 0,
            last_sent: None,
            counter: 0,
        }
    }

    pub fn rewrite_pmt(&mut self, pmt: &mut Pmt) {
        let find = |tag: u8| {
            pmt.streams
                .iter()
                .find(|es| es.stream_type == STREAM_TYPE_PRIVATE_DATA && es.component_tag() == Some(tag))
                .map(|es| es.pid)
        };
        self.caption.pid = find(COMPONENT_CAPTION);
        self.superimpose.pid = find(COMPONENT_SUPERIMPOSE);
        self.video_pid = pmt
            .streams
            .iter()
            .find(|es| VIDEO_STREAM_TYPES.contains(&es.stream_type))
            .map(|es| es.pid);
        pmt.streams.push(ElementaryStream {
            stream_type: STREAM_TYPE_METADATA,
            pid: ID3_PID,
            descriptors: ID3_DESCRIPTORS.to_vec(),
        });
    }

    /// パケット自体は `out` に書き出さない。
    pub fn inspect(&mut self, packet: &[u8], out: &mut Vec<u8>) {
        let pid = ts::pid(packet);
        if Some(pid) == self.video_pid {
            if ts::is_unit_start(packet)
                && let Some(pts) = ts::payload(packet).and_then(ts::pes_pts)
            {
                // B フレームの並べ替えで PTS は前後するので、見た中で最も後の時刻を今の時刻とする。
                let now = match self.video_pts {
                    Some(current) if !is_after(pts, current) => current,
                    _ => pts,
                };
                self.video_pts = Some(now);
                self.flush(now, out);
            }
        } else if Some(pid) == self.caption.pid {
            self.receive(Layer::Caption, packet);
        } else if Some(pid) == self.superimpose.pid {
            self.receive(Layer::Superimpose, packet);
        }
    }

    fn receive(&mut self, layer: Layer, packet: &[u8]) {
        let track = match layer {
            Layer::Caption => &mut self.caption,
            Layer::Superimpose => &mut self.superimpose,
        };
        for pes in track.pes.push(packet) {
            let (data, pts) = match pes.get(3) {
                Some(&STREAM_ID_PRIVATE_1) => (ts::pes_data(&pes), ts::pes_pts(&pes)),
                // 非同期型 PES（文字スーパー）は PES ヘッダーの拡張を持たず、受け取ったらすぐ表示する。
                Some(&STREAM_ID_PRIVATE_2) => (pes.get(6..), None),
                _ => continue,
            };
            let (Some(data), Some(start)) = (data, pts.or(self.video_pts)) else {
                continue;
            };
            for frame in track.decoder.push(data) {
                let at = (start + frame.delay) & PTS_MASK;
                let index = self.pending.partition_point(|(t, ..)| !is_after(*t, at));
                self.pending.insert(index, (at, layer, frame.snapshot));
            }
        }
    }

    fn flush(&mut self, video_pts: u64, out: &mut Vec<u8>) {
        let mut changed = false;
        while let Some((at, ..)) = self.pending.front()
            && !is_after(*at, video_pts)
        {
            let (_, layer, snapshot) = self.pending.pop_front().expect("checked by front()");
            match layer {
                Layer::Caption => self.current_caption = snapshot,
                Layer::Superimpose => self.current_superimpose = snapshot,
            }
            changed = true;
        }
        let due = self
            .last_sent
            .is_none_or(|last| video_pts.wrapping_sub(last) & PTS_MASK >= HEARTBEAT);
        if changed {
            self.seq += 1;
        }
        if changed || due {
            self.send(video_pts, out);
        }
    }

    fn send(&mut self, pts: u64, out: &mut Vec<u8>) {
        let payload = Payload {
            seq: self.seq,
            caption: &self.current_caption,
            superimpose: &self.current_superimpose,
        };
        let json = serde_json::to_vec(&payload).expect("snapshots serialize to JSON");
        let pes = ts::build_pes(STREAM_ID_PRIVATE_1, pts, &id3_priv(ID3_OWNER, &json));
        ts::write_pes(ID3_PID, &pes, &mut self.counter, out);
        self.last_sent = Some(pts);
    }
}

/// PTS は 33 ビットで一周するので、差が半周未満なら後とみなす。
const fn is_after(a: u64, b: u64) -> bool {
    let diff = a.wrapping_sub(b) & PTS_MASK;
    diff != 0 && diff < (1 << 32)
}

fn id3_priv(owner: &[u8], data: &[u8]) -> Vec<u8> {
    let body_len = owner.len() + 1 + data.len();
    let mut tag = b"ID3\x04\x00\x00".to_vec();
    tag.extend_from_slice(&syncsafe(10 + body_len));
    tag.extend_from_slice(b"PRIV");
    tag.extend_from_slice(&syncsafe(body_len));
    tag.extend_from_slice(&[0, 0]);
    tag.extend_from_slice(owner);
    tag.push(0);
    tag.extend_from_slice(data);
    tag
}

/// ID3v2.4 の大きさは各バイトの最上位ビットを使わない 28 ビットで表す。
fn syncsafe(n: usize) -> [u8; 4] {
    let n = u32::try_from(n).expect("ID3 tags we build are far smaller than 256 MiB");
    [21, 14, 7, 0].map(|shift| ((n >> shift) & 0x7f).to_le_bytes()[0])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::caption::fixtures::{management, statement, unit};
    use crate::ts::tests::{packet, sample_pmt};

    const VIDEO_PID: u16 = 0x0100;
    const CAPTION_PID: u16 = 0x0130;

    fn pmt() -> Pmt {
        let mut pmt = sample_pmt();
        pmt.streams.push(ElementaryStream {
            stream_type: STREAM_TYPE_PRIVATE_DATA,
            pid: CAPTION_PID,
            descriptors: vec![0x52, 1, COMPONENT_CAPTION],
        });
        pmt
    }

    fn caption_pes(pts: u64, data: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        let mut counter = 0;
        ts::write_pes(
            CAPTION_PID,
            &ts::build_pes(STREAM_ID_PRIVATE_1, pts, data),
            &mut counter,
            &mut out,
        );
        out
    }

    fn video(pts: u64) -> Vec<u8> {
        packet(VIDEO_PID, true, 0, &ts::build_pes(0xe0, pts, &[0; 8]))
    }

    fn sent(out: &[u8]) -> Vec<(u64, serde_json::Value)> {
        let mut pes = PesAssembler::new();
        out.chunks(ts::PACKET_SIZE)
            .filter(|p| ts::pid(p) == ID3_PID)
            .flat_map(|p| pes.push(p))
            .map(|pes| {
                let tag = ts::pes_data(&pes).unwrap();
                assert!(tag.starts_with(b"ID3\x04"));
                let frame = &tag[20..];
                assert!(frame.starts_with(b"moontv\0"));
                (ts::pes_pts(&pes).unwrap(), serde_json::from_slice(&frame[7..]).unwrap())
            })
            .collect()
    }

    fn text(state: &serde_json::Value) -> String {
        state["caption"]["runs"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|r| r["text"].as_str())
            .collect()
    }

    fn run(packets: &[Vec<u8>]) -> Vec<(u64, serde_json::Value)> {
        let mut captions = Captions::new();
        let mut pmt = pmt();
        captions.rewrite_pmt(&mut pmt);
        assert!(
            pmt.streams
                .iter()
                .any(|es| es.pid == ID3_PID && es.stream_type == STREAM_TYPE_METADATA)
        );
        let mut out = Vec::new();
        for p in packets.iter().flat_map(|p| p.chunks(ts::PACKET_SIZE)) {
            captions.inspect(p, &mut out);
        }
        sent(&out)
    }

    #[test]
    fn sends_the_state_every_second_even_without_captions() {
        let states = run(&[video(0), video(45_000), video(90_000), video(180_000)]);
        let times: Vec<_> = states.iter().map(|(t, _)| *t).collect();
        assert_eq!(times, vec![0, 90_000, 180_000]);
        assert!(states.iter().all(|(_, s)| s["seq"] == 0 && text(s).is_empty()));
    }

    #[test]
    fn sends_a_caption_when_the_video_reaches_its_time() {
        // CS、「あ」、TIME で 1 秒待って CS。
        let text_unit = unit(
            crate::caption::fixtures::UNIT_TEXT_FOR_TESTS,
            &[0x0c, 0xa2, 0x9d, 0x20, 0x4a, 0x0c],
        );
        let states = run(&[
            caption_pes(0, &management(0b1000)),
            video(0),
            caption_pes(30_000, &statement(&[text_unit])),
            video(20_000),
            video(40_000),
            video(130_000),
        ]);
        let shown: Vec<_> = states
            .iter()
            .map(|(t, s)| (*t, s["seq"].as_u64().unwrap(), text(s)))
            .collect();
        assert_eq!(
            shown,
            vec![
                (0, 0, String::new()),
                (40_000, 1, "あ".to_owned()),
                (130_000, 2, String::new())
            ]
        );
    }

    #[test]
    fn video_time_does_not_go_back_with_reordered_frames() {
        let states = run(&[video(90_000), video(30_000), video(120_000), video(180_000)]);
        let times: Vec<_> = states.iter().map(|(t, _)| *t).collect();
        assert_eq!(times, vec![90_000, 180_000]);
    }

    #[test]
    fn compares_times_across_the_wraparound() {
        assert!(is_after(5, PTS_MASK - 5));
        assert!(!is_after(PTS_MASK - 5, 5));
        assert!(!is_after(7, 7));
    }

    #[test]
    fn builds_an_id3_tag_with_syncsafe_sizes() {
        let tag = id3_priv(b"moontv", &[0; 200]);
        assert_eq!(&tag[6..10], &[0, 0, 1, 89]);
        assert_eq!(tag.len(), 10 + 10 + 7 + 200);
    }
}
