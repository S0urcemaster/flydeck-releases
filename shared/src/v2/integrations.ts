import { z } from "zod";

export const blueskyConnectionDtoSchema = z.object({
  provider: z.literal("bluesky"),
  connected: z.boolean(),
  connectionId: z.uuid().optional(),
  handle: z.string().optional(),
  did: z.string().optional(),
});
export type BlueskyConnectionDto = z.infer<typeof blueskyConnectionDtoSchema>;

export const connectBlueskyRequestSchema = z.object({
  handle: z.string().trim().min(1).max(253),
});
export type ConnectBlueskyRequest = z.infer<typeof connectBlueskyRequestSchema>;

export const connectBlueskyResponseSchema = z.object({ authorizationUrl: z.url() });
export const disconnectBlueskyResponseSchema = z.object({ disconnected: z.literal(true) });

export const publishBlueskyThreadRequestSchema = z.object({
  posts: z.array(z.string().trim().min(1).max(3_000)).min(1).max(100),
  imageNodeId: z.uuid().optional(),
});
export type PublishBlueskyThreadRequest = z.infer<typeof publishBlueskyThreadRequestSchema>;

export const publishBlueskyThreadResponseSchema = z.object({
  posts: z.array(z.object({ uri: z.string().min(1), cid: z.string().min(1) })).min(1),
});
export type PublishBlueskyThreadResponse = z.infer<typeof publishBlueskyThreadResponseSchema>;
