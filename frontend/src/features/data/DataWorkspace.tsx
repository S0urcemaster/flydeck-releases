import { useEffect, useRef, useState, type RefObject } from "react";
import { ListItem } from "../../components/ListItem";
import { Editor } from "../../components/Editor";
import { Pager } from "../../components/Pager";
import { TwoColumnList } from "../../components/TwoColumnList";
import { TextInput } from "../../components/TextInput";
import type { DataFileSummary } from "@flydeck/shared/data";
import type { CharacterDialCornerAction, CharacterDialCorners, DwellMode } from "../../components/CharacterDial";

type DataWorkspaceProps = {
  data: Record<string, string[]>;
  files: DataFileSummary[];
  selectedFile: string;
  armedDeleteFile: string | null;
  armedDeleteLine: number | null;
  selectedLine: number | null;
  dataText: string;
  newFileName: string;
  dataRef: RefObject<HTMLTextAreaElement | null>;
  page: number;
  onPageChange: (page: number) => void;
  onArmDelete: (file: string) => void;
  onSelectOrDelete: (file: string) => void;
  onSelectLine: (index: number) => void;
  onArmDeleteLine: (index: number) => void;
  onSelectOrDeleteLine: (index: number) => void;
  onTextChange: (text: string) => void;
  onNewFileNameChange: (name: string) => void;
  onSelectWord: () => void;
  onMoveCursor: (direction: -1 | 1) => void;
  onDictate: () => void;
  dictating: boolean;
  onSubmit: () => void;
  onSubmitAsNew: () => void;
  onCreateFile: (name: string, title: string) => Promise<boolean>;
  isBusy: boolean;
  deletePending: boolean;
  characterDialCorners: CharacterDialCorners;
  preferredKeyboard: "system" | "mobile" | "dialer";
  dialerDefaultSize: "small" | "medium" | "large";
  characterDialRightButtons: CharacterDialCornerAction[];
  dialerDefaultDwell: DwellMode;
};

export const dataPageSize = 10;
const dataFilePageSize = 5;

export function filterDataLines(lines: string[], searchTerm: string) {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase();
  return lines
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => !normalizedTerm || text.toLocaleLowerCase().includes(normalizedTerm));
}

