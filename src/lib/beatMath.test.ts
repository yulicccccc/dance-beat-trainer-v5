import { describe, expect, it } from 'vitest';
import {
  anchorForCurrentCount,
  beatIndexAt,
  beatIntervalSec,
  countForBeat,
  getLoopWindow,
  makeBeatRail,
} from './beatMath';

describe('beat math', () => {
  it('converts BPM to seconds', () => {
    expect(beatIntervalSec(120)).toBeCloseTo(0.5);
  });

  it('keeps counts in 1–8, including negative indices', () => {
    expect(countForBeat(0)).toBe(1);
    expect(countForBeat(7)).toBe(8);
    expect(countForBeat(8)).toBe(1);
    expect(countForBeat(-1)).toBe(8);
  });

  it('anchors the current media time to a selected count', () => {
    expect(anchorForCurrentCount(10, 5, 120)).toBeCloseTo(8);
    expect(beatIndexAt(10, 8, 120)).toBe(4);
  });

  it('builds a centered rolling rail', () => {
    const rail = makeBeatRail(4, 0, 120, 2, 2);
    expect(rail).toHaveLength(5);
    expect(rail.filter(item => item.isCurrent)).toHaveLength(1);
    expect(rail.find(item => item.isCurrent)?.count).toBe(1);
  });

  it('creates smart loop windows with optional connection beats', () => {
    const plain = getLoopWindow('1-4', 1.1, 0, 120, false, 30);
    const connected = getLoopWindow('1-4', 1.1, 0, 120, true, 30);
    expect(plain).toEqual({ startSec: 0, endSec: 2, label: '当前 1–4' });
    expect(connected?.startSec).toBe(0);
    expect(connected?.endSec).toBe(2.5);
  });
});
