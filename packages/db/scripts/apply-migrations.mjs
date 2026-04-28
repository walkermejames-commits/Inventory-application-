import fs from "fs";
import path from "path";

const dir = path.resolve("packages/db/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
console.log("Apply migrations in Supabase SQL editor or CI job:");
for (const file of files) {
  console.log(`- ${file}`);
}
