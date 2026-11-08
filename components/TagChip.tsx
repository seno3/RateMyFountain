import { TAG_LABELS, type Tag } from "@/lib/scoring";

// Read-only tag chip. Phase 2 adds a toggleable version for the rating form.
export function TagChip({ tag, count }: { tag: Tag; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm">
      {TAG_LABELS[tag]}
      {count != null && <span className="font-mono text-xs text-muted tabular-nums">×{count}</span>}
    </span>
  );
}
