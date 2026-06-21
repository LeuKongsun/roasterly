import { prisma } from "../../db/prisma.js";
import { sendEmail } from "../../email/email.service.js";

const BUSINESS_TIME_ZONE = "Australia/Melbourne";

type RosterEmailSender = typeof sendEmail;

let rosterEmailSender: RosterEmailSender = sendEmail;

export async function sendRosterPublishedEmails(businessId: string, weekStart: string) {
  const [business, staffMembers] = await Promise.all([
    prisma.business.findUnique({
      where: {
        id: businessId
      },
      select: {
        name: true
      }
    }),
    prisma.businessMember.findMany({
      where: {
        businessId,
        role: "staff"
      },
      select: {
        id: true,
        displayName: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    })
  ]);

  if (!business || staffMembers.length === 0) {
    return;
  }

  const { from, to } = weekRange(weekStart);
  const shifts = await prisma.shift.findMany({
    where: {
      businessId,
      startsAt: {
        gte: from,
        lt: to
      }
    },
    select: {
      memberId: true,
      startsAt: true,
      endsAt: true,
      roleName: true,
      notes: true
    },
    orderBy: [
      {
        startsAt: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });

  const deliveries = await Promise.allSettled(
    staffMembers.map((member) => {
      const memberShifts = shifts.filter((shift) => shift.memberId === member.id);

      return rosterEmailSender({
        to: member.user.email,
        subject: `${business.name} roster published for ${formatDate(weekStart)}`,
        html: renderRosterEmailHtml({
          businessName: business.name,
          displayName: member.displayName,
          weekStart,
          shifts: memberShifts
        }),
        text: renderRosterEmailText({
          businessName: business.name,
          displayName: member.displayName,
          weekStart,
          shifts: memberShifts
        })
      });
    })
  );

  for (const delivery of deliveries) {
    if (delivery.status === "rejected") {
      console.error("Failed to send roster publication email", delivery.reason);
    }
  }
}

export function setRosterEmailSenderForTest(sender: RosterEmailSender) {
  rosterEmailSender = sender;
}

export function resetRosterEmailSenderForTest() {
  rosterEmailSender = sendEmail;
}

type RosterEmailShift = {
  startsAt: Date;
  endsAt: Date;
  roleName: string | null;
  notes: string | null;
};

type RosterEmailView = {
  businessName: string;
  displayName: string;
  weekStart: string;
  shifts: RosterEmailShift[];
};

function renderRosterEmailText(view: RosterEmailView) {
  const lines = [
    `Hi ${view.displayName},`,
    "",
    `${view.businessName} has published the roster for the week of ${formatDate(view.weekStart)}.`,
    "",
    "Your shifts:"
  ];

  if (view.shifts.length === 0) {
    lines.push("No shifts are assigned to you for this week.");
  } else {
    lines.push(...view.shifts.map(formatShiftText));
  }

  lines.push("", "Please log in to acknowledge your roster.");

  return lines.join("\n");
}

function renderRosterEmailHtml(view: RosterEmailView) {
  const shiftItems =
    view.shifts.length === 0
      ? "<li>No shifts are assigned to you for this week.</li>"
      : view.shifts.map((shift) => `<li>${escapeHtml(formatShiftText(shift))}</li>`).join("");

  return [
    `<p>Hi ${escapeHtml(view.displayName)},</p>`,
    `<p>${escapeHtml(view.businessName)} has published the roster for the week of ${escapeHtml(formatDate(view.weekStart))}.</p>`,
    "<p>Your shifts:</p>",
    `<ul>${shiftItems}</ul>`,
    "<p>Please log in to acknowledge your roster.</p>"
  ].join("");
}

function formatShiftText(shift: RosterEmailShift) {
  const role = shift.roleName ? ` - ${shift.roleName}` : "";
  const notes = shift.notes ? ` (${shift.notes})` : "";

  return `${formatDateTime(shift.startsAt)} to ${formatTime(shift.endsAt)}${role}${notes}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "medium"
  }).format(dateOnlyToTimeZoneUtc(value, BUSINESS_TIME_ZONE));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: BUSINESS_TIME_ZONE,
    timeStyle: "short"
  }).format(value);
}

function weekRange(weekStart: string) {
  const from = dateOnlyToTimeZoneUtc(weekStart, BUSINESS_TIME_ZONE);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);

  return {
    from,
    to
  };
}

function dateOnlyToTimeZoneUtc(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const offset = timeZoneOffsetMs(utcDate, timeZone);
  const firstPass = new Date(utcDate.getTime() - offset);
  const correctedOffset = timeZoneOffsetMs(firstPass, timeZone);

  return new Date(utcDate.getTime() - correctedOffset);
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(valueByType.get("year")),
    Number(valueByType.get("month")) - 1,
    Number(valueByType.get("day")),
    Number(valueByType.get("hour")),
    Number(valueByType.get("minute")),
    Number(valueByType.get("second"))
  );

  return asUtc - date.getTime();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
