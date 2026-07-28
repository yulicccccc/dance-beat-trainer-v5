import { useEffect, useMemo, useRef, useState } from 'react';
import { BeatRail } from '../components/BeatRail';
import { CountRecorder } from '../components/CountRecorder';
import { VideoPlayer, type VideoPlayerHandle } from '../components/VideoPlayer';
import { usePersistentState } from '../hooks/usePersistentState';
import { analyzeBpmFile, type BpmAnalysisResult } from '../lib/bpmAnalysis';
import {
  type LoopMode,
  anchorForCurrentCount,
  beatIndexAt,
  beatIntervalSec,
  countForBeat,
  formatTime,
  getLoopWindow,
  phraseForBeat,
} from '../lib/beatMath';

type Props = { onBack: () => void };

type PracticeNotes = Record<string, {
  motion: string;
  knowledge: string;
  stage: string;
}>;

type RhythmStatus = 'idle' | 'analyzing' | 'suggested' | 'confirmed' | 'manual' | 'failed';

const learningStages = [
  ['not-understood', '未看懂'],
  ['understood', '已看懂'],
  ['follow-teacher', '能跟老师做'],
  ['independent-slow', '慢速可独立'],
  ['independent-full-speed', '原速可独立'],
  ['music-only', '只听音乐也能做'],
  ['delayed-stable', '延迟后仍稳定'],
] as const;

const relationLabels = {
  primary: '推荐',
  half: '½ 倍',
  double: '2 倍',
  alternate: '候选',
} as const;

function rhythmStatusCopy(status: RhythmStatus, bpm: number | null) {
  if (status === 'analyzing') return '正在本地读取音轨并估算节奏…';
  if (status === 'suggested') return `检测到 ${bpm ?? '—'} BPM，等待你确认`;
  if (status === 'confirmed') return `已确认 ${bpm ?? '—'} BPM`;
  if (status === 'manual') return `人工设置 ${bpm ?? '—'} BPM`;
  if (status === 'failed') return '自动分析失败，请使用 Tap Tempo 或手动输入';
  return '上传视频后开始本地分析';
}

