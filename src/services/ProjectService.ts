import { API_BASE_URL, ENDPOINTS } from "@/constants";
import { ApiService } from "./ApiService";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import * as parser from "trackway-parser-wasm";

// Lazy-load JSZip to avoid bundling/init-order issues in production builds
async function loadJSZip() {
  const mod = await import("jszip");
  return (mod as any).default ?? mod;
}

function normalizeProjectName(name: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length ? trimmed : "Untitled Project";
}

function safeFileStem(name: string): string {
  const normalized = normalizeProjectName(name);
  const safe = normalized.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
  return safe.length ? safe : "project";
}

// ----- Types that match your FastAPI responses -----

// /project/new -> JSON bundle of files
export interface GeneratedProjectJson {
  name: string;
  files: Record<string, string>; // filename -> text
}

// /parse/* -> JSON parsed output (shape depends on kiutils; keep it generic)
export type KiUtilsJson = Record<string, unknown>;

// Service instance
const api = new ApiService(API_BASE_URL);

// ---------- Low-level call functions (non-React) ----------

export async function createProjectJson(name: string) {
  return api.postJson<GeneratedProjectJson>(ENDPOINTS.projectNew, { name });
}

export async function createProjectZip(name: string) {
  const pretty = true;
  const schematicSexpr = parser.schematicJsonToSexpr(
    parser.createMinimalSchematicJson(pretty),
    pretty,
  );
  const pcbSexpr = parser.pcbJsonToSexpr(parser.createMinimalPcbJson(pretty), pretty);

  const fileStem = safeFileStem(name);
  const files: Record<string, string> = {
    [`${fileStem}.kicad_sch`]: schematicSexpr,
    [`${fileStem}.kicad_pcb`]: pcbSexpr,
  };

  const JSZip = await loadJSZip();
  const zip = new JSZip();
  Object.entries(files).forEach(([path, content]) => {
    zip.file(path, content.endsWith("\n") ? content : `${content}\n`);
  });

  return zip.generateAsync({ type: "blob" });
}

export async function parseSymbolFile(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  return api.postForm<KiUtilsJson>(ENDPOINTS.parseSymbols, fd);
}

export async function parseFootprintFile(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  return api.postForm<KiUtilsJson>(ENDPOINTS.parseFootprint, fd);
}

// ---------- React Query hooks ----------

export function useCreateProjectJson(
  options?: UseMutationOptions<GeneratedProjectJson, unknown, { name: string }>,
) {
  return useMutation({
    mutationKey: ["project:new:json"],
    mutationFn: ({ name }) => createProjectJson(name),
    ...options,
  });
}

export function useCreateProjectZip(
  options?: UseMutationOptions<Blob, unknown, { name: string }>,
) {
  return useMutation({
    mutationKey: ["project:new:zip"],
    mutationFn: ({ name }) => createProjectZip(name),
    ...options,
  });
}

export function useParseSymbol(
  options?: UseMutationOptions<KiUtilsJson, unknown, { file: File }>,
) {
  return useMutation({
    mutationKey: ["parse:symbol"],
    mutationFn: ({ file }) => parseSymbolFile(file),
    ...options,
  });
}

export function useParseFootprint(
  options?: UseMutationOptions<KiUtilsJson, unknown, { file: File }>,
) {
  return useMutation({
    mutationKey: ["parse:footprint"],
    mutationFn: ({ file }) => parseFootprintFile(file),
    ...options,
  });
}
