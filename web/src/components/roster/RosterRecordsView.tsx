import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import type { RosterRecord, Shift } from "../../api";
import { currentMonday, formatShortDate, timeRange, weekStartForDateOnly } from "../../utils/date";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function RosterRecordsView({
  isLoading,
  canManage,
  records,
  onAddShift,
  onEditShift,
  onLoadRosterWeeks,
  onOpenRoster
}: {
  isLoading: boolean;
  canManage: boolean;
  records: RosterRecord[];
  onAddShift: (day?: string, memberId?: string) => void;
  onEditShift: (shift: Shift) => void;
  onLoadRosterWeeks: (weekStarts: string[]) => Promise<Shift[]>;
  onOpenRoster: (weekStart: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthAnchor(records[0]?.weekStart ?? currentMonday()));
  const [monthShifts, setMonthShifts] = useState<Shift[]>([]);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const recordByWeek = useMemo(() => new Map(records.map((record) => [record.weekStart, record])), [records]);
  const weeks = useMemo(() => calendarWeeksForMonth(visibleMonth), [visibleMonth]);
  const days = useMemo(() => weeks.flatMap((week) => week.days), [weeks]);
  const weekStarts = useMemo(() => weeks.map((week) => week.weekStart), [weeks]);
  const visibleMonthDate = parseDateOnly(visibleMonth);
  const visibleMonthIndex = visibleMonthDate.getMonth();
  const visibleYear = visibleMonthDate.getFullYear();
  const yearOptions = useMemo(() => yearRange(visibleYear), [visibleYear]);
  const todayStr = toDateOnly(new Date());

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      setIsMonthLoading(true);

      try {
        const shifts = await onLoadRosterWeeks(weekStarts);
        if (!cancelled) {
          setMonthShifts(shifts);
        }
      } finally {
        if (!cancelled) {
          setIsMonthLoading(false);
        }
      }
    }

    void loadMonth();

    return () => {
      cancelled = true;
    };
  }, [onLoadRosterWeeks, records, weekStarts]);

  const shiftsByDay = useMemo(() => {
    const grouped = new Map<string, Shift[]>();

    monthShifts.forEach((shift) => {
      const day = toDateOnly(new Date(shift.startsAt));
      const shifts = grouped.get(day) ?? [];
      grouped.set(day, [...shifts, shift].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
    });

    return grouped;
  }, [monthShifts]);

  return (
    <>
      <div className="mb-3.5 flex flex-col items-stretch justify-between gap-3.5 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Rosters</p>
          <h3 className="mb-0 text-base font-semibold text-zinc-950 dark:text-white" id="roster-title">Roster planner</h3>
        </div>
        <div className="flex w-full flex-wrap items-end justify-end gap-2 md:w-auto">
          <button
            type="button"
            title="Previous month"
            aria-label="Previous month"
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-zinc-200/80 bg-white/70 text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
          >
            <ChevronLeft size={17} />
          </button>
          <label className="grid min-w-0 gap-1.5 text-[0.82rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Month
            <select
              value={visibleMonthIndex}
              className="h-[42px] min-w-[132px] rounded-lg border border-zinc-200 bg-white/80 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-zinc-950 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-100"
              onChange={(event) => setVisibleMonth(monthAnchorFor(visibleYear, Number(event.target.value)))}
            >
              {MONTH_LABELS.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-[0.82rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Year
            <select
              value={visibleYear}
              className="h-[42px] min-w-[104px] rounded-lg border border-zinc-200 bg-white/80 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-zinc-950 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-100"
              onChange={(event) => setVisibleMonth(monthAnchorFor(Number(event.target.value), visibleMonthIndex))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            title="Next month"
            aria-label="Next month"
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-zinc-200/80 bg-white/70 text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          >
            <ChevronRight size={17} />
          </button>
          <button
            type="button"
            className="inline-flex h-[42px] items-center justify-center rounded-lg border border-zinc-200/80 bg-white/70 px-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={() => setVisibleMonth(monthAnchor(currentMonday()))}
          >
            Today
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200/60 bg-white/45 dark:border-white/5 dark:bg-zinc-950/20">
        <div className="flex flex-col gap-3 border-b border-zinc-200/60 px-4 py-3 dark:border-white/5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Month planner</p>
              <strong className="text-sm font-semibold text-zinc-950 dark:text-white">{formatMonth(visibleMonth)}</strong>
            </div>
          </div>
        </div>

        <div className="hidden grid-cols-7 border-b border-zinc-200/60 text-[0.72rem] font-semibold uppercase tracking-wider text-zinc-500 dark:border-white/5 dark:text-zinc-400 md:grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="border-r border-zinc-200/50 px-3 py-2 last:border-r-0 dark:border-white/5">{day}</div>
          ))}
        </div>

        {isLoading || isMonthLoading ? (
          <RosterCalendarSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7">
            {days.map((day) => {
              const weekStart = weekStartForDateOnly(day);
              const record = recordByWeek.get(weekStart);
              const dayShifts = shiftsByDay.get(day) ?? [];
              const isCurrentMonth = isSameMonth(day, visibleMonth);
              const isToday = day === toDateOnly(new Date());
              const dayLabel = new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(parseDateOnly(day));
              const isPastDay = day < todayStr;

              return (
                <div
                  key={day}
                  className={`group flex min-h-[210px] flex-col border-b border-r border-zinc-200/50 p-3 transition-colors dark:border-white/5 md:min-h-[240px] md:last:border-r ${isCurrentMonth ? "bg-white/15 dark:bg-transparent" : "bg-zinc-100/35 text-zinc-400 dark:bg-zinc-900/25 dark:text-zinc-600"} ${isPastDay ? "opacity-60 bg-zinc-100/50 dark:bg-zinc-900/30 cursor-not-allowed" : ""}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <div className={`rounded-md px-2 py-1 text-left ${isToday ? "bg-indigo-600 text-white dark:bg-indigo-500" : "text-zinc-800 dark:text-zinc-200"}`}>
                        <span className="block text-[0.66rem] font-bold uppercase tracking-wider opacity-70 md:hidden">{dayLabel}</span>
                        <span className="block text-sm font-black">{Number(day.slice(-2))}</span>
                      </div>
                      {canManage && !isPastDay ? (
                        <button
                          type="button"
                          title={`Add shift on ${formatShortDate(day)}`}
                          aria-label={`Add shift on ${formatShortDate(day)}`}
                          className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md border border-zinc-200/80 bg-white/70 text-zinc-500 opacity-0 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:opacity-100 group-hover:opacity-100 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                          onClick={() => onAddShift(day)}
                        >
                          <Plus size={14} />
                        </button>
                      ) : null}
                    </div>
                    <WeekStatus record={record} onOpenRoster={() => onOpenRoster(weekStart)} />
                  </div>

                  <div
                    className={`flex min-h-0 flex-1 flex-col gap-1.5 rounded-lg ${canManage && !isPastDay ? "cursor-copy" : ""}`}
                    onClick={(event) => {
                      if (canManage && !isPastDay && event.target === event.currentTarget) {
                        onAddShift(day);
                      }
                    }}
                  >
                    {dayShifts.slice(0, 4).map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-2.5 py-2 text-left text-sky-950 transition-all hover:border-sky-300 hover:bg-sky-100/80 focus:outline-none focus:ring-2 focus:ring-sky-400/30 dark:border-sky-500/20 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:border-sky-400/40 dark:hover:bg-sky-950/50"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditShift(shift);
                        }}
                      >
                        <span className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-bold text-sky-700/80 dark:text-sky-300/80">
                          <Clock size={12} />
                          {timeRange(shift.startsAt, shift.endsAt)}
                        </span>
                        <span className="block truncate text-[0.78rem] font-black">{shift.member.displayName}</span>
                        {shift.roleName ? (
                          <span className="mt-1 block truncate text-[0.7rem] font-semibold text-sky-700/75 dark:text-sky-300/70">{shift.roleName}</span>
                        ) : null}
                      </button>
                    ))}
                    {dayShifts.length > 4 ? (
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-left text-[0.72rem] font-bold text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenRoster(weekStart);
                        }}
                      >
                        +{dayShifts.length - 4} more
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={!canManage || isPastDay}
                      aria-label={`Add shift on ${formatShortDate(day)}`}
                      className={`min-h-[52px] flex-1 rounded-lg border border-dashed border-transparent text-left text-[0.75rem] font-semibold transition-all disabled:cursor-default ${canManage && !isPastDay ? "px-2.5 text-transparent hover:border-indigo-200 hover:bg-white/60 hover:text-indigo-700 focus:border-indigo-200 focus:bg-white/60 focus:text-indigo-700 dark:hover:border-indigo-500/30 dark:hover:bg-white/[0.03] dark:hover:text-indigo-300 dark:focus:border-indigo-500/30 dark:focus:bg-white/[0.03] dark:focus:text-indigo-300" : "pointer-events-none"}`}
                      onClick={() => onAddShift(day)}
                    >
                      {canManage && !isPastDay ? "Click blank space to add shift" : ""}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function WeekStatus({ record, onOpenRoster }: { record?: RosterRecord; onOpenRoster: () => void }) {
  if (!record) {
    return (
      <span className="inline-flex min-h-6 items-center rounded-full border border-zinc-200/70 bg-white/50 px-2 py-0.5 text-[0.65rem] font-bold capitalize text-zinc-500 dark:border-white/10 dark:bg-zinc-900/30 dark:text-zinc-500">
        empty
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-bold capitalize transition-all ${
        record.status === "published"
          ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-200/80 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
      onClick={onOpenRoster}
    >
      {record.status}
    </button>
  );
}

function RosterCalendarSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7">
      {Array.from({ length: 35 }, (_, index) => (
        <div key={index} className="min-h-[210px] border-b border-r border-zinc-200/50 p-3 dark:border-white/5 md:min-h-[240px]">
          <span className="skeleton-cell h-5 max-w-[52px]" />
          <span className="skeleton-cell mt-4 h-12 max-w-full" />
          <span className="skeleton-cell mt-2 h-12 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function calendarWeeksForMonth(month: string) {
  const firstOfMonth = parseDateOnly(month);
  const lastOfMonth = new Date(firstOfMonth);
  lastOfMonth.setMonth(lastOfMonth.getMonth() + 1, 0);

  const firstWeekStart = parseDateOnly(weekStartForDateOnly(toDateOnly(firstOfMonth)));
  const weeks: Array<{ weekStart: string; days: string[] }> = [];
  let cursor = firstWeekStart;

  while (cursor <= lastOfMonth || weeks.length < 5) {
    const weekStart = toDateOnly(cursor);
    weeks.push({
      weekStart,
      days: Array.from({ length: 7 }, (_, index) => {
        const day = new Date(cursor);
        day.setDate(cursor.getDate() + index);
        return toDateOnly(day);
      })
    });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

function monthAnchor(value: string) {
  const date = parseDateOnly(value);
  date.setDate(1);
  return toDateOnly(date);
}

function monthAnchorFor(year: number, month: number) {
  return toDateOnly(new Date(year, month, 1));
}

function addMonths(value: string, months: number) {
  const date = parseDateOnly(value);
  date.setMonth(date.getMonth() + months, 1);
  return toDateOnly(date);
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric"
  }).format(parseDateOnly(value));
}

function yearRange(currentYear: number) {
  return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
}

function isSameMonth(value: string, month: string) {
  const date = parseDateOnly(value);
  const monthDate = parseDateOnly(month);
  return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
