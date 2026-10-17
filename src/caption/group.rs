//! 字幕 PES のデータグループ（STD-B24 第1分冊第3部 9章）。

/// 本文。管理データの中では表示領域の設定に使う。
pub const UNIT_TEXT: u8 = 0x20;
pub const UNIT_DRCS_1BYTE: u8 = 0x30;
pub const UNIT_DRCS_2BYTE: u8 = 0x31;

const DATA_IDENTIFIER_SYNC: u8 = 0x80;
const DATA_IDENTIFIER_ASYNC: u8 = 0x81;

#[derive(Debug, PartialEq, Eq)]
pub enum DataGroup<'a> {
    Management(Management<'a>),
    /// 第 `language` 言語（1 始まり）の字幕文。
    Statement {
        set: u8,
        language: u8,
        units: Vec<DataUnit<'a>>,
    },
}

#[derive(Debug, PartialEq, Eq)]
pub struct Management<'a> {
    /// 組（A/B）。管理データが更新されるたびに切り替わり、受信機は管理データと同じ組の字幕文だけを扱う。
    pub set: u8,
    pub languages: Vec<Language>,
    pub units: Vec<DataUnit<'a>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Language {
    /// 0 が第1言語。
    pub tag: u8,
    pub iso_639: [u8; 3],
    /// 表示書式（STD-B24 表 9-7 の値。SWF の値とは異なる）。
    pub format: u8,
    /// 0 が8単位符号、1 が UCS。
    pub tcs: u8,
    pub rollup: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub struct DataUnit<'a> {
    pub parameter: u8,
    pub data: &'a [u8],
}

/// 字幕 PES の PES ヘッダーより後ろを読む。
pub fn parse(pes_data: &[u8]) -> Option<DataGroup<'_>> {
    let [identifier, 0xff, header, rest @ ..] = pes_data else {
        return None;
    };
    if *identifier != DATA_IDENTIFIER_SYNC && *identifier != DATA_IDENTIFIER_ASYNC {
        return None;
    }
    let group = rest.get(usize::from(header & 0x0f)..)?;
    parse_group(group)
}

fn parse_group(group: &[u8]) -> Option<DataGroup<'_>> {
    let [id_version, _link, _last_link, size_high, size_low, ..] = *group else {
        return None;
    };
    let size = usize::from(u16::from_be_bytes([size_high, size_low]));
    let data = group.get(5..5 + size)?;
    let crc = group.get(5 + size..7 + size)?;
    if crc16(&group[..5 + size]) != u16::from_be_bytes([crc[0], crc[1]]) {
        return None;
    }
    let set = id_version >> 7;
    match (id_version >> 2) & 0x0f {
        0 => parse_management(set, data).map(DataGroup::Management),
        language @ 1..=8 => parse_statement(data).map(|units| DataGroup::Statement { set, language, units }),
        _ => None,
    }
}

fn parse_management(set: u8, data: &[u8]) -> Option<Management<'_>> {
    let mut r = Reader(data);
    let tmd = r.u8()? >> 6;
    if tmd == 0b10 {
        r.skip(5)?;
    }
    let count = r.u8()?;
    let mut languages = Vec::with_capacity(usize::from(count));
    for _ in 0..count {
        let tag_dmf = r.u8()?;
        let dmf = tag_dmf & 0x0f;
        if matches!(dmf, 0b1100..=0b1110) {
            r.skip(1)?;
        }
        let iso_639 = r.take(3)?.try_into().ok()?;
        let format = r.u8()?;
        languages.push(Language {
            tag: tag_dmf >> 5,
            iso_639,
            format: format >> 4,
            tcs: (format >> 2) & 0x03,
            rollup: format & 0x03 == 0b01,
        });
    }
    Some(Management {
        set,
        languages,
        units: parse_units(&mut r)?,
    })
}

fn parse_statement(data: &[u8]) -> Option<Vec<DataUnit<'_>>> {
    let mut r = Reader(data);
    let tmd = r.u8()? >> 6;
    if tmd == 0b01 || tmd == 0b10 {
        r.skip(5)?;
    }
    parse_units(&mut r)
}

fn parse_units<'a>(r: &mut Reader<'a>) -> Option<Vec<DataUnit<'a>>> {
    let len = r.u24()?;
    let mut units = Reader(r.take(len)?);
    let mut out = Vec::new();
    while !units.0.is_empty() {
        if units.u8()? != 0x1f {
            return None;
        }
        let parameter = units.u8()?;
        let size = units.u24()?;
        out.push(DataUnit {
            parameter,
            data: units.take(size)?,
        });
    }
    Some(out)
}

