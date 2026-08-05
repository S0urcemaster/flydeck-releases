import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";

describe("DATA API", () => {
  let workspaceRoot: string;
  let config: AppConfig;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "flydeck-test-"));
    config = {
      port: 5000,
      basePath: "/flydeck",
      workspaceRoot,
      dataHome: path.join(workspaceRoot, "flydesk-data"),
      tailscaleUrl: "https://flydon.example.test",
      flydonDir: path.join(workspaceRoot, ".flydon"),
      trashDir: path.join(workspaceRoot, ".flydon", "trash"),
      schedulerIntervalMs: 30_000,
      auth: { mode: "off", secureCookie: true },
    };
    const app = await createApp(config);
    server = await new Promise<Server>((resolve) => {
      const nextServer = app.listen(0, "127.0.0.1", () => resolve(nextServer));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Testserver hat keine TCP-Adresse");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it("creates, lists, reads and edits a data file", async () => {
    const created = await request(baseUrl).post("/flydeck/api/data").send({ name: "ideen.md", title: "Ideen" }).expect(201);
    expect(created.body.entries).toEqual([]);

    await request(baseUrl).post("/flydeck/api/data/ideen.md/entries").send({ text: "Erster Eintrag" }).expect(201);
    const updated = await request(baseUrl).put("/flydeck/api/data/ideen.md/entries/0").send({ text: "Geaendert" }).expect(200);
    expect(updated.body.entries).toEqual(["Geaendert"]);

    await request(baseUrl).post("/flydeck/api/data/ideen.md/entries").send({ text: "Zweiter Eintrag" }).expect(201);
    const afterDelete = await request(baseUrl).delete("/flydeck/api/data/ideen.md/entries/0").expect(200);
    expect(afterDelete.body.entries).toEqual(["Zweiter Eintrag"]);

    const listed = await request(baseUrl).get("/flydeck/api/data").expect(200);
    expect(listed.body).toMatchObject([{ name: "ideen.md", title: "Ideen", entryCount: 1 }]);
    expect(await readFile(path.join(config.dataHome, "ideen.md"), "utf8")).toContain("--data--\nZweiter Eintrag");
  });

  it("retires legacy service workers instead of serving the SPA fallback", async () => {
    for (const workerPath of ["/sw.js", "/service-worker.js", "/flydeck/sw.js", "/flydeck/service-worker.js"]) {
      const response = await request(baseUrl).get(workerPath).expect(200).expect("Content-Type", /application\/javascript/);
      expect(response.headers["cache-control"]).toContain("no-store");
      expect(response.headers["service-worker-allowed"]).toBe("/");
      expect(response.text).toContain("self.registration.unregister()");
    }
  });

  it("keeps multiline data entries on one physical Markdown line", async () => {
    const filePath = path.join(config.dataHome, "notizen.md");
    await request(baseUrl).post("/flydeck/api/data").send({ name: "notizen.md", title: "Notizen" }).expect(201);

    const text = "Erste Zeile\nZweite Zeile mit \\\\n als Text";
    const appended = await request(baseUrl)
      .post("/flydeck/api/data/notizen.md/entries")
      .send({ text })
      .expect(201);
    expect(appended.body.entries).toEqual([text]);

    const markdown = await readFile(filePath, "utf8");
    expect(markdown).toContain("entry-format: escaped-lines-v1");
    expect(markdown).toContain("Erste Zeile\\nZweite Zeile mit \\\\\\\\n als Text");
    expect(markdown.split("\n").filter((line) => line.startsWith("Erste Zeile"))).toHaveLength(1);

    const reloaded = await request(baseUrl).get("/flydeck/api/data/notizen.md").expect(200);
    expect(reloaded.body.entries).toEqual([text]);
  });

  it("reads legacy DATA lines and migrates them when writing", async () => {
    const filePath = path.join(config.dataHome, "legacy.md");
    await writeFile(filePath, "# Legacy\n\n--data--\nAlter \\\\n Text\nZweiter Eintrag\n");

    const legacy = await request(baseUrl).get("/flydeck/api/data/legacy.md").expect(200);
    expect(legacy.body.entries).toEqual(["Alter \\\\n Text", "Zweiter Eintrag"]);

    await request(baseUrl)
      .put("/flydeck/api/data/legacy.md/entries/1")
      .send({ text: "Zweite\nZeile" })
      .expect(200);
    const migrated = await request(baseUrl).get("/flydeck/api/data/legacy.md").expect(200);
    expect(migrated.body.entries).toEqual(["Alter \\\\n Text", "Zweite\nZeile"]);
  });

  it("moves deleted files into the flydon trash", async () => {
    await request(baseUrl).post("/flydeck/api/data").send({ name: "termine.md", title: "Termine" }).expect(201);
    const deleted = await request(baseUrl).delete("/flydeck/api/data/termine.md").expect(200);
    expect(deleted.body.trashedAs).toContain("termine.md");
    await expect(readFile(path.join(config.trashDir, deleted.body.trashedAs), "utf8")).resolves.toContain("# Termine");
    await request(baseUrl).get("/flydeck/api/data/termine.md").expect(404);
  });

  it("rejects traversal and invalid line numbers", async () => {
    await request(baseUrl).get("/flydeck/api/data/%2E%2E%2Fsecret.md").expect(400);
    await request(baseUrl).post("/flydeck/api/data").send({ name: "ideen.md", title: "Ideen" }).expect(201);
    await request(baseUrl).put("/flydeck/api/data/ideen.md/entries/5").send({ text: "Nein" }).expect(404);
    await request(baseUrl).delete("/flydeck/api/data/ideen.md/entries/5").expect(404);
  });

  it("lists malformed data files as invalid and refuses to edit them", async () => {
    await writeFile(path.join(config.dataHome, "kaputt.md"), "# Normale Dokumentation\n");
    const listed = await request(baseUrl).get("/flydeck/api/data").expect(200);
    expect(listed.body).toMatchObject([{
      name: "kaputt.md",
      valid: false,
      error: "Marker --data-- is missing",
    }]);
    await request(baseUrl).get("/flydeck/api/data/kaputt.md").expect(422);
    await request(baseUrl).post("/flydeck/api/data/kaputt.md/entries").send({ text: "Nein" }).expect(422);
  });

  it("creates, updates and deletes snippets while keeping backups", async () => {
    const initial = await request(baseUrl).get("/flydeck/api/snippets").expect(200);
    expect(initial.body.length).toBe(6);

    await request(baseUrl).post("/flydeck/api/snippets").send({ name: "Mehrzeilig", text: "A\nB" }).expect(201);
    const updated = await request(baseUrl).put("/flydeck/api/snippets/Mehrzeilig").send({ text: "Neu" }).expect(200);
    expect(updated.body).toEqual({ name: "Mehrzeilig", text: "Neu" });
    await request(baseUrl).post("/flydeck/api/snippets").send({ name: "Umbenannt", text: "Neu" }).expect(201);
    await request(baseUrl).delete("/flydeck/api/snippets/Umbenannt").expect(200);

    const snippets = await request(baseUrl).get("/flydeck/api/snippets").expect(200);
    expect(snippets.body).toHaveLength(7);
    expect(snippets.body).toContainEqual({ name: "Mehrzeilig", text: "Neu" });
    expect((await readdir(config.trashDir)).filter((name) => name.endsWith("snip.md"))).toHaveLength(4);
  });

  it("creates, lists and deletes cron timers", async () => {
    const dueAt = new Date(Date.now() + 3600000).toISOString();
    const created = await request(baseUrl).post("/flydeck/api/cron").send({ title: "Backup", dueAt }).expect(201);
    expect(created.body).toMatchObject({ title: "Backup", dueAt, status: "active" });
    const duplicateTitle = await request(baseUrl).post("/flydeck/api/cron").send({
      title: "Backup",
      dueAt: new Date(Date.now() + 5400000).toISOString(),
    }).expect(201);
    expect(duplicateTitle.body.id).not.toBe(created.body.id);

    const listed = await request(baseUrl).get("/flydeck/api/cron").expect(200);
    expect(listed.body).toHaveLength(2);
    const changedDueAt = new Date(Date.now() + 7200000).toISOString();
    const updated = await request(baseUrl).put(`/flydeck/api/cron/${created.body.id}`).send({ dueAt: changedDueAt }).expect(200);
    expect(updated.body).toMatchObject({ id: created.body.id, title: "Backup", dueAt: changedDueAt });
    await request(baseUrl).delete(`/flydeck/api/cron/${created.body.id}`).expect(200);
    expect((await request(baseUrl).get("/flydeck/api/cron")).body).toMatchObject([{ id: duplicateTitle.body.id, title: "Backup" }]);
  });
});
