import { z } from "zod";

export const sessionUserDtoSchema = z.object({
  id: z.uuid(),
  displayName: z.string().min(1).max(100),
});

export const workspaceSummaryDtoSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  role: z.enum(["owner", "editor", "viewer"]),
});

export const workspaceListDtoSchema = z.array(workspaceSummaryDtoSchema);

export const loginRequestSchema = z.object({
  loginName: z.string().trim().min(1).max(100),
  password: z.string().min(4),
}).strict();

export const logoutResponseSchema = z.object({ loggedOut: z.literal(true) });

export const sessionDtoSchema = z.discriminatedUnion("authenticated", [
  z.object({
    authenticated: z.literal(false),
    loginRequired: z.boolean(),
    user: z.null(),
    workspaces: z.array(z.never()),
  }),
  z.object({
    authenticated: z.literal(true),
    loginRequired: z.boolean(),
    user: sessionUserDtoSchema,
    workspaces: z.array(workspaceSummaryDtoSchema),
  }),
]);

export type SessionUserDto = z.infer<typeof sessionUserDtoSchema>;
export type WorkspaceSummaryDto = z.infer<typeof workspaceSummaryDtoSchema>;
export type SessionDto = z.infer<typeof sessionDtoSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
