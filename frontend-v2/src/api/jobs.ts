import {
  cancelJobRunResponseSchema,
  jobConfigDtoSchema,
  jobRunDtoSchema,
  jobSnapshotDtoSchema,
  type JobConfigDto,
  type JobRunDto,
  type JobSnapshotDto,
  type UpdateJobConfigRequest,
} from "@flydeck/shared/v2";
import { apiErrorDtoSchema, type ApiErrorDto } from "@flydeck/shared/v2";

export class JobApiError extends Error {
  constructor(readonly response: ApiErrorDto) {
    super(response.message);
  }
}

export const jobApi = {
  read: (workspaceId: string, jobId: string) => request<JobSnapshotDto>(
    jobPath(workspaceId, jobId), jobSnapshotDtoSchema,
  ),
  update: (
    workspaceId: string,
    jobId: string,
    input: UpdateJobConfigRequest,
  ) => request<JobConfigDto>(jobPath(workspaceId, jobId), jobConfigDtoSchema, {
    method: "PUT", body: JSON.stringify(input),
  }),
  start: (
    workspaceId: string,
    jobId: string,
    requestId: string,
    timeZone: string,
  ) => request<JobRunDto>(
    `${jobPath(workspaceId, jobId)}/runs`, jobRunDtoSchema, {
      method: "POST", body: JSON.stringify({ requestId, timeZone }),
    },
  ),
  cancel: (workspaceId: string, jobId: string, runId: string) => request(
    `${jobPath(workspaceId, jobId)}/runs/${encodeURIComponent(runId)}/cancel`,
    cancelJobRunResponseSchema,
    { method: "POST" },
  ),
  eventsUrl: (workspaceId: string, jobId: string) => (
    `${jobPath(workspaceId, jobId)}/events`
  ),
};

function jobPath(workspaceId: string, jobId: string) {
  return `/flydeck/api/v2/workspaces/${encodeURIComponent(workspaceId)}`
    + `/jobs/${encodeURIComponent(jobId)}`;
}

async function request<TResult>(
  path: string,
  schema: { parse(value: unknown): TResult },
  init?: RequestInit,
) {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: init?.body === undefined
      ? init?.headers
      : { "Content-Type": "application/json", ...init.headers },
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const parsed = apiErrorDtoSchema.safeParse(value);
    throw parsed.success ? new JobApiError(parsed.data) : new Error("Invalid job response");
  }
  return schema.parse(value);
}
