import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { isInternalUrl, localTargetCandidates, normalizeInternalUrl } from "./migration-utils.mjs";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const htmlFiles = [];
let failures = 0;

async function walk(dir) {
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
    else if (entry.endsWith(".html")) htmlFiles.push(full);
  }
}

await walk(DIST);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const $ = cheerio.load(html);
  const references = [];
  $("a[href], img[src], link[href], script[src]").each((_, element) => {
    const attr = element.name === "img" || element.name === "script" ? "src" : "href";
    const value = $(element).attr(attr);
    if (value) references.push(value);
  });

  for (const reference of references) {
    if (/^(mailto:|tel:|#)/.test(reference)) continue;
    if (/^https?:/.test(reference) && !isInternalUrl(reference)) continue;
    const localReference = normalizeInternalUrl(reference);
    const candidates = localTargetCandidates(localReference, DIST);
    let ok = false;
    for (const candidate of candidates) {
      try {
        await stat(candidate);
        ok = true;
        break;
      } catch {}
    }
    if (!ok) {
      console.error(`Broken local reference in ${path.relative(ROOT, file)}: ${reference}`);
      failures += 1;
    }
  }
}

if (failures) {
  console.error(`Link validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Link validation passed for ${htmlFiles.length} HTML files.`);
