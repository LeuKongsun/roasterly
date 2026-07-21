import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import {
  type Business,
  type Member,
  type RosterPublication,
  type RosterRecord,
  type Shift,
  type ShiftInput,
  addMember,
  acknowledgeRoster,
  createShift,
  deleteBusiness,
  deleteMember,
  deleteShift,
  getRosterPublication,
  listBusinesses,
  listMembers,
  listRoster,
  listRosterRecords,
  publishRoster,
  updateBusiness,
  updateMember,
  updateMemberPassword,
  updateShift
} from "../../api";
import { currentMonday, moveShiftToDayAndMemberInput, moveShiftToDayAndMember } from "../../utils/date";
import { isAccessTokenExpired } from "../../utils/auth";
import { errorMessage, isAuthExpiredError } from "../../utils/errors";
import {
  WorkspaceContext,
  type WorkspaceSection,
  type RosterView,
  type RosterAction
} from "../../context/WorkspaceContext";
import { ToastRegion } from "../ToastRegion";
import { AdminNavigation } from "./AdminNavigation";
import { ProfileMenu } from "./ProfileMenu";
import { RosterActionDrawer } from "../roster/RosterActionDrawer";
import { StaffMobileView } from "../staff/StaffMobileView";

function visibleBusinessesForPortal(businesses: Business[]) {
  const managerBusinesses = businesses.filter((business) => business.members?.[0]?.role === "manager");
  return managerBusinesses.length ? managerBusinesses : businesses;
}

