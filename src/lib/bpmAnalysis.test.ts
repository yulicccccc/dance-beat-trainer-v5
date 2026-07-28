import { describe, expect, it } from 'vitest';
import { estimateTempoFromEnvelope } from './bpmAnalysis';

function pulseEnvelope(bpm: number, durationSec = 40, rate = 50) {
  const length = durationSec * rate;
  const envelope = new Array<number>(length).fill(0);
  const period = rate * 60 / bpm;
  for (let cursor = 0; cursor < length; cursor += period) {
    const index = Math.round(cursor);
    if (index < envelope.length) envelope[index] = 1;
    if (index + 1 < envelope.length) envelope[index + 1] = 0.35;
  }
  return { envelope, rate };
}

describe('estimateTempoFromEnvelope', () => {
  it('includes the true tempo for a stable 120 BPM pulse', () => {
    const sample = pulseEnvelope(120);
    const result = estimateTempoFromEnvelope(sample.envelope, sample.rate);
    expect(result.candidates.some(candidate => Math.abs(candidate.bpm - 120) <= 1)).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.25);
  });

  it('returns half/double family candidates when they fit the allowed range', () => {
    const sample = pulseEnvelope(96);
    const result = estimateTempoFromEnvelope(sample.envelope, sample.rate);
    const values = result.candidates.map(candidate => candidate.bpm);
    expect(values.some(value => Math.abs(value - result.primaryBpm) <= 0.1)).toBe(true);
    expect(values.some(value => Math.abs(value - result.primaryBpm / 2) <= 0.1)).toBe(true);
    expect(values.some(value => Math.abs(value - result.primaryBpm * 2) <= 0.1)).toBe(true);
  });

  it('rejects samples that are too short', () => {
    expect(() => estimateTempoFromEnvelope([1, 0, 1], 50)).toThrow(/too short/i);
  });
});
