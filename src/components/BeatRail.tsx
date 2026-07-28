import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { makeBeatRail } from '../lib/beatMath';

type Props = {
  currentTime: number;
  anchorSec: number;
  bpm: number;
  onSeek: (timeSec: number) => void;
};

export function BeatRail({ currentTime, anchorSec, bpm, onSeek }: Props) {
  const beats = makeBeatRail(currentTime, anchorSec, bpm, 5, 9);
  const current = beats.find(item => item.isCurrent);
  const [overlayTarget, setOverlayTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setOverlayTarget(
      document.querySelector<HTMLElement>(
        '.page--practice [data-testid="teacher-player"] .player-stage',
      ),
    );
  }, []);

  const cornerOverlay = overlayTarget
    ? createPortal(
      <div
        aria-live="polite"
        aria-label={`当前拍 ${current?.count ?? 1}`}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 8,
          display: 'grid',
          minWidth: '64px',
          padding: '8px 11px 9px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '16px',
          background: 'rgba(8, 12, 23, 0.76)',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#fff',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            color: '#aab7d5',
            fontSize: '0.66rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
          }}
        >
          当前拍
        </span>
        <strong
          style={{
            marginTop: '-1px',
            fontSize: '2rem',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {current?.count ?? 1}
        </strong>
      </div>,
      overlayTarget,
    )
    : null;

  return (
    <>
      {cornerOverlay}
      <section className="beat-panel" aria-label="滚动拍子轨">
        <div className="section-heading section-heading--inline">
          <div>
            <p className="eyebrow">Rhythm Layer</p>
            <h2>滚动拍子轨</h2>
          </div>
          <div className="beat-now" aria-live="polite">
            <span>当前</span>
            <strong>{current?.count ?? 1}</strong>
          </div>
        </div>

        <div className="beat-rail" role="list">
          {beats.map(item => (
            <button
              key={item.index}
              className={`beat-cell ${item.isCurrent ? 'is-current' : ''} ${item.count === 1 ? 'is-one' : ''}`}
              onClick={() => onSeek(Math.max(0, item.timeSec))}
              title={`第 ${item.phraseIndex + 1} 个八拍 · ${item.count}`}
              role="listitem"
            >
              <span>{item.count}</span>
              <small>{item.phraseIndex + 1}</small>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
