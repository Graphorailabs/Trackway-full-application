import { useContext } from "react";
import { ProjectContext } from "@/contexts/ProjectContextBase";

/**
 * One-stop hook for both state and actions.
 * Must be used under <ProjectProvider>.
 */
export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within <ProjectProvider>");
  return ctx;
}
