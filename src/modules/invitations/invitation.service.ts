import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../errors/http-error.js";
import { requireManager } from "../members/member.service.js";
import type { AcceptInvitationInput, CreateInvitationInput } from "./invitation.schemas.js";

const INVITATION_EXPIRES_DAYS = 7;

const invitationSelect = {
  id: true,
  businessId: true,
  email: true,
  role: true,
  displayName: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  invitedBy: {
    select: {
      id: true,
      email: true
    }
  }
};

const acceptedMemberSelect = {
  id: true,
  businessId: true,
  userId: true,
  role: true,
  displayName: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true
    }
  },
  business: {
    select: {
      id: true,
      name: true
    }
  }
};

export async function createInvitation(
  userId: string,
  businessId: string,
  input: CreateInvitationInput
) {
  await requireManager(userId, businessId);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true
    }
  });

  if (existingUser) {
    const existingMember = await prisma.businessMember.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: existingUser.id
        }
      },
      select: {
        id: true
      }
    });

    if (existingMember) {
      throw new HttpError(409, "User is already a business member", "MEMBER_ALREADY_EXISTS");
    }
  }

  const token = createInvitationToken();
  const invitation = await prisma.businessInvitation.create({
    data: {
      businessId,
      invitedByUserId: userId,
      email: input.email,
      role: input.role,
      displayName: input.displayName,
      tokenHash: hashInvitationToken(token),
      expiresAt: createInvitationExpiry()
    },
    select: invitationSelect
  });

  return {
    invitation,
    inviteToken: token
  };
}

export async function listInvitations(userId: string, businessId: string) {
  await requireManager(userId, businessId);

  return prisma.businessInvitation.findMany({
    where: {
      businessId
    },
    select: invitationSelect,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function acceptInvitation(userId: string, input: AcceptInvitationInput) {
  const tokenHash = hashInvitationToken(input.token);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    }

    const invitation = await tx.businessInvitation.findUnique({
      where: {
        tokenHash
      },
      select: {
        id: true,
        businessId: true,
        email: true,
        role: true,
        displayName: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true
      }
    });

    if (!invitation) {
      throw invalidInvitationError();
    }

    if (invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      throw invalidInvitationError();
    }

    if (invitation.email !== user.email) {
      throw new HttpError(403, "Invitation email does not match current user", "INVITATION_EMAIL_MISMATCH");
    }

    const existingMember = await tx.businessMember.findUnique({
      where: {
        businessId_userId: {
          businessId: invitation.businessId,
          userId: user.id
        }
      },
      select: {
        id: true
      }
    });

    if (existingMember) {
      throw new HttpError(409, "User is already a business member", "MEMBER_ALREADY_EXISTS");
    }

    const member = await tx.businessMember.create({
      data: {
        businessId: invitation.businessId,
        userId: user.id,
        role: invitation.role,
        displayName: invitation.displayName ?? user.email
      },
      select: acceptedMemberSelect
    });

    await tx.businessInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        acceptedAt: new Date()
      }
    });

    return member;
  });
}

function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInvitationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRES_DAYS);
  return expiresAt;
}

function invalidInvitationError() {
  return new HttpError(401, "Invalid invitation", "INVALID_INVITATION");
}
