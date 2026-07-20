import { useState, useEffect } from "react";
import { Building2, Check, LogOut, Pencil, Trash2, X, Sun, Moon, Monitor } from "lucide-react";
import type { Business } from "../../api";
import { errorMessage } from "../../utils/errors";
import { useDismissOnOutsidePointer } from "../../hooks/useDismissOnOutsidePointer";

export function ProfileMenu({
  businesses,
  selectedBusinessId,
  userEmail,
  onSelectBusiness,
  onRenameBusiness,
  onDeleteBusiness,
  onLogout,
  onError,
  theme,
  onThemeChange
}: {
  businesses: Business[];
  selectedBusinessId: string;
  userEmail: string;
  onSelectBusiness: (businessId: string) => Promise<void>;
  onRenameBusiness: (businessId: string, name: string) => Promise<void>;
  onDeleteBusiness: (businessId: string) => Promise<void>;
  onLogout: (message?: string) => void;
  onError: (message: string) => void;
  theme: "system" | "light" | "dark";
  onThemeChange: (theme: "system" | "light" | "dark") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const profileRef = useDismissOnOutsidePointer<HTMLDivElement>(isOpen, () => setIsOpen(false));

  return (
    <div className="relative w-full self-start" ref={profileRef}>
      <button
        className="grid min-h-[42px] w-full items-center rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 px-3.5 py-2.5 text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white cursor-pointer transition-all duration-300 shadow-sm"
        type="button"
        aria-label="Profile and businesses"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{userEmail}</span>
      </button>

      {isOpen ? (
        <div
          className="absolute bottom-[calc(100%+10px)] left-0 z-50 grid max-h-[min(620px,calc(100vh-92px))] w-full gap-2 overflow-auto rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl p-3 text-zinc-950 dark:text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
          role="dialog"
          aria-label="Profile and business switcher"
        >
          <div className="grid min-h-[38px] grid-cols-[minmax(0,1fr)_32px] items-center gap-2 border-b border-zinc-200/50 dark:border-white/5 px-0.5 pt-0.5 pb-2 text-[0.84rem] text-zinc-800 dark:text-zinc-300">
            <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-medium text-zinc-950 dark:text-white">{userEmail}</strong>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-800/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white cursor-pointer transition-all duration-300"
              onClick={() => onLogout()}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
          <p className="mx-1.5 mt-2 mb-0 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Theme</p>
          <div className="mx-1.5 my-1 flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-900 p-0.5 border border-zinc-200/50 dark:border-white/5">
            <button
              type="button"
              onClick={() => onThemeChange("light")}
              title="Light Mode"
              aria-label="Light Mode"
              className={`flex flex-1 h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm font-bold ring-1 ring-zinc-300 dark:ring-white/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Sun size={15} />
            </button>
            <button
              type="button"
              onClick={() => onThemeChange("dark")}
              title="Dark Mode"
              aria-label="Dark Mode"
              className={`flex flex-1 h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm font-bold ring-1 ring-zinc-300 dark:ring-white/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Moon size={15} />
            </button>
            <button
              type="button"
              onClick={() => onThemeChange("system")}
              title="System Preference"
              aria-label="System Preference"
              className={`flex flex-1 h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                theme === "system"
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm font-bold ring-1 ring-zinc-300 dark:ring-white/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Monitor size={15} />
            </button>
          </div>
          <p className="mx-1.5 mt-2 mb-0 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Businesses</p>
          <BusinessList
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onSelect={async (businessId) => {
              await onSelectBusiness(businessId);
              setIsOpen(false);
            }}
            onRename={onRenameBusiness}
            onDelete={onDeleteBusiness}
            onError={onError}
          />
        </div>
      ) : null}
    </div>
  );
}

function BusinessList({
  businesses,
  selectedBusinessId,
  onSelect,
  onRename,
  onDelete,
  onError
}: {
  businesses: Business[];
  selectedBusinessId: string;
  onSelect: (businessId: string) => Promise<void>;
  onRename: (businessId: string, name: string) => Promise<void>;
  onDelete: (businessId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editingBusinessId, setEditingBusinessId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!businesses.some((business) => business.id === editingBusinessId)) {
      setEditingBusinessId("");
      setEditingName("");
    }
  }, [businesses, editingBusinessId]);

  if (businesses.length === 0) {
    return <p className="m-0 rounded-lg border border-dashed border-zinc-200 dark:border-white/5 p-3 text-[0.86rem] text-zinc-500">No businesses yet</p>;
  }

  function startRename(business: Business) {
    setEditingBusinessId(business.id);
    setEditingName(business.name);
  }

  async function submitRename(event: React.FormEvent, business: Business) {
    event.preventDefault();
    onError("");
    setIsSaving(true);

    try {
      await onRename(business.id, editingName.trim());
      setEditingBusinessId("");
      setEditingName("");
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete(business: Business) {
    onError("");

    if (!window.confirm(`Delete ${business.name}? This will remove its staff, shifts, and invitations.`)) {
      return;
    }

    try {
      await onDelete(business.id);
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <nav className="grid content-start gap-[3px] overflow-auto mt-1" aria-label="Businesses">
      {businesses.map((business) => {
        const isEditing = editingBusinessId === business.id;
        const isActive = business.id === selectedBusinessId;
        const canManageBusiness = business.members?.[0]?.role === "manager";

        return (
          <div
            className={`relative grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center rounded-lg border border-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-800/5 dark:hover:bg-white/5 transition-all duration-300 ${
              isActive ? "bg-zinc-800/10 text-zinc-950 dark:bg-white/10 dark:text-white font-semibold" : "bg-transparent"
            }`}
            key={business.id}
          >
            {isEditing && canManageBusiness ? (
              <form className="col-span-full grid grid-cols-[17px_minmax(0,1fr)_28px_28px] items-center gap-1.5 py-1.5 pr-1.5 pl-2" onSubmit={(event) => void submitRename(event, business)}>
                <Building2 size={16} className="text-zinc-500 dark:text-zinc-400" />
                <input
                  aria-label={`Rename ${business.name}`}
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  required
                  autoFocus
                  className="min-h-8 w-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1.5 text-zinc-950 dark:text-zinc-100 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-xs transition-all duration-300"
                />
                <button
                  type="submit"
                  title="Save business name"
                  aria-label="Save business name"
                  disabled={isSaving || editingName.trim() === business.name}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-800/5 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 text-zinc-700 dark:text-zinc-200"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  title="Cancel rename"
                  aria-label="Cancel rename"
                  onClick={() => {
                    setEditingBusinessId("");
                    setEditingName("");
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-800/5 dark:hover:bg-white/5 cursor-pointer text-zinc-500 dark:text-zinc-400"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <>
                <button className="grid min-h-9 w-full grid-cols-[17px_minmax(0,1fr)] items-center gap-2 p-2 text-left cursor-pointer text-inherit" onClick={() => void onSelect(business.id)} type="button">
                  <Building2 size={16} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"} />
                  <span className="min-w-0 break-words text-xs">{business.name}</span>
                </button>
                {canManageBusiness ? (
                  <div className="flex items-center gap-0.5 pr-1">
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-800/5 dark:hover:bg-white/5 cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all duration-300"
                      type="button"
                      title={`Rename ${business.name}`}
                      aria-label={`Rename ${business.name}`}
                      onClick={() => startRename(business)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-800/5 dark:hover:bg-white/5 cursor-pointer text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 transition-all duration-300"
                      type="button"
                      title={`Delete ${business.name}`}
                      aria-label={`Delete ${business.name}`}
                      onClick={() => void confirmDelete(business)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
