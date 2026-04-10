import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface dark:bg-slate-900 font-body">
      <Sidebar />
      <TopBar />
      <main className="ml-0 md:ml-64 pt-24 pb-12 px-4 md:px-12 min-h-screen bg-surface dark:bg-slate-900">
        {children}
      </main>
    </div>
  );
}
