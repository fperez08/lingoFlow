import Link from "next/link";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vocabulary", label: "Vocabulary" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low dark:bg-slate-950 flex flex-col py-8 px-4 z-50">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-extrabold text-primary tracking-tighter font-headline">
          LingoFlow
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">The Cognitive Sanctuary</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-900 hover:text-primary transition-colors duration-300 ease-out"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
