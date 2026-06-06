import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pages = JSON.parse(fs.readFileSync("src/content/pages.json", "utf8"));
const retiredCoursePath = /^\/sda-(?:2020|2022|2023)(?:\/|-)/;

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath];
  });
}

test("retired SDA course years are excluded from generated routes", () => {
  const retiredPages = pages
    .map((page) => page.targetPath)
    .filter((targetPath) => retiredCoursePath.test(targetPath));

  assert.deepEqual(retiredPages, []);
});

test("SDA 2024 copied routes remain available", () => {
  const targetPaths = new Set(pages.map((page) => page.targetPath));

  assert.equal(targetPaths.has("/copy-of-sda-2023-assignments/"), true);
  assert.equal(targetPaths.has("/copy-of-sda-2023-recitation/"), true);
});

test("every distributed download is referenced by current source", () => {
  const source = sourceFiles("src")
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
  const orphanedDownloads = sourceFiles("public/_files")
    .filter((filePath) => !source.includes(path.basename(filePath)));

  assert.deepEqual(orphanedDownloads, []);
});
