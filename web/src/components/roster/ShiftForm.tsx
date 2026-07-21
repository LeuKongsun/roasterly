import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import type { Shift, ShiftInput, Member } from "../../api";
import { toDateOnly, toTimeInputValue, localDateTimeToIso } from "../../utils/date";
import { errorMessage } from "../../utils/errors";

function getTodayStr() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ShiftForm({
  members,
  weekStart,
  selectedShift,
  defaultShiftDate,
  defaultShiftMemberId,
  onCreate,
  onUpdate,
  onDelete,
  onCancelEdit,
  onError
}: {
  members: Member[];
  weekStart: string;
  selectedShift: Shift | null;
  defaultShiftDate?: string;
  defaultShiftMemberId?: string;
  onCreate: (input: ShiftInput) => Promise<void>;
  onUpdate: (shiftId: string, input: ShiftInput) => Promise<void>;
  onDelete: (shiftId: string) => Promise<void>;
  onCancelEdit: () => void;
  onError: (message: string) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(weekStart);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [roleName, setRoleName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffMembers = members.filter((m) => m.role !== "manager");

  useEffect(() => {
    const todayStr = getTodayStr();
    if (selectedShift) {
      const shiftDate = toDateOnly(selectedShift.startsAt);
      setMemberId(selectedShift.memberId);
      setDate(shiftDate);
      setStartTime(toTimeInputValue(selectedShift.startsAt));
      setEndTime(toTimeInputValue(selectedShift.endsAt));
      setRoleName(selectedShift.roleName ?? "");
      setNotes(selectedShift.notes ?? "");
      if (shiftDate < todayStr) {
        onError("Shifts cannot be created or edited for past dates");
      } else {
        onError("");
      }
      return;
    }

    const initialDate = defaultShiftDate || weekStart;
    setDate(initialDate);
    setMemberId(defaultShiftMemberId || (staffMembers[0]?.id ?? ""));
    setStartTime("09:00");
    setEndTime("17:00");
    setRoleName("");
    setNotes("");
    if (initialDate < todayStr) {
      onError("Shifts cannot be created or edited for past dates");
    } else {
      onError("");
    }
  }, [selectedShift, weekStart, defaultShiftDate, defaultShiftMemberId, members, onError]);

  useEffect(() => {
    if (!memberId && staffMembers[0]) {
      setMemberId(defaultShiftMemberId || staffMembers[0].id);
    }
  }, [memberId, members, defaultShiftMemberId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    if (date < getTodayStr()) {
      onError("Shifts cannot be created or edited for past dates");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        memberId,
        startsAt: localDateTimeToIso(date, startTime),
        endsAt: localDateTimeToIso(date, endTime),
        roleName: roleName || undefined,
        notes: notes || undefined
      };

      if (selectedShift) {
        await onUpdate(selectedShift.id, payload);
      } else {
        await onCreate(payload);
        setRoleName("");
        setNotes("");
      }
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeSelectedShift() {
    if (!selectedShift) {
      return;
    }

    onError("");
    setIsSubmitting(true);

    try {
      await onDelete(selectedShift.id);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid min-w-0 gap-4 w-full mt-2" onSubmit={submit}>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
        Staff
        <select
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
          required
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        >
          {staffMembers.map((member) => (
            <option key={member.id} value={member.id} className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100">
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
        <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
          Date
          <input
            value={date}
            onChange={(event) => {
              const newDate = event.target.value;
              setDate(newDate);
              if (newDate && newDate < getTodayStr()) {
                onError("Shifts cannot be created or edited for past dates");
              } else {
                onError("");
              }
            }}
            type="date"
            min={getTodayStr()}
            required
            className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
          Start
          <input
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            type="time"
            required
            className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
          End
          <input
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            type="time"
            required
            className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
          />
        </label>
      </div>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
        Role
        <input
          value={roleName}
          onChange={(event) => setRoleName(event.target.value)}
          placeholder="Floor, bar, admin"
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
        />
      </label>
      <label className="grid min-w-0 gap-1.5 text-[0.78rem] font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Shift details or instructions..."
          className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 resize-y"
        />
      </label>
      <button
        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer w-full min-w-0 whitespace-normal active:scale-95 shadow-[0_4px_15px_rgba(99,102,241,0.25)] transition-all duration-300 mt-2"
        type="submit"
        disabled={!staffMembers.length || isSubmitting || date < getTodayStr()}
      >
        <Plus size={16} />
        {isSubmitting ? "Saving" : selectedShift ? "Update shift" : "Create shift"}
      </button>
      {selectedShift ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 mt-1">
          <button
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-900 px-4 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white cursor-pointer w-full min-w-0 whitespace-normal transition-all duration-300"
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-transparent bg-rose-600 px-4 font-semibold text-white hover:bg-rose-500 cursor-pointer w-full min-w-0 whitespace-normal active:scale-95 transition-all duration-300"
            type="button"
            onClick={() => void removeSelectedShift()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting" : "Delete shift"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
