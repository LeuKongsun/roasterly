import { useState } from "react";
import { Eye, Plus } from "lucide-react";
import type { RosterRecord } from "../../api";
import { formatDate, formatNullableDateTime, weekStartForDateOnly } from "../../utils/date";

export function RosterRecordsView({
  isLoading,
  canManage,
  records,
  onCreateRoster,
  onOpenRoster
}: {
  isLoading: boolean;
  canManage: boolean;
  records: RosterRecord[];
  onCreateRoster: (weekStart?: string) => void;
  onOpenRoster: (weekStart: string) => void;
}) {
  const [filterWeek, setFilterWeek] = useState("");

  const filterWeekStart = filterWeek ? weekStartForDateOnly(filterWeek) : "";
  const filteredRecords = filterWeekStart
    ? records.filter((record) => record.weekStart === filterWeekStart)
    : records;

  return (
    <>
      <div className="mb-3.5 flex justify-between gap-3.5 flex-col items-stretch md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Rosters</p>
          <h3 className="mb-0 text-base font-semibold text-zinc-950 dark:text-white" id="roster-title">Roster records</h3>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto items-end">
          <label className="grid min-w-0 gap-1.5 text-[0.82rem] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-full md:w-[180px]">
            Week
            <input
              value={filterWeek}
              onChange={(event) => setFilterWeek(event.target.value)}
              type="date"
              className="min-h-[42px] w-full min-w-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 px-3.5 py-2.5 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
            />
          </label>
          {filterWeek ? (
            <button
              className="inline-flex h-[42px] min-h-[42px] items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 px-4 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white active:scale-95 transition-all duration-300 cursor-pointer"
              type="button"
              onClick={() => setFilterWeek("")}
            >
              Clear
            </button>
          ) : null}
          {canManage ? (
            <button
              className="inline-flex h-[42px] min-h-[42px] items-center justify-center gap-2 rounded-lg border border-transparent px-4 font-semibold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-55 active:scale-95 transition-all duration-300 cursor-pointer shadow-sm"
              type="button"
              onClick={() => onCreateRoster("new")}
            >
              <Plus size={17} />
              Create roster
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full border-collapse text-left min-w-[860px]">
          <thead>
            <tr>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Week</th>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Status</th>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Shifts</th>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Staff</th>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Acknowledged</th>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider">Last activity</th>
              <th scope="col" className="bg-zinc-100/50 dark:bg-zinc-900/30 font-semibold text-zinc-550 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 px-4 py-3.5 align-middle text-[0.78rem] uppercase tracking-wider w-24 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <RosterRecordSkeletonRows />
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => (
                <tr key={record.weekStart} className="group hover:bg-zinc-100/30 dark:hover:bg-white/5 transition-colors duration-200">
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
                    <strong className="font-medium text-zinc-950 dark:text-zinc-100">Week of {formatDate(record.weekStart)}</strong>
                  </td>
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
                    <span className={`inline-flex min-h-6 w-fit items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold capitalize min-w-[76px] justify-center ${
                      record.status === "published"
                        ? "border border-emerald-200/50 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 text-zinc-555 dark:text-zinc-400"
                    }`}>{record.status}</span>
                  </td>
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem] text-zinc-700 dark:text-zinc-300">{record.shiftCount}</td>
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem] text-zinc-700 dark:text-zinc-300">{record.staffCount}</td>
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem] text-zinc-700 dark:text-zinc-300">{record.acknowledgementCount}</td>
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem] text-zinc-600 dark:text-zinc-400">{formatNullableDateTime(record.publishedAt ?? record.updatedAt)}</td>
                  <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={`Open roster for ${formatDate(record.weekStart)}`}
                        aria-label={`Open roster for ${formatDate(record.weekStart)}`}
                        className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border-0 bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
                        onClick={() => onOpenRoster(record.weekStart)}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="group">
                <td colSpan={7} className="border-b-0 px-4 py-6 align-middle text-[0.88rem]">
                  <div className="flex min-h-[72px] items-center gap-2.5 text-zinc-500 dark:text-zinc-400 justify-center">
                    <span>No roster records yet.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RosterRecordSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr className="group hover:bg-transparent" key={index}>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[180px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell h-6 max-w-[76px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[42px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[42px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[42px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell max-w-[132px]" />
          </td>
          <td className="border-b border-zinc-200/50 dark:border-white/5 group-last:border-b-0 px-4 py-3.5 align-middle text-[0.88rem]">
            <span className="skeleton-cell ml-auto h-[30px] w-[30px] rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}
