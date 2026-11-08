import type { ReactNode } from "react";

const tones = {
  warning: "border-warning-line bg-warning-bg",
  info: "border-line bg-surface",
} as const;

export function Banner({ tone = "info", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}
