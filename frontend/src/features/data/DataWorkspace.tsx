import { useEffect, useState, type RefObject } from "react";
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
  onClear: () => void;
  onDictate: () => void;
  dictating: boolean;
  onSubmit: () => void;
  onCreateFile: (name: string, title: string) => Promise<boolean>;
  isBusy: boolean;
  characterDialCorners: CharacterDialCorners;
  preferredKeyboard: "system" | "mobile" | "dialer";
  dialerDefaultSize: "small" | "medium" | "large";
  characterDialRightButtons: CharacterDialCornerAction[];
  dialerDefaultDwell: DwellMode;
};

export const dataPageSize = 10;
const dataFilePageSize = 5;

export function DataWorkspace({ dataRef, ...props }: DataWorkspaceProps) {
  const [filePage, setFilePage] = useState(0);
  const lines = props.selectedFile ? props.data[props.selectedFile] ?? [] : [];
  const filePageCount = Math.max(1, Math.ceil(props.files.length / dataFilePageSize));
  const visibleFilePage = Math.min(filePage, filePageCount - 1);
  const fileStart = visibleFilePage * dataFilePageSize;
  const pageCount = Math.max(1, Math.ceil(lines.length / dataPageSize));
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

  return (
    <section className="workspace data-workspace" aria-label="Data workspace">
      <div className="file-create-row">
        <TextInput value={props.newFileName} onChange={(event) => props.onNewFileNameChange(event.target.value)} placeholder="New file" aria-label="New data file" disabled={props.isBusy} />
        <button onClick={() => void createFile()} disabled={props.isBusy || props.newFileName.trim().length === 0}>NEW</button>
      </div>
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
            disabled: !file.valid,
            title: file.error ?? undefined,
            onClick: () => props.onSelectOrDelete(file.name),
            delete: {
              armed: props.armedDeleteFile === file.name,
              onArm: () => props.onArmDelete(file.name),
            },
          };
        })}
      />
      <Pager page={visibleFilePage} pageCount={filePageCount} start={fileStart} pageSize={dataFilePageSize} total={props.files.length} onPageChange={setFilePage} />
      <Pager page={page} pageCount={pageCount} start={start} pageSize={dataPageSize} total={lines.length} onPageChange={props.onPageChange} />
      <div className="line-list" aria-label="File content">
        {lines.slice(start, start + dataPageSize).map((line, index) => {
          const absoluteIndex = start + index;
          return (
            <ListItem
              key={`${props.selectedFile}-${absoluteIndex}`}
              label={`line ${absoluteIndex + 1}`}
              armed={props.armedDeleteLine === absoluteIndex}
              className="line-row"
              contentClassName={props.selectedLine === absoluteIndex ? "active" : ""}
              onContentClick={() => props.onSelectOrDeleteLine(absoluteIndex)}
              onArmDelete={() => props.onArmDeleteLine(absoluteIndex)}
            >
              {line}
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
          onClear={props.onClear}
          onDictate={props.onDictate}
          dictating={props.dictating}
          onSubmit={props.onSubmit}
          submitDisabled={props.isBusy || !props.selectedFile || props.dataText.trim().length === 0}
          characterDialCorners={props.characterDialCorners}
          preferredKeyboard={props.preferredKeyboard}
          dialerDefaultSize={props.dialerDefaultSize}
          characterDialRightButtons={props.characterDialRightButtons}
          dialerDefaultDwell={props.dialerDefaultDwell}
        />
      </section>
    </section>
  );
}
