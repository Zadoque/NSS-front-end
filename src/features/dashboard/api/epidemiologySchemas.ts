import { z } from "zod";

const itemSchema = z.union([
  z.object({ code: z.string().min(1), name: z.string(), notificationsTotal: z.number().int().nonnegative() }),
  z.object({
    cdMun: z.string().min(1),
    nmMun: z.string(),
    casesTotal: z.number().int().nonnegative(),
  }),
]);

export const epidemiologyResponseSchema = z.object({
  items: z.array(itemSchema),
  year: z.union([z.number().int(), z.literal("ALL")]).optional(),
  month: z.union([z.number().int(), z.literal("ALL")]).optional(),
  totalNotifications: z.number().int().nonnegative().nullable().optional(),
  coverage: z.object({
    status: z.enum(["AVAILABLE", "UNAVAILABLE", "PARTIAL"]),
    mappedNotificationsTotal: z.number().int().nonnegative(),
    unmappedNotificationsTotal: z.number().int().nonnegative(),
  }).optional(),
  filters: z.object({ year: z.union([z.number().int(), z.literal("ALL")]).optional(), month: z.union([z.number().int(), z.literal("ALL")]).optional() }).optional(),
});

export const diseasesResponseSchema = z.object({ items: z.array(z.string().min(1)) });

export const metadataResponseSchema = z.object({
  availableYears: z.array(z.number().int()),
  availableMonthsByYear: z.record(z.string(), z.array(z.number().int().min(1).max(12))),
});
