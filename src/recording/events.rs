use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result, bail};
use futures_util::StreamExt;

use super::library::Library;
use crate::mirakc::{MirakcClient, RecordingEvent};

const RECONNECT_INTERVAL: Duration = Duration::from_secs(5);

/// mirakc の録画の開始・終了を録画一覧に取り込み続ける。mirakc の再起動で切れたらつなぎ直す。
pub async fn follow(mirakc: MirakcClient, library: Arc<Library>) {
    loop {
        if let Err(e) = follow_once(&mirakc, &library).await {
            tracing::warn!("lost mirakc events: {e:#}");
        }
        tokio::time::sleep(RECONNECT_INTERVAL).await;
    }
}

async fn follow_once(mirakc: &MirakcClient, library: &Library) -> Result<()> {
    let res = mirakc.events().await?;
    // 購読を始めてから突き合わせれば、その間に起きた開始・終了も通知で拾える。
    if let Some(schedules) = mirakc.recording_schedules().await? {
        library.reconcile(schedules).await;
    }
    let mut body = res.bytes_stream();
    let mut parser = EventParser::default();
    while let Some(chunk) = body.next().await {
        let chunk = chunk.context("failed to read mirakc events")?;
        for event in parser.push(&chunk) {
            handle(mirakc, library, &event).await;
        }
    }
    bail!("mirakc closed the event stream")
}

async fn handle(mirakc: &MirakcClient, library: &Library, event: &Event) {
    let (started, stopped) = (event.name == "recording.started", event.name == "recording.stopped");
    if !started && !stopped {
        return;
    }
    let id = match serde_json::from_str::<RecordingEvent>(&event.data) {
        Ok(e) => e.program_id,
        Err(e) => {
            tracing::warn!(event = event.name, "failed to decode mirakc event: {e}");
            return;
        }
    };
    let schedule = match mirakc.recording_schedule(id).await {
        Ok(schedule) => schedule,
        Err(e) => {
            tracing::warn!(program_id = id, "failed to fetch recording schedule: {e:#}");
            None
        }
    };
    if started {
        if let Some(schedule) = schedule {
            library.record_started(schedule).await;
        }
    } else {
        library.record_stopped(id, schedule).await;
    }
}

#[derive(Debug, PartialEq, Eq)]
struct Event {
    name: String,
    data: String,
}

/// Server-Sent Events の本文を受け取った順に区切り、出来上がったイベントを返す。
#[derive(Default)]
struct EventParser {
    buffer: String,
    name: String,
    data: Vec<String>,
}

impl EventParser {
    fn push(&mut self, chunk: &[u8]) -> Vec<Event> {
        self.buffer.push_str(&String::from_utf8_lossy(chunk));
        let mut events = Vec::new();
        while let Some(end) = self.buffer.find('\n') {
            let line: String = self.buffer.drain(..=end).collect();
            let line = line.trim_end_matches(['\n', '\r']);
            if line.is_empty() {
                if !self.data.is_empty() {
                    events.push(Event {
                        name: std::mem::take(&mut self.name),
                        data: std::mem::take(&mut self.data).join("\n"),
                    });
                }
                self.name.clear();
                continue;
            }
            let (field, value) = line.split_once(':').unwrap_or((line, ""));
            let value = value.strip_prefix(' ').unwrap_or(value);
            match field {
                "event" => value.clone_into(&mut self.name),
                "data" => self.data.push(value.to_owned()),
                _ => {}
            }
        }
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_events_across_chunks() {
        let mut parser = EventParser::default();
        assert_eq!(parser.push(b"event: recording.started\r\ndata: {\"progr"), Vec::new());
        let events = parser.push(b"amId\":1}\r\n\r\n:keep-alive\n\nevent: recording.stopped\ndata: {}\n\n");
        assert_eq!(
            events,
            vec![
                Event {
                    name: "recording.started".into(),
                    data: "{\"programId\":1}".into()
                },
                Event {
                    name: "recording.stopped".into(),
                    data: "{}".into()
                },
            ]
        );
    }

    #[test]
    fn joins_multiple_data_lines() {
        let mut parser = EventParser::default();
        let events = parser.push(b"event: x\ndata: a\ndata: b\n\n");
        assert_eq!(events[0].data, "a\nb");
    }
}
