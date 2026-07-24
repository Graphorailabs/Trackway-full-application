import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider,createHashRouter} from 'react-router-dom'
import DashboardPage from './pages/dashboard'
import './index.css'
import App from './App.tsx'
import SchematicPage from '@/pages/schematic'
import PcbEditorPage from '@/pages/pcb_editor'
import GerberPage from '@/pages/gerber'


// Initialize wasm-backed parser before mounting React so exported
// helpers (createMinimalPcb, pcbJsonToValue, etc.) are available.

const router = createHashRouter([
  { path: "/", element: <App />,
    children:[
      {index:true, element:<DashboardPage/>},
      { path: "dashboard", element: <DashboardPage /> },
      { path: "schematic", element: <SchematicPage /> },
      { path: "pcb-editor", element: <PcbEditorPage /> },
      { path: "gerber", element: <GerberPage /> },
    ]
  },
]); 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router}>
    </RouterProvider>
  </StrictMode>,
)
