import { useState } from "react";
import { Plus } from "lucide-react";
import type { Shift, Member } from "../../api";
import { toDateOnly, weekday, formatShortDate } from "../../utils/date";
import { ShiftTile } from "./ShiftTile";

export function TimelineRosterView({
  canManage,
  weekStart: _weekStart,
  days,
  shifts,
  selectedShiftId,
  onSelectShift,
  onMoveShift,
  onAddShift,
  members
}: {
  canManage: boolean;
  weekStart: string;
  days: string[];
  shifts: Shift[];
  selectedShiftId: string;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string, memberId?: string) => Promise<void>;
  onAddShift: (day?: string, memberId?: string) => void;
  members: Member[];
}) {
  const [draggedShiftId, setDraggedShiftId] = useState("");
  const staffMembers = members.filter((m) => m.role !== "manager");
  const [dropTarget, setDropTarget] = useState<{ memberId: string; day: string } | null>(null);
  const todayStr = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${d}`;
  })();
  const dayColumnWidth = days.length === 1 ? 240 : days.length > 7 ? 112 : 130;

  function draggedShift() {
    return shifts.find((shift) => shift.id === draggedShiftId) ?? null;
  }

  async function handleDrop(memberId: string, day: string) {
    const shift = draggedShift();
    setDropTarget(null);
    setDraggedShiftId("");

    if (!shift) {
      return;
    }

    if (shift.memberId === memberId && toDateOnly(shift.startsAt) === day) {
      return;
    }

    await onMoveShift(shift, day, memberId);
  }

  return (
    <div className="border border-zinc-200/50 dark:border-white/5 rounded-xl bg-white/20 dark:bg-zinc-950/10 overflow-hidden">
      <div className="flex flex-col overflow-x-auto">
        <div className="flex border-b border-zinc-200/50 dark:border-white/5 last:border-b-0 min-w-max bg-white/60 dark:bg-zinc-950/40 border-b-2 border-b-zinc-200/50 dark:border-b-white/10">
          <div className="w-44 flex-none border-r-2 border-zinc-200/50 dark:border-r-white/10 bg-white/30 dark:bg-zinc-950/20 flex items-center p-4 select-none font-black text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-widest">
            <strong>Staff</strong>
          </div>
          {days.map((day) => (
            <div
              key={day}
              className="flex-grow p-2 border-r border-zinc-200/50 dark:border-r-white/5 last:border-r-0 relative min-h-0 h-12 flex flex-col items-center justify-center select-none"
              style={{ width: `${dayColumnWidth}px`, minWidth: `${dayColumnWidth}px` }}
            >
              <span className="text-[0.68rem] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{weekday(day)}</span>
              <strong className="text-sm font-black text-zinc-800 dark:text-zinc-300">{formatShortDate(day)}</strong>
            </div>
          ))}
        </div>

        {staffMembers.map((member) => (
          <div key={member.id} className="flex border-b border-zinc-200/50 dark:border-b-white/5 last:border-b-0 min-w-max bg-transparent">
            <div className="w-44 flex-none border-r-2 border-zinc-200/50 dark:border-r-white/10 bg-white/30 dark:bg-zinc-950/20 flex items-center p-4 select-none">
              <div className="flex flex-col gap-0.5">
                <strong className="text-sm font-bold text-zinc-950 dark:text-white">{member.displayName}</strong>
                <span className="text-[0.68rem] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{member.role}</span>
              </div>
            </div>

            {days.map((day) => {
              const cellShifts = shifts.filter(
                (shift) => shift.memberId === member.id && toDateOnly(shift.startsAt) === day
              );
              const isDropTarget = dropTarget?.memberId === member.id && dropTarget?.day === day;
              const isPastDay = day < todayStr;

              return (
                <div
                  key={day}
                  className={`flex-grow min-h-[90px] p-3 border-r border-zinc-200/50 dark:border-r-white/5 last:border-r-0 relative flex flex-col justify-between transition-colors group ${isDropTarget ? "bg-zinc-800/[0.03] dark:bg-white/[0.03] border-zinc-200 dark:border-white/10" : ""} ${isPastDay ? "opacity-60 bg-zinc-100/50 dark:bg-zinc-900/30 cursor-not-allowed" : ""}`}
                  style={{ width: `${dayColumnWidth}px`, minWidth: `${dayColumnWidth}px` }}
                  onDragOver={(event) => {
                    if (!canManage || !draggedShiftId || isPastDay) {
                      return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTarget({ memberId: member.id, day });
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDropTarget(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (canManage && !isPastDay) {
                      void handleDrop(member.id, day);
                    }
                  }}
                >
                  <div className="flex flex-col gap-1.5 w-full">
                    {cellShifts.map((shift) => (
                      <ShiftTile
                        key={shift.id}
                        shift={shift}
                        isSelected={shift.id === selectedShiftId}
                        canManage={canManage}
                        onSelect={onSelectShift}
                        onDragStart={setDraggedShiftId}
                        onDragEnd={() => {
                          setDraggedShiftId("");
                          setDropTarget(null);
                        }}
                      />
                    ))}
                  </div>

                  {canManage && !isPastDay ? (
                    <button
                      className="absolute bottom-2 right-2 opacity-0 pointer-events-none transition-all duration-300 flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white shadow-md hover:bg-indigo-500 active:scale-90 cursor-pointer group-hover:opacity-100 group-hover:pointer-events-auto"
                      type="button"
                      title={`Schedule shift for ${member.displayName} on ${formatShortDate(day)}`}
                      onClick={() => onAddShift(day, member.id)}
                    >
                      <Plus size={14} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
