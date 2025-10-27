import { Outlet } from "react-router-dom";
import { ProjectProvider } from "./contexts/ProjectContext";
function App() {

  return (
    <>
      <ProjectProvider>
        <Outlet />
      </ProjectProvider>
    </>
  );
}

export default App;
