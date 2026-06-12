import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  LogOut,
  Plus,
  RefreshCw,
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
  deleteShift,
  getRosterPublication,
  listBusinesses,
  listInvitations,
  listMembers,
  listMyShifts,
  listRoster,
  login,
  publishRoster,
  register,
  updateShift
} from "./api";
import "./styles.css";

const tokenStorageKey = "rosterly.accessToken";
const emailStorageKey = "rosterly.email";

function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(tokenStorageKey) ?? "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem(emailStorageKey) ?? "");

  function handleAuth(token: string, email: string) {
    localStorage.setItem(tokenStorageKey, token);
    localStorage.setItem(emailStorageKey, email);
    setAccessToken(token);
    setUserEmail(email);
  }

  function logout() {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(emailStorageKey);
    setAccessToken("");
    setUserEmail("");
  }

  if (!accessToken) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return <Workspace accessToken={accessToken} userEmail={userEmail} onLogout={logout} />;
}

function AuthScreen({ onAuth }: { onAuth: (token: string, email: string) => void }) {
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
  onLogout: () => void;
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newInviteToken, setNewInviteToken] = useState("");
  const [roster, setRoster] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [publication, setPublication] = useState<RosterPublication | null>(null);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [weekStart, setWeekStart] = useState(currentMonday());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const selectedShift = roster.find((shift) => shift.id === selectedShiftId) ?? null;
  const rangeEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  async function refreshAll(nextBusinessId = selectedBusinessId) {
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

      setMyShifts(await listMyShifts(accessToken, weekStart, rangeEnd));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, [accessToken, weekStart]);

  async function handleBusinessCreated(name: string) {
    const business = await createBusiness(accessToken, name);
    setMessage("Business created");
    await refreshAll(business.id);
  }

  async function handleMemberAdded(input: { email: string; displayName?: string; role: "manager" | "staff" }) {
    if (!selectedBusinessId) {
      return;
    }

    await addMember(accessToken, selectedBusinessId, input);
    setMessage("Staff member added");
    await refreshAll(selectedBusinessId);
  }

  async function handleInvitationCreated(input: { email: string; displayName?: string; role: "manager" | "staff" }) {
    if (!selectedBusinessId) {
      return;
    }

    const result = await createInvitation(accessToken, selectedBusinessId, input);
    setNewInviteToken(result.inviteToken);
    setMessage("Invitation created");
    await refreshAll(selectedBusinessId);
  }

  async function handleInvitationAccepted(inviteToken: string) {
    await acceptInvitation(accessToken, inviteToken);
    setMessage("Invitation accepted");
    await refreshAll();
  }

  async function handleShiftCreated(input: ShiftInput) {
    if (!selectedBusinessId) {
      return;
    }

    await createShift(accessToken, selectedBusinessId, input);
    setMessage("Shift created");
    await refreshAll(selectedBusinessId);
  }

  async function handleShiftUpdated(shiftId: string, input: ShiftInput) {
    if (!selectedBusinessId) {
      return;
    }

    await updateShift(accessToken, selectedBusinessId, shiftId, input);
    setMessage("Shift updated");
    await refreshAll(selectedBusinessId);
  }

  async function handleShiftDeleted(shiftId: string) {
    if (!selectedBusinessId) {
      return;
    }

    await deleteShift(accessToken, selectedBusinessId, shiftId);
    setSelectedShiftId("");
    setMessage("Shift deleted");
    await refreshAll(selectedBusinessId);
  }

  async function handleRosterPublished() {
    if (!selectedBusinessId) {
      return;
    }

    const nextPublication = await publishRoster(accessToken, selectedBusinessId, weekStart);
    setPublication(nextPublication);
    setMessage("Roster published");
    await refreshAll(selectedBusinessId);
  }

  async function handleRosterAcknowledged() {
    if (!selectedBusinessId || !publication) {
      return;
    }

    await acknowledgeRoster(accessToken, selectedBusinessId, publication.id);
    setMessage("Roster acknowledged");
    await refreshAll(selectedBusinessId);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Rosterly</p>
          <h1>Weekly roster control</h1>
        </div>

        <BusinessForm onCreate={handleBusinessCreated} onError={setError} />

        <nav className="business-list" aria-label="Businesses">
          {businesses.map((business) => (
            <button
              key={business.id}
              className={business.id === selectedBusinessId ? "active" : ""}
              onClick={() => void refreshAll(business.id)}
              type="button"
            >
              <Building2 size={17} />
              <span>{business.name}</span>
            </button>
          ))}
        </nav>

        <div className="signed-in">
          <span>{userEmail}</span>
          <button type="button" onClick={onLogout} title="Log out" aria-label="Log out">
            <LogOut size={18} />
          </button>
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

        <div className="workspace-grid">
          <section className="panel roster-panel" aria-labelledby="roster-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Roster</p>
                <h3 id="roster-title">Week of {formatDate(weekStart)}</h3>
              </div>
              <CalendarDays size={20} />
            </div>
            <RosterGrid
              weekStart={weekStart}
              shifts={roster}
              selectedShiftId={selectedShiftId}
              onSelectShift={setSelectedShiftId}
            />
            <RosterPublicationStatus
              publication={publication}
              members={members}
              userEmail={userEmail}
              onPublish={handleRosterPublished}
              onAcknowledge={handleRosterAcknowledged}
            />
          </section>

          <section className="panel" aria-labelledby="shift-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{selectedShift ? "Edit" : "Assign"}</p>
                <h3 id="shift-title">{selectedShift ? "Selected shift" : "New shift"}</h3>
              </div>
              <Plus size={20} />
            </div>
            <ShiftForm
              members={members}
              weekStart={weekStart}
              selectedShift={selectedShift}
              onCreate={handleShiftCreated}
              onUpdate={handleShiftUpdated}
              onDelete={handleShiftDeleted}
              onCancelEdit={() => setSelectedShiftId("")}
              onError={setError}
            />
          </section>

          <section className="panel" aria-labelledby="members-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Team</p>
                <h3 id="members-title">Members</h3>
              </div>
              <Users size={20} />
            </div>
            <MemberForm onAdd={handleMemberAdded} onError={setError} />
            <InviteForm onInvite={handleInvitationCreated} onError={setError} />
            {newInviteToken ? <InviteToken token={newInviteToken} /> : null}
            <InvitationList invitations={invitations} />
            <MemberList members={members} />
          </section>

          <section className="panel" aria-labelledby="my-shifts-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Personal</p>
                <h3 id="my-shifts-title">My shifts</h3>
              </div>
              <Clock3 size={20} />
            </div>
            <ShiftList shifts={myShifts} />
          </section>

          <section className="panel" aria-labelledby="accept-invite-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Join</p>
                <h3 id="accept-invite-title">Accept invitation</h3>
              </div>
              <ChevronRight size={20} />
            </div>
            <AcceptInviteForm onAccept={handleInvitationAccepted} onError={setError} />
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

function InvitationList({ invitations }: { invitations: Invitation[] }) {
  const pendingInvitations = invitations.filter(
    (invitation) => !invitation.acceptedAt && !invitation.revokedAt
  );

  if (!pendingInvitations.length) {
    return null;
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
  onSelectShift
}: {
  weekStart: string;
  shifts: Shift[];
  selectedShiftId: string;
  onSelectShift: (shiftId: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <div className="roster-grid">
      {days.map((day) => {
        const dayShifts = shifts.filter((shift) => toDateOnly(shift.startsAt) === day);

        return (
          <div className="day-column" key={day}>
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
  onSelect
}: {
  shift: Shift;
  isSelected: boolean;
  onSelect: (shiftId: string) => void;
}) {
  return (
    <button
      className={`shift-tile ${isSelected ? "selected" : ""}`}
      type="button"
      onClick={() => onSelect(shift.id)}
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
