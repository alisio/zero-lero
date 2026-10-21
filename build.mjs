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

const skillDir = join(dist, "skill", "ste100-ptbr");
mkdirSync(skillDir, { recursive: true });
writeFileSync(join(skillDir, "SKILL.md"), `${skillFrontmatter}\n\n${prompt}\n`, "utf8");
cpSync(join(src, "references"), join(skillDir, "references"), { recursive: true });

const copilotDir = join(dist, "copilot");
mkdirSync(copilotDir, { recursive: true });
writeFileSync(
  join(copilotDir, "ste100-ptbr.prompt.md"),
  `${copilotFrontmatter}\n\n${prompt}\n`,
  "utf8",
);
cpSync(join(src, "references"), join(copilotDir, "references"), { recursive: true });

const portableDir = join(dist, "portable");
mkdirSync(portableDir, { recursive: true });
writeFileSync(join(portableDir, "ste100-ptbr.md"), `${prompt}\n`, "utf8");

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
console.log(`- ${join("dist", "skill", "ste100-ptbr", "SKILL.md")}`);
console.log(`- ${join("dist", "copilot", "ste100-ptbr.prompt.md")}`);
console.log(`- ${join("dist", "portable", "ste100-ptbr.md")}`);
console.log(`- referências copiadas para dist/skill/ste100-ptbr/references e dist/copilot/references`);
