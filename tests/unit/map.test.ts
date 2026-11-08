import { describe, expect, it } from "vitest";
import { buildMapBuildings, hasLocation } from "../../lib/map";

const fountain = (building_code: string, short_code: string, overall_mean: number | null, rating_count: number) => ({
  building_code,
  short_code,
  floor: "1",
  location_note: "by the stairs",
  overall_mean,
  rating_count,
  is_broken: false,
});

describe("buildMapBuildings", () => {
  const buildings = [
    { code: "LWSN", name: "Lawson", lat: 40.4278, lng: -86.917 },
    { code: "PMU", name: "Union", lat: 0, lng: 0 },
    { code: "HAAS", name: "Haas", lat: 40.4268, lng: -86.9163 },
  ];

  it("drops buildings without a location", () => {
    expect(buildMapBuildings(buildings, []).map((b) => b.code)).toEqual(["LWSN", "HAAS"]);
  });

  it("groups fountains, sorts best first, and takes the best rated score", () => {
    const [lwsn, haas] = buildMapBuildings(buildings, [
      fountain("LWSN", "LWSN-1A", 3.5, 4),
      fountain("LWSN", "LWSN-2A", 4.25, 2),
      fountain("LWSN", "LWSN-3A", null, 0),
      fountain("PMU", "PMU-1A", 5, 1),
    ]);
    expect(lwsn.fountains.map((f) => f.short_code)).toEqual(["LWSN-2A", "LWSN-1A", "LWSN-3A"]);
    expect(lwsn.best).toBe(4.25);
    expect(haas.best).toBeNull();
    expect(haas.fountains).toEqual([]);
  });
});

describe("hasLocation", () => {
  it("treats (0, 0) as missing", () => {
    expect(hasLocation({ lat: 0, lng: 0 })).toBe(false);
    expect(hasLocation({ lat: 40.4, lng: -86.9 })).toBe(true);
  });
});
