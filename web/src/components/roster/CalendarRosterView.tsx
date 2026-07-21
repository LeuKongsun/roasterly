import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import type { Shift } from "../../api";
import { addDays, toDateOnly, weekday, formatShortDate } from "../../utils/date";
import type { TimeframeView } from "../../context/WorkspaceContext";
import { ShiftTile } from "./ShiftTile";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarRosterView({
  canManage,
  weekStart: _weekStart,
  timeframeView,
  days,
  shifts,
  selectedShiftId,
  onSelectShift,
  onMoveShift,
  onAddShift
}: {
  canManage: boolean;
  weekStart: string;
  timeframeView: TimeframeView;
  days: string[];
  shifts: Shift[];
  selectedShiftId: string;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string, memberId?: string) => Promise<void>;
  onAddShift: (day?: string, memberId?: string) => void;
}) {
  const [draggedShiftId, setDraggedShiftId] = useState("");
  const [dropTargetDay, setDropTargetDay] = useState("");
  const todayStr = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${d}`;
  })();

  const [screenWidth, setScreenWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const [selectedDayState, setSelectedDayState] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentSelectedDay = days.includes(selectedDayState) ? selectedDayState : (days.includes(todayStr) ? todayStr : (days[0] || ""));
  const isMobile = screenWidth < 768;
  const visibleDaySet = new Set(days);
  const visibleShifts = shifts.filter((shift) => visibleDaySet.has(toDateOnly(shift.startsAt)));
  const columnMinWidth = days.length === 1 ? 260 : days.length > 7 ? 108 : 120;

  // Calculate dynamic hour range based on shifts (default: 8 AM - 8 PM)
  let minHour = 8;
  let maxHour = 20;

  visibleShifts.forEach((shift) => {
    const start = new Date(shift.startsAt);
    const end = new Date(shift.endsAt);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    if (startHour < minHour) {
      minHour = Math.floor(startHour);
    }
    if (endHour > maxHour) {
      maxHour = Math.ceil(endHour);
    }
  });

  // Apply padding for safety and aesthetics
  minHour = Math.max(0, minHour - 1);
  maxHour = Math.min(24, maxHour + 1);

  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const rowHeight = 70; // 70px per hour slot

  const formatHourLabel = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:00 ${ampm}`;
  };

  const getShiftPositions = (dayShifts: Shift[]) => {
    const sorted = [...dayShifts].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    const columns: Shift[][] = [];
    sorted.forEach((shift) => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if (new Date(last.endsAt).getTime() <= new Date(shift.startsAt).getTime()) {
          columns[i].push(shift);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([shift]);
      }
    });

    const positions = new Map<string, { left: string; width: string; top: number; height: number }>();
    sorted.forEach((shift) => {
      const colIdx = columns.findIndex((col) => col.includes(shift));
      const colCount = columns.length;
      const width = 100 / colCount;
      const left = colIdx * width;

      const start = new Date(shift.startsAt);
      const end = new Date(shift.endsAt);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;

      const top = (startHour - minHour) * rowHeight;
      const height = Math.max(45, (endHour - startHour) * rowHeight);

      positions.set(shift.id, {
        left: `${left}%`,
        width: `${width}%`,
        top,
        height
      });
    });

    return positions;
  };

  function draggedShift() {
    return shifts.find((shift) => shift.id === draggedShiftId) ?? null;
  }

  function shiftsForDay(day: string) {
    return shifts
      .filter((shift) => toDateOnly(shift.startsAt) === day)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  async function dropShift(day: string) {
    const shift = draggedShift();
    setDropTargetDay("");
    setDraggedShiftId("");

    if (!shift || toDateOnly(shift.startsAt) === day) {
      return;
    }

    await onMoveShift(shift, day);
  }

  if (timeframeView === "month") {
    const firstDay = days[0];
    const firstWeekday = new Date(`${firstDay}T00:00:00`).getDay();
    const leadingBlankDays = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const visibleDates = Array.from(
      { length: Math.ceil((leadingBlankDays + days.length) / 7) * 7 },
      (_, index) => {
        const dayOffset = index - leadingBlankDays;
        return dayOffset >= 0 && dayOffset < days.length ? addDays(firstDay, dayOffset) : null;
      }
    );

    if (isMobile) {
      const activeDay = currentSelectedDay;
      const dayShifts = activeDay ? shiftsForDay(activeDay) : [];
      const isActiveDayPast = activeDay ? activeDay < todayStr : false;
      const mobileWeekLabels = ["M", "T", "W", "T", "F", "S", "S"];

      return (
        <div className="flex flex-col gap-4 w-full">
          {/* Calendar grid wrapper */}
          <div className="rounded-2xl border border-zinc-200/50 bg-white/60 p-3.5 shadow-sm dark:border-white/5 dark:bg-zinc-950/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2 text-center">
              {mobileWeekLabels.map((label, idx) => (
                <span
                  key={idx}
                  className="text-[0.65rem] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
              {visibleDates.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isSelected = activeDay === day;
                const hasShifts = shiftsForDay(day).length > 0;
                const dayNumber = new Date(`${day}T00:00:00`).getDate();
                const isPastDay = day < todayStr;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayState(day)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl transition-all duration-200 cursor-pointer relative ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20"
                        : isPastDay
                          ? "text-zinc-400/70 hover:bg-zinc-100 dark:text-zinc-600/70 dark:hover:bg-zinc-900/40"
                          : "text-zinc-800 hover:bg-zinc-150 dark:text-zinc-200 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <span className="text-xs">{dayNumber}</span>
                    {hasShifts && (
                      <span
                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-white" : "bg-indigo-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Section */}
          {activeDay && (
            <div className="rounded-2xl border border-zinc-200/50 bg-white/60 p-4 shadow-sm dark:border-white/5 dark:bg-zinc-950/20 backdrop-blur-xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="flex items-center justify-between border-b border-zinc-200/50 pb-2.5 dark:border-white/5">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {weekday(activeDay)}
                  </p>
                  <h4 className="text-sm font-extrabold text-zinc-950 dark:text-white">
                    {formatShortDate(activeDay)}
                  </h4>
                </div>
                {canManage && !isActiveDayPast && (
                  <button
                    type="button"
                    onClick={() => onAddShift(activeDay)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-all duration-300 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add shift</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {dayShifts.length > 0 ? (
                  dayShifts.map((shift) => (
                    <div key={shift.id} className="min-h-[74px]">
                      <ShiftTile
                        shift={shift}
                        isSelected={shift.id === selectedShiftId}
                        canManage={canManage}
                        onSelect={onSelectShift}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                      />
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    No shifts scheduled for this day.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-200/50 bg-white/20 dark:border-white/5 dark:bg-zinc-950/10">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-zinc-200/50 bg-white/70 dark:border-white/5 dark:bg-zinc-950/40">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="flex h-11 items-center justify-center border-r border-zinc-200/50 text-[0.68rem] font-black uppercase tracking-widest text-indigo-600 last:border-r-0 dark:border-white/5 dark:text-indigo-400"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 bg-white/10 dark:bg-zinc-950/10">
            {visibleDates.map((day, index) => {
              if (!day) {
                const isLastColumn = index % 7 === 6;

                return (
                  <div
                    key={`empty-${index}`}
                    className={`min-h-[150px] border-b border-r border-zinc-200/40 bg-zinc-50/40 dark:border-white/5 dark:bg-white/[0.015] ${
                      isLastColumn ? "border-r-0" : ""
                    }`}
                  />
                );
              }

              const dayShifts = shiftsForDay(day);
              const isDropTarget = dropTargetDay === day;
              const isLastColumn = index % 7 === 6;
              const dayNumber = new Date(`${day}T00:00:00`).getDate();
              const isPastDay = day < todayStr;

              return (
                <div
                  key={day}
                  className={`group relative flex min-h-[150px] flex-col gap-2 border-b border-r border-zinc-200/50 bg-white/45 p-2.5 transition-colors dark:border-white/5 dark:bg-zinc-950/20 ${
                    isLastColumn ? "border-r-0" : ""
                  } ${isDropTarget ? "bg-indigo-50/70 dark:bg-indigo-500/10" : ""} ${isPastDay ? "opacity-60 bg-zinc-100/50 dark:bg-zinc-900/30 cursor-not-allowed" : "cursor-pointer"}`}
                  onDragOver={(event) => {
                    if (!canManage || !draggedShiftId || isPastDay) {
                      return;
                    }

                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTargetDay(day);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDropTargetDay("");
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (canManage && !isPastDay) {
                      void dropShift(day);
                    }
                  }}
                  onClick={(event) => {
                    if (canManage && !isPastDay && event.target === event.currentTarget) {
                      onAddShift(day);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <strong className="text-sm font-black tabular-nums text-zinc-900 dark:text-zinc-100">
                        {dayNumber}
                      </strong>
                      <span className="truncate text-[0.68rem] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {weekday(day)}
                      </span>
                    </div>

                    {canManage && !isPastDay ? (
                      <button
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-indigo-600 text-white opacity-0 shadow-md transition-all duration-300 hover:bg-indigo-500 active:scale-90 group-hover:opacity-100"
                        type="button"
                        title={`Schedule shift on ${formatShortDate(day)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onAddShift(day);
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                    {dayShifts.map((shift) => (
                      <div key={shift.id} className="min-h-[74px]">
                        <ShiftTile
                          shift={shift}
                          isSelected={shift.id === selectedShiftId}
                          canManage={canManage}
                          onSelect={onSelectShift}
                          onDragStart={setDraggedShiftId}
                          onDragEnd={() => {
                            setDraggedShiftId("");
                            setDropTargetDay("");
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex border border-zinc-200/50 dark:border-white/5 rounded-xl bg-white/20 dark:bg-zinc-950/10 overflow-hidden">
      <div className="w-16 flex-none flex flex-col border-r border-zinc-200/50 dark:border-white/5 bg-white/60 dark:bg-zinc-950/40">
        <div className="h-[57px] border-b border-zinc-200/50 dark:border-white/5" />
        <div className="flex flex-col relative">
          {hours.map((hour) => (
            <div key={hour} className="flex items-start justify-end pr-2.5 pt-1.5 text-[0.68rem] font-bold text-zinc-450 dark:text-zinc-500 select-none" style={{ height: `${rowHeight}px` }}>
              <span>{formatHourLabel(hour)}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="grid flex-grow overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${columnMinWidth}px, 1fr))` }}
      >
        {days.map((day) => {
          const dayShifts = shiftsForDay(day);
          const shiftPositions = getShiftPositions(dayShifts);
          const isDropTarget = dropTargetDay === day;
          const isPastDay = day < todayStr;

          return (
            <div
              key={day}
              className={`flex flex-col border-r border-zinc-200/50 dark:border-white/5 last:border-r-0 transition-all duration-300 ${isDropTarget ? "bg-zinc-800/[0.03] dark:bg-white/[0.03]" : ""} ${isPastDay ? "opacity-60 bg-zinc-100/50 dark:bg-zinc-900/30 cursor-not-allowed" : ""}`}
              onDragOver={(event) => {
                if (!canManage || !draggedShiftId || isPastDay) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetDay(day);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropTargetDay("");
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (canManage && !isPastDay) {
                  void dropShift(day);
                }
              }}
            >
              <div className="flex flex-col gap-0.5 items-center justify-center h-[57px] border-b border-zinc-200/50 dark:border-white/5 bg-white/60 dark:bg-zinc-950/40 select-none">
                <span className="text-[0.68rem] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{weekday(day)}</span>
                <strong className="text-sm font-black text-zinc-800 dark:text-zinc-300">{formatShortDate(day)}</strong>
              </div>

              <div
                className={`relative bg-transparent transition-colors select-none ${isPastDay ? "cursor-not-allowed" : "cursor-pointer"}`}
                style={{ height: `${(maxHour - minHour) * rowHeight}px` }}
                onClick={(e) => {
                  if (canManage && !isPastDay && e.target === e.currentTarget) {
                    onAddShift(day);
                  }
                }}
              >
                {hours.map((hour, idx) => (
                  <div
                    key={hour}
                    style={{
                      position: "absolute",
                      top: `${idx * rowHeight}px`,
                      left: 0,
                      right: 0,
                      height: "1px",
                      borderTop: "1px dashed var(--border-primary)"
                    }}
                  />
                ))}

                {dayShifts.map((shift) => {
                  const pos = shiftPositions.get(shift.id);
                  if (!pos) return null;

                  return (
                    <div
                      key={shift.id}
                      style={{
                        position: "absolute",
                        top: `${pos.top}px`,
                        height: `${pos.height}px`,
                        left: pos.left,
                        width: pos.width,
                        padding: "3px"
                      }}
                    >
                      <ShiftTile
                        shift={shift}
                        isSelected={shift.id === selectedShiftId}
                        canManage={canManage}
                        onSelect={onSelectShift}
                        onDragStart={setDraggedShiftId}
                        onDragEnd={() => {
                          setDraggedShiftId("");
                          setDropTargetDay("");
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