export function PracticePage({ onBack }: Props) {
  const playerRef = useRef<VideoPlayerHandle>(null);
  const countInTimerRef = useRef<number | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const analysisRequestRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = usePersistentState('dbt:practice-rate', 0.75);
  const [bpm, setBpm] = useState<number | null>(null);
  const [anchorSec, setAnchorSec] = useState(0);
  const [rhythmStatus, setRhythmStatus] = useState<RhythmStatus>('idle');
  const [analysis, setAnalysis] = useState<BpmAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [connectEdges, setConnectEdges] = useState(true);
  const [countInBeats, setCountInBeats] = useState(4);
  const [countInDisplay, setCountInDisplay] = useState<number | null>(null);
  const [notes, setNotes] = usePersistentState<PracticeNotes>('dbt:practice-notes', {});

  const hasTempo = bpm !== null && Number.isFinite(bpm) && bpm >= 40 && bpm <= 240;
  const tempoConfirmed = hasTempo && (rhythmStatus === 'confirmed' || rhythmStatus === 'manual');
  const activeBpm = bpm ?? 100;
  const beatIndex = hasTempo ? Math.max(0, beatIndexAt(currentTime, anchorSec, activeBpm)) : 0;
  const currentCount = hasTempo ? countForBeat(beatIndex) : null;
  const phraseIndex = hasTempo ? phraseForBeat(beatIndex) : 0;
  const phraseKey = String(phraseIndex);
  const phraseNote = notes[phraseKey] ?? {
    motion: '',
    knowledge: '',
    stage: 'not-understood',
  };

  const loopWindow = useMemo(
    () => tempoConfirmed
      ? getLoopWindow(loopMode, currentTime, anchorSec, activeBpm, connectEdges, duration)
      : null,
    [activeBpm, anchorSec, connectEdges, currentTime, duration, loopMode, tempoConfirmed],
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

  async function handleFileSelected(file: File) {
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setBpm(null);
    setAnchorSec(0);
    setLoopMode('off');
    setAnalysis(null);
    setAnalysisError('');
    setRhythmStatus('analyzing');

    try {
      const result = await analyzeBpmFile(file);
      if (analysisRequestRef.current !== requestId) return;
      setAnalysis(result);
      setBpm(result.primaryBpm);
      setAnchorSec(Number(result.beatAnchorSec.toFixed(4)));
      setRhythmStatus('suggested');
    } catch (error) {
      if (analysisRequestRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : '无法分析这个视频的音轨。';
      setAnalysisError(message);
      setRhythmStatus('failed');
    }
  }

  function setManualBpm(next: number | null) {
    if (next === null || !Number.isFinite(next) || next < 40 || next > 240) {
      setBpm(null);
      setRhythmStatus('idle');
      setLoopMode('off');
      return;
    }
    setBpm(Math.round(next * 10) / 10);
    setRhythmStatus('manual');
  }

  function setCurrentAsCount(count: number) {
    if (!hasTempo) return;
    setAnchorSec(Number(anchorForCurrentCount(currentTime, count, activeBpm).toFixed(4)));
    setRhythmStatus('manual');
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
    setManualBpm(Math.min(240, Math.max(40, 60000 / average)));
  }

  function seekBeat(delta: number) {
    if (!hasTempo) return;
    const interval = beatIntervalSec(activeBpm);
    playerRef.current?.seek(Math.max(0, currentTime + delta * interval));
  }

  function cancelCountIn() {
    if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
    countInTimerRef.current = null;
    setCountInDisplay(null);
  }

  function startPractice() {
    if (!tempoConfirmed) return;
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
      countInTimerRef.current = window.setTimeout(tick, beatIntervalSec(activeBpm) * 1000);
    };
    countInTimerRef.current = window.setTimeout(tick, beatIntervalSec(activeBpm) * 1000);
  }

  const nextAction = !tempoConfirmed
    ? '先确认自动分析结果，或使用 Tap Tempo 设置正确 BPM。'
    : `从第 ${phraseIndex + 1} 个八拍的 ${loopMode === 'off' ? '1–8' : loopMode} 开始，${playbackRate.toFixed(2)}×，${countInBeats || 0} 拍预备。`;

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
        onFileSelected={file => void handleFileSelected(file)}
      />

      {countInDisplay !== null && (
        <button className="count-in-overlay" onClick={cancelCountIn} aria-label="取消预备拍">
          <span>预备</span>
          <strong>{countInDisplay}</strong>
          <small>点击取消</small>
        </button>
      )}

      {hasTempo ? (
        <BeatRail
          currentTime={currentTime}
          anchorSec={anchorSec}
          bpm={activeBpm}
          onSeek={time => playerRef.current?.seek(time)}
        />
      ) : (
        <section className="beat-panel rhythm-placeholder" aria-live="polite">
          <p className="eyebrow">Rhythm Layer</p>
          <h2>{rhythmStatus === 'analyzing' ? '正在分析音轨…' : '尚未生成拍子轨'}</h2>
          <p>没有有效 BPM 时，系统不会生成假的拍子和 Loop。</p>
        </section>
      )}

      <section className="workspace-grid">
        <article className="workspace-card">
          <div className="section-heading section-heading--inline">
            <div>
              <p className="eyebrow">Rhythm Analysis</p>
              <h2>分析并确认拍子</h2>
            </div>
            <div className="count-readout"><span>当前拍</span><strong>{currentCount ?? '—'}</strong></div>
          </div>

          <div className={`rhythm-status rhythm-status--${rhythmStatus}`}>
            <strong>{rhythmStatusCopy(rhythmStatus, bpm)}</strong>
            {analysis && (
              <span>
                置信度 {Math.round(analysis.confidence * 100)}% · 分析前 {Math.round(analysis.analyzedDurationSec)} 秒
              </span>
            )}
            {analysisError && <span>{analysisError}</span>}
          </div>

          {analysis && (
            <div className="bpm-candidates" aria-label="BPM 候选">
              {analysis.candidates.map(candidate => (
                <button
                  key={`${candidate.relation}-${candidate.bpm}`}
                  onClick={() => {
                    setBpm(candidate.bpm);
                    setRhythmStatus('suggested');
                  }}
                  aria-pressed={bpm === candidate.bpm}
                >
                  <small>{relationLabels[candidate.relation]}</small>
                  <strong>{candidate.bpm}</strong>
                </button>
              ))}
            </div>
          )}

          <div className="calibration-row">
            <label>
              <span>确认 BPM</span>
              <input
                type="number"
                min="40"
                max="240"
                step="0.1"
                value={bpm ?? ''}
                placeholder="未分析"
                onChange={event => {
                  const raw = event.target.value;
                  setManualBpm(raw === '' ? null : Number(raw));
                }}
              />
            </label>
            <button onClick={tapTempo}>Tap Tempo</button>
            <button disabled={!hasTempo} onClick={() => setManualBpm(activeBpm / 2)}>½ BPM</button>
            <button disabled={!hasTempo} onClick={() => setManualBpm(activeBpm * 2)}>2× BPM</button>
          </div>

          {rhythmStatus === 'suggested' && (
            <button className="primary confirm-tempo" onClick={() => setRhythmStatus('confirmed')}>
              确认使用 {bpm} BPM
            </button>
          )}

          <p className="field-label">告诉系统：当前位置是第几拍</p>
          <div className="count-buttons">
            {Array.from({ length: 8 }, (_, index) => index + 1).map(count => (
              <button
                key={count}
                disabled={!hasTempo}
                onClick={() => setCurrentAsCount(count)}
                aria-pressed={currentCount === count}
              >
                {count}
              </button>
            ))}
          </div>

          <div className="inline-actions">
            <button disabled={!hasTempo} onClick={() => {
              setAnchorSec(value => value - 0.05);
              setRhythmStatus('manual');
            }}>整体提前 50ms</button>
            <button disabled={!hasTempo} onClick={() => {
              setAnchorSec(value => value + 0.05);
              setRhythmStatus('manual');
            }}>整体延后 50ms</button>
            <span className="muted">拍点锚点 {hasTempo ? formatTime(Math.max(0, anchorSec)) : '—'}</span>
          </div>
        </article>

        <article className="workspace-card">
          <div className="section-heading">
            <p className="eyebrow">Smart Loop</p>
            <h2>不用手动设 A/B 点</h2>
          </div>
          <div className="loop-buttons">
            {(['off', '1-4', '5-8', '1-8'] as LoopMode[]).map(mode => (
              <button
                key={mode}
                disabled={!tempoConfirmed}
                onClick={() => setLoopMode(mode)}
                aria-pressed={loopMode === mode}
              >
                {mode === 'off' ? '关闭' : mode}
              </button>
            ))}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={connectEdges}
              disabled={!tempoConfirmed}
              onChange={event => setConnectEdges(event.target.checked)}
            />
            <span>包含前后连接拍</span>
          </label>
          <div className="loop-summary">
            <strong>{!tempoConfirmed ? '请先确认 BPM' : loopWindow?.label ?? 'Loop 已关闭'}</strong>
            <span>{loopWindow ? `${formatTime(loopWindow.startSec)} → ${formatTime(loopWindow.endSec)}` : '未确认节拍时不会生成 Loop'}</span>
          </div>
          <div className="inline-actions">
            <button disabled={!hasTempo} onClick={() => seekBeat(-1)}>上一拍</button>
            <button disabled={!hasTempo} onClick={() => seekBeat(1)}>下一拍</button>
            <button className="primary" disabled={!tempoConfirmed} onClick={startPractice}>从循环开始</button>
          </div>
          <label className="compact-select">
            <span>Count-in</span>
            <select value={countInBeats} disabled={!tempoConfirmed} onChange={event => setCountInBeats(Number(event.target.value))}>
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
