import type { Shift, ShiftInput } from "../api";

export function currentMonday() {
  const today = new Date();
  const day = today.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  today.setDate(today.getDate() + offset);
  return toDateInputValue(today);
}

export function weekStartForDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);

  return toDateInputValue(date);
}

export function addDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function localDateTimeToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateOnly(value: string) {
  return toDateInputValue(new Date(value));
}

export function toTimeInputValue(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatNullableDateTime(value: string | null) {
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

export function weekday(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short"
  }).format(new Date(`${value}T00:00:00`));
}

export function timeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}

export function calculateHours(startsAt: string, endsAt: string): string {
  const diffMs = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours > 0 ? `${hours.toFixed(1).replace(/\.0$/, "")}h` : "";
}

export function moveShiftToDayAndMemberInput(shift: Shift, day: string, memberId: string): ShiftInput {
  const endDayOffset = daysBetween(toDateOnly(shift.startsAt), toDateOnly(shift.endsAt));

  return {
    memberId,
    startsAt: localDateTimeToIso(day, toTimeInputValue(shift.startsAt)),
    endsAt: localDateTimeToIso(addDays(day, endDayOffset), toTimeInputValue(shift.endsAt)),
    roleName: shift.roleName ?? undefined,
    notes: shift.notes ?? undefined
  };
}

export function moveShiftToDayAndMember(shift: Shift, day: string, memberId: string, member: Shift["member"]): Shift {
  const input = moveShiftToDayAndMemberInput(shift, day, memberId);

  return {
    ...shift,
    memberId,
    member: {
      id: member.id,
      displayName: member.displayName,
      role: member.role,
      user: member.user
    },
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
