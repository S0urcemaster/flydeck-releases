import type { ChatStore } from "../storage/chatStore.js";

type CommandContext = {
  conversationId: string;
  store: ChatStore;
  effort: "FAST" | "MEDI" | "DEEP";
  modelTier: "ECON" | "MEDI" | "HIGH";
  serverName: string;
  workspace: string;
  tailscaleUrl: string;
  uptimeSeconds: number;
  memoryBytes: number;
};

type CommandHandler = (argumentsText: string, context: CommandContext) => string;

const commands: Record<string, CommandHandler> = {
  status: (_argumentsText, context) => {
    const status = context.store.getCommandStatus(context.conversationId);
    return [
      "FLYDECK  OK",
      `CODEX    ${status.codex}`,
      `LAST     ${status.last}`,
      `TOKEN    ${status.tokens}`,
    ].join("\n");
  },
  model: (_argumentsText, context) => {
    const model = context.modelTier === "ECON"
      ? { name: "gpt-5.6-luna", input: "$1.00", cached: "$0.10", output: "$6.00" }
      : context.modelTier === "MEDI"
        ? { name: "gpt-5.6-terra", input: "$2.50", cached: "$0.25", output: "$15.00" }
        : { name: "gpt-5.6-sol", input: "$5.00", cached: "$0.50", output: "$30.00" };
    return [
      `MODEL    ${model.name}`,
      "CONTEXT  1.05M TOKEN",
      `INPUT    ${model.input} / 1M TOKEN`,
      `CACHED   ${model.cached} / 1M TOKEN`,
      `OUTPUT   ${model.output} / 1M TOKEN`,
    ].join("\n");
  },
  server: (_argumentsText, context) => [
    `SERVER   ${context.serverName}`,
    `WORKSPACE ${context.workspace}`,
    `UPTIME   ${formatUptime(context.uptimeSeconds)}`,
    `MEMORY   ${Math.round(context.memoryBytes / 1024 / 1024)} MB`,
    `THREAD   ${context.store.getSnapshot(context.conversationId).codexThreadId ?? "NONE"}`,
    `TAILSCALE ${context.tailscaleUrl}`,
  ].join("\n"),
};

function formatUptime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return days > 0
    ? `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
    : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function executeSlashCommand(input: string, context: CommandContext) {
  if (!input.startsWith("/")) return null;
  const [commandName = "", ...argumentsParts] = input.slice(1).trim().split(/\s+/);
  const handler = commands[commandName.toLowerCase()];
  if (!handler) return `UNKNOWN  /${commandName}\nCOMMAND  /status\nCOMMAND  /model\nCOMMAND  /server`;
  return handler(argumentsParts.join(" "), context);
}
