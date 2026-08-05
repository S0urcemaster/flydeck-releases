import type { AppConfig } from "../config.js";

export class NtfyNotifier {
  constructor(
    private readonly config: Pick<AppConfig, "ntfyUrl" | "ntfyTopic">,
    private readonly timeoutMs = 10_000,
  ) {}

  get enabled() {
    return Boolean(this.config.ntfyUrl && this.config.ntfyTopic);
  }

  async sendTimer(title: string) {
    if (!this.enabled) return;
    const configuredUrl = this.config.ntfyUrl!.trim();
    const baseUrl = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`;
    const url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(this.config.ntfyTopic!)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8", Title: "Flydeck Timer", Tags: "alarm_clock" },
      body: title,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`ntfy antwortete mit HTTP ${response.status}`);
  }
}
