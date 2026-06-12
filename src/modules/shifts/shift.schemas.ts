import { z } from "zod";

const dateTimeSchema = z.string().datetime().transform((value) => new Date(value));

export const createShiftSchema = z.object({
  memberId: z.string().min(1),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
  roleName: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(500).optional()
});

export const updateShiftSchema = z
  .object({
    memberId: z.string().min(1).optional(),
    startsAt: dateTimeSchema.optional(),
    endsAt: dateTimeSchema.optional(),
    roleName: z.string().trim().min(1).max(100).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional()
  })
  .refine(
    (input) =>
      input.memberId !== undefined ||
      input.startsAt !== undefined ||
      input.endsAt !== undefined ||
      input.roleName !== undefined ||
      input.notes !== undefined,
    {
      message: "At least one field must be provided"
    }
  );

export const weeklyRosterQuerySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const myShiftsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type WeeklyRosterQuery = z.infer<typeof weeklyRosterQuerySchema>;
export type MyShiftsQuery = z.infer<typeof myShiftsQuerySchema>;
