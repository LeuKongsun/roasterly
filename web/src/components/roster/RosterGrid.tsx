import { useContext } from "react";
import type { Shift, Member } from "../../api";
import { addDays, currentMonday } from "../../utils/date";
import { WorkspaceContext } from "../../context/WorkspaceContext";
import { CalendarRosterView } from "./CalendarRosterView";
import { TimelineRosterView } from "./TimelineRosterView";

export function RosterGrid({
  canManage,
  weekStart,
  shifts,
  selectedShiftId,
  onSelectShift,
  onMoveShift,
  boardView,
  onAddShift,
  members
}: {
  canManage: boolean;
  weekStart: string;
  shifts: Shift[];
  selectedShiftId: string;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string, memberId?: string) => Promise<void>;
  boardView: "calendar" | "timeline";
  onAddShift: (day?: string, memberId?: string) => void;
  members: Member[];
}) {
  const context = useContext(WorkspaceContext);

  if (weekStart === "new") {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-xl p-6 text-center gap-4">
        <div>
          <p className="m-0 text-sm text-zinc-550 dark:text-zinc-400 font-medium">Please select a week start date from the date picker above to start creating your roster.</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Or use the shortcut below to quickly create a roster for the current week.</p>
        </div>
        {context && (
          <button
            type="button"
            onClick={() => context.onOpenRoster(currentMonday())}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-transparent bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 px-4 py-2 font-semibold active:scale-95 transition-all duration-300 cursor-pointer text-xs"
          >
            Create for Current Week
          </button>
        )}
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  if (boardView === "calendar") {
    return (
      <CalendarRosterView
        canManage={canManage}
        weekStart={weekStart}
        days={days}
        shifts={shifts}
        selectedShiftId={selectedShiftId}
        onSelectShift={onSelectShift}
        onMoveShift={onMoveShift}
        onAddShift={onAddShift}
      />
    );
  }

  return (
    <TimelineRosterView
      canManage={canManage}
      weekStart={weekStart}
      days={days}
      shifts={shifts}
      selectedShiftId={selectedShiftId}
      onSelectShift={onSelectShift}
      onMoveShift={onMoveShift}
      onAddShift={onAddShift}
      members={members}
    />
  );
}
