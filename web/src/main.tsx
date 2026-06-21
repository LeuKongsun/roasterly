import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  UserPlus,
  Users
} from "lucide-react";
import {
  ApiError,
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
  login,
  publishRoster,
  updateBusiness,
  updateMember,
  updateMemberPassword,
  updateShift
} from "./api";
import "./styles.css";

const tokenStorageKey = "rosterly.accessToken";
const emailStorageKey = "rosterly.email";

type RosterAction = "shift" | "member";
type WorkspaceSection = "shifts" | "staff";
type RosterView = "records" | "board";
const defaultWorkspaceSection: WorkspaceSection = "shifts";
const workspaceSections: WorkspaceSection[] = ["shifts", "staff"];

function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(tokenStorageKey) ?? "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem(emailStorageKey) ?? "");
  const [authNotice, setAuthNotice] = useState("");

  function handleAuth(token: string, email: string) {
    localStorage.setItem(tokenStorageKey, token);
    localStorage.setItem(emailStorageKey, email);
    setAccessToken(token);
    setUserEmail(email);
    setAuthNotice("");
  }

  function logout(message = "") {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(emailStorageKey);
    setAccessToken("");
    setUserEmail("");
    setAuthNotice(message);
  }

  if (!accessToken) {
    return <AuthScreen notice={authNotice} onAuth={handleAuth} />;
  }

  return <Workspace accessToken={accessToken} userEmail={userEmail} onLogout={logout} />;
}

