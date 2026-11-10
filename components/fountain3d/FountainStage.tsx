"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

// three.js needs the browser, so the scene loads client-side only, in its own chunk.
const FountainCanvas = dynamic(() => import("./FountainCanvas"), { ssr: false });

/**
 * Home page: the fountain, pinned while you scroll past it. Scroll progress (0..1) turns the model
 * and fades the copy (via the --p CSS variable).
 */
export function FountainStage({ ratings }: { ratings: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current!;
    const stage = stageRef.current!;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const p = Math.min(Math.max(-rect.top / Math.max(rect.height - window.innerHeight, 1), 0), 1);
      progressRef.current = p;
      stage.style.setProperty("--p", p.toFixed(4));
    };
    const schedule = () => (frame ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={trackRef} className="relative left-1/2 -mt-6 -mb-16 h-[200svh] w-screen -translate-x-1/2">
      <div
        ref={stageRef}
        className="sticky top-0 h-svh overflow-hidden bg-black text-white"
        style={{ "--p": 0 } as CSSProperties}
      >
        <FountainCanvas stageRef={stageRef} progressRef={progressRef} counter={ratings} />

        {/* The wordmark sits in front of the fountain and drifts up as you scroll. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[4svh] select-none"
          style={{ transform: "translateY(calc(var(--p) * -6svh))", opacity: "calc(1 - var(--p) * 0.6)" }}
        >
          <span className="font-serif text-[clamp(5.5rem,21vw,21rem)] leading-none tracking-[-0.04em] text-white/95 italic [text-shadow:0_0_60px_rgb(0_0_0/0.55),0_2px_18px_rgb(0_0_0/0.35)]">
            Fountains
          </span>
        </div>


        <nav
          aria-label="Main"
          className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 font-mono text-[11px] tracking-[0.18em] uppercase sm:px-10"
        >
          <Link href="/">Boiler Fountains</Link>
          <div className="flex gap-5 text-white/55">
            <Link href="/fountains" className="transition-colors hover:text-white">
              Ratings
            </Link>
            <Link href="/fountains?view=map" className="transition-colors hover:text-white">
              Map
            </Link>
            <Link href="/about" className="transition-colors hover:text-white">
              About
            </Link>
          </div>
        </nav>

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-6 px-5 pb-10 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-10">
          <h1 className="max-w-sm font-serif text-xl leading-snug text-white/85 sm:text-2xl">
            Every drinking fountain at Purdue, rated by the people who drink from them.
          </h1>
          <Link
            href="/fountains"
            className="group inline-flex max-w-max items-baseline gap-3 border-b border-white/30 pb-1 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors hover:border-white"
          >
            See the ratings
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {/* Film grain and vignette */}
        <div aria-hidden="true" className="grain pointer-events-none absolute -inset-[50%] opacity-[0.06]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.6))]"
        />
      </div>
    </div>
  );
}