export function Workspace({
  accessToken,
  userEmail,
  onLogout,
  theme,
  onThemeChange
}: {
  accessToken: string;
  userEmail: string;
  onLogout: (message?: string) => void;
  theme: "system" | "light" | "dark";
  onThemeChange: (theme: "system" | "light" | "dark") => void;
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [rosterRecords, setRosterRecords] = useState<RosterRecord[]>([]);
  const [roster, setRoster] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [activeRosterAction, setActiveRosterAction] = useState<RosterAction | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection: WorkspaceSection = location.pathname.startsWith("/staff") ? "staff" : "shifts";

  const [lastViewedWeekStart, setLastViewedWeekStart] = useState<string>("");

  const routerState = useRouterState();
  const weekStartMatch = routerState.matches.find((m) => m.routeId === "/authenticated/shifts/$weekStart");
  const currentUrlWeekStart = (weekStartMatch?.params as { weekStart?: string })?.weekStart;
  const weekStart = currentUrlWeekStart || lastViewedWeekStart || currentMonday();

  useEffect(() => {
    if (currentUrlWeekStart) {
      setLastViewedWeekStart(currentUrlWeekStart);
    }
  }, [currentUrlWeekStart]);

  const shiftsMatch = location.pathname.match(/^\/shifts\/([^/]+)/);
  const rosterView: RosterView = shiftsMatch ? "board" : "records";

  const [publication, setPublication] = useState<RosterPublication | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [boardView, setBoardView] = useState<"calendar" | "timeline">("calendar");
  const [defaultShiftDate, setDefaultShiftDate] = useState("");
  const [defaultShiftMemberId, setDefaultShiftMemberId] = useState("");

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const selectedMembershipRole = selectedBusiness?.members?.[0]?.role;
  const canManageSelectedBusiness = selectedMembershipRole === "manager";
  const visibleBusinesses = visibleBusinessesForPortal(businesses);
  const selectedShift = roster.find((shift) => shift.id === selectedShiftId) ?? null;
  const currentMember = members.find((member) => member.user.email === userEmail);
  const displayName = currentMember?.displayName ?? userEmail;

  function handleSectionChange(section: WorkspaceSection) {
    setSelectedShiftId("");
    setActiveRosterAction(null);
    navigate({ to: `/${section}` });
  }

  function handleGoHome() {
    setSelectedShiftId("");
    setActiveRosterAction(null);
    navigate({ to: "/" });
  }

  useEffect(() => {
    if (selectedMembershipRole === "staff" && activeSection === "staff") {
      handleSectionChange("shifts");
    }
  }, [activeSection, selectedMembershipRole]);

  async function runAuthenticated(action: () => Promise<void>) {
    if (isAccessTokenExpired(accessToken)) {
      onLogout("Your session expired. Please log in again.");
      return;
    }

    try {
      await action();
    } catch (err) {
      if (isAuthExpiredError(err)) {
        onLogout("Your session expired. Please log in again.");
        return;
      }

      throw err;
    }
  }

  async function refreshAll(nextBusinessId = selectedBusinessId) {
    if (isAccessTokenExpired(accessToken)) {
      onLogout("Your session expired. Please log in again.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const loadedBusinesses = await listBusinesses(accessToken);
      setBusinesses(loadedBusinesses);
      const defaultBusiness = visibleBusinessesForPortal(loadedBusinesses)[0];
      const businessId = nextBusinessId || defaultBusiness?.id || "";
      setSelectedBusinessId(businessId);

      if (businessId) {
        const fetchRosterData = weekStart && weekStart !== "new";
        const [loadedMembers, loadedRoster, loadedRosterRecords, loadedPublication] = await Promise.all([
          listMembers(accessToken, businessId),
          fetchRosterData ? listRoster(accessToken, businessId, weekStart) : Promise.resolve([]),
          listRosterRecords(accessToken, businessId),
          fetchRosterData ? getRosterPublication(accessToken, businessId, weekStart) : Promise.resolve(null)
        ]);
        setMembers(loadedMembers);
        setRoster(loadedRoster);
        setRosterRecords(loadedRosterRecords);
        if (selectedShiftId && !loadedRoster.some((shift) => shift.id === selectedShiftId)) {
          setSelectedShiftId("");
        }
        setPublication(loadedPublication);
      } else {
        setMembers([]);
        setRosterRecords([]);
        setRoster([]);
        setPublication(null);
      }

    } catch (err) {
      if (isAuthExpiredError(err)) {
        onLogout("Your session expired. Please log in again.");
        return;
      }

      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, [accessToken, weekStart]);

  async function refreshRosterRecords(businessId = selectedBusinessId) {
    if (!businessId) {
      setRosterRecords([]);
      return;
    }

    setRosterRecords(await listRosterRecords(accessToken, businessId));
  }

  async function openRosterBoard(nextWeekStart: string) {
    if (!selectedBusinessId) {
      return;
    }

    setError("");
    setSelectedShiftId("");
    setActiveRosterAction(null);
    navigate({ to: `/shifts/${nextWeekStart}` });
  }

  async function loadRosterWeeks(weekStarts: string[]) {
    if (!selectedBusinessId || weekStarts.length === 0) {
      return [];
    }

    const uniqueWeekStarts = [...new Set(weekStarts)];
    const weeklyRosters = await Promise.all(
      uniqueWeekStarts.map((nextWeekStart) => listRoster(accessToken, selectedBusinessId, nextWeekStart))
    );

    return weeklyRosters.flat();
  }

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => setError(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  async function handleBusinessRenamed(businessId: string, name: string) {
    if (!businessId) {
      return;
    }

    await runAuthenticated(async () => {
      await updateBusiness(accessToken, businessId, name);
      setMessage("Business renamed");
      await refreshAll(businessId);
    });
  }

  async function handleBusinessDeleted(businessId: string) {
    if (!businessId) {
      return;
    }

    await runAuthenticated(async () => {
      await deleteBusiness(accessToken, businessId);
      const nextBusinessId = businessId === selectedBusinessId ? "" : selectedBusinessId;
      if (businessId === selectedBusinessId) {
        setSelectedBusinessId("");
        setSelectedShiftId("");
        setActiveRosterAction(null);
      }
      setMessage("Business deleted");
      await refreshAll(nextBusinessId);
    });
  }

  async function handleMemberAdded(input: {
    email: string;
    password?: string;
    displayName?: string;
    phoneNumber?: string;
    role: "manager" | "staff";
  }) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      await addMember(accessToken, selectedBusinessId, input);
      setMessage("Staff member added");
      setActiveRosterAction(null);
      await refreshAll(selectedBusinessId);
    });
  }

  async function handleMemberUpdated(
    memberId: string,
    input: {
      email?: string;
      displayName?: string;
      phoneNumber?: string | null;
      role?: "manager" | "staff";
      password?: string;
    }
  ) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      const { password, ...memberInput } = input;
      const member = await updateMember(accessToken, selectedBusinessId, memberId, memberInput);

      if (password) {
        await updateMemberPassword(accessToken, selectedBusinessId, memberId, password);
      }

      setMembers((currentMembers) =>
        currentMembers.map((currentMember) => (currentMember.id === member.id ? member : currentMember))
      );
      setRoster((currentRoster) =>
        currentRoster.map((shift) => (shift.memberId === member.id ? { ...shift, member } : shift))
      );
      setMessage("Staff member updated");
    });
  }

  async function handleMemberDeleted(memberId: string) {
    if (!selectedBusinessId) {
      return;
    }

    if (isAccessTokenExpired(accessToken)) {
      onLogout("Your session expired. Please log in again.");
      return;
    }

    const previousMembers = members;
    const previousRoster = roster;
    setMembers((currentMembers) => currentMembers.filter((member) => member.id !== memberId));
    setRoster((currentRoster) => currentRoster.filter((shift) => shift.id !== memberId));

    await runAuthenticated(async () => {
      try {
        await deleteMember(accessToken, selectedBusinessId, memberId);
        setMessage("Staff member deleted");
      } catch (err) {
        setMembers(previousMembers);
        setRoster(previousRoster);
        throw err;
      }
    });
  }

  async function handleShiftCreated(input: ShiftInput) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      const shift = await createShift(accessToken, selectedBusinessId, input);
      setRoster((currentRoster) => [...currentRoster, shift]);
      setMessage("Shift created");
      setActiveRosterAction(null);
      await refreshRosterRecords(selectedBusinessId);
    });
  }

  async function handleShiftUpdated(shiftId: string, input: ShiftInput) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      const shift = await updateShift(accessToken, selectedBusinessId, shiftId, input);
      setRoster((currentRoster) =>
        currentRoster.map((currentShift) => (currentShift.id === shift.id ? shift : currentShift))
      );
      setMessage("Shift updated");
      setActiveRosterAction(null);
      await refreshRosterRecords(selectedBusinessId);
    });
  }

  async function handleShiftMoved(shift: Shift, day: string, memberId?: string) {
    if (!selectedBusinessId) {
      return;
    }

    if (isAccessTokenExpired(accessToken)) {
      onLogout("Your session expired. Please log in again.");
      return;
    }

    const previousRoster = roster;
    const targetMemberId = memberId || shift.memberId;
    const targetMember = members.find((m) => m.id === targetMemberId) || shift.member;

    const input = moveShiftToDayAndMemberInput(shift, day, targetMemberId);
    const optimisticShift = moveShiftToDayAndMember(shift, day, targetMemberId, targetMember);

    setError("");
    setSelectedShiftId("");
    setActiveRosterAction(null);
    setRoster((currentRoster) =>
      currentRoster.map((currentShift) => (currentShift.id === shift.id ? optimisticShift : currentShift))
    );

    try {
      await runAuthenticated(async () => {
        const updatedShift = await updateShift(accessToken, selectedBusinessId, shift.id, input);
        setRoster((currentRoster) =>
          currentRoster.map((currentShift) => (currentShift.id === updatedShift.id ? updatedShift : currentShift))
        );
        await refreshRosterRecords(selectedBusinessId);
      });
    } catch (err) {
      setRoster(previousRoster);
      setSelectedShiftId("");
      setActiveRosterAction(null);
      setError(errorMessage(err));
    }
  }

  async function handleShiftDeleted(shiftId: string) {
    if (!selectedBusinessId) {
      return;
    }

    if (isAccessTokenExpired(accessToken)) {
      onLogout("Your session expired. Please log in again.");
      return;
    }

    const previousRoster = roster;
    setSelectedShiftId("");
    setActiveRosterAction(null);
    setRoster((currentRoster) => currentRoster.filter((shift) => shift.id !== shiftId));

    try {
      await runAuthenticated(async () => {
        await deleteShift(accessToken, selectedBusinessId, shiftId);
        setMessage("Shift deleted");
        await refreshRosterRecords(selectedBusinessId);
      });
    } catch (err) {
      setRoster(previousRoster);
      setError(errorMessage(err));
    }
  }

  async function handleRosterPublished() {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      const nextPublication = await publishRoster(accessToken, selectedBusinessId, weekStart);
      setPublication(nextPublication);
      setMessage("Roster published");
      await refreshAll(selectedBusinessId);
    });
  }

  async function handleRosterAcknowledged() {
    if (!selectedBusinessId || !publication) {
      return;
    }

    await runAuthenticated(async () => {
      await acknowledgeRoster(accessToken, selectedBusinessId, publication.id);
      setMessage("Roster acknowledged");
      await refreshAll(selectedBusinessId);
    });
  }

  if (isLoading && businesses.length === 0) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[540px] bg-transparent px-4 py-6 text-zinc-950 dark:text-zinc-100 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-sm font-black tracking-[0.25em] text-indigo-600 dark:text-indigo-400">ROSTERLY</p>
          <div className="skeleton-cell w-28 mx-auto h-1 rounded-full" />
        </div>
      </div>
    );
  }

  if (selectedBusinessId && !canManageSelectedBusiness) {
    return (
      <StaffMobileView
        accessToken={accessToken}
        userEmail={userEmail}
        selectedBusiness={selectedBusiness}
        businesses={visibleBusinesses}
        roster={roster}
        publication={publication}
        members={members}
        weekStart={weekStart}
        isLoading={isLoading}
        message={message}
        error={error}
        onSelectBusiness={(businessId) => void refreshAll(businessId)}
        onLogout={onLogout}
        onOpenRoster={(nextWeek) => void openRosterBoard(nextWeek)}
        onAcknowledge={handleRosterAcknowledged}
        refreshAll={() => void refreshAll()}
        theme={theme}
      />
    );
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] bg-transparent text-zinc-950 dark:text-zinc-100 font-sans relative">
      <aside className="sidebar z-30 grid h-auto grid-rows-[auto_auto_auto] gap-4 border-b lg:border-b-0 lg:border-r border-zinc-200/50 dark:border-white/5 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md p-4 lg:p-5 lg:sticky lg:top-0 lg:h-screen lg:grid-rows-[auto_minmax(0,1fr)_auto]">
        <div className="flex items-center justify-between lg:block">
          <button
            onClick={handleGoHome}
            className="grid text-left lg:justify-items-center lg:text-center bg-transparent border-0 cursor-pointer rounded-xl p-2 lg:p-3 hover:bg-zinc-800/5 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-800/10 dark:focus-visible:ring-white/10 transition-all duration-300"
            type="button"
          >
            <div>
              <p className="mb-0.5 lg:mb-1 text-[0.73rem] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {selectedBusiness?.name ?? "Rosterly"}
              </p>
              <h1 className="m-0 max-w-none text-base lg:text-lg leading-tight font-extrabold text-zinc-950 dark:text-white">
                {displayName}
              </h1>
            </div>
          </button>
        </div>

        <AdminNavigation
          activeSection={activeSection}
          canManage={canManageSelectedBusiness}
          onSectionChange={handleSectionChange}
        />

        <div className="grid justify-stretch border-t border-zinc-200/50 dark:border-white/5 pt-3 lg:pt-3.5">
          <ProfileMenu
            businesses={visibleBusinesses}
            selectedBusinessId={selectedBusinessId}
            userEmail={userEmail}
            onSelectBusiness={(businessId) => refreshAll(businessId)}
            onRenameBusiness={handleBusinessRenamed}
            onDeleteBusiness={handleBusinessDeleted}
            onLogout={onLogout}
            onError={setError}
            theme={theme}
            onThemeChange={onThemeChange}
          />
        </div>
      </aside>

      <ToastRegion message={message} error={error} />

      <section className="min-w-0 p-4 md:p-8 flex flex-col gap-4 md:gap-6">
        <header className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-1 text-[0.73rem] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Selected business</p>
            <h2 className="mb-0 text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-700 dark:from-white dark:via-zinc-100 dark:to-zinc-400">
              {selectedBusiness?.name ?? "Create a business to start"}
            </h2>
          </div>
          <div className="flex flex-col items-stretch gap-2.5 md:flex-row md:items-end">
            <button 
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white cursor-pointer active:scale-95 transition-all duration-300 shadow-sm" 
              type="button" 
              onClick={() => void refreshAll()} 
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <RosterActionDrawer
          activeAction={canManageSelectedBusiness ? (selectedShift ? "shift" : activeRosterAction) : null}
          members={members}
          weekStart={weekStart}
          selectedShift={selectedShift}
          defaultShiftDate={defaultShiftDate}
          defaultShiftMemberId={defaultShiftMemberId}
          onCreateShift={handleShiftCreated}
          onUpdateShift={handleShiftUpdated}
          onDeleteShift={handleShiftDeleted}
          onCancel={() => {
            setSelectedShiftId("");
            setActiveRosterAction(null);
            setDefaultShiftDate("");
            setDefaultShiftMemberId("");
          }}
          onAddMember={handleMemberAdded}
          onError={setError}
        />

        <div className="grid grid-cols-1 items-start gap-4 lg:col-span-full">
          {/* Double Bezel Container Wrapper */}
          <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/50 dark:border-white/5 bg-zinc-950/[0.01] dark:bg-zinc-950/10 p-1.5 shadow-2xl col-auto lg:col-span-full">
            <section 
              className="min-w-0 rounded-[calc(2rem-0.5rem)] border border-zinc-200/80 dark:border-white/10 bg-white/50 dark:bg-zinc-950/40 p-5 md:p-6 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
              aria-labelledby="roster-title"
            >
              <WorkspaceContext.Provider
                value={{
                  view: canManageSelectedBusiness ? rosterView : "board",
                  boardView,
                  onBoardViewChange: setBoardView,
                  isLoading,
                  canManage: canManageSelectedBusiness,
                  weekStart,
                  records: rosterRecords,
                  shifts: roster,
                  selectedShiftId,
                  publication,
                  members,
                  userEmail,
                  onAddShift: (day?: string, memberId?: string) => {
                    setSelectedShiftId("");
                    setDefaultShiftDate(day || "");
                    setDefaultShiftMemberId(memberId || "");
                    setActiveRosterAction("shift");
                  },
                  onEditShift: (shift: Shift) => {
                    setRoster((currentRoster) => {
                      if (currentRoster.some((currentShift) => currentShift.id === shift.id)) {
                        return currentRoster;
                      }

                      return [...currentRoster, shift];
                    });
                    setSelectedShiftId(shift.id);
                    setActiveRosterAction(null);
                  },
                  onLoadRosterWeeks: loadRosterWeeks,
                  onCreateRoster: (weekStart?: string) => void openRosterBoard(weekStart || currentMonday()),
                  onOpenRoster: (nextWeekStart: string) => void openRosterBoard(nextWeekStart),
                  onSelectShift: (shiftId: string) => {
                    if (!canManageSelectedBusiness) {
                      return;
                    }

                    setSelectedShiftId(shiftId);
                    setActiveRosterAction(null);
                  },
                  onMoveShift: handleShiftMoved,
                  onPublish: handleRosterPublished,
                  onAcknowledge: handleRosterAcknowledged,
                  onAddStaff: () => {
                    setSelectedShiftId("");
                    setActiveRosterAction("member");
                  },
                  onUpdateStaff: handleMemberUpdated,
                  onDeleteStaff: handleMemberDeleted,
                  onError: setError
                }}
              >
                <Outlet />
              </WorkspaceContext.Provider>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
