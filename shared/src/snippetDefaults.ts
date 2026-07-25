import type { Snippet } from "./snippets.js";

export const defaultSnippets: Snippet[] = [
  { name: "Kontext", text: "Lies den folgenden Kontext und nenne die wichtigsten Fakten in maximal fuenf Punkten." },
  { name: "Naechster Schritt", text: "Bestimme den naechsten konkreten Schritt. Antworte knapp und umsetzungsorientiert." },
  { name: "Markdown Liste", text: "Formatiere den folgenden Inhalt als saubere Markdown-Liste mit kurzen Eintraegen." },
  { name: "Kurzfassung", text: "Fasse den Text radikal kurz zusammen. Entferne Nebensaetze und Wiederholungen." },
  { name: "Codex Auftrag", text: "Arbeite im vorhandenen Repo. Lies zuerst die relevanten Dateien, aendere nur was noetig ist und pruefe den Build." },
  { name: "Claude Auftrag", text: "Analysiere die Aufgabe kritisch, stelle nur blockierende Rueckfragen und liefere danach eine klare Umsetzung." },
];
