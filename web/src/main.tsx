import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  LogOut,
  MoreHorizontal,
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
  type Invitation,
  type Member,
  type RosterPublication,
  type Shift,
  type ShiftInput,
  addMember,
  acceptInvitation,
  acknowledgeRoster,
  createBusiness,
  createInvitation,
  createShift,
  deleteBusiness,
  deleteShift,
  getRosterPublication,
  listBusinesses,
  listInvitations,
  listMembers,
  listRoster,
  login,
  publishRoster,
  register,
  updateBusiness,
  updateShift
} from "./api";
import "./styles.css";

const tokenStorageKey = "rosterly.accessToken";
const emailStorageKey = "rosterly.email";

type RosterAction = "shift" | "member" | "invite" | "acceptInvite";
type WorkspaceSection = "shifts" | "staff" | "invites" | "join";

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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = mode === "login" ? await login(email, password) : await register(email, password);
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
          <div className="segmented" aria-label="Auth mode">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Login
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

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
            {isSubmitting ? "Working" : mode === "login" ? "Login" : "Create Account"}
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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newInviteToken, setNewInviteToken] = useState("");
  const [roster, setRoster] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [activeRosterAction, setActiveRosterAction] = useState<RosterAction | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("shifts");
  const [publication, setPublication] = useState<RosterPublication | null>(null);
  const [weekStart, setWeekStart] = useState(currentMonday());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const selectedShift = roster.find((shift) => shift.id === selectedShiftId) ?? null;

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
      const businessId = nextBusinessId || loadedBusinesses[0]?.id || "";
      setSelectedBusinessId(businessId);

      if (businessId) {
        const [loadedMembers, loadedRoster] = await Promise.all([
          listMembers(accessToken, businessId),
          listRoster(accessToken, businessId, weekStart)
        ]);
        setMembers(loadedMembers);
        setRoster(loadedRoster);
        if (selectedShiftId && !loadedRoster.some((shift) => shift.id === selectedShiftId)) {
          setSelectedShiftId("");
        }
        setPublication(await getRosterPublication(accessToken, businessId, weekStart));
        setInvitations(await listInvitationsIfManager(accessToken, businessId));
      } else {
        setMembers([]);
        setRoster([]);
        setPublication(null);
        setInvitations([]);
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

  async function handleBusinessCreated(name: string) {
    await runAuthenticated(async () => {
      const business = await createBusiness(accessToken, name);
      setMessage("Business created");
      await refreshAll(business.id);
    });
  }

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

  async function handleMemberAdded(input: { email: string; displayName?: string; role: "manager" | "staff" }) {
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

  async function handleInvitationCreated(input: { email: string; displayName?: string; role: "manager" | "staff" }) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      const result = await createInvitation(accessToken, selectedBusinessId, input);
      setNewInviteToken(result.inviteToken);
      setMessage("Invitation created");
      await refreshAll(selectedBusinessId);
    });
  }

  async function handleInvitationAccepted(inviteToken: string) {
    await runAuthenticated(async () => {
      await acceptInvitation(accessToken, inviteToken);
      setMessage("Invitation accepted");
      setActiveRosterAction(null);
      await refreshAll();
    });
  }

  async function handleShiftCreated(input: ShiftInput) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      await createShift(accessToken, selectedBusinessId, input);
      setMessage("Shift created");
      setActiveRosterAction(null);
      await refreshAll(selectedBusinessId);
    });
  }

  async function handleShiftUpdated(shiftId: string, input: ShiftInput) {
    if (!selectedBusinessId) {
      return;
    }

    await runAuthenticated(async () => {
      await updateShift(accessToken, selectedBusinessId, shiftId, input);
      setMessage("Shift updated");
      setActiveRosterAction(null);
      await refreshAll(selectedBusinessId);
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

    await runAuthenticated(async () => {
      await deleteShift(accessToken, selectedBusinessId, shiftId);
      setSelectedShiftId("");
      setActiveRosterAction(null);
      setMessage("Shift deleted");
      await refreshAll(selectedBusinessId);
    });
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

        <AdminNavigation activeSection={activeSection} onSectionChange={setActiveSection} />

        <div className="sidebar-account">
          <ProfileMenu
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            userEmail={userEmail}
            onCreateBusiness={handleBusinessCreated}
            onSelectBusiness={(businessId) => refreshAll(businessId)}
            onRenameBusiness={handleBusinessRenamed}
            onDeleteBusiness={handleBusinessDeleted}
            onLogout={onLogout}
            onError={setError}
          />
        </div>
      </aside>

      <section className="workbench">
        <header className="topbar">
          <div>
            <p className="eyebrow">Selected business</p>
            <h2>{selectedBusiness?.name ?? "Create a business to start"}</h2>
          </div>
          <div className="toolbar">
            <label className="week-picker">
              Week
              <input value={weekStart} onChange={(event) => setWeekStart(event.target.value)} type="date" />
            </label>
            <button className="icon-button" type="button" onClick={() => void refreshAll()} title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {isLoading ? <p className="muted">Loading roster workspace...</p> : null}

        <RosterActionDrawer
          activeAction={selectedShift ? "shift" : activeRosterAction}
          members={members}
          weekStart={weekStart}
          selectedShift={selectedShift}
          newInviteToken={newInviteToken}
          onCreateShift={handleShiftCreated}
          onUpdateShift={handleShiftUpdated}
          onDeleteShift={handleShiftDeleted}
          onCancel={() => {
            setSelectedShiftId("");
            setActiveRosterAction(null);
          }}
          onAddMember={handleMemberAdded}
          onInvite={handleInvitationCreated}
          onAcceptInvite={handleInvitationAccepted}
          onError={setError}
        />

        <div className="workspace-grid admin-grid">
          <section className="panel roster-panel" aria-labelledby="roster-title">
            {activeSection === "shifts" ? (
              <ShiftsSection
                weekStart={weekStart}
                shifts={roster}
                selectedShiftId={selectedShiftId}
                publication={publication}
                members={members}
                userEmail={userEmail}
                onAddShift={() => {
                  setSelectedShiftId("");
                  setActiveRosterAction("shift");
                }}
                onSelectShift={(shiftId) => {
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
                members={members}
                onAddStaff={() => {
                  setSelectedShiftId("");
                  setActiveRosterAction("member");
                }}
              />
            ) : null}

            {activeSection === "invites" ? (
              <InvitesSection
                invitations={invitations}
                newInviteToken={newInviteToken}
                onCreateInvite={() => {
                  setSelectedShiftId("");
                  setActiveRosterAction("invite");
                }}
              />
            ) : null}

            {activeSection === "join" ? (
              <JoinSection
                onAcceptInvite={() => {
                  setSelectedShiftId("");
                  setActiveRosterAction("acceptInvite");
                }}
              />
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

async function listInvitationsIfManager(token: string, businessId: string) {
  try {
    return await listInvitations(token, businessId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "MANAGER_ROLE_REQUIRED") {
      return [];
    }

    throw error;
  }
}

function AdminNavigation({
  activeSection,
  onSectionChange
}: {
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
}) {
  const sections: Array<{
    id: WorkspaceSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "shifts",
      label: "Shifts",
      icon: <CalendarDays size={18} />
    },
    {
      id: "staff",
      label: "Staff",
      icon: <Users size={18} />
    },
    {
      id: "invites",
      label: "Invites",
      icon: <UserPlus size={18} />
    },
    {
      id: "join",
      label: "Accept invite",
      icon: <ChevronRight size={18} />
    }
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
  weekStart,
  shifts,
  selectedShiftId,
  publication,
  members,
  userEmail,
  onAddShift,
  onSelectShift,
  onMoveShift,
  onPublish,
  onAcknowledge
}: {
  weekStart: string;
  shifts: Shift[];
  selectedShiftId: string;
  publication: RosterPublication | null;
  members: Member[];
  userEmail: string;
  onAddShift: () => void;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string) => Promise<void>;
  onPublish: () => Promise<void>;
  onAcknowledge: () => Promise<void>;
}) {
  return (
    <>
      <div className="panel-heading page-heading">
        <div>
          <p className="eyebrow">Shifts</p>
          <h3 id="roster-title">Week of {formatDate(weekStart)}</h3>
        </div>
        <button className="primary-action" type="button" onClick={onAddShift}>
          <Plus size={17} />
          Add shift
        </button>
      </div>
      <RosterGrid
        weekStart={weekStart}
        shifts={shifts}
        selectedShiftId={selectedShiftId}
        onSelectShift={onSelectShift}
        onMoveShift={onMoveShift}
      />
      <RosterPublicationStatus
        publication={publication}
        members={members}
        userEmail={userEmail}
        onPublish={onPublish}
        onAcknowledge={onAcknowledge}
      />
    </>
  );
}

function StaffSection({ members, onAddStaff }: { members: Member[]; onAddStaff: () => void }) {
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
      <MemberList members={members} />
    </>
  );
}

function InvitesSection({
  invitations,
  newInviteToken,
  onCreateInvite
}: {
  invitations: Invitation[];
  newInviteToken: string;
  onCreateInvite: () => void;
}) {
  return (
    <>
      <div className="panel-heading page-heading">
        <div>
          <p className="eyebrow">Invites</p>
          <h3 id="invites-title">Pending invites</h3>
        </div>
        <button className="secondary-action" type="button" onClick={onCreateInvite}>
          <UserPlus size={17} />
          Create invite
        </button>
      </div>
      {newInviteToken ? <InviteToken token={newInviteToken} /> : null}
      <InvitationList invitations={invitations} showEmpty />
    </>
  );
}

function JoinSection({ onAcceptInvite }: { onAcceptInvite: () => void }) {
  return (
    <>
      <div className="panel-heading page-heading">
        <div>
          <p className="eyebrow">Join</p>
          <h3 id="join-title">Accept invitation</h3>
        </div>
        <button className="primary-action" type="button" onClick={onAcceptInvite}>
          <ChevronRight size={17} />
          Accept invite
        </button>
      </div>
      <p className="empty">Use an invite token to join another business workspace.</p>
    </>
  );
}

function RosterActionDrawer({
  activeAction,
  members,
  weekStart,
  selectedShift,
  newInviteToken,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
  onCancel,
  onAddMember,
  onInvite,
  onAcceptInvite,
  onError
}: {
  activeAction: RosterAction | null;
  members: Member[];
  weekStart: string;
  selectedShift: Shift | null;
  newInviteToken: string;
  onCreateShift: (input: ShiftInput) => Promise<void>;
  onUpdateShift: (shiftId: string, input: ShiftInput) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  onCancel: () => void;
  onAddMember: (input: { email: string; displayName?: string; role: "manager" | "staff" }) => Promise<void>;
  onInvite: (input: { email: string; displayName?: string; role: "manager" | "staff" }) => Promise<void>;
  onAcceptInvite: (token: string) => Promise<void>;
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
        {activeAction === "invite" ? (
          <>
            <InviteForm onInvite={onInvite} onError={onError} />
            {newInviteToken ? <InviteToken token={newInviteToken} /> : null}
          </>
        ) : null}
        {activeAction === "acceptInvite" ? <AcceptInviteForm onAccept={onAcceptInvite} onError={onError} /> : null}
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

  if (action === "invite") {
    return "Invite";
  }

  return "Join";
}

function drawerTitle(action: RosterAction, selectedShift: Shift | null) {
  if (action === "shift") {
    return selectedShift ? "Selected shift" : "New shift";
  }

  if (action === "member") {
    return "Add staff";
  }

  if (action === "invite") {
    return "Create invite";
  }

  return "Accept invite";
}

function ProfileMenu({
  businesses,
  selectedBusinessId,
  userEmail,
  onCreateBusiness,
  onSelectBusiness,
  onRenameBusiness,
  onDeleteBusiness,
  onLogout,
  onError
}: {
  businesses: Business[];
  selectedBusinessId: string;
  userEmail: string;
  onCreateBusiness: (name: string) => Promise<void>;
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
          <div className="profile-create">
            <BusinessForm onCreate={onCreateBusiness} onError={onError} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BusinessForm({
  onCreate,
  onError
}: {
  onCreate: (name: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    try {
      await onCreate(name);
      setName("");
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Business name" required />
      <button type="submit" title="Create business" aria-label="Create business">
        <Plus size={18} />
      </button>
    </form>
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
  const [openMenuId, setOpenMenuId] = useState("");
  const [editingBusinessId, setEditingBusinessId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const openMenuRef = useDismissOnOutsidePointer<HTMLDivElement>(openMenuId !== "", () => setOpenMenuId(""));

  useEffect(() => {
    if (!businesses.some((business) => business.id === openMenuId)) {
      setOpenMenuId("");
    }

    if (!businesses.some((business) => business.id === editingBusinessId)) {
      setEditingBusinessId("");
      setEditingName("");
    }
  }, [businesses, editingBusinessId, openMenuId]);

  if (businesses.length === 0) {
    return <p className="business-empty">No businesses yet</p>;
  }

  function startRename(business: Business) {
    setEditingBusinessId(business.id);
    setEditingName(business.name);
    setOpenMenuId("");
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
    setOpenMenuId("");

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

        return (
          <div className={`business-item${isActive ? " active" : ""}`} key={business.id}>
            {isEditing ? (
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
                <div className="business-options" ref={openMenuId === business.id ? openMenuRef : undefined}>
                  <button
                    className="business-options-trigger"
                    type="button"
                    title={`Options for ${business.name}`}
                    aria-label={`Options for ${business.name}`}
                    aria-expanded={openMenuId === business.id}
                    onClick={() => setOpenMenuId(openMenuId === business.id ? "" : business.id)}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                  {openMenuId === business.id ? (
                    <div className="business-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => startRename(business)}>
                        <Pencil size={15} />
                        Rename
                      </button>
                      <button type="button" role="menuitem" onClick={() => void confirmDelete(business)}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
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
  onAdd: (input: { email: string; displayName?: string; role: "manager" | "staff" }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    try {
      await onAdd({
        email,
        displayName: displayName || undefined,
        role
      });
      setEmail("");
      setDisplayName("");
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
        Display name
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
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

function InviteForm({
  onInvite,
  onError
}: {
  onInvite: (input: { email: string; displayName?: string; role: "manager" | "staff" }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    try {
      await onInvite({
        email,
        displayName: displayName || undefined,
        role
      });
      setEmail("");
      setDisplayName("");
      setRole("staff");
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <form className="form-stack compact separator" onSubmit={submit}>
      <p className="mini-heading">Invite by token</p>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label>
        Display name
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
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
        Create invite
      </button>
    </form>
  );
}

function AcceptInviteForm({
  onAccept,
  onError
}: {
  onAccept: (token: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [token, setToken] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onError("");

    try {
      await onAccept(token);
      setToken("");
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <form className="form-stack compact" onSubmit={submit}>
      <label>
        Invite token
        <input value={token} onChange={(event) => setToken(event.target.value)} required />
      </label>
      <button className="primary-action" type="submit">
        <ChevronRight size={17} />
        Accept invite
      </button>
    </form>
  );
}

function InviteToken({ token }: { token: string }) {
  return (
    <div className="token-box">
      <span>Invite token</span>
      <code>{token}</code>
    </div>
  );
}

function InvitationList({ invitations, showEmpty = false }: { invitations: Invitation[]; showEmpty?: boolean }) {
  const pendingInvitations = invitations.filter(
    (invitation) => !invitation.acceptedAt && !invitation.revokedAt
  );

  if (!pendingInvitations.length) {
    return showEmpty ? <p className="empty">No pending invites</p> : null;
  }

  return (
    <div className="list">
      {pendingInvitations.map((invitation) => (
        <div className="list-row" key={invitation.id}>
          <div>
            <strong>{invitation.displayName ?? invitation.email}</strong>
            <span>{invitation.email}</span>
          </div>
          <small>{invitation.role}</small>
        </div>
      ))}
    </div>
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
    }
  }

  async function removeSelectedShift() {
    if (!selectedShift) {
      return;
    }

    onError("");

    try {
      await onDelete(selectedShift.id);
    } catch (err) {
      onError(errorMessage(err));
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
      <button className="primary-action" type="submit" disabled={!members.length}>
        <Plus size={17} />
        {selectedShift ? "Update shift" : "Create shift"}
      </button>
      {selectedShift ? (
        <div className="edit-actions">
          <button className="secondary-action ghost" type="button" onClick={onCancelEdit}>
            Cancel
          </button>
          <button className="danger-action" type="button" onClick={() => void removeSelectedShift()}>
            Delete shift
          </button>
        </div>
      ) : null}
    </form>
  );
}

function RosterGrid({
  weekStart,
  shifts,
  selectedShiftId,
  onSelectShift,
  onMoveShift
}: {
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
              if (!draggedShiftId) {
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
              void dropShift(day);
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

function RosterPublicationStatus({
  publication,
  members,
  userEmail,
  onPublish,
  onAcknowledge
}: {
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
    <div className="publication-bar">
      <div>
        <strong>{publication ? "Published roster" : "Draft roster"}</strong>
        <span>
          {publication
            ? `Published ${new Date(publication.publishedAt).toLocaleString("en-AU")}`
            : "Publish this week when shifts are ready."}
        </span>
      </div>

      <div className="publication-actions">
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
        <button className="primary-action" type="button" disabled={isWorking} onClick={() => void run(onPublish)}>
          <CalendarDays size={17} />
          {publication ? "Republish" : "Publish"}
        </button>
      </div>

      {publication ? (
        <div className="ack-list">
          {members.map((member) => (
            <span key={member.id} className={acknowledgedMemberIds.has(member.id) ? "done" : ""}>
              {member.displayName}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShiftTile({
  shift,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd
}: {
  shift: Shift;
  isSelected: boolean;
  onSelect: (shiftId: string) => void;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <button
      className={`shift-tile ${isSelected ? "selected" : ""}`}
      type="button"
      draggable
      onClick={() => {
        if (isDragging) {
          return;
        }

        onSelect(shift.id);
      }}
      onDragStart={(event) => {
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

function MemberList({ members }: { members: Member[] }) {
  if (!members.length) {
    return <p className="empty">Add staff after they create an account.</p>;
  }

  return (
    <div className="list">
      {members.map((member) => (
        <div className="list-row" key={member.id}>
          <div>
            <strong>{member.displayName}</strong>
            <span>{member.user.email}</span>
          </div>
          <small>{member.role}</small>
        </div>
      ))}
    </div>
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
