"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  getVersion,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapBuilding } from "@/lib/map";
import { floorLabel, pluralize } from "@/lib/format";
import { formatScore, scoreTone, type ScoreTone } from "@/lib/scoring";
import { ScoreBadge } from "@/components/ScoreBadge";

// Vector map rendered with MapLibre GL (the open-source fork of Mapbox GL JS).
// Base maps come from OpenFreeMap (free, no key). Setting NEXT_PUBLIC_MAPBOX_TOKEN
// adds a Mapbox satellite view.

const CAMPUS_CENTER: [number, number] = [-86.9165, 40.4275];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const STORAGE_KEY = "bf:map-style";

// Served from public/ (see scripts/copy-map-worker.mjs). The version busts the cache on upgrades.
setWorkerUrl(`/maplibre/maplibre-gl-worker.mjs?v=${getVersion()}`);

type StyleKey = "light" | "dark" | "3d" | "satellite";

const STYLE_LABELS: Record<StyleKey, string> = {
  light: "Light",
  dark: "Dark",
  "3d": "3D",
  satellite: "Satellite",
};

function availableStyles(): StyleKey[] {
  return MAPBOX_TOKEN ? ["light", "dark", "3d", "satellite"] : ["light", "dark", "3d"];
}

function styleFor(key: StyleKey): string | StyleSpecification {
  switch (key) {
    case "light":
      return "https://tiles.openfreemap.org/styles/positron";
    case "dark":
      return "https://tiles.openfreemap.org/styles/dark";
    case "3d":
      return "https://tiles.openfreemap.org/styles/liberty"; // includes extruded buildings
    case "satellite":
      return {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
            ],
            tileSize: 512,
            maxzoom: 22,
            attribution:
              '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
      };
  }
}

function cameraFor(key: StyleKey) {
  return key === "3d" ? { pitch: 60, bearing: -20 } : { pitch: 0, bearing: 0 };
}

function initialStyle(): StyleKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as StyleKey | null;
    if (saved && availableStyles().includes(saved)) return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Fixed pin colors (not theme tokens): pins sit on the map, not on the page background.
const PIN_COLORS: Record<ScoreTone, string> = {
  good: "bg-[#15803d] text-white",
  okay: "bg-[#cfb991] text-[#111113]",
  poor: "bg-[#b91c1c] text-white",
  none: "bg-[#52525b] text-white",
};

