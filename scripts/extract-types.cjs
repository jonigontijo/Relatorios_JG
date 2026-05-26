const fs = require("fs");
const path = require("path");

const input = process.argv[2];
const output = process.argv[3] || "src/lib/supabase/types.ts";

if (!input) {
  console.error("Usage: node extract-types.cjs <input.json> [output.ts]");
  process.exit(1);
}

const raw = fs.readFileSync(input, "utf8");
const parsed = JSON.parse(raw);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, parsed.types, "utf8");
console.log("Wrote", output, "(" + parsed.types.length + " chars)");
