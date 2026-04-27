import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
