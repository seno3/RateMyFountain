import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// A Supabase client with no user session, for public reads in Server Components.
// Because it never touches cookies, its results can be cached ('use cache') and shared
// by every visitor. Anything user-specific goes through ./server.ts instead.
export function createPublicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
