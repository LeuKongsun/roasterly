import { useState } from "react";
import { ChevronRight, Sparkles, Sun, Moon, Monitor } from "lucide-react";
import { login } from "../api";
import { errorMessage } from "../utils/errors";

export function AuthScreen({
  notice,
  onAuth,
  theme,
  onThemeChange
}: {
  notice: string;
  onAuth: (token: string, email: string) => void;
  theme: "system" | "light" | "dark";
  onThemeChange: (theme: "system" | "light" | "dark") => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      onAuth(result.accessToken, result.user.email);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4 md:p-6 bg-transparent relative overflow-hidden select-none">
      {/* Theme Toggle in top-right */}
      <div className="absolute top-4 right-4 z-10 flex items-center rounded-xl bg-zinc-200/50 dark:bg-zinc-900/60 p-0.5 border border-zinc-200/50 dark:border-white/5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => onThemeChange("light")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            theme === "light"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          }`}
          title="Light Mode"
        >
          <Sun size={15} />
        </button>
        <button
          type="button"
          onClick={() => onThemeChange("dark")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            theme === "dark"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          }`}
          title="Dark Mode"
        >
          <Moon size={15} />
        </button>
        <button
          type="button"
          onClick={() => onThemeChange("system")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            theme === "system"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          }`}
          title="System Preference"
        >
          <Monitor size={15} />
        </button>
      </div>

      {/* Decorative Background Orbs */}

      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-600/5 dark:bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-emerald-600/5 dark:bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <section className="relative grid w-full max-w-[940px] items-center gap-8 md:gap-12 rounded-[2rem] border border-zinc-200/50 dark:border-white/5 bg-zinc-950/[0.02] dark:bg-zinc-950/30 p-2 shadow-2xl md:grid-cols-[1.15fr_0.85fr]" aria-labelledby="auth-title">
        {/* Double Bezel - Inner Content */}
        <div className="p-6 md:p-10 flex flex-col justify-center h-full min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold bg-zinc-200/60 dark:bg-zinc-900/60 border border-zinc-300/30 dark:border-white/5 text-zinc-500 dark:text-zinc-400 w-fit mb-4">
            <Sparkles size={10} className="text-indigo-500 dark:text-indigo-400" />
            <span>Rosterly v2</span>
          </div>
          
          <h1 id="auth-title" className="mt-0 mb-5 max-w-[15ch] text-4xl leading-tight font-extrabold tracking-tight md:text-[3.25rem] text-transparent bg-clip-text bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-700 dark:from-white dark:via-zinc-100 dark:to-zinc-400">
            <span className="md:hidden">Sign In</span>
            <span className="hidden md:inline">Simple roster setup for small teams.</span>
          </h1>
          
          <p className="mt-0 max-w-[50ch] text-[0.95rem] leading-relaxed text-zinc-600 dark:text-zinc-400 hidden md:block font-normal">
            Create a business, add staff, and turn the week into assigned shifts without a spreadsheet screenshot.
          </p>
        </div>

        {/* Form Double Bezel Container */}
        <div className="rounded-[calc(2rem-0.5rem)] border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 p-6 md:p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          <form className="grid min-w-0 gap-4 w-full" onSubmit={submit}>
            <div className="mb-2">
              <h2 className="m-0 text-lg font-bold text-zinc-900 dark:text-white">Welcome back</h2>
              <p className="m-0 text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter details to access your dashboard</p>
            </div>

            {notice ? (
              <p className="mt-0 rounded-lg px-3 py-2 text-[0.8rem] border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-medium">
                {notice}
              </p>
            ) : null}

            <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                placeholder="you@domain.com"
                className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
              />
            </label>

            <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                required
                placeholder="••••••••"
                className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
              />
            </label>

            {error ? (
              <p className="mt-0 rounded-lg px-3 py-2 text-[0.8rem] border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300 font-medium">
                {error}
              </p>
            ) : null}

            <button
              className="group inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98] transition-all duration-300 shadow-[0_4px_20px_rgba(99,102,241,0.15)] dark:shadow-[0_4px_20px_rgba(99,102,241,0.25)] cursor-pointer mt-2"
              type="submit"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? "Working" : "Login"}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
