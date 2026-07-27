import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useVideoTransform } from '../hooks/useVideoTransform';

type FitMode = 'contain' | 'cover' | 'original';

type Props = {
  testId: string;
  label: string;
};

type VideoMetadata = {
  name: string;
  width: number;
  height: number;
  duration: number;
};

export function VideoPlayer({ testId, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [mirrored, setMirrored] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const pendingFileName = useRef('');
  const view = useVideoTransform();

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    pendingFileName.current = file.name;
    setSource(url);
    setMetadata(null);
    setMediaError(null);
    setPlaying(false);
    setFitMode('contain');
    setMirrored(false);
    setRotation(0);
    view.reset();
    event.target.value = '';
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !source) return;

    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setMediaError('浏览器暂时无法播放这个视频。请确认格式可以在 iPhone Chrome 中解码。');
    }
  }

  const panZoomTransform = `translate3d(${view.transform.panX}px, ${view.transform.panY}px, 0) scale(${view.transform.scale})`;
  const mediaTransform = `rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})`;

  return (
    <section className="video-player" data-testid={testId}>
      <header className="video-player__header">
        <div>
          <strong>{label}</strong>
          {metadata && (
            <small>{metadata.name} · {metadata.width}×{metadata.height}</small>
          )}
        </div>
        <label className="file-button">
          选择视频
          <input type="file" accept="video/*" onChange={onFile} />
        </label>
      </header>

      <div
        className={`player-stage ${view.adjustMode ? 'is-adjusting' : ''}`}
        aria-label={`${label}播放窗口`}
        {...view.handlers}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="centering-layer">
          <div className="transform-layer" style={{ transform: panZoomTransform }}>
            {source ? (
              <video
                ref={videoRef}
                src={source}
                playsInline
                preload="metadata"
                className={`media media--${fitMode}`}
                style={{ transform: mediaTransform }}
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  setMetadata({
                    name: pendingFileName.current,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration,
                  });
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onError={() => setMediaError('视频读取失败。请尝试 MP4（H.264/AAC）格式。')}
                onClick={() => {
                  if (!view.adjustMode) void togglePlayback();
                }}
              />
            ) : (
              <div className="empty-state">
                <span>选择本地视频开始</span>
                <small>视频仅在当前设备浏览器中读取</small>
              </div>
            )}
          </div>
        </div>
      </div>

      {mediaError && <p className="media-error" role="alert">{mediaError}</p>}

      <div className="player-controls">
        <button type="button" onClick={() => void togglePlayback()} disabled={!source}>
          {playing ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={() => setMirrored((value) => !value)} aria-pressed={mirrored}>
          {mirrored ? '取消镜像' : '镜像'}
        </button>
        <button type="button" onClick={() => setRotation((value) => (value + 90) % 360)}>
          旋转
        </button>
        <button
          type="button"
          onClick={() => view.setAdjustMode(!view.adjustMode)}
          aria-pressed={view.adjustMode}
        >
          {view.adjustMode ? '完成调整' : '画面调整'}
        </button>
      </div>

      <div className="player-controls player-controls--secondary">
        <button type="button" onClick={() => setFitMode('contain')} aria-pressed={fitMode === 'contain'}>适应</button>
        <button type="button" onClick={() => setFitMode('cover')} aria-pressed={fitMode === 'cover'}>铺满</button>
        <button type="button" onClick={() => setFitMode('original')} aria-pressed={fitMode === 'original'}>原始</button>
        <button type="button" onClick={view.center}>居中</button>
        <button type="button" onClick={view.reset}>重置</button>
        <output aria-label="缩放倍率">{Math.round(view.transform.scale * 100)}%</output>
      </div>
    </section>
  );
}
