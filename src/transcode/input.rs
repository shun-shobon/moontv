use super::captions::Captions;
use super::profile::AudioTrack;
use crate::ts::{self, PACKET_SIZE, Pmt, SYNC_BYTE, SectionAssembler};

/// ARIB の地デジ・BS が ES に使う範囲と重ならない。
/// ffmpeg は起動時の PMT にあった PID しか読まないので、番組が変わって元の PID が変わっても同じ PID で出し続ける。
const AUDIO_PID: u16 = 0x0ff1;

/// ADTS の AAC。ARIB の音声はこれだけを使う。
const STREAM_TYPE_AAC: u8 = 0x0f;

pub struct InputRewriter {
    audio: AudioTrack,
    pending: Vec<u8>,
    pat: SectionAssembler,
    pmt: SectionAssembler,
    pmt_pid: Option<u16>,
    pmt_counter: u8,
    pcr_pid: Option<u16>,
    audio_pids: Vec<u16>,
    selected: Option<u16>,
    /// 切り替え直後は元の PES の途中から流さないよう、次の PES の先頭まで待つ。
    forwarding: Option<u16>,
    audio_counter: u8,
    captions: Captions,
}

impl InputRewriter {
    pub fn new(audio: AudioTrack) -> Self {
        Self {
            audio,
            pending: Vec::new(),
            pat: SectionAssembler::new(),
            pmt: SectionAssembler::new(),
            pmt_pid: None,
            pmt_counter: 0,
            pcr_pid: None,
            audio_pids: Vec::new(),
            selected: None,
            forwarding: None,
            audio_counter: 0,
            captions: Captions::new(),
        }
    }

    pub fn push(&mut self, chunk: &[u8], out: &mut Vec<u8>) {
        self.pending.extend_from_slice(chunk);
        let mut start = 0;
        while self.pending.len() - start >= PACKET_SIZE {
            if self.pending[start] != SYNC_BYTE {
                start += 1;
                continue;
            }
            let mut packet = [0; PACKET_SIZE];
            packet.copy_from_slice(&self.pending[start..start + PACKET_SIZE]);
            self.rewrite(&mut packet, out);
            start += PACKET_SIZE;
        }
        self.pending.drain(..start);
    }

    fn rewrite(&mut self, packet: &mut [u8; PACKET_SIZE], out: &mut Vec<u8>) {
        let pid = ts::pid(packet);
        if pid == ts::PAT_PID {
            for section in self.pat.push(packet) {
                if let Some(pmt_pid) = ts::parse_pat(&section) {
                    self.pmt_pid = Some(pmt_pid);
                }
            }
            out.extend_from_slice(packet);
        } else if Some(pid) == self.pmt_pid {
            for section in self.pmt.push(packet) {
                if let Some(pmt) = Pmt::parse(&section) {
                    let mut rewritten = self.select_audio(pmt);
                    self.captions.rewrite_pmt(&mut rewritten);
                    ts::write_section(pid, &rewritten.to_section(), &mut self.pmt_counter, out);
                }
            }
        } else if self.audio_pids.contains(&pid) {
            self.rewrite_audio(pid, packet, out);
        } else {
            self.captions.inspect(packet, out);
            out.extend_from_slice(packet);
        }
    }

    fn select_audio(&mut self, mut pmt: Pmt) -> Pmt {
        let mut audios: Vec<_> = pmt
            .streams
            .iter()
            .filter(|es| es.stream_type == STREAM_TYPE_AAC)
            .cloned()
            .collect();
        // ARIB は主音声を component_tag 0x10、2本目を 0x11 とする。
        audios.sort_by_key(|es| es.component_tag().unwrap_or(u8::MAX));
        let chosen = match self.audio {
            AudioTrack::Main => audios.first(),
            AudioTrack::Sub => audios.get(1).or_else(|| audios.first()),
        };
        self.pcr_pid = Some(pmt.pcr_pid);
        self.audio_pids = audios.iter().map(|es| es.pid).collect();
        self.selected = chosen.map(|es| es.pid);
        if let Some(chosen) = chosen {
            let mut es = chosen.clone();
            es.pid = AUDIO_PID;
            pmt.streams.retain(|s| s.stream_type != STREAM_TYPE_AAC);
            pmt.streams.push(es);
        }
        pmt
    }

