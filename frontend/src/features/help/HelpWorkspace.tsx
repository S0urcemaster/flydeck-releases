import manual from "../../assets/manual.md?raw";

export function HelpWorkspace() {
  return (
    <section className="workspace help-workspace" aria-label="Help">
      <article className="manual-content">
        {renderManual(manual)}
      </article>
    </section>
  );
}

export function renderManual(markdown: string) {
  return markdown.split("\n").map((line, index) => {
    if (line.startsWith("### ")) return <h3 key={index}>{renderBold(line.slice(4))}</h3>;
    if (line.startsWith("## ")) return <h2 key={index}>{renderBold(line.slice(3))}</h2>;
    if (line.startsWith("# ")) return <h1 key={index}>{renderBold(line.slice(2))}</h1>;
    if (!line.trim()) return <div key={index} className="manual-gap" aria-hidden="true" />;
    return <p key={index}>{renderBold(line)}</p>;
  });
}

export function renderBold(text: string) {
  return text.split(/(\*[^*\n]+\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("*") && part.endsWith("*")
      ? <strong key={index}>{part.slice(1, -1)}</strong>
      : part);
}
