import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import { requireManager, requireMembership } from "../members/member.service.js";
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

export async function publishRoster(userId: string, businessId: string, input: PublishRosterInput) {
  await requireManager(userId, businessId);
  const weekStart = dateOnlyToUtc(input.weekStart);

  return prisma.rosterPublication.upsert({
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
}

export async function getRosterPublication(
  userId: string,
  businessId: string,
  query: RosterWeekQuery
) {
  await requireMembership(userId, businessId);

  return prisma.rosterPublication.findUnique({
    where: {
      businessId_weekStart: {
        businessId,
        weekStart: dateOnlyToUtc(query.weekStart)
      }
    },
    select: publicationSelect
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
