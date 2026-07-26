import { Settings } from "lucide-react";
import type { ChatRun } from "../api/chat";

type AppTopbarProps = {
  activeError: string | null;
  serverVital: boolean | null;
  chatBusy: boolean;
  chatRun: ChatRun | null;
  settingsOpen: boolean;
  onToggleSettings: () => void;
};

export function AppTopbar(props: AppTopbarProps) {
  const status = getAppStatus(props);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">
          <span className="brand-mark">𐦍</span> Flydeck <span>Workspace Console</span>
        </p>
        <p className={`status-line ${status.isError ? "error" : ""}`} role="status">{status.message}</p>
      </div>
      <div className="top-actions">
        <button
          className={`icon-button settings ${props.settingsOpen ? "active" : ""}`}
          aria-label="Settings"
          title="Settings"
          onClick={props.onToggleSettings}
        >
          <Settings size={23} />
        </button>
      </div>
    </header>
  );
}

export function getAppStatus({
  activeError,
  serverVital,
  chatBusy,
  chatRun,
}: Pick<AppTopbarProps, "activeError" | "serverVital" | "chatBusy" | "chatRun">) {
  const message = activeError
    ? `Flydon: ${activeError}`
    : serverVital === false
      ? "Flydon is not responding"
      : chatBusy
        ? "Flydon is working ..."
        : chatRun?.status === "completed"
          ? chatRun.prompt.startsWith("/") || !chatRun.output.trim()
            ? "Last chat run status: completed"
            : "Flydon has responded · last chat run status: completed"
          : serverVital === true
            ? "Flydon seems vital"
            : "Contacting Flydon ...";

  return {
    message,
    isError: Boolean(activeError) || serverVital === false,
  };
}
