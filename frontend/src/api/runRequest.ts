import type { Dispatch, SetStateAction } from "react";

type RequestState = {
  setBusy: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  fallbackError: string;
};

export async function runRequest(
  action: () => Promise<void>,
  { setBusy, setError, fallbackError }: RequestState,
) {
  setBusy(true);
  setError(null);
  try {
    await action();
    return true;
  } catch (error) {
    setError(error instanceof Error ? error.message : fallbackError);
    return false;
  } finally {
    setBusy(false);
  }
}
