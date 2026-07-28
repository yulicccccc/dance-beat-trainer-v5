export type BpmCandidate = {
  bpm: number;
  score: number;
  relation: 'primary' | 'half' | 'double' | 'alternate';
};

export type BpmAnalysisResult = {
  primaryBpm: number;
  candidates: BpmCandidate[];
  confidence: number;
  beatAnchorSec: number;
  analyzedDurationSec: number;
  audioDurationSec: number;
};

type EnvelopeEstimate = {
  primaryBpm: number;
  candidates: BpmCandidate[];
  confidence: number;
  beatAnchorSec: number;
};

const MIN_BPM = 40;
const MAX_BPM = 240;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function correlationAtLag(envelope: number[], lag: number) {
  if (lag < 1 || lag >= envelope.length - 2) return 0;
  let numerator = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let index = lag; index < envelope.length; index += 1) {
    const left = envelope[index];
    const right = envelope[index - lag];
    numerator += left * right;
    leftEnergy += left * left;
    rightEnergy += right * right;
  }

  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  return denominator > 0 ? numerator / denominator : 0;
}

function normalizeEnvelope(values: number[]) {
  if (values.length === 0) return [];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const deviation = Math.sqrt(variance) || 1;
  return values.map(value => Math.max(0, (value - mean) / deviation));
}

function scoreBpm(envelope: number[], envelopeRate: number, bpm: number) {
  const lag = Math.max(1, Math.round(envelopeRate * 60 / bpm));
  const base = correlationAtLag(envelope, lag);
  const secondPeriod = correlationAtLag(envelope, lag * 2);
  const fourthPeriod = correlationAtLag(envelope, lag * 4);

  // Repeated pulse trains are harmonically ambiguous. Longer-period support helps
  // retain half/double candidates while a gentle dance-tempo prior avoids always
  // selecting an extreme 40 or 240 BPM value.
  const harmonicSupport = base + secondPeriod * 0.42 + fourthPeriod * 0.16;
  const dancePrior = bpm >= 70 && bpm <= 180 ? 1 : 0.94;
  const centerPrior = 1 - Math.min(0.035, Math.abs(bpm - 120) / 4000);
  return harmonicSupport * dancePrior * centerPrior;
}

function uniqueCandidates(scored: Array<{ bpm: number; score: number }>) {
  const chosen: Array<{ bpm: number; score: number }> = [];
  for (const candidate of scored) {
    if (chosen.some(item => Math.abs(item.bpm - candidate.bpm) < 3)) continue;
    chosen.push(candidate);
    if (chosen.length >= 8) break;
  }
  return chosen;
}

function phaseAnchor(envelope: number[], envelopeRate: number, bpm: number) {
  const periodFrames = envelopeRate * 60 / bpm;
  const phaseCount = Math.max(1, Math.round(periodFrames));
  let bestPhase = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let phase = 0; phase < phaseCount; phase += 1) {
    let score = 0;
    let samples = 0;
    for (let cursor = phase; cursor < envelope.length; cursor += periodFrames) {
      const index = Math.round(cursor);
      if (index >= envelope.length) break;
      score += envelope[index];
      samples += 1;
    }
    const normalized = samples > 0 ? score / Math.sqrt(samples) : 0;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestPhase = phase;
    }
  }

  return bestPhase / envelopeRate;
}

