import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1).max(100)
});

export const updateBusinessSchema = createBusinessSchema;

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
