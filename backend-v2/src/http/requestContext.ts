import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.header("x-request-id");
  const requestId = supplied && supplied.length <= 100 ? supplied : randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("X-Request-ID", requestId);
  next();
};
