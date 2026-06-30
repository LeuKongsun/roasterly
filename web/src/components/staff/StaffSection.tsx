import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { Member } from "../../api";
import { errorMessage } from "../../utils/errors";
import { MemberList } from "./MemberList";
import { MemberEditDialog } from "./MemberEditDialog";

export function StaffSection({
  isLoading,
  members,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onError
}: {
  isLoading: boolean;
  members: Member[];
  onAddStaff: () => void;
  onUpdateStaff: (
    memberId: string,
    input: {
      email?: string;
      displayName?: string;
      phoneNumber?: string | null;
      role?: "manager" | "staff";
      password?: string;
    }
  ) => Promise<void>;
  onDeleteStaff: (memberId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  return (
    <>
      <div className="mb-3.5 flex justify-between gap-3.5 flex-col items-stretch md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Staff</p>
          <h3 className="mb-0 text-base font-semibold text-zinc-950 dark:text-white" id="members-title">Staff list</h3>
        </div>
        <button
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border px-3.5 font-semibold border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 text-zinc-955 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-850 active:scale-95 transition-all duration-300 w-full md:w-auto md:min-w-[132px] cursor-pointer"
          type="button"
          onClick={onAddStaff}
        >
          <UserPlus size={17} />
          Add staff
        </button>
      </div>
      <MemberList
        isLoading={isLoading}
        members={members}
        onEdit={setEditingMember}
        onDelete={async (member) => {
          if (!window.confirm(`Delete ${member.displayName}? Their shifts will also be removed.`)) {
            return;
          }

          onError("");

          try {
            await onDeleteStaff(member.id);
          } catch (err) {
            onError(errorMessage(err));
          }
        }}
      />
      {editingMember ? (
        <MemberEditDialog
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={async (memberId, input) => {
            onError("");

            try {
              await onUpdateStaff(memberId, input);
              setEditingMember(null);
            } catch (err) {
              onError(errorMessage(err));
            }
          }}
        />
      ) : null}
    </>
  );
}
