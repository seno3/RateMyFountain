// Both values are public (they ship to the browser). Security comes from RLS, not from hiding these.
export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

// Next.js only inlines NEXT_PUBLIC_ vars when written out literally (process.env.NAME),
// so each one is passed in rather than looked up by name.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var ${name}. Copy .env.example to .env.local.`);
  return value;
}
