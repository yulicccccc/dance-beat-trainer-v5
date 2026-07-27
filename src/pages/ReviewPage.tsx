import { VideoPlayer } from '../components/VideoPlayer';

type Props = { onBack: () => void };

export function ReviewPage({ onBack }: Props) {
  return (
    <main className="page page--review" data-testid="review-page">
      <header className="page-header">
        <button type="button" onClick={onBack}>返回</button>
        <div>
          <p className="eyebrow">双屏复盘</p>
          <h1>老师与我的录像</h1>
        </div>
      </header>

      <section className="review-grid" data-testid="review-grid">
        <VideoPlayer testId="teacher-review-player" label="老师视频" />
        <VideoPlayer testId="student-player" label="我的录像" />
      </section>
    </main>
  );
}
