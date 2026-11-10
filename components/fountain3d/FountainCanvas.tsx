"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createFountainScene } from "./scene";

export default function FountainCanvas({
  stageRef,
  progressRef,
  counter,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  progressRef: RefObject<number>;
  /** Shown on the bottle filler's "bottles saved" display. */
  counter: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const root = stageRef.current;
    if (!canvas || !root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: ReturnType<typeof createFountainScene> | undefined;
    try {
      scene = createFountainScene(canvas, { reducedMotion, root, counter, getProgress: () => progressRef.current });
      requestAnimationFrame(() => setReady(true));
    } catch {
      // No WebGL: the stage's text plates still work on their own.
    }
    return () => scene?.dispose();
  }, [stageRef, progressRef, counter]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 size-full cursor-grab touch-pan-y transition-opacity duration-[1500ms] active:cursor-grabbing ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
