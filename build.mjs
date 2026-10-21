import { chmodSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const dist = join(root, "dist");

const prompt = readFileSync(join(src, "prompt.md"), "utf8").trim();
const skillFrontmatter = readFileSync(join(src, "frontmatter-skill.txt"), "utf8").trim();
const copilotFrontmatter = readFileSync(join(src, "frontmatter-copilot.txt"), "utf8").trim();

if (!prompt) {
  throw new Error("src/prompt.md está vazio.");
}

rmSync(dist, { recursive: true, force: true });

const skillDir = join(dist, "skill", "zero-lero");
mkdirSync(skillDir, { recursive: true });
writeFileSync(join(skillDir, "SKILL.md"), `${skillFrontmatter}\n\n${prompt}\n`, "utf8");
cpSync(join(src, "references"), join(skillDir, "references"), { recursive: true });

const copilotDir = join(dist, "copilot");
mkdirSync(copilotDir, { recursive: true });
writeFileSync(
  join(copilotDir, "zero-lero.prompt.md"),
  `${copilotFrontmatter}\n\n${prompt}\n`,
  "utf8",
);
cpSync(join(src, "references"), join(copilotDir, "references"), { recursive: true });

const portableDir = join(dist, "portable");
mkdirSync(portableDir, { recursive: true });
writeFileSync(join(portableDir, "zero-lero.md"), `${prompt}\n`, "utf8");

function chmodTree(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      chmodSync(path, 0o755);
      chmodTree(path);
    } else {
      chmodSync(path, 0o644);
    }
  }
}

chmodTree(dist);

console.log("Build concluído:");
console.log(`- ${join("dist", "skill", "zero-lero", "SKILL.md")}`);
console.log(`- ${join("dist", "copilot", "zero-lero.prompt.md")}`);
console.log(`- ${join("dist", "portable", "zero-lero.md")}`);
console.log(`- referências copiadas para dist/skill/zero-lero/references e dist/copilot/references`);
