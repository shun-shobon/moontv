//! MPEG-TS のパケットと PSI セクション（PAT・PMT）の読み書き。

pub const PACKET_SIZE: usize = 188;
pub const SYNC_BYTE: u8 = 0x47;
pub const PAT_PID: u16 = 0x0000;

const TABLE_ID_PAT: u8 = 0x00;
const TABLE_ID_PMT: u8 = 0x02;
const DESCRIPTOR_STREAM_IDENTIFIER: u8 = 0x52;

pub fn pid(packet: &[u8]) -> u16 {
    (u16::from(packet[1] & 0x1f) << 8) | u16::from(packet[2])
}

pub const fn is_unit_start(packet: &[u8]) -> bool {
    packet[1] & 0x40 != 0
}

pub const fn has_payload(packet: &[u8]) -> bool {
    packet[3] & 0x10 != 0
}

pub fn payload(packet: &[u8]) -> Option<&[u8]> {
    if !has_payload(packet) {
        return None;
    }
    let start = if packet[3] & 0x20 != 0 {
        5 + usize::from(packet[4])
    } else {
        4
    };
    packet.get(start..)
}

pub const fn set_pid(packet: &mut [u8], pid: u16) {
    let [high, low] = pid.to_be_bytes();
    packet[1] = (packet[1] & 0xe0) | (high & 0x1f);
    packet[2] = low;
}

pub const fn set_continuity_counter(packet: &mut [u8], counter: u8) {
    packet[3] = (packet[3] & 0xf0) | (counter & 0x0f);
}

/// MPEG-2 の CRC32。CRC まで含めたセクション全体に掛けると 0 になる。
pub fn crc32(data: &[u8]) -> u32 {
    let mut crc = 0xffff_ffff_u32;
    for &byte in data {
        crc ^= u32::from(byte) << 24;
        for _ in 0..8 {
            crc = if crc & 0x8000_0000 != 0 {
                (crc << 1) ^ 0x04c1_1db7
            } else {
                crc << 1
            };
        }
    }
    crc
}

/// 複数パケットにまたがる PSI セクションを組み立てる。
pub struct SectionAssembler {
    buf: Vec<u8>,
    started: bool,
}

impl SectionAssembler {
    pub const fn new() -> Self {
        Self {
            buf: Vec::new(),
            started: false,
        }
    }

    /// パケットを1つ受け取り、組み立て終わったセクションを返す。
    pub fn push(&mut self, packet: &[u8]) -> Vec<Vec<u8>> {
        let mut sections = Vec::new();
        let Some(payload) = payload(packet) else {
            return sections;
        };
        if is_unit_start(packet) {
            let Some((&pointer, rest)) = payload.split_first() else {
                return sections;
            };
            let Some((tail, head)) = rest.split_at_checked(usize::from(pointer)) else {
                self.reset();
                return sections;
            };
            if self.started {
                self.buf.extend_from_slice(tail);
                self.drain(&mut sections);
            }
            self.buf.clear();
            self.buf.extend_from_slice(head);
            self.started = true;
        } else if self.started {
            self.buf.extend_from_slice(payload);
        } else {
            return sections;
        }
        self.drain(&mut sections);
        sections
    }

    fn drain(&mut self, sections: &mut Vec<Vec<u8>>) {
        while self.buf.len() >= 3 {
            // 0xff 以降はセクションの後ろの詰め物。
            if self.buf[0] == 0xff {
                self.reset();
                return;
            }
            let len = 3 + section_length(&self.buf);
            if self.buf.len() < len {
                return;
            }
            sections.push(self.buf.drain(..len).collect());
        }
    }

    fn reset(&mut self) {
        self.buf.clear();
        self.started = false;
    }
}

fn section_length(section: &[u8]) -> usize {
    (usize::from(section[1] & 0x0f) << 8) | usize::from(section[2])
}

fn is_valid_section(section: &[u8], table_id: u8) -> bool {
    section.len() >= 12 && section[0] == table_id && crc32(section) == 0
}

