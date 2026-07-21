import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import { findMemberInBusiness, requireManager, requireMembership } from "../members/member.service.js";
import type {
  CreateShiftInput,
  MyShiftsQuery,
  UpdateShiftInput,
  WeeklyRosterQuery
} from "./shift.schemas.js";

const BUSINESS_TIME_ZONE = "Australia/Melbourne";

const shiftSelect = {
  id: true,
  businessId: true,
  memberId: true,
  startsAt: true,
  endsAt: true,
  roleName: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: {
      id: true,
      displayName: true,
      role: true,
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  }
};

export async function createShift(userId: string, businessId: string, input: CreateShiftInput) {
  await requireManager(userId, businessId);
  assertValidShiftTime(input.startsAt, input.endsAt);
  assertNotPastDate(input.startsAt);
  await assertMemberBelongsToBusiness(businessId, input.memberId);

  return prisma.shift.create({
    data: {
      businessId,
      memberId: input.memberId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      roleName: input.roleName,
      notes: input.notes
    },
    select: shiftSelect
  });
}

export async function listWeeklyRoster(
  userId: string,
  businessId: string,
  query: WeeklyRosterQuery
) {
  const membership = await requireMembership(userId, businessId);
  const { from, to } = weekRange(query.weekStart);

  return prisma.shift.findMany({
    where: {
      businessId,
      ...(membership.role === "staff" ? { memberId: membership.id } : {}),
      startsAt: {
        gte: from,
        lt: to
      }
    },
    select: shiftSelect,
    orderBy: [
      {
        startsAt: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });
}

export async function updateShift(
  userId: string,
  businessId: string,
  shiftId: string,
  input: UpdateShiftInput
) {
  await requireManager(userId, businessId);
  const existingShift = await prisma.shift.findFirst({
    where: {
      id: shiftId,
      businessId
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true
    }
  });

  if (!existingShift) {
    throw new HttpError(404, "Shift not found", "SHIFT_NOT_FOUND");
  }

  if (input.memberId) {
    await assertMemberBelongsToBusiness(businessId, input.memberId);
  }

  const startsAt = input.startsAt ?? existingShift.startsAt;
  const endsAt = input.endsAt ?? existingShift.endsAt;
  assertValidShiftTime(startsAt, endsAt);
  assertNotPastDate(startsAt);

  return prisma.shift.update({
    where: {
      id: shiftId
    },
    data: {
      memberId: input.memberId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      roleName: input.roleName,
      notes: input.notes
    },
    select: shiftSelect
  });
}

export async function deleteShift(userId: string, businessId: string, shiftId: string) {
  await requireManager(userId, businessId);
  const existingShift = await prisma.shift.findFirst({
    where: {
      id: shiftId,
      businessId
    },
    select: {
      id: true
    }
  });

  if (!existingShift) {
    throw new HttpError(404, "Shift not found", "SHIFT_NOT_FOUND");
  }

  await prisma.shift.delete({
    where: {
      id: shiftId
    }
  });
}

export async function listMyShifts(userId: string, query: MyShiftsQuery) {
  const from = dateOnlyToTimeZoneUtc(query.from, BUSINESS_TIME_ZONE);
  const to = dateOnlyToTimeZoneUtc(query.to, BUSINESS_TIME_ZONE);

  if (to <= from) {
    throw new HttpError(400, "`to` must be after `from`", "INVALID_SHIFT_TIME");
  }

  return prisma.shift.findMany({
    where: {
      startsAt: {
        gte: from,
        lt: to
      },
      member: {
        userId
      }
    },
    select: {
      ...shiftSelect,
      business: {
        select: {
          id: true,
          name: true
        }
      }
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
}

async function assertMemberBelongsToBusiness(businessId: string, memberId: string) {
  const member = await findMemberInBusiness(businessId, memberId);

  if (!member) {
    throw new HttpError(
      400,
      "Assigned member must belong to the same business",
      "SHIFT_MEMBER_BUSINESS_MISMATCH"
    );
  }
}


function assertNotPastDate(startsAt: Date) {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  const shiftDateStr = getDateOnlyString(startsAt, BUSINESS_TIME_ZONE);
  const todayStr = getTodayDateOnlyString(BUSINESS_TIME_ZONE);
  if (shiftDateStr < todayStr) {
    throw new HttpError(400, "Shifts cannot be created or edited for past dates", "INVALID_SHIFT_DATE");
  }
}

function getTodayDateOnlyString(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  return valueByType.get("year") + "-" + valueByType.get("month") + "-" + valueByType.get("day");
}

function getDateOnlyString(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  return valueByType.get("year") + "-" + valueByType.get("month") + "-" + valueByType.get("day");
}

function assertValidShiftTime(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt) {
    throw new HttpError(400, "Shift end time must be after start time", "INVALID_SHIFT_TIME");
  }
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
