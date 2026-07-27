import { useEffect, useMemo, useRef, useState } from 'react';
import { BeatRail } from '../components/BeatRail';
import { CountRecorder } from '../components/CountRecorder';
import { VideoPlayer, VideoPlayerHandle } from '../components/VideoPlayer';
import { usePersistentState } from '../hooks/usePersistentState';
import {
  LoopMode,
  anchorForCurrentCount,
  beatIntervalSec,
  countForBeat,
  formatTime,
  getLoopWindow,
  phraseForBeat,
  beatIndexAt,
} from '../lib/beatMath';

type Props = { onBack: () => void };

type PracticeNotes = Record<string, {
  motion: string;
  knowledge: string;
  stage: string;
}>;

const learningStages = [
  ['not-understood', '未看懂'],
  ['understood', '已看懂'],
  ['follow-teacher', '能跟老师做'],
  ['independent-slow', '慢速可独立'],
  ['independent-full-speed', '原速可独立'],
  ['music-only', '只听音乐也能做'],
  ['delayed-stable', '延迟后仍稳定'],
] as const;

export function PracticePage({ onBack }: Props) {
  const playerRef = useRef<VideoPlayerHandle>(null);
  const countInTimerRef = useRef<number | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = usePersistentState('dbt:practice-rate', 0.75);
  const [bpm, setBpm] = usePersistentState('dbt:bpm', 100);
  const [anchorSec, setAnchorSec] = usePersistentState('dbt:anchor', 0);
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [connectEdges, setConnectEdges] = useState(true);
  const [countInBeats, setCountInBeats] = useState(4);
  const [countInDisplay, setCountInDisplay] = useState<number | null>(null);
  const [notes, setNotes] = usePersistentState<PracticeNotes>('dbt:practice-notes', {});

  const beatIndex = Math.max(0, beatIndexAt(currentTime, anchorSec, bpm));
  const currentCount = countForBeat(beatIndex);
  const phraseIndex = phraseForBeat(beatIndex);
  const phraseKey = String(phraseIndex);
  const phraseNote = notes[phraseKey] ?? {
    motion: '',
    knowledge: '',
    stage: 'not-understood',
  };

  const loopWindow = useMemo(
    () => getLoopWindow(loopMode, currentTime, anchorSec, bpm, connectEdges, duration),
    [anchorSec, bpm, connectEdges, currentTime, duration, loopMode],
  );

  useEffect(() => {
    if (!loopWindow || !playing) return;
    if (currentTime >= loopWindow.endSec - 0.035) {
      playerRef.current?.seek(loopWindow.startSec);
      void playerRef.current?.play();
    }
  }, [currentTime, loopWindow, playing]);

  useEffect(() => () => {
    if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
  }, []);

  function updatePhraseNote(patch: Partial<PracticeNotes[string]>) {
    setNotes(current => ({
      ...current,
      [phraseKey]: { ...phraseNote, ...patch },
    }));
  }

  function setCurrentAsCount(count: number) {
    setAnchorSec(Number(anchorForCurrentCount(currentTime, count, bpm).toFixed(4)));
  }

  function tapTempo() {
    const now = performance.now();
    const previous = tapTimesRef.current.at(-1);
    if (previous && now - previous > 2200) tapTimesRef.current = [];
    tapTimesRef.current.push(now);
    tapTimesRef.current = tapTimesRef.current.slice(-8);
    if (tapTimesRef.current.length < 2) return;

    const intervals = tapTimesRef.current.slice(1).map((time, index) => time - tapTimesRef.current[index]);
    const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    setBpm(Math.round(Math.min(240, Math.max(40, 60000 / average))));
  }

  function seekBeat(delta: number) {
    const interval = beatIntervalSec(bpm);
    playerRef.current?.seek(Math.max(0, currentTime + delta * interval));
  }

  function cancelCountIn() {
    if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
    countInTimerRef.current = null;
    setCountInDisplay(null);
  }

  function startPractice() {
    cancelCountIn();
    const target = loopWindow?.startSec ?? currentTime;
    playerRef.current?.pause();
    playerRef.current?.seek(target);

    if (countInBeats === 0) {
      void playerRef.current?.play();
      return;
    }

    let remaining = countInBeats;
    setCountInDisplay(remaining);
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        setCountInDisplay(null);
        countInTimerRef.current = null;
        void playerRef.current?.play();
        return;
      }
      setCountInDisplay(remaining);
      countInTimerRef.current = window.setTimeout(tick, beatIntervalSec(bpm) * 1000);
    };
    countInTimerRef.current = window.setTimeout(tick, beatIntervalSec(bpm) * 1000);
  }

  const nextAction = `从第 ${phraseIndex + 1} 个八拍的 ${loopMode === 'off' ? '1–8' : loopMode} 开始，${playbackRate.toFixed(2)}×，${countInBeats || 0} 拍预备。`;

  return (
    <main className="page page--practice" data-testid="practice-page">
      <header className="page-header">
        <button onClick={onBack}>返回</button>
        <div>
          <p className="eyebrow">Practice · 单屏扒舞</p>
          <h1>老师视频</h1>
        </div>
        <span className="mode-lock">单播放器锁定</span>
      </header>

      <VideoPlayer
        ref={playerRef}
        testId="teacher-player"
        label="老师视频"
        playbackRate={playbackRate}
        onPlaybackRateChange={setPlaybackRate}
        onTimeChange={setCurrentTime}
        onDurationChange={setDuration}
        onPlayingChange={setPlaying}
      />

      {countInDisplay !== null && (
        <button className="count-in-overlay" onClick={cancelCountIn} aria-label="取消预备拍">
          <span>预备</span>
          <strong>{countInDisplay}</strong>
          <small>点击取消</small>
        </button>
      )}

      <BeatRail
        currentTime={currentTime}
        anchorSec={anchorSec}
        bpm={bpm}
        onSeek={time => playerRef.current?.seek(time)}
      />

      <section className="workspace-grid">
        <article className="workspace-card">
          <div className="section-heading section-heading--inline">
            <div>
              <p className="eyebrow">Calibration</p>
              <h2>人工校准拍子</h2>
            </div>
            <div className="count-readout"><span>当前拍</span><strong>{currentCount}</strong></div>
          </div>

          <div className="calibration-row">
            <label>
              <span>建议 / 确认 BPM</span>
              <input
                type="number"
                min="40"
                max="240"
                value={bpm}
                onChange={event => setBpm(Number(event.target.value) || 100)}
              />
            </label>
            <button onClick={tapTempo}>Tap Tempo</button>
            <button onClick={() => setBpm(Math.max(40, Math.round(bpm / 2)))}>½ BPM</button>
            <button onClick={() => setBpm(Math.min(240, Math.round(bpm * 2)))}>2× BPM</button>
          </div>

          <p className="field-label">告诉系统：当前位置是第几拍</p>
          <div className="count-buttons">
            {Array.from({ length: 8 }, (_, index) => index + 1).map(count => (
              <button key={count} onClick={() => setCurrentAsCount(count)} aria-pressed={currentCount === count}>
                {count}
              </button>
            ))}
          </div>

          <div className="inline-actions">
            <button onClick={() => setAnchorSec(value => value - 0.05)}>整体提前 50ms</button>
            <button onClick={() => setAnchorSec(value => value + 0.05)}>整体延后 50ms</button>
            <span className="muted">锚点 {formatTime(Math.max(0, anchorSec))}</span>
          </div>
        </article>

        <article className="workspace-card">
          <div className="section-heading">
            <p className="eyebrow">Smart Loop</p>
            <h2>不用手动设 A/B 点</h2>
          </div>
          <div className="loop-buttons">
            {(['off', '1-4', '5-8', '1-8'] as LoopMode[]).map(mode => (
              <button key={mode} onClick={() => setLoopMode(mode)} aria-pressed={loopMode === mode}>
                {mode === 'off' ? '关闭' : mode}
              </button>
            ))}
          </div>
          <label className="check-row">
            <input type="checkbox" checked={connectEdges} onChange={event => setConnectEdges(event.target.checked)} />
            <span>包含前后连接拍</span>
          </label>
          <div className="loop-summary">
            <strong>{loopWindow?.label ?? 'Loop 已关闭'}</strong>
            <span>{loopWindow ? `${formatTime(loopWindow.startSec)} → ${formatTime(loopWindow.endSec)}` : '视频自由播放'}</span>
          </div>
          <div className="inline-actions">
            <button onClick={() => seekBeat(-1)}>上一拍</button>
            <button onClick={() => seekBeat(1)}>下一拍</button>
            <button className="primary" onClick={startPractice}>从循环开始</button>
          </div>
          <label className="compact-select">
            <span>Count-in</span>
            <select value={countInBeats} onChange={event => setCountInBeats(Number(event.target.value))}>
              <option value={0}>关闭</option>
              <option value={1}>1 拍</option>
              <option value={2}>2 拍</option>
              <option value={4}>4 拍</option>
              <option value={8}>1 个八拍</option>
            </select>
          </label>
        </article>
      </section>

      <section className="five-layer-grid">
        <article className="workspace-card layer-card layer-card--motion">
          <p className="eyebrow">Motion Layer · 第 {phraseIndex + 1} 个八拍</p>
          <h2>动作解析</h2>
          <textarea
            value={phraseNote.motion}
            onChange={event => updatePhraseNote({ motion: event.target.value })}
            placeholder="动作、重心、手脚位置、方向、力度、连接……"
          />
        </article>

        <article className="workspace-card layer-card layer-card--knowledge">
          <p className="eyebrow">Knowledge Layer</p>
          <h2>老师提示 / 易错点</h2>
          <textarea
            value={phraseNote.knowledge}
            onChange={event => updatePhraseNote({ knowledge: event.target.value })}
            placeholder="为什么这样做？老师说了什么？我反复错在哪里？"
          />
        </article>

        <article className="workspace-card layer-card layer-card--learning">
          <p className="eyebrow">Learning Layer</p>
          <h2>当前学习状态</h2>
          <select value={phraseNote.stage} onChange={event => updatePhraseNote({ stage: event.target.value })}>
            {learningStages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="next-action">
            <span>下次第一步</span>
            <strong>{nextAction}</strong>
          </div>
        </article>
      </section>

      <CountRecorder />
    </main>
  );
}
