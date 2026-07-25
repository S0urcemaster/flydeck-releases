import { requestJson } from "./request";

export const healthApi = {
  read: () => requestJson<{ status: "ok" }>("/flydeck/api/health"),
};
