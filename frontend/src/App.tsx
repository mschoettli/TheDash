import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import DashboardPage from "./pages/DashboardPage";
import BookmarksPage from "./pages/BookmarksPage";
import WorkspacePage from "./pages/WorkspacePage";
import { useWebSocket } from "./hooks/useWebSocket";

function AppInner() {
  useWebSocket();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/notes" element={<WorkspacePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppInner />;
}