export default function FountainMap({ buildings, hiddenCount }: { buildings: MapBuilding[]; hiddenCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLElement }>());
  const [styleKey, setStyleKey] = useState<StyleKey>(initialStyle);
  const [selected, setSelected] = useState<string | null>(null);
  const firstStyle = useRef(styleKey);

  // Create the map once.
  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: styleFor(firstStyle.current),
      center: CAMPUS_CENTER,
      zoom: 15.2,
      ...cameraFor(firstStyle.current),
      attributionControl: { compact: true },
      maxPitch: 70,
    });
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      "top-right",
    );
    map.on("click", (e) => {
      // A click on the map itself (not a pin) closes the panel.
      if (!(e.originalEvent.target as HTMLElement).closest("[data-pin]")) setSelected(null);
    });
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pins. Rebuilt when the building list changes (e.g. after a search).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;

    for (const b of buildings) {
      const tone = scoreTone(b.best);
      const hasFountains = b.fountains.length > 0;
      const el = document.createElement("div");
      el.dataset.pin = b.code;

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-label",
        `${b.name}: ${hasFountains ? `${pluralize(b.fountains.length, "fountain")}, best ${b.best == null ? "unrated" : `${formatScore(b.best)} out of 5`}` : "no fountains yet"}`,
      );
      button.className = hasFountains
        ? `flex h-8 min-w-11 cursor-pointer items-center justify-center rounded-full px-2.5 text-[13px] font-semibold tabular-nums shadow-[0_4px_14px_rgb(0_0_0/0.35)] ring-2 ring-white transition-transform duration-200 hover:scale-110 data-[selected=true]:scale-125 ${PIN_COLORS[tone]}`
        : "size-3.5 cursor-pointer rounded-full bg-[#71717a] ring-2 ring-white shadow-md transition-transform hover:scale-125 data-[selected=true]:scale-150";
      button.textContent = hasFountains ? formatScore(b.best) : "";
      button.addEventListener("click", () => setSelected(b.code));
      el.appendChild(button);

      const marker = new Marker({ element: el, anchor: "center" }).setLngLat([b.lng, b.lat]).addTo(map);
      markers.set(b.code, { marker, el });
    }

    if (buildings.length > 1) {
      const bounds = new LngLatBounds();
      buildings.forEach((b) => bounds.extend([b.lng, b.lat]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 16.5, duration: 0 });
    } else if (buildings.length === 1) {
      map.jumpTo({ center: [buildings[0].lng, buildings[0].lat], zoom: 17 });
    }

    return () => {
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
    };
  }, [buildings]);

  // Switch base map. Pins are DOM elements, so they survive a style change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleKey === firstStyle.current) return;
    firstStyle.current = styleKey;
    map.setStyle(styleFor(styleKey));
    map.easeTo({ ...cameraFor(styleKey), duration: 900 });
    try {
      localStorage.setItem(STORAGE_KEY, styleKey);
    } catch {}
  }, [styleKey]);

  // Highlight and fly to the selected building.
  useEffect(() => {
    markersRef.current.forEach(({ el }, code) => {
      const isSelected = code === selected;
      el.style.zIndex = isSelected ? "2" : "";
      el.firstElementChild?.setAttribute("data-selected", String(isSelected));
    });
    const b = buildings.find((x) => x.code === selected);
    if (b && mapRef.current) {
      mapRef.current.flyTo({ center: [b.lng, b.lat], zoom: Math.max(mapRef.current.getZoom(), 16.5), duration: 800 });
    }
  }, [selected, buildings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const building = buildings.find((b) => b.code === selected);

  return (
    <div className="relative h-full w-full">
      {/* Sized with h/w, not inset: MapLibre's CSS forces position: relative on this element. */}
      <div ref={containerRef} className="h-full w-full" />

      <div
        role="radiogroup"
        aria-label="Map style"
        className="absolute top-3 left-3 z-10 flex gap-0.5 rounded-full border border-line bg-surface/85 p-1 shadow-float backdrop-blur-xl"
      >
        {availableStyles().map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={styleKey === key}
            onClick={() => setStyleKey(key)}
            className={`min-h-9 rounded-full px-3 text-xs font-medium transition-colors ${
              styleKey === key ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {STYLE_LABELS[key]}
          </button>
        ))}
      </div>

      {building ? (
        <section
          aria-label={building.name}
          className="absolute inset-x-3 bottom-3 z-10 max-h-[60%] animate-rise overflow-y-auto rounded-2xl border border-line bg-surface/90 p-4 shadow-float backdrop-blur-xl sm:top-16 sm:right-auto sm:bottom-auto sm:w-80 sm:max-h-[calc(100%-5rem)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted">{building.code}</p>
              <h2 className="font-semibold leading-snug">{building.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-track hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {building.fountains.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No fountains here yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {building.fountains.map((f) => (
                <li key={f.short_code}>
                  <Link
                    href={`/f/${f.short_code}`}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-track"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold">
                        {f.short_code}
                        {f.is_broken && <span className="ml-2 font-sans text-xs font-normal text-warning">Broken</span>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {floorLabel(f.floor)} · {f.location_note}
                      </p>
                    </div>
                    <ScoreBadge score={f.overall_mean} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/b/${building.code}`}
            className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
          >
            View building
          </Link>
        </section>
      ) : (
        <div className="absolute bottom-3 left-3 z-10 rounded-2xl border border-line bg-surface/85 px-3 py-2 text-xs shadow-float backdrop-blur-xl">
          <p className="mb-1.5 font-medium">Best fountain in building</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {(
              [
                ["good", "4 and up"],
                ["okay", "3 – 3.9"],
                ["poor", "Under 3"],
                ["none", "Unrated"],
              ] as const
            ).map(([tone, label]) => (
              <li key={tone} className="flex items-center gap-1.5 text-muted">
                <span className={`size-2.5 rounded-full ring-1 ring-white/70 ${PIN_COLORS[tone]}`} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <p className="mt-1.5 text-muted">{pluralize(hiddenCount, "building")} not on the map yet</p>
          )}
        </div>
      )}
    </div>
  );
}
