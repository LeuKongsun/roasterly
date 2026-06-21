import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import { requireManager, requireMembership } from "../members/member.service.js";
import { sendRosterPublishedEmails } from "./roster-email.service.js";
import type { PublishRosterInput, RosterWeekQuery } from "./roster.schemas.js";

const publicationSelect = {
  id: true,
  businessId: true,
  weekStart: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  publishedBy: {
    select: {
      id: true,
      email: true
    }
  },
  acknowledgements: {
    select: {
      id: true,
      acknowledgedAt: true,
      member: {
        select: {
          id: true,
          displayName: true,
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      acknowledgedAt: "asc"
    }
  }
} satisfies Prisma.RosterPublicationSelect;

type RosterRecord = {
  weekStart: string;
  status: "draft" | "published";
  shiftCount: number;
  staffCount: number;
  acknowledgementCount: number;
  publishedAt: Date | null;
  updatedAt: Date | null;
};

const BUSINESS_TIME_ZONE = "Australia/Melbourne";

export async function listRosterRecords(userId: string, businessId: string) {
  const membership = await requireMembership(userId, businessId);

  const [shifts, publications] = await Promise.all([
    prisma.shift.findMany({
      where: {
        businessId,
        ...(membership.role === "staff" ? { memberId: membership.id } : {})
      },
      select: {
        startsAt: true,
        updatedAt: true,
        memberId: true
      }
    }),
    prisma.rosterPublication.findMany({
      where: {
        businessId
      },
      select: {
        weekStart: true,
        publishedAt: true,
        updatedAt: true,
        acknowledgements: {
          select: {
            id: true,
            memberId: true
          }
        }
      }
    })
  ]);

  const records = new Map<string, RosterRecord & { memberIds: Set<string> }>();

  for (const shift of shifts) {
    const weekStart = weekStartForDate(shift.startsAt, BUSINESS_TIME_ZONE);
    const record = ensureRosterRecord(records, weekStart);
    record.shiftCount += 1;
    record.memberIds.add(shift.memberId);
    record.staffCount = record.memberIds.size;
    record.updatedAt = latestDate(record.updatedAt, shift.updatedAt);
  }

  for (const publication of publications) {
    const weekStart = dateOnlyUtc(publication.weekStart);
    const existingRecord = records.get(weekStart);

    if (membership.role === "staff" && !existingRecord) {
      continue;
    }

    const record = ensureRosterRecord(records, weekStart);
    record.status = "published";
    record.publishedAt = publication.publishedAt;
    record.acknowledgementCount = publication.acknowledgements.filter((acknowledgement) => (
      membership.role === "manager" || acknowledgement.memberId === membership.id
    )).length;
    record.updatedAt = latestDate(record.updatedAt, publication.updatedAt);
  }

  return Array.from(records.values())
    .map(({ memberIds: _memberIds, ...record }) => record)
    .sort((left, right) => right.weekStart.localeCompare(left.weekStart));
}

export async function publishRoster(userId: string, businessId: string, input: PublishRosterInput) {
  await requireManager(userId, businessId);
  const weekStart = dateOnlyToUtc(input.weekStart);

  const publication = await prisma.rosterPublication.upsert({
    where: {
      businessId_weekStart: {
        businessId,
        weekStart
      }
    },
    create: {
      businessId,
      weekStart,
      publishedByUserId: userId
    },
    update: {
      publishedAt: new Date(),
      publishedByUserId: userId,
      acknowledgements: {
        deleteMany: {}
      }
    },
    select: publicationSelect
  });

  await sendRosterPublishedEmails(businessId, input.weekStart);

  return publication;
}

export async function getRosterPublication(
  userId: string,
  businessId: string,
  query: RosterWeekQuery
) {
  const membership = await requireMembership(userId, businessId);

  return prisma.rosterPublication.findUnique({
    where: {
      businessId_weekStart: {
        businessId,
        weekStart: dateOnlyToUtc(query.weekStart)
      }
    },
    select: {
      ...publicationSelect,
      acknowledgements: {
        ...publicationSelect.acknowledgements,
        where: membership.role === "staff" ? { memberId: membership.id } : undefined
      }
    }
  });
}

export async function acknowledgeRoster(userId: string, businessId: string, publicationId: string) {
  const membership = await requireMembership(userId, businessId);
  const publication = await prisma.rosterPublication.findFirst({
    where: {
      id: publicationId,
      businessId
    },
    select: {
      id: true
    }
  });

  if (!publication) {
    throw new HttpError(404, "Roster publication not found", "ROSTER_PUBLICATION_NOT_FOUND");
  }

  return prisma.rosterAcknowledgement.upsert({
    where: {
      publicationId_memberId: {
        publicationId,
        memberId: membership.id
      }
    },
    create: {
      publicationId,
      memberId: membership.id
    },
    update: {
      acknowledgedAt: new Date()
    },
    select: {
      id: true,
      publicationId: true,
      acknowledgedAt: true,
      member: {
        select: {
          id: true,
          displayName: true,
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      }
    }
  });
}

function dateOnlyToUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function ensureRosterRecord(
  records: Map<string, RosterRecord & { memberIds: Set<string> }>,
  weekStart: string
) {
  const existingRecord = records.get(weekStart);

  if (existingRecord) {
    return existingRecord;
  }

  const record = {
    weekStart,
    status: "draft" as const,
    shiftCount: 0,
    staffCount: 0,
    acknowledgementCount: 0,
    publishedAt: null,
    updatedAt: null,
    memberIds: new Set<string>()
  };
  records.set(weekStart, record);

  return record;
}

function latestDate(current: Date | null, next: Date) {
  return current && current > next ? current : next;
}

function weekStartForDate(value: Date, timeZone: string) {
  const dateOnly = dateOnlyInTimeZone(value, timeZone);
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);

  return dateOnlyUtc(date);
}

function dateOnlyInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${valueByType.get("year")}-${valueByType.get("month")}-${valueByType.get("day")}`;
}

function dateOnlyUtc(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
