import "../environment.js";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db/database.js";
import { runMigrations } from "../db/migrations.js";
import { createPasswordCredential } from "../auth/passwordCredential.js";

const userId = z.uuid().parse(process.argv[2]);
const password = process.env.FLYDECK_NEW_PASSWORD;
if (password === undefined || password.length < 4) {
  throw new Error("Set FLYDECK_NEW_PASSWORD to at least 4 characters for this command");
}

const database = createDatabase(loadConfig());
try {
  await runMigrations(database);
  const credential = await createPasswordCredential(password);
  const result = await database.query(`
    INSERT INTO user_credentials (user_id, method, credential)
    SELECT id, 'password', $2 FROM users WHERE id = $1
    ON CONFLICT (user_id) DO UPDATE
    SET method = 'password', credential = EXCLUDED.credential, updated_at = now()
    RETURNING user_id
  `, [userId, credential]);
  if (result.rowCount !== 1) throw new Error("User was not found");
  console.info("Flydeck password credential updated");
} finally {
  await database.end();
}
