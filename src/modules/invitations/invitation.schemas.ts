import { z } from "zod";
import { memberRoleSchema } from "../members/member.schemas.js";

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320).toLowerCase(),
  role: memberRoleSchema.default("staff"),
  displayName: z.string().trim().min(1).max(100).optional()
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1)
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
