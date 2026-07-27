import { useCallback, useMemo, useRef, useState } from 'react';
import {
  MAX_SCALE,
  MIN_SCALE,
  centroid,
  clamp,
  distance,
  pinchTransform,
  type Point,
  type ViewTransform,
} from '../lib/gestureMath';

type GestureStart = {
  transform: ViewTransform;
  distance: number;
  centroid: Point;
  stageCenter: Point;
};

type DragStart = {
  pointer: Point;
  transform: ViewTransform;
};

const INITIAL_TRANSFORM: ViewTransform = { scale: 1, panX: 0, panY: 0 };

export function useVideoTransform() {
  const [transform, setTransformState] = useState<ViewTransform>(INITIAL_TRANSFORM);
  const transformRef = useRef<ViewTransform>(INITIAL_TRANSFORM);
  const [adjustMode, setAdjustMode] = useState(false);
  const adjustModeRef = useRef(false);
  const points = useRef(new Map<number, Point>());
  const gestureStart = useRef<GestureStart | null>(null);
  const dragStart = useRef<DragStart | null>(null);

  const setTransform = useCallback((next: ViewTransform | ((current: ViewTransform) => ViewTransform)) => {
    setTransformState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      transformRef.current = resolved;
      return resolved;
    });
  }, []);

  const setAdjustModeSafe = useCallback((next: boolean) => {
    adjustModeRef.current = next;
    setAdjustMode(next);
  }, []);

  const clearGesture = useCallback(() => {
    gestureStart.current = null;
    dragStart.current = null;
  }, []);

  const handlers = useMemo(() => ({
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      event.currentTarget.setPointerCapture(event.pointerId);
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const active = [...points.current.values()];
      if (active.length === 2) {
        setAdjustModeSafe(true);
        const rect = event.currentTarget.getBoundingClientRect();
        gestureStart.current = {
          transform: transformRef.current,
          distance: Math.max(1, distance(active[0], active[1])),
          centroid: centroid(active[0], active[1]),
          stageCenter: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          },
        };
        dragStart.current = null;
      } else if (active.length === 1 && adjustModeRef.current) {
        dragStart.current = { pointer: active[0], transform: transformRef.current };
      }
    },

    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      if (!points.current.has(event.pointerId)) return;
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const active = [...points.current.values()];

      if (active.length === 2 && gestureStart.current) {
        event.preventDefault();
        const start = gestureStart.current;
        setTransform(pinchTransform({
          startTransform: start.transform,
          startDistance: start.distance,
          startCentroid: start.centroid,
          currentDistance: Math.max(1, distance(active[0], active[1])),
          currentCentroid: centroid(active[0], active[1]),
          stageCenter: start.stageCenter,
        }));
        return;
      }

      if (active.length === 1 && adjustModeRef.current && dragStart.current) {
        event.preventDefault();
        const current = active[0];
        setTransform({
          ...dragStart.current.transform,
          panX: dragStart.current.transform.panX + current.x - dragStart.current.pointer.x,
          panY: dragStart.current.transform.panY + current.y - dragStart.current.pointer.y,
        });
      }
    },

    onPointerUp(event: React.PointerEvent<HTMLElement>) {
      points.current.delete(event.pointerId);
      clearGesture();

      const remaining = [...points.current.values()];
      if (remaining.length === 1 && adjustModeRef.current) {
        dragStart.current = { pointer: remaining[0], transform: transformRef.current };
      }
    },

    onPointerCancel(event: React.PointerEvent<HTMLElement>) {
      points.current.delete(event.pointerId);
      clearGesture();
    },

    onLostPointerCapture(event: React.PointerEvent<HTMLElement>) {
      points.current.delete(event.pointerId);
      if (points.current.size === 0) clearGesture();
    },
  }), [clearGesture, setAdjustModeSafe, setTransform]);

  return {
    transform,
    adjustMode,
    setAdjustMode: setAdjustModeSafe,
    setScale: (scale: number) => setTransform((current) => ({
      ...current,
      scale: clamp(scale, MIN_SCALE, MAX_SCALE),
    })),
    center: () => setTransform((current) => ({ ...current, panX: 0, panY: 0 })),
    reset: () => setTransform(INITIAL_TRANSFORM),
    handlers,
  };
}
