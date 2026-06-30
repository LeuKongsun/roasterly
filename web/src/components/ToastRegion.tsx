export function ToastRegion({ message, error }: { message: string; error: string }) {
  if (!message && !error) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-[18px] right-[18px] z-50 grid w-[min(320px,calc(100vw-32px))] gap-2" aria-live="polite" aria-atomic="true">
      {error ? (
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl px-4 py-3 text-[0.84rem] text-zinc-950 dark:text-zinc-100 shadow-[0_15px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.5)] border-l-[4px] border-l-rose-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl px-4 py-3 text-[0.84rem] text-zinc-950 dark:text-zinc-100 shadow-[0_15px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.5)] border-l-[4px] border-l-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
}
