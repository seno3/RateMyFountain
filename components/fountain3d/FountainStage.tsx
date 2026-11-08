"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

// three.js needs the browser, so the scene loads client-side only, in its own chunk.
const FountainCanvas = dynamic(() => import("./FountainCanvas"), { ssr: false });

export type StageStats = {
  fountains: number;
  buildings: number;
  ratings: number;
  means: { temperature: string; flow: string; trajectory: string; taste: string };
  best: { code: string; score: string; place: string } | null;
};

// Opacity that fades in over [a, b] and out over [c, d] of scroll progress, computed by CSS from --p.
function fade(a: number, b: number, c: number, d: number): CSSProperties {
  return {
    opacity: `clamp(0, min(calc((var(--p) - ${a}) / ${b - a}), calc((${d} - var(--p)) / ${d - c})), 1)`,
  };
}

/**
 * The pinned scroll sequence on the home page. Scroll progress (0..1) is written to --p on the
 * stage, which drives the DOM overlays in CSS and the 3D scene in JS.
 */
export function FountainStage({ stats }: { stats: StageStats }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current!;
    const stage = stageRef.current!;
    const readout = stage.querySelector<HTMLElement>("[data-readout]");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const p = Math.min(Math.max(-rect.top / (rect.height - window.innerHeight), 0), 1);
      progressRef.current = p;
      stage.style.setProperty("--p", p.toFixed(4));
      if (readout) readout.textContent = p.toFixed(3);
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

  const { means } = stats;

  return (
    <div ref={trackRef} className="relative left-1/2 -mt-6 h-[520svh] w-screen -translate-x-1/2">
      <div
        ref={stageRef}
        className="sticky top-0 h-svh overflow-hidden bg-black text-white select-none"
        style={{ "--p": 0 } as CSSProperties}
      >
        {/* Plate 0: the wordmark sits behind the model */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pb-[6svh]"
          style={fade(-1, -0.5, 0.08, 0.16)}
        >
          <span className="font-serif text-[clamp(5.5rem,21vw,21rem)] leading-none tracking-[-0.04em] text-white/95 italic">
            Fountains
          </span>
        </div>

        <FountainCanvas stageRef={stageRef} progressRef={progressRef} />

        {/* Exploded-view annotations: positioned on their parts by the scene */}
        <Annotation part="bubbler" anchor="-0.296,2.27,0" n="01" title="Bubbler">
          <Note>Sets the arc. Decides whether you drink or get hit in the eye.</Note>
          <Metric label="Trajectory" value={means.trajectory} />
        </Annotation>
        <Annotation part="guard" anchor="-0.35,2.31,0" n="02" title="Guard">
          <Note>Keeps lips off the nozzle. Mostly.</Note>
        </Annotation>
        <Annotation part="button" anchor="0,2.17,0.53" n="03" title="Actuator">
          <Note>One push. Pressure varies by building, floor, and mood.</Note>
          <Metric label="Flow" value={means.flow} />
        </Annotation>
        <Annotation part="drain" anchor="0.05,2.1,0" n="04" title="Strainer">
          <Note>Where taste goes to be judged.</Note>
          <Metric label="Taste" value={means.taste} />
        </Annotation>
        <Annotation part="panel" anchor="0.1,1.2,0.17" n="05" title="Access panel">
          <Note>Behind it, a chiller. Allegedly.</Note>
          <Metric label="Temperature" value={means.temperature} />
        </Annotation>
        <Annotation part="base" anchor="0.3,0.05,0.2" n="06" title="Floor flange">
          <Note>Four bolts. {stats.buildings} buildings surveyed so far.</Note>
        </Annotation>

        {/* Plate 0 copy */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-16 sm:px-10 sm:pb-12" style={fade(-1, -0.5, 0.06, 0.13)}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-sm font-serif text-xl leading-snug text-white/85 sm:text-2xl">
              A field guide to every drinking fountain at Purdue, measured by the people who drink from them.
            </p>
            <p className="font-mono text-[11px] leading-relaxed tracking-[0.18em] text-white/45 uppercase sm:text-right">
              Fig. 0 — Pedestal fountain, stainless
              <br />
              Scroll to disassemble
            </p>
          </div>
        </div>

        {/* Plate 1 caption */}
        <div className="pointer-events-none absolute top-20 left-5 sm:top-24 sm:left-10" style={fade(0.2, 0.26, 0.52, 0.58)}>
          <p className="font-mono text-[11px] tracking-[0.18em] text-white/45 uppercase">Fig. 1 — Exploded view</p>
          <p className="mt-2 font-serif text-3xl text-white/90 italic sm:text-4xl">Six parts. Four opinions.</p>
        </div>

        {/* Plate 2: water on, the numbers */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-10 sm:inset-y-0 sm:right-auto sm:flex sm:w-1/2 sm:flex-col sm:justify-center sm:px-10 sm:pb-0"
          style={fade(0.68, 0.74, 0.86, 0.9)}
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-white/45 uppercase">Fig. 2 — In operation</p>
          <dl className="mt-5 grid grid-cols-3 gap-4 sm:mt-8 sm:grid-cols-1 sm:gap-5">
            {(
              [
                [stats.fountains, "fountains catalogued"],
                [stats.ratings, "ratings filed"],
                [stats.buildings, "buildings surveyed"],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                <dd className="font-serif text-5xl leading-none tabular-nums sm:text-7xl">{value}</dd>
                <dt className="mt-1 font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase sm:mt-0 sm:text-[11px]">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
          {stats.best && (
            <Link
              href={`/f/${stats.best.code}`}
              className="pointer-events-auto mt-6 inline-flex max-w-max items-baseline gap-3 border-b border-white/30 pb-1 font-mono text-xs tracking-wide text-white/80 transition-colors hover:border-white hover:text-white sm:mt-10"
            >
              Current best: {stats.best.code} · {stats.best.score}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {/* Plate 3: hand-off to the index */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-12" style={fade(0.9, 0.97, 2, 3)}>
          <a href="#index" className="group flex flex-col items-center gap-2 text-center">
            <span className="font-mono text-[11px] tracking-[0.18em] text-white/45 uppercase">Continue to</span>
            <span className="font-serif text-5xl italic transition-transform group-hover:translate-y-1 sm:text-6xl">
              The Index ↓
            </span>
          </a>
        </div>

        <Hud />

        {/* Film grain and vignette */}
        <div aria-hidden="true" className="grain pointer-events-none absolute -inset-[50%] opacity-[0.07]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.65))]"
        />
      </div>
    </div>
  );
}

function Hud() {
  return (
    <>
      <nav
        aria-label="Main"
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 font-mono text-[11px] tracking-[0.18em] uppercase sm:px-10"
      >
        <Link href="/" className="text-white">
          Boiler Fountains
        </Link>
        <div className="flex gap-5 text-white/55">
          <a href="#index" className="transition-colors hover:text-white">
            Index
          </a>
          <Link href="/?view=map" className="transition-colors hover:text-white">
            Map
          </Link>
          <Link href="/about" className="transition-colors hover:text-white">
            About
          </Link>
        </div>
      </nav>

      {/* Progress ruler */}
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 right-5 hidden h-[44svh] -translate-y-1/2 sm:right-10 sm:block">
        <div className="relative flex h-full w-3 flex-col justify-between">
          {Array.from({ length: 41 }, (_, i) => (
            <span key={i} className={`block h-px bg-white/30 ${i % 10 === 0 ? "w-3" : "ml-auto w-1.5"}`} />
          ))}
          <span
            className="absolute -left-2 h-px w-5 bg-white"
            style={{ top: "calc(var(--p) * 100%)" }}
          />
        </div>
        <p className="absolute top-full right-0 mt-3 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-white/50 tabular-nums">
          P <span data-readout>0.000</span>
        </p>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap text-white/30 uppercase lg:block"
      >
        40.4237° N &nbsp; 86.9212° W
      </p>
    </>
  );
}

function Annotation({
  part,
  anchor,
  n,
  title,
  children,
}: {
  part: string;
  anchor: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      data-part={part}
      data-anchor={anchor}
      data-side="right"
      className="group pointer-events-none absolute top-0 left-0 z-[5] opacity-0 will-change-transform"
    >
      <div className="flex -translate-y-1/2 items-center group-data-[side=left]:-translate-x-full group-data-[side=left]:flex-row-reverse">
        <span className="size-1.5 shrink-0 rounded-full bg-white ring-4 ring-white/15" />
        <span
          className="h-px w-(--line,64px) shrink-0 origin-left bg-white/60 group-data-[side=left]:origin-right"
          style={{ transform: "scaleX(var(--reveal, 0))" }}
        />
        <div className="w-36 pl-3 group-data-[side=left]:pr-3 group-data-[side=left]:pl-0 group-data-[side=left]:text-right sm:w-56">
          <p className="font-mono text-[10px] tracking-[0.18em] text-white uppercase">
            {n} — {title}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 hidden font-serif text-[15px] leading-snug text-white/75 italic sm:block">{children}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-white/45 uppercase tabular-nums">
      {label} · campus {value}/5
    </p>
  );
}
