import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface font-body">
      <Sidebar />
      <TopBar />
      <main className="ml-64 pt-24 pb-12 px-12 min-h-screen bg-surface">
        {children}
      </main>
    </div>
  );
}
