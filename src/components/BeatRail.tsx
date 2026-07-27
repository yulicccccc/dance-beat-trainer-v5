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

  return (
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
  );
}
