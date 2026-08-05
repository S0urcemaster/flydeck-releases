import type { ApiErrorCode } from "@flydeck/shared/v2";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: { field?: string; currentRevision?: number } = {},
  ) {
    super(message);
  }
}
