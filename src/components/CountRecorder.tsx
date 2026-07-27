import { useEffect, useRef, useState } from 'react';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'ready';

export function CountRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const [state, setState] = useState<RecorderState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('当前浏览器不支持录音。');
      return;
    }

    try {
      setState('requesting');
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const nextUrl = URL.createObjectURL(blob);
        urlRef.current = nextUrl;
        setAudioUrl(nextUrl);
        setState('ready');
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setState('recording');
    } catch {
      setError('无法使用麦克风。请检查浏览器权限。');
      setState('idle');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  return (
    <section className="workspace-card count-recorder">
      <div className="section-heading section-heading--inline">
        <div>
          <p className="eyebrow">Count Track · Alpha</p>
          <h2>连续个人喊拍母带</h2>
        </div>
        <span className="status-pill">本地录音</span>
      </div>
      <p className="muted compact-copy">先连续喊 1–8。当前版本保留原始母带；自动切拍、局部 Punch-in 与变速映射将在后续阶段接入。</p>
      <div className="inline-actions">
        {state !== 'recording' ? (
          <button className="primary" onClick={() => void startRecording()} disabled={state === 'requesting'}>
            {state === 'requesting' ? '请求麦克风…' : audioUrl ? '重新录制' : '开始录制'}
          </button>
        ) : (
          <button className="danger" onClick={stopRecording}>停止录制</button>
        )}
        {state === 'recording' && <span className="recording-dot">正在录制</span>}
      </div>
      {audioUrl && <audio className="count-audio" src={audioUrl} controls preload="metadata" />}
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  );
}
