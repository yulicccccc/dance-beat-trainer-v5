type Props = {
  onPractice: () => void;
  onReview: () => void;
};

const layers = [
  ['Media', '视频、慢放、镜像、缩放'],
  ['Rhythm', '拍子、Tempo、Loop、喊拍'],
  ['Motion', '动作与身体时间线'],
  ['Knowledge', '技巧、错误、老师提示'],
  ['Learning', '熟练度、提示淡出、下一步'],
];

export function StartPage({ onPractice, onReview }: Props) {
  return (
    <main className="start-page">
      <section className="start-hero">
        <div className="start-copy">
          <p className="eyebrow">Dance Beat Trainer · Greenfield V5</p>
          <h1>把舞蹈视频变成真正能练会的时间轴</h1>
          <p className="start-lead">机器先建议，你来校准。先看懂拍子，再拆动作、记录知识，最后逐步撤掉辅助。</p>
          <div className="start-actions">
            <button className="primary start-button" onClick={onPractice}>进入单屏扒舞</button>
            <button className="secondary start-button" onClick={onReview}>进入双屏复盘</button>
          </div>
          <p className="privacy-note">视频与录音默认只在当前设备浏览器中处理。</p>
        </div>

        <div className="layer-map" aria-label="五层学习架构">
          {layers.map(([name, description], index) => (
            <div className="layer-row" key={name}>
              <span>{index + 1}</span>
              <div><strong>{name}</strong><small>{description}</small></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mode-explainer">
        <article>
          <span className="mode-number">01</span>
          <h2>单屏就是单屏</h2>
          <p>Practice 页面只创建一个老师播放器，不隐藏第二列，不恢复双屏状态。</p>
        </article>
        <article>
          <span className="mode-number">02</span>
          <h2>复盘是独立页面</h2>
          <p>Review 页面才创建老师与我的录像两个播放器，并使用独立同步控制器。</p>
        </article>
      </section>
    </main>
  );
}
