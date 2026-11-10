import { z } from "zod";

export const DashboardQuerySchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    granularity: z.enum(["day", "week", "month"]).optional().default("day"),
});

export const AuditLogsQuerySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    entity: z.string().optional(),
    action: z.string().optional(),
    q: z.string().optional(),
});
