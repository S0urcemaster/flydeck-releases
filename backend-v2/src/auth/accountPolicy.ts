import { HttpError } from "../http/HttpError.js";

export type AccountType = "personal" | "guest" | "probe" | "test";

export const trialTreeItemLimit = 20;
export const trialItemTitleLimit = 100;
export const trialItemContentLimit = 500;

export function assertTreeItemCapacity(accountType: AccountType, itemCount: number) {
  if (accountType === "probe" && itemCount >= trialTreeItemLimit) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      `Trial accounts can contain at most ${trialTreeItemLimit} tree items`,
    );
  }
}

export function assertImagesAllowed(accountType: AccountType) {
  if (accountType === "probe") {
    throw new HttpError(403, "FORBIDDEN", "Images are unavailable for trial accounts");
  }
}

export function assertItemTextAllowed(
  accountType: AccountType,
  item: { label?: string; content?: string },
) {
  if (accountType !== "probe") return;
  if (item.label !== undefined && item.label.length > trialItemTitleLimit) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      `Trial item titles can contain at most ${trialItemTitleLimit} characters`,
    );
  }
  if (item.content !== undefined && item.content.length > trialItemContentLimit) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      `Trial item text can contain at most ${trialItemContentLimit} characters`,
    );
  }
}
