import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pages = JSON.parse(fs.readFileSync("src/content/pages.json", "utf8"));
const pageRenderer = fs.readFileSync("src/components/PageRenderer.astro", "utf8");

test("migrated blog galleries include all recovered Wix images", () => {
  const expectedMinimums = {
    "/post/a-day-in-southern-oregon/": 17,
    "/post/a-different-las-vegas/": 21,
    "/post/olympic-national-park/": 23,
    "/post/yellowstone-national-park/": 27,
  };

  for (const [targetPath, minimum] of Object.entries(expectedMinimums)) {
    const page = pages.find((entry) => entry.targetPath === targetPath);
    assert.ok(page, `Missing ${targetPath}`);
    assert.ok(page.images.length >= minimum, `${targetPath} has only ${page.images.length} images`);
  }
});

test("blog gallery images open in an accessible lightbox", () => {
  assert.match(pageRenderer, /data-blog-lightbox-trigger/);
  assert.match(pageRenderer, /<dialog[^>]+data-blog-lightbox/);
  assert.match(pageRenderer, /aria-label="Close enlarged image"/);
  assert.match(pageRenderer, /event\.key === "Escape"/);
});
