import { z } from "zod";

export const memberRoleSchema = z.enum(["manager", "staff"]);

export const addMemberSchema = z.object({
  email: z.string().trim().email().max(320).toLowerCase(),
  role: memberRoleSchema.default("staff"),
  displayName: z.string().trim().min(1).max(100).optional()
});

export const updateMemberSchema = z
  .object({
    role: memberRoleSchema.optional(),
    displayName: z.string().trim().min(1).max(100).optional()
  })
  .refine((input) => input.role !== undefined || input.displayName !== undefined, {
    message: "At least one field must be provided"
  });

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
