import { API_BASE_URL, ENDPOINTS } from "@/constants";
import { ApiService } from "./ApiService";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

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
  // Returns a Blob (ZIP)
  return api.postJson<Blob>(ENDPOINTS.projectNewZip, { name });
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
