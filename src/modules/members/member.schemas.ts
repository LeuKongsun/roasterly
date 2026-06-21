import { z } from "zod";

export const memberRoleSchema = z.enum(["manager", "staff"]);

export const addMemberSchema = z.object({
  email: z.string().trim().email().max(320).toLowerCase(),
  password: z.string().min(8).max(128).optional(),
  role: memberRoleSchema.default("staff"),
  displayName: z.string().trim().min(1).max(100).optional(),
  phoneNumber: z.string().trim().min(1).max(40).optional()
});

export const updateMemberSchema = z
  .object({
    email: z.string().trim().email().max(320).toLowerCase().optional(),
    role: memberRoleSchema.optional(),
    displayName: z.string().trim().min(1).max(100).optional(),
    phoneNumber: z.string().trim().min(1).max(40).nullable().optional()
  })
  .refine((input) => (
    input.email !== undefined ||
    input.role !== undefined ||
    input.displayName !== undefined ||
    input.phoneNumber !== undefined
  ), {
    message: "At least one field must be provided"
  });

export const updateMemberPasswordSchema = z.object({
  password: z.string().min(8).max(128)
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateMemberPasswordInput = z.infer<typeof updateMemberPasswordSchema>;
