type Props = {
  onPractice: () => void;
  onReview: () => void;
};

export function StartPage({ onPractice, onReview }: Props) {
  return (
    <main className="start-page" data-testid="start-page">
      <section className="start-card">
        <p className="eyebrow">Dance Beat Trainer · Greenfield V5</p>
        <h1>今天练哪一种？</h1>
        <p className="muted">
          单屏扒舞和双屏复盘是两个完全独立的工作区，不共享播放器布局。
        </p>
        <button className="primary" type="button" onClick={onPractice}>
          单屏扒舞
        </button>
        <button className="secondary" type="button" onClick={onReview}>
          双屏复盘
        </button>
      </section>
    </main>
  );
}
