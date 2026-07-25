import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { snippetSchema, type Snippet } from "@flydeck/shared/snippets";
import { defaultSnippets } from "@flydeck/shared/snippet-defaults";
import type { AppConfig } from "../config.js";
import { HttpError } from "../errors.js";
import { dataMarker, parseMarkdownData, serializeMarkdownData } from "./markdownFormat.js";
import { AtomicFileStore } from "./atomicFileStore.js";

export class SnippetStore {
  private readonly filePath: string;
  private readonly files = new AtomicFileStore();

  constructor(private readonly config: AppConfig) {
    this.filePath = path.join(config.flydonDir, "snip.md");
  }

  async initialize() {
    await mkdir(this.config.flydonDir, { recursive: true });
    await mkdir(this.config.trashDir, { recursive: true });
    try {
      await access(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await this.files.runExclusive(this.filePath, () => this.files.write(this.filePath, this.serialize(defaultSnippets)));
    }
  }

  async list() {
    return this.readAll();
  }

  async create(snippet: Snippet) {
    return this.files.runExclusive(this.filePath, async () => {
      const snippets = await this.readAll();
      this.assertUniqueName(snippets, snippet.name);
      await this.persist([...snippets, snippet]);
      return snippet;
    });
  }

  async update(originalName: string, text: string) {
    return this.files.runExclusive(this.filePath, async () => {
      const snippets = await this.readAll();
      const index = this.findIndex(snippets, originalName);
      if (index < 0) throw new HttpError(404, "SNIPPET_NOT_FOUND", `Snippet ${originalName} was not found`);
      const snippet = { ...snippets[index], text };
      const updated = snippets.map((current, currentIndex) => currentIndex === index ? snippet : current);
      await this.persist(updated);
      return snippet;
    });
  }

  async remove(name: string) {
    return this.files.runExclusive(this.filePath, async () => {
      const snippets = await this.readAll();
      const index = this.findIndex(snippets, name);
      if (index < 0) throw new HttpError(404, "SNIPPET_NOT_FOUND", `Snippet ${name} was not found`);
      await this.persist(snippets.filter((_, currentIndex) => currentIndex !== index));
      return { name: snippets[index].name };
    });
  }

  private async readAll(): Promise<Snippet[]> {
    const parsed = parseMarkdownData(await readFile(this.filePath, "utf8"));
    return parsed.entries.map((line, index) => {
      try {
        return snippetSchema.parse(JSON.parse(line));
      } catch {
        throw new HttpError(422, "INVALID_SNIPPET_FILE", `Invalid snippet on line ${index + 1}`);
      }
    });
  }

  private serialize(snippets: Snippet[]) {
    return serializeMarkdownData({
      preamble: ["# Prompt Snippets", "", "format: json-lines", ""],
      entries: snippets.map((snippet) => JSON.stringify(snippet)),
    });
  }

  private async persist(snippets: Snippet[]) {
    await this.files.backupAndWrite(this.filePath, this.serialize(snippets), this.config.trashDir, "snip.md");
  }

  private findIndex(snippets: Snippet[], name: string) {
    return snippets.findIndex((snippet) => snippet.name.toLocaleLowerCase("de") === name.toLocaleLowerCase("de"));
  }

  private assertUniqueName(snippets: Snippet[], name: string, ignoredIndex = -1) {
    const index = this.findIndex(snippets, name);
    if (index >= 0 && index !== ignoredIndex) throw new HttpError(409, "SNIPPET_EXISTS", `Snippet ${name} already exists`);
  }
}
