import { createContext } from "react";
import type { RosterPublication, RosterRecord, Shift, Member } from "../api";

export type RosterAction = "shift" | "member";
export type WorkspaceSection = "shifts" | "staff";
export type RosterView = "records" | "board";
export const defaultWorkspaceSection: WorkspaceSection = "shifts";
export const workspaceSections: WorkspaceSection[] = ["shifts", "staff"];

export interface WorkspaceContextType {
  view: RosterView;
  boardView: "calendar" | "timeline";
  onBoardViewChange: (view: "calendar" | "timeline") => void;
  isLoading: boolean;
  canManage: boolean;
  weekStart: string;
  records: RosterRecord[];
  shifts: Shift[];
  selectedShiftId: string;
  publication: RosterPublication | null;
  members: Member[];
  userEmail: string;
  onAddShift: (day?: string, memberId?: string) => void;
  onEditShift: (shift: Shift) => void;
  onLoadRosterWeeks: (weekStarts: string[]) => Promise<Shift[]>;
  onCreateRoster: (weekStart?: string) => void;
  onOpenRoster: (weekStart: string) => void;
  onSelectShift: (shiftId: string) => void;
  onMoveShift: (shift: Shift, day: string, memberId?: string) => Promise<void>;
  onPublish: () => Promise<void>;
  onAcknowledge: () => Promise<void>;
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
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);
