// Turns buildings + fountains into map pins. Pure, unit tested, and safe to pass to a Client Component.

export type MapFountain = {
  short_code: string;
  floor: string;
  location_note: string;
  overall_mean: number | null;
  rating_count: number;
  is_broken: boolean;
};

export type MapBuilding = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  /** Best overall score among this building's rated fountains; null if none are rated. */
  best: number | null;
  fountains: MapFountain[];
};

type BuildingInput = { code: string; name: string; lat: number; lng: number };
type FountainInput = MapFountain & { building_code: string };

/** Seed placeholders are (0, 0). Treat them as "no location yet". */
export function hasLocation(b: { lat: number; lng: number }): boolean {
  return !(b.lat === 0 && b.lng === 0);
}

export function buildMapBuildings(buildings: BuildingInput[], fountains: FountainInput[]): MapBuilding[] {
  const byBuilding = new Map<string, MapFountain[]>();
  for (const f of fountains) {
    const list = byBuilding.get(f.building_code) ?? [];
    list.push({
      short_code: f.short_code,
      floor: f.floor,
      location_note: f.location_note,
      overall_mean: f.overall_mean,
      rating_count: f.rating_count,
      is_broken: f.is_broken,
    });
    byBuilding.set(f.building_code, list);
  }

  return buildings.filter(hasLocation).map((b) => {
    const list = (byBuilding.get(b.code) ?? []).sort((x, y) => (y.overall_mean ?? -1) - (x.overall_mean ?? -1));
    const rated = list.filter((f) => f.rating_count > 0 && f.overall_mean != null);
    return {
      code: b.code,
      name: b.name,
      lat: b.lat,
      lng: b.lng,
      best: rated.length ? Math.max(...rated.map((f) => f.overall_mean!)) : null,
      fountains: list,
    };
  });
}
