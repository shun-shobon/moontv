use anyhow::Result;
use serde::Serialize;

use crate::catalog::{self, ProgramDto};
use crate::mirakc::{MirakcClient, ScheduleState};

/// moontv のライブ視聴は優先度 0 で受信するので、それより高くして録画がチューナーを奪えるようにする。
const RECORDING_PRIORITY: i32 = 1;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleDto {
    pub state: ScheduleStateDto,
    pub program: ProgramDto,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ScheduleStateDto {
    Scheduled,
    Recording,
    Finished,
    Failed,
}

impl From<ScheduleState> for ScheduleStateDto {
    fn from(state: ScheduleState) -> Self {
        match state {
            // 番組の開始を待つ状態と、放送時間の変更を待って付け直す状態は、利用者にとっては予約中と変わらない。
            ScheduleState::Scheduled | ScheduleState::Tracking | ScheduleState::Rescheduling => Self::Scheduled,
            ScheduleState::Recording => Self::Recording,
            ScheduleState::Finished => Self::Finished,
            ScheduleState::Failed => Self::Failed,
        }
    }
}

/// 録画を mirakc に任せ、予約の受け付けと一覧の整形だけを行う。
pub struct Recorder {
    mirakc: MirakcClient,
}

impl Recorder {
    pub const fn new(mirakc: MirakcClient) -> Self {
        Self { mirakc }
    }

    pub async fn is_enabled(&self) -> Result<bool> {
        Ok(self.mirakc.recording_schedules().await?.is_some())
    }

    /// 録画が無効なら None を返す。
    pub async fn schedules(&self) -> Result<Option<Vec<ScheduleDto>>> {
        let Some(schedules) = self.mirakc.recording_schedules().await? else {
            return Ok(None);
        };
        let mut schedules: Vec<_> = schedules
            .into_iter()
            .map(|s| ScheduleDto {
                state: s.state.into(),
                program: catalog::to_dto(&s.program),
            })
            .collect();
        schedules.sort_by_key(|s| s.program.start_at);
        Ok(Some(schedules))
    }

    pub async fn add(&self, program_id: u64) -> Result<()> {
        self.mirakc
            .add_recording_schedule(program_id, &format!("{program_id}.m2ts"), RECORDING_PRIORITY)
            .await
    }

    pub async fn remove(&self, program_id: u64) -> Result<()> {
        self.mirakc.remove_recording_schedule(program_id).await
    }
}
