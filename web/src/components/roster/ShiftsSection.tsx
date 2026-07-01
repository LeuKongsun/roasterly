import { Plus } from "lucide-react";
import type { Shift, RosterRecord, RosterPublication, Member } from "../../api";
import { formatDate, weekStartForDateOnly, currentMonday } from "../../utils/date";
import type { RosterView } from "../../context/WorkspaceContext";
import { RosterRecordsView } from "./RosterRecordsView";
import { RosterGrid } from "./RosterGrid";
import { RosterPublicationActions } from "./RosterPublicationActions";

export function ShiftsSection({
  view,
  boardView,
  onBoardViewChange,
  isLoading,
  canManage,
  weekStart,
  records,
  shifts,
  selectedShiftId,
  publication,
  members,
  userEmail,
  onAddShift,
  onEditShift,
  onLoadRosterWeeks,
  onCreateRoster,
  onOpenRoster,
  onSelectShift,
  onMoveShift,
  onPublish,
  onAcknowledge
}: {
  view: RosterView;
  boardView: "calendar" | "timeline";
  onBoardViewChange: (view: "calendar" | "timeline") => void;
  isLoading: boolean;
  canManage: boolean;
  weekStart: string;
  records: RosterRecord[];
  shifts: Shift[];
  selectedShiftId: string;
  publication: RosterPublication | null;
  members: Member[];
  userEmail: string;
  onAddShift: (day?: string, memberId?: string) => void;
  onEditShift: (shift: Shift) => void;
  onLoadRosterWeeks: (weekStarts: string[]) => Promise<Shift[]>;
  onCreateRoster: (weekStart?: string) => void;
  onOpenRoster: (weekStart: string) => void;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string, memberId?: string) => Promise<void>;
  onPublish: () => Promise<void>;
  onAcknowledge: () => Promise<void>;
}) {
  if (view === "records") {
    return (
      <RosterRecordsView
        isLoading={isLoading}
        canManage={canManage}
        records={records}
        onAddShift={onAddShift}
        onEditShift={onEditShift}
        onLoadRosterWeeks={onLoadRosterWeeks}
        onOpenRoster={onOpenRoster}
      />
    );
  }

  return (
    <>
      <div className="mb-3.5 flex justify-between gap-3.5 flex-col items-stretch md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Roster board</p>
          <div className="flex items-center gap-4 mt-1">
            <h3 className="mb-0 text-base font-semibold text-zinc-950 dark:text-white" id="roster-title">
              {weekStart === "new" ? "New Roster" : `Week of ${formatDate(weekStart)}`}
            </h3>
            {canManage && weekStart === "new" && (
              <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                <span className="sr-only">Select week</span>
                <input
                  type="date"
                  value={currentMonday()}
                  onChange={(event) => {
                    if (event.target.value) {
                      onOpenRoster(weekStartForDateOnly(event.target.value));
                    }
                  }}
                  className="min-h-[32px] rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            )}
            <div className="flex items-center rounded-xl bg-zinc-150/80 dark:bg-zinc-900/60 p-0.5 border border-zinc-200/60 dark:border-white/5">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  boardView === "calendar"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
                onClick={() => onBoardViewChange("calendar")}
              >
                Calendar
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  boardView === "timeline"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
                onClick={() => onBoardViewChange("timeline")}
              >
                Timeline
              </button>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto items-end">
          {weekStart !== "new" && (
            <RosterPublicationActions
              canManage={canManage}
              publication={publication}
              members={members}
              userEmail={userEmail}
              onPublish={onPublish}
              onAcknowledge={onAcknowledge}
            />
          )}
          {canManage && weekStart !== "new" ? (
            <button className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer h-[42px] w-full md:w-auto md:min-w-[132px] shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300" type="button" onClick={() => onAddShift()}>
              <Plus size={16} />
              Add shift
            </button>
          ) : null}
        </div>
      </div>
      <RosterGrid
        canManage={canManage}
        weekStart={weekStart}
        shifts={shifts}
        selectedShiftId={selectedShiftId}
        onSelectShift={onSelectShift}
        onMoveShift={onMoveShift}
        boardView={boardView}
        onAddShift={onAddShift}
        members={members}
      />
    </>
  );
}
