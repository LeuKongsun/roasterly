import { useState } from "react";
import { UserPlus } from "lucide-react";
import { errorMessage } from "../../utils/errors";

export function MemberForm({
  onAdd,
  onError
}: {
  onAdd: (input: {
    email: string;
    password?: string;
    displayName?: string;
    phoneNumber?: string;
    role: "manager" | "staff";
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    try {
      await onAdd({
        email,
        password: password || undefined,
        displayName: displayName || undefined,
        phoneNumber: phoneNumber || undefined,
        role
      });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setPhoneNumber("");
      setRole("staff");
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <form className="grid min-w-0 gap-4 w-full mt-2" onSubmit={submit}>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          placeholder="staff@domain.com"
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        />
      </label>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Initial password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          required
          placeholder="••••••••"
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        />
      </label>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Jane Doe"
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        />
      </label>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Phone
        <input
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="+1 (555) 019-2834"
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        />
      </label>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Role
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as "manager" | "staff")}
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        >
          <option value="staff" className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100">Staff</option>
          <option value="manager" className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100">Manager</option>
        </select>
      </label>
      <button
        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 active:scale-95 shadow-[0_4px_15px_rgba(99,102,241,0.15)] dark:shadow-[0_4px_15px_rgba(99,102,241,0.25)] transition-all duration-300 w-full min-w-0 whitespace-normal mt-2 cursor-pointer"
        type="submit"
      >
        <UserPlus size={16} />
        <span>Add staff</span>
      </button>
    </form>
  );
}
