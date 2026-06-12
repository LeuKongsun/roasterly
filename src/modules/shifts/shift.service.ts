import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import { findMemberInBusiness, requireManager, requireMembership } from "../members/member.service.js";
import type {
  CreateShiftInput,
  MyShiftsQuery,
  UpdateShiftInput,
  WeeklyRosterQuery
} from "./shift.schemas.js";

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
  await requireMembership(userId, businessId);
  const { from, to } = weekRange(query.weekStart);

  return prisma.shift.findMany({
    where: {
      businessId,
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
  const from = dateOnlyToUtc(query.from);
  const to = dateOnlyToUtc(query.to);

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

function assertValidShiftTime(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt) {
    throw new HttpError(400, "Shift end time must be after start time", "INVALID_SHIFT_TIME");
  }
}

function weekRange(weekStart: string) {
  const from = dateOnlyToUtc(weekStart);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);

  return {
    from,
    to
  };
}

function dateOnlyToUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
