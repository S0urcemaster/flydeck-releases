import { constants } from "node:fs";
import { access, lstat, mkdir, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { dataFileNameSchema, type DataFile, type DataFileSummary } from "@flydeck/shared/data";
import type { AppConfig } from "../config.js";
import { HttpError } from "../errors.js";
import { createMarkdownData, parseMarkdownData, serializeMarkdownData, touchUpdatedMetadata } from "./markdownFormat.js";
import { AtomicFileStore } from "./atomicFileStore.js";

export class DataFileStore {
  private readonly files = new AtomicFileStore();

  constructor(private readonly config: AppConfig) {}

  async initialize() {
    await mkdir(this.config.flydonDir, { recursive: true });
    await mkdir(this.config.trashDir, { recursive: true });
    await mkdir(this.config.dataHome, { recursive: true });
  }

  async list(): Promise<DataFileSummary[]> {
    const directoryEntries = await readdir(this.config.dataHome, { withFileTypes: true });
    const names = directoryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && dataFileNameSchema.safeParse(entry.name).success)
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "de"));
    const summaries = await Promise.all(names.map(async (name) => {
      try {
        const file = await this.read(name);
        return { name: file.name, title: file.title, entryCount: file.entries.length, modifiedAt: file.modifiedAt, valid: true, error: null };
      } catch (error) {
        if (error instanceof HttpError && error.code === "INVALID_DATA_FILE") {
          const fileStat = await stat(this.resolveFile(name));
          return {
            name,
            title: "",
            entryCount: 0,
            modifiedAt: fileStat.mtime.toISOString(),
            valid: false,
            error: error.message,
          };
        }
        throw error;
      }
    }));
    return summaries;
  }

  async read(name: string): Promise<DataFile> {
    const filePath = await this.resolveExistingFile(name);
    const [content, fileStat] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
    const parsed = parseMarkdownData(content);
    return { name, title: parsed.title, metadata: parsed.metadata, entries: parsed.entries, modifiedAt: fileStat.mtime.toISOString() };
  }

  async create(name: string, title: string): Promise<DataFile> {
    const filePath = this.resolveFile(name);
    return this.files.runExclusive(filePath, async () => {
      try {
        await access(filePath, constants.F_OK);
        throw new HttpError(409, "FILE_EXISTS", `File ${name} already exists`);
      } catch (error) {
        if (error instanceof HttpError) throw error;
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      await this.files.write(filePath, createMarkdownData(title));
      return this.read(name);
    });
  }

  async appendEntry(name: string, text: string): Promise<DataFile> {
    return this.update(name, (entries) => [...entries, text]);
  }

  async replaceEntry(name: string, line: number, text: string): Promise<DataFile> {
    return this.update(name, (entries) => {
      if (!Number.isInteger(line) || line < 0 || line >= entries.length) {
        throw new HttpError(404, "ENTRY_NOT_FOUND", `Data line ${line} does not exist`);
      }
      return entries.map((entry, index) => index === line ? text : entry);
    });
  }

  async removeEntry(name: string, line: number): Promise<DataFile> {
    return this.update(name, (entries) => {
      if (!Number.isInteger(line) || line < 0 || line >= entries.length) {
        throw new HttpError(404, "ENTRY_NOT_FOUND", `Data line ${line} does not exist`);
      }
      return entries.filter((_entry, index) => index !== line);
    });
  }

  async moveToTrash(name: string) {
    const filePath = this.resolveFile(name);
    return this.files.runExclusive(filePath, async () => {
      const source = await this.resolveExistingFile(name);
      await mkdir(this.config.trashDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const destination = path.join(this.config.trashDir, `${timestamp}-${name}`);
      await rename(source, destination);
      return { name, trashedAs: path.basename(destination) };
    });
  }

  private async update(name: string, updateEntries: (entries: string[]) => string[]) {
    const filePath = this.resolveFile(name);
    return this.files.runExclusive(filePath, async () => {
      await this.resolveExistingFile(name);
      const parsed = parseMarkdownData(await readFile(filePath, "utf8"));
      parsed.entries = updateEntries(parsed.entries);
      parsed.preamble = touchUpdatedMetadata(parsed.preamble);
      await this.files.write(filePath, serializeMarkdownData(parsed));
      return this.read(name);
    });
  }

  private resolveFile(name: string) {
    const validName = dataFileNameSchema.parse(name);
    const filePath = path.resolve(this.config.dataHome, validName);
    if (path.dirname(filePath) !== this.config.dataHome) {
      throw new HttpError(400, "INVALID_FILE_NAME", "File path is outside DATA_HOME");
    }
    return filePath;
  }

  private async resolveExistingFile(name: string) {
    const filePath = this.resolveFile(name);
    try {
      const fileStat = await lstat(filePath);
      if (!fileStat.isFile() || fileStat.isSymbolicLink()) throw new HttpError(400, "INVALID_DATA_FILE", "Only regular files are allowed");
      return filePath;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new HttpError(404, "FILE_NOT_FOUND", `File ${name} was not found`);
      throw error;
    }
  }
}
