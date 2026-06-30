import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  AlertCircle,
  CheckCircle2,
  FileText
} from "lucide-react";
import type { Business, Shift, RosterPublication, Member } from "../../api";
import {
  addDays,
  formatDate,
  formatShortDate,
  formatNullableDateTime,
  weekday,
  timeRange,
  toDateOnly,
  calculateHours
} from "../../utils/date";
import { ToastRegion } from "../ToastRegion";

function _ShiftList({ shifts }: { shifts: Shift[] }) {
  if (!shifts.length) {
    return <p className="empty">No assigned shifts in this range.</p>;
  }

  return (
    <div className="list">
      {shifts.map((shift) => (
        <div className="list-row" key={shift.id}>
          <div>
            <strong>{formatDate(toDateOnly(shift.startsAt))}</strong>
            <span>{timeRange(shift.startsAt, shift.endsAt)}</span>
          </div>
          <small>{shift.business?.name ?? shift.roleName ?? "Shift"}</small>
        </div>
      ))}
    </div>
  );
}

export function StaffMobileView({
  accessToken: _accessToken,
  userEmail,
  selectedBusiness,
  businesses,
  roster,
  publication,
  members,
  weekStart,
  isLoading,
  message,
  error,
  onSelectBusiness,
  onLogout,
  onOpenRoster,
  onAcknowledge,
  refreshAll: _refreshAll,
  theme
}: {
  accessToken: string;
  userEmail: string;
  selectedBusiness: Business | undefined;
  businesses: Business[];
  roster: Shift[];
  publication: RosterPublication | null;
  members: Member[];
  weekStart: string;
  isLoading: boolean;
  message: string;
  error: string;
  onSelectBusiness: (businessId: string) => void;
  onLogout: (message?: string) => void;
  onOpenRoster: (weekStart: string) => void;
  onAcknowledge: () => Promise<void>;
  refreshAll: () => void;
  theme: "system" | "light" | "dark";
}) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const currentMember = members.find((member) => member.user.email === userEmail);
  const displayName = currentMember?.displayName ?? userEmail;

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const acknowledgedMemberIds = new Set(
    publication?.acknowledgements.map((ack) => ack.member.id) ?? []
  );
  const hasAcknowledged = currentMember ? acknowledgedMemberIds.has(currentMember.id) : false;

  async function handleAcknowledgeClick() {
    setIsAcknowledging(true);
    try {
      await onAcknowledge();
    } finally {
      setIsAcknowledging(false);
    }
  }


  if (isLoading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[540px] bg-transparent px-4 py-6 text-zinc-950 dark:text-zinc-100">
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-4 shadow-sm" style={{ opacity: 0.7 }}>
          <div className="flex-1 min-w-0 grid gap-0.5">
            <h2 className="m-0 text-lg font-extrabold leading-tight text-zinc-900 dark:text-white">Loading...</h2>
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Rosterly</span>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 p-2.5 shadow-sm" style={{ opacity: 0.7 }}>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Loading shifts...</div>
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mb-4 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 p-4 shadow-xs transition hover:border-zinc-300" style={{ opacity: 0.6 }}>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2.5 mb-3">
              <span className="text-base font-bold text-zinc-900 dark:text-white">---</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/20 dark:bg-white/[0.02] py-5 px-4 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">...</div>
          </div>
        ))}
      </div>
    );
  }

  const isThemeDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[540px] bg-transparent px-4 py-6 text-zinc-955 dark:text-zinc-100">
      <ToastRegion message={message} error={error} />

      {/* Header */}
      <header className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex-1 min-w-0 grid gap-0.5">
          {businesses.length > 1 ? (
            <div className="business-select-wrapper" style={{ position: "relative", width: "fit-content" }}>
              <select
                value={selectedBusiness?.id}
                onChange={(event) => void onSelectBusiness(event.target.value)}
                style={{
                  fontSize: "1.125rem", // text-lg
                  fontWeight: 800, // font-extrabold
                  color: "var(--text-primary)",
                  border: "none",
                  background: "transparent",
                  padding: "0 24px 0 0",
                  margin: 0,
                  cursor: "pointer",
                  outline: "none",
                  width: "auto",
                  maxWidth: "100%",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${isThemeDark ? "%23f4f4f5" : "%2318181b"}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right center"
                }}
              >
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id} className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100">
                    {biz.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <h2 className="m-0 text-lg font-extrabold leading-tight text-zinc-900 dark:text-white">{selectedBusiness?.name ?? "Rosterly"}</h2>
          )}
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Welcome, {displayName}</span>
        </div>
        
        <button
          onClick={() => onLogout()}
          className="flex-none inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/20 active:scale-95 transition-all duration-300 cursor-pointer"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </header>

      {/* Week Switcher */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-2.5 shadow-sm">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
          type="button"
          aria-label="Previous week"
          onClick={() => onOpenRoster(addDays(weekStart, -7))}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Week of {formatDate(weekStart)}</span>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
          type="button"
          aria-label="Next week"
          onClick={() => onOpenRoster(addDays(weekStart, 7))}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Roster Acknowledgment Notice */}
      {!publication ? (
        <div className="mb-5 rounded-2xl border p-4 shadow-xs border-amber-200/60 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-2 text-sm font-bold">
            <AlertCircle size={18} />
            <span>Roster is in Draft</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            The manager is still editing the roster for this week. Shifts shown might change.
          </p>
        </div>
      ) : (
        <div className={`mb-5 rounded-2xl border p-4 shadow-xs ${hasAcknowledged ? "border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-300" : "border-indigo-200/60 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-300"}`}>
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 size={18} />
            <span>{hasAcknowledged ? "Roster Acknowledged" : "Roster Needs Review"}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {hasAcknowledged 
              ? `You acknowledged this roster on ${formatNullableDateTime(publication.publishedAt)}.`
              : "A new roster is published. Please review your shifts below and acknowledge the roster."
            }
          </p>
          {!hasAcknowledged && (
            <button
              className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-transparent px-3.5 font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 active:scale-95 shadow-[0_4px_15px_rgba(99,102,241,0.15)] dark:shadow-[0_4px_15px_rgba(99,102,241,0.25)] transition-all duration-300 cursor-pointer mt-3 w-full justify-center"
              type="button"
              disabled={isAcknowledging}
              onClick={handleAcknowledgeClick}
            >
              <Check size={18} />
              {isAcknowledging ? "Acknowledging..." : "Acknowledge Roster"}
            </button>
          )}
        </div>
      )}

      {/* Timeline Days */}
      <div className="vertical-timeline">
        {days.map((day) => {
          const dayShifts = roster.filter((shift) => toDateOnly(shift.startsAt) === day);
          const hasShifts = dayShifts.length > 0;

          return (
            <div className="mb-4 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-4 shadow-xs transition hover:border-zinc-350 dark:hover:border-white/20" key={day}>
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2.5 mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-zinc-900 dark:text-white">{weekday(day)}</span>
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{formatShortDate(day)}</span>
                </div>
                {hasShifts && (
                  <span className="inline-flex items-center rounded bg-zinc-100/50 dark:bg-zinc-900/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {dayShifts.length} {dayShifts.length === 1 ? "shift" : "shifts"}
                  </span>
                )}
              </div>
              <div className="timeline-day-body">
                {hasShifts ? (
                  dayShifts.map((shift) => (
                    <div className="rounded-xl border-l-4 border-indigo-600 bg-zinc-100/50 dark:bg-white/[0.03] p-3.5" key={shift.id}>
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        <Clock size={15} className="text-zinc-400 dark:text-zinc-500" />
                        <span>{timeRange(shift.startsAt, shift.endsAt)}</span>
                        <span className="ml-auto text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                          {calculateHours(shift.startsAt, shift.endsAt)}
                        </span>
                      </div>
                      {shift.roleName && (
                        <div className="mt-2 inline-flex items-center rounded-full bg-zinc-100/50 dark:bg-zinc-900/60 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-white/5 capitalize">{shift.roleName}</div>
                      )}
                      {shift.notes && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-zinc-200/30 dark:bg-white/[0.02] border border-zinc-200/20 dark:border-white/5 p-2.5 text-xs leading-relaxed text-zinc-650 dark:text-zinc-400">
                          <FileText size={13} className="mt-0.5 flex-shrink-0 text-zinc-400 dark:text-zinc-500" />
                          <span>{shift.notes}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/20 dark:bg-white/[0.02] py-5 px-4 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">Day Off</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
