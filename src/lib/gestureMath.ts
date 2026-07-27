export type Point = { x: number; y: number };
export type ViewTransform = { scale: number; panX: number; panY: number };

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 6;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function centroid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function pinchTransform(args: {
  startTransform: ViewTransform;
  startDistance: number;
  startCentroid: Point;
  currentDistance: number;
  currentCentroid: Point;
  stageCenter: Point;
}): ViewTransform {
  const {
    startTransform,
    startDistance,
    startCentroid,
    currentDistance,
    currentCentroid,
    stageCenter,
  } = args;

  const nextScale = clamp(
    startTransform.scale * (currentDistance / Math.max(1, startDistance)),
    MIN_SCALE,
    MAX_SCALE,
  );

  const contentX = (startCentroid.x - stageCenter.x - startTransform.panX) / startTransform.scale;
  const contentY = (startCentroid.y - stageCenter.y - startTransform.panY) / startTransform.scale;

  return {
    scale: nextScale,
    panX: currentCentroid.x - stageCenter.x - contentX * nextScale,
    panY: currentCentroid.y - stageCenter.y - contentY * nextScale,
  };
}
