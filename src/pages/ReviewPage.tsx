import { useEffect, useRef, useState } from 'react';
import { VideoPlayer, VideoPlayerHandle } from '../components/VideoPlayer';
import { usePersistentState } from '../hooks/usePersistentState';

type Props = { onBack: () => void };

export function ReviewPage({ onBack }: Props) {
  const teacherRef = useRef<VideoPlayerHandle>(null);
  const studentRef = useRef<VideoPlayerHandle>(null);
  const [offsetSec, setOffsetSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(0.75);
  const [running, setRunning] = useState(false);
  const [differenceNote, setDifferenceNote] = usePersistentState('dbt:review-difference', '');

  function syncNow() {
    const teacher = teacherRef.current;
    const student = studentRef.current;
    if (!teacher || !student) return;
    student.seek(Math.max(0, teacher.getCurrentTime() + offsetSec));
    teacher.setRate(playbackRate);
    student.setRate(playbackRate);
  }

  async function playBoth() {
    syncNow();
    try {
      await Promise.all([teacherRef.current?.play(), studentRef.current?.play()]);
      setRunning(true);
    } catch {
      setRunning(false);
    }
  }

  function pauseBoth() {
    teacherRef.current?.pause();
    studentRef.current?.pause();
    setRunning(false);
  }

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const teacher = teacherRef.current;
      const student = studentRef.current;
      if (!teacher || !student) return;
      const target = teacher.getCurrentTime() + offsetSec;
      const drift = student.getCurrentTime() - target;
      if (Math.abs(drift) > 0.09) student.seek(Math.max(0, target));
    }, 300);
    return () => window.clearInterval(timer);
  }, [offsetSec, running]);

  return (
    <main className="page page--review" data-testid="review-page">
      <header className="page-header">
        <button onClick={onBack}>返回</button>
        <div>
          <p className="eyebrow">Review · 双屏复盘</p>
          <h1>老师与我的录像</h1>
        </div>
        <span className="mode-lock">双播放器锁定</span>
      </header>

      <section className="review-grid">
        <VideoPlayer ref={teacherRef} testId="teacher-review-player" label="老师视频" compact showTransport={false} />
        <VideoPlayer ref={studentRef} testId="student-player" label="我的录像" compact showTransport={false} />
      </section>

      <section className="review-controller workspace-card">
        <div className="section-heading section-heading--inline">
          <div>
            <p className="eyebrow">Sync Controller</p>
            <h2>统一播放与时间偏移</h2>
          </div>
          <span className="status-pill">老师视频为主时钟</span>
        </div>

        <div className="review-actions">
          <button className="primary" onClick={() => void playBoth()}>同步播放</button>
          <button onClick={pauseBoth}>全部暂停</button>
          <button onClick={syncNow}>立即对齐</button>
          <label className="speed-control speed-control--wide">
            <span>速度</span>
            <select value={playbackRate} onChange={event => {
              const rate = Number(event.target.value);
              setPlaybackRate(rate);
              teacherRef.current?.setRate(rate);
              studentRef.current?.setRate(rate);
            }}>
              {[0.25, 0.5, 0.75, 1].map(rate => <option key={rate} value={rate}>{rate.toFixed(2)}×</option>)}
            </select>
          </label>
        </div>

        <label className="offset-control">
          <span>我的录像偏移：{offsetSec >= 0 ? '+' : ''}{offsetSec.toFixed(2)} 秒</span>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.05"
            value={offsetSec}
            onChange={event => setOffsetSec(Number(event.target.value))}
          />
        </label>
        <div className="inline-actions">
          <button onClick={() => setOffsetSec(value => Number((value - 0.05).toFixed(2)))}>我的录像提前 0.05s</button>
          <button onClick={() => setOffsetSec(value => Number((value + 0.05).toFixed(2)))}>我的录像延后 0.05s</button>
          <button onClick={() => setOffsetSec(0)}>归零</button>
        </div>
      </section>

      <section className="workspace-card">
        <p className="eyebrow">Difference Notes</p>
        <h2>差异与修正</h2>
        <textarea
          value={differenceNote}
          onChange={event => setDifferenceNote(event.target.value)}
          placeholder="节奏、方向、幅度、重心、质感，以及下一次怎么修正……"
        />
      </section>
    </main>
  );
}
