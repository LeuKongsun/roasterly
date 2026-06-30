import { Pencil, Trash2, Users } from "lucide-react";
import type { Member } from "../../api";

export function MemberList({
  isLoading,
  members,
  onEdit,
  onDelete
}: {
  isLoading: boolean;
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full border-collapse text-left min-w-[760px]">
        <thead>
          <tr>
            <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Name</th>
            <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Email</th>
            <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Phone</th>
            <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Role</th>
            <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider w-24 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <StaffSkeletonRows />
          ) : members.length ? (
            members.map((member) => (
              <tr key={member.id} className="group hover:bg-zinc-100/30 dark:hover:bg-white/5 transition-colors duration-200">
                <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
                  <strong className="font-medium text-zinc-950 dark:text-zinc-100">{member.displayName}</strong>
                </td>
                <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem] text-zinc-700 dark:text-zinc-300">{member.user.email}</td>
                <td className={`border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem] ${member.phoneNumber ? "text-zinc-950 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-500"}`}>{member.phoneNumber ?? "Not provided"}</td>
                <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
                  <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-white/5 bg-zinc-100/50 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[0.78rem] capitalize text-zinc-700 dark:text-zinc-300 font-medium">{member.role}</span>
                </td>
                <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title={`Update ${member.displayName}`}
                      aria-label={`Update ${member.displayName}`}
                      className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border-0 bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
                      onClick={() => onEdit(member)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title={`Delete ${member.displayName}`}
                      aria-label={`Delete ${member.displayName}`}
                      className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border-0 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 transition-all cursor-pointer"
                      onClick={() => onDelete(member)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr className="group">
              <td colSpan={5} className="border-b-0 px-4 py-6 align-middle text-[0.88rem]">
                <div className="flex min-h-[72px] items-center gap-2.5 text-zinc-500 dark:text-zinc-400 justify-center">
                  <Users size={20} className="text-zinc-400 dark:text-zinc-500" />
                  <span>Add staff after they create an account.</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StaffSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr className="group hover:bg-transparent" key={index}>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[180px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[220px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[132px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell h-6 max-w-[76px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell ml-auto h-[30px] w-[30px] rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}
