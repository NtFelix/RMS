import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

const targets = [
  {
    label: ".vercel/output/functions",
    dir: path.join(cwd, ".vercel/output/functions"),
    filter: (name) =>
      name.endsWith(".js") ||
      name.endsWith(".rsc") ||
      name.endsWith(".func") ||
      name.endsWith(".mjs"),
  },
  {
    label: "__next-on-pages-dist__",
    dir: path.join(cwd, "__next-on-pages-dist__"),
    filter: (name) => name.endsWith(".js") || name.endsWith(".mjs"),
  },
  {
    label: "_worker.js",
    dir: path.join(cwd, "_worker.js"),
    filter: () => true,
    isFile: true,
  },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function walk(dir, filter, root = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath, filter, root));
      continue;
    }

    if (!filter(entry.name)) {
      continue;
    }

    const size = fs.statSync(fullPath).size;
    results.push({
      path: path.relative(root, fullPath),
      size,
    });
  }

  return results;
}

function reportTarget(target) {
  if (target.isFile) {
    if (!fs.existsSync(target.dir)) {
      console.log(`\n${target.label}: missing`);
      return;
    }

    const size = fs.statSync(target.dir).size;
    console.log(`\n${target.label}`);
    console.log(`  total: ${formatBytes(size)}`);
    return;
  }

  if (!fs.existsSync(target.dir)) {
    console.log(`\n${target.label}: missing`);
    return;
  }

  const files = walk(target.dir, target.filter).sort((a, b) => b.size - a.size);
  const total = files.reduce((sum, file) => sum + file.size, 0);

  console.log(`\n${target.label}`);
  console.log(`  files: ${files.length}`);
  console.log(`  total: ${formatBytes(total)}`);

  for (const file of files.slice(0, 20)) {
    console.log(`  ${formatBytes(file.size).padStart(10)}  ${file.path}`);
  }
}

console.log("Deploy Artifact Size Report");
for (const target of targets) {
  reportTarget(target);
}