    fn rewrite_audio(&mut self, pid: u16, packet: &mut [u8; PACKET_SIZE], out: &mut Vec<u8>) {
        if Some(pid) != self.selected {
            // 落とした音声に PCR が載っていると ffmpeg が時刻を見失う。ARIB では起きないが念のため残す。
            if Some(pid) == self.pcr_pid {
                out.extend_from_slice(packet);
            }
            return;
        }
        if self.forwarding != Some(pid) {
            if !ts::is_unit_start(packet) {
                return;
            }
            self.forwarding = Some(pid);
        }
        ts::set_pid(packet, AUDIO_PID);
        if ts::has_payload(packet) {
            ts::set_continuity_counter(packet, self.audio_counter);
            self.audio_counter = (self.audio_counter + 1) & 0x0f;
        }
        out.extend_from_slice(packet);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ts::tests::{audio, packet, pat_section, sample_pmt};

    const PMT_PID: u16 = 0x01f0;

    fn stream(pmt: &Pmt, audio_packets: &[(u16, bool)]) -> Vec<u8> {
        let mut input = Vec::new();
        let mut counter = 0;
        ts::write_section(ts::PAT_PID, &pat_section(PMT_PID), &mut counter, &mut input);
        let mut counter = 0;
        ts::write_section(PMT_PID, &pmt.to_section(), &mut counter, &mut input);
        for (i, &(pid, unit_start)) in audio_packets.iter().enumerate() {
            input.extend(packet(
                pid,
                unit_start,
                u8::try_from(i % 16).unwrap(),
                &[pid.to_be_bytes()[1]],
            ));
        }
        input
    }

    fn run(track: AudioTrack, input: &[u8]) -> Vec<Vec<u8>> {
        let mut rewriter = InputRewriter::new(track);
        let mut out = Vec::new();
        // 区切りがパケット境界と揃わなくても読めることを確かめる。
        for chunk in input.chunks(100) {
            rewriter.push(chunk, &mut out);
        }
        out.chunks(PACKET_SIZE).map(<[u8]>::to_vec).collect()
    }

    fn output_pmt(packets: &[Vec<u8>]) -> Pmt {
        let mut assembler = SectionAssembler::new();
        let section = packets
            .iter()
            .filter(|p| ts::pid(p) == PMT_PID)
            .flat_map(|p| assembler.push(p))
            .next()
            .unwrap();
        Pmt::parse(&section).unwrap()
    }

    fn audio_payloads(packets: &[Vec<u8>]) -> Vec<u8> {
        packets
            .iter()
            .filter(|p| ts::pid(p) == AUDIO_PID)
            .map(|p| ts::payload(p).unwrap()[0])
            .collect()
    }

    #[test]
    fn keeps_only_the_main_audio() {
        let input = stream(&sample_pmt(), &[(0x0110, true), (0x0111, true), (0x0110, false)]);
        let out = run(AudioTrack::Main, &input);

        let pmt = output_pmt(&out);
        let audios: Vec<_> = pmt
            .streams
            .iter()
            .filter(|s| s.stream_type == STREAM_TYPE_AAC)
            .collect();
        assert_eq!(audios.len(), 1);
        assert_eq!(audios[0].pid, AUDIO_PID);
        assert_eq!(audios[0].component_tag(), Some(0x10));
        assert_eq!(audio_payloads(&out), vec![0x10, 0x10]);
    }

    #[test]
    fn keeps_only_the_sub_audio() {
        let input = stream(&sample_pmt(), &[(0x0110, true), (0x0111, true), (0x0111, false)]);
        let out = run(AudioTrack::Sub, &input);

        let pmt = output_pmt(&out);
        let audio = pmt.streams.iter().find(|s| s.stream_type == STREAM_TYPE_AAC).unwrap();
        assert_eq!(audio.component_tag(), Some(0x11));
        assert_eq!(audio_payloads(&out), vec![0x11, 0x11]);
    }

    #[test]
    fn picks_the_main_audio_by_component_tag_rather_than_order() {
        let mut pmt = sample_pmt();
        pmt.streams.swap(1, 2);
        let input = stream(&pmt, &[(0x0110, true), (0x0111, true)]);
        assert_eq!(audio_payloads(&run(AudioTrack::Main, &input)), vec![0x10]);
    }

    #[test]
    fn falls_back_to_the_main_audio_without_a_second_one() {
        let mut pmt = sample_pmt();
        pmt.streams.truncate(2);
        let input = stream(&pmt, &[(0x0110, true)]);
        assert_eq!(audio_payloads(&run(AudioTrack::Sub, &input)), vec![0x10]);
    }

    #[test]
    fn waits_for_the_start_of_a_pes_before_forwarding() {
        let input = stream(&sample_pmt(), &[(0x0110, false), (0x0110, true), (0x0110, false)]);
        assert_eq!(audio_payloads(&run(AudioTrack::Main, &input)).len(), 2);
    }

    #[test]
    fn keeps_the_same_pid_and_counter_sequence_across_a_pmt_change() {
        let mut input = stream(&sample_pmt(), &[(0x0110, true), (0x0110, false)]);
        let mut next = sample_pmt();
        next.version = 4;
        next.streams = vec![next.streams[0].clone(), audio(0x0112, 0x10)];
        let mut counter = 1;
        ts::write_section(PMT_PID, &next.to_section(), &mut counter, &mut input);
        input.extend(packet(0x0112, true, 0, &[0x12]));

        let out = run(AudioTrack::Main, &input);
        let counters: Vec<_> = out
            .iter()
            .filter(|p| ts::pid(p) == AUDIO_PID)
            .map(|p| p[3] & 0x0f)
            .collect();
        assert_eq!(counters, vec![0, 1, 2]);
        assert_eq!(audio_payloads(&out), vec![0x10, 0x10, 0x12]);
    }

    #[test]
    fn passes_other_packets_through() {
        let mut input = stream(&sample_pmt(), &[]);
        let video = packet(0x0100, true, 0, &[1, 2, 3]);
        input.extend_from_slice(&video);
        let out = run(AudioTrack::Main, &input);
        assert_eq!(out.last().unwrap(), &video);
    }

    #[test]
    fn skips_bytes_until_the_next_sync_byte() {
        let mut input = vec![0x00, 0x12];
        input.extend(stream(&sample_pmt(), &[(0x0110, true)]));
        assert_eq!(audio_payloads(&run(AudioTrack::Main, &input)), vec![0x10]);
    }
}
