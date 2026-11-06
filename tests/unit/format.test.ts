import { describe, expect, it } from "vitest";
import { compareFloors, daysAgo, floorLabel, pluralize } from "../../lib/format";

describe("compareFloors", () => {
  it("orders basement, ground, then numbers", () => {
    expect(["3", "G", "1", "B", "10", "2"].sort(compareFloors)).toEqual(["B", "G", "1", "2", "3", "10"]);
  });
});

describe("floorLabel", () => {
  it("names special floors", () => {
    expect(floorLabel("B")).toBe("Basement");
    expect(floorLabel("G")).toBe("Ground floor");
    expect(floorLabel("2")).toBe("Floor 2");
  });
});

describe("daysAgo", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  it("says today, yesterday, or N days ago", () => {
    expect(daysAgo("2026-11-06T08:00:00Z", now)).toBe("today");
    expect(daysAgo("2026-11-05T08:00:00Z", now)).toBe("yesterday");
    expect(daysAgo("2026-11-01T12:00:00Z", now)).toBe("5 days ago");
  });
});

describe("pluralize", () => {
  it("adds an s except for one", () => {
    expect(pluralize(1, "rating")).toBe("1 rating");
    expect(pluralize(0, "rating")).toBe("0 ratings");
  });
});
