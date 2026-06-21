import { Prisma, type BusinessMemberRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  AddMemberInput,
  UpdateMemberInput,
  UpdateMemberPasswordInput
} from "./member.schemas.js";

const PASSWORD_HASH_ROUNDS = 12;

const memberSelect = {
  id: true,
  businessId: true,
  userId: true,
  role: true,
  displayName: true,
  phoneNumber: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true
    }
  }
};

export async function listMembers(userId: string, businessId: string) {
  const membership = await requireMembership(userId, businessId);

  return prisma.businessMember.findMany({
    where: {
      businessId,
      ...(membership.role === "staff" ? { id: membership.id } : {})
    },
    select: memberSelect,
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function addMember(userId: string, businessId: string, input: AddMemberInput) {
  await requireManager(userId, businessId);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true,
      email: true
    }
  });

  if (!existingUser && !input.password) {
    throw new HttpError(400, "Password is required for new staff users", "MEMBER_PASSWORD_REQUIRED");
  }

  try {
    const user = existingUser ?? await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await bcrypt.hash(input.password ?? "", PASSWORD_HASH_ROUNDS)
      },
      select: {
        id: true,
        email: true
      }
    });

    return await prisma.businessMember.create({
      data: {
        businessId,
        userId: user.id,
        role: input.role,
        displayName: input.displayName ?? user.email,
        phoneNumber: input.phoneNumber
      },
      select: memberSelect
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "User is already a business member", "MEMBER_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function updateMember(
  userId: string,
  businessId: string,
  memberId: string,
  input: UpdateMemberInput
) {
  await requireManager(userId, businessId);
  const member = await findMemberInBusiness(businessId, memberId);

  if (!member) {
    throw new HttpError(404, "Member not found", "MEMBER_NOT_FOUND");
  }

  if (member.role === "manager" && input.role === "staff") {
    await assertNotLastManager(businessId, memberId);
  }

  const { email, ...memberInput } = input;
  const nextUserId = email ? await findUserIdByEmail(email) : undefined;

  try {
    return await prisma.businessMember.update({
      where: {
        id: memberId
      },
      data: {
        ...memberInput,
        userId: nextUserId
      },
      select: memberSelect
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "User is already a business member", "MEMBER_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function deleteMember(userId: string, businessId: string, memberId: string) {
  await requireManager(userId, businessId);
  const member = await findMemberInBusiness(businessId, memberId);

  if (!member) {
    throw new HttpError(404, "Member not found", "MEMBER_NOT_FOUND");
  }

  if (member.role === "manager") {
    await assertNotLastManager(businessId, memberId);
  }

  await prisma.businessMember.delete({
    where: {
      id: memberId
    }
  });
}

export async function updateMemberPassword(
  userId: string,
  businessId: string,
  memberId: string,
  input: UpdateMemberPasswordInput
) {
  await requireManager(userId, businessId);
  const member = await findMemberInBusiness(businessId, memberId);

  if (!member) {
    throw new HttpError(404, "Member not found", "MEMBER_NOT_FOUND");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: member.userId
      },
      data: {
        passwordHash
      }
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: member.userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    })
  ]);
}

export async function requireMembership(userId: string, businessId: string) {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId
    },
    select: {
      id: true
    }
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
      businessId: true,
      userId: true
    }
  });

  if (!membership) {
    throw new HttpError(403, "Business membership is required", "MEMBERSHIP_REQUIRED");
  }

  return membership;
}

export async function requireManager(userId: string, businessId: string) {
  const membership = await requireMembership(userId, businessId);

  if (membership.role !== "manager") {
    throw new HttpError(403, "Manager role is required", "MANAGER_ROLE_REQUIRED");
  }

  return membership;
}

export async function findMemberInBusiness(businessId: string, memberId: string) {
  return prisma.businessMember.findFirst({
    where: {
      id: memberId,
      businessId
    },
    select: {
      id: true,
      role: true,
      userId: true
    }
  });
}

async function findUserIdByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email
    },
    select: {
      id: true
    }
  });

  if (!user) {
    throw new HttpError(404, "User with that email was not found", "MEMBER_EMAIL_NOT_FOUND");
  }

  return user.id;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function assertNotLastManager(businessId: string, memberId: string) {
  const managerCount = await prisma.businessMember.count({
    where: {
      businessId,
      role: "manager",
      id: {
        not: memberId
      }
    }
  });

  if (managerCount === 0) {
    throw new HttpError(400, "Business must keep at least one manager", "LAST_MANAGER_REQUIRED");
  }
}

export type MembershipRole = BusinessMemberRole;
