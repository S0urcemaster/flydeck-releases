import { useState, type CSSProperties } from "react";

import { AppTitle } from "../components/AppTitle";
import {
  defaultLabTokenValues,
  labTokenDefinitions,
} from "./tokenDefinitions";
import styles from "./LabApp.module.css";

type LabStatus = {
  tone: "neutral" | "success" | "error";
  message: string;
};

type PreviewStyle = CSSProperties & {
  "--app-title-font-size": string;
};

const titleFontSize = labTokenDefinitions.appTitleFontSize;

export function LabApp() {
  const [title, setTitle] = useState("Flydeck");
  const [subtitle, setSubtitle] = useState("Workspace Console · V2");
  const [fontSize, setFontSize] = useState(readAppliedFontSize);
  const [isApplying, setIsApplying] = useState(false);
  const [status, setStatus] = useState<LabStatus>({
    tone: "neutral",
    message: "Changes are local until APPLY TOKEN is pressed.",
  });

  const previewStyle: PreviewStyle = {
    "--app-title-font-size": `${fontSize}px`,
  };

  async function copyProps() {
    const jsx = renderAppTitleJsx(title, subtitle);

    try {
      await navigator.clipboard.writeText(jsx);
      setStatus({ tone: "success", message: "JSX copied." });
    } catch {
      setStatus({ tone: "error", message: "Clipboard access was denied." });
    }
  }

  async function applyToken() {
    if (isApplying) {
      return;
    }

    setIsApplying(true);
    setStatus({ tone: "neutral", message: "Applying token…" });

    try {
      const response = await fetch("/__lab/apply-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appTitleFontSize: fontSize }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Token could not be applied.");
      }

      setStatus({
        tone: "success",
        message: "Token written to generated-tokens.css.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Token could not be applied.",
      });
    } finally {
      setIsApplying(false);
    }
  }

  function resetPreview() {
    setTitle("Flydeck");
    setSubtitle("Workspace Console · V2");
    setFontSize(defaultLabTokenValues.appTitleFontSize);
    setStatus({
      tone: "neutral",
      message: "Preview reset. APPLY TOKEN persists the token reset.",
    });
  }

  return (
    <main className={styles.root}>
      <header className={styles.labHeader}>
        <div>
          <p className={styles.eyebrow}>Development only</p>
          <h1 className={styles.heading}>Component Lab</h1>
        </div>
        <a className={styles.appLink} href="/">APP</a>
      </header>

      <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>AppTitle</h2>
            <p className={styles.description}>Application identity and optional context.</p>
          </div>
          <code className={styles.path}>components/AppTitle</code>
        </div>

        <div className={styles.preview} style={previewStyle}>
          <AppTitle title={title} subtitle={subtitle || undefined} />
        </div>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span>title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className={styles.field}>
            <span>subtitle</span>
            <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          </label>

          <label className={styles.field}>
            <span>{titleFontSize.label}</span>
            <span className={styles.range}>
              <input
                type="range"
                min={titleFontSize.min}
                max={titleFontSize.max}
                step={titleFontSize.step}
                value={fontSize}
                onChange={(event) => setFontSize(event.target.valueAsNumber)}
              />
              <output>{fontSize}{titleFontSize.unit}</output>
            </span>
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={resetPreview}>RESET</button>
          <button type="button" onClick={copyProps}>COPY PROPS</button>
          <button type="button" onClick={applyToken} disabled={isApplying}>
            {isApplying ? "APPLYING…" : "APPLY TOKEN"}
          </button>
        </div>

        <p className={styles.status} data-tone={status.tone} aria-live="polite">
          {status.message}
        </p>
      </section>
    </main>
  );
}

export function renderAppTitleJsx(title: string, subtitle: string): string {
  const subtitleProp = subtitle ? ` subtitle=${JSON.stringify(subtitle)}` : "";
  return `<AppTitle title=${JSON.stringify(title)}${subtitleProp} />`;
}

function readAppliedFontSize(): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--app-title-font-size"),
  );

  return Number.isFinite(value) ? value : defaultLabTokenValues.appTitleFontSize;
}
