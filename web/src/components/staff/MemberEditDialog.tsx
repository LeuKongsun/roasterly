import { useState } from "react";
import type { Member } from "../../api";
import { useDismissOnOutsidePointer } from "../../hooks/useDismissOnOutsidePointer";

export function MemberEditDialog({
  member,
  onClose,
  onSave
}: {
  member: Member;
  onClose: () => void;
  onSave: (
    memberId: string,
    input: {
      email?: string;
      displayName?: string;
      phoneNumber?: string | null;
      role?: "manager" | "staff";
      password?: string;
    }
  ) => Promise<void>;
}) {
  const [email, setEmail] = useState(member.user.email);
  const [displayName, setDisplayName] = useState(member.displayName);
  const [phoneNumber, setPhoneNumber] = useState(member.phoneNumber ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "staff">(member.role);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useDismissOnOutsidePointer<HTMLDivElement>(true, onClose);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await onSave(member.id, {
        email: email.trim(),
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        role,
        password: password || undefined
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm p-5" role="presentation">
      <div
        ref={dialogRef}
        className="grid max-h-[min(760px,calc(100vh-40px))] w-full max-w-[520px] gap-4 overflow-auto rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl p-6 md:p-8 shadow-2xl transition-all duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-edit-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Staff</p>
            <h4 id="member-edit-title" className="m-0 text-lg font-bold text-zinc-900 dark:text-white">Update staff member</h4>
          </div>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white active:scale-95 transition-all duration-300 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form className="grid min-w-0 gap-4 w-full" onSubmit={submit}>
          <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-650 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
            />
          </label>
          <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-650 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
            />
          </label>
          <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Phone
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-655 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
            />
          </label>
          <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            New password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Leave blank to keep current"
              className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-450 dark:placeholder:text-zinc-655 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
            />
          </label>
          <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "manager" | "staff")}
              className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
            >
              <option value="staff" className="bg-white dark:bg-zinc-955 text-zinc-950 dark:text-zinc-100">Staff</option>
              <option value="manager" className="bg-white dark:bg-zinc-955 text-zinc-950 dark:text-zinc-100">Manager</option>
            </select>
          </label>
          <button
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98] transition-all duration-300 w-full min-w-0 whitespace-normal mt-2 cursor-pointer shadow-sm"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Saving" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
