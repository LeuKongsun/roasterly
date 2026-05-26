import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().max(320).toLowerCase(),
  password: z.string().min(8).max(128)
});

export const loginSchema = registerSchema;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