function AuthScreen({
  notice,
  onAuth
}: {
  notice: string;
  onAuth: (token: string, email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      onAuth(result.accessToken, result.user.email);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div>
          <p className="eyebrow">Rosterly</p>
          <h1 id="auth-title">Simple roster setup for small teams.</h1>
          <p className="lede">
            Create a business, add staff, and turn the week into assigned shifts without a spreadsheet screenshot.
          </p>
        </div>

        <form className="form-stack" onSubmit={submit}>
          {notice ? <p className="notice">{notice}</p> : null}

          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button className="primary-action" type="submit" disabled={isSubmitting}>
            <ChevronRight size={18} />
            {isSubmitting ? "Working" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Workspace({
  accessToken,
  userEmail,
  onLogout
}: {
  accessToken: string;
  userEmail: string;
  onLogout: (message?: string) => void;
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [rosterRecords, setRosterRecords] = useState<RosterRecord[]>([]);
  const [roster, setRoster] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [activeRosterAction, setActiveRosterAction] = useState<RosterAction | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(() => sectionFromLocation());
  const [rosterView, setRosterView] = useState<RosterView>("records");
  const [publication, setPublication] = useState<RosterPublication | null>(null);
  const [weekStart, setWeekStart] = useState(currentMonday());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const selectedMembershipRole = selectedBusiness?.members?.[0]?.role;
  const canManageSelectedBusiness = selectedMembershipRole === "manager";
  const visibleBusinesses = visibleBusinessesForPortal(businesses);
  const selectedShift = roster.find((shift) => shift.id === selectedShiftId) ?? null;

  useEffect(() => {
    function handleHashChange() {
      setActiveSection(sectionFromLocation());
      setSelectedShiftId("");
      setActiveRosterAction(null);
      setRosterView("records");
    }

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  function handleSectionChange(section: WorkspaceSection) {
    setSelectedShiftId("");
    setActiveRosterAction(null);
    setActiveSection(section);
    setRosterView("records");
    updateSectionHash(section);
  }

  useEffect(() => {
    if (selectedMembershipRole === "staff" && activeSection === "staff") {
      handleSectionChange("shifts");
    }

    if (selectedMembershipRole === "staff" && rosterView !== "board") {
      setRosterView("board");
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
        const [loadedMembers, loadedRoster, loadedRosterRecords, loadedPublication] = await Promise.all([
          listMembers(accessToken, businessId),
          listRoster(accessToken, businessId, weekStart),
          listRosterRecords(accessToken, businessId),
          getRosterPublication(accessToken, businessId, weekStart)
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
    setWeekStart(nextWeekStart);
    setRosterView("board");
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
    setRoster((currentRoster) => currentRoster.filter((shift) => shift.memberId !== memberId));

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

  async function handleShiftMoved(shift: Shift, day: string) {
    if (!selectedBusinessId) {
      return;
    }

    if (isAccessTokenExpired(accessToken)) {
      onLogout("Your session expired. Please log in again.");
      return;
    }

    const previousRoster = roster;
    const optimisticShift = moveShiftToDay(shift, day);
    setError("");
    setSelectedShiftId("");
    setActiveRosterAction(null);
    setRoster((currentRoster) =>
      currentRoster.map((currentShift) => (currentShift.id === shift.id ? optimisticShift : currentShift))
    );

    try {
      await runAuthenticated(async () => {
        const updatedShift = await updateShift(accessToken, selectedBusinessId, shift.id, moveShiftToDayInput(shift, day));
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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <p className="eyebrow">Rosterly</p>
            <h1>Roster admin</h1>
          </div>
        </div>

        <AdminNavigation
          activeSection={activeSection}
          canManage={canManageSelectedBusiness}
          onSectionChange={handleSectionChange}
        />

        <div className="sidebar-account">
          <ProfileMenu
            businesses={visibleBusinesses}
            selectedBusinessId={selectedBusinessId}
            userEmail={userEmail}
            onSelectBusiness={(businessId) => refreshAll(businessId)}
            onRenameBusiness={handleBusinessRenamed}
            onDeleteBusiness={handleBusinessDeleted}
            onLogout={onLogout}
            onError={setError}
          />
        </div>
      </aside>

      <ToastRegion message={message} error={error} />

      <section className="workbench">
        <header className="topbar">
          <div>
            <p className="eyebrow">Selected business</p>
            <h2>{selectedBusiness?.name ?? "Create a business to start"}</h2>
          </div>
          <div className="toolbar">
            <button className="icon-button" type="button" onClick={() => void refreshAll()} title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <RosterActionDrawer
          activeAction={canManageSelectedBusiness ? (selectedShift ? "shift" : activeRosterAction) : null}
          members={members}
          weekStart={weekStart}
          selectedShift={selectedShift}
          onCreateShift={handleShiftCreated}
          onUpdateShift={handleShiftUpdated}
          onDeleteShift={handleShiftDeleted}
          onCancel={() => {
            setSelectedShiftId("");
            setActiveRosterAction(null);
          }}
          onAddMember={handleMemberAdded}
          onError={setError}
        />

        <div className="workspace-grid admin-grid">
          <section className="panel roster-panel" aria-labelledby="roster-title">
            {activeSection === "shifts" ? (
              <ShiftsSection
                view={canManageSelectedBusiness ? rosterView : "board"}
                isLoading={isLoading}
                canManage={canManageSelectedBusiness}
                weekStart={weekStart}
                records={rosterRecords}
                shifts={roster}
                selectedShiftId={selectedShiftId}
                publication={publication}
                members={members}
                userEmail={userEmail}
                onAddShift={() => {
                  setSelectedShiftId("");
                  setActiveRosterAction("shift");
                }}
                onCreateRoster={() => void openRosterBoard(currentMonday())}
                onOpenRoster={(nextWeekStart) => void openRosterBoard(nextWeekStart)}
                onSelectShift={(shiftId) => {
                  if (!canManageSelectedBusiness) {
                    return;
                  }

                  setSelectedShiftId(shiftId);
                  setActiveRosterAction(null);
                }}
                onMoveShift={handleShiftMoved}
                onPublish={handleRosterPublished}
                onAcknowledge={handleRosterAcknowledged}
              />
            ) : null}

            {activeSection === "staff" ? (
              <StaffSection
                isLoading={isLoading}
                members={members}
                onAddStaff={() => {
                  setSelectedShiftId("");
                  setActiveRosterAction("member");
                }}
                onUpdateStaff={handleMemberUpdated}
                onDeleteStaff={handleMemberDeleted}
                onError={setError}
              />
            ) : null}

          </section>
        </div>
      </section>
    </main>
  );
}

function ToastRegion({ message, error }: { message: string; error: string }) {
  if (!message && !error) {
    return null;
  }

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {error ? (
        <div className="toast error-toast" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="toast success-toast" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function AdminNavigation({
  activeSection,
  canManage,
  onSectionChange
}: {
  activeSection: WorkspaceSection;
  canManage: boolean;
  onSectionChange: (section: WorkspaceSection) => void;
}) {
  const sections: Array<{
    id: WorkspaceSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "shifts",
      label: "Rosters",
      icon: <ClipboardList size={18} />
    },
    ...(canManage ? [{
      id: "staff" as const,
      label: "Staff",
      icon: <Users size={18} />
    }] : [])
  ];

  return (
    <nav className="admin-nav" aria-label="Workspace navigation">
      {sections.map((section) => (
        <button
          key={section.id}
          className={activeSection === section.id ? "active" : ""}
          type="button"
          onClick={() => onSectionChange(section.id)}
        >
          {section.icon}
          {section.label}
        </button>
      ))}
    </nav>
  );
}

function ShiftsSection({
  view,
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
  onCreateRoster,
  onOpenRoster,
  onSelectShift,
  onMoveShift,
  onPublish,
  onAcknowledge
}: {
  view: RosterView;
  isLoading: boolean;
  canManage: boolean;
  weekStart: string;
  records: RosterRecord[];
  shifts: Shift[];
  selectedShiftId: string;
  publication: RosterPublication | null;
  members: Member[];
  userEmail: string;
  onAddShift: () => void;
  onCreateRoster: () => void;
  onOpenRoster: (weekStart: string) => void;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string) => Promise<void>;
  onPublish: () => Promise<void>;
  onAcknowledge: () => Promise<void>;
}) {
  if (view === "records") {
    return (
      <RosterRecordsView
        isLoading={isLoading}
        canManage={canManage}
        records={records}
        onCreateRoster={onCreateRoster}
        onOpenRoster={onOpenRoster}
      />
    );
  }

  return (
    <>
      <div className="panel-heading page-heading">
        <div>
          <p className="eyebrow">Roster board</p>
          <h3 id="roster-title">Week of {formatDate(weekStart)}</h3>
        </div>
        <div className="page-actions compact-actions">
          <RosterPublicationActions
            canManage={canManage}
            publication={publication}
            members={members}
            userEmail={userEmail}
            onPublish={onPublish}
            onAcknowledge={onAcknowledge}
          />
          {canManage ? (
            <button className="primary-action" type="button" onClick={onAddShift}>
              <Plus size={17} />
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
      />
    </>
  );
}

function RosterRecordsView({
  isLoading,
  canManage,
  records,
  onCreateRoster,
  onOpenRoster
}: {
  isLoading: boolean;
  canManage: boolean;
  records: RosterRecord[];
  onCreateRoster: () => void;
  onOpenRoster: (weekStart: string) => void;
}) {
  const [filterWeek, setFilterWeek] = useState("");
  const filterWeekStart = filterWeek ? weekStartForDateOnly(filterWeek) : "";
  const filteredRecords = filterWeekStart
    ? records.filter((record) => record.weekStart === filterWeekStart)
    : records;

  return (
    <>
      <div className="panel-heading page-heading">
        <div>
          <p className="eyebrow">Rosters</p>
          <h3 id="roster-title">Roster records</h3>
        </div>
        <div className="page-actions compact-actions">
          <label className="week-picker">
            Week
            <input value={filterWeek} onChange={(event) => setFilterWeek(event.target.value)} type="date" />
          </label>
          {filterWeek ? (
            <button className="secondary-action ghost" type="button" onClick={() => setFilterWeek("")}>
              Clear
            </button>
          ) : null}
          {canManage ? (
            <button className="primary-action" type="button" onClick={onCreateRoster}>
              <Plus size={17} />
              Create roster
            </button>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col">Status</th>
              <th scope="col">Shifts</th>
              <th scope="col">Staff</th>
              <th scope="col">Acknowledged</th>
              <th scope="col">Last activity</th>
              <th scope="col" className="actions-column">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <RosterRecordSkeletonRows />
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => (
                <tr key={record.weekStart}>
                  <td>
                    <strong>Week of {formatDate(record.weekStart)}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${record.status}`}>{record.status}</span>
                  </td>
                  <td>{record.shiftCount}</td>
                  <td>{record.staffCount}</td>
                  <td>{record.acknowledgementCount}</td>
                  <td>{formatNullableDateTime(record.publishedAt ?? record.updatedAt)}</td>
                  <td>
                    <div className="staff-actions">
                      <button
                        type="button"
                        title={`Open roster for ${formatDate(record.weekStart)}`}
                        aria-label={`Open roster for ${formatDate(record.weekStart)}`}
                        onClick={() => onOpenRoster(record.weekStart)}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    <ClipboardList size={20} />
                    <span>{filterWeek ? "No roster records for this week." : "No roster records yet."}</span>
                    {canManage && !filterWeek ? (
                      <button className="secondary-action" type="button" onClick={onCreateRoster}>
                        <Plus size={17} />
                        Create first roster
                      </button>
                    ) : null}
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
        <tr className="skeleton-row" key={index}>
          <td>
            <span className="skeleton-cell wide" />
          </td>
          <td>
            <span className="skeleton-cell pill" />
          </td>
          <td>
            <span className="skeleton-cell short" />
          </td>
          <td>
            <span className="skeleton-cell short" />
          </td>
          <td>
            <span className="skeleton-cell short" />
          </td>
          <td>
            <span className="skeleton-cell medium" />
          </td>
          <td>
            <span className="skeleton-cell action" />
          </td>
        </tr>
      ))}
    </>
  );
}

function StaffSection({
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
      <div className="panel-heading page-heading">
        <div>
          <p className="eyebrow">Staff</p>
          <h3 id="members-title">Staff list</h3>
        </div>
        <button className="secondary-action" type="button" onClick={onAddStaff}>
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

function RosterActionDrawer({
  activeAction,
  members,
  weekStart,
  selectedShift,
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
    <div className="modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-action-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{drawerEyebrow(activeAction, selectedShift)}</p>
            <h4 id="roster-action-title">{drawerTitle(activeAction, selectedShift)}</h4>
          </div>
          <button type="button" onClick={onCancel}>
            Close
          </button>
        </div>

        {activeAction === "shift" ? (
          <ShiftForm
            members={members}
            weekStart={weekStart}
            selectedShift={selectedShift}
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

function ProfileMenu({
  businesses,
  selectedBusinessId,
  userEmail,
  onSelectBusiness,
  onRenameBusiness,
  onDeleteBusiness,
  onLogout,
  onError
}: {
  businesses: Business[];
  selectedBusinessId: string;
  userEmail: string;
  onSelectBusiness: (businessId: string) => Promise<void>;
  onRenameBusiness: (businessId: string, name: string) => Promise<void>;
  onDeleteBusiness: (businessId: string) => Promise<void>;
  onLogout: (message?: string) => void;
  onError: (message: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const profileRef = useDismissOnOutsidePointer<HTMLDivElement>(isOpen, () => setIsOpen(false));

  return (
    <div className="profile-menu" ref={profileRef}>
      <button
        className="profile-trigger"
        type="button"
        aria-label="Profile and businesses"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{userEmail}</span>
      </button>

      {isOpen ? (
        <div className="profile-popover" role="dialog" aria-label="Profile and business switcher">
          <div className="profile-summary">
            <strong>{userEmail}</strong>
            <button type="button" onClick={() => onLogout()} title="Log out" aria-label="Log out">
              <LogOut size={17} />
            </button>
          </div>
          <p className="profile-section-title">Businesses</p>
          <BusinessList
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onSelect={async (businessId) => {
              await onSelectBusiness(businessId);
              setIsOpen(false);
            }}
            onRename={onRenameBusiness}
            onDelete={onDeleteBusiness}
            onError={onError}
          />
        </div>
      ) : null}
    </div>
  );
}

function BusinessList({
  businesses,
  selectedBusinessId,
  onSelect,
  onRename,
  onDelete,
  onError
}: {
  businesses: Business[];
  selectedBusinessId: string;
  onSelect: (businessId: string) => Promise<void>;
  onRename: (businessId: string, name: string) => Promise<void>;
  onDelete: (businessId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editingBusinessId, setEditingBusinessId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!businesses.some((business) => business.id === editingBusinessId)) {
      setEditingBusinessId("");
      setEditingName("");
    }
  }, [businesses, editingBusinessId]);

  if (businesses.length === 0) {
    return <p className="business-empty">No businesses yet</p>;
  }

  function startRename(business: Business) {
    setEditingBusinessId(business.id);
    setEditingName(business.name);
  }

  async function submitRename(event: React.FormEvent, business: Business) {
    event.preventDefault();
    onError("");
    setIsSaving(true);

    try {
      await onRename(business.id, editingName.trim());
      setEditingBusinessId("");
      setEditingName("");
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete(business: Business) {
    onError("");

    if (!window.confirm(`Delete ${business.name}? This will remove its staff, shifts, and invitations.`)) {
      return;
    }

    try {
      await onDelete(business.id);
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <nav className="business-list" aria-label="Businesses">
      {businesses.map((business) => {
        const isEditing = editingBusinessId === business.id;
        const isActive = business.id === selectedBusinessId;
        const canManageBusiness = business.members?.[0]?.role === "manager";

        return (
          <div className={`business-item${isActive ? " active" : ""}`} key={business.id}>
            {isEditing && canManageBusiness ? (
              <form className="business-rename" onSubmit={(event) => void submitRename(event, business)}>
                <Building2 size={17} />
                <input
                  aria-label={`Rename ${business.name}`}
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  title="Save business name"
                  aria-label="Save business name"
                  disabled={isSaving || editingName.trim() === business.name}
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  title="Cancel rename"
                  aria-label="Cancel rename"
                  onClick={() => {
                    setEditingBusinessId("");
                    setEditingName("");
                  }}
                >
                  <X size={16} />
                </button>
              </form>
            ) : (
              <>
                <button className="business-select" onClick={() => void onSelect(business.id)} type="button">
                  <Building2 size={17} />
                  <span>{business.name}</span>
                </button>
                {canManageBusiness ? (
                  <div className="business-actions">
                    <button
                      className="business-action"
                      type="button"
                      title={`Rename ${business.name}`}
                      aria-label={`Rename ${business.name}`}
                      onClick={() => startRename(business)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="business-action danger"
                      type="button"
                      title={`Delete ${business.name}`}
                      aria-label={`Delete ${business.name}`}
                      onClick={() => void confirmDelete(business)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MemberForm({
  onAdd,
  onError
}: {
  onAdd: (input: {
    email: string;
    password?: string;
    displayName?: string;
    phoneNumber?: string;
    role: "manager" | "staff";
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    try {
      await onAdd({
        email,
        password: password || undefined,
        displayName: displayName || undefined,
        phoneNumber: phoneNumber || undefined,
        role
      });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setPhoneNumber("");
      setRole("staff");
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <form className="form-stack compact" onSubmit={submit}>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label>
        Initial password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        Display name
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label>
        Phone
        <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
      </label>
      <label>
        Role
        <select value={role} onChange={(event) => setRole(event.target.value as "manager" | "staff")}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
      </label>
      <button className="secondary-action" type="submit">
        <UserPlus size={17} />
        Add staff
      </button>
    </form>
  );
}

function ShiftForm({
  members,
  weekStart,
  selectedShift,
  onCreate,
  onUpdate,
  onDelete,
  onCancelEdit,
  onError
}: {
  members: Member[];
  weekStart: string;
  selectedShift: Shift | null;
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

  useEffect(() => {
    if (selectedShift) {
      setMemberId(selectedShift.memberId);
      setDate(toDateOnly(selectedShift.startsAt));
      setStartTime(toTimeInputValue(selectedShift.startsAt));
      setEndTime(toTimeInputValue(selectedShift.endsAt));
      setRoleName(selectedShift.roleName ?? "");
      setNotes(selectedShift.notes ?? "");
      return;
    }

    setDate(weekStart);
    setStartTime("09:00");
    setEndTime("17:00");
    setRoleName("");
    setNotes("");
  }, [selectedShift, weekStart]);

  useEffect(() => {
    if (!memberId && members[0]) {
      setMemberId(members[0].id);
    }
  }, [memberId, members]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");
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
    <form className="form-stack compact" onSubmit={submit}>
      <label>
        Staff
        <select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <div className="split-fields">
        <label>
          Date
          <input value={date} onChange={(event) => setDate(event.target.value)} type="date" required />
        </label>
        <label>
          Start
          <input value={startTime} onChange={(event) => setStartTime(event.target.value)} type="time" required />
        </label>
        <label>
          End
          <input value={endTime} onChange={(event) => setEndTime(event.target.value)} type="time" required />
        </label>
      </div>
      <label>
        Role
        <input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Floor, bar, admin" />
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>
      <button className="primary-action" type="submit" disabled={!members.length || isSubmitting}>
        <Plus size={17} />
        {isSubmitting ? "Saving" : selectedShift ? "Update shift" : "Create shift"}
      </button>
      {selectedShift ? (
        <div className="edit-actions">
          <button className="secondary-action ghost" type="button" onClick={onCancelEdit} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="danger-action" type="button" onClick={() => void removeSelectedShift()} disabled={isSubmitting}>
            {isSubmitting ? "Deleting" : "Delete shift"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function RosterGrid({
  canManage,
  weekStart,
  shifts,
  selectedShiftId,
  onSelectShift,
  onMoveShift
}: {
  canManage: boolean;
  weekStart: string;
  shifts: Shift[];
  selectedShiftId: string;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string) => Promise<void>;
}) {
  const [draggedShiftId, setDraggedShiftId] = useState("");
  const [dropTargetDay, setDropTargetDay] = useState("");
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  function draggedShift() {
    return shifts.find((shift) => shift.id === draggedShiftId) ?? null;
  }

  async function dropShift(day: string) {
    const shift = draggedShift();
    setDropTargetDay("");
    setDraggedShiftId("");

    if (!shift || toDateOnly(shift.startsAt) === day) {
      return;
    }

    await onMoveShift(shift, day);
  }

  return (
    <div className="roster-grid">
      {days.map((day) => {
        const dayShifts = shifts.filter((shift) => toDateOnly(shift.startsAt) === day);
        const isDropTarget = dropTargetDay === day;

        return (
          <div
            className={`day-column${isDropTarget ? " drop-target" : ""}`}
            key={day}
            onDragOver={(event) => {
              if (!canManage || !draggedShiftId) {
                return;
              }

              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTargetDay(day);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTargetDay("");
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (canManage) {
                void dropShift(day);
              }
            }}
          >
            <div className="day-heading">
              <span>{weekday(day)}</span>
              <strong>{formatShortDate(day)}</strong>
            </div>
            <div className="day-shifts">
              {dayShifts.length ? (
                dayShifts.map((shift) => (
                  <ShiftTile
                    key={shift.id}
                    shift={shift}
                    isSelected={shift.id === selectedShiftId}
                    canManage={canManage}
                    onSelect={onSelectShift}
                    onDragStart={setDraggedShiftId}
                    onDragEnd={() => {
                      setDraggedShiftId("");
                      setDropTargetDay("");
                    }}
                  />
                ))
              ) : (
                <p className="empty">No shifts</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RosterPublicationActions({
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
          className="secondary-action"
          type="button"
          disabled={isWorking || hasAcknowledged}
          onClick={() => void run(onAcknowledge)}
        >
          <ChevronRight size={17} />
          {hasAcknowledged ? "Acknowledged" : "Acknowledge"}
        </button>
      ) : null}
      {canManage ? (
        <button className="secondary-action" type="button" disabled={isWorking} onClick={() => void run(onPublish)}>
          <CalendarDays size={17} />
          {publication ? "Republish" : "Publish"}
        </button>
      ) : null}
    </>
  );
}

function ShiftTile({
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

  return (
    <button
      className={`shift-tile ${isSelected ? "selected" : ""}`}
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
      <strong>{shift.member.displayName}</strong>
      <span>{timeRange(shift.startsAt, shift.endsAt)}</span>
      {shift.roleName ? <em>{shift.roleName}</em> : null}
    </button>
  );
}

function MemberEditDialog({
  member,
  onClose,
  onSave
}: {
  member: Member;
  onClose: () => void;
  onSave: (
    memberId: string,
    input: {
      email?: string;
      displayName?: string;
      phoneNumber?: string | null;
      role?: "manager" | "staff";
      password?: string;
    }
  ) => Promise<void>;
}) {
  const [email, setEmail] = useState(member.user.email);
  const [displayName, setDisplayName] = useState(member.displayName);
  const [phoneNumber, setPhoneNumber] = useState(member.phoneNumber ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "staff">(member.role);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useDismissOnOutsidePointer<HTMLDivElement>(true, onClose);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await onSave(member.id, {
        email: email.trim(),
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        role,
        password: password || undefined
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div ref={dialogRef} className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="member-edit-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Staff</p>
            <h4 id="member-edit-title">Update staff member</h4>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="form-stack compact" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
          <label>
            Phone
            <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
          </label>
          <label>
            New password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as "manager" | "staff")}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </label>
          <button className="primary-action" type="submit" disabled={isSaving}>
            {isSaving ? "Saving" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MemberList({
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
    <div className="table-wrap">
      <table className="staff-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col">Role</th>
            <th scope="col" className="actions-column">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <StaffSkeletonRows />
          ) : members.length ? (
            members.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>{member.displayName}</strong>
                </td>
                <td>{member.user.email}</td>
                <td className={member.phoneNumber ? "" : "muted-cell"}>{member.phoneNumber ?? "Not provided"}</td>
                <td>
                  <span className="role-badge">{member.role}</span>
                </td>
                <td>
                  <div className="staff-actions">
                    <button type="button" title={`Update ${member.displayName}`} aria-label={`Update ${member.displayName}`} onClick={() => onEdit(member)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="danger"
                      type="button"
                      title={`Delete ${member.displayName}`}
                      aria-label={`Delete ${member.displayName}`}
                      onClick={() => onDelete(member)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>
                <div className="table-empty">
                  <Users size={20} />
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
        <tr className="skeleton-row" key={index}>
          <td>
            <span className="skeleton-cell wide" />
          </td>
          <td>
            <span className="skeleton-cell email" />
          </td>
          <td>
            <span className="skeleton-cell medium" />
          </td>
          <td>
            <span className="skeleton-cell pill" />
          </td>
          <td>
            <span className="skeleton-cell action" />
          </td>
        </tr>
      ))}
    </>
  );
}

function ShiftList({ shifts }: { shifts: Shift[] }) {
  if (!shifts.length) {
    return <p className="empty">No assigned shifts in this range.</p>;
  }

  return (
    <div className="list">
      {shifts.map((shift) => (
        <div className="list-row" key={shift.id}>
          <div>
            <strong>{formatDate(toDateOnly(shift.startsAt))}</strong>
            <span>{timeRange(shift.startsAt, shift.endsAt)}</span>
          </div>
          <small>{shift.business?.name ?? shift.roleName ?? "Shift"}</small>
        </div>
      ))}
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function visibleBusinessesForPortal(businesses: Business[]) {
  const managerBusinesses = businesses.filter((business) => business.members?.[0]?.role === "manager");

  return managerBusinesses.length ? managerBusinesses : businesses;
}

function sectionFromLocation(): WorkspaceSection {
  const hashSection = window.location.hash.replace(/^#\/?/, "");

  if (isWorkspaceSection(hashSection)) {
    return hashSection;
  }

  return defaultWorkspaceSection;
}

function updateSectionHash(section: WorkspaceSection) {
  const nextHash = `#/${section}`;

  if (window.location.hash === nextHash) {
    return;
  }

  window.history.pushState(null, "", nextHash);
}

function isWorkspaceSection(value: string): value is WorkspaceSection {
  return workspaceSections.includes(value as WorkspaceSection);
}

function useDismissOnOutsidePointer<T extends HTMLElement>(isActive: boolean, onDismiss: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node) || containerRef.current?.contains(target)) {
        return;
      }

      onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, onDismiss]);

  return containerRef;
}

function isAuthExpiredError(error: unknown) {
  return error instanceof ApiError && error.status === 401 && error.code === "INVALID_TOKEN";
}

function isAccessTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(paddedPayload)) as { exp?: number };
  } catch {
    return null;
  }
}

function currentMonday() {
  const today = new Date();
  const day = today.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  today.setDate(today.getDate() + offset);
  return toDateInputValue(today);
}

function weekStartForDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);

  return toDateInputValue(date);
}

function addDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function localDateTimeToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateOnly(value: string) {
  return toDateInputValue(new Date(value));
}

function toTimeInputValue(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function formatNullableDateTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function weekday(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function timeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}

function moveShiftToDayInput(shift: Shift, day: string): ShiftInput {
  const endDayOffset = daysBetween(toDateOnly(shift.startsAt), toDateOnly(shift.endsAt));

  return {
    memberId: shift.memberId,
    startsAt: localDateTimeToIso(day, toTimeInputValue(shift.startsAt)),
    endsAt: localDateTimeToIso(addDays(day, endDayOffset), toTimeInputValue(shift.endsAt)),
    roleName: shift.roleName ?? undefined,
    notes: shift.notes ?? undefined
  };
}

function moveShiftToDay(shift: Shift, day: string): Shift {
  const input = moveShiftToDayInput(shift, day);

  return {
    ...shift,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    roleName: input.roleName ?? null,
    notes: input.notes ?? null
  };
}

function daysBetween(startDate: string, endDate: string) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.round((end - start) / millisecondsPerDay);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
