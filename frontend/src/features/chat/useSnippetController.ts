import { useEffect, useRef, useState } from "react";
import { snippetsApi } from "../../api/snippets";
import { runRequest } from "../../api/runRequest";
import { defaultSnippets } from "../../data/defaults";

const initiallySelectedName = defaultSnippets[1]?.name ?? null;

export function useSnippetController() {
  const [snippets, setSnippets] = useState(defaultSnippets);
  const [name, setName] = useState(() => defaultSnippets[1]?.name ?? "");
  const [text, setText] = useState(() => defaultSnippets[1]?.text ?? "");
  const [selectedName, setSelectedName] = useState<string | null>(initiallySelectedName);
  const [editingName, setEditingName] = useState<string | null>(initiallySelectedName);
  const [armedDelete, setArmedDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deletePendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    snippetsApi.list()
      .then((loaded) => {
        if (cancelled) return;
        setSnippets(loaded);
        const selected = loaded.find((snippet) => snippet.name === initiallySelectedName) ?? loaded[0];
        setEditingName(selected?.name ?? null);
        setSelectedName(selected?.name ?? null);
        setName(selected?.name ?? "");
        setText(selected?.text ?? "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Snippets could not be loaded");
      });
    return () => { cancelled = true; };
  }, []);

  function run(action: () => Promise<void>) {
    return runRequest(action, {
      setBusy,
      setError,
      fallbackError: "Snippet request failed",
    });
  }

  async function save(asNew = false) {
    const requestedName = name.trim();
    const nextName = asNew ? getAvailableSnippetName(requestedName, snippets) : requestedName;
    if (!nextName) return;
    if (!asNew) {
      const currentSnippet = editingName ? snippets.find((snippet) => snippet.name === editingName) : undefined;
      if (currentSnippet && currentSnippet.name === nextName && currentSnippet.text === text) return;
    }
    await run(async () => {
      const updatesSelected = !asNew && editingName === nextName;
      const saved = updatesSelected
        ? await snippetsApi.update(editingName, { text })
        : await snippetsApi.create({ name: nextName, text });
      setSnippets((current) => updatesSelected
        ? current.map((snippet) => snippet.name === editingName ? saved : snippet)
        : [...current, saved]);
      setEditingName(saved.name);
      setSelectedName(saved.name);
      setArmedDelete(false);
    });
  }

  function armDelete() {
    if (deletePendingRef.current) return;
    setArmedDelete((current) => !current);
  }

  async function selectOrDelete(nameToSelect: string) {
    if (deletePendingRef.current) return;
    if (!armedDelete) {
      const snippet = snippets.find((entry) => entry.name === nameToSelect);
      setName(nameToSelect);
      setText(snippet?.text ?? "");
      setEditingName(nameToSelect);
      setSelectedName(nameToSelect);
      return;
    }
    deletePendingRef.current = true;
    try {
      await run(async () => {
        await snippetsApi.remove(nameToSelect);
        setSnippets((current) => current.filter((snippet) => snippet.name !== nameToSelect));
        if (editingName === nameToSelect) {
          setName("");
          setText("");
          setEditingName(null);
        }
        if (selectedName === nameToSelect) setSelectedName(null);
      });
    } finally {
      deletePendingRef.current = false;
      setArmedDelete(false);
    }
  }

  const trimmedName = name.trim();
  const updatesSelected = editingName === trimmedName;
  const selected = editingName ? snippets.find((snippet) => snippet.name === editingName) : undefined;
  const hasChanges = selected
    ? trimmedName !== selected.name || text !== selected.text
    : trimmedName.length > 0;
  const nameExists = snippets.some((snippet) =>
    snippet.name.toLowerCase() === trimmedName.toLowerCase() &&
    !(updatesSelected && snippet.name === editingName));

  return {
    snippets,
    name,
    setName,
    text,
    setText,
    selectedName,
    setSelectedName,
    armedDelete,
    busy,
    error,
    canSave: !busy && trimmedName.length > 0 && !nameExists && hasChanges,
    canSaveAsNew: !busy && editingName !== null && trimmedName.length > 0,
    save: () => save(),
    saveAsNew: () => save(true),
    armDelete,
    selectOrDelete,
  };
}

export function getAvailableSnippetName(requestedName: string, snippets: Array<{ name: string }>) {
  if (!requestedName || !snippets.some((snippet) => snippet.name.toLocaleLowerCase() === requestedName.toLocaleLowerCase())) {
    return requestedName;
  }
  let suffix = 2;
  while (snippets.some((snippet) => snippet.name.toLocaleLowerCase() === `${requestedName} ${suffix}`.toLocaleLowerCase())) {
    suffix += 1;
  }
  return `${requestedName} ${suffix}`;
}
