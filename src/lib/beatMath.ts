export type LoopMode = 'off' | '1-4' | '5-8' | '1-8';

export type BeatItem = {
  index: number;
  timeSec: number;
  count: number;
  phraseIndex: number;
  isCurrent: boolean;
};

export type LoopWindow = {
  startSec: number;
  endSec: number;
  label: string;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function beatIntervalSec(bpm: number): number {
  return 60 / clamp(Number.isFinite(bpm) ? bpm : 120, 20, 300);
}

export function beatIndexAt(timeSec: number, anchorSec: number, bpm: number): number {
  return Math.floor((timeSec - anchorSec) / beatIntervalSec(bpm) + 1e-7);
}

export function beatTimeSec(index: number, anchorSec: number, bpm: number): number {
  return anchorSec + index * beatIntervalSec(bpm);
}

export function countForBeat(index: number): number {
  return ((index % 8) + 8) % 8 + 1;
}

export function phraseForBeat(index: number): number {
  return Math.floor(index / 8);
}

export function anchorForCurrentCount(
  currentTimeSec: number,
  count: number,
  bpm: number,
): number {
  const normalizedCount = clamp(Math.round(count), 1, 8);
  return currentTimeSec - (normalizedCount - 1) * beatIntervalSec(bpm);
}

export function makeBeatRail(
  currentTimeSec: number,
  anchorSec: number,
  bpm: number,
  before = 4,
  after = 8,
): BeatItem[] {
  const currentIndex = beatIndexAt(currentTimeSec, anchorSec, bpm);
  const items: BeatItem[] = [];

  for (let index = currentIndex - before; index <= currentIndex + after; index += 1) {
    items.push({
      index,
      timeSec: beatTimeSec(index, anchorSec, bpm),
      count: countForBeat(index),
      phraseIndex: phraseForBeat(index),
      isCurrent: index === currentIndex,
    });
  }

  return items;
}

export function getLoopWindow(
  mode: LoopMode,
  currentTimeSec: number,
  anchorSec: number,
  bpm: number,
  connectEdges: boolean,
  durationSec: number,
): LoopWindow | null {
  if (mode === 'off') return null;

  const currentBeat = Math.max(0, beatIndexAt(currentTimeSec, anchorSec, bpm));
  const phraseStart = Math.floor(currentBeat / 8) * 8;

  let startBeat = phraseStart;
  let endBeatExclusive = phraseStart + 8;
  let label = '当前 1–8';

  if (mode === '1-4') {
    endBeatExclusive = phraseStart + 4;
    label = '当前 1–4';
  } else if (mode === '5-8') {
    startBeat = phraseStart + 4;
    endBeatExclusive = phraseStart + 8;
    label = '当前 5–8';
  }

  if (connectEdges) {
    startBeat -= 1;
    endBeatExclusive += 1;
    label += '（含连接拍）';
  }

  const startSec = clamp(beatTimeSec(startBeat, anchorSec, bpm), 0, Math.max(0, durationSec));
  const endSec = clamp(beatTimeSec(endBeatExclusive, anchorSec, bpm), startSec, Math.max(startSec, durationSec));

  return { startSec, endSec, label };
}

export function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00.0';
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}
