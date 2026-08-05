import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { apiErrorDtoSchema, type ApiErrorDto } from "@flydeck/shared/v2";
import { HttpError } from "./HttpError.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const requestId = String(response.locals.requestId ?? "unknown");
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    sendError(response, 400, {
      error: "INVALID_REQUEST",
      message: issue?.message ?? "Invalid request",
      requestId,
      field: issue?.path.join(".") || undefined,
    });
    return;
  }
  if (error instanceof HttpError) {
    sendError(response, error.status, {
      error: error.code,
      message: error.message,
      requestId,
      ...error.details,
    });
    return;
  }
  console.error({ requestId, error });
  sendError(response, 500, {
    error: "INTERNAL_ERROR",
    message: "Internal server error",
    requestId,
  });
};

function sendError(
  response: Parameters<ErrorRequestHandler>[2],
  status: number,
  body: ApiErrorDto,
) {
  response.status(status).json(apiErrorDtoSchema.parse(body));
}
