import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { Prisma, type PrismaClient } from "@prisma/client";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../db/prisma.js";
import type { LoginInput, RefreshTokenInput, RegisterInput } from "./auth.schemas.js";
import {
  createAccessToken,
  createRefreshToken,
  createRefreshTokenExpiry,
  hashRefreshToken
} from "./token.service.js";

const PASSWORD_HASH_ROUNDS = 12;

type DbClient = PrismaClient | Prisma.TransactionClient;

type AuthContext = {
  userAgent?: string;
  ipAddress?: string;
};

export async function register(input: RegisterInput, context: AuthContext = {}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash
        },
        select: publicUserSelect
      });

      const tokens = await issueTokenPair(tx, user, context);

      return {
        user,
        ...tokens
      };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "Email is already registered", "EMAIL_ALREADY_REGISTERED");
    }

    throw error;
  }
}

export async function login(input: LoginInput, context: AuthContext = {}) {
  const userWithPassword = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!userWithPassword) {
    throw invalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(input.password, userWithPassword.passwordHash);

  if (!passwordMatches) {
    throw invalidCredentialsError();
  }

  const user = toPublicUser(userWithPassword);
  const tokens = await issueTokenPair(prisma, user, context);

  return {
    user,
    ...tokens
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: publicUserSelect
  });

  if (!user) {
    throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  }

  return user;
}

export async function refresh(input: RefreshTokenInput, context: AuthContext = {}) {
  const tokenHash = hashRefreshToken(input.refreshToken);

  return prisma.$transaction(async (tx) => {
    const storedToken = await tx.refreshToken.findUnique({
      where: {
        tokenHash
      },
      include: {
        user: {
          select: publicUserSelect
        }
      }
    });

    if (!storedToken) {
      throw invalidRefreshTokenError();
    }

    if (storedToken.revokedAt) {
      await revokeRefreshTokenFamily(tx, storedToken.familyId);
      throw new HttpError(
        401,
        "Refresh token has been revoked",
        "REFRESH_TOKEN_REUSED"
      );
    }

    if (storedToken.expiresAt <= new Date()) {
      await tx.refreshToken.update({
        where: {
          id: storedToken.id
        },
        data: {
          revokedAt: new Date()
        }
      });

      throw invalidRefreshTokenError();
    }

    const tokens = await createStoredTokenPair(
      tx,
      storedToken.user,
      context,
      storedToken.familyId
    );

    await tx.refreshToken.update({
      where: {
        id: storedToken.id
      },
      data: {
        revokedAt: new Date(),
        replacedById: tokens.refreshTokenId
      }
    });

    return {
      user: storedToken.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  });
}

export async function logout(input: RefreshTokenInput) {
  const tokenHash = hashRefreshToken(input.refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

async function issueTokenPair(db: DbClient, user: PublicUser, context: AuthContext) {
  return createStoredTokenPair(db, user, context, randomUUID());
}

async function createStoredTokenPair(
  db: DbClient,
  user: PublicUser,
  context: AuthContext,
  familyId: string
) {
  const refreshToken = createRefreshToken();

  const storedRefreshToken = await db.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: createRefreshTokenExpiry(),
      userId: user.id
    }
  });

  return {
    refreshTokenId: storedRefreshToken.id,
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email
    }),
    refreshToken
  };
}

async function revokeRefreshTokenFamily(db: DbClient, familyId: string) {
  await db.refreshToken.updateMany({
    where: {
      familyId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

const publicUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

function toPublicUser(user: PublicUser & { passwordHash: string }): PublicUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function invalidCredentialsError() {
  return new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
}

function invalidRefreshTokenError() {
  return new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
