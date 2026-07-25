import { timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { AppConfig } from "./config.js";

const cookieName = "flydeck_session";
const loginSchema = z.object({ token: z.string().min(1) });

export type AuthGuard = {
  requireUser: RequestHandler;
  router: Router;
};

export function createAuthGuard(config: AppConfig): AuthGuard {
  const router = Router();

  if (config.auth.mode === "off") {
    router.get("/session", (_request, response) => response.json({ authenticated: true, mode: "off", user: "owner" }));
    return { router, requireUser: (_request, _response, next) => next() };
  }

  const expectedToken = config.auth.token!;
  const isAuthenticated = (cookieHeader: string | undefined) =>
    safeTokenEquals(readCookie(cookieHeader, cookieName), expectedToken);

  router.get("/session", (request, response) => {
    const authenticated = isAuthenticated(request.headers.cookie);
    response.status(authenticated ? 200 : 401).json({ authenticated, mode: "token", user: authenticated ? "owner" : null });
  });
  router.post("/login", (request, response) => {
    const { token } = loginSchema.parse(request.body);
    if (!safeTokenEquals(token, expectedToken)) {
      response.status(401).json({ error: "INVALID_CREDENTIALS", message: "The access token is invalid" });
      return;
    }
    response.setHeader("Set-Cookie", serializeSessionCookie(expectedToken, config.auth.secureCookie));
    response.json({ authenticated: true, mode: "token", user: "owner" });
  });
  router.post("/logout", (_request, response) => {
    response.setHeader("Set-Cookie", serializeSessionCookie("", config.auth.secureCookie, 0));
    response.json({ authenticated: false, mode: "token", user: null });
  });

  const requireUser: RequestHandler = (request, response, next) => {
    if (isAuthenticated(request.headers.cookie)) {
      next();
      return;
    }
    response.status(401).json({ error: "AUTH_REQUIRED", message: "Authentication is required" });
  };
  return { router, requireUser };
}

function safeTokenEquals(actual: string | undefined, expected: string) {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName === name) return decodeURIComponent(valueParts.join("="));
  }
  return undefined;
}

function serializeSessionCookie(value: string, secure: boolean, maxAge?: number) {
  const attributes = [
    `${cookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
    ...(maxAge === undefined ? [] : [`Max-Age=${maxAge}`]),
  ];
  return attributes.join("; ");
}
