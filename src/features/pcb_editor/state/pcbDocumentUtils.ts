/**
 * Utility helpers for working with Trackway PCB documents outside of React.
 *
 * These functions keep parsing, normalization, and metadata derivation logic
 * colocated and reusable by both the loader hook and the presentation layer.
 */
import type { SheetMetadata } from "@/features/pcb_editor/types";
import type { ProjectRecord } from "@/types/project";
import {
  createMinimalPcb,
  pcbJsonToValue,
  pcbSexprToValue,
  type Paper,
  type Pcb,
  type Property,
} from "trackway-parser-wasm";

export const DEFAULT_PROPERTIES: Property[] = [];

/**
 * Normalizes a raw property tuple into a lowercase lookup key and sanitized value.
 */
function normalizeProperty(entry?: Property): { key: string; entry: Property } | null {
  if (!entry) return null;
  const [rawKey, rawValue] = entry;
  if (typeof rawKey !== "string") return null;
  const key = rawKey.trim();
  if (!key) return null;
  const value = typeof rawValue === "string" ? rawValue : rawValue == null ? "" : String(rawValue);
  return { key: key.toLowerCase(), entry: [rawKey, value] };
}

/**
 * Merges two property lists while honoring existing case-sensitive keys from the PCB file.
 */
export function mergeProperties(current: Property[] | undefined, defaults: Property[]): Property[] {
  const map = new Map<string, Property>();
  const addEntry = (candidate?: Property) => {
    const normalized = normalizeProperty(candidate);
    if (!normalized) return;
    map.set(normalized.key, normalized.entry);
  };

  for (const entry of current ?? []) {
    addEntry(entry);
  }
  for (const entry of defaults) {
    const normalized = normalizeProperty(entry);
    if (!normalized || map.has(normalized.key)) continue;
    map.set(normalized.key, normalized.entry);
  }
  return Array.from(map.values());
}

/**
 * Derives human-readable sheet metadata from the PCB document properties.
 */
export function deriveMetadata(pcb: Pcb): SheetMetadata {
  const map = new Map<string, string>();
  for (const [key, value] of pcb.properties ?? []) {
    map.set(key.toLowerCase(), value);
  }
  const pick = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = map.get(key);
      if (value) return value;
    }
    return undefined;
  };

  return {
    title: pick(["title", "project"]),
    subtitle: pick(["subtitle", "sub_title", "section"]),
    company: pick(["company", "org", "organization"]),
    revision: pick(["revision", "rev"]),
    documentId: pick(["document", "documentid", "doc id", "document id"]),
    page: pick(["page", "sheet"]),
    totalPages: pick(["totalpages", "pages", "total pages"]),
    designer: pick(["designer", "drafter"]),
    checker: pick(["checker", "checked by"]),
    date: pick(["date", "created", "updated"]),
  };
}

/**
 * Ensures the PCB structure always has a page entry and merged sheet properties.
 */
export function ensureDefaults(base: Pcb): Pcb {
  return {
    ...base,
    page: base.page ?? null,
    properties: mergeProperties(base.properties, DEFAULT_PROPERTIES),
    // Ensure optional lists are always present as arrays to avoid undefined checks
    footprints: base.footprints ?? [],
    nets: base.nets ?? [],
    graphics: base.graphics ?? [],
    images: base.images ?? [],
    tracks: base.tracks ?? [],
    zones: base.zones ?? [],
    groups: base.groups ?? [],
  };
}

/**
 * Returns true when a text blob appears to be JSON (used for quick format detection).
 */
export function looksJson(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/**
 * Scores candidate file paths so KiCad documents win over generic JSON assets.
 */
export function rankPath(path: string): number {
  const lower = path.toLowerCase();
  if (lower.endsWith(".kicad_pcb")) return 0;
  if (lower.endsWith(".pcb.json")) return 1;
  if (lower.endsWith(".json")) return 2;
  return 5;
}

/**
 * Detects whether a PCB file should be parsed as JSON or KiCad s-expression.
 */
export function detectFormat(path: string, content: string): "sexpr" | "json" {
  if (/\.json$/i.test(path)) {
    return "json";
  }
  return looksJson(content) ? "json" : "sexpr";
}

export type PcbFileCandidate = {
  path: string;
  content: string;
  format: "sexpr" | "json";
};

/**
 * Picks the highest-ranked PCB file embedded in the given project record.
 */
export function pickProjectPcbFile(project?: ProjectRecord | null): PcbFileCandidate | null {
  if (!project) return null;
  const entries = Object.entries(project.files ?? {});
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => rankPath(a[0]) - rankPath(b[0]));
  const [path, content] = sorted[0] as [string, string];
  return {
    path,
    content,
    format: detectFormat(path, content),
  };
}

/**
 * Parses a PCB file candidate into the wasm-backed Pcb structure, auto-falling back to JSON.
 */
export function parsePcbCandidate(candidate: PcbFileCandidate): Pcb {
  if (candidate.format === "json") {
    return pcbJsonToValue(candidate.content) as Pcb;
  }
  try {
    return pcbSexprToValue(candidate.content) as Pcb;
  } catch (sexprError) {
    if (looksJson(candidate.content)) {
      return pcbJsonToValue(candidate.content) as Pcb;
    }
    throw sexprError;
  }
}

/**
 * Builds a blank PCB document seeded with minimum valid contents for the editor.
 */
export function createBlankPcb(): Pcb {
  const blank = ensureDefaults(createMinimalPcb() as Pcb);
  return {
    ...blank,
    page: blank.page ?? { size: "A4", portrait: false },
  };
}

export type { Paper, Pcb, Property };
