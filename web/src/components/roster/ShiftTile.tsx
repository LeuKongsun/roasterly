import { useState } from "react";
import { Clock } from "lucide-react";
import type { Shift } from "../../api";
import { timeRange, calculateHours } from "../../utils/date";

const MEMBER_PALETTES = [
  {
    // Blue / Sky
    tile: "bg-sky-50/60 border-sky-200/80 hover:bg-sky-50/90 dark:bg-sky-950/20 dark:border-sky-500/20 dark:hover:bg-sky-950/30 dark:hover:border-sky-400/40 dark:hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-sky-900 dark:text-sky-200",
    badge: "bg-sky-200/50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300 dark:border dark:border-sky-500/20",
    duration: "bg-sky-200/40 text-sky-800 dark:bg-sky-500/5 dark:text-sky-300",
    clock: "text-sky-500/70 dark:text-sky-400/60",
    time: "text-sky-700/80 dark:text-zinc-400"
  },
  {
    // Pink
    tile: "bg-pink-50/60 border-pink-200/80 hover:bg-pink-50/90 dark:bg-pink-950/20 dark:border-pink-500/20 dark:hover:bg-pink-950/30 dark:hover:border-pink-400/40 dark:hover:shadow-[0_0_15px_rgba(244,114,182,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-pink-900 dark:text-pink-200",
    badge: "bg-pink-200/50 text-pink-800 dark:bg-pink-500/10 dark:text-pink-300 dark:border dark:border-pink-500/20",
    duration: "bg-pink-200/40 text-pink-800 dark:bg-pink-500/5 dark:text-pink-300",
    clock: "text-pink-500/70 dark:text-pink-400/60",
    time: "text-pink-700/80 dark:text-zinc-400"
  },
  {
    // Emerald / Green
    tile: "bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-50/90 dark:bg-emerald-950/20 dark:border-emerald-500/20 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-400/40 dark:hover:shadow-[0_0_15px_rgba(52,211,153,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-emerald-900 dark:text-emerald-200",
    badge: "bg-emerald-200/50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border dark:border-emerald-500/20",
    duration: "bg-emerald-200/40 text-emerald-800 dark:bg-emerald-500/5 dark:text-emerald-300",
    clock: "text-emerald-500/70 dark:text-emerald-400/60",
    time: "text-emerald-700/80 dark:text-zinc-400"
  },
  {
    // Amber / Yellow
    tile: "bg-amber-50/60 border-amber-200/80 hover:bg-amber-50/90 dark:bg-amber-950/20 dark:border-amber-500/20 dark:hover:bg-amber-950/30 dark:hover:border-amber-400/40 dark:hover:shadow-[0_0_15px_rgba(251,191,36,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-amber-900 dark:text-amber-200",
    badge: "bg-amber-200/50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 dark:border dark:border-amber-500/20",
    duration: "bg-amber-200/40 text-amber-800 dark:bg-amber-500/5 dark:text-amber-300",
    clock: "text-amber-500/70 dark:text-amber-400/60",
    time: "text-amber-700/80 dark:text-zinc-400"
  },
  {
    // Indigo / Violet
    tile: "bg-indigo-50/60 border-indigo-200/80 hover:bg-indigo-50/90 dark:bg-indigo-950/20 dark:border-indigo-500/20 dark:hover:bg-indigo-950/30 dark:hover:border-indigo-400/40 dark:hover:shadow-[0_0_15px_rgba(129,140,248,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-indigo-900 dark:text-indigo-200",
    badge: "bg-indigo-200/50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border dark:border-indigo-500/20",
    duration: "bg-indigo-200/40 text-indigo-800 dark:bg-indigo-500/5 dark:text-indigo-300",
    clock: "text-indigo-500/70 dark:text-indigo-400/60",
    time: "text-indigo-700/80 dark:text-zinc-400"
  },
  {
    // Purple
    tile: "bg-purple-50/60 border-purple-200/80 hover:bg-purple-50/90 dark:bg-purple-950/20 dark:border-purple-500/20 dark:hover:bg-purple-950/30 dark:hover:border-purple-400/40 dark:hover:shadow-[0_0_15px_rgba(192,132,252,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-purple-900 dark:text-purple-200",
    badge: "bg-purple-200/50 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300 dark:border dark:border-purple-500/20",
    duration: "bg-purple-200/40 text-purple-800 dark:bg-purple-500/5 dark:text-purple-300",
    clock: "text-purple-500/70 dark:text-purple-400/60",
    time: "text-purple-700/80 dark:text-zinc-400"
  },
  {
    // Orange
    tile: "bg-orange-50/60 border-orange-200/80 hover:bg-orange-50/90 dark:bg-orange-950/20 dark:border-orange-500/20 dark:hover:bg-orange-950/30 dark:hover:border-orange-400/40 dark:hover:shadow-[0_0_15px_rgba(251,146,60,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-orange-900 dark:text-orange-200",
    badge: "bg-orange-200/50 text-orange-800 dark:bg-orange-500/10 dark:text-orange-300 dark:border dark:border-orange-500/20",
    duration: "bg-orange-200/40 text-orange-800 dark:bg-orange-500/5 dark:text-orange-300",
    clock: "text-orange-500/70 dark:text-orange-400/60",
    time: "text-orange-700/80 dark:text-zinc-400"
  },
  {
    // Teal
    tile: "bg-teal-50/60 border-teal-200/80 hover:bg-teal-50/90 dark:bg-teal-950/20 dark:border-teal-500/20 dark:hover:bg-teal-950/30 dark:hover:border-teal-400/40 dark:hover:shadow-[0_0_15px_rgba(45,212,191,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-teal-900 dark:text-teal-200",
    badge: "bg-teal-200/50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-300 dark:border dark:border-teal-500/20",
    duration: "bg-teal-200/40 text-teal-800 dark:bg-teal-500/5 dark:text-teal-300",
    clock: "text-teal-500/70 dark:text-teal-400/60",
    time: "text-teal-700/80 dark:text-zinc-400"
  },
  {
    // Rose
    tile: "bg-rose-50/60 border-rose-200/80 hover:bg-rose-50/90 dark:bg-rose-950/20 dark:border-rose-500/20 dark:hover:bg-rose-950/30 dark:hover:border-rose-400/40 dark:hover:shadow-[0_0_15px_rgba(251,113,133,0.15)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
    text: "text-rose-900 dark:text-rose-200",
    badge: "bg-rose-200/50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 dark:border dark:border-rose-500/20",
    duration: "bg-rose-200/40 text-rose-800 dark:bg-rose-500/5 dark:text-rose-300",
    clock: "text-rose-500/70 dark:text-rose-400/60",
    time: "text-rose-700/80 dark:text-zinc-400"
  }
];

