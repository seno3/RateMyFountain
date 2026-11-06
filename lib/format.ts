// Small display helpers. Pure functions, unit tested.

/** Floors sort as: basement, ground, then numbers ascending. */
export function compareFloors(a: string, b: string): number {
  return floorRank(a) - floorRank(b);
}

function floorRank(floor: string): number {
  if (floor === "B") return -2;
  if (floor === "G") return -1;
  const n = Number(floor);
  return Number.isFinite(n) ? n : 1000;
}

export function floorLabel(floor: string): string {
  if (floor === "B") return "Basement";
  if (floor === "G") return "Ground floor";
  return `Floor ${floor}`;
}

/** "today", "yesterday", "3 days ago". */
export function daysAgo(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