/// PAT から最初の番組の PMT の PID を返す。mirakc のサービス単位のストリームは番組を1つしか含まない。
pub fn parse_pat(section: &[u8]) -> Option<u16> {
    if !is_valid_section(section, TABLE_ID_PAT) {
        return None;
    }
    section[8..section.len() - 4]
        .as_chunks::<4>()
        .0
        .iter()
        .find(|entry| u16::from_be_bytes([entry[0], entry[1]]) != 0)
        .map(|entry| (u16::from(entry[2] & 0x1f) << 8) | u16::from(entry[3]))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Pmt {
    pub program_number: u16,
    pub version: u8,
    pub pcr_pid: u16,
    pub program_info: Vec<u8>,
    pub streams: Vec<ElementaryStream>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ElementaryStream {
    pub stream_type: u8,
    pub pid: u16,
    pub descriptors: Vec<u8>,
}

impl ElementaryStream {
    /// ARIB はストリーム識別記述子の `component_tag` で各 ES の役割（主音声は 0x10 など）を表す。
    pub fn component_tag(&self) -> Option<u8> {
        let mut rest = self.descriptors.as_slice();
        while let [tag, len, body @ ..] = rest {
            let len = usize::from(*len);
            if *tag == DESCRIPTOR_STREAM_IDENTIFIER && len >= 1 {
                return body.first().copied();
            }
            rest = body.get(len..)?;
        }
        None
    }
}

impl Pmt {
    pub fn parse(section: &[u8]) -> Option<Self> {
        if !is_valid_section(section, TABLE_ID_PMT) {
            return None;
        }
        let end = section.len() - 4;
        let program_info_len = (usize::from(section[10] & 0x0f) << 8) | usize::from(section[11]);
        let program_info = section.get(12..12 + program_info_len)?.to_vec();
        let mut streams = Vec::new();
        let mut i = 12 + program_info_len;
        while i + 5 <= end {
            let es_info_len = (usize::from(section[i + 3] & 0x0f) << 8) | usize::from(section[i + 4]);
            streams.push(ElementaryStream {
                stream_type: section[i],
                pid: (u16::from(section[i + 1] & 0x1f) << 8) | u16::from(section[i + 2]),
                descriptors: section.get(i + 5..i + 5 + es_info_len)?.to_vec(),
            });
            i += 5 + es_info_len;
        }
        Some(Self {
            program_number: u16::from_be_bytes([section[3], section[4]]),
            version: (section[5] >> 1) & 0x1f,
            pcr_pid: (u16::from(section[8] & 0x1f) << 8) | u16::from(section[9]),
            program_info,
            streams,
        })
    }

    pub fn to_section(&self) -> Vec<u8> {
        let mut s = vec![TABLE_ID_PMT, 0, 0];
        s.extend_from_slice(&self.program_number.to_be_bytes());
        s.push(0xc1 | (self.version << 1));
        s.extend_from_slice(&[0, 0]);
        s.extend_from_slice(&(0xe000 | self.pcr_pid).to_be_bytes());
        s.extend_from_slice(&(0xf000 | length_u16(self.program_info.len())).to_be_bytes());
        s.extend_from_slice(&self.program_info);
        for es in &self.streams {
            s.push(es.stream_type);
            s.extend_from_slice(&(0xe000 | es.pid).to_be_bytes());
            s.extend_from_slice(&(0xf000 | length_u16(es.descriptors.len())).to_be_bytes());
            s.extend_from_slice(&es.descriptors);
        }
        finish_section(&mut s);
        s
    }
}

/// 元の PMT が収まっていた以上、書き換えた PMT の長さも 12 ビットの長さフィールドに収まる。
fn length_u16(len: usize) -> u16 {
    u16::try_from(len).expect("PSI lengths fit in 12 bits")
}

/// `section_length` を埋めて CRC を付ける。
fn finish_section(section: &mut Vec<u8>) {
    let [high, low] = length_u16(section.len() - 3 + 4).to_be_bytes();
    section[1] = 0xb0 | high;
    section[2] = low;
    let crc = crc32(section);
    section.extend_from_slice(&crc.to_be_bytes());
}

/// セクションをパケットに分けて書き出す。`counter` はこの PID の連続性カウンタで、書き出した分だけ進む。
pub fn write_section(pid: u16, section: &[u8], counter: &mut u8, out: &mut Vec<u8>) {
    let mut data = Vec::with_capacity(section.len() + 1);
    data.push(0);
    data.extend_from_slice(section);
    for (i, chunk) in data.chunks(PACKET_SIZE - 4).enumerate() {
        let unit_start = if i == 0 { 0x40 } else { 0 };
        let [high, low] = pid.to_be_bytes();
        out.extend_from_slice(&[SYNC_BYTE, unit_start | (high & 0x1f), low, 0x10 | *counter]);
        out.extend_from_slice(chunk);
        out.resize(out.len() + PACKET_SIZE - 4 - chunk.len(), 0xff);
        *counter = (*counter + 1) & 0x0f;
    }
}

/// PTS は 33 ビットで一周する。
pub const PTS_MASK: u64 = (1 << 33) - 1;

/// PES ヘッダーの PTS を読む。PES の先頭を含むバイト列を渡す。
pub fn pes_pts(pes: &[u8]) -> Option<u64> {
    let [0, 0, 1, _, _, _, _, flags, _, p0, p1, p2, p3, p4, ..] = *pes else {
        return None;
    };
    if flags & 0x80 == 0 {
        return None;
    }
    Some(
        (u64::from(p0 >> 1) & 0x07) << 30
            | u64::from(p1) << 22
            | u64::from(p2 >> 1) << 15
            | u64::from(p3) << 7
            | u64::from(p4 >> 1),
    )
}

/// PES ヘッダーより後ろのデータ。
pub fn pes_data(pes: &[u8]) -> Option<&[u8]> {
    let header_len = usize::from(*pes.get(8)?);
    pes.get(9 + header_len..)
}

/// PTS だけを持つ PES を作る。
pub fn build_pes(stream_id: u8, pts: u64, data: &[u8]) -> Vec<u8> {
    let pts = pts & PTS_MASK;
    // 33 ビットの PTS を、マーカービットを挟んで 5 バイトに分ける。各バイトには下位 8 ビットだけを使う。
    let low = |v: u64| v.to_le_bytes()[0];
    let pts_bytes = [
        0x21 | (low(pts >> 29) & 0x0e),
        low(pts >> 22),
        0x01 | (low(pts >> 14) & 0xfe),
        low(pts >> 7),
        0x01 | (low(pts << 1) & 0xfe),
    ];
    let len = u16::try_from(3 + pts_bytes.len() + data.len()).expect("PES payloads we build fit in 64 KiB");
    let mut pes = vec![0, 0, 1, stream_id];
    pes.extend_from_slice(&len.to_be_bytes());
    pes.extend_from_slice(&[0x84, 0x80, 5]);
    pes.extend_from_slice(&pts_bytes);
    pes.extend_from_slice(data);
    pes
}

/// 複数パケットにまたがる PES を組み立てる。`PES_packet_length` が 0 の PES は次の PES の先頭で区切る。
pub struct PesAssembler {
    buf: Vec<u8>,
    started: bool,
}

impl PesAssembler {
    pub const fn new() -> Self {
        Self {
            buf: Vec::new(),
            started: false,
        }
    }

    /// パケットを1つ受け取り、組み立て終わった PES を返す。
    pub fn push(&mut self, packet: &[u8]) -> Vec<Vec<u8>> {
        let mut done = Vec::new();
        let Some(payload) = payload(packet) else {
            return done;
        };
        if is_unit_start(packet) {
            if self.started && !self.buf.is_empty() {
                done.push(std::mem::take(&mut self.buf));
            }
            self.buf.clear();
            self.started = true;
        } else if !self.started {
            return done;
        }
        self.buf.extend_from_slice(payload);
        if self.buf.len() >= 6 {
            let declared = usize::from(u16::from_be_bytes([self.buf[4], self.buf[5]]));
            if declared != 0 && self.buf.len() >= 6 + declared {
                self.buf.truncate(6 + declared);
                self.started = false;
                done.push(std::mem::take(&mut self.buf));
            }
        }
        done
    }
}

/// PES をパケットに分けて書き出す。最後のパケットはアダプテーションフィールドで詰める。
pub fn write_pes(pid: u16, pes: &[u8], counter: &mut u8, out: &mut Vec<u8>) {
    let [high, low] = pid.to_be_bytes();
    let mut rest = pes;
    let mut first = true;
    while !rest.is_empty() {
        let take = rest.len().min(PACKET_SIZE - 4);
        let (chunk, tail) = rest.split_at(take);
        let unit_start = if first { 0x40 } else { 0 };
        let stuffing = PACKET_SIZE - 4 - chunk.len();
        if stuffing == 0 {
            out.extend_from_slice(&[SYNC_BYTE, unit_start | (high & 0x1f), low, 0x10 | *counter]);
        } else {
            out.extend_from_slice(&[SYNC_BYTE, unit_start | (high & 0x1f), low, 0x30 | *counter]);
            // adaptation_field_length の 1 バイトを含めて stuffing バイトを使う。
            let field_len = u8::try_from(stuffing - 1).expect("stuffing fits in a packet");
            out.push(field_len);
            if field_len > 0 {
                out.push(0);
                out.resize(out.len() + usize::from(field_len) - 1, 0xff);
            }
        }
        out.extend_from_slice(chunk);
        *counter = (*counter + 1) & 0x0f;
        rest = tail;
        first = false;
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub fn packet(pid: u16, unit_start: bool, counter: u8, payload: &[u8]) -> Vec<u8> {
        assert!(payload.len() <= PACKET_SIZE - 4);
        let [high, low] = pid.to_be_bytes();
        let mut p = vec![
            SYNC_BYTE,
            (if unit_start { 0x40 } else { 0 }) | high,
            low,
            0x10 | counter,
        ];
        p.extend_from_slice(payload);
        p.resize(PACKET_SIZE, 0xff);
        p
    }

    pub fn pat_section(pmt_pid: u16) -> Vec<u8> {
        let mut s = vec![TABLE_ID_PAT, 0xb0, 0, 0x7f, 0xe1, 0xc1, 0, 0];
        s.extend_from_slice(&[0, 0, 0xe0, 0x10]);
        s.extend_from_slice(&[0x04, 0x00]);
        s.extend_from_slice(&(0xe000 | pmt_pid).to_be_bytes());
        finish_section(&mut s);
        s
    }

    pub fn audio(pid: u16, tag: u8) -> ElementaryStream {
        ElementaryStream {
            stream_type: 0x0f,
            pid,
            descriptors: vec![DESCRIPTOR_STREAM_IDENTIFIER, 1, tag],
        }
    }

    pub fn sample_pmt() -> Pmt {
        Pmt {
            program_number: 1024,
            version: 3,
            pcr_pid: 0x01ff,
            program_info: vec![0x09, 0x04, 0x00, 0x05, 0xe0, 0x31],
            streams: vec![
                ElementaryStream {
                    stream_type: 0x02,
                    pid: 0x0100,
                    descriptors: vec![DESCRIPTOR_STREAM_IDENTIFIER, 1, 0x00],
                },
                audio(0x0110, 0x10),
                audio(0x0111, 0x11),
            ],
        }
    }

    #[test]
    fn pes_round_trips_through_packets() {
        let pes = build_pes(0xbd, 0x1_2345_6789, &[7; 300]);
        assert_eq!(pes_pts(&pes), Some(0x1_2345_6789));
        assert_eq!(pes_data(&pes), Some(&[7; 300][..]));

        let mut counter = 0;
        let mut out = Vec::new();
        write_pes(0x0ff2, &pes, &mut counter, &mut out);
        assert_eq!(out.len(), PACKET_SIZE * 2);

        let mut pes_assembler = PesAssembler::new();
        let assembled: Vec<_> = out.chunks(PACKET_SIZE).flat_map(|p| pes_assembler.push(p)).collect();
        assert_eq!(assembled, vec![pes]);
    }

    #[test]
    fn writes_a_pes_one_byte_short_of_a_full_packet() {
        let pes = build_pes(0xbd, 0, &[1; PACKET_SIZE - 4 - 14 - 1]);
        let mut counter = 0;
        let mut out = Vec::new();
        write_pes(0x0ff2, &pes, &mut counter, &mut out);
        assert_eq!(out.len(), PACKET_SIZE);
        assert_eq!(payload(&out), Some(&pes[..]));
    }

    #[test]
    fn splits_pes_without_a_length_at_the_next_unit_start() {
        let mut first = build_pes(0xbd, 1, &[1, 2, 3]);
        first[4..6].copy_from_slice(&[0, 0]);
        let second = build_pes(0xbd, 2, &[4]);
        let mut assembler = PesAssembler::new();
        assert_eq!(assembler.push(&packet(0x0130, true, 0, &first)), Vec::<Vec<u8>>::new());
        let done = assembler.push(&packet(0x0130, true, 1, &second));
        assert_eq!(done.len(), 2);
        // 長さのない PES は次の PES まで区切れないので、詰め物まで含まれる。
        assert!(done[0].starts_with(&first));
        assert_eq!(done[1], second);
    }

    #[test]
    fn pmt_round_trips_through_a_section() {
        let pmt = sample_pmt();
        assert_eq!(Pmt::parse(&pmt.to_section()), Some(pmt));
    }

    #[test]
    fn rejects_a_section_with_a_broken_crc() {
        let mut section = sample_pmt().to_section();
        let last = section.len() - 1;
        section[last] ^= 1;
        assert_eq!(Pmt::parse(&section), None);
    }

    #[test]
    fn reads_the_pmt_pid_from_the_pat() {
        assert_eq!(parse_pat(&pat_section(0x01f0)), Some(0x01f0));
    }

    #[test]
    fn reads_the_component_tag_after_other_descriptors() {
        let es = ElementaryStream {
            stream_type: 0x0f,
            pid: 0x0110,
            descriptors: vec![0xfd, 2, 0x00, 0x08, DESCRIPTOR_STREAM_IDENTIFIER, 1, 0x11],
        };
        assert_eq!(es.component_tag(), Some(0x11));
    }

    #[test]
    fn assembles_a_section_spanning_packets() {
        let mut pmt = sample_pmt();
        pmt.program_info = vec![0xc1; 250];
        let section = pmt.to_section();
        let mut counter = 0;
        let mut out = Vec::new();
        write_section(0x01f0, &section, &mut counter, &mut out);
        assert_eq!(counter, 2);

        let mut assembler = SectionAssembler::new();
        let sections: Vec<_> = out.chunks(PACKET_SIZE).flat_map(|p| assembler.push(p)).collect();
        assert_eq!(sections, vec![section]);
    }

    #[test]
    fn completes_a_section_that_ends_after_the_pointer_field() {
        let mut pmt = sample_pmt();
        pmt.program_info = vec![0xc1; 200];
        let section = pmt.to_section();
        // 続きのあるパケットは詰め物を入れずに満杯にする。
        let (head, tail) = section.split_at(PACKET_SIZE - 5);
        let mut first = vec![0];
        first.extend_from_slice(head);
        let mut second = vec![u8::try_from(tail.len()).unwrap()];
        second.extend_from_slice(tail);
        second.extend_from_slice(&section[..10]);

        let mut assembler = SectionAssembler::new();
        assert_eq!(assembler.push(&packet(0x01f0, true, 0, &first)), Vec::<Vec<u8>>::new());
        assert_eq!(assembler.push(&packet(0x01f0, true, 1, &second)), vec![section]);
    }
}
