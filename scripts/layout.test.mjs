import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
const homepage = fs.readFileSync("src/pages/index.astro", "utf8");

test("page titles can use the full width of their header", () => {
  const globalHeadingRule = layout.match(/h1\s*\{(?<declarations>[^}]+)\}/)?.groups?.declarations;

  assert.ok(globalHeadingRule, "Missing global h1 rule");
  assert.match(globalHeadingRule, /max-width:\s*100%/);
  assert.doesNotMatch(globalHeadingRule, /max-width:\s*12ch/);
});

test("homepage has one page-level heading before its section headings", () => {
  const pageLevelHeadings = homepage.match(/<h1(?:\s[^>]*)?>/g) ?? [];

  assert.equal(pageLevelHeadings.length, 1);
  assert.match(homepage, /<h1>\{page\.title\}<\/h1>/);
  assert.ok(homepage.indexOf("<h1>") < homepage.indexOf('<h2 id="projects-title">'));
});
