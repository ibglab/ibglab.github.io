import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "data/site-map.json",
  "extracted/text-manifest.json",
  "extracted/image-manifest.json",
  "extracted/text-verification.md",
  "extracted/image-verification.md",
  "src/content/pages.json",
];

let failures = 0;

for (const file of requiredFiles) {
  try {
    await access(path.join(ROOT, file));
  } catch {
    console.error(`Missing required file: ${file}`);
    failures += 1;
  }
}

const pages = JSON.parse(await readFile(path.join(ROOT, "src/content/pages.json"), "utf8"));
const images = JSON.parse(await readFile(path.join(ROOT, "extracted/image-manifest.json"), "utf8"));

for (const page of pages) {
  if (!page.sourceUrl || !page.targetPath || !page.title) {
    console.error(`Incomplete page manifest entry: ${JSON.stringify(page)}`);
    failures += 1;
  }
  if (page.migrationStatus === "extracted" && page.blocks.length === 0) {
    console.warn(`Review needed: ${page.targetPath} has no extracted text blocks.`);
  }
}

for (const image of images) {
  if (!image.byteSize || image.byteSize <= 0) {
    console.error(`Unusable image: ${image.localFilename}`);
    failures += 1;
  }
}

if (failures) {
  console.error(`Extraction validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Extraction validation passed for ${pages.length} pages and ${images.length} images.`);
