import { ApiService } from "./ApiService";
import { getAuthToken } from "@/utils/authToken";
import type { ProjectFileMap } from "@/types/project";

const FLOW_API_URL = import.meta.env.VITE_FLOW_API_URL as string;

const api = new ApiService(FLOW_API_URL);

export type RemoteProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  sizeBytes: number;
};

export type RemoteProject = RemoteProjectSummary & {
  files: ProjectFileMap;
};

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listRemoteProjects(): Promise<RemoteProjectSummary[]> {
  const resp = await api.request<{ projects: RemoteProjectSummary[] }>(
    "/projects",
    { method: "GET", headers: authHeaders() },
  );
  return resp.projects;
}

export async function fetchRemoteProject(id: string): Promise<RemoteProject> {
  const resp = await api.request<{ project: RemoteProject }>(
    `/projects/${id}`,
    { method: "GET", headers: authHeaders() },
  );
  return resp.project;
}