export function getShiftColorStyles(memberId: string | null, memberName: string | null) {
  const str = memberId || memberName || "default";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MEMBER_PALETTES.length;
  return MEMBER_PALETTES[index];
}

export function ShiftTile({
  shift,
  isSelected,
  canManage,
  onSelect,
  onDragStart,
  onDragEnd
}: {
  shift: Shift;
  isSelected: boolean;
  canManage: boolean;
  onSelect: (shiftId: string) => void;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const colors = getShiftColorStyles(shift.memberId, shift.member.displayName);

  return (
    <button
      className={`flex flex-col justify-start items-start gap-2 w-full rounded-xl border p-3 text-left text-inherit transition-all duration-300 active:scale-[0.98] active:cursor-grabbing overflow-hidden h-full min-h-0 ${colors.tile} ${
        isSelected ? "ring-2 ring-indigo-500/80 border-indigo-400" : ""
      } ${canManage ? "cursor-grab" : ""}`}
      type="button"
      draggable={canManage}
      onClick={() => {
        if (!canManage || isDragging) {
          return;
        }

        onSelect(shift.id);
      }}
      onDragStart={(event) => {
        if (!canManage) {
          event.preventDefault();
          return;
        }

        setIsDragging(true);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", shift.id);
        onDragStart(shift.id);
      }}
      onDragEnd={() => {
        onDragEnd();
        window.setTimeout(() => setIsDragging(false), 0);
      }}
    >
      <div className="flex flex-col items-start gap-1 w-full">
        <strong className={`text-xs font-bold leading-tight block truncate w-full ${colors.text}`}>
          {shift.member.displayName}
        </strong>
        {shift.roleName ? (
          <em className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.58rem] font-black uppercase tracking-wider not-italic ${colors.badge}`}>
            {shift.roleName}
          </em>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-1 text-[0.7rem] w-full mt-1.5 border-t border-white/5 pt-1.5">
        <div className="flex items-center gap-1 w-full truncate">
          <Clock size={11} className={`flex-none ${colors.clock}`} />
          <span className={colors.time}>{timeRange(shift.startsAt, shift.endsAt)}</span>
        </div>
        <span className={`rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold ${colors.duration} mt-0.5`}>
          {calculateHours(shift.startsAt, shift.endsAt)}
        </span>
      </div>
    </button>
  );
}
