import { describe, expect, it } from 'vitest';
import { pinchTransform } from './gestureMath';

describe('pinchTransform', () => {
  it('scales from 1x to 2x while keeping the finger anchor stable', () => {
    const result = pinchTransform({
      startTransform: { scale: 1, panX: 0, panY: 0 },
      startDistance: 100,
      startCentroid: { x: 250, y: 300 },
      currentDistance: 200,
      currentCentroid: { x: 250, y: 300 },
      stageCenter: { x: 200, y: 300 },
    });

    expect(result.scale).toBe(2);
    expect(result.panX).toBe(-50);
    expect(result.panY).toBe(0);
  });

  it('adds centroid movement while pinching', () => {
    const result = pinchTransform({
      startTransform: { scale: 1, panX: 0, panY: 0 },
      startDistance: 100,
      startCentroid: { x: 200, y: 300 },
      currentDistance: 100,
      currentCentroid: { x: 240, y: 325 },
      stageCenter: { x: 200, y: 300 },
    });

    expect(result).toEqual({ scale: 1, panX: 40, panY: 25 });
  });
});