/// CRC-16/CCITT（多項式 0x1021、初期値 0）。
fn crc16(data: &[u8]) -> u16 {
    let mut crc = 0_u16;
    for &byte in data {
        crc ^= u16::from(byte) << 8;
        for _ in 0..8 {
            crc = if crc & 0x8000 != 0 {
                (crc << 1) ^ 0x1021
            } else {
                crc << 1
            };
        }
    }
    crc
}

struct Reader<'a>(&'a [u8]);

impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> Option<&'a [u8]> {
        let (head, tail) = self.0.split_at_checked(n)?;
        self.0 = tail;
        Some(head)
    }

    fn skip(&mut self, n: usize) -> Option<()> {
        self.take(n).map(|_| ())
    }

    fn u8(&mut self) -> Option<u8> {
        self.take(1).map(|b| b[0])
    }

    fn u24(&mut self) -> Option<usize> {
        self.take(3)
            .map(|b| (usize::from(b[0]) << 16) | (usize::from(b[1]) << 8) | usize::from(b[2]))
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub const UNIT_TEXT_FOR_TESTS: u8 = UNIT_TEXT;

    pub fn unit(parameter: u8, data: &[u8]) -> Vec<u8> {
        let len = u32::try_from(data.len()).unwrap().to_be_bytes();
        let mut out = vec![0x1f, parameter, len[1], len[2], len[3]];
        out.extend_from_slice(data);
        out
    }

    fn with_units(head: &[u8], units: &[Vec<u8>]) -> Vec<u8> {
        let units: Vec<u8> = units.concat();
        let len = u32::try_from(units.len()).unwrap().to_be_bytes();
        let mut out = head.to_vec();
        out.extend_from_slice(&len[1..]);
        out.extend(units);
        out
    }

    /// データグループを包んだ字幕 PES のデータを作る。
    pub fn pes_data(group_id: u8, data: &[u8]) -> Vec<u8> {
        let mut group = vec![group_id << 2, 0, 0];
        group.extend_from_slice(&u16::try_from(data.len()).unwrap().to_be_bytes());
        group.extend_from_slice(data);
        let crc = crc16(&group);
        group.extend_from_slice(&crc.to_be_bytes());
        let mut out = vec![DATA_IDENTIFIER_SYNC, 0xff, 0xf0];
        out.extend(group);
        out
    }

    pub fn statement(units: &[Vec<u8>]) -> Vec<u8> {
        pes_data(0x01, &with_units(&[0x3f], units))
    }

    pub fn management(format: u8) -> Vec<u8> {
        pes_data(0x00, &with_units(&[0x3f, 1, 0x00, b'j', b'p', b'n', format << 4], &[]))
    }

    #[test]
    fn crc_matches_the_ccitt_check_value() {
        assert_eq!(crc16(b"123456789"), 0x31c3);
    }

    #[test]
    fn reads_a_statement() {
        let data = statement(&[unit(UNIT_TEXT, b"abc"), unit(UNIT_DRCS_1BYTE, &[1])]);
        assert_eq!(
            parse(&data),
            Some(DataGroup::Statement {
                set: 0,
                language: 1,
                units: vec![
                    DataUnit {
                        parameter: UNIT_TEXT,
                        data: b"abc"
                    },
                    DataUnit {
                        parameter: UNIT_DRCS_1BYTE,
                        data: &[1]
                    },
                ],
            })
        );
    }

    #[test]
    fn reads_the_languages_of_the_management_data() {
        let data = management(0b1000);
        let Some(DataGroup::Management(m)) = parse(&data) else {
            panic!("not management data");
        };
        assert_eq!(
            m.languages,
            vec![Language {
                tag: 0,
                iso_639: *b"jpn",
                format: 0b1000,
                tcs: 0,
                rollup: false,
            }]
        );
    }

    #[test]
    fn skips_the_time_fields_that_depend_on_the_mode() {
        // TMD がオフセットタイムなら OTM、DMF が 1100 なら DC が入る。
        let data = with_units(
            &[0x80, 1, 2, 3, 4, 5, 1, 0x0c, 0x00, b'e', b'n', b'g', 0x81],
            &[unit(UNIT_TEXT, b"x")],
        );
        let pes = pes_data(0x20, &data);
        let Some(DataGroup::Management(m)) = parse(&pes) else {
            panic!("not management data");
        };
        assert_eq!(m.languages[0].iso_639, *b"eng");
        assert!(m.languages[0].rollup);
        assert_eq!(m.units.len(), 1);
    }

    #[test]
    fn rejects_a_broken_crc() {
        let mut data = statement(&[unit(UNIT_TEXT, b"abc")]);
        let last = data.len() - 1;
        data[last] ^= 1;
        assert_eq!(parse(&data), None);
    }
}
