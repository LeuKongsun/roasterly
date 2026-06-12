import { z } from "zod";

export const rosterWeekQuerySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const publishRosterSchema = rosterWeekQuerySchema;

export type RosterWeekQuery = z.infer<typeof rosterWeekQuerySchema>;
export type PublishRosterInput = z.infer<typeof publishRosterSchema>;