export function estimateTempoFromEnvelope(envelope: number[], envelopeRate: number): EnvelopeEstimate {
  if (!Number.isFinite(envelopeRate) || envelopeRate <= 0 || envelope.length < envelopeRate * 8) {
    throw new Error('Audio sample is too short for tempo analysis.');
  }

  const normalized = normalizeEnvelope(envelope);
  const scored: Array<{ bpm: number; score: number }> = [];
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 1) {
    scored.push({ bpm, score: scoreBpm(normalized, envelopeRate, bpm) });
  }
  scored.sort((left, right) => right.score - left.score);

  const unique = uniqueCandidates(scored);
  if (unique.length === 0 || !Number.isFinite(unique[0].score) || unique[0].score <= 0) {
    throw new Error('No stable pulse was detected.');
  }

  const inDanceRange = unique.filter(item => item.bpm >= 70 && item.bpm <= 180);
  const primary = inDanceRange[0] ?? unique[0];
  const competing = unique.find(item => Math.abs(item.bpm - primary.bpm) >= 6) ?? unique[1] ?? primary;
  const prominence = clamp((primary.score - competing.score) / Math.max(primary.score, 0.0001), 0, 1);
  const absoluteStrength = clamp(primary.score / 1.35, 0, 1);
  const confidence = clamp(absoluteStrength * 0.72 + prominence * 0.28, 0, 1);

  const family = [
    { bpm: primary.bpm, relation: 'primary' as const },
    { bpm: primary.bpm / 2, relation: 'half' as const },
    { bpm: primary.bpm * 2, relation: 'double' as const },
  ].filter(item => item.bpm >= MIN_BPM && item.bpm <= MAX_BPM);

  const candidateMap = new Map<number, BpmCandidate>();
  for (const item of family) {
    const rounded = Math.round(item.bpm * 10) / 10;
    const nearest = scored.reduce((best, current) => (
      Math.abs(current.bpm - rounded) < Math.abs(best.bpm - rounded) ? current : best
    ), scored[0]);
    candidateMap.set(rounded, {
      bpm: rounded,
      score: clamp(nearest.score / Math.max(scored[0].score, 0.0001), 0, 1),
      relation: item.relation,
    });
  }

  for (const item of unique) {
    const rounded = Math.round(item.bpm * 10) / 10;
    if (candidateMap.has(rounded)) continue;
    candidateMap.set(rounded, {
      bpm: rounded,
      score: clamp(item.score / Math.max(scored[0].score, 0.0001), 0, 1),
      relation: 'alternate',
    });
    if (candidateMap.size >= 5) break;
  }

  const candidates = [...candidateMap.values()]
    .sort((left, right) => {
      if (left.relation === 'primary') return -1;
      if (right.relation === 'primary') return 1;
      return right.score - left.score;
    })
    .slice(0, 5);

  return {
    primaryBpm: primary.bpm,
    candidates,
    confidence,
    beatAnchorSec: phaseAnchor(normalized, envelopeRate, primary.bpm),
  };
}

function buildOnsetEnvelope(buffer: AudioBuffer, maxDurationSec = 90) {
  const frameSize = 1024;
  const sampleCount = Math.min(buffer.length, Math.floor(buffer.sampleRate * maxDurationSec));
  const frameCount = Math.floor(sampleCount / frameSize);
  const energies = new Array<number>(frameCount).fill(0);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameSize;
    let sum = 0;
    let values = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let sample = start; sample < start + frameSize; sample += 4) {
        const value = data[sample] ?? 0;
        sum += value * value;
        values += 1;
      }
    }
    energies[frame] = values > 0 ? Math.sqrt(sum / values) : 0;
  }

  const onset = energies.map((energy, index) => {
    const previous = energies[index - 1] ?? energy;
    const previousTwo = energies[index - 2] ?? previous;
    return Math.max(0, energy - previous * 0.72 - previousTwo * 0.18);
  });

  const smoothed = onset.map((value, index) => (
    value * 0.55 + (onset[index - 1] ?? 0) * 0.3 + (onset[index - 2] ?? 0) * 0.15
  ));

  return {
    envelope: smoothed,
    envelopeRate: buffer.sampleRate / frameSize,
    analyzedDurationSec: sampleCount / buffer.sampleRate,
  };
}

export async function analyzeBpmFile(file: File): Promise<BpmAnalysisResult> {
  if (!file || file.size === 0) throw new Error('Video file is empty.');

  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('This browser does not support local audio analysis.');

  const context = new AudioContextConstructor();
  try {
    const bytes = await file.arrayBuffer();
    const audio = await context.decodeAudioData(bytes.slice(0));
    if (audio.duration < 8) throw new Error('Audio is too short for reliable BPM analysis.');

    const prepared = buildOnsetEnvelope(audio);
    const estimate = estimateTempoFromEnvelope(prepared.envelope, prepared.envelopeRate);
    return {
      ...estimate,
      analyzedDurationSec: prepared.analyzedDurationSec,
      audioDurationSec: audio.duration,
    };
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('The audio track could not be decoded for BPM analysis.');
  } finally {
    void context.close();
  }
}
