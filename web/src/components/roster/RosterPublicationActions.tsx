import { useState } from "react";
import { CalendarDays, ChevronRight, Check } from "lucide-react";
import type { RosterPublication, Member } from "../../api";

export function RosterPublicationActions({
  canManage,
  publication,
  members,
  userEmail,
  onPublish,
  onAcknowledge
}: {
  canManage: boolean;
  publication: RosterPublication | null;
  members: Member[];
  userEmail: string;
  onPublish: () => Promise<void>;
  onAcknowledge: () => Promise<void>;
}) {
  const [isWorking, setIsWorking] = useState(false);
  const acknowledgedMemberIds = new Set(
    publication?.acknowledgements.map((acknowledgement) => acknowledgement.member.id) ?? []
  );
  const currentMember = members.find((member) => member.user.email === userEmail);
  const hasAcknowledged = currentMember ? acknowledgedMemberIds.has(currentMember.id) : false;

  async function run(action: () => Promise<void>) {
    setIsWorking(true);

    try {
      await action();
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <>
      {publication ? (
        <button
          className="inline-flex min-h-[42px] h-[42px] items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 px-4 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white cursor-pointer w-full md:w-auto transition-all duration-300"
          type="button"
          disabled={isWorking || hasAcknowledged}
          onClick={() => void run(onAcknowledge)}
        >
          {hasAcknowledged ? (
            <>
              <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Acknowledged</span>
            </>
          ) : (
            <>
              <ChevronRight size={16} />
              <span>Acknowledge</span>
            </>
          )}
        </button>
      ) : null}
      {canManage ? (
        <button
          className="inline-flex min-h-[42px] h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer w-full md:w-auto transition-all duration-300 shadow-[0_4px_15px_rgba(99,102,241,0.15)] dark:shadow-[0_4px_15px_rgba(99,102,241,0.25)]"
          type="button"
          disabled={isWorking}
          onClick={() => void run(onPublish)}
        >
          <CalendarDays size={16} />
          {publication ? "Republish" : "Publish"}
        </button>
      ) : null}
    </>
  );
}