export function DataWorkspace({ dataRef, ...props }: DataWorkspaceProps) {
  const [filePage, setFilePage] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const newFileNameRef = useRef<HTMLInputElement>(null);
  const fileNameKeyboardHostRef = useRef<HTMLDivElement>(null);
  const [fileNameKeyboardActive, setFileNameKeyboardActive] = useState(false);
  const lines = props.selectedFile ? props.data[props.selectedFile] ?? [] : [];
  const visibleLines = searchMode ? filterDataLines(lines, activeSearchTerm) : filterDataLines(lines, "");
  const filePageCount = Math.max(1, Math.ceil(props.files.length / dataFilePageSize));
  const visibleFilePage = Math.min(filePage, filePageCount - 1);
  const fileStart = visibleFilePage * dataFilePageSize;
  const pageCount = Math.max(1, Math.ceil(visibleLines.length / dataPageSize));
  const page = Math.min(props.page, pageCount - 1);
  const start = page * dataPageSize;

  useEffect(() => {
    const selectedIndex = props.files.findIndex((file) => file.name === props.selectedFile);
    if (selectedIndex >= 0) setFilePage(Math.floor(selectedIndex / dataFilePageSize));
  }, [props.files, props.selectedFile]);

  async function createFile() {
    const title = props.newFileName.trim().replace(/\.md$/i, "");
    if (!title) return;
    const name = `${title}.md`;
    if (await props.onCreateFile(name, title)) props.onNewFileNameChange("");
  }

  function runSearch() {
    const searchTerm = searchQuery.trim();
    if (!searchTerm || !props.selectedFile) return;
    setActiveSearchTerm(searchTerm);
    props.onPageChange(0);
  }

  function toggleSearchMode() {
    setSearchMode(!searchMode);
    props.onPageChange(0);
    requestAnimationFrame(() => newFileNameRef.current?.focus({ preventScroll: true }));
  }

  return (
    <section className="workspace data-workspace" aria-label="Data workspace">
      <div className="file-create-row">
        <TextInput
          ref={newFileNameRef}
          inputMode="none"
          value={searchMode ? searchQuery : props.newFileName}
          onChange={(event) => searchMode ? setSearchQuery(event.target.value) : props.onNewFileNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (searchMode) runSearch();
            else void createFile();
          }}
          onFocus={() => setFileNameKeyboardActive(true)}
          onBlur={() => setFileNameKeyboardActive(false)}
          placeholder={searchMode ? "Search in file" : "New file"}
          aria-label={searchMode ? "Search in file" : "New data file"}
          disabled={props.isBusy}
        />
        <button
          className={searchMode ? "active" : ""}
          onPointerDown={(event) => {
            event.preventDefault();
            toggleSearchMode();
          }}
          onClick={(event) => {
            if (event.detail === 0) toggleSearchMode();
          }}
          aria-pressed={searchMode}
        >SEAR</button>
      </div>
      <div ref={fileNameKeyboardHostRef} />
      <TwoColumnList
        ariaLabel="Data files"
        className="data-file-list"
        entries={props.files.slice(fileStart, fileStart + dataFilePageSize).map((file) => {
          const label = file.name.replace(/\.md$/, "");
          return {
            key: file.name,
            label,
            selected: file.valid && file.name === props.selectedFile,
            invalid: !file.valid,
            disabled: !file.valid || props.deletePending,
            title: file.error ?? undefined,
            onClick: () => props.onSelectOrDelete(file.name),
            delete: {
              armed: props.armedDeleteFile === file.name,
              disabled: props.deletePending,
              onArm: () => props.onArmDelete(file.name),
            },
          };
        })}
      />
      <Pager page={visibleFilePage} pageCount={filePageCount} start={fileStart} pageSize={dataFilePageSize} total={props.files.length} onPageChange={setFilePage} />
      <Pager page={page} pageCount={pageCount} start={start} pageSize={dataPageSize} total={visibleLines.length} onPageChange={props.onPageChange} />
      <div className="line-list" aria-label="File content">
        {visibleLines.slice(start, start + dataPageSize).map(({ text, index: absoluteIndex }) => {
          return (
            <ListItem
              key={`${props.selectedFile}-${absoluteIndex}`}
              label={`line ${absoluteIndex + 1}`}
              armed={props.armedDeleteLine === absoluteIndex}
              className="line-row"
              contentClassName={props.selectedLine === absoluteIndex ? "active" : ""}
              contentDisabled={props.deletePending}
              deleteDisabled={props.deletePending}
              onContentClick={() => props.onSelectOrDeleteLine(absoluteIndex)}
              onArmDelete={() => props.onArmDeleteLine(absoluteIndex)}
            >
              {text}
            </ListItem>
          );
        })}
      </div>
      <section className="composer data-composer" aria-label="Data input">
        <Editor
          storageKey="data"
          ref={dataRef}
          ariaLabel="Data text"
          placeholder="New or selected line..."
          value={props.dataText}
          onChange={(event) => props.onTextChange(event.target.value)}
          onValueChange={props.onTextChange}
          onSelectWord={props.onSelectWord}
          onMoveCursor={props.onMoveCursor}
          onDictate={props.onDictate}
          dictating={props.dictating}
          onSubmit={props.onSubmit}
          onSubmitLongPress={props.selectedLine === null ? undefined : props.onSubmitAsNew}
          submitDisabled={props.isBusy || !props.selectedFile || props.dataText.trim().length === 0}
          submitLabel={props.selectedLine === null ? "NEW" : "SAVE"}
          submitSecondaryLabel={props.selectedLine === null ? undefined : "NEW"}
          characterDialCorners={props.characterDialCorners}
          preferredKeyboard={props.preferredKeyboard}
          dialerDefaultSize={props.dialerDefaultSize}
          characterDialRightButtons={props.characterDialRightButtons}
          dialerDefaultDwell={props.dialerDefaultDwell}
          temporaryInput={fileNameKeyboardActive ? {
            ref: newFileNameRef,
            keyboardHostRef: fileNameKeyboardHostRef,
            value: searchMode ? searchQuery : props.newFileName,
            onValueChange: searchMode ? setSearchQuery : props.onNewFileNameChange,
            onSubmit: () => searchMode ? runSearch() : void createFile(),
            submitDisabled: props.isBusy || (searchMode ? searchQuery.trim().length === 0 || !props.selectedFile : props.newFileName.trim().length === 0),
            submitLabel: searchMode ? "SEARCH" : "NEW",
          } : null}
          onDismissTemporaryInput={() => setFileNameKeyboardActive(false)}
        />
      </section>
    </section>
  );
}
