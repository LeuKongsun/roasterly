import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import { requireManager } from "../members/member.service.js";
import type { CreateBusinessInput, UpdateBusinessInput } from "./business.schemas.js";

const businessSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true
};

export async function createBusiness(userId: string, input: CreateBusinessInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId
      },
      select: {
        email: true
      }
    });

    if (!user) {
      throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    }

    const business = await tx.business.create({
      data: {
        name: input.name,
        members: {
          create: {
            userId,
            role: "manager",
            displayName: user.email
          }
        }
      },
      select: businessSelect
    });

    return business;
  });
}

export async function listBusinesses(userId: string) {
  return prisma.business.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      ...businessSelect,
      members: {
        where: {
          userId
        },
        select: {
          id: true,
          role: true,
          displayName: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function getBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId
    },
    select: businessSelect
  });

  if (!business) {
    throw new HttpError(404, "Business not found", "BUSINESS_NOT_FOUND");
  }

  const membership = await prisma.businessMember.findUnique({
    where: {
      businessId_userId: {
        businessId,
        userId
      }
    },
    select: {
      id: true,
      role: true,
      displayName: true
    }
  });

  if (!membership) {
    throw new HttpError(403, "Business membership is required", "MEMBERSHIP_REQUIRED");
  }

  return {
    ...business,
    membership
  };
}

export async function updateBusiness(
  userId: string,
  businessId: string,
  input: UpdateBusinessInput
) {
  await requireManager(userId, businessId);

  return prisma.business.update({
    where: {
      id: businessId
    },
    data: {
      name: input.name
    },
    select: businessSelect
  });
}

export async function deleteBusiness(userId: string, businessId: string) {
  await requireManager(userId, businessId);

  await prisma.business.delete({
    where: {
      id: businessId
    }
  });
}
