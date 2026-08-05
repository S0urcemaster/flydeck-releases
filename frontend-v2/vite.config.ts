import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { parseComponentPropertiesConfig } from "./src/config/componentProperties";
import {
  renderLabTokens,
} from "./src/lab/tokenDefinitions";
import {
  parseThemeConfig,
  renderColors,
} from "./src/themes/colorDefinitions";

const generatedTokensPath = fileURLToPath(
  new URL("./src/styles/generated-tokens.css", import.meta.url),
);
const generatedColorsPath = fileURLToPath(
  new URL("./src/styles/generated-colors.css", import.meta.url),
);
const generatedThemesPath = fileURLToPath(
  new URL("./src/themes/generated-themes.json", import.meta.url),
);
const generatedComponentPropertiesPath = fileURLToPath(
  new URL("./src/config/generated-component-properties.json", import.meta.url),
);

export default defineConfig({
  server: {
    proxy: {
      "/flydeck/api/v2": "http://127.0.0.1:5100",
    },
  },
  plugins: [
    react(),
    {
      name: "flydeck-component-lab",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use(
          "/__lab/apply-component-properties",
          async (request, response) => {
            response.setHeader("Content-Type", "application/json");

            if (request.method !== "POST") {
              response.statusCode = 405;
              response.end(JSON.stringify({ error: "Method not allowed." }));
              return;
            }

            try {
              const body = await readJsonBody(request);
              const config = parseComponentPropertiesConfig(body);

              if (!config) {
                response.statusCode = 400;
                response.end(JSON.stringify({ error: "Invalid component properties." }));
                return;
              }

              await writeFile(
                generatedComponentPropertiesPath,
                `${JSON.stringify(config, null, 2)}\n`,
                "utf8",
              );
              response.statusCode = 200;
              response.end(JSON.stringify(config));
            } catch (error) {
              const message = error instanceof Error
                ? error.message
                : "Component properties write failed.";
              response.statusCode = 500;
              response.end(JSON.stringify({ error: message }));
            }
          },
        );

        server.middlewares.use("/__lab/apply-colors", async (request, response) => {
          response.setHeader("Content-Type", "application/json");

          if (request.method !== "POST") {
            response.statusCode = 405;
            response.end(JSON.stringify({ error: "Method not allowed." }));
            return;
          }

          try {
            const body = await readJsonBody(request);
            const config = parseThemeConfig(body);

            if (!config) {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: "Invalid color values." }));
              return;
            }

            const values = config.themes[config.activeTheme];
            const tokens = config.tokens[config.activeTheme];
            await Promise.all([
              writeFile(generatedColorsPath, renderColors(values), "utf8"),
              writeFile(generatedTokensPath, renderLabTokens(tokens), "utf8"),
              writeFile(
                generatedThemesPath,
                `${JSON.stringify(config, null, 2)}\n`,
                "utf8",
              ),
            ]);
            response.statusCode = 200;
            response.end(JSON.stringify(config));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Color write failed.";
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
