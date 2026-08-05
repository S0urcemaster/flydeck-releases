import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

try {
  // Node keeps variables that are already present in process.env, so explicit
  // service/container configuration continues to override the local file.
  loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
