import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Dashboard from "./pages/DashBoard";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Notepad from "./pages/Notepad";
import Tools from "./pages/Tools";
import Settings from "./pages/Settings";
import ProjectDetailWrapper from "./pages/projectDetail/ProjectDetailWrapper";
import MyTasksPage from "./pages/MyTasks";
import { AppContextProvider } from "./context/AppProvider";

function App() {
  return (
    <AppContextProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="chat" element={<Chat />} />
          <Route path="notepad" element={<Notepad />} />
          <Route path="tools" element={<Tools />} />
          <Route path="settings" element={<Settings />} />
          <Route path="projectdetails/:id" element={<ProjectDetailWrapper />} />
          <Route path="mytasks" element={<MyTasksPage />} />
        </Route>
      </Routes>
    </AppContextProvider>
  );
}

export default App;
