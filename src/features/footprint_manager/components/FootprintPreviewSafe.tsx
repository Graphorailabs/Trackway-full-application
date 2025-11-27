import type { FootprintMetadata } from "../types";

type Props = { meta: FootprintMetadata | null };

// Minimal safe preview component — temporary fallback to restore page access.
export default function FootprintPreview({ meta }: Props) {
  if (!meta) return <div className="p-6 text-sm text-slate-400">No footprint selected</div>;
  return (
    <div className="p-6">
      <div className="text-sm text-slate-300">Footprint preview is temporarily unavailable. The preview component has been simplified to fix a syntax error; I'll restore full rendering next.</div>
      <div className="mt-3 text-xs text-slate-400">Name: {meta.name}</div>
    </div>
  );
}
