import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { ProjectProvider } from "./contexts/ProjectContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { useProject } from "@/hooks/useProject";
import { useAuthModal } from "@/hooks/useAuthModal";
import { fetchRemoteProject } from "@/services/FlowProjectsClient";

function FlowImportHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { importRemoteFiles } = useProject();
  const { requireAuth } = useAuthModal();
  const importedRef = useRef<string | null>(null);

  useEffect(() => {
    const importProjectId = searchParams.get("importProjectId");
    if (!importProjectId || importedRef.current === importProjectId) return;
    importedRef.current = importProjectId;

    (async () => {
      try {
        await requireAuth();
        const remote = await fetchRemoteProject(importProjectId);
        await importRemoteFiles(remote.name, remote.files);
        navigate("/pcb-editor", { replace: true });
      } catch (err) {
        // Sign-in declined, or the import failed - leave the user where they
        // are rather than forcing a redirect.
        console.error("Failed to import Flow project", err);
      } finally {
        const next = new URLSearchParams(searchParams);
        next.delete("importProjectId");
        setSearchParams(next, { replace: true });
      }
    })();
  }, [searchParams, setSearchParams, navigate, importRemoteFiles, requireAuth]);

  return null;
}

function App() {
  return (
    <AuthModalProvider>
      <ProjectProvider>
        <FlowImportHandler />
        <Outlet />
      </ProjectProvider>
    </AuthModalProvider>
  );
}

export default App;
