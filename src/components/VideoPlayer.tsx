import {
  type ChangeEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useVideoTransform } from '../hooks/useVideoTransform';
import { formatTime } from '../lib/beatMath';

type FitMode = 'contain' | 'cover' | 'original';

export type VideoPlayerHandle = {
  getVideo: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPaused: () => boolean;
  play: () => Promise<void>;
  pause: () => void;
  seek: (timeSec: number) => void;
  setRate: (rate: number) => void;
};

type Props = {
  testId: string;
  label: string;
  compact?: boolean;
  playbackRate?: number;
  showTransport?: boolean;
  onPlaybackRateChange?: (rate: number) => void;
  onTimeChange?: (timeSec: number) => void;
  onDurationChange?: (durationSec: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onFileSelected?: (file: File) => void;
};

export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  {
    testId,
    label,
    compact = false,
    playbackRate = 1,
    showTransport = true,
    onPlaybackRateChange,
    onTimeChange,
    onDurationChange,
    onPlayingChange,
    onFileSelected,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [mirrored, setMirrored] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const view = useVideoTransform();

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
    const pitchVideo = video as HTMLVideoElement & {
      preservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    pitchVideo.preservesPitch = true;
    pitchVideo.webkitPreservesPitch = true;
  }, [playbackRate, source]);

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    getDuration: () => videoRef.current?.duration ?? 0,
    isPaused: () => videoRef.current?.paused ?? true,
    async play() {
      const video = videoRef.current;
      if (!video || !source) return;
      await video.play();
    },
    pause() {
      videoRef.current?.pause();
    },
    seek(timeSec: number) {
      const video = videoRef.current;
      if (!video || !Number.isFinite(timeSec)) return;
      video.currentTime = Math.max(0, Math.min(video.duration || timeSec, timeSec));
      setCurrentTime(video.currentTime);
      onTimeChange?.(video.currentTime);
    },
    setRate(rate: number) {
      if (videoRef.current) videoRef.current.playbackRate = rate;
    },
  }), [onTimeChange, source]);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSource(url);
    setFileName(file.name);
    setError('');
    setCurrentTime(0);
    setDuration(0);
    view.reset();
    onFileSelected?.(file);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !source) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setError('浏览器暂时无法播放这个视频。请尝试 MP4（H.264/AAC）。');
    }
  }

  function updateTime() {
    const time = videoRef.current?.currentTime ?? 0;
    setCurrentTime(time);
    onTimeChange?.(time);
  }

  function updateMetadata() {
    const video = videoRef.current;
    if (!video) return;
    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(nextDuration);
    onDurationChange?.(nextDuration);
    video.playbackRate = playbackRate;
  }

  const transform = [
    `translate3d(${view.transform.panX}px, ${view.transform.panY}px, 0)`,
    `scale(${mirrored ? -view.transform.scale : view.transform.scale}, ${view.transform.scale})`,
    `rotate(${rotation}deg)`,
  ].join(' ');

  return (
    <section className={`video-player ${compact ? 'video-player--compact' : ''}`} data-testid={testId}>
      <header className="video-player__header">
        <div className="video-title">
          <strong>{label}</strong>
          <small>{fileName || '尚未选择视频'}</small>
        </div>
        <label className="file-button">
          选择视频
          <input type="file" accept="video/*" onChange={onFile} />
        </label>
      </header>

      <div
        className={`player-stage ${view.adjustMode ? 'is-adjusting' : ''}`}
        {...view.handlers}
        onDoubleClick={() => view.setScale(view.transform.scale > 1.1 ? 1 : 2)}
      >
        <div className="centering-layer">
          <div className="transform-layer" style={{ transform }}>
            {source ? (
              <video
                ref={videoRef}
                src={source}
                playsInline
                preload="metadata"
                className={`media media--${fitMode}`}
                onLoadedMetadata={updateMetadata}
                onTimeUpdate={updateTime}
                onDurationChange={updateMetadata}
                onPlay={() => {
                  setPlaying(true);
                  onPlayingChange?.(true);
                }}
                onPause={() => {
                  setPlaying(false);
                  onPlayingChange?.(false);
                }}
                onError={() => setError('视频无法解码。建议转换为 MP4（H.264/AAC）后重试。')}
                onClick={() => {
                  if (!view.adjustMode) void togglePlayback();
                }}
              />
            ) : (
              <div className="empty-state">
                <span>本地处理，不上传服务器</span>
                <strong>选择一个舞蹈视频开始</strong>
              </div>
            )}
          </div>
        </div>
        {view.adjustMode && <div className="adjust-badge">画面调整中 · 单指移动 / 双指缩放</div>}
      </div>

      {showTransport && (
        <div className="transport-row">
          <button className="transport-play" onClick={() => void togglePlayback()} disabled={!source}>
            {playing ? '暂停' : '播放'}
          </button>
          <input
            aria-label={`${label}进度`}
            type="range"
            min={0}
            max={Math.max(duration, 0.01)}
            step="0.01"
            value={Math.min(currentTime, Math.max(duration, 0.01))}
            disabled={!source}
            onChange={event => {
              const next = Number(event.target.value);
              if (videoRef.current) videoRef.current.currentTime = next;
              setCurrentTime(next);
              onTimeChange?.(next);
            }}
          />
          <output>{formatTime(currentTime)} / {formatTime(duration)}</output>
        </div>
      )}

      <div className="player-controls">
        <button onClick={() => setMirrored(value => !value)} aria-pressed={mirrored}>
          {mirrored ? '取消镜像' : '镜像'}
        </button>
        <button onClick={() => setRotation(value => (value + 90) % 360)}>旋转</button>
        <button onClick={() => view.setAdjustMode(!view.adjustMode)} aria-pressed={view.adjustMode}>
          {view.adjustMode ? '完成调整' : '画面调整'}
        </button>
        <button onClick={view.center}>居中</button>
        <button onClick={view.reset}>重置</button>
        <span className="zoom-output">{Math.round(view.transform.scale * 100)}%</span>
      </div>

      <div className="player-controls player-controls--secondary">
        <button onClick={() => setFitMode('contain')} aria-pressed={fitMode === 'contain'}>完整</button>
        <button onClick={() => setFitMode('cover')} aria-pressed={fitMode === 'cover'}>铺满</button>
        <button onClick={() => setFitMode('original')} aria-pressed={fitMode === 'original'}>原始</button>
        {showTransport && (
          <label className="speed-control">
            <span>速度</span>
            <select
              value={playbackRate}
              onChange={event => onPlaybackRateChange?.(Number(event.target.value))}
            >
              {[0.1, 0.25, 0.5, 0.75, 1, 1.25].map(rate => (
                <option key={rate} value={rate}>{rate.toFixed(2)}×</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  );
});
