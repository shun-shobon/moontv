//! DRCS（外字）のパターン（STD-B24 第1分冊第2部 附属書D）。

use std::collections::HashMap;

use super::{md5, tables};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Pattern {
    pub width: u8,
    pub height: u8,
    /// 階調数（2 以上）。
    pub levels: u8,
    /// 画素ごとの階調（0 が背景、`levels - 1` が前景）を行優先で並べたもの。
    pub pixels: Vec<u8>,
    /// パターンデータの MD5。置き換え表とビットマップの識別に使う。
    pub digest: [u8; 16],
}

impl Pattern {
    /// 置き換え表にあれば、その文字として描ける。
    pub fn replacement(&self) -> Option<char> {
        tables::DRCS_REPLACEMENTS
            .binary_search_by_key(&self.digest, |&(key, _)| key)
            .ok()
            .map(|i| tables::DRCS_REPLACEMENTS[i].1)
    }
}

/// 文字符号ごとのパターン。1つの符号に文字の大きさごとのパターンが付くことがある。
#[derive(Default, Clone)]
pub struct DrcsSet(HashMap<u16, Vec<Pattern>>);

impl DrcsSet {
    /// DRCS データユニットを読み込む。1 バイト DRCS の `CharacterCode` は上位バイトが集合の終端符号（0x41〜0x4F）。
    pub fn load(&mut self, data: &[u8]) -> Option<()> {
        let mut r = data;
        let codes = take(&mut r, 1)?[0];
        for _ in 0..codes {
            let head = take(&mut r, 3)?;
            let code = u16::from_be_bytes([head[0], head[1]]);
            let mut patterns = Vec::new();
            for _ in 0..head[2] {
                let mode = take(&mut r, 1)?[0] & 0x0f;
                if mode > 1 {
                    // ジオメトリックによる外字は運用されない。
                    let geometry = take(&mut r, 4)?;
                    take(&mut r, usize::from(u16::from_be_bytes([geometry[2], geometry[3]])))?;
                    continue;
                }
                let [depth, width, height] = *take(&mut r, 3)? else {
                    return None;
                };
                let levels = depth.checked_add(2)?;
                let bits = bits_per_pixel(levels);
                let count = usize::from(width) * usize::from(height);
                let data = take(&mut r, (count * bits).div_ceil(8))?;
                patterns.push(Pattern {
                    width,
                    height,
                    levels,
                    pixels: unpack(data, bits, count),
                    digest: md5::digest(data),
                });
            }
            self.0.insert(code, patterns);
        }
        Some(())
    }

    /// 文字の大きさに合うパターンを選ぶ。合うものがなければ最初のものを使う。
    pub fn get(&self, code: u16, width: u32, height: u32) -> Option<&Pattern> {
        let patterns = self.0.get(&code)?;
        patterns
            .iter()
            .find(|p| u32::from(p.width) == width && u32::from(p.height) == height)
            .or_else(|| patterns.first())
    }
}

fn take<'a>(r: &mut &'a [u8], n: usize) -> Option<&'a [u8]> {
    let (head, tail) = r.split_at_checked(n)?;
    *r = tail;
    Some(head)
}

/// 階調数を表すのに要るビット数。
const fn bits_per_pixel(levels: u8) -> usize {
    (levels - 1).bit_width() as usize
}

/// 画素は行優先・MSB 先頭で詰められている。
fn unpack(data: &[u8], bits: usize, count: usize) -> Vec<u8> {
    let mask = (1_u16 << bits) - 1;
    (0..count)
        .map(|i| {
            let bit = i * bits;
            let word = u16::from_be_bytes([data[bit / 8], data.get(bit / 8 + 1).copied().unwrap_or(0)]);
            let shift = 16 - bits - bit % 8;
            u8::try_from((word >> shift) & mask).unwrap_or(0)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_four_level_pattern() {
        // 符号 0x4121、フォント1つ、mode 0001、depth 2（4階調）、4x2 画素。
        let unit = [0x01, 0x41, 0x21, 0x01, 0x01, 0x02, 0x04, 0x02, 0b0001_1011, 0b1110_0100];
        let mut set = DrcsSet::default();
        set.load(&unit).unwrap();
        let pattern = set.get(0x4121, 4, 2).unwrap();
        assert_eq!(pattern.levels, 4);
        assert_eq!(pattern.pixels, vec![0, 1, 2, 3, 3, 2, 1, 0]);
        assert_eq!(pattern.digest, md5::digest(&[0b0001_1011, 0b1110_0100]));
    }

    #[test]
    fn counts_bits_per_pixel() {
        assert_eq!(bits_per_pixel(2), 1);
        assert_eq!(bits_per_pixel(4), 2);
        assert_eq!(bits_per_pixel(5), 3);
    }

    #[test]
    fn rejects_a_truncated_unit() {
        let unit = [0x01, 0x41, 0x21, 0x01, 0x01, 0x02, 0x04, 0x02, 0b0001_1011];
        assert_eq!(DrcsSet::default().load(&unit), None);
    }
}
