import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { Snake3DBackground } from "./Snake3DBackground";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Snake3DBackground />
    <App />
  </StrictMode>,
);
