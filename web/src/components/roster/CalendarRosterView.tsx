import { useState } from "react";
import type { Shift } from "../../api";
import { toDateOnly, weekday, formatShortDate } from "../../utils/date";
import { ShiftTile } from "./ShiftTile";

export function CalendarRosterView({
  canManage,
  weekStart: _weekStart,
  days,
  shifts,
  selectedShiftId,
  onSelectShift,
  onMoveShift,
  onAddShift
}: {
  canManage: boolean;
  weekStart: string;
  days: string[];
  shifts: Shift[];
  selectedShiftId: string;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string, memberId?: string) => Promise<void>;
  onAddShift: (day?: string, memberId?: string) => void;
}) {
  const [draggedShiftId, setDraggedShiftId] = useState("");
  const [dropTargetDay, setDropTargetDay] = useState("");

  // Calculate dynamic hour range based on shifts (default: 8 AM - 8 PM)
  let minHour = 8;
  let maxHour = 20;

  shifts.forEach((shift) => {
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

  async function dropShift(day: string) {
    const shift = draggedShift();
    setDropTargetDay("");
    setDraggedShiftId("");

    if (!shift || toDateOnly(shift.startsAt) === day) {
      return;
    }

    await onMoveShift(shift, day);
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

      <div className="flex-grow grid grid-cols-[repeat(7,minmax(120px,1fr))] overflow-x-auto">
        {days.map((day) => {
          const dayShifts = shifts.filter((shift) => toDateOnly(shift.startsAt) === day);
          const shiftPositions = getShiftPositions(dayShifts);
          const isDropTarget = dropTargetDay === day;

          return (
            <div
              key={day}
              className={`flex flex-col border-r border-zinc-200/50 dark:border-white/5 last:border-r-0 transition-all duration-300 ${isDropTarget ? "bg-zinc-800/[0.03] dark:bg-white/[0.03]" : ""}`}
              onDragOver={(event) => {
                if (!canManage || !draggedShiftId) {
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
                if (canManage) {
                  void dropShift(day);
                }
              }}
            >
              <div className="flex flex-col gap-0.5 items-center justify-center h-[57px] border-b border-zinc-200/50 dark:border-white/5 bg-white/60 dark:bg-zinc-950/40 select-none">
                <span className="text-[0.68rem] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{weekday(day)}</span>
                <strong className="text-sm font-black text-zinc-800 dark:text-zinc-300">{formatShortDate(day)}</strong>
              </div>

              <div
                className="relative bg-transparent transition-colors cursor-pointer select-none"
                style={{ height: `${(maxHour - minHour) * rowHeight}px` }}
                onClick={(e) => {
                  if (canManage && e.target === e.currentTarget) {
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
