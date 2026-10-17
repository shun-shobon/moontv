//! ARIB 字幕（STD-B24）の解読。

mod code;
mod drcs;
mod group;
mod md5;
mod screen;
mod tables;

use code::{Decoder, Op};
use drcs::DrcsSet;
#[cfg(test)]
pub use group::tests as fixtures;
use group::{DataGroup, UNIT_DRCS_1BYTE, UNIT_DRCS_2BYTE, UNIT_TEXT};
pub use screen::Snapshot;
use screen::{Layout, Screen};

/// 字幕文1つから作る画面の状態。`delay` は字幕文の表示開始からの遅れ（90kHz）で、TIME による待ちで生じる。
#[derive(Debug, PartialEq, Eq)]
pub struct Frame {
    pub delay: u64,
    pub snapshot: Snapshot,
}

/// 1つの字幕 ES（字幕か文字スーパー）の第1言語を解読する。
pub struct CaptionDecoder {
    decoder: Decoder,
    screen: Screen,
    set: Option<u8>,
    /// 字幕管理データで定義された DRCS。字幕文ごとにここから始める。
    management_drcs: DrcsSet,
}

impl CaptionDecoder {
    pub fn new() -> Self {
        Self {
            decoder: Decoder::new(),
            screen: Screen::new(Layout::for_swf(7)),
            set: None,
            management_drcs: DrcsSet::default(),
        }
    }

    pub fn snapshot(&self) -> Snapshot {
        self.screen.snapshot()
    }

    /// 字幕 PES の PES ヘッダーより後ろを受け取り、画面が変わったらその状態を返す。
    pub fn push(&mut self, pes_data: &[u8]) -> Vec<Frame> {
        match group::parse(pes_data) {
            Some(DataGroup::Management(m)) if self.set != Some(m.set) => {
                self.set = Some(m.set);
                let format = m.languages.first().map_or(0b1000, |l| l.format);
                let mut defaults = Layout::for_format(format);
                let mut management_drcs = DrcsSet::default();
                for unit in &m.units {
                    match unit.parameter {
                        UNIT_TEXT => {
                            self.decoder.reset_codes();
                            for op in self.decode(unit.data) {
                                defaults.apply(&op);
                            }
                        }
                        UNIT_DRCS_1BYTE | UNIT_DRCS_2BYTE => {
                            management_drcs.load(unit.data);
                        }
                        _ => {}
                    }
                }
                self.management_drcs = management_drcs;
                // 管理データの更新では表示を消して初期化する（STD-B24 第3部 表 8-1）。
                let before = self.screen.snapshot();
                self.screen = Screen::new(defaults);
                let after = self.screen.snapshot();
                if before == after {
                    Vec::new()
                } else {
                    vec![Frame {
                        delay: 0,
                        snapshot: after,
                    }]
                }
            }
            Some(DataGroup::Statement {
                set,
                language: 1,
                units,
            }) if self.set == Some(set) => self.statement(&units),
            _ => Vec::new(),
        }
    }

    fn statement(&mut self, units: &[group::DataUnit<'_>]) -> Vec<Frame> {
        let mut drcs = self.management_drcs.clone();
        self.decoder.reset_macros();
        let mut frames = Vec::new();
        let mut delay = 0;
        let mut last = self.screen.snapshot();
        for unit in units {
            match unit.parameter {
                UNIT_DRCS_1BYTE | UNIT_DRCS_2BYTE => {
                    drcs.load(unit.data);
                }
                UNIT_TEXT => {
                    self.decoder.reset_codes();
                    self.screen.reset_state();
                    for op in self.decode(unit.data) {
                        if let Op::Wait(tenths) = op {
                            push_frame(&mut frames, &mut last, delay, self.screen.snapshot());
                            delay += u64::from(tenths) * 9000;
                        } else {
                            self.screen.apply(&op, &drcs);
                        }
                    }
                }
                _ => {}
            }
        }
        push_frame(&mut frames, &mut last, delay, self.screen.snapshot());
        frames
    }

    fn decode(&mut self, data: &[u8]) -> Vec<Op> {
        let mut ops = Vec::new();
        self.decoder.decode(data, &mut ops);
        ops
    }
}

fn push_frame(frames: &mut Vec<Frame>, last: &mut Snapshot, delay: u64, snapshot: Snapshot) {
    if snapshot != *last {
        *last = snapshot.clone();
        frames.push(Frame { delay, snapshot });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use group::tests::{management, statement, unit};

    #[test]
    fn shows_a_statement_and_clears_it_after_a_wait() {
        let mut decoder = CaptionDecoder::new();
        assert_eq!(decoder.push(&management(0b1000)), Vec::new());

        // CS、平仮名「あ」、TIME で 1.5 秒待ってから CS。
        let text = [0x0c, 0xa2, 0x9d, 0x20, 0x4f, 0x0c];
        let frames = decoder.push(&statement(&[unit(UNIT_TEXT, &text)]));
        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0].delay, 0);
        assert_eq!(frames[0].snapshot.runs[0].text, "あ");
        assert_eq!(frames[1].delay, 15 * 9000);
        assert_eq!(frames[1].snapshot.runs, Vec::new());
    }

    #[test]
    fn ignores_statements_before_the_management_data() {
        let mut decoder = CaptionDecoder::new();
        assert_eq!(decoder.push(&statement(&[unit(UNIT_TEXT, &[0xa2])])), Vec::new());
    }

    #[test]
    fn uses_the_format_of_the_management_data() {
        let mut decoder = CaptionDecoder::new();
        decoder.push(&management(0b1010));
        let frames = decoder.push(&statement(&[unit(UNIT_TEXT, &[0xa2])]));
        assert_eq!(frames[0].snapshot.plane, [720, 480]);
        // 720x480 の行間は 16。
        assert_eq!(frames[0].snapshot.runs[0].cell_height, 52);
    }
}
