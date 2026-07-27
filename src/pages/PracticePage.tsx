import { VideoPlayer } from '../components/VideoPlayer';

type Props = { onBack: () => void };

export function PracticePage({ onBack }: Props) {
  return (
    <main className="page page--practice" data-testid="practice-page">
      <header className="page-header">
        <button type="button" onClick={onBack}>返回</button>
        <div>
          <p className="eyebrow">单屏扒舞</p>
          <h1>老师视频</h1>
        </div>
      </header>

      <VideoPlayer testId="teacher-player" label="老师视频" />

      <section className="phase-note">
        <strong>Phase 0 真机闸门</strong>
        <span>本页面的 DOM 中只有一个播放器。先验证全宽、居中、缩放和移动。</span>
      </section>
    </main>
  );
}
