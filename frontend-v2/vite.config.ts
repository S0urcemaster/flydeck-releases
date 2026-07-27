import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import {
  parseLabTokenValues,
  renderLabTokens,
} from "./src/lab/tokenDefinitions";

const generatedTokensPath = fileURLToPath(
  new URL("./src/styles/generated-tokens.css", import.meta.url),
);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "flydeck-component-lab",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__lab/apply-tokens", async (request, response) => {
          response.setHeader("Content-Type", "application/json");

          if (request.method !== "POST") {
            response.statusCode = 405;
            response.end(JSON.stringify({ error: "Method not allowed." }));
            return;
          }

          try {
            const body = await readJsonBody(request);
            const values = parseLabTokenValues(body);

            if (!values) {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: "Invalid token values." }));
              return;
            }

            await writeFile(generatedTokensPath, renderLabTokens(values), "utf8");
            response.statusCode = 200;
            response.end(JSON.stringify({ values }));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Token write failed.";
            response.statusCode = 500;
            response.end(JSON.stringify({ error: message }));
          }
        });
      },
    },
  ],
});

async function readJsonBody(request: AsyncIterable<unknown>): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    byteLength += buffer.byteLength;

    if (byteLength > 16_384) {
      throw new Error("Request body is too large.");
    }

    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
