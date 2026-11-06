// Proves a client with no session (just the public key) can read public data
// but cannot write anything or see private data. Needs local Supabase running.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

process.loadEnvFile(".env.local");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

// IDs from supabase/seed.dev.sql
const FOUNTAIN_ID = "10000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-00000000000a";

const WRITABLE_TABLES = ["buildings", "fountains", "ratings", "fountain_confirmations", "reports", "admins"] as const;

const sampleRows: Record<(typeof WRITABLE_TABLES)[number], Record<string, unknown>> = {
  buildings: { code: "EVIL", name: "Evil Hall", lat: 0, lng: 0 },
  fountains: {
    short_code: "LWSN-9-Z",
    building_code: "LWSN",
    floor: "9",
    location_note: "Not real",
  },
  ratings: { fountain_id: FOUNTAIN_ID, user_id: USER_ID, temperature: 1, flow: 1, trajectory: 1, taste: 1 },
  fountain_confirmations: { fountain_id: FOUNTAIN_ID, user_id: USER_ID },
  reports: { fountain_id: FOUNTAIN_ID, user_id: USER_ID, reason: "other" },
  admins: { user_id: USER_ID },
};

describe("anonymous client (no session)", () => {
  beforeAll(async () => {
    const { error } = await supabase.from("buildings").select("code").limit(1);
    if (error) throw new Error(`Is local Supabase running? (${error.message})`);
  });

  describe("can read public data", () => {
    it.each(["buildings", "fountains", "fountain_scores", "public_ratings"])("%s", async (table) => {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });
  });

  describe("cannot insert", () => {
    it.each(WRITABLE_TABLES)("%s", async (table) => {
      const { error } = await supabase.from(table).insert(sampleRows[table]);
      expect(error?.code).toBe("42501"); // permission denied
    });
  });

  describe("cannot update", () => {
    it("buildings", async () => {
      const { error } = await supabase.from("buildings").update({ name: "Hacked" }).eq("code", "LWSN");
      expect(error?.code).toBe("42501");
    });
    it("fountains", async () => {
      const { error } = await supabase.from("fountains").update({ verified: true }).eq("id", FOUNTAIN_ID);
      expect(error?.code).toBe("42501");
    });
    it("ratings", async () => {
      const { error } = await supabase.from("ratings").update({ taste: 1 }).eq("fountain_id", FOUNTAIN_ID);
      expect(error?.code).toBe("42501");
    });
  });

  describe("cannot delete", () => {
    it.each(WRITABLE_TABLES)("%s", async (table) => {
      const { error } = await supabase.from(table).delete().not("created_at", "is", null);
      expect(error?.code).toBe("42501");
    });
  });

  describe("cannot read private data", () => {
    it.each(["ratings", "reports", "admins", "fountain_confirmations"])("%s table", async (table) => {
      const { error } = await supabase.from(table).select("*").limit(1);
      expect(error?.code).toBe("42501");
    });

    it("public_ratings has no user_id", async () => {
      const { error } = await supabase.from("public_ratings").select("user_id").limit(1);
      expect(error).not.toBeNull();
    });
  });

  it("data is unchanged after all of the above", async () => {
    const { data: building } = await supabase.from("buildings").select("name").eq("code", "LWSN").single();
    expect(building!.name).toBe("Lawson Computer Science Building");
    const { data: evil } = await supabase.from("buildings").select("code").eq("code", "EVIL");
    expect(evil).toEqual([]);
    const { data: fountains } = await supabase.from("fountain_scores").select("short_code");
    expect(fountains!.length).toBe(5);
  });
});
