import type { CreateCronTimerRequest, CronTimer, UpdateCronTimerRequest } from "@flydeck/shared";
import { requestJson } from "./request";

const cronApiPath = "/flydeck/api/cron";

export const cronApi = {
  list: () => requestJson<CronTimer[]>(cronApiPath),
  create: (input: CreateCronTimerRequest) => requestJson<CronTimer>(cronApiPath, { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateCronTimerRequest) =>
    requestJson<CronTimer>(`${cronApiPath}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: string) => requestJson<{ id: string }>(`${cronApiPath}/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
