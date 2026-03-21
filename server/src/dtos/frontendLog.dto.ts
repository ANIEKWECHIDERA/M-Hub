import { z } from "zod";

export const frontendLogSchema = z.object({
  level: z.enum(["error", "warn", "info"]).default("error"),
  type: z.enum(["runtime_error", "unhandled_rejection", "console_error", "manual"]).default("manual"),
  message: z.string().trim().min(1).max(4000),
  stack: z.string().trim().max(12000).nullable().optional(),
  component: z.string().trim().max(200).nullable().optional(),
  path: z.string().trim().max(500).nullable().optional(),
  href: z.string().trim().max(2000).nullable().optional(),
  userAgent: z.string().trim().max(1000).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export type FrontendLogDTO = z.infer<typeof frontendLogSchema>;
