import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
