import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";
import type { Database } from "./supabase/database.types";
import type { Tag } from "./scoring";

// Public read queries. Each one is cached for a few minutes and tagged "fountains",
// so phase 2 can call updateTag("fountains") after a write and readers see it at once.

export type Building = Database["public"]["Tables"]["buildings"]["Row"];
type FountainScoreRow = Database["public"]["Views"]["fountain_scores"]["Row"];
export type PublicRating = Database["public"]["Views"]["public_ratings"]["Row"];

export type TagCount = { tag: Tag; count: number };

/** A fountain plus its scores. Views make every column nullable in generated types; we narrow here. */
export type FountainScore = Omit<
  FountainScoreRow,
  "fountain_id" | "short_code" | "building_code" | "floor" | "location_note" | "rating_count" | "top_tags" | "is_broken" | "verified" | "has_bottle_filler" | "bottle_filler_count"
> & {
  fountain_id: string;
  short_code: string;
  building_code: string;
  floor: string;
  location_note: string;
  rating_count: number;
  top_tags: TagCount[];
  is_broken: boolean;
  verified: boolean;
  has_bottle_filler: boolean;
  bottle_filler_count: number;
};

function toFountainScore(row: FountainScoreRow): FountainScore {
  return {
    ...row,
    fountain_id: row.fountain_id!,
    short_code: row.short_code!,
    building_code: row.building_code!,
    floor: row.floor!,
    location_note: row.location_note!,
    rating_count: row.rating_count ?? 0,
    top_tags: (row.top_tags ?? []) as TagCount[],
    is_broken: row.is_broken ?? false,
    verified: row.verified ?? false,
    has_bottle_filler: row.has_bottle_filler ?? false,
    bottle_filler_count: row.bottle_filler_count ?? 0,
  };
}

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Supabase query failed: ${result.error.message}`);
  return result.data as T;
}

export async function getBuildings(): Promise<Building[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("buildings");
  const supabase = createPublicClient();
  return check(await supabase.from("buildings").select("*").order("name"));
}

export async function getBuilding(code: string): Promise<Building | null> {
  const buildings = await getBuildings();
  return buildings.find((b) => b.code === code) ?? null;
}

/**
 * Every visible fountain with scores. Campus has a few hundred fountains at most,
 * so we load them all once (cached) and search/sort in memory. See docs/DECISIONS.md.
 */
export async function getAllFountains(): Promise<FountainScore[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("fountains");
  const supabase = createPublicClient();
  const rows = check(await supabase.from("fountain_scores").select("*").order("short_code"));
  return rows.map(toFountainScore);
}

export async function getFountainsInBuilding(code: string): Promise<FountainScore[]> {
  const all = await getAllFountains();
  return all.filter((f) => f.building_code === code);
}

export async function getFountain(shortCode: string): Promise<FountainScore | null> {
  const all = await getAllFountains();
  return all.find((f) => f.short_code === shortCode) ?? null;
}

export async function getRecentRatings(fountainId: string, limit = 5): Promise<PublicRating[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("fountains");
  const supabase = createPublicClient();
  return check(
    await supabase
      .from("public_ratings")
      .select("*")
      .eq("fountain_id", fountainId)
      .order("updated_at", { ascending: false })
      .limit(limit),
  );
}
