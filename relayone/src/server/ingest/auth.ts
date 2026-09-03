import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export function requireIngestSecret(secret: string): RequestHandler {
  const expected = Buffer.from(secret);
  return (request, response, next) => {
    const authorization = request.header("authorization");
    const supplied = authorization?.startsWith("Bearer ")
      ? Buffer.from(authorization.slice("Bearer ".length))
      : null;
    if (!supplied || supplied.length !== expected.length
      || !timingSafeEqual(supplied, expected)) {
      response.status(401).json({
        error: "INGEST_UNAUTHORIZED",
        message: "Valid Relay One ingest credentials are required.",
      });
      return;
    }
    next();
  };
}
