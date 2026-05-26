const fs = require("fs");
const path = require("path");
const src = path.resolve(
  "C:/Users/lucas/.cursor/projects/c-Users-lucas-OneDrive-rea-de-Trabalho-JG-n8n-Clientes-JG-jg-relat-rio/agent-tools/b9598154-87c0-4bd2-a933-4b47f38b3c6a.txt",
);
const dst = path.resolve("src/lib/supabase/types.ts");
const raw = fs.readFileSync(src, "utf8");
const j = JSON.parse(raw);
fs.writeFileSync(dst, j.types);
console.log("wrote", j.types.length, "bytes to", dst);
