import { ClipboardList, Users } from "lucide-react";
import type { WorkspaceSection } from "../../context/WorkspaceContext";

export function AdminNavigation({
  activeSection,
  canManage,
  onSectionChange
}: {
  activeSection: WorkspaceSection;
  canManage: boolean;
  onSectionChange: (section: WorkspaceSection) => void;
}) {
  const sections: Array<{
    id: WorkspaceSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "shifts",
      label: "Rosters",
      icon: <ClipboardList size={18} />
    },
    ...(canManage ? [{
      id: "staff" as const,
      label: "Staff",
      icon: <Users size={18} />
    }] : [])
  ];

  return (
    <nav className="grid content-start gap-2 max-md:grid-cols-2 lg:grid-cols-1" aria-label="Workspace navigation">
      {sections.map((section) => (
        <button
          key={section.id}
          className={`grid min-h-11 grid-cols-1 items-center justify-items-center gap-2.5 rounded-xl border px-3 py-2.5 text-center font-medium lg:grid-cols-[22px_minmax(0,1fr)] lg:justify-items-start lg:text-left cursor-pointer transition-all duration-300 ${
            activeSection === section.id
              ? "border-zinc-200 bg-white/80 text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white shadow-sm font-semibold"
              : "border-transparent bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-800/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-zinc-200"
          }`}
          type="button"
          onClick={() => onSectionChange(section.id)}
        >
          {section.icon}
          {section.label}
        </button>
      ))}
    </nav>
  );
}
