import { createClient } from "@libsql/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Simple helper to load .env manually without external dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    }
  }
}

async function main() {
  loadEnv();

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in your .env file.");
    process.exit(1);
  }

  console.log("Generating schema migration SQL script from schema.prisma...");
  let sql: string;
  try {
    sql = execSync(
      "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
      { encoding: "utf8" }
    );
  } catch (err) {
    console.error("Failed to generate migration SQL script:", err);
    process.exit(1);
  }

  console.log("Connecting to Turso database at:", url);
  const client = createClient({ url, authToken });

  console.log("Applying schema to Turso...");
  try {
    await client.executeMultiple(sql);
    console.log("Schema successfully applied to Turso database!");
  } catch (error) {
    console.error("Failed to apply schema to Turso:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
