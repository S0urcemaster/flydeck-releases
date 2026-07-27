import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/generated-tokens.css";
import "./styles/base.css";

async function render() {
  let content = <App />;

  if (import.meta.env.DEV && window.location.pathname === "/lab") {
    const { LabApp } = await import("./lab/LabApp");
    content = <LabApp />;
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {content}
    </StrictMode>,
  );
}

void render();
