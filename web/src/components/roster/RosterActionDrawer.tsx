import type { Shift, ShiftInput, Member } from "../../api";
import type { RosterAction } from "../../context/WorkspaceContext";
import { useDismissOnOutsidePointer } from "../../hooks/useDismissOnOutsidePointer";
import { ShiftForm } from "./ShiftForm";
import { MemberForm } from "../staff/MemberForm";

export function RosterActionDrawer({
  activeAction,
  members,
  weekStart,
  selectedShift,
  defaultShiftDate,
  defaultShiftMemberId,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
  onCancel,
  onAddMember,
  onError
}: {
  activeAction: RosterAction | null;
  members: Member[];
  weekStart: string;
  selectedShift: Shift | null;
  defaultShiftDate?: string;
  defaultShiftMemberId?: string;
  onCreateShift: (input: ShiftInput) => Promise<void>;
  onUpdateShift: (shiftId: string, input: ShiftInput) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  onCancel: () => void;
  onAddMember: (input: {
    email: string;
    displayName?: string;
    phoneNumber?: string;
    role: "manager" | "staff";
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const dialogRef = useDismissOnOutsidePointer<HTMLDivElement>(activeAction !== null, onCancel);

  if (!activeAction) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 backdrop-blur-sm p-5" role="presentation">
      <div
        ref={dialogRef}
        className="grid max-h-[min(760px,calc(100vh-40px))] w-full max-w-[520px] gap-4 overflow-auto rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950/90 backdrop-blur-2xl p-6 md:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-action-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200/50 dark:border-white/5 pb-3">
          <div>
            <p className="mb-1 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{drawerEyebrow(activeAction, selectedShift)}</p>
            <h4 id="roster-action-title" className="m-0 text-xl font-extrabold text-zinc-950 dark:text-white">{drawerTitle(activeAction, selectedShift)}</h4>
          </div>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white cursor-pointer active:scale-95 transition-all duration-300"
            onClick={onCancel}
          >
            Close
          </button>
        </div>

        {activeAction === "shift" ? (
          <ShiftForm
            members={members}
            weekStart={weekStart}
            selectedShift={selectedShift}
            defaultShiftDate={defaultShiftDate}
            defaultShiftMemberId={defaultShiftMemberId}
            onCreate={onCreateShift}
            onUpdate={onUpdateShift}
            onDelete={onDeleteShift}
            onCancelEdit={onCancel}
            onError={onError}
          />
        ) : null}
        {activeAction === "member" ? <MemberForm onAdd={onAddMember} onError={onError} /> : null}
      </div>
    </div>
  );
}

function drawerEyebrow(action: RosterAction, selectedShift: Shift | null) {
  if (action === "shift") {
    return selectedShift ? "Edit" : "Assign";
  }

  if (action === "member") {
    return "Team";
  }
}

function drawerTitle(action: RosterAction, selectedShift: Shift | null) {
  if (action === "shift") {
    return selectedShift ? "Selected shift" : "New shift";
  }

  if (action === "member") {
    return "Add staff";
  }
}
