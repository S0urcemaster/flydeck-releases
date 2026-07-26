import { useEffect, useRef, useState } from "react";
import type { DataFileSummary } from "@flydeck/shared/data";
import { dataApi } from "../../api/data";
import { runRequest } from "../../api/runRequest";
import { dataPageSize } from "./DataWorkspace";

export function useDataController() {
  const [data, setData] = useState<Record<string, string[]>>({});
  const [files, setFiles] = useState<DataFileSummary[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [text, setText] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [armedDeleteFile, setArmedDeleteFile] = useState<string | null>(null);
  const [armedDeleteLine, setArmedDeleteLine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const deletePendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      try {
        const loadedFiles = await dataApi.list();
        if (cancelled) return;
        setFiles(loadedFiles);
        const names = loadedFiles.filter((file) => file.valid).map((file) => file.name);
        setData(Object.fromEntries(names.map((name) => [name, []])));
        const firstFile = names[0] ?? "";
        setSelectedFile(firstFile);
        if (firstFile) {
          const file = await dataApi.read(firstFile);
          if (!cancelled) setData((current) => ({ ...current, [file.name]: file.entries }));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Data could not be loaded");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function run(action: () => Promise<void>) {
    return runRequest(action, {
      setBusy,
      setError,
      fallbackError: "Data request failed",
    });
  }

  function selectLine(index: number) {
    setArmedDeleteLine(null);
    setSelectedLine(index);
    setText(data[selectedFile]?.[index] ?? "");
    requestAnimationFrame(() => editorRef.current?.focus({ preventScroll: true }));
  }

  async function saveLine(asNew = false) {
    if (!selectedFile) return;
    const lines = data[selectedFile] ?? [];
    await run(async () => {
      const file = selectedLine === null || asNew
        ? await dataApi.appendEntry(selectedFile, { text })
        : await dataApi.replaceEntry(selectedFile, selectedLine, { text });
      setData((current) => ({ ...current, [file.name]: file.entries }));
      if (selectedLine === null || asNew) setPage(Math.floor(lines.length / dataPageSize));
      setSelectedLine(null);
      setText("");
    });
  }

  function armFile(file: string) {
    if (deletePendingRef.current) return;
    if (files.find((entry) => entry.name === file)?.valid) {
      setSelectedFile(file);
      setPage(0);
      setSelectedLine(null);
      setText("");
    }
    setArmedDeleteFile((current) => current === file ? null : file);
    setArmedDeleteLine(null);
  }

  function armLine(index: number) {
    if (deletePendingRef.current) return;
    setArmedDeleteLine((current) => current === index ? null : index);
  }

  async function runDelete(action: () => Promise<void>) {
    if (deletePendingRef.current) return false;
    deletePendingRef.current = true;
    setDeletePending(true);
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Data request failed";
      setError(`Delete failed: ${message}`);
      return false;
    } finally {
      deletePendingRef.current = false;
      setDeletePending(false);
      setBusy(false);
      setArmedDeleteFile(null);
      setArmedDeleteLine(null);
    }
  }

  async function selectFile(file: string) {
    setSelectedFile(file);
    setPage(0);
    setSelectedLine(null);
    setText("");
    setArmedDeleteFile(null);
    setArmedDeleteLine(null);
    setError(null);
    try {
      const loadedFile = await dataApi.read(file);
      setData((current) => ({ ...current, [loadedFile.name]: loadedFile.entries }));
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Data request failed");
    }
  }

  async function reload(excludedFile?: string) {
    const loadedFiles = await dataApi.list();
    const remainingFiles = loadedFiles.filter((file) => file.name !== excludedFile);
    setFiles(remainingFiles);
    const names = remainingFiles.filter((file) => file.valid).map((file) => file.name);
    const nextSelectedFile = names.includes(selectedFile) ? selectedFile : names[0] ?? "";
    setData(Object.fromEntries(names.map((name) => [name, data[name] ?? []])));
    setSelectedFile(nextSelectedFile);
    if (nextSelectedFile) {
      const file = await dataApi.read(nextSelectedFile);
      setData((current) => ({ ...current, [file.name]: file.entries }));
    }
    setPage(0);
    setSelectedLine(null);
    setText("");
  }

  async function selectOrDeleteLine(index: number) {
    if (deletePendingRef.current) return;
    if (armedDeleteLine !== index) {
      selectLine(index);
      return;
    }
    await runDelete(async () => {
      const file = await dataApi.removeEntry(selectedFile, index);
      setData((current) => ({ ...current, [file.name]: file.entries }));
      setSelectedLine(null);
      setText("");
      setPage((current) => Math.min(current, Math.max(0, Math.ceil(file.entries.length / dataPageSize) - 1)));
    });
  }

  async function selectOrDeleteFile(file: string) {
    if (deletePendingRef.current) return;
    if (armedDeleteFile !== file) {
      await selectFile(file);
      return;
    }
    await runDelete(async () => {
      await dataApi.remove(file);
      await reload(file);
    });
  }

  function createFile(name: string, title: string) {
    return run(async () => {
      const file = await dataApi.create({ name, title });
      setData((current) => ({ ...current, [file.name]: file.entries }));
      setFiles((current) => [...current.filter((entry) => entry.name !== file.name), {
        name: file.name,
        title: file.title,
        entryCount: file.entries.length,
        modifiedAt: file.modifiedAt,
        valid: true,
        error: null,
      }].sort((left, right) => left.name.localeCompare(right.name, "de")));
      setSelectedFile(file.name);
      setPage(0);
      setSelectedLine(null);
      setText("");
      setArmedDeleteFile(null);
      setArmedDeleteLine(null);
    });
  }

  return {
    data,
    files,
    selectedFile,
    selectedLine,
    page,
    setPage,
    text,
    setText,
    newFileName,
    setNewFileName,
    armedDeleteFile,
    armedDeleteLine,
    busy,
    deletePending,
    error,
    editorRef,
    selectLine,
    saveLine: () => saveLine(),
    saveLineAsNew: () => saveLine(true),
    armFile,
    armLine,
    selectOrDeleteLine,
    selectOrDeleteFile,
    createFile,
  };
}
