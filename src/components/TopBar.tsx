import DarkModeToggle from "./DarkModeToggle";

export default function TopBar() {
  return (
    <header className="fixed top-0 right-0 z-40 bg-surface-container-lowest/80 dark:bg-slate-900/80 backdrop-blur-xl h-16 flex items-center justify-end px-8 gap-4"
      style={{ left: "16rem" }}
    >
      <DarkModeToggle />
    </header>
  );
}
