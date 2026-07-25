import type { CreateDataFileRequest, DataFile, DataFileSummary, WriteDataEntryRequest } from "@flydeck/shared/data";
import { requestJson } from "./request";

const dataApiPath = "/flydeck/api/data";

export const dataApi = {
  list: () => requestJson<DataFileSummary[]>(dataApiPath),
  read: (name: string) => requestJson<DataFile>(`${dataApiPath}/${encodeURIComponent(name)}`),
  create: (input: CreateDataFileRequest) => requestJson<DataFile>(dataApiPath, { method: "POST", body: JSON.stringify(input) }),
  appendEntry: (name: string, input: WriteDataEntryRequest) =>
    requestJson<DataFile>(`${dataApiPath}/${encodeURIComponent(name)}/entries`, { method: "POST", body: JSON.stringify(input) }),
  replaceEntry: (name: string, line: number, input: WriteDataEntryRequest) =>
    requestJson<DataFile>(`${dataApiPath}/${encodeURIComponent(name)}/entries/${line}`, { method: "PUT", body: JSON.stringify(input) }),
  removeEntry: (name: string, line: number) =>
    requestJson<DataFile>(`${dataApiPath}/${encodeURIComponent(name)}/entries/${line}`, { method: "DELETE" }),
  remove: (name: string) => requestJson<{ name: string; trashedAs: string }>(`${dataApiPath}/${encodeURIComponent(name)}`, { method: "DELETE" }),
};
