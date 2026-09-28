import type { AppConfig } from "../config.js";

export class NtfyNotifier {
  constructor(
    private readonly config: Pick<AppConfig, "ntfyUrl" | "ntfyTopic">,
    private readonly timeoutMs = 10_000,
  ) {}

  async sendTimer(message: string, deliveryAt?: Date, sequenceId?: string, title = "Flydeck Timer") {
    if (!this.config.ntfyUrl || !this.config.ntfyTopic) return;
    const configuredUrl = this.config.ntfyUrl.trim();
    const baseUrl = /^https?:\/\//i.test(configuredUrl)
      ? configuredUrl
      : `https://${configuredUrl}`;
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(this.config.ntfyTopic)}${sequenceId ? `/${encodeURIComponent(sequenceId)}` : ""}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Title: title,
          Tags: "alarm_clock",
          Priority: "high",
          ...(deliveryAt && deliveryAt.getTime() - Date.now() >= 10_000
            ? { At: String(Math.floor(deliveryAt.getTime() / 1_000)) }
            : {}),
        },
        body: message,
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (!response.ok) throw new Error(`ntfy returned HTTP ${response.status}`);
  }
}
